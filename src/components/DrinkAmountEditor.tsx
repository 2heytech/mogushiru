import { canStepDown, drinkAmount, drinkAmountLabel, drinkCount, drinkCup, drinkSizeLabel, nextCount, prevCount, type DrinkSpec } from '../domain/drinks'
import type { MenuItem } from '../domain/types'

const STEP_BUTTON = 'grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-xl leading-none font-bold shadow-sm hover:bg-coral/10 disabled:opacity-40 disabled:shadow-none'

// 飲み物の量：1杯の量（缶・コップ・中ジョッキなど）と、何杯
export function DrinkAmountEditor({ item, spec, onChange }: { item: MenuItem; spec: DrinkSpec; onChange: (amount: Pick<MenuItem, 'portion' | 'cup'>) => void }) {
  const cup = drinkCup(item, spec)
  const count = drinkCount(item, spec)
  // 合計の量（mL）。1杯の量がえらべるもの・mL で数える市販品だけ
  const totalMl = spec.sizes.length > 1 || (spec.per === 'ml' && cup.ml > 0) ? Math.round(count * cup.ml) : null
  return (
    <div className="space-y-3">
      {spec.sizes.length > 1 && (
        <fieldset>
          <legend className="mb-1.5 text-sm font-bold">1{cup.unit === '本' ? '本' : '杯'}の量</legend>
          <div className="flex flex-wrap gap-1.5">
            {spec.sizes.map((s) => {
              const on = s.ml === cup.ml && s.label === cup.label && s.unit === cup.unit
              return (
                <button
                  key={`${s.label}-${s.ml}`}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange(drinkAmount(spec, count, s))}
                  className={`min-h-10 rounded-full px-3 text-sm whitespace-nowrap tabular-nums ${on ? 'bg-coral font-bold text-ink-strong' : 'bg-white'}`}
                >
                  {drinkSizeLabel(s)}
                </button>
              )
            })}
          </div>
          {cup.approx && <p className="mt-1.5 text-xs text-ink-soft">{cup.label}の量はお店によってちがいます（350〜500mLほど）</p>}
        </fieldset>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex items-center gap-2" role="group" aria-label={`何${cup.unit}`}>
          <button type="button" onClick={() => onChange(drinkAmount(spec, prevCount(count), cup))} disabled={!canStepDown(count)} aria-label={`1${cup.unit}へらす`} className={STEP_BUTTON}>
            −
          </button>
          <output className="min-w-24 text-center text-lg font-bold tabular-nums" aria-live="polite">
            {drinkAmountLabel(cup, count)}
          </output>
          <button type="button" onClick={() => onChange(drinkAmount(spec, nextCount(count), cup))} aria-label={`1${cup.unit}ふやす`} className={STEP_BUTTON}>
            ＋
          </button>
        </div>
        {totalMl !== null && <span className="text-sm text-ink-soft tabular-nums">合計 {totalMl.toLocaleString()}mL</span>}
      </div>
    </div>
  )
}
