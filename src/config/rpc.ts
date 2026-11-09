/** Public Elysium RPCs — BOXA first, then failover (chain 99901 / 0x1863d, verified 2026-11-09) */
export const RPC_URLS = [
  'https://rpc-live.boxa.club',
  'https://rpc.boxa.club',
  'https://rpc.eleos.fun',
  'https://rpc.elysiumswap.finance',
  'https://rpc.stockium.fun',
] as const

export type RpcUrl = (typeof RPC_URLS)[number]
