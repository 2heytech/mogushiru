import type { ReactNode } from 'react'
import { dangoMoods, dangoScale } from '../domain/mascotMood'
import type { PfcGap } from '../domain/pfcGap'
import type { PfcKey } from '../domain/slotBalance'
import { PFC_COLOR, PFC_LABEL } from './labels'
import { PfcDango } from './Mascot'
import { GapBadge } from './PfcCompare'

const FACE_TEXT = { happy: 'ちょうどいい', worried: '少ない', alert: '多い', okay: '' } as const

// 棒グラフの目盛り：目標の上限の 1.4 倍を棒の高さいっぱいにする（目標の帯の位置が3本ともそろう）
const BAR_MAX = 1.4

// 1日のPFCバランスを「PFCだんごモグ」で見せる。だんごの大きさ＝いまの割合、点線の丸＝目標の大きさ。
// 下に P・F・C ごとの割合・ずれと、とった量（g）の縦の棒グラフを並べる。
// 行ごとに3列をそろえる（文字が折り返しても、バッジや棒の高さが列でずれない）
export function PfcDangoView({ gaps, gramRanges }: { gaps: PfcGap[]; gramRanges: Record<PfcKey, { lo: number; hi: number }> }) {
  const moods = dangoMoods(gaps)
  const scales = Object.fromEntries(gaps.map((g) => [g.key, dangoScale(g)])) as Record<PfcKey, number>
  const label = gaps.map((g) => `${PFC_LABEL[g.key]}${Math.round(g.ratio)}%（${FACE_TEXT[moods[g.key]]}）`).join('、')
  const row = (render: (g: PfcGap) => ReactNode, className = '') =>
    gaps.map((g) => (
      <div key={g.key} className={`flex min-w-0 justify-center text-center ${className}`}>
        {render(g)}
      </div>
    ))
  return (
    <div className="h-full rounded-2xl bg-white/70 p-3">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <p className="text-sm font-bold">PFCバランス</p>
        <p className="flex items-center gap-1 text-[11px] text-ink-soft">
          <span className="inline-block h-3 w-3 rounded-full border border-dashed border-ink/50" aria-hidden />
          点線＝目標の大きさ
        </p>
      </div>
      <PfcDango moods={moods} scales={scales} className="w-full" label={`PFCだんごモグ：${label}`} />
      <div className="mt-1 grid grid-cols-3 gap-x-1 gap-y-1">
        {row(
          (g) => (
            <p className="flex items-center gap-1 text-xs font-bold whitespace-nowrap">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PFC_COLOR[g.key] }} aria-hidden />
              {PFC_LABEL[g.key]}
            </p>
          ),
          'items-center',
        )}
        {row((g) => (
          <p className="text-xl leading-none font-bold tabular-nums">{Math.round(g.ratio)}%</p>
        ))}
        {row((g) => (
          <p className="text-[11px] leading-tight whitespace-nowrap text-ink-soft tabular-nums">
            目標 {g.range.lo}〜{g.range.hi}%
          </p>
        ))}
        {row((g) => (
          <GapBadge gap={g.gap} />
        ), 'items-start')}
      </div>

      <div className="mt-3 border-t border-dashed border-ink/15 pt-2">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <p className="text-xs font-bold">とった量</p>
          <p className="flex items-center gap-1 text-[11px] text-ink-soft">
            <span className="inline-block h-2.5 w-3 rounded-sm border border-dashed border-ink/40 bg-ink/5" aria-hidden />
            帯＝目標の量
          </p>
        </div>
        <div className="grid grid-cols-3 gap-x-1 gap-y-0.5">
          {row((g) => (
            <p className="leading-none whitespace-nowrap tabular-nums">
              <span className="text-lg font-bold">{Math.round(g.grams)}</span>
              <span className="text-xs font-bold">g</span>
            </p>
          ), 'items-end')}
          {row((g) => (
            <GramBar g={g} range={gramRanges[g.key]} />
          ))}
          {row((g) => (
            <p className="text-[11px] leading-tight text-ink-soft tabular-nums">
              <span className="block whitespace-nowrap">
                目標 {Math.round(gramRanges[g.key].lo)}〜{Math.round(gramRanges[g.key].hi)}g
              </span>
              <span className="block whitespace-nowrap">{Math.round(g.kcal).toLocaleString()} kcal</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

// とった量（g）の縦の棒。うしろの帯が目標の量（g）の範囲
function GramBar({ g, range }: { g: PfcGap; range: { lo: number; hi: number } }) {
  const max = range.hi * BAR_MAX
  const h = (v: number) => `${Math.min(v / max, 1) * 100}%`
  const overflow = g.grams > max
  const where = g.grams < range.lo ? '目標より少ない' : g.grams > range.hi ? '目標より多い' : '目標の範囲'
  return (
    <div
      className="relative h-28 w-14 rounded-t-xl rounded-b-md bg-ink/5"
      role="img"
      aria-label={`${PFC_LABEL[g.key]} ${Math.round(g.grams)}g（目標 ${Math.round(range.lo)}〜${Math.round(range.hi)}g、${where}）`}
    >
      <div
        className="absolute inset-x-0 border-y-2 border-dashed border-ink/30"
        style={{
          bottom: h(range.lo),
          height: `calc(${h(range.hi)} - ${h(range.lo)})`,
          background: `color-mix(in srgb, ${PFC_COLOR[g.key]} 22%, white)`,
        }}
        aria-hidden
      />
      <div
        className="absolute inset-x-2 bottom-0 rounded-t-lg rounded-b-sm shadow-[inset_0_-3px_0_rgba(0,0,0,0.08)] transition-all duration-500"
        style={{ height: h(g.grams), background: PFC_COLOR[g.key], minHeight: g.grams > 0 ? 3 : 0 }}
        aria-hidden
      />
      {overflow && (
        <span className="absolute inset-x-0 -top-1 text-center text-[10px] leading-none font-bold text-alert" aria-hidden>
          ▲
        </span>
      )}
    </div>
  )
}
