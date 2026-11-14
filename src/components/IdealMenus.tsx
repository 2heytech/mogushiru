import { useMemo, useState, type ReactNode } from 'react'
import {
  IDEAL_GENRES,
  IDEAL_MENUS,
  adjustIdealMenuCached,
  idealMenuAvailable,
  idealMenuHasProducts,
  isIdealExtra,
  summarizeIdealMenu,
  type IdealGenre,
  type IdealMenu,
} from '../domain/idealMenus'
import {
  BREAKFAST_STYLES,
  DINNER_MAINS,
  LUNCH_STYLES,
  idealMealLeads,
  idealMenuFacets,
  idealSearchIndex,
  idealSearchTokens,
  matchedItemNames,
  matchesIdealSearch,
  mealFaceItem,
  type BreakfastStyle,
  type DinnerMain,
  type IdealFacets,
  type IdealSearchIndex,
  type LunchStyle,
} from '../domain/idealMenuFacets'
import { MEAL_SLOTS } from '../domain/idealMeals'
import { WANT_NUTRIENTS } from '../domain/nutrientChecks'
import type { Catalog } from '../domain/nutrition'
import { slotBalance } from '../domain/slotBalance'
import type { Targets } from '../domain/targets'
import { SLOTS, type DayMenu, type MenuItem, type Slot } from '../domain/types'
import { menuItemImage } from './illustration'
import { itemName, portionLabel } from './itemName'
import { BREAKFAST_LABEL, DINNER_LABEL, LUNCH_LABEL, NUTRIENT_INFO, SLOT_LABEL } from './labels'
import { SlotIcon } from './Mascot'

// 一度に出す数。献立ごとに量の調整を計算するので、見える分だけ計算する
const PAGE = 12

type ListProps = {
  catalog: Catalog
  targets: Targets
  storesLoaded: boolean
  onLoad: (ideal: IdealMenu, menu: DayMenu) => void
}

type Entry = { menu: IdealMenu; facets: IdealFacets; index: IdealSearchIndex }
type Filters = { genre: IdealGenre | null; breakfast: BreakfastStyle | null; lunch: LunchStyle | null; dinner: DinnerMain | null }
const NO_FILTERS: Filters = { genre: null, breakfast: null, lunch: null, dinner: null }
const valueOf = (e: Entry, key: keyof Filters) => (key === 'genre' ? e.menu.genre : e.facets[key])

