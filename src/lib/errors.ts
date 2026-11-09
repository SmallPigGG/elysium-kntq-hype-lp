export function toChineseError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()
  if (lower.includes('user rejected') || lower.includes('denied') || lower.includes('rejected the request')) {
    return '用户取消了钱包签名'
  }
  if (lower.includes('insufficient funds')) return '余额不足（含 Gas）'
  if (lower.includes('rpc') || lower.includes('fetch') || lower.includes('network') || lower.includes('timeout')) {
    return `RPC 请求失败：${msg}`
  }
  if (lower.includes('execution reverted') || lower.includes('revert')) {
    return `链上模拟/执行回退：${msg}`
  }
  if (lower.includes('slippage') || lower.includes('minmax')) {
    return `滑点或数量保护触发：${msg}`
  }
  return msg
}
