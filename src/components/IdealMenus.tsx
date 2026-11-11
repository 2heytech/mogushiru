import { useMemo, useState } from 'react'
import {
  IDEAL_GENRES,
  IDEAL_MENUS,
  adjustIdealMenu,
  idealMenuAvailable,
  idealMenuHasProducts,
  isIdealExtra,
  summarizeIdealMenu,
  type IdealBalance,
  type IdealGenre,
  type IdealMenu,
} from '../domain/idealMenus'
import { WANT_NUTRIENTS } from '../domain/nutrientChecks'
import type { Catalog } from '../domain/nutrition'
import { slotBalance } from '../domain/slotBalance'
import type { Targets } from '../domain/targets'
import { SLOTS, type DayMenu, type MenuItem, type Slot } from '../domain/types'
import { itemName, portionLabel } from './itemName'
import { NUTRIENT_INFO, SLOT_LABEL } from './labels'
import { SlotIcon } from './Mascot'

const BALANCES: { key: IdealBalance; label: string; short: string; intro: string }[] = [
  { key: 'day', label: '1日でバランス', short: '1日の合計で目安がそろう献立', intro: '1日の合計で栄養の目安がそろう献立です。朝・昼・晩で自然な組み合わせにしています。' },
  {
    key: 'meal',
    label: '毎食バランス',
    short: '1食ずつでも目安に収まる献立',
    intro: '朝・昼・晩のどれも、1食だけで区分の目安（カロリー・PFC・食塩など）に収まる献立です。1日まとめてでも、1食だけでも呼び出せます。',
  },
]
const MEALS: readonly Slot[] = ['breakfast', 'lunch', 'dinner']
// 一度に出す数。献立ごとに量の調整を計算するので、見える分だけ計算する
const PAGE = 10
const ALL_GENRES = 'all'

type ListProps = {
  catalog: Catalog
  targets: Targets
  storesLoaded: boolean
  onLoad: (ideal: IdealMenu, menu: DayMenu) => void
  onLoadSlot: (ideal: IdealMenu, slot: Slot, items: MenuItem[]) => void
}

