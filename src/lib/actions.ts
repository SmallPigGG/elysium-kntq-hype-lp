/**
 * Uniswap V4 PositionManager action encoding
 * Actions from v4-periphery/src/libraries/Actions.sol
 */
import {
  encodeAbiParameters,
  encodePacked,
  type Address,
  type Hex,
  concatHex,
} from 'viem'
import { POOL_KEY, NATIVE } from '../config/contracts'

export const Actions = {
  INCREASE_LIQUIDITY: 0x00,
  DECREASE_LIQUIDITY: 0x01,
  MINT_POSITION: 0x02,
  BURN_POSITION: 0x03,
  SETTLE_PAIR: 0x0d,
  TAKE_PAIR: 0x11,
  CLOSE_CURRENCY: 0x12,
  SWEEP: 0x14,
} as const

export type PoolKeyStruct = {
  currency0: Address
  currency1: Address
  fee: number
  tickSpacing: number
  hooks: Address
}

const poolKeyType = {
  type: 'tuple',
  components: [
    { name: 'currency0', type: 'address' },
    { name: 'currency1', type: 'address' },
    { name: 'fee', type: 'uint24' },
    { name: 'tickSpacing', type: 'int24' },
    { name: 'hooks', type: 'address' },
  ],
} as const

function packActions(actions: number[]): Hex {
  return encodePacked(
    actions.map(() => 'uint8' as const),
    actions.map((a) => a),
  )
}

function encodeUnlockData(actions: number[], params: Hex[]): Hex {
  return encodeAbiParameters(
    [{ type: 'bytes' }, { type: 'bytes[]' }],
    [packActions(actions), params],
  )
}

export function encodeMintPosition(args: {
  tickLower: number
  tickUpper: number
  liquidity: bigint
  amount0Max: bigint
  amount1Max: bigint
  recipient: Address
  hookData?: Hex
}): { unlockData: Hex; value: bigint } {
  const hookData = args.hookData ?? '0x'
  const mintParams = encodeAbiParameters(
    [
      poolKeyType,
      { type: 'int24' },
      { type: 'int24' },
      { type: 'uint256' },
      { type: 'uint128' },
      { type: 'uint128' },
      { type: 'address' },
      { type: 'bytes' },
    ],
    [
      {
        currency0: POOL_KEY.currency0,
        currency1: POOL_KEY.currency1,
        fee: POOL_KEY.fee,
        tickSpacing: POOL_KEY.tickSpacing,
        hooks: POOL_KEY.hooks,
      },
      args.tickLower,
      args.tickUpper,
      args.liquidity,
      args.amount0Max,
      args.amount1Max,
      args.recipient,
      hookData,
    ],
  )
  const settleParams = encodeAbiParameters(
    [{ type: 'address' }, { type: 'address' }],
    [POOL_KEY.currency0, POOL_KEY.currency1],
  )
  // Native currency0 → SETTLE_PAIR + SWEEP excess ETH
  const sweepParams = encodeAbiParameters(
    [{ type: 'address' }, { type: 'address' }],
    [NATIVE, args.recipient],
  )
  const unlockData = encodeUnlockData(
    [Actions.MINT_POSITION, Actions.SETTLE_PAIR, Actions.SWEEP],
    [mintParams, settleParams, sweepParams],
  )
  return { unlockData, value: args.amount0Max }
}

export function encodeIncreaseLiquidity(args: {
  tokenId: bigint
  liquidity: bigint
  amount0Max: bigint
  amount1Max: bigint
  recipient: Address
  hookData?: Hex
}): { unlockData: Hex; value: bigint } {
  const hookData = args.hookData ?? '0x'
  const inc = encodeAbiParameters(
    [
      { type: 'uint256' },
      { type: 'uint256' },
      { type: 'uint128' },
      { type: 'uint128' },
      { type: 'bytes' },
    ],
    [args.tokenId, args.liquidity, args.amount0Max, args.amount1Max, hookData],
  )
  const settleParams = encodeAbiParameters(
    [{ type: 'address' }, { type: 'address' }],
    [POOL_KEY.currency0, POOL_KEY.currency1],
  )
  const sweepParams = encodeAbiParameters(
    [{ type: 'address' }, { type: 'address' }],
    [NATIVE, args.recipient],
  )
  return {
    unlockData: encodeUnlockData(
      [Actions.INCREASE_LIQUIDITY, Actions.SETTLE_PAIR, Actions.SWEEP],
      [inc, settleParams, sweepParams],
    ),
    value: args.amount0Max,
  }
}

/** Collect fees only: decrease 0 liquidity + TAKE_PAIR */
export function encodeCollectFees(args: {
  tokenId: bigint
  recipient: Address
  amount0Min?: bigint
  amount1Min?: bigint
  hookData?: Hex
}): { unlockData: Hex; value: bigint } {
  const hookData = args.hookData ?? '0x'
  const dec = encodeAbiParameters(
    [
      { type: 'uint256' },
      { type: 'uint256' },
      { type: 'uint128' },
      { type: 'uint128' },
      { type: 'bytes' },
    ],
    [args.tokenId, 0n, args.amount0Min ?? 0n, args.amount1Min ?? 0n, hookData],
  )
  const take = encodeAbiParameters(
    [{ type: 'address' }, { type: 'address' }, { type: 'address' }],
    [POOL_KEY.currency0, POOL_KEY.currency1, args.recipient],
  )
  return {
    unlockData: encodeUnlockData(
      [Actions.DECREASE_LIQUIDITY, Actions.TAKE_PAIR],
      [dec, take],
    ),
    value: 0n,
  }
}

export function encodeDecreaseLiquidity(args: {
  tokenId: bigint
  liquidity: bigint
  amount0Min: bigint
  amount1Min: bigint
  recipient: Address
  burn?: boolean
  hookData?: Hex
}): { unlockData: Hex; value: bigint } {
  const hookData = args.hookData ?? '0x'
  if (args.burn) {
    const burn = encodeAbiParameters(
      [
        { type: 'uint256' },
        { type: 'uint128' },
        { type: 'uint128' },
        { type: 'bytes' },
      ],
      [args.tokenId, args.amount0Min, args.amount1Min, hookData],
    )
    const take = encodeAbiParameters(
      [{ type: 'address' }, { type: 'address' }, { type: 'address' }],
      [POOL_KEY.currency0, POOL_KEY.currency1, args.recipient],
    )
    return {
      unlockData: encodeUnlockData(
        [Actions.BURN_POSITION, Actions.TAKE_PAIR],
        [burn, take],
      ),
      value: 0n,
    }
  }
  const dec = encodeAbiParameters(
    [
      { type: 'uint256' },
      { type: 'uint256' },
      { type: 'uint128' },
      { type: 'uint128' },
      { type: 'bytes' },
    ],
    [args.tokenId, args.liquidity, args.amount0Min, args.amount1Min, hookData],
  )
  const take = encodeAbiParameters(
    [{ type: 'address' }, { type: 'address' }, { type: 'address' }],
    [POOL_KEY.currency0, POOL_KEY.currency1, args.recipient],
  )
  return {
    unlockData: encodeUnlockData(
      [Actions.DECREASE_LIQUIDITY, Actions.TAKE_PAIR],
      [dec, take],
    ),
    value: 0n,
  }
}

/** unused but kept for debugging packed bytes */
export function debugConcat(...parts: Hex[]): Hex {
  return concatHex(parts)
}