// しぼりこみの1行。えらんだものをもう一度押すと外れる。ほかの条件と合わせて1件もないものは押せない
export function FacetRow<T extends string>({
  label,
  icon,
  options,
  value,
  onChange,
}: {
  label: string
  icon?: ReactNode
  options: { key: T; label: string; count: number }[]
  value: T | null
  onChange: (v: T | null) => void
}) {
  return (
    <div role="group" aria-label={`${label}でしぼる`} className="flex items-center gap-1.5">
      <span className="flex w-16 shrink-0 items-center gap-1 text-xs whitespace-nowrap text-ink-soft md:w-auto md:pr-0.5">
        {icon}
        {label}
      </span>
      {/* スマホは横に流す（右端まで使う）。広い画面は折り返す */}
      <div className="-mr-5 flex min-w-0 flex-1 gap-1.5 overflow-x-auto pr-5 md:mr-0 md:flex-none md:flex-wrap md:overflow-visible md:pr-0">
        {options.map((o) => {
          const active = value === o.key
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={active}
              disabled={!active && o.count === 0}
              onClick={() => onChange(active ? null : o.key)}
              className={`min-h-9 rounded-full border px-3 text-xs whitespace-nowrap transition disabled:opacity-40 ${
                active ? 'border-coral bg-coral/20 font-bold text-ink' : 'border-ink/10 bg-white text-ink'
              }`}
            >
              {o.label}
              <span className="ml-1 font-normal tabular-nums text-ink-soft">{o.count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// 「1日でバランス」の理想の献立の一覧（献立をつくる窓）。プロフィールの目安に合わせた量で、朝・昼・晩の絵とカロリー・食塩を添えて出す。
// 数が多いので、食べたい料理の名前でさがすか、ジャンルと朝・昼・晩の好みでしぼって選ぶ。
// 毎食バランスの献立は、朝・昼・晩を1食ずつえらぶ流れ（MenuBuilder.tsx）で出すので、ここには出さない。
// 市販品を使う献立は、コンビニ・メーカーの商品を読み終えるまで「読み込み中」にし、読み終えても商品がなければ出さない
export function IdealMenuList({ catalog, targets, storesLoaded, onLoad }: ListProps) {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(PAGE)
  // データにない市販品を使う献立は出さない（読み込み中は出しておく）
  const entries = useMemo<Entry[]>(
    () =>
      IDEAL_MENUS.filter((m) => m.balance === 'day' && (idealMenuAvailable(m, catalog) || (idealMenuHasProducts(m) && !storesLoaded))).map((menu) => ({
        menu,
        facets: idealMenuFacets(menu, catalog),
        index: idealSearchIndex(menu, catalog),
      })),
    [catalog, storesLoaded],
  )
  const tokens = useMemo(() => idealSearchTokens(query), [query])
  // skip の条件だけ外して数える（その行のチップに出す件数）
  const pass = (e: Entry, skip?: keyof Filters) =>
    matchesIdealSearch(e.index, tokens) && (Object.keys(filters) as (keyof Filters)[]).every((k) => k === skip || filters[k] === null || valueOf(e, k) === filters[k])
  const list = entries.filter((e) => pass(e))
  const options = <K extends keyof Filters>(key: K, keys: readonly NonNullable<Filters[K]>[], label: (k: NonNullable<Filters[K]>) => string) => {
    const pool = entries.filter((e) => pass(e, key))
    return keys.map((k) => ({ key: k, label: label(k), count: pool.filter((e) => valueOf(e, key) === k).length }))
  }
  const change = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }))
    setShown(PAGE)
  }
  const narrowed = tokens.length > 0 || Object.values(filters).some((v) => v !== null)
  const clear = () => {
    setFilters(NO_FILTERS)
    setQuery('')
    setShown(PAGE)
  }
  // 1件もないジャンルは出さない（いまえらんでいるものは外せるように残す）
  const genres = options('genre', IDEAL_GENRES, (g) => g).filter((o) => o.key === filters.genre || entries.some((e) => e.menu.genre === o.key))
  return (
    <>
      {/* えらび方：食べたい料理でさがすか、ジャンルと朝・昼・晩の好みでしぼる */}
      <div className="mb-2 space-y-2">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setShown(PAGE)
          }}
          aria-label="食べたい料理の名前でさがす"
          placeholder="料理名でさがす（例：刺身、カツ）"
          className="min-h-11 w-full rounded-full border-2 border-white bg-white px-4 text-base outline-none focus:border-coral md:max-w-md"
        />
        <FacetRow label="ジャンル" options={genres} value={filters.genre} onChange={(genre) => change({ genre })} />
        <div className="space-y-2 md:flex md:flex-wrap md:gap-x-4 md:gap-y-2 md:space-y-0">
          <FacetRow
            label="朝"
            icon={<SlotIcon slot="breakfast" className="h-5 w-5" />}
            options={options('breakfast', BREAKFAST_STYLES, (k) => BREAKFAST_LABEL[k])}
            value={filters.breakfast}
            onChange={(breakfast) => change({ breakfast })}
          />
          <FacetRow
            label="昼"
            icon={<SlotIcon slot="lunch" className="h-5 w-5" />}
            options={options('lunch', LUNCH_STYLES, (k) => LUNCH_LABEL[k])}
            value={filters.lunch}
            onChange={(lunch) => change({ lunch })}
          />
          <FacetRow
            label="晩"
            icon={<SlotIcon slot="dinner" className="h-5 w-5" />}
            options={options('dinner', DINNER_MAINS, (k) => DINNER_LABEL[k])}
            value={filters.dinner}
            onChange={(dinner) => change({ dinner })}
          />
        </div>
      </div>
      <p className="mb-2 flex min-h-6 items-center gap-2 text-xs text-ink-soft" aria-live="polite">
        <span>
          <strong className="text-sm text-ink tabular-nums">{list.length}</strong> 件{narrowed && `（${entries.length}件中）`}
        </span>
        {narrowed && (
          <button type="button" onClick={clear} className="min-h-9 rounded-full bg-white px-3 font-bold text-coral-ink shadow-sm">
            しぼりこみを解除
          </button>
        )}
      </p>
      {list.length === 0 ? (
        <p className="rounded-2xl bg-white/60 px-4 py-3 text-sm text-ink-soft">この条件に合う献立はありません。条件をへらすか、ほかの言葉でさがしてみてください。</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 md:items-start lg:grid-cols-3">
          {list.slice(0, shown).map((e) => (
            <IdealMenuCard
              key={e.menu.id}
              ideal={e.menu}
              found={tokens.length > 0 ? matchedItemNames(e.index, tokens) : []}
              catalog={catalog}
              targets={targets}
              storesLoaded={storesLoaded}
              onLoad={onLoad}
            />
          ))}
        </ul>
      )}
      {list.length > shown && (
        <button type="button" onClick={() => setShown((n) => n + PAGE)} className="mt-3 min-h-11 w-full rounded-full border border-coral/40 bg-white text-sm text-ink">
          もっと見る（あと{list.length - shown}件）
        </button>
      )}
    </>
  )
}

