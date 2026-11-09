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
  const approvals = preview.approvals ?? []
  const totalSteps = approvals.length + 1
  const stepNum = preview.stepIndex + 1
  const isApproval = preview.stepIndex < approvals.length
  const currentApproval = isApproval ? approvals[preview.stepIndex] : null

  const confirmLabel = simulating
    ? '模拟中…'
    : sending
      ? '等待钱包…'
      : isApproval
        ? `模拟并签名 · 步骤 ${stepNum}/${totalSteps}（授权）`
        : `模拟并签名 · 步骤 ${stepNum}/${totalSteps}（主交易）`

  return (
    <div className="modal-backdrop" role="dialog">
      <div className="modal">
        <h2>{preview.title}</h2>
        <p className="muted small">
          分步确认：每一步单独模拟、单独签名；不会一次连弹多笔钱包弹窗。
        </p>
        <ul className="summary">
          {preview.summary.map((s) => (
            <li key={s}>{s}</li>
          ))}
          {approvals.length > 0 && (
            <li>
              共 {totalSteps} 步（{approvals.length} 笔授权 + 1 笔主交易），当前第 {stepNum} 步
            </li>
          )}
          {currentApproval && (
            <li>
              <strong>当前步骤：{currentApproval.label}</strong>
              {currentApproval.detail?.map((d) => (
                <div key={d} className="mono small">
                  {d}
                </div>
              ))}
            </li>
          )}
          {!isApproval && (
            <li>
              <strong>当前步骤：主交易</strong>
              <div className="mono small">to: {preview.to}</div>
              <div>
                发送 value：{formatUnits(preview.value, 18)} HYPE（原生）
              </div>
            </li>
          )}
          <li className="muted">
            签名前会 eth_call 模拟（真实 Elysium 99901，不是测网）；失败不会自动重发或放宽滑点
          </li>
        </ul>
        {error && <p className="err">{error}</p>}
        <div className="row gap">
          <button className="btn" disabled={busy} onClick={onCancel}>
            取消
          </button>
          <button className="btn primary" disabled={busy} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
