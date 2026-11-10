import { defineChain } from 'viem'
import { CHAIN_ID } from './contracts'
import { RPC_URLS } from './rpc'

export const elysium = defineChain({
  id: CHAIN_ID,
  name: 'Elysium',
  nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
  rpcUrls: {
    default: { http: [...RPC_URLS] },
  },
  blockExplorers: {
    default: { name: 'Elyscan', url: 'https://elyscan.fun' },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
    },
  },
})