// 献立1つ分のカード。量の調整はカードが出たときに計算する。
// ふだんは名前、朝・昼・晩の絵とひとこと、カロリーと食塩だけ。料理の一覧・PFC・栄養のポイントは「中身を見る」でひらく
function IdealMenuCard({ ideal, found, catalog, targets, storesLoaded, onLoad }: ListProps & { ideal: IdealMenu; found: string[] }) {
  const [open, setOpen] = useState(false)
  const withProducts = idealMenuHasProducts(ideal)
  const ready = idealMenuAvailable(ideal, catalog)
  const plan = useMemo(() => {
    if (!ready) return null
    const menu = adjustIdealMenuCached(ideal, catalog, targets)
    return { menu, summary: summarizeIdealMenu(menu, catalog, targets) }
  }, [ideal, ready, catalog, targets])
  const title = (
    <p className="font-bold leading-snug">
      {ideal.name}
      <span className="ml-1.5 inline-block rounded-full bg-cream px-2 py-0.5 align-[1px] text-2xs font-normal text-ink-soft">{ideal.genre}</span>
    </p>
  )
  if (!plan)
    return withProducts && !storesLoaded ? (
      <li className="rounded-2xl bg-white p-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {title}
            <p className="text-xs text-ink-soft">{ideal.lead}</p>
          </div>
          <button type="button" disabled className="min-h-10 shrink-0 rounded-full bg-coral px-3.5 text-sm font-bold whitespace-nowrap text-ink-strong opacity-40">
            これにする
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-soft">コンビニ・メーカーの商品を読み込んでいます…</p>
      </li>
    ) : null
  const { menu, summary } = plan
  // 目安の8割に届かない栄養素だけ「少なめ」として添える。
  // 成分表示にない栄養素がある市販品を含むもの（実際より少なく出ているかもしれない）は入れない
  const short = summary.checks.filter((c) => (WANT_NUTRIENTS as readonly string[]).includes(c.key) && c.status === 'low' && !c.partial)
  const salt = summary.totals.day.values.salt
  const leads = idealMealLeads(ideal)
  const toggle = (
    <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="min-h-9 shrink-0 rounded-full px-2 text-xs font-bold whitespace-nowrap text-coral-ink">
      {open ? 'とじる ▴' : '中身を見る ▾'}
    </button>
  )
  return (
    <li className="rounded-2xl bg-white p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 pt-1.5">{title}</div>
        <button
          type="button"
          onClick={() => onLoad(ideal, menu)}
          aria-label={`これにする：${ideal.name}`}
          className="min-h-10 shrink-0 rounded-full bg-coral px-3.5 text-sm font-bold whitespace-nowrap text-ink-strong"
        >
          これにする
        </button>
      </div>
      {open ? (
        <dl className="mt-2 space-y-1 text-xs">
          {SLOTS.map((slot) =>
            menu[slot].length === 0 ? null : (
              <div key={slot} className="flex items-start gap-1.5">
                <dt className="flex shrink-0 items-center gap-1">
                  <SlotIcon slot={slot} className="h-5 w-5" />
                  <span className="sr-only">{SLOT_LABEL[slot]}</span>
                </dt>
                <dd className="min-w-0 flex-1 pt-0.5 leading-snug">
                  <MealItems items={menu[slot]} catalog={catalog} />
                </dd>
              </div>
            ),
          )}
        </dl>
      ) : (
        // 朝・昼・晩を、その食事の顔になる料理の絵とひとことで見せる
        <ul className="mt-1 space-y-0.5">
          {MEAL_SLOTS.map((slot) => {
            const face = mealFaceItem(
              menu[slot].filter((item) => !isIdealExtra(item)),
              catalog,
            )
            if (!face) return null
            const src = menuItemImage(face, catalog)
            return (
              <li key={slot} className="flex items-center gap-1.5 text-xs leading-snug">
                {src ? <img src={src} alt="" className="h-8 w-8 shrink-0" /> : <span className="h-8 w-8 shrink-0 rounded-full bg-cream" aria-hidden />}
                <span className="shrink-0 text-xs text-ink-soft">{SLOT_LABEL[slot]}</span>
                <span className="min-w-0 flex-1">{leads ? leads[slot] : itemName(face, catalog)}</span>
              </li>
            )
          })}
        </ul>
      )}
      {found.length > 0 && (
        <p className="mt-1.5 text-xs leading-snug">
          <span className="text-ink-soft">入っている料理：</span>
          <span className="font-bold">{found.join('・')}</span>
        </p>
      )}
      {open ? (
        <>
          <p className="mt-2 rounded-xl bg-cream px-2.5 py-1.5 text-xs tabular-nums">
            {Math.round(summary.kcal).toLocaleString()} kcal
            {summary.ratio && (
              <>
                ・P {Math.round(summary.ratio.p)}% F {Math.round(summary.ratio.f)}% C {Math.round(summary.ratio.c)}%
              </>
            )}
            ・食塩 {salt.toFixed(1)} g
          </p>
          <p className="mt-1.5 text-xs leading-snug text-ink-soft">
            {ideal.point}
            {short.length > 0 && <>。少なめ：{short.map((c) => NUTRIENT_INFO[c.key].label).join('・')}</>}
          </p>
          {withProducts && (
            <p className="mt-1 text-2xs leading-snug text-ink-soft">※ 市販品はパッケージの栄養成分表示にある成分だけで計算しています（ビタミン・ミネラルは実際より少なく出ます）</p>
          )}
          <div className="-mb-1 flex justify-end">{toggle}</div>
        </>
      ) : (
        <div className="mt-1 -mb-1 flex items-center justify-between gap-2">
          <p className="min-w-0 text-xs text-ink-soft tabular-nums">
            {Math.round(summary.kcal).toLocaleString()} kcal・食塩 {salt.toFixed(1)} g
          </p>
          {toggle}
        </div>
      )}
    </li>
  )
}

