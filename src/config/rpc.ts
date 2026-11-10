/** Public Elysium RPCs — multiple failover endpoints (chain 99901).
 * Official Conduit node is rate-limited; others are independent public nodes.
 */
export const RPC_URLS = [
  'https://rpc.montramarkets.xyz',
  'https://rpc.ascendlaunch.xyz',
  'https://rpc-live.boxa.club',
  'https://rpc.stockium.fun',
  'https://rpc.elysium.kinetiq.xyz',
] as const

export type RpcUrl = (typeof RPC_URLS)[number]
