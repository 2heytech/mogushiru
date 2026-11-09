import { useMemo, useState } from 'react'
import { IDEAL_MENUS, adjustIdealMenu, idealMenuAvailable, idealMenuHasProducts, isIdealExtra, summarizeIdealMenu, type IdealBalance, type IdealMenu } from '../domain/idealMenus'
import { WANT_NUTRIENTS } from '../domain/nutrientChecks'
import type { Catalog } from '../domain/nutrition'
import { slotBalance } from '../domain/slotBalance'
import type { Targets } from '../domain/targets'
import { SLOTS, type DayMenu, type MenuItem, type Slot } from '../domain/types'
import { itemName, portionLabel } from './itemName'
import { NUTRIENT_INFO, SLOT_LABEL } from './labels'
import { SlotIcon } from './Mascot'

type Prepared = { ideal: IdealMenu; withProducts: boolean } & ({ ready: true; menu: DayMenu; summary: ReturnType<typeof summarizeIdealMenu> } | { ready: false })

const BALANCES: { key: IdealBalance; label: string; intro: string }[] = [
  { key: 'day', label: '1日でバランス', intro: '1日の合計で栄養の目安がそろう献立です。朝・昼・晩で自然な組み合わせにしています。' },
  {
    key: 'meal',
    label: '毎食バランス',
    intro: '朝・昼・晩のどれも、1食だけで区分の目安（カロリー・PFC・食塩など）に収まる献立です。1日まとめてでも、1食だけでも呼び出せます。',
  },
]
const MEALS: readonly Slot[] = ['breakfast', 'lunch', 'dinner']

// 理想の献立の一覧。プロフィールの目安に合わせた量で、カロリー・PFC・食塩と、目安の8割に届かない栄養素を添えて出す。
// 「1日でバランス」と、朝・昼・晩それぞれでそろう「毎食バランス」を切り替える。毎食バランスは1食だけ呼び出せる。
// 市販品を使う献立は、コンビニ・メーカーの商品を読み終えるまで「読み込み中」にし、読み終えても商品がなければ出さない
export function IdealMenuList({
  catalog,
  targets,
  storesLoaded,
  onLoad,
  onLoadSlot,
}: {
  catalog: Catalog
  targets: Targets
  storesLoaded: boolean
  onLoad: (ideal: IdealMenu, menu: DayMenu) => void
  onLoadSlot: (ideal: IdealMenu, slot: Slot, items: MenuItem[]) => void
}) {
  const [balance, setBalance] = useState<IdealBalance>('day')
  const prepared = useMemo<Prepared[]>(
    () =>
      IDEAL_MENUS.flatMap((ideal): Prepared[] => {
        const withProducts = idealMenuHasProducts(ideal)
        if (!idealMenuAvailable(ideal, catalog)) return withProducts && !storesLoaded ? [{ ideal, withProducts, ready: false }] : []
        const menu = adjustIdealMenu(ideal, catalog, targets)
        return [{ ideal, withProducts, ready: true, menu, summary: summarizeIdealMenu(menu, catalog, targets) }]
      }),
    [catalog, targets, storesLoaded],
  )
  const mode = BALANCES.find((b) => b.key === balance)!
  return (
    <>
      <div role="radiogroup" aria-label="バランスのとり方" className="mb-2 flex gap-1.5">
        {BALANCES.map((b) => (
          <button
            key={b.key}
            type="button"
            role="radio"
            aria-checked={balance === b.key}
            onClick={() => setBalance(b.key)}
            className={`min-h-9 flex-1 rounded-full border text-sm whitespace-nowrap transition ${
              balance === b.key ? 'border-coral bg-coral font-bold text-white' : 'border-coral/40 bg-white text-ink-soft'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>
      <p className="mb-3 text-xs leading-relaxed text-ink-soft">
        {mode.intro}プロフィールの目安（{targets.energyKcal.toLocaleString()} kcal）に合わせて、ごはん・パン・麺を中心に量を変えて入れます。ごはんは大盛りまでにして、足りない分は
        <span className="font-bold text-coral">＋</span>の一品を足します。
      </p>
      <ul className="space-y-2">
        {prepared.map((p) => {
          const { ideal } = p
          if (ideal.balance !== balance) return null
          const title = (
            <p className="font-bold">
              {ideal.name}
              <span className="ml-1.5 inline-block rounded-full bg-cream px-2 py-0.5 align-[1px] text-[11px] font-normal text-ink-soft">{ideal.genre}</span>
            </p>
          )
          if (!p.ready)
            return (
              <li key={ideal.id} className="rounded-2xl bg-white p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    {title}
                    <p className="text-xs text-ink-soft">{ideal.lead}</p>
                  </div>
                  <button type="button" disabled className="min-h-10 shrink-0 rounded-full bg-coral px-3.5 text-sm font-bold text-white opacity-40">
                    呼び出す
                  </button>
                </div>
                <p className="mt-2 text-xs text-ink-soft">コンビニ・メーカーの商品を読み込んでいます…</p>
              </li>
            )
          const { menu, summary } = p
          // 目安の8割に届かない栄養素だけ「少なめ」として添える。
          // 成分表示にない栄養素がある市販品を含むもの（実際より少なく出ているかもしれない）は入れない
          const short = summary.checks.filter((c) => (WANT_NUTRIENTS as readonly string[]).includes(c.key) && c.status === 'low' && !c.partial)
          const salt = summary.totals.day.values.salt
          return (
            <li key={ideal.id} className="rounded-2xl bg-white p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  {title}
                  <p className="text-xs text-ink-soft">{ideal.lead}</p>
                </div>
                <button type="button" onClick={() => onLoad(ideal, menu)} className="min-h-10 shrink-0 rounded-full bg-coral px-3.5 text-sm font-bold text-white">
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
                                <span className="font-bold text-coral" aria-label="足した一品">
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
                          className="min-h-8 shrink-0 self-center rounded-full border border-coral px-2.5 text-xs font-bold text-coral"
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
              {p.withProducts && (
                <p className="mt-1 text-[11px] leading-snug text-ink-soft">※ 市販品はパッケージの栄養成分表示にある成分だけで計算しています（ビタミン・ミネラルは実際より少なく出ます）</p>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}

// 毎食バランスの献立で、その1食のカロリー（区分の目安）・PFC・食塩
function MealStats({ slot, menu, summary, targets }: { slot: Slot; menu: DayMenu; summary: ReturnType<typeof summarizeIdealMenu>; targets: Targets }) {
  if (menu[slot].length === 0) return null
  const totals = summary.totals.bySlot[slot]
  const b = slotBalance(totals, slot, targets)
  return (
    <span className="block text-[11px] text-ink-soft tabular-nums">
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
