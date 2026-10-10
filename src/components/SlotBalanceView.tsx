import { slotBalance, type EnergyLevel, type PfcKey } from '../domain/slotBalance'
import type { Targets } from '../domain/targets'
import type { NutrientTotals, Slot } from '../domain/types'

const PFC_LABEL: Record<PfcKey, string> = { p: 'たんぱく質', f: '脂質', c: '炭水化物' }
const PFC_COLOR: Record<PfcKey, string> = { p: 'var(--color-protein)', f: 'var(--color-fat)', c: 'var(--color-carb)' }

const ENERGY_TEXT: Record<Exclude<EnergyLevel, 'empty'>, string> = { low: '少なめ', ok: 'ちょうどいい', high: '多め' }
const ENERGY_COLOR: Record<Exclude<EnergyLevel, 'empty'>, string> = { low: 'bg-coral', ok: 'bg-ok', high: 'bg-alert' }

// 区分ごとのカロリー（目安との比較）とPFCバランス
export function SlotBalanceView({ totals, slot, targets }: { totals: NutrientTotals; slot: Slot; targets: Targets }) {
  const b = slotBalance(totals, slot, targets)
  if (b.energy === 'empty') return null
  const v = totals.values
  const max = b.targetKcal * 2
  return (
    <div className="mt-3 space-y-2 rounded-2xl bg-cream/70 p-3 text-xs">
      <div>
        <div className="mb-1 flex justify-between">
          <span className="text-ink-soft">
            カロリー <strong className="text-ink">{ENERGY_TEXT[b.energy]}</strong>
          </span>
          <span className="tabular-nums text-ink-soft">目安 {b.targetKcal} kcal</span>
        </div>
        <div className="relative h-2 rounded-full bg-white" role="img" aria-label={`${Math.round(b.kcal)} kcal、目安 ${b.targetKcal} kcal`}>
          <div className={`h-full rounded-full transition-all duration-500 ${ENERGY_COLOR[b.energy]}`} style={{ width: `${Math.min(b.kcal / max, 1) * 100}%` }} />
          <div className="absolute -inset-y-0.5 left-1/2 w-0.5 rounded-full bg-ink/40" aria-hidden />
        </div>
      </div>
      {b.ratio && (
        <div>
          <div className="flex h-3 overflow-hidden rounded-full" role="img" aria-label={`PFCバランス たんぱく質${Math.round(b.ratio.p)}% 脂質${Math.round(b.ratio.f)}% 炭水化物${Math.round(b.ratio.c)}%`}>
            {(['p', 'f', 'c'] as const).map((k) => (
              <div key={k} className="transition-all duration-500" style={{ width: `${b.ratio![k]}%`, background: PFC_COLOR[k] }} />
            ))}
          </div>
          <p className="mt-1 flex flex-wrap gap-x-3 tabular-nums text-ink-soft">
            <span>P {Math.round(b.ratio.p)}%・{v.protein.toFixed(1)}g</span>
            <span>F {Math.round(b.ratio.f)}%・{v.fat.toFixed(1)}g</span>
            <span>C {Math.round(b.ratio.c)}%・{v.carb.toFixed(1)}g</span>
            <span>食塩 {v.salt.toFixed(1)}g</span>
          </p>
        </div>
      )}
      {slot !== 'other' && (
        <p className="font-bold">
          {b.hints.length === 0
            ? '◎ PFCバランスばっちり'
            : b.hints
                .slice(0, 2)
                .map((h) => `${PFC_LABEL[h.key]}が${h.direction === 'low' ? '少なめ' : '多め'}`)
                .join('、')}
        </p>
      )}
    </div>
  )
}
