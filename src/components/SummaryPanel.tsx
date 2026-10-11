import { useState } from 'react'
import { balanceMood, computeAlerts, type Alert, type Mood } from '../domain/alerts'
import type { MenuTotals } from '../domain/nutrition'
import { nutrientChecks } from '../domain/nutrientChecks'
import { pfcGaps, type PfcGap } from '../domain/pfcGap'
import type { Targets } from '../domain/targets'
import { SLOTS } from '../domain/types'
import { MOOD_LABEL, SLOT_LABEL } from './labels'
import type { MascotMood } from '../domain/mascotMood'
import { BowlMogu, SlotIcon } from './Mascot'
import { SlotBalanceView } from './SlotBalanceView'
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

type InfoTab = 'summary' | 'pfc' | 'nutrients' | 'slots'

const CARD = 'rounded-[var(--radius-card)] bg-[#fff1df] p-4 shadow-sm'

// 1日の食事の下に出す情報。スマホ・タブレットはタブで1種類ずつ、広い画面ではタブなしで並べる
export function DayInfo({ totals, targets, onEditSlotShare }: { totals: MenuTotals; targets: Targets; onEditSlotShare?: () => void }) {
  const [tab, setTab] = useState<InfoTab>('summary')
  const v = totals.day.values
  const gaps = pfcGaps(v, targets)
  const alerts = computeAlerts(totals, targets)
  const mood = balanceMood(totals, targets, alerts)
  const bowlMood: MascotMood = alerts.some((a) => a.level === 'over') ? 'alert' : mood
  const message = moguMessage(v.energyKcal, mood, gaps, alerts)
  // サプリだけ（0kcal）でも成分の取りすぎを見られるように、何か入っていれば出す
  const hasAny = Object.values(v).some((x) => x > 0)
  const overCount = alerts.filter((a) => a.level === 'over').length
  const tabs: { key: InfoTab; label: string; badge?: number }[] = [
    { key: 'summary', label: 'まとめ', badge: overCount || undefined },
    { key: 'pfc', label: 'PFC' },
    { key: 'nutrients', label: '栄養素' },
    { key: 'slots', label: '区分ごと' },
  ]
  // lg 以上ではタブを使わず全部見せる
  const panel = (key: InfoTab) => (tab === key ? '' : 'hidden lg:block')

  return (
    <section aria-label="1日の栄養バランス" className="space-y-3">
      <div role="tablist" aria-label="見る情報" className="flex gap-1 rounded-full bg-white/70 p-1 shadow-sm lg:hidden">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`flex min-h-10 flex-1 items-center justify-center gap-1 rounded-full text-sm whitespace-nowrap transition ${
              tab === t.key ? 'bg-white font-bold text-ink shadow-sm' : 'text-ink-soft'
            }`}
          >
            {t.label}
            {t.badge && (
              <span className="grid h-4 min-w-4 place-items-center rounded-full bg-alert px-1 text-[10px] leading-none font-bold text-white" aria-label={`とりすぎ ${t.badge}件`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 広い画面：左にまとめ・PFC・区分ごと、右に栄養素チェック。
          列ごとに積むので、右の栄養素が長くても左に空きができない */}
      <div className="grid gap-4 lg:grid-cols-[2fr_1.15fr] lg:items-start">
        <div className="contents lg:flex lg:flex-col lg:gap-4">
          <div className="contents lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
            <div className={`${CARD} space-y-4 ${panel('summary')}`}>
              <h2 className="hidden font-bold lg:block">まとめ</h2>
              <div className="flex items-center gap-3">
                <BowlMogu slot="dinner" mood={bowlMood} className="h-16 w-16 shrink-0" label={`モグは${MOOD_LABEL[bowlMood]}`} />
                <p className="rounded-2xl bg-white px-4 py-2 text-sm shadow-sm">{message}</p>
              </div>
              <EnergyGauge value={v.energyKcal} target={targets.energyKcal} />
              <SlotShare totals={totals} targets={targets} onEdit={onEditSlotShare} />
              <AlertList alerts={alerts} />
            </div>

            <div className={`${CARD} ${panel('pfc')}`}>
              {gaps ? <PfcDangoView gaps={gaps} gramRanges={targets.pfcGrams} /> : <Empty />}
            </div>
          </div>
          <div className={panel('slots')}>
            <h2 className="mb-2 hidden font-bold lg:block">区分ごとのバランス</h2>
            <div className="grid items-start gap-3 md:grid-cols-2">
              {SLOTS.map((slot) => (
                <div key={slot} className={CARD}>
                  <h3 className="flex items-center gap-2 font-bold">
                    <SlotIcon slot={slot} className="h-8 w-8 shrink-0" />
                    {SLOT_LABEL[slot]}
                    {slot !== 'other' && 'ごはん'}
                    <span className="ml-auto text-sm font-normal text-ink-soft tabular-nums">{Math.round(totals.bySlot[slot].values.energyKcal)} kcal</span>
                  </h3>
                  {totals.bySlot[slot].values.energyKcal > 0 ? (
                    <SlotBalanceView totals={totals.bySlot[slot]} slot={slot} targets={targets} alerts={alerts} />
                  ) : (
                    <p className="mt-2 text-xs text-ink-soft">まだ料理がありません</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`${CARD} ${panel('nutrients')}`}>
          {hasAny ? <NutrientChecks checks={nutrientChecks(totals.day, targets, undefined, totals.supplement)} defaultOpen /> : <Empty />}
        </div>
      </div>
    </section>
  )
}

function Empty() {
  return <p className="py-6 text-center text-sm text-ink-soft">料理をえらぶと、ここに出ます</p>
}

function AlertList({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null
  return (
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
  )
}
