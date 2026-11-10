/** Public Elysium RPCs — BOXA first, then failover (chain 99901 / 0x1863d, verified 2026-11-09) */
export const RPC_URLS = [
  'https://rpc.elysium.kinetiq.xyz'
] as const

export type RpcUrl = (typeof RPC_URLS)[number]
