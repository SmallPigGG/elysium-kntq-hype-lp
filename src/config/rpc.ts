/** Public Elysium RPCs — failover order (verified 2026-11-09) */
export const RPC_URLS = [
  'https://rpc.eleos.fun',
  'https://rpc.elysiumswap.finance',
  'https://rpc.stockium.fun',
] as const

export type RpcUrl = (typeof RPC_URLS)[number]
