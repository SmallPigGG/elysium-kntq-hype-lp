export function StaleBanner({
  stale,
  onRefresh,
  rpcError,
}: {
  stale: boolean
  onRefresh: () => void
  rpcError?: string | null
}) {
  if (!stale && !rpcError) return null
  return (
    <div className={`banner ${rpcError ? 'banner-err' : 'banner-warn'}`}>
      {rpcError ? (
        <span>RPC 故障：{rpcError}（已尝试故障切换）</span>
      ) : (
        <span>行情/槽位数据已过期（&gt;20s），请刷新后再交易</span>
      )}
      <button className="btn" onClick={onRefresh}>
        立即刷新
      </button>
    </div>
  )
}
