import { useMemo, useState } from 'react'
import type { LpPosition } from '../hooks/usePositions'
import { PositionCard } from './PositionCard'

type SortKey = 'principal' | 'fees' | 'apr' | 'id'

export function PositionGrid({
  positions,
  loading,
  error,
  manualTokenId,
  onManualTokenIdChange,
  onManualWithdraw,
  onManualLoad,
  onRefresh,
  onCollect,
  onWithdraw,
}: {
  positions: LpPosition[]
  loading: boolean
  error?: string | null
  manualTokenId: string
  onManualTokenIdChange: (v: string) => void
  onManualWithdraw: () => void
  onManualLoad: () => void
  onRefresh: () => void
  onCollect: (p: LpPosition) => void
  onWithdraw: (p: LpPosition) => void
}) {
  const [sort, setSort] = useState<SortKey>('principal')

  const sorted = useMemo(() => {
    const arr = [...positions]
    arr.sort((a, b) => {
      if (sort === 'id') return a.tokenId > b.tokenId ? -1 : 1
      if (sort === 'principal') return (b.principalUsd ?? 0) - (a.principalUsd ?? 0)
      if (sort === 'fees') return (b.feesUsd ?? 0) - (a.feesUsd ?? 0)
      return (b.aprPct ?? -1) - (a.aprPct ?? -1)
    })
    return arr
  }, [positions, sort])

  return (
    <section className="panel panel-positions">
      <div className="row between wrap gap">
        <h2>持仓</h2>
        <label className="inline-label">
          排序{' '}
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="principal">本金 USD</option>
            <option value="fees">待领收益</option>
            <option value="apr">近期年化</option>
            <option value="id">TokenId</option>
          </select>
        </label>
      </div>

      <div className="quick-withdraw">
        <div className="quick-withdraw-head">
          <strong>TokenId 快速撤池</strong>
          <span className="muted small">列表为空或扫描失败时可直接填 NFT 编号</span>
        </div>
        <div className="row gap wrap">
          <label className="grow">
            tokenId
            <input
              value={manualTokenId}
              onChange={(e) => onManualTokenIdChange(e.target.value)}
              placeholder="例如 827"
            />
          </label>
          <button className="btn" type="button" onClick={onManualLoad}>
            加载到列表
          </button>
          <button className="btn danger" type="button" onClick={onManualWithdraw}>
            预览撤池 #{manualTokenId || '…'}
          </button>
          <button className="btn" type="button" onClick={onRefresh}>
            刷新列表
          </button>
        </div>
      </div>

      {loading && <p className="muted">读取链上仓位…</p>}
      {error && <p className="err">持仓读取失败：{error}</p>}
      {!loading && !error && sorted.length === 0 && (
        <p className="muted">
          暂无本池活跃仓位。可点「刷新列表」，或在上方输入 TokenId 后点「加载到列表」。
        </p>
      )}
      <div className="cards">
        {sorted.map((p) => (
          <PositionCard key={p.tokenId.toString()} pos={p} onCollect={onCollect} onWithdraw={onWithdraw} />
        ))}
      </div>
    </section>
  )
}
