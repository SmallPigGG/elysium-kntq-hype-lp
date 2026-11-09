import { useCallback, useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { publicClient } from '../lib/rpcClient'
import { erc20Abi } from '../abis/erc20'
import { KNTQ } from '../config/contracts'

export function useBalances() {
  const { address, isConnected } = useAccount()
  const [hype, setHype] = useState(0n)
  const [kntq, setKntq] = useState(0n)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!address) {
      setHype(0n)
      setKntq(0n)
      return
    }
    try {
      const [native, token] = await Promise.all([
        publicClient.getBalance({ address }),
        publicClient.readContract({
          address: KNTQ,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address],
        }),
      ])
      setHype(native)
      setKntq(token)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [address])

  useEffect(() => {
    if (!isConnected) return
    void refresh()
    const id = setInterval(() => void refresh(), 12_000)
    return () => clearInterval(id)
  }, [isConnected, refresh])

  return { hype, kntq, refresh, error }
}
