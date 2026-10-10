import type { Alert } from '../domain/alerts'
import { slotMoods, type MascotMood } from '../domain/mascotMood'
import { nutrientChecks } from '../domain/nutrientChecks'
import { gapText, idealPfc } from '../domain/pfcGap'
import { slotBalance, type EnergyLevel } from '../domain/slotBalance'
import type { Targets } from '../domain/targets'
import type { NutrientTotals, Slot } from '../domain/types'
import { MOOD_LABEL, PFC_LABEL } from './labels'
import { NutrientChecks } from './NutrientChecks'
import { PfcBars } from './PfcCompare'
import { BowlMogu } from './Mascot'
import type { ReactNode } from 'react'


const ENERGY_TEXT: Record<Exclude<EnergyLevel, 'empty'>, string> = { low: '少なめ', ok: 'ちょうどいい', high: '多め' }
const ENERGY_COLOR: Record<Exclude<EnergyLevel, 'empty'>, string> = { low: 'bg-coral', ok: 'bg-ok', high: 'bg-alert' }

// 指標の左に、その指標についてのちゃわんモグの表情を出す
function Metric({ slot, mood, what, children }: { slot: Slot; mood: MascotMood | null; what: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-10 shrink-0">
        {mood && <BowlMogu slot={slot} mood={mood} className="h-10 w-10" label={`${what}：モグは${MOOD_LABEL[mood]}`} />}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

// 区分ごとのカロリー（目安との比較）とPFCバランス
export function SlotBalanceView({ totals, slot, targets, alerts }: { totals: NutrientTotals; slot: Slot; targets: Targets; alerts: Alert[] }) {
  const b = slotBalance(totals, slot, targets)
  const moods = slotMoods(totals, slot, targets, alerts)
  if (b.energy === 'empty' || !moods) return null
  const v = totals.values
  const max = b.targetKcal * 2
  const checks = nutrientChecks(totals, targets, slot)
  const saltGoal = checks.find((c) => c.key === 'salt')!.goal!
  return (
    <div className="mt-3 space-y-2 rounded-2xl bg-cream/70 p-3 text-xs">
      <Metric slot={slot} mood={moods.energy} what="カロリー">
        <div className="mb-1 flex justify-between">
          <span className="text-ink-soft">
            カロリー <strong className="text-ink">{ENERGY_TEXT[b.energy]}</strong>
          </span>
          <span className="tabular-nums text-ink-soft">目安 {b.targetKcal} kcal</span>
        </div>
        <div className="relative h-2 rounded-full bg-white" role="img" aria-label={`${Math.round(b.kcal)} kcal、目安 ${b.targetKcal} kcal`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${ENERGY_COLOR[b.energy]}`}
            style={{ width: `${Math.min(b.kcal / max, 1) * 100}%` }}
          />
          <div className="absolute -inset-y-0.5 left-1/2 w-0.5 rounded-full bg-ink/40" aria-hidden />
        </div>
      </Metric>
      {b.ratio && (
        <Metric slot={slot} mood={moods.pfc} what="PFCバランス">
          <PfcBars ideal={idealPfc(targets)} actual={b.ratio} thin />
          <p className="mt-1 flex flex-wrap gap-x-3 tabular-nums text-ink-soft">
            <span>P {v.protein.toFixed(1)}g</span>
            <span>F {v.fat.toFixed(1)}g</span>
            <span>C {v.carb.toFixed(1)}g</span>
          </p>
          {slot !== 'other' && (
            <p className="mt-1 font-bold">
              {b.hints.length === 0
                ? '◎ PFCバランスばっちり'
                : b.hints
                    .slice(0, 2)
                    .map((h) => `${PFC_LABEL[h.key]}が目標より${gapText(h.gap)}`)
                    .join('、')}
            </p>
          )}
        </Metric>
      )}
      <p className="flex flex-wrap gap-1.5 pl-12 tabular-nums">
        <Chip label="食塩" value={`${v.salt.toFixed(1)}g`} sub={`目安 ${saltGoal.toFixed(1)}g`} warn={v.salt >= saltGoal} />
        {v.alcohol >= 0.5 && <Chip label="アルコール" value={`${Math.round(v.alcohol)}g`} sub={`1日 ${targets.alcoholRiskG}g未満`} warn={v.alcohol >= targets.alcoholRiskG} />}
        <Chip label="不飽和脂肪酸" value={`${(v.monoUnsatFat + v.polyUnsatFat).toFixed(1)}g`} />
      </p>
      <NutrientChecks checks={checks} perSlot />
    </div>
  )
}

function Chip({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 ${warn ? 'bg-alert/20' : 'bg-white'}`}>
      {label} <strong>{value}</strong>
      {sub && <span className="text-ink-soft">（{sub}）</span>}
    </span>
  )
}
