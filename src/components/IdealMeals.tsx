import { useMemo, useState } from 'react'
import { idealMeals, type IdealMeal, type MealSlot } from '../domain/idealMeals'
import {
  BREAKFAST_STYLES,
  DINNER_MAINS,
  LUNCH_STYLES,
  idealMealLeads,
  idealMenuFacets,
  idealSearchIndex,
  idealSearchTokens,
  matchesIdealSearch,
  mealFaceItem,
  type IdealSearchIndex,
} from '../domain/idealMenuFacets'
import { IDEAL_MENUS, adjustIdealMenu, idealMenuAvailable, idealMenuHasProducts, isIdealExtra, summarizeIdealMenu, type IdealBalance } from '../domain/idealMenus'
import type { Catalog } from '../domain/nutrition'
import type { Targets } from '../domain/targets'
import type { MenuItem } from '../domain/types'
import { FacetRow, MealItems, MealStats } from './IdealMenus'
import { menuItemImage } from './illustration'
import { BREAKFAST_LABEL, DINNER_LABEL, LUNCH_LABEL, SLOT_LABEL } from './labels'

// 一度に出す数。1食ごとに献立の量の調整を計算するので、見える分だけ計算する
const PAGE = 12

// その区分の好みでしぼる言葉（理想の献立の一覧の朝・昼・晩と同じ分け方）
const STYLES: Record<MealSlot, { label: string; options: { key: string; label: string }[] }> = {
  breakfast: { label: '主食', options: BREAKFAST_STYLES.map((key) => ({ key, label: BREAKFAST_LABEL[key] })) },
  lunch: { label: '種類', options: LUNCH_STYLES.map((key) => ({ key, label: LUNCH_LABEL[key] })) },
  dinner: { label: '主菜', options: DINNER_MAINS.map((key) => ({ key, label: DINNER_LABEL[key] })) },
}
const BALANCES: { key: IdealBalance; label: string }[] = [
  { key: 'meal', label: '毎食バランス' },
  { key: 'day', label: '1日でバランス' },
]
const SEARCH_EXAMPLE: Record<MealSlot, string> = { breakfast: '納豆、トースト', lunch: '丼、カツ', dinner: '刺身、麻婆' }

// 1食の名前。献立のひとこと（「〇〇の朝、〇〇の昼、〇〇の晩」）のその1食の部分（「納豆と玄米」）。
// 一覧ではこのまま見出しにして、確認の言葉では「納豆と玄米の朝ごはん」の形にする
const mealName = ({ menu, slot }: IdealMeal) => idealMealLeads(menu)?.[slot] ?? menu.name

type Props = {
  slot: MealSlot
  catalog: Catalog
  targets: Targets
  // コンビニ・メーカーの商品を読み終えたか
  storesLoaded: boolean
  onLoad: (title: string, items: MenuItem[]) => void
}

type Entry = { meal: IdealMeal; style: string; index: IdealSearchIndex }
type Filters = { style: string | null; balance: IdealBalance | null }
const NO_FILTERS: Filters = { style: null, balance: null }
const valueOf = (e: Entry, key: keyof Filters) => (key === 'style' ? e.style : e.meal.menu.balance)

