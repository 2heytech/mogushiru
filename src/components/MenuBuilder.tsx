import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MEAL_SLOTS, soloMeals, type IdealMeal, type MealSlot } from '../domain/idealMeals'
import { idealMenuFacets, mealFaceItem } from '../domain/idealMenuFacets'
import { IDEAL_MENUS, adjustIdealMenuCached, hasAdjustedIdealMenu, idealMenuAvailable, isIdealExtra, type IdealMenu } from '../domain/idealMenus'
import type { Catalog } from '../domain/nutrition'
import type { Targets } from '../domain/targets'
import { SLOTS, type DayMenu, type MenuItem } from '../domain/types'
import { confirmDialog } from './confirm'
import { IdealMealCard } from './IdealMeals'
import { PAGE, STYLES, mealName } from './idealMealList'
import { FacetRow, IdealMenuList } from './IdealMenus'
import { menuItemImage } from './illustration'
import { SLOT_LABEL } from './labels'
import { SlotIcon } from './Mascot'
import { Sheet } from './SavedMenus'

// 献立の例から選ぶ：献立の例から、1日の食事をつくる。上の切り替えで、選び方を変えられる。
//   1日分まとめて … 1日の合計で目安がそろう献立を、1日分まとめて選ぶ（はじめはこちら）
//   1食ずつ … 朝ごはん → 昼ごはん → 晩ごはんの順に、その1食だけで区分の目安に収まる1食を選ぶ
// はじめに「どちらのバランスにするか」を聞かず、まず候補を見せる（ちがいが分からなくても進めるように）。
// 保存した1日の食事を呼び出すのは、別の入口（SavedMenusDialog）
export type BuildMode = 'day' | 'meal'

const MODES: Record<BuildMode, { label: string; lead: string }> = {
  day: { label: '1日分まとめて', lead: '朝・昼・晩の合計で、1日の栄養の目安がそろう献立です。' },
  meal: { label: '1食ずつ', lead: '朝・昼・晩を1食ずつ選びます。どの1食も、その1食だけで目安に収まります。' },
}
const MODE_KEYS = ['day', 'meal'] as const

function Check({ className = '' }: { className?: string }) {
  return (
    <span className={`grid place-items-center rounded-full bg-ok text-ink-strong ring-2 ring-white ${className}`} aria-hidden>
      <svg viewBox="0 0 16 16" className="h-[70%] w-[70%]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 8.5l3 3 6-7" />
      </svg>
    </span>
  )
}

// ちがいを絵で：1日分まとめては朝・昼・晩をまとめて1つの✓、1食ずつは朝・昼・晩それぞれに✓
function ModeDiagram({ mode }: { mode: BuildMode }) {
  if (mode === 'day')
    return (
      <span className="relative flex w-fit items-center gap-0.5 rounded-xl border-2 border-dashed border-ok bg-white px-1 py-0.5" aria-hidden>
        {MEAL_SLOTS.map((s) => (
          <SlotIcon key={s} slot={s} className="h-5 w-5" />
        ))}
        <Check className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5" />
      </span>
    )
  return (
    <span className="flex w-fit items-center gap-1" aria-hidden>
      {MEAL_SLOTS.map((s) => (
        <span key={s} className="relative flex rounded-lg border-2 border-dashed border-ok bg-white p-px">
          <SlotIcon slot={s} className="h-5 w-5" />
          <Check className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5" />
        </span>
      ))}
    </span>
  )
}

const HELP: Record<BuildMode, string> = {
  day: 'ごはん・パン・麺を中心に量を変えて、1日の目安に合わせます。ごはんは大盛りまでにして、足りない分は「＋」の一品を足します。選ぶと、いまの1日の食事と置き換わります。',
  meal: 'どの1食も、その1食だけでカロリー・PFCバランス・食塩・飽和脂肪酸が、朝・昼・晩それぞれの目安（1日の目安 × 配分）に収まります。ごはん・パン・麺を中心に量を変え、足りない分は「＋」の一品を足します。選ぶと、いまのその食事と置き換わります（その他はそのまま）。',
}

