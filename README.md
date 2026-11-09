# KNTQ/HYPE Uniswap V4 LP (Elysium)

Local browser dapp for the KNTQ/native-HYPE Uniswap V4 pool on Elysium. It reads live chain data and lets you mint liquidity, collect fees, and withdraw a position.

Transactions are signed only in your own wallet. The app previews each call, simulates it with `eth_call`, then asks the wallet to sign once per step. It does not custody funds, hold keys, or widen slippage on its own.

The interface is in Chinese. Range buttons, position cards, and transaction previews use those labels.

## Run

From this repository root:

```bash
npm i && npm run dev
```

Open `http://localhost:5173/`.

Production build:

```bash
npm run build && npm run preview
```

Vite 8 needs Node `^20.19.0` or `>=22.12.0`. No `.env` file is required. RPC URLs and contract addresses are public constants in `src/config/`.

## Elysium (chain 99901)

Add or switch the wallet to Elysium. The connect bar calls `wallet_addEthereumChain` / `wallet_switchEthereumChain` when the wallet is on another chain, and passes the same RPC list the app uses (BOXA first). You can add the network manually with that same primary URL.

| Field | Value |
| --- | --- |
| Network name | Elysium |
| Chain ID | `99901` (`0x1863d`) |
| Native currency | HYPE, 18 decimals |
| RPC | `https://rpc-live.boxa.club` |
| Explorer | https://elyscan.fun |

The chain name sent to the wallet stays **Elysium**. MetaMask may show the network as “Elysium (via BOXA RPC)” when the endpoint is a BOXA RPC.

The app fails over across these public RPCs, in order:

1. https://rpc-live.boxa.club (BOXA, primary)
2. https://rpc.boxa.club (BOXA)
3. https://rpc.eleos.fun
4. https://rpc.elysiumswap.finance
5. https://rpc.stockium.fun

Treat public RPC responses as untrusted for display. Prefer your own RPC if you need stronger guarantees; this release does not yet expose a custom-RPC UI field.

## Contracts

Verified on Elysium on 2026-11-09.

| Name | Address |
| --- | --- |
| KNTQ | `0xe45a355d9e9cad2ad85f2d03e3ee3102a036acf0` |
| WHYPE | `0xba876237b0f021a6c6d852d6c26e107997cc5e81` |
| PoolId | `0xc96bfd21d36f8e7252f0d80fcb5f3bcacdf47c8b927b20711104713ebeb383ac` |
| PoolManager | `0xe2e105d3f7209a9da11f83ccf3e7398a753823f1` |
| PositionManager | `0x1d1c51b9d07fd27d36412a2b66cc23d19eb3e518` |
| StateView | `0x27ed73ae0652fdcf71d6793412a7525f32be9dfe` |
| Quoter | `0x379f556c5a748bd7cc9baf0f7a344094ac1814f5` |
| Permit2 | `0x000000000022d473030f116ddee9f6b43ac78ba3` |

PoolKey:

| Field | Value |
| --- | --- |
| currency0 | native HYPE (`address(0)`) |
| currency1 | KNTQ |
| fee | `10000` (1%) |
| tickSpacing | `200` |
| hooks | `address(0)` |

Full-range ticks: `-887200` to `887200`.

KNTQ is approved to canonical Permit2 for the **exact amount needed** for that mint/increase (+0.1% buffer), then Permit2 is approved to the PositionManager for the same capped amount with a **~1 hour** expiry. Native HYPE is sent as `msg.value` and excess is returned with `SWEEP`.

## What you can do

1. Connect an EIP-1193 wallet and switch to Elysium.
2. Read HYPE and KNTQ balances and the on-chain slot0 price.
3. Mint a new position or add to an existing token id.
4. Browse your positions (principal, uncollected fees, a short-window APR). Sort by principal, fees, APR, or token id. Positions with `liquidity = 0` are hidden.
5. Collect fees or withdraw (burn the position NFT). Each action opens a preview; **each approval and the main call is a separate in-app confirm** with its own `eth_call` + wallet signature.
6. A stale-data banner appears when the pool quote is older than about 20 seconds. Refresh before sending.
7. Collect and withdraw use the same user-set slippage / deadline controls shown in the meta panel (default `0.5%` / `20` min). Fee collect mins are expected fees minus that slippage (not `0`).

USD figures are display-only. Paste a HYPE/USD price yourself; the app does not invent a quote.

## Range presets

Mint ranges are centered on the current tick and aligned to `tickSpacing = 200`. Default is **均衡 ±10%**.

| Preset | Width | Notes |
| --- | --- | --- |
| 激进 ±2% | ±2% | Densest fees. A small move leaves the range. |
| 积极 ±5% | ±5% | Faster fees, easier to fall out of range. |
| 均衡 ±10% | ±10% | Default. Balance of fee density and range risk. |
| 稳健 ±20% | ±20% | Wider, lower fee density than the narrow presets. |
| 全区间 | full | Ticks `-887200` … `887200`. Almost never out of range; very little active liquidity. |
| 自定义 | custom | You type both ticks. They must match spacing `200`. |

The form shows the price band, whether spot is inside it, and a rough liquidity multiple versus full range for the same token budgets.

## SECURITY

- **No keys in the repo or app.** There is no backend, no remote signer, and no private key / seed phrase storage. Clone and run locally; only your browser wallet signs.
- **「模拟」≠ 测网.** Preview simulation is `eth_call` against live Elysium `99901` (mainnet already live). It checks whether the call would revert and estimates gas; it does not mean a separate test network.
- **Capped approvals.** ERC-20 approve to Permit2 and Permit2→PositionManager use the amount needed for that mint/increase (+0.1% buffer), not `maxUint256` / `2^160-1`. Permit2 expiry is about **1 hour**, not 30 days unlimited.
- **Per-step confirms.** Approve KNTQ, Approve Permit2, and the main LP tx each require their own in-app confirm + wallet signature. The app does not chain all wallet popups after one click.
- **No automatic slippage widen / no auto-resend.** Min/max amounts use the slippage percent you typed. A failed send is not retried and is not resubmitted with looser bounds.
- **No secrets committed.** `.env` / `.env.*` are gitignored. Do not commit private keys, seed phrases, or personal wallet addresses.
- **RPC trust.** Default RPCs are public. A malicious or wrong RPC can lie about prices or simulation results; always read the wallet’s own transaction summary before signing.

## Known limits

**`eth_getLogs` is capped at about 2000 blocks** on the public Elysium RPCs. Position discovery therefore:

1. Scans `ownerOf` on a recent `nextTokenId` window (latest ~120 ids) so new mints still show up when logs are capped.
2. Supplements that with `Transfer` logs in ~1800-block chunks over a ~30,000-block lookback.

If a chunked log query fails, the list falls back to that `ownerOf` window. Older positions outside both the window and the log lookback may be missing from the grid.

**TokenId withdraw fallback.** If the list is empty or the scan fails, use **TokenId 快速撤池** on the positions panel. Enter the NFT id, and the app loads `ownerOf`, liquidity, and ticks, then opens the same withdraw preview (owner must be the connected wallet, liquidity must be non-zero).

Uncollected fees come from StateView `getPositionInfo` and `getFeeGrowthInside`. If a node cannot serve that read, the card shows `0` fees while principal still comes from real liquidity. This pool has `hooks = address(0)`; hooked positions are out of scope.

Custom RPC field in the UI is deferred (document trust above instead).

## License

Source in this repository is provided as-is for local use against the public contracts above. Review every transaction in your wallet before signing.
