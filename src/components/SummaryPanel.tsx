import { useState } from 'react'
import { balanceMood, computeAlerts, type Alert, type Mood } from '../domain/alerts'
import type { MenuTotals } from '../domain/nutrition'
import { nutrientChecks } from '../domain/nutrientChecks'
import { pfcGaps, type PfcGap } from '../domain/pfcGap'
import { expenditure } from '../domain/energy'
import type { Targets } from '../domain/targets'
import { SLOTS, type Profile, type Slot } from '../domain/types'
import { EnergyBalanceView, WeightSimView } from './EnergyView'
import { DEFAULT_PROFILE_LABEL, MOOD_LABEL, SLOT_LABEL } from './labels'
import type { MascotMood } from '../domain/mascotMood'
import { BowlMogu, SlotIcon } from './Mascot'
import { SlotBalanceView } from './SlotBalanceView'
import { PfcDangoView } from './PfcDangoView'
import { NutrientChecks } from './NutrientChecks'
import { SaltPotassiumView } from './SaltPotassiumView'
import { NUTRIENT_INFO } from './labels'
import type { DayFoods } from '../domain/foodBalance'
import type { SwapIdea } from '../domain/swaps'
import { FoodBalanceView } from './FoodBalanceView'


const alertLabel = (a: Alert) => (a.key === 'energy' ? 'カロリー' : NUTRIENT_INFO[a.key].label)
const alertDigits = (a: Alert) => (a.key === 'energy' ? 0 : NUTRIENT_INFO[a.key].digits)
const fmtAlert = (a: Alert, v: number) => v.toLocaleString(undefined, { minimumFractionDigits: alertDigits(a), maximumFractionDigits: alertDigits(a) })

