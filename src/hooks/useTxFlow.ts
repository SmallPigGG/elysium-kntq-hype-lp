import { useCallback, useState } from 'react'
import {
  encodeFunctionData,
  type Address,
  type Hex,
  maxUint256,
} from 'viem'
import { useAccount, useWalletClient } from 'wagmi'
import { publicClient } from '../lib/rpcClient'
import { positionManagerAbi } from '../abis/positionManager'
import { erc20Abi } from '../abis/erc20'
import { permit2Abi } from '../abis/permit2'
import {
  KNTQ,
  PERMIT2,
  POSITION_MANAGER,
} from '../config/contracts'
import { toChineseError } from '../lib/errors'

export type TxPreview = {
  title: string
  summary: string[]
  to: Address
  data: Hex
  value: bigint
  /** Optional approval steps run before main tx (each still previewed/confirmed by user via wallet) */
  approvals?: { label: string; to: Address; data: Hex; value?: bigint }[]
}

export function useTxFlow() {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [preview, setPreview] = useState<TxPreview | null>(null)
  const [simulating, setSimulating] = useState(false)
  const [sending, setSending] = useState(false)
  const { error, setError } = useStateError()
  const [lastTx, setLastTx] = useState<Hex | null>(null)

  const openPreview = useCallback((p: TxPreview) => {
    setPreview(p)
    setError(null)
    setLastTx(null)
  }, [setError])

  const closePreview = useCallback(() => {
    if (sending || simulating) return
    setPreview(null)
  }, [sending, simulating])

  const ensureKntqPermit2 = useCallback(async (): Promise<TxPreview['approvals']> => {
    if (!address) return []
    const approvals: NonNullable<TxPreview['approvals']> = []
    const allowance = await publicClient.readContract({
      address: KNTQ,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [address, PERMIT2],
    })
    if (allowance < maxUint256 / 2n) {
      approvals.push({
        label: '授权 KNTQ → Permit2',
        to: KNTQ,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [PERMIT2, maxUint256],
        }),
      })
    }
    const [amt, exp] = await publicClient.readContract({
      address: PERMIT2,
      abi: permit2Abi,
      functionName: 'allowance',
      args: [address, KNTQ, POSITION_MANAGER],
    })
    const now = Math.floor(Date.now() / 1000)
    if (amt < 2n ** 159n || Number(exp) < now + 3600) {
      approvals.push({
        label: 'Permit2 授权 KNTQ → PositionManager',
        to: PERMIT2,
        data: encodeFunctionData({
          abi: permit2Abi,
          functionName: 'approve',
          args: [KNTQ, POSITION_MANAGER, 2n ** 160n - 1n, Number(now + 30 * 24 * 3600)],
        }),
      })
    }
    return approvals
  }, [address])

  const buildModifyTx = useCallback(
    async (opts: {
      title: string
      summary: string[]
      unlockData: Hex
      value: bigint
      deadline: bigint
      needKntqApproval?: boolean
    }) => {
      const data = encodeFunctionData({
        abi: positionManagerAbi,
        functionName: 'modifyLiquidities',
        args: [opts.unlockData, opts.deadline],
      })
      const approvals = opts.needKntqApproval ? await ensureKntqPermit2() : []
      openPreview({
        title: opts.title,
        summary: opts.summary,
        to: POSITION_MANAGER,
        data,
        value: opts.value,
        approvals,
      })
    },
    [ensureKntqPermit2, openPreview],
  )

  const confirmAndSend = useCallback(async () => {
    if (!preview || !walletClient || !address) {
      setError('请先连接钱包')
      return
    }
    setError(null)
    setSimulating(true)
    try {
      // 1) Run approval txs first if needed (each signed once, no auto-retry)
      for (const step of preview.approvals ?? []) {
        await publicClient.call({
          account: address,
          to: step.to,
          data: step.data,
          value: step.value ?? 0n,
        })
        setSimulating(false)
        setSending(true)
        const hash = await walletClient.sendTransaction({
          account: address,
          to: step.to,
          data: step.data,
          value: step.value ?? 0n,
          chain: walletClient.chain,
        })
        await publicClient.waitForTransactionReceipt({ hash })
        setSending(false)
        setSimulating(true)
      }

      // 2) Simulate main call (eth_call) before sign
      await publicClient.call({
        account: address,
        to: preview.to,
        data: preview.data,
        value: preview.value,
      })
      setSimulating(false)
      setSending(true)
      // Exactly one send — never auto-resubmit
      const hash = await walletClient.sendTransaction({
        account: address,
        to: preview.to,
        data: preview.data,
        value: preview.value,
        chain: walletClient.chain,
      })
      setLastTx(hash)
      await publicClient.waitForTransactionReceipt({ hash })
      setPreview(null)
    } catch (e) {
      setError(toChineseError(e))
    } finally {
      setSimulating(false)
      setSending(false)
    }
  }, [preview, walletClient, address, setError])

  return {
    preview,
    openPreview,
    closePreview,
    buildModifyTx,
    confirmAndSend,
    simulating,
    sending,
    error,
    lastTx,
  }
}

function useStateError() {
  const [error, setError] = useState<string | null>(null)
  return { error, setError }
}
