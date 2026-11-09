/** Range presets for Uniswap V4 LP mint UI (tickSpacing-aware). */

import { FULL_RANGE, POOL_KEY } from './contracts'
import {
  getLiquidityForAmounts,
  getSqrtRatioAtTick,
  parseUnits,
} from '../lib/math'

export type RangePresetId =
  | 'aggressive2'
  | 'active5'
  | 'balanced10'
  | 'conservative20'
  | 'full'
  | 'custom'

export type RangePreset = {
  id: RangePresetId
  label: string
  /** Half-width percent around spot; undefined for full / custom */
  pct?: number
  riskHint: string
  recommended?: boolean
}

export const RANGE_PRESETS: RangePreset[] = [
  {
    id: 'aggressive2',
    label: '激进 ±2%',
    pct: 2,
    riskHint: '吃费密度最高，价格稍动就出区间，需频繁移仓。',
  },
  {
    id: 'active5',
    label: '积极 ±5%',
    pct: 5,
    riskHint: '吃费较快，中等波动时较易出区间。',
  },
  {
    id: 'balanced10',
    label: '均衡 ±10%',
    pct: 10,
    riskHint: '手续费密度与出区间风险较均衡，适合多数场景。',
    recommended: true,
  },
  {
    id: 'conservative20',
    label: '稳健 ±20%',
    pct: 20,
    riskHint: '更耐波动，吃费密度低于窄区间，但仍远高于全区间。',
  },
  {
    id: 'full',
    label: '全区间',
    riskHint: '几乎永不出区间，但只占极少量活跃流动性，吃费极慢。',
  },
  {
    id: 'custom',
    label: '自定义',
    riskHint: '手动填写 tick，须对齐 tickSpacing=200。',
  },
]

export const DEFAULT_PRESET_ID: RangePresetId = 'balanced10'

/** Leave this much native HYPE for gas when autofilling budgets */
export const GAS_RESERVE_HYPE = 0.08

export const TICK_SPACING = POOL_KEY.tickSpacing

export function alignTickDown(tick: number, spacing = TICK_SPACING): number {
  const t = Math.floor(tick)
  const r = t % spacing
  return r === 0 ? t : t - (r > 0 ? r : r + spacing)
}

export function alignTickUp(tick: number, spacing = TICK_SPACING): number {
  const t = Math.ceil(tick)
  const r = t % spacing
  return r === 0 ? t : t + (r > 0 ? spacing - r : -r)
}

/** token1/token0 price at tick ≈ 1.0001^tick */
export function priceAtTick(tick: number): number {
  return Math.pow(1.0001, tick)
}

/**
 * ±pct% around current tick, aligned to spacing.
 * Uses log mapping: Δtick = ln(1±pct/100) / ln(1.0001)
 */
export function ticksFromPct(
  currentTick: number,
  pct: number,
  spacing = TICK_SPACING,
): { tickLower: number; tickUpper: number } {
  const ln10001 = Math.log(1.0001)
  const dLower = Math.log(1 - pct / 100) / ln10001
  const dUpper = Math.log(1 + pct / 100) / ln10001
  let tickLower = alignTickDown(currentTick + dLower, spacing)
  let tickUpper = alignTickUp(currentTick + dUpper, spacing)
  if (tickUpper <= tickLower) {
    tickUpper = tickLower + spacing
  }
  // Clamp to protocol full-range bounds
  tickLower = Math.max(tickLower, FULL_RANGE.tickLower)
  tickUpper = Math.min(tickUpper, FULL_RANGE.tickUpper)
  return { tickLower, tickUpper }
}

export function resolvePresetTicks(
  presetId: RangePresetId,
  currentTick: number,
  customLower?: number,
  customUpper?: number,
): { tickLower: number; tickUpper: number } {
  if (presetId === 'full') {
    return { tickLower: FULL_RANGE.tickLower, tickUpper: FULL_RANGE.tickUpper }
  }
  if (presetId === 'custom') {
    const tickLower = Number.isFinite(customLower) ? (customLower as number) : currentTick - TICK_SPACING
    const tickUpper = Number.isFinite(customUpper) ? (customUpper as number) : currentTick + TICK_SPACING
    return { tickLower, tickUpper }
  }
  const preset = RANGE_PRESETS.find((p) => p.id === presetId)
  const pct = preset?.pct ?? 10
  return ticksFromPct(currentTick, pct)
}

export function isFullRange(tickLower: number, tickUpper: number): boolean {
  return tickLower <= FULL_RANGE.tickLower && tickUpper >= FULL_RANGE.tickUpper
}

/** Relative width vs spot price, as ±X% (half-width average). */
export function relativeWidthPct(
  tickLower: number,
  tickUpper: number,
  spotTick: number,
): number {
  const spot = priceAtTick(spotTick)
  if (!(spot > 0)) return 0
  const lo = priceAtTick(tickLower)
  const hi = priceAtTick(tickUpper)
  const down = ((spot - lo) / spot) * 100
  const up = ((hi - spot) / spot) * 100
  return (Math.abs(down) + Math.abs(up)) / 2
}

/**
 * Rough liquidity multiple vs full range for the same token budgets.
 * Higher = denser fee capture when in range.
 */
export function liquidityMultipleVsFull(
  sqrtPriceX96: bigint,
  tickLower: number,
  tickUpper: number,
  amount0: bigint,
  amount1: bigint,
): number | null {
  if (amount0 === 0n && amount1 === 0n) return null
  if (isFullRange(tickLower, tickUpper)) return 1
  const liqRange = getLiquidityForAmounts(
    sqrtPriceX96,
    getSqrtRatioAtTick(tickLower),
    getSqrtRatioAtTick(tickUpper),
    amount0,
    amount1,
  )
  const liqFull = getLiquidityForAmounts(
    sqrtPriceX96,
    getSqrtRatioAtTick(FULL_RANGE.tickLower),
    getSqrtRatioAtTick(FULL_RANGE.tickUpper),
    amount0,
    amount1,
  )
  if (liqFull === 0n || liqRange === 0n) return null
  return Number(liqRange) / Number(liqFull)
}

/** Format KNTQ-per-HYPE price for UI */
export function formatPrice(p: number, digits = 4): string {
  if (!Number.isFinite(p) || p <= 0) return '—'
  if (p >= 1000) return p.toFixed(Math.min(1, digits))
  if (p >= 100) return p.toFixed(Math.min(2, digits))
  if (p >= 1) return p.toPrecision(Math.max(digits, 4))
  return p.toPrecision(digits)
}

/** Budget strings from wallet balances, reserving gas in HYPE */
export function budgetsFromBalances(
  hypeWei: bigint,
  kntqWei: bigint,
  gasReserveHype = GAS_RESERVE_HYPE,
): { hype: string; kntq: string } {
  const reserve = parseUnits(String(gasReserveHype), 18)
  const hypeUse = hypeWei > reserve ? hypeWei - reserve : 0n
  const fmt = (v: bigint) => {
    const whole = v / 10n ** 18n
    const frac = (v % 10n ** 18n).toString().padStart(18, '0').slice(0, 6).replace(/0+$/, '')
    return frac ? `${whole}.${frac}` : `${whole}`
  }
  return { hype: fmt(hypeUse), kntq: fmt(kntqWei) }
}