// 理想の献立の、朝・昼・晩のどれか1食だけの一覧（「朝に追加」などの画面から呼び出す）。
// 同じ組み合わせの1食は1つにまとめ、量はプロフィールの目安に合わせた献立のその1食ぶんをそのまま使う。
// 毎食バランスの献立の1食は、その1食だけで区分の目安に収まるので先に並べて印をつける
export function IdealMealList({ slot, catalog, targets, storesLoaded, onLoad }: Props) {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(PAGE)
  const [help, setHelp] = useState(false)
  const label = SLOT_LABEL[slot]
  // データにない市販品を使う献立の1食は出さない（読み込み中は出しておく）
  const entries = useMemo<Entry[]>(
    () =>
      idealMeals(
        slot,
        IDEAL_MENUS.filter((m) => idealMenuAvailable(m, catalog) || (idealMenuHasProducts(m) && !storesLoaded)),
      ).map((meal) => ({ meal, style: idealMenuFacets(meal.menu, catalog)[slot], index: idealSearchIndex(meal.menu, catalog, slot) })),
    [slot, catalog, storesLoaded],
  )
  const tokens = useMemo(() => idealSearchTokens(query), [query])
  // skip の条件だけ外して数える（その行のチップに出す件数）
  const pass = (e: Entry, skip?: keyof Filters) =>
    matchesIdealSearch(e.index, tokens) && (Object.keys(filters) as (keyof Filters)[]).every((k) => k === skip || filters[k] === null || valueOf(e, k) === filters[k])
  const list = entries.filter((e) => pass(e))
  const options = <T extends string>(key: keyof Filters, keys: { key: T; label: string }[]) => {
    const pool = entries.filter((e) => pass(e, key))
    return keys.map((k) => ({ ...k, count: pool.filter((e) => valueOf(e, key) === k.key).length }))
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
  return (
    <>
      <div className="mb-2 flex items-start gap-2">
        <p className="min-w-0 flex-1 pt-1 text-xs text-ink-soft">
          理想の献立から、{label}ごはんだけを入れます。量はプロフィールの目安に合わせます。
        </p>
        <button type="button" aria-expanded={help} onClick={() => setHelp((v) => !v)} className="min-h-9 shrink-0 rounded-full px-2 text-xs font-bold whitespace-nowrap text-coral-ink">
          {help ? 'とじる' : 'くわしく'}
        </button>
      </div>
      {help && (
        <p className="mb-2 rounded-2xl bg-white/60 px-3 py-2 text-xs leading-relaxed text-ink-soft">
          「毎食バランス」は、この1食だけでカロリー・PFC・食塩などが{label}の目安に収まります。「1日でバランス」は、1日の合計で目安がそろう献立の{label}ごはんです。ごはん・パン・麺を中心に量を変え、足りない分は
          <span className="font-bold text-coral-ink">＋</span>の一品を足します。呼び出すと、いまの{label}の食事と置き換わります（ほかの区分はそのまま）。
        </p>
      )}
      <div className="mb-2 space-y-2">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setShown(PAGE)
          }}
          aria-label={`${label}ごはんを料理の名前でさがす`}
          placeholder={`料理名でさがす（例：${SEARCH_EXAMPLE[slot]}）`}
          className="min-h-11 w-full rounded-full border-2 border-white bg-white px-4 text-base outline-none focus:border-coral md:max-w-md"
        />
        <div className="space-y-2 md:flex md:flex-wrap md:gap-x-4 md:gap-y-2 md:space-y-0">
          <FacetRow label={STYLES[slot].label} options={options('style', STYLES[slot].options)} value={filters.style} onChange={(style) => change({ style })} />
          <FacetRow label="バランス" options={options('balance', BALANCES)} value={filters.balance} onChange={(balance) => change({ balance })} />
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
        <p className="rounded-2xl bg-white/60 px-4 py-3 text-sm text-ink-soft">この条件に合う{label}ごはんはありません。条件をへらすか、ほかの言葉でさがしてみてください。</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 md:items-start lg:grid-cols-3">
          {list.slice(0, shown).map((e) => (
            <IdealMealCard key={e.meal.key} meal={e.meal} catalog={catalog} targets={targets} storesLoaded={storesLoaded} onLoad={onLoad} />
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

// 1食ぶんのカード。その食事の顔になる料理の絵、名前、もとの献立、入っている料理、カロリー（区分の目安）・PFC・食塩。
// 名前が長くても折り返しにくいよう、「呼び出す」は下の行の右に置く
function IdealMealCard({ meal, catalog, targets, storesLoaded, onLoad }: Omit<Props, 'slot'> & { meal: IdealMeal }) {
  const { menu: ideal, slot } = meal
  const ready = idealMenuAvailable(ideal, catalog)
  const plan = useMemo(() => {
    if (!ready) return null
    const menu = adjustIdealMenu(ideal, catalog, targets)
    return { menu, summary: summarizeIdealMenu(menu, catalog, targets) }
  }, [ideal, ready, catalog, targets])
  if (!plan && !(idealMenuHasProducts(ideal) && !storesLoaded)) return null
  const items = plan?.menu[slot] ?? []
  // 配分が0%の区分（朝食をとらない設定など）には入れるものがない
  if (plan && items.length === 0) return null
  const name = mealName(meal)
  const title = `${name}の${SLOT_LABEL[slot]}ごはん`
  const face = mealFaceItem(
    items.filter((item) => !isIdealExtra(item)),
    catalog,
  )
  const src = face && menuItemImage(face, catalog)
  return (
    <li className="rounded-2xl bg-white p-3">
      <div className="flex items-start gap-2.5">
        {src ? <img src={src} alt="" className="h-12 w-12 shrink-0" /> : <span className="h-12 w-12 shrink-0 rounded-full bg-cream" aria-hidden />}
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-snug">{name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-ink-soft">
            <span>「{ideal.name}」より</span>
            {meal.balanced && <span className="rounded-full bg-ok/25 px-2 py-0.5 text-2xs font-bold whitespace-nowrap text-ok-ink">毎食バランス</span>}
          </p>
        </div>
      </div>
      {plan && (
        <p className="mt-2 text-xs leading-snug">
          <MealItems items={items} catalog={catalog} />
        </p>
      )}
      <div className="mt-1.5 flex items-end gap-2">
        <div className="min-w-0 flex-1 text-xs text-ink-soft">
          {plan ? <MealStats slot={slot} menu={plan.menu} summary={plan.summary} targets={targets} /> : 'コンビニ・メーカーの商品を読み込んでいます…'}
          {items.some((item) => item.kind === 'product') && <p className="mt-0.5 text-2xs leading-snug">※ 市販品はパッケージの栄養成分表示にある成分だけで計算しています</p>}
        </div>
        <button
          type="button"
          disabled={!plan}
          aria-label={`「${title}」を呼び出す`}
          onClick={() => onLoad(title, items)}
          className="min-h-10 shrink-0 rounded-full bg-coral px-3.5 text-sm font-bold text-ink-strong disabled:opacity-40"
        >
          呼び出す
        </button>
      </div>
    </li>
  )
}