// 選び方の切り替え（1日分まとめて／1食ずつ）と、そのひとこと
function ModeTabs({ mode, targets, onChange }: { mode: BuildMode; targets: Targets; onChange: (mode: BuildMode) => void }) {
  const [help, setHelp] = useState(false)
  return (
    <div className="mb-3">
      <div role="tablist" aria-label="献立の選び方" className="flex gap-1 rounded-full bg-white p-1 shadow-sm md:max-w-md">
        {MODE_KEYS.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => onChange(m)}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-2 text-sm whitespace-nowrap transition ${mode === m ? 'bg-coral font-bold text-ink-strong' : 'text-ink-soft hover:bg-cream'}`}
          >
            <span className="hidden sm:inline-flex">
              <ModeDiagram mode={m} />
            </span>
            {MODES[m].label}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex items-start gap-2">
        <p className="min-w-0 flex-1 pt-1.5 text-xs leading-snug text-pretty text-ink-soft">
          {MODES[mode].lead}量は、あなたの目安（{targets.energyKcal.toLocaleString()} kcal）に合わせます。
        </p>
        <button type="button" aria-expanded={help} onClick={() => setHelp((v) => !v)} className="min-h-11 shrink-0 rounded-full px-2 text-xs font-bold whitespace-nowrap text-coral-ink">
          {help ? 'とじる' : 'くわしく'}
        </button>
      </div>
      {help && <p className="mt-1 rounded-2xl bg-white/60 px-3 py-2 text-xs leading-relaxed text-ink-soft">{HELP[mode]}</p>}
    </div>
  )
}

// 献立の量の調整（1つ数ミリ秒、全部で1秒ほど）を、画面を止めないように少しずつ先に計算しておく。終わったら true。
// 毎食バランスの候補をしぼるのに全部の献立を使うので、窓をひらいたらすぐ始める
function useAdjustedIdealMenus(menus: IdealMenu[], catalog: Catalog, targets: Targets): boolean {
  // 計算し終えたら描きなおす
  const [, setDone] = useState(0)
  const ready = menus.every((m) => hasAdjustedIdealMenu(m, catalog, targets))
  useEffect(() => {
    if (ready) return
    let i = 0
    let timer = 0
    const step = () => {
      const until = performance.now() + 12
      while (i < menus.length && performance.now() < until) adjustIdealMenuCached(menus[i++], catalog, targets)
      if (i < menus.length) timer = window.setTimeout(step, 0)
      else setDone((n) => n + 1)
    }
    timer = window.setTimeout(step, 0)
    return () => window.clearTimeout(timer)
  }, [ready, menus, catalog, targets])
  return ready
}

export function MenuBuilderDialog({
  initialMode = 'day',
  menu,
  catalog,
  targets,
  storesLoaded,
  onLoadDay,
  onLoadMeal,
  onDone,
  onClose,
}: {
  // はじめにひらく選び方
  initialMode?: BuildMode
  menu: DayMenu
  catalog: Catalog
  targets: Targets
  storesLoaded: boolean
  onLoadDay: (ideal: IdealMenu, menu: DayMenu) => void
  // 1食ずつで1食選ぶたびに、その区分を置き換える
  onLoadMeal: (slot: MealSlot, items: MenuItem[]) => void
  // 1食ずつで、晩ごはんまで選び終えた
  onDone: () => void
  onClose: () => void
}) {
  const [mode, setMode] = useState<BuildMode>(initialMode)
  // ひらいたときに1日の食事に何か入っていたか（入っていれば、選ぶと置き換わることを先に伝える）
  const [startedWithItems] = useState(() => SLOTS.some((s) => menu[s].length > 0))
  const empty = SLOTS.every((s) => menu[s].length === 0)
  // いまのデータにある市販品だけで組める献立
  const available = useMemo(() => IDEAL_MENUS.filter((m) => idealMenuAvailable(m, catalog)), [catalog])
  const adjusted = useAdjustedIdealMenus(available, catalog, targets)
  return (
    <Sheet title="献立の例から選ぶ" onClose={onClose} wide tall>
      <ModeTabs mode={mode} targets={targets} onChange={setMode} />
      {mode === 'day' ? (
        <IdealMenuList
          catalog={catalog}
          targets={targets}
          storesLoaded={storesLoaded}
          onLoad={async (ideal, m) => {
            if (empty || (await confirmDialog(`いまの1日の食事を「${ideal.name}」に置き換えますか？`, { okLabel: '置き換える' }))) onLoadDay(ideal, m)
          }}
        />
      ) : (
        <MealSteps
          menus={adjusted ? available : null}
          catalog={catalog}
          targets={targets}
          storesLoaded={storesLoaded}
          replacing={startedWithItems}
          onLoadMeal={onLoadMeal}
          onDone={onDone}
        />
      )}
    </Sheet>
  )
}

type Pick = { key: string; name: string; image: string | null }

// 1食ずつ：朝ごはん → 昼ごはん → 晩ごはんの順に1食ずつ。選ぶとその区分に入れて次へ。上の3つを押すと、その食事にもどれる。
// 配分が0%の区分（朝食をとらない設定など）はとばす
function MealSteps({
  menus,
  catalog,
  targets,
  storesLoaded,
  replacing,
  onLoadMeal,
  onDone,
}: {
  // 量の調整を終えた献立（計算中は null）
  menus: IdealMenu[] | null
  catalog: Catalog
  targets: Targets
  storesLoaded: boolean
  replacing: boolean
  onLoadMeal: (slot: MealSlot, items: MenuItem[]) => void
  onDone: () => void
}) {
  const steps = MEAL_SLOTS.filter((s) => targets.slotShare[s] > 0)
  const [index, setIndex] = useState(0)
  const [picks, setPicks] = useState<Partial<Record<MealSlot, Pick>>>({})
  const slot = steps[Math.min(index, steps.length - 1)]
  const headingRef = useRef<HTMLHeadingElement>(null)
  const moved = useRef(false)
  // 次の食事に進んだら、窓のいちばん上から見せて、読み上げも「〇〇はどれにする？」から
  useEffect(() => {
    if (!moved.current) return
    headingRef.current?.closest('[role="dialog"]')?.scrollTo({ top: 0 })
    headingRef.current?.focus({ preventScroll: true })
  }, [index])
  const go = (i: number) => {
    moved.current = true
    setIndex(i)
  }
  if (!slot) return null
  const label = SLOT_LABEL[slot]
  const last = index >= steps.length - 1
  const choose = (meal: IdealMeal, items: MenuItem[]) => {
    onLoadMeal(slot, items)
    const face = mealFaceItem(
      items.filter((item) => !isIdealExtra(item)),
      catalog,
    )
    const done = { ...picks, [slot]: { key: meal.key, name: mealName(meal), image: face ? menuItemImage(face, catalog) : null } }
    setPicks(done)
    // まだ選んでいない食事へ（後ろを先に）。ぜんぶ選んだら終わり
    const rest = [...steps.slice(index + 1), ...steps.slice(0, index)].filter((s) => !done[s])
    if (rest.length === 0) onDone()
    else go(steps.indexOf(rest[0]))
  }
  return (
    <>
      {replacing && <p className="mb-3 rounded-2xl bg-white/60 px-3 py-2 text-xs text-ink-soft">選んだ1食で、いまの{steps.map((s) => SLOT_LABEL[s]).join('・')}の食事を順に置き換えます。</p>}
      <ol aria-label="選ぶ順" className="mb-3 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((s, i) => {
          const p = picks[s]
          const current = i === index
          return (
            <li key={s} className="min-w-0">
              <button
                type="button"
                aria-current={current ? 'step' : undefined}
                onClick={() => go(i)}
                className={`flex h-full w-full min-w-0 flex-col items-center gap-0.5 rounded-2xl border-2 px-1 py-1.5 text-center transition md:flex-row md:gap-2 md:px-2 md:text-left ${
                  current ? 'border-coral bg-white shadow-sm' : 'border-transparent bg-white/60 hover:bg-white'
                }`}
              >
                <span className="relative shrink-0">
                  {p?.image ? <img src={p.image} alt="" className="h-9 w-9" /> : <SlotIcon slot={s} className="h-9 w-9" />}
                  {p && <Check className="absolute -top-1 -right-1.5 h-4 w-4" />}
                </span>
                <span className="block w-full min-w-0">
                  <span className={`block text-xs font-bold ${current ? 'text-coral-ink' : ''}`}>
                    {i + 1}. {SLOT_LABEL[s]}ごはん
                  </span>
                  <span className="block truncate text-2xs text-ink-soft">{p ? p.name : current ? '選んでいます' : 'まだ'}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      <h3 ref={headingRef} tabIndex={-1} className="text-lg font-bold outline-none">
        {label}ごはんはどれにする？
      </h3>
      <p className="mb-2 text-xs text-pretty text-ink-soft">
        どれも、この1食で{label}の目安（{(Math.round((targets.energyKcal * targets.slotShare[slot]) / 10) * 10).toLocaleString()} kcal）に収まります
      </p>
      <SoloMealList
        key={slot}
        slot={slot}
        menus={menus}
        catalog={catalog}
        targets={targets}
        storesLoaded={storesLoaded}
        chosenKey={picks[slot]?.key}
        onChoose={choose}
        skip={
          <button
            type="button"
            onClick={() => (last ? onDone() : go(index + 1))}
            className="min-h-11 shrink-0 rounded-full bg-white px-3 text-xs text-ink-soft shadow-sm transition hover:bg-cream"
          >
            {last ? 'ここで終わる' : `${label}ごはんはとばす`}
          </button>
        }
      />
    </>
  )
}

// その1食だけで区分の目安に収まる1食の一覧。主食（朝）・種類（昼）・主菜（晩）でしぼれる
function SoloMealList({
  slot,
  menus,
  catalog,
  targets,
  storesLoaded,
  chosenKey,
  onChoose,
  skip,
}: {
  slot: MealSlot
  menus: IdealMenu[] | null
  catalog: Catalog
  targets: Targets
  storesLoaded: boolean
  chosenKey?: string
  onChoose: (meal: IdealMeal, items: MenuItem[]) => void
  // 件数の行の右に置く「とばす」
  skip: ReactNode
}) {
  const [style, setStyle] = useState<string | null>(null)
  const [shown, setShown] = useState(PAGE)
  // 献立をまとめて目安に合わせてから、その1食だけで収まるものにしぼる（量の調整はほかの一覧と共有して、2回目からは計算しない）
  const entries = useMemo(
    () =>
      menus
        ? soloMeals(slot, menus, catalog, targets, (m) => adjustIdealMenuCached(m, catalog, targets)).map((meal) => ({
            meal,
            style: idealMenuFacets(meal.menu, catalog)[slot] as string,
          }))
        : null,
    [slot, menus, catalog, targets],
  )
  if (!entries)
    return (
      <p className="flex min-h-32 items-center justify-center gap-2 rounded-2xl bg-white/60 px-4 text-sm text-ink-soft" role="status">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-coral border-t-transparent" aria-hidden />
        目安に合う{SLOT_LABEL[slot]}ごはんをさがしています…
      </p>
    )
  const list = entries.filter((e) => style === null || e.style === style)
  const options = STYLES[slot].options.map((o) => ({ ...o, count: entries.filter((e) => e.style === o.key).length }))
  return (
    <>
      <FacetRow
        label={STYLES[slot].label}
        options={options}
        value={style}
        onChange={(v) => {
          setStyle(v)
          setShown(PAGE)
        }}
      />
      <div className="mt-2 mb-2 flex min-h-9 items-center gap-2">
        <p className="min-w-0 flex-1 text-xs text-ink-soft" aria-live="polite">
          <strong className="text-sm text-ink tabular-nums">{list.length}</strong> 件{!storesLoaded && '（コンビニ・メーカーの商品を読み込んでいます…）'}
        </p>
        {skip}
      </div>
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 md:items-start lg:grid-cols-3">
        {list.slice(0, shown).map((e) => (
          <IdealMealCard
            key={e.meal.key}
            meal={e.meal}
            catalog={catalog}
            targets={targets}
            storesLoaded={storesLoaded}
            actionLabel="これにする"
            showBalanced={false}
            chosen={e.meal.key === chosenKey}
            onLoad={(_, items) => onChoose(e.meal, items)}
          />
        ))}
      </ul>
      {list.length > shown && (
        <button type="button" onClick={() => setShown((n) => n + PAGE)} className="mt-3 min-h-11 w-full rounded-full border border-coral/40 bg-white text-sm text-ink">
          もっと見る（あと{list.length - shown}件）
        </button>
      )}
    </>
  )
}