// partial: 入力の途中（朝・昼・晩のどれかがまだ）。合計が1日ぶんではないことを数字のそばで伝える
function EnergyGauge({ value, target, partial }: { value: number; target: number; partial: boolean }) {
  const max = target * 1.5
  const pct = Math.min(value / max, 1) * 100
  const bandLo = ((target * 0.9) / max) * 100
  const bandHi = ((target * 1.1) / max) * 100
  const color = value > target * 1.1 ? 'bg-alert' : value >= target * 0.9 ? 'bg-ok' : 'bg-coral'
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm text-ink-soft">
          カロリー{partial && <span className="text-xs">（入力済みの合計）</span>}
        </span>
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
        <div className="flex h-6 overflow-hidden rounded-full bg-white text-2xs font-bold text-ink-strong">
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
          <button type="button" onClick={onEdit} className="min-h-9 rounded-full bg-white px-3.5 font-bold text-ink shadow-sm">
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

type InfoTab = 'summary' | 'foods' | 'pfc' | 'nutrients' | 'slots' | 'energy'

const CARD = 'rounded-[var(--radius-card)] bg-[#fff1df] p-4 shadow-sm'

// 1日の食事の下に出す情報。スマホ・タブレットはタブで1種類ずつ、広い画面ではタブなしで並べる
export function DayInfo({
  totals,
  foods,
  swaps,
  onSwap,
  targets,
  profile,
  profileSet,
  missingSlots,
  onEditSlotShare,
  onEditExercise,
  onEditProfile,
}: {
  totals: MenuTotals
  // 料理の材料から数えた、食べものの単位のバランス
  foods: DayFoods | null
  // 減塩・全粒穀物への置きかえの案と、それを当てる操作
  swaps: SwapIdea[]
  onSwap?: (idea: SwapIdea) => void
  targets: Targets
  profile: Profile
  // プロフィールを入れたか（まだなら、仮の目安で計算していることを結果のそばで伝える）
  profileSet: boolean
  // 朝・昼・晩のうち、まだ料理が入っていない区分
  missingSlots: Slot[]
  onEditSlotShare?: () => void
  onEditExercise?: () => void
  onEditProfile?: () => void
}) {
  const [tab, setTab] = useState<InfoTab>('summary')
  // 「この内容を1日ぶんとして計算する」をえらんだときの、空の区分の組み合わせ。料理を足したり外したりして組み合わせが変わると、もう一度たしかめる
  const [fullDayFor, setFullDayFor] = useState<string | null>(null)
  const missingKey = missingSlots.join(',')
  const asFullDay = missingSlots.length > 0 && fullDayFor === missingKey
  const energy = expenditure(profile)
  const v = totals.day.values
  // 入力の途中：合計はまだ1日ぶんではない
  const partial = v.energyKcal > 0 && missingSlots.length > 0 && !asFullDay
  const gaps = pfcGaps(v, targets)
  const alerts = computeAlerts(totals, targets)
  const mood = balanceMood(totals, targets, alerts)
  const isOver = alerts.some((a) => a.level === 'over')
  const missingNames = missingSlots.map((s) => SLOT_LABEL[s]).join('・')
  // 入力の途中は、足りない・かたよっていると決めつけない（とりすぎだけは、途中でも知らせる）
  const bowlMood: MascotMood = isOver ? 'alert' : partial ? 'okay' : mood
  const message = partial && !isOver ? `${missingNames}も入れると、1日のバランスがわかるよ` : moguMessage(v.energyKcal, mood, gaps, alerts)
  // サプリだけ（0kcal）でも成分の取りすぎを見られるように、何か入っていれば出す
  const hasAny = Object.values(v).some((x) => x > 0)
  const overCount = alerts.filter((a) => a.level === 'over').length
  const tabs: { key: InfoTab; label: string; badge?: number }[] = [
    { key: 'summary', label: 'まとめ', badge: overCount || undefined },
    { key: 'foods', label: '食品' },
    { key: 'pfc', label: 'PFC' },
    { key: 'nutrients', label: '栄養素' },
    { key: 'slots', label: '区分ごと' },
    { key: 'energy', label: '体重' },
  ]
  // lg 以上ではタブを使わず全部見せる
  const panel = (key: InfoTab) => (tab === key ? '' : 'hidden lg:block')

  return (
    <section aria-label="1日の栄養バランス" className="space-y-3">
      {(partial || !profileSet) && (
        <div role="note" className="space-y-1 rounded-2xl bg-white/70 px-4 py-2.5 text-xs leading-relaxed text-ink-soft">
          {partial && (
            <p>
              <strong className="text-ink">入力済みの合計です。</strong>
              {missingNames}がまだ入っていません。
            </p>
          )}
          {!profileSet && (
            <p>
              <strong className="text-ink">プロフィール未設定・仮の目安（{DEFAULT_PROFILE_LABEL}）で計算中。</strong>
              右上の「プロフィールを入れる」から変えられます。入れた内容は、このブラウザにのみ保存されます。
            </p>
          )}
        </div>
      )}
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
              <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-alert px-1 text-2xs leading-none font-bold text-ink-strong" aria-label={`とりすぎ ${t.badge}件`}>
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
          {/* まとめとPFCは高さをそろえる（PFCの棒グラフで背が高くなっても、まとめの下に空きができない） */}
          <div className="contents lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-4">
            <div className={`${CARD} space-y-4 ${panel('summary')}`}>
              <h2 className="hidden font-bold lg:block">まとめ</h2>
              <div className="flex items-center gap-3">
                <BowlMogu slot="dinner" mood={bowlMood} className="h-16 w-16 shrink-0" label={`モグは${MOOD_LABEL[bowlMood]}`} />
                <p className="rounded-2xl bg-white px-4 py-2 text-sm shadow-sm">
                  {/* 「！」「、」「。」のあとで折り返す（「このままいこ／う」のように1文字だけ次の行に残らないように） */}
                  {message.split(/(?<=[！、。])/).map((part, i) => (
                    <span key={i} className="inline-block">
                      {part}
                    </span>
                  ))}
                </p>
              </div>
              <EnergyGauge value={v.energyKcal} target={targets.energyKcal} partial={partial} />
              <SlotShare totals={totals} targets={targets} onEdit={onEditSlotShare} />
              <AlertList alerts={alerts} />
            </div>

            <div className={`${CARD} ${panel('pfc')}`}>
              {gaps ? <PfcDangoView gaps={gaps} gramRanges={targets.pfcGrams} /> : <Empty />}
            </div>
          </div>
          {/* 主食・主菜・副菜、野菜と果物、食べた食品の種類 */}
          <div className={`${CARD} ${panel('foods')}`}>{foods && hasAny ? <FoodBalanceView foods={foods} targets={targets} /> : <Empty />}</div>
          {/* 食べる・使うカロリーと、続けたときの体重 */}
          <div className="contents lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-4">
            <div className={`${CARD} ${panel('energy')}`}>
              <EnergyBalanceView totals={totals} energy={energy} targets={targets} profile={profile} missing={missingSlots} asFullDay={asFullDay} onEditExercise={onEditExercise} />
            </div>
            <div className={`${CARD} ${panel('energy')}`}>
              <WeightSimView
                totals={totals}
                energy={energy}
                profile={profile}
                missing={missingSlots}
                asFullDay={asFullDay}
                onTreatAsFullDay={() => setFullDayFor(missingKey)}
                onEditProfile={onEditProfile}
              />
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

        <div className={`space-y-3 ${panel('nutrients')}`}>
          {/* 表示するものがなければ、カードごと出さない */}
          {hasAny && (
            <div className={`${CARD} empty:hidden`}>
              <SaltPotassiumView totals={totals.day} targets={targets} ideas={swaps} onSwap={onSwap} />
            </div>
          )}
          <div className={CARD}>
            {hasAny ? <NutrientChecks checks={nutrientChecks(totals.day, targets, undefined, totals.supplement)} defaultOpen /> : <Empty />}
          </div>
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
          {a.limitKind === 'upper' && a.level === 'over' && <span className="font-bold"> とりすぎ注意</span>}{a.topSlot && <span className="inline-block text-ink-soft">&nbsp;いちばん多いのは{SLOT_LABEL[a.topSlot]}</span>}
        </li>
      ))}
    </ul>
  )
}
