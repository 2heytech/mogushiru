import { dangoMoods, dangoScale } from '../domain/mascotMood'
import type { PfcGap } from '../domain/pfcGap'
import type { PfcKey } from '../domain/slotBalance'
import { PFC_COLOR, PFC_LABEL } from './labels'
import { PfcDango } from './Mascot'
import { GapBadge } from './PfcCompare'

const FACE_TEXT = { happy: 'ちょうどいい', worried: '少ない', alert: '多い', okay: '' } as const

// 1日のPFCバランスを「PFCだんごモグ」で見せる。だんごの大きさ＝いまの割合、点線の丸＝目標の大きさ。
// 下に P・F・C ごとの割合・目標範囲・グラム・ずれを並べる（列はだんごの位置にそろえる）
export function PfcDangoView({ gaps, gramRanges }: { gaps: PfcGap[]; gramRanges: Record<PfcKey, { lo: number; hi: number }> }) {
  const moods = dangoMoods(gaps)
  const scales = Object.fromEntries(gaps.map((g) => [g.key, dangoScale(g)])) as Record<PfcKey, number>
  const label = gaps.map((g) => `${PFC_LABEL[g.key]}${Math.round(g.ratio)}%（${FACE_TEXT[moods[g.key]]}）`).join('、')
  return (
    <div className="rounded-2xl bg-white/70 p-3">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <p className="text-sm font-bold">PFCバランス</p>
        <p className="flex items-center gap-1 text-[11px] text-ink-soft">
          <span className="inline-block h-3 w-3 rounded-full border border-dashed border-ink/50" aria-hidden />
          点線＝目標の大きさ
        </p>
      </div>
      <PfcDango moods={moods} scales={scales} className="w-full" label={`PFCだんごモグ：${label}`} />
      <ul className="mt-1 grid grid-cols-3 gap-1 text-center">
        {gaps.map((g) => (
          <li key={g.key} className="min-w-0 space-y-0.5">
            <p className="flex items-center justify-center gap-1 text-xs font-bold whitespace-nowrap">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PFC_COLOR[g.key] }} aria-hidden />
              {PFC_LABEL[g.key]}
            </p>
            <p className="text-xl leading-none font-bold tabular-nums">{Math.round(g.ratio)}%</p>
            <p className="text-[11px] leading-tight text-ink-soft tabular-nums">
              目標 {g.range.lo}〜{g.range.hi}%
              <br />
              {Math.round(g.grams)}g（{Math.round(gramRanges[g.key].lo)}〜{Math.round(gramRanges[g.key].hi)}g）
            </p>
            <GapBadge gap={g.gap} />
          </li>
        ))}
      </ul>
    </div>
  )
}
