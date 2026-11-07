import { useMemo } from 'react'
import { IDEAL_MENUS, adjustIdealMenu, summarizeIdealMenu, type IdealMenu } from '../domain/idealMenus'
import { WANT_NUTRIENTS } from '../domain/nutrientChecks'
import type { Catalog } from '../domain/nutrition'
import type { Targets } from '../domain/targets'
import { SLOTS, type DayMenu } from '../domain/types'
import { itemName, portionLabel } from './itemName'
import { NUTRIENT_INFO, SLOT_LABEL } from './labels'
import { SlotIcon } from './Mascot'

type Prepared = { ideal: IdealMenu; menu: DayMenu; summary: ReturnType<typeof summarizeIdealMenu> }

// 理想の献立の一覧。プロフィールの目安に合わせた量で、カロリー・PFC・食塩と、目安の8割に届かない栄養素を添えて出す
export function IdealMenuList({ catalog, targets, onLoad }: { catalog: Catalog; targets: Targets; onLoad: (ideal: IdealMenu, menu: DayMenu) => void }) {
  const prepared = useMemo<Prepared[]>(
    () =>
      IDEAL_MENUS.map((ideal) => {
        const menu = adjustIdealMenu(ideal, catalog, targets)
        return { ideal, menu, summary: summarizeIdealMenu(menu, catalog, targets) }
      }),
    [catalog, targets],
  )
  return (
    <>
      <p className="mb-3 text-xs leading-relaxed text-ink-soft">
        朝・昼・晩で自然な組み合わせになり、栄養の目安がそろう1日の食事です。プロフィールの目安（{targets.energyKcal.toLocaleString()} kcal）に合わせて、ごはん・パン・麺を中心に量を変えて入れます。
      </p>
      <ul className="space-y-2">
        {prepared.map(({ ideal, menu, summary }) => {
          // 目安の8割に届かない栄養素だけ「少なめ」として添える
          const short = summary.checks.filter((c) => (WANT_NUTRIENTS as readonly string[]).includes(c.key) && c.status === 'low')
          const salt = summary.totals.day.values.salt
          return (
            <li key={ideal.id} className="rounded-2xl bg-white p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{ideal.name}</p>
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
                      <dd className="pt-0.5 leading-snug">
                        {menu[slot].map((item, i) => {
                          const portion = portionLabel(item, catalog)
                          return (
                            <span key={item.uid}>
                              {i > 0 && '・'}
                              {itemName(item, catalog)}
                              {portion && <span className="text-ink-soft tabular-nums">{portion}</span>}
                            </span>
                          )
                        })}
                      </dd>
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
            </li>
          )
        })}
      </ul>
    </>
  )
}
