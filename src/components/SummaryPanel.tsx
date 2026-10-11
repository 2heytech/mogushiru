import { balanceMood, computeAlerts, type Alert, type Mood } from '../domain/alerts'
import type { MenuTotals } from '../domain/nutrition'
import { nutrientChecks } from '../domain/nutrientChecks'
import { pfcGaps, type PfcGap } from '../domain/pfcGap'
import type { Targets } from '../domain/targets'
import { SLOTS } from '../domain/types'
import { MOOD_LABEL, SLOT_LABEL } from './labels'
import type { MascotMood } from '../domain/mascotMood'
import { BowlMogu } from './Mascot'
import { PfcDangoView } from './PfcDangoView'
import { NutrientChecks } from './NutrientChecks'
import { NUTRIENT_INFO } from './labels'


const alertLabel = (a: Alert) => (a.key === 'energy' ? 'カロリー' : NUTRIENT_INFO[a.key].label)
const alertDigits = (a: Alert) => (a.key === 'energy' ? 0 : NUTRIENT_INFO[a.key].digits)
const fmtAlert = (a: Alert, v: number) => v.toLocaleString(undefined, { minimumFractionDigits: alertDigits(a), maximumFractionDigits: alertDigits(a) })

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

// 1日のカロリーを朝・昼・晩・その他がどれだけ占めているかと、配分の目安
function SlotShare({ totals, targets, onEdit }: { totals: MenuTotals; targets: Targets; onEdit?: () => void }) {
  const day = totals.day.values.energyKcal
  const goal = SLOTS.map((slot) => `${SLOT_LABEL[slot]}${Math.round(targets.slotShare[slot] * 100)}`).join('・')
  return (
    <div>
      <p className="mb-1 text-sm text-ink-soft">カロリーの配分</p>
      {day > 0 && (
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
      )}
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
        <span>目安の配分 {goal}%</span>
        {onEdit && (
          <button type="button" onClick={onEdit} className="rounded-full bg-white px-2.5 py-0.5 font-bold text-ink shadow-sm">
            配分を変える
          </button>
        )}
      </p>
    </div>
  )
}

const MOOD_MESSAGE: Record<Mood, string> = {
  happy: 'いいバランス！このままいこう',
  okay: 'いい感じ。もうひと工夫してみる？',
  worried: 'ちょっと偏ってるかも…',
}
const PFC_NAME = { p: 'たんぱく質', f: '脂質', c: '炭水化物' } as const

function moguMessage(energy: number, mood: Mood, gaps: PfcGap[] | null, alerts: Alert[]): string {
  if (energy === 0) return '料理をえらんで、1日の食事をつくってみよう！'
  const over = alerts.find((a) => a.level === 'over')
  if (over) return `${alertLabel(over)}が${over.limitKind === 'upper' ? '上限' : '目安'}をこえてるよ！`
  const off = (gaps ?? []).filter((g) => g.gap !== 0)
  if (off.length > 0) return `${off.map((g) => `${PFC_NAME[g.key]}が${g.gap < 0 ? '少なめ' : '多め'}`).join('、')}かも`
  return MOOD_MESSAGE[mood]
}

export function SummaryPanel({ totals, targets, onEditSlotShare }: { totals: MenuTotals; targets: Targets; onEditSlotShare?: () => void }) {
  const v = totals.day.values
  const gaps = pfcGaps(v, targets)
  const alerts = computeAlerts(totals, targets)
  const mood = balanceMood(totals, targets, alerts)
  const bowlMood: MascotMood = alerts.some((a) => a.level === 'over') ? 'alert' : mood
  const message = moguMessage(v.energyKcal, mood, gaps, alerts)
  return (
    <section className="space-y-4 rounded-[var(--radius-card)] bg-[#fff1df] p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <BowlMogu slot="dinner" mood={bowlMood} className="h-16 w-16 shrink-0" label={`モグは${MOOD_LABEL[bowlMood]}`} />
        <p className="rounded-2xl bg-white px-4 py-2 text-sm shadow-sm">{message}</p>
      </div>
      <EnergyGauge value={v.energyKcal} target={targets.energyKcal} />
      <SlotShare totals={totals} targets={targets} onEdit={onEditSlotShare} />
      {gaps && <PfcDangoView gaps={gaps} gramRanges={targets.pfcGrams} />}
      {alerts.length > 0 && (
        <ul className="space-y-1">
          {alerts.map((a) => (
            <li key={a.key} className={`rounded-xl px-3 py-2 text-sm ${a.level === 'over' ? 'bg-alert/15' : 'bg-caution/20'}`}>
              ⚠ {alertLabel(a)}{a.supplementOnly && '（サプリの分）'} {fmtAlert(a, a.amount)}
              {a.unit}（{a.limitKind === 'upper' ? '耐容上限量' : '目安'} {fmtAlert(a, a.limit)}
              {a.unit}）
              {a.limitKind === 'upper' && a.level === 'over' && <span className="font-bold"> とりすぎ注意</span>}{a.topSlot && <span className="text-ink-soft"> いちばん多いのは{SLOT_LABEL[a.topSlot]}</span>}
            </li>
          ))}
        </ul>
      )}
      {/* サプリだけ（0kcal）でも成分の取りすぎを見られるように、何か入っていれば出す */}
      {Object.values(v).some((x) => x > 0) && <NutrientChecks checks={nutrientChecks(totals.day, targets, undefined, totals.supplement)} />}
    </section>
  )
}