// 理想の献立の一覧。プロフィールの目安に合わせた量で、カロリー・PFC・食塩と、目安の8割に届かない栄養素を添えて出す。
// 「1日でバランス」と、朝・昼・晩それぞれでそろう「毎食バランス」を切り替え、ジャンルで絞り込む。毎食バランスは1食だけ呼び出せる。
// 市販品を使う献立は、コンビニ・メーカーの商品を読み終えるまで「読み込み中」にし、読み終えても商品がなければ出さない
export function IdealMenuList({ catalog, targets, storesLoaded, onLoad, onLoadSlot }: ListProps) {
  const [balance, setBalance] = useState<IdealBalance>('day')
  const [genre, setGenre] = useState<IdealGenre | typeof ALL_GENRES>(ALL_GENRES)
  const [shown, setShown] = useState(PAGE)
  // データにない市販品を使う献立は出さない（読み込み中は出しておく）
  const menus = useMemo(
    () => IDEAL_MENUS.filter((m) => m.balance === balance && (idealMenuAvailable(m, catalog) || (idealMenuHasProducts(m) && !storesLoaded))),
    [balance, catalog, storesLoaded],
  )
  const genres = IDEAL_GENRES.map((g) => ({ g, n: menus.filter((m) => m.genre === g).length })).filter((x) => x.n > 0)
  const current = genre !== ALL_GENRES && genres.some((x) => x.g === genre) ? genre : ALL_GENRES
  const list = current === ALL_GENRES ? menus : menus.filter((m) => m.genre === current)
  const mode = BALANCES.find((b) => b.key === balance)!
  const chip = (active: boolean) =>
    `min-h-8 rounded-full border px-3 text-xs whitespace-nowrap transition ${active ? 'border-coral bg-coral/15 font-bold text-ink' : 'border-ink/10 bg-white text-ink-soft'}`
  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div role="radiogroup" aria-label="バランスのとり方" className="flex w-full gap-1.5 md:w-auto md:min-w-80">
          {BALANCES.map((b) => (
            <button
              key={b.key}
              type="button"
              role="radio"
              aria-checked={balance === b.key}
              onClick={() => {
                setBalance(b.key)
                setShown(PAGE)
              }}
              className={`min-h-9 flex-1 rounded-full border text-sm whitespace-nowrap transition ${
                balance === b.key ? 'border-coral bg-coral font-bold text-ink-strong' : 'border-coral/40 bg-white text-ink-soft'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
        {/* 説明は長いので畳んでおく */}
        <details className="group min-w-0 flex-1 text-xs leading-relaxed text-ink-soft">
          <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-[12px] font-bold shadow-sm" aria-hidden>
              ?
            </span>
            {mode.short}
            <span className="font-bold text-coral-ink group-open:hidden">くわしく</span>
          </summary>
          <p className="pb-1">
            {mode.intro}プロフィールの目安（{targets.energyKcal.toLocaleString()} kcal）に合わせて、ごはん・パン・麺を中心に量を変えて入れます。ごはんは大盛りまでにして、足りない分は
            <span className="font-bold text-coral-ink">＋</span>の一品を足します。呼び出すと、いまの1日の食事と置き換わります（1食だけ呼び出したときは、その区分だけ）。
          </p>
        </details>
      </div>
      <div role="radiogroup" aria-label="ジャンル" className="-mx-5 mb-3 flex gap-1.5 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0">
        {[{ g: ALL_GENRES, n: menus.length } as const, ...genres].map(({ g, n }) => (
          <button
            key={g}
            type="button"
            role="radio"
            aria-checked={current === g}
            onClick={() => {
              setGenre(g)
              setShown(PAGE)
            }}
            className={chip(current === g)}
          >
            {g === ALL_GENRES ? 'すべて' : g}
            <span className="ml-1 font-normal tabular-nums text-ink-soft">{n}</span>
          </button>
        ))}
      </div>
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 md:items-start">
        {list.slice(0, shown).map((ideal) => (
          <IdealMenuCard key={ideal.id} ideal={ideal} catalog={catalog} targets={targets} storesLoaded={storesLoaded} onLoad={onLoad} onLoadSlot={onLoadSlot} />
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

// 献立1つ分のカード。量の調整はカードが出たときに計算する
function IdealMenuCard({ ideal, catalog, targets, storesLoaded, onLoad, onLoadSlot }: ListProps & { ideal: IdealMenu }) {
  const withProducts = idealMenuHasProducts(ideal)
  const ready = idealMenuAvailable(ideal, catalog)
  const plan = useMemo(() => {
    if (!ready) return null
    const menu = adjustIdealMenu(ideal, catalog, targets)
    return { menu, summary: summarizeIdealMenu(menu, catalog, targets) }
  }, [ideal, ready, catalog, targets])
  const title = (
    <p className="font-bold">
      {ideal.name}
      <span className="ml-1.5 inline-block rounded-full bg-cream px-2 py-0.5 align-[1px] text-[12px] font-normal text-ink-soft">{ideal.genre}</span>
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
          <button type="button" disabled className="min-h-10 shrink-0 rounded-full bg-coral px-3.5 text-sm font-bold text-ink-strong opacity-40">
            呼び出す
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
  return (
    <li className="rounded-2xl bg-white p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {title}
          <p className="text-xs text-ink-soft">{ideal.lead}</p>
        </div>
        <button type="button" onClick={() => onLoad(ideal, menu)} className="min-h-10 shrink-0 rounded-full bg-coral px-3.5 text-sm font-bold text-ink-strong">
          呼び出す
        </button>
      </div>
      <dl className="mt-2 space-y-1 text-xs">
        {SLOTS.map((slot) =>
          menu[slot].length === 0 ? null : (
            <div key={slot} className="flex items-start gap-1.5">
              <dt className="flex shrink-0 items-center gap-1">
                <SlotIcon slot={slot} className="h-5 w-5" />
                <span className="sr-only">{SLOT_LABEL[slot]}</span>
              </dt>
              <dd className="min-w-0 flex-1 pt-0.5 leading-snug">
                {menu[slot].map((item, i) => {
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
                {ideal.balance === 'meal' && MEALS.includes(slot) && <MealStats slot={slot} menu={menu} summary={summary} targets={targets} />}
              </dd>
              {ideal.balance === 'meal' && MEALS.includes(slot) && (
                <button
                  type="button"
                  aria-label={`「${ideal.name}」の${SLOT_LABEL[slot]}ごはんだけ呼び出す`}
                  onClick={() => onLoadSlot(ideal, slot, menu[slot])}
                  className="min-h-8 shrink-0 self-center rounded-full border border-coral px-2.5 text-xs font-bold text-coral-ink"
                >
                  {SLOT_LABEL[slot]}だけ
                </button>
              )}
            </div>
          ),
        )}
      </dl>
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
        <p className="mt-1 text-[12px] leading-snug text-ink-soft">※ 市販品はパッケージの栄養成分表示にある成分だけで計算しています（ビタミン・ミネラルは実際より少なく出ます）</p>
      )}
    </li>
  )
}

// 毎食バランスの献立で、その1食のカロリー（区分の目安）・PFC・食塩
function MealStats({ slot, menu, summary, targets }: { slot: Slot; menu: DayMenu; summary: ReturnType<typeof summarizeIdealMenu>; targets: Targets }) {
  if (menu[slot].length === 0) return null
  const totals = summary.totals.bySlot[slot]
  const b = slotBalance(totals, slot, targets)
  return (
    <span className="block text-[12px] text-ink-soft tabular-nums">
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
