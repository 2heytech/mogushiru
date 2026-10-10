import { gapText, type PfcGap } from '../domain/pfcGap'
import type { PfcKey } from '../domain/slotBalance'
import { PFC_COLOR, PFC_LABEL } from './labels'

const SHORT: Record<PfcKey, string> = { p: 'P', f: 'F', c: 'C' }

function StackedBar({ ratio, thin }: { ratio: Record<PfcKey, number>; thin?: boolean }) {
  return (
    <div className={`flex overflow-hidden rounded-full font-bold text-ink ${thin ? 'h-3 text-[0px]' : 'h-5 text-[10px]'}`}>
      {(['p', 'f', 'c'] as const).map((k) => (
        <div
          key={k}
          className="grid place-items-center overflow-hidden whitespace-nowrap transition-all duration-500"
          style={{ width: `${ratio[k]}%`, background: PFC_COLOR[k] }}
        >
          {ratio[k] >= 12 && `${SHORT[k]} ${Math.round(ratio[k])}%`}
        </div>
      ))}
    </div>
  )
}

// 「目標（範囲のまんなか）」と「いま」のPFCバランスを上下に並べて、ずれを見比べられるようにする
export function PfcBars({ ideal, actual, thin }: { ideal: Record<PfcKey, number>; actual: Record<PfcKey, number>; thin?: boolean }) {
  const label = (k: PfcKey, r: Record<PfcKey, number>) => `${PFC_LABEL[k]}${Math.round(r[k])}%`
  return (
    <div
      className="grid grid-cols-[2.5rem_1fr] items-center gap-x-2 gap-y-1 text-xs"
      role="img"
      aria-label={`PFCバランス 目標 ${(['p', 'f', 'c'] as const).map((k) => label(k, ideal)).join('・')}、いま ${(['p', 'f', 'c'] as const)
        .map((k) => label(k, actual))
        .join('・')}`}
    >
      <span className="text-ink-soft">目標</span>
      <div className="opacity-60">
        <StackedBar ratio={ideal} thin={thin} />
      </div>
      <span className="font-bold">いま</span>
      <StackedBar ratio={actual} thin={thin} />
    </div>
  )
}

export function GapBadge({ gap }: { gap: number }) {
  const cls = gap === 0 ? 'bg-ok/20' : gap < 0 ? 'bg-coral/20' : 'bg-alert/20'
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap ${cls}`}>{gap === 0 ? '◎ ' : ''}{gapText(gap)}</span>
}

// 1日のまとめ欄用：P・F・C ごとに「いま」「目標範囲」「ずれ」を並べる
export function PfcGapList({ gaps, gramRanges }: { gaps: PfcGap[]; gramRanges: Record<PfcKey, { lo: number; hi: number }> }) {
  return (
    <ul className="space-y-1.5">
      {gaps.map((g) => (
        <li key={g.key} className="flex items-center gap-2 text-sm">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: PFC_COLOR[g.key] }} aria-hidden />
          <span className="w-[4.5rem] shrink-0 whitespace-nowrap">{PFC_LABEL[g.key]}</span>
          <span className="min-w-0 flex-1 tabular-nums">
            <strong>{Math.round(g.ratio)}%</strong>
            <span className="text-xs text-ink-soft"> 目標 {g.range.lo}〜{g.range.hi}%</span>
            <span className="block text-xs text-ink-soft">
              {Math.round(g.grams)}g（{Math.round(gramRanges[g.key].lo)}〜{Math.round(gramRanges[g.key].hi)}g）
            </span>
          </span>
          <GapBadge gap={g.gap} />
        </li>
      ))}
    </ul>
  )
}
