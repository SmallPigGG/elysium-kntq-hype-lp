import type { TxPreview } from '../hooks/useTxFlow'
import { formatUnits } from '../lib/math'

export function TxPreviewModal({
  preview,
  simulating,
  sending,
  error,
  onConfirm,
  onCancel,
}: {
  preview: TxPreview
  simulating: boolean
  sending: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  const busy = simulating || sending
  return (
    <div className="modal-backdrop" role="dialog">
      <div className="modal">
        <h2>{preview.title}</h2>
        <ul className="summary">
          {preview.summary.map((s) => (
            <li key={s}>{s}</li>
          ))}
          {(preview.approvals?.length ?? 0) > 0 && (
            <li>
              将先请求 {preview.approvals!.length} 笔授权（KNTQ/Permit2），每笔需你手动签名
            </li>
          )}
          <li>
            发送 value：{formatUnits(preview.value, 18)} HYPE（原生）
          </li>
          <li className="muted">签名前会 eth_call 模拟；失败不会自动重发或放宽滑点</li>
        </ul>
        {error && <p className="err">{error}</p>}
        <div className="row gap">
          <button className="btn" disabled={busy} onClick={onCancel}>
            取消
          </button>
          <button className="btn primary" disabled={busy} onClick={onConfirm}>
            {simulating ? '模拟中…' : sending ? '等待钱包…' : '模拟并签名发送'}
          </button>
        </div>
      </div>
    </div>
  )
}
