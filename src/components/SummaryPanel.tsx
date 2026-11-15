import { useMemo, useRef, useState } from 'react'
import { computeAlerts } from '../domain/alerts'
import { ENERGY_TOLERANCE, daySummary, type Step } from '../domain/daySummary'
import type { MenuTotals } from '../domain/nutrition'
import { nutrientChecks } from '../domain/nutrientChecks'
import { pfcGaps } from '../domain/pfcGap'
import { expenditure } from '../domain/energy'
import type { Targets } from '../domain/targets'
import { SLOTS, type Profile, type Slot } from '../domain/types'
import { EnergyBalanceView, WeightSimView } from './EnergyView'
import { DEFAULT_PROFILE_LABEL, MOOD_LABEL, SLOT_LABEL } from './labels'
import { BowlMogu, SlotIcon } from './Mascot'
import { SlotBalanceView } from './SlotBalanceView'
import { PfcDangoView } from './PfcDangoView'
import { NutrientChecks } from './NutrientChecks'
import { SaltPotassiumView } from './SaltPotassiumView'
import { DaySummaryView } from './DaySummaryView'
import { energyDiffText, moguMessage } from './daySummaryText'
import type { DayFoods } from '../domain/foodBalance'
import type { SwapIdea } from '../domain/swaps'
import { FoodBalanceView } from './FoodBalanceView'


// partial: 入力の途中（朝・昼・晩のどれかがまだ）。合計が1日ぶんではないことを数字のそばで伝える
function EnergyGauge({ value, target, partial }: { value: number; target: number; partial: boolean }) {
  const max = target * 1.5
  const pct = Math.min(value / max, 1) * 100
  const bandLo = ((target * (1 - ENERGY_TOLERANCE)) / max) * 100
  const bandHi = ((target * (1 + ENERGY_TOLERANCE)) / max) * 100
  const within = value >= target * (1 - ENERGY_TOLERANCE) && value <= target * (1 + ENERGY_TOLERANCE)
  const color = value > target * (1 + ENERGY_TOLERANCE) ? 'bg-alert' : within ? 'bg-ok' : 'bg-coral'
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
      {/* 目安との差が小さいときは「オーバー」と言わず、範囲内であることを先に伝える。入力の途中は、足りないと決めつけない */}
      <p className={`mt-1 text-xs ${within && !partial ? 'font-bold text-ok-ink' : 'text-ink-soft'}`}>
        {partial && value < target ? '朝・昼・晩がそろうと、目安とくらべられます' : energyDiffText(value, target, ENERGY_TOLERANCE)}
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
          <button type="button" onClick={onEdit} className="min-h-11 rounded-full bg-white px-3.5 font-bold text-ink shadow-sm">
            配分を変える
          </button>
        )}
      </p>
    </div>
  )
}

// スマホのタブ。「栄養の詳細」に、PFCバランス・食べもののバランス・栄養素をまとめる
type InfoTab = 'summary' | 'detail' | 'slots' | 'energy'
type DetailPart = 'pfc' | 'foods' | 'nutrients'
const DETAIL_PARTS: { key: DetailPart; label: string }[] = [
  { key: 'pfc', label: 'PFCバランス' },
  { key: 'foods', label: '食べもののバランス' },
  { key: 'nutrients', label: '栄養素' },
]

