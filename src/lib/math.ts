/** Uniswap V3/V4 liquidity & price helpers (Q64.96 / Q128) */

const Q96 = 2n ** 96n
const Q128 = 2n ** 128n

export function mulDiv(a: bigint, b: bigint, denom: bigint): bigint {
  return (a * b) / denom
}

/** token1 / token0 human price from sqrtPriceX96 */
export function priceFromSqrtX96(sqrtPriceX96: bigint, decimals0 = 18, decimals1 = 18): number {
  if (sqrtPriceX96 === 0n) return 0
  // price = (sqrtP / 2^96)^2 * 10^(dec0-dec1)
  const num = Number(sqrtPriceX96) / Number(Q96)
  const raw = num * num
  const scale = 10 ** (decimals0 - decimals1)
  return raw * scale
}

export function getAmount0ForLiquidity(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  liquidity: bigint,
): bigint {
  let a = sqrtRatioAX96
  let b = sqrtRatioBX96
  if (a > b) [a, b] = [b, a]
  if (a === 0n) return 0n
  return mulDiv(mulDiv(liquidity, Q96, a), b - a, b)
}

export function getAmount1ForLiquidity(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  liquidity: bigint,
): bigint {
  let a = sqrtRatioAX96
  let b = sqrtRatioBX96
  if (a > b) [a, b] = [b, a]
  return mulDiv(liquidity, b - a, Q96)
}

export function getAmountsForLiquidity(
  sqrtRatioX96: bigint,
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  liquidity: bigint,
): { amount0: bigint; amount1: bigint } {
  let a = sqrtRatioAX96
  let b = sqrtRatioBX96
  if (a > b) [a, b] = [b, a]
  if (sqrtRatioX96 <= a) {
    return { amount0: getAmount0ForLiquidity(a, b, liquidity), amount1: 0n }
  }
  if (sqrtRatioX96 < b) {
    return {
      amount0: getAmount0ForLiquidity(sqrtRatioX96, b, liquidity),
      amount1: getAmount1ForLiquidity(a, sqrtRatioX96, liquidity),
    }
  }
  return { amount0: 0n, amount1: getAmount1ForLiquidity(a, b, liquidity) }
}

export function getLiquidityForAmount0(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  amount0: bigint,
): bigint {
  let a = sqrtRatioAX96
  let b = sqrtRatioBX96
  if (a > b) [a, b] = [b, a]
  const intermediate = mulDiv(a, b, Q96)
  return mulDiv(amount0, intermediate, b - a)
}

export function getLiquidityForAmount1(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  amount1: bigint,
): bigint {
  let a = sqrtRatioAX96
  let b = sqrtRatioBX96
  if (a > b) [a, b] = [b, a]
  return mulDiv(amount1, Q96, b - a)
}

export function getLiquidityForAmounts(
  sqrtRatioX96: bigint,
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  amount0: bigint,
  amount1: bigint,
): bigint {
  let a = sqrtRatioAX96
  let b = sqrtRatioBX96
  if (a > b) [a, b] = [b, a]
  if (sqrtRatioX96 <= a) return getLiquidityForAmount0(a, b, amount0)
  if (sqrtRatioX96 < b) {
    const liq0 = getLiquidityForAmount0(sqrtRatioX96, b, amount0)
    const liq1 = getLiquidityForAmount1(a, sqrtRatioX96, amount1)
    return liq0 < liq1 ? liq0 : liq1
  }
  return getLiquidityForAmount1(a, b, amount1)
}

