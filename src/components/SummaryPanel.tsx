import { balanceMood, computeAlerts, type Alert } from '../domain/alerts'
import { pfcRatio, type MenuTotals } from '../domain/nutrition'
import type { Range, Targets } from '../domain/targets'
import { SLOTS } from '../domain/types'
import { SLOT_LABEL } from './labels'
import { Mascot } from './Mascot'


const ALERT_LABEL: Record<Alert['key'], string> = {
  salt: '食塩',
  alcohol: 'アルコール',
  satFat: '飽和脂肪酸',
  energy: 'カロリー',
}

function EnergyGauge({ value, target }: { value: number; target: number }) {
  const max = target * 1.5
  const pct = Math.min(value / max, 1) * 100
  const bandLo = ((target * 0.9) / max) * 100
  const bandHi = ((target * 1.1) / max) * 100
  const color = value > target * 1.1 ? 'bg-alert' : value >= target * 0.9 ? 'bg-ok' : 'bg-coral'
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm text-ink-soft">カロリー</span>
        <span>
          <strong className="text-2xl">{Math.round(value).toLocaleString()}</strong>
          <span className="text-sm text-ink-soft"> / {target.toLocaleString()} kcal</span>
        </span>
      </div>
      <div className="relative h-4 overflow-hidden rounded-full bg-white">
        <div className="absolute inset-y-0 bg-ok/25" style={{ left: `${bandLo}%`, width: `${bandHi - bandLo}%` }} />
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-ink-soft">
        {value === 0 ? '料理を選ぶと計算されます' : value < target ? `あと ${Math.round(target - value)} kcal` : `${Math.round(value - target)} kcal オーバー`}
      </p>
    </div>
  )
}

const SLOT_SHADE = ['bg-[#ffd8a8]', 'bg-[#ffb07c]', 'bg-coral', 'bg-[#d9c2ad]']

// 1日のカロリーを朝・昼・晩・その他がどれだけ占めているか
function SlotShare({ totals }: { totals: MenuTotals }) {
  const day = totals.day.values.energyKcal
  if (day <= 0) return null
  return (
    <div>
      <p className="mb-1 text-sm text-ink-soft">カロリーの配分</p>
      <div className="flex h-6 overflow-hidden rounded-full bg-white text-[11px] font-bold">
        {SLOTS.map((slot, i) => {
          const share = (totals.bySlot[slot].values.energyKcal / day) * 100
          if (share <= 0) return null
          return (
            <div key={slot} className={`grid place-items-center overflow-hidden whitespace-nowrap ${SLOT_SHADE[i]}`} style={{ width: `${share}%` }} title={`${SLOT_LABEL[slot]} ${Math.round(share)}%`}>
              {share >= 12 && `${SLOT_LABEL[slot]} ${Math.round(share)}%`}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PfcBar({ label, color, ratio, range, grams }: { label: string; color: string; ratio: number | null; range: Range; grams: number }) {
  const inRange = ratio !== null && ratio >= range.lo && ratio <= range.hi
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-20 shrink-0">{label}</span>
      <div className="relative h-3 flex-1 rounded-full bg-white">
        <div className="absolute inset-y-0 rounded-full bg-ok/25" style={{ left: `${range.lo}%`, width: `${range.hi - range.lo}%` }} />
        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500" style={{ width: `${Math.min(ratio ?? 0, 100)}%`, background: color }} />
      </div>
      <span className="w-24 shrink-0 text-right tabular-nums">
        {ratio === null ? '—' : `${Math.round(ratio)}%`} <span className="text-ink-soft">{Math.round(grams)}g</span>
        {ratio !== null && !inRange && <span aria-label="目標範囲外"> ⚠</span>}
      </span>
    </div>
  )
}

export function SummaryPanel({ totals, targets }: { totals: MenuTotals; targets: Targets }) {
  const v = totals.day.values
  const ratio = pfcRatio(v)
  const alerts = computeAlerts(totals, targets)
  const mood = balanceMood(totals, targets, alerts)
  return (
    <section className="space-y-4 rounded-[var(--radius-card)] bg-[#fff1df] p-5 shadow-sm">
      <Mascot mood={mood} message={v.energyKcal === 0 ? "料理をえらんで、1日の献立をつくってみよう！" : undefined} />
      <EnergyGauge value={v.energyKcal} target={targets.energyKcal} />
      <SlotShare totals={totals} />
      <div className="space-y-2">
        <PfcBar label="たんぱく質" color="var(--color-protein)" ratio={ratio?.p ?? null} range={targets.pfcRatio.p} grams={v.protein} />
        <PfcBar label="脂質" color="var(--color-fat)" ratio={ratio?.f ?? null} range={targets.pfcRatio.f} grams={v.fat} />
        <PfcBar label="炭水化物" color="var(--color-carb)" ratio={ratio?.c ?? null} range={targets.pfcRatio.c} grams={v.carb} />
      </div>
      {alerts.length > 0 && (
        <ul className="space-y-1">
          {alerts.map((a) => (
            <li key={a.key} className={`rounded-xl px-3 py-2 text-sm ${a.level === 'over' ? 'bg-alert/15' : 'bg-caution/20'}`}>
              ⚠ {ALERT_LABEL[a.key]} {a.amount.toFixed(a.unit === 'kcal' ? 0 : 1)}
              {a.unit}（目安 {a.limit.toFixed(a.unit === 'kcal' ? 0 : 1)}
              {a.unit}）{a.topSlot && <span className="text-ink-soft"> いちばん多いのは{SLOT_LABEL[a.topSlot]}</span>}
            </li>
          ))}
        </ul>
      )}
      {totals.day.missing.size > 0 && v.energyKcal > 0 && <p className="text-xs text-ink-soft">※ 一部の成分が未収録の食品を含みます</p>}
    </section>
  )
}