// min-w-0：中身の幅でカードが画面より広がらないように。幅のせまいスマホは余白を少しつめる
const CARD = 'min-w-0 rounded-[var(--radius-card)] bg-[#fff1df] p-4 shadow-sm max-[359px]:p-3'

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
  onStep,
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
  // まとめの「次に試すこと」のボタン（料理を足す・食品を調べる）
  onStep?: (step: Step) => void
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
  const checks = useMemo(() => nutrientChecks(totals.day, targets, undefined, totals.supplement), [totals, targets])
  const missingNames = missingSlots.map((s) => SLOT_LABEL[s]).join('・')
  // 範囲内のもの・気になる点・次に試すことに分ける。マスコットの表情とひとことも、同じ結果から決める
  const summary = daySummary({ totals, targets, foods, alerts, gaps, checks, missing: asFullDay ? [] : missingSlots, hasSaltSwap: swaps.some((x) => x.kind === 'salt') })
  const bowlMood = summary.mood
  const message = moguMessage(summary)
  // 「置きかえの案」は栄養素のタブの中にあるので、そこへ移る。ほかは親（料理を足す画面・食品を調べる）へ
  const swapRef = useRef<HTMLDivElement>(null)
  const step = (s: Step) => {
    if (s.kind !== 'swapSalt') return onStep?.(s)
    setTab('detail')
    // タブを切り替えて表示されてから、その場所へ
    requestAnimationFrame(() => swapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  // 「栄養の詳細」の中の、PFCバランス・食べもののバランス・栄養素へ移る
  const pfcRef = useRef<HTMLDivElement>(null)
  const foodsRef = useRef<HTMLDivElement>(null)
  const nutrientsRef = useRef<HTMLDivElement>(null)
  const jump = (part: DetailPart) => (part === 'pfc' ? pfcRef : part === 'foods' ? foodsRef : nutrientsRef).current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  // サプリだけ（0kcal）でも成分の取りすぎを見られるように、何か入っていれば出す
  const hasAny = Object.values(v).some((x) => x > 0)
  const overCount = alerts.filter((a) => a.level === 'over').length
  const tabs: { key: InfoTab; label: string; badge?: number }[] = [
    { key: 'summary', label: 'まとめ', badge: overCount || undefined },
    { key: 'detail', label: '栄養の詳細' },
    { key: 'slots', label: '食事別' },
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
          {/* 目安が仮のものであることは短く伝える（結果を下に押し下げない）。変えるところはすぐ横に */}
          {!profileSet && (
            <p className="flex flex-wrap items-center gap-x-2">
              <span>
                <strong className="text-ink">仮の目安</strong> {DEFAULT_PROFILE_LABEL}
              </span>
              {onEditProfile && (
                <button
                  type="button"
                  onClick={onEditProfile}
                  aria-haspopup="dialog"
                  aria-label="栄養の目安を変更する"
                  className="-my-1.5 min-h-11 rounded-full px-2 font-bold text-coral-ink underline decoration-coral/60 underline-offset-2"
                >
                  変更
                </button>
              )}
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
            className={`flex min-h-11 flex-1 items-center justify-center gap-1 rounded-full px-1 text-sm whitespace-nowrap transition ${
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
              <DaySummaryView summary={summary} onStep={step} />
              <SlotShare totals={totals} targets={targets} onEdit={onEditSlotShare} />
            </div>

            {/* スマホの「栄養の詳細」：下に3つ続くので、はじめに中身を並べて、押すとそこへ移る */}
            {hasAny && (
              <nav aria-label="栄養の詳細の中身" className={`flex flex-wrap gap-1.5 lg:hidden ${tab === 'detail' ? '' : 'hidden'}`}>
                {DETAIL_PARTS.map((part) => (
                  <button key={part.key} type="button" onClick={() => jump(part.key)} className="min-h-11 rounded-full bg-white px-3.5 text-sm whitespace-nowrap shadow-sm">
                    {part.label}
                    <span aria-hidden className="ml-1 text-coral-ink">
                      ↓
                    </span>
                  </button>
                ))}
              </nav>
            )}
            <div ref={pfcRef} className={`${CARD} scroll-mt-4 ${panel('detail')}`}>
              {gaps ? <PfcDangoView gaps={gaps} gramRanges={targets.pfcGrams} /> : <Empty />}
            </div>
          </div>
          {/* 主食・主菜・副菜、野菜と果物、食べた食品の種類 */}
          <div ref={foodsRef} className={`${CARD} scroll-mt-4 ${panel('detail')}`}>
            {foods && hasAny ? <FoodBalanceView foods={foods} targets={targets} /> : <Empty />}
          </div>
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
            <h2 className="mb-2 hidden font-bold lg:block">食事別のバランス</h2>
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

        <div ref={nutrientsRef} className={`min-w-0 scroll-mt-4 space-y-3 ${panel('detail')}`}>
          {/* 表示するものがなければ、カードごと出さない */}
          {hasAny && (
            <div ref={swapRef} className={`${CARD} scroll-mt-20 empty:hidden`}>
              <SaltPotassiumView totals={totals.day} targets={targets} ideas={swaps} onSwap={onSwap} />
            </div>
          )}
          <div className={CARD}>
            {hasAny ? <NutrientChecks checks={checks} defaultOpen /> : <Empty />}
          </div>
        </div>
      </div>
    </section>
  )
}

function Empty() {
  return <p className="py-6 text-center text-sm text-ink-soft">料理をえらぶと、ここに出ます</p>
}