/** Approximate TickMath.getSqrtRatioAtTick for full-range / common ticks */
export function getSqrtRatioAtTick(tick: number): bigint {
  // Use well-known boundary values + geometric interpolation via abs(tick)
  // Full Uniswap TickMath port (subset) — accurate enough for UI + mint sizing.
  const absTick = tick < 0 ? -tick : tick
  let ratio =
    (absTick & 0x1) !== 0
      ? 0xfffcb933bd6fad37aa2d162d1a594001n
      : 0x100000000000000000000000000000000n
  if ((absTick & 0x2) !== 0) ratio = (ratio * 0xfff97272373d413259a46990580e213an) >> 128n
  if ((absTick & 0x4) !== 0) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdccn) >> 128n
  if ((absTick & 0x8) !== 0) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0n) >> 128n
  if ((absTick & 0x10) !== 0) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644n) >> 128n
  if ((absTick & 0x20) !== 0) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0n) >> 128n
  if ((absTick & 0x40) !== 0) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861n) >> 128n
  if ((absTick & 0x80) !== 0) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053n) >> 128n
  if ((absTick & 0x100) !== 0) ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4n) >> 128n
  if ((absTick & 0x200) !== 0) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54n) >> 128n
  if ((absTick & 0x400) !== 0) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3n) >> 128n
  if ((absTick & 0x800) !== 0) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9n) >> 128n
  if ((absTick & 0x1000) !== 0) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825n) >> 128n
  if ((absTick & 0x2000) !== 0) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5n) >> 128n
  if ((absTick & 0x4000) !== 0) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7n) >> 128n
  if ((absTick & 0x8000) !== 0) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6n) >> 128n
  if ((absTick & 0x10000) !== 0) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9n) >> 128n
  if ((absTick & 0x20000) !== 0) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604n) >> 128n
  if ((absTick & 0x40000) !== 0) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98n) >> 128n
  if ((absTick & 0x80000) !== 0) ratio = (ratio * 0x48a170391f7dc42444e8fa2n) >> 128n

  if (tick > 0) ratio = (2n ** 256n - 1n) / ratio
  // round up to Q64.96
  return (ratio >> 32n) + (ratio % (1n << 32n) === 0n ? 0n : 1n)
}

export function feesFromGrowth(
  liquidity: bigint,
  feeGrowthInsideX128: bigint,
  feeGrowthInsideLastX128: bigint,
): bigint {
  if (liquidity === 0n) return 0n
  const delta =
    feeGrowthInsideX128 >= feeGrowthInsideLastX128
      ? feeGrowthInsideX128 - feeGrowthInsideLastX128
      : // overflow wrap
        2n ** 256n - feeGrowthInsideLastX128 + feeGrowthInsideX128
  return mulDiv(delta, liquidity, Q128)
}

export function applySlippageMax(amount: bigint, slippagePct: number): bigint {
  // never auto-widen: caller passes user slippage only
  const bps = BigInt(Math.round(slippagePct * 100)) // 0.5% -> 50 bps
  return amount + (amount * bps) / 10_000n
}

export function applySlippageMin(amount: bigint, slippagePct: number): bigint {
  const bps = BigInt(Math.round(slippagePct * 100))
  const v = amount - (amount * bps) / 10_000n
  return v < 0n ? 0n : v
}

export function formatUnits(value: bigint, decimals: number, digits = 6): string {
  const neg = value < 0n
  const v = neg ? -value : value
  const base = 10n ** BigInt(decimals)
  const whole = v / base
  const frac = v % base
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, digits).replace(/0+$/, '')
  return `${neg ? '-' : ''}${whole}${fracStr ? '.' + fracStr : ''}`
}

export function parseUnits(value: string, decimals: number): bigint {
  const t = value.trim()
  if (!t || t === '.') return 0n
  const [w, f = ''] = t.split('.')
  const frac = (f + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(w || '0') * 10n ** BigInt(decimals) + BigInt(frac || '0')
}

export function decodePositionInfo(info: bigint): {
  tickLower: number
  tickUpper: number
  hasSubscriber: boolean
} {
  const tickLowerRaw = Number((info >> 8n) & 0xffffffn)
  const tickUpperRaw = Number((info >> 32n) & 0xffffffn)
  const signExtend = (n: number) => (n >= 0x800000 ? n - 0x1000000 : n)
  return {
    tickLower: signExtend(tickLowerRaw),
    tickUpper: signExtend(tickUpperRaw),
    hasSubscriber: (info & 0xffn) !== 0n,
  }
}