// 1食に入っている料理・市販品の名前を「・」でつなぐ。足した一品には「＋」、市販品にはお店・メーカーの名前、1人前でないものには量を添える
export function MealItems({ items, catalog }: { items: MenuItem[]; catalog: Catalog }) {
  return (
    <>
      {items.map((item, i) => {
        const portion = portionLabel(item, catalog)
        const brand = item.kind === 'product' ? catalog.products.get(item.refId)?.brand : undefined
        return (
          <span key={item.uid}>
            {i > 0 && '・'}
            {isIdealExtra(item) && (
              <span className="font-bold text-coral-ink" aria-label="足した一品">
                ＋
              </span>
            )}
            {brand && <span className="text-ink-soft">{brand}の</span>}
            {itemName(item, catalog)}
            {portion && <span className="text-ink-soft tabular-nums">{portion}</span>}
          </span>
        )
      })}
    </>
  )
}

// その1食のカロリー（区分の目安）・PFC・食塩
export function MealStats({ slot, menu, summary, targets }: { slot: Slot; menu: DayMenu; summary: ReturnType<typeof summarizeIdealMenu>; targets: Targets }) {
  if (menu[slot].length === 0) return null
  const totals = summary.totals.bySlot[slot]
  const b = slotBalance(totals, slot, targets)
  return (
    <span className="block text-2xs text-ink-soft tabular-nums">
      <span className="whitespace-nowrap">
        {Math.round(b.kcal).toLocaleString()} kcal（目安 {b.targetKcal.toLocaleString()}）
      </span>
      {/* 「・」の前では改行されないので、区切りの前に改行してよい位置（wbr）を入れる */}
      {b.ratio && (
        <>
          <wbr />
          <span className="whitespace-nowrap">・P {Math.round(b.ratio.p)}% F {Math.round(b.ratio.f)}% C {Math.round(b.ratio.c)}%</span>
        </>
      )}
      <wbr />
      <span className="whitespace-nowrap">・食塩 {totals.values.salt.toFixed(1)} g</span>
    </span>
  )
}
