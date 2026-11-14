// 理想の献立を、朝・昼・晩の1食ずつに分けて出す（「朝に追加」などの画面から、その1食だけ呼び出すため）。
// 同じ料理の組み合わせの1食は、いくつの献立に入っていても1つにまとめる
import { idealMenuHasProducts, type IdealMenu, type IdealMenuItem } from './idealMenus'
import { menuTotals, type Catalog } from './nutrition'
import { slotBalance } from './slotBalance'
import type { Targets } from './targets'
import type { DayMenu, MenuItem, NutrientTotals, Slot } from './types'

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner'] as const satisfies readonly Slot[]
export type MealSlot = (typeof MEAL_SLOTS)[number]
export const isMealSlot = (slot: Slot): slot is MealSlot => (MEAL_SLOTS as readonly Slot[]).includes(slot)

export type IdealMeal = {
  // この1食が入っている献立。同じ組み合わせがいくつかの献立にあるときは、代表の1つ
  menu: IdealMenu
  slot: MealSlot
  // 料理の組み合わせ（同じ1食をまとめる目印）
  key: string
  // 毎食バランスの献立の1食（この1食だけで、区分の目安のカロリー・PFC・食塩などに収まる）
  balanced: boolean
}

// 同じ料理の組み合わせなら、書いた順や人前がちがっても同じ1食とみなす（量は呼び出すときに目安に合わせるので）
const mealKey = (items: IdealMenuItem[]) =>
  items
    .map((x) => (typeof x === 'string' ? x : x[0]))
    .sort()
    .join('|')

// 代表にする献立の順：毎食バランス、市販品を使わないもの（商品の読み込みを待たずに出せる）、献立の並び順
const rank = (menu: IdealMenu) => (menu.balance === 'meal' ? 0 : 2) + (idealMenuHasProducts(menu) ? 1 : 0)

// 献立の一覧から、その区分の1食を重なりなく取り出す。毎食バランスの1食を先に、あとは献立の並び順
export function idealMeals(slot: MealSlot, menus: readonly IdealMenu[]): IdealMeal[] {
  const byKey = new Map<string, IdealMenu>()
  for (const menu of menus) {
    if (menu.slots[slot].length === 0) continue
    const key = mealKey(menu.slots[slot])
    const now = byKey.get(key)
    if (!now || rank(menu) < rank(now)) byKey.set(key, menu)
  }
  const meals = [...byKey].map(([key, menu]): IdealMeal => ({ menu, slot, key, balanced: menu.balance === 'meal' }))
  return [...meals.filter((m) => m.balanced), ...meals.filter((m) => !m.balanced)]
}

// 1食だけで区分の目安に収まるか。画面の「区分ごとのバランス」で「ちょうどいい」になる（カロリーが区分の目安の±20%、
// PFCが目標の範囲）うえに、食塩と飽和脂肪酸が1日の目安 × 区分の割合まで
export function fitsMealAlone(totals: NutrientTotals, slot: MealSlot, targets: Targets): boolean {
  const share = targets.slotShare[slot]
  if (share <= 0) return false
  const b = slotBalance(totals, slot, targets)
  const eps = 1e-9
  return b.energy === 'ok' && b.hints.length === 0 && totals.values.salt <= targets.saltMax * share + eps && totals.values.satFat <= targets.satFatMaxG * share + eps
}

const slotTotals = (slot: Slot, items: MenuItem[], catalog: Catalog) =>
  menuTotals({ breakfast: [], lunch: [], dinner: [], other: [], [slot]: items }, catalog).bySlot[slot]

// 毎食バランスで1食ずつえらぶときの、その区分の候補。理想の献立の1食のうち、プロフィールの目安に合わせた量（plan）で、
// その1食だけでも区分の目安に収まるもの。毎食バランスの献立の1食はいつも入れる（どの目安でも収まるように組んでいる）。
// 同じ組み合わせの1食は1つにまとめ、代表は idealMeals と同じ順（収まらないときは次の献立）。毎食バランスの献立の1食を先に、あとは献立の並び順
export function soloMeals(slot: MealSlot, menus: readonly IdealMenu[], catalog: Catalog, targets: Targets, plan: (menu: IdealMenu) => DayMenu): IdealMeal[] {
  if (targets.slotShare[slot] <= 0) return []
  const order = new Map(menus.map((m, i) => [m.id, i]))
  const byRank = [...menus].sort((a, b) => rank(a) - rank(b) || order.get(a.id)! - order.get(b.id)!)
  const found = new Map<string, IdealMeal>()
  for (const menu of byRank) {
    if (menu.slots[slot].length === 0) continue
    const key = mealKey(menu.slots[slot])
    if (found.has(key)) continue
    const balanced = menu.balance === 'meal'
    const items = plan(menu)[slot]
    if (items.length === 0) continue
    if (!balanced && !fitsMealAlone(slotTotals(slot, items, catalog), slot, targets)) continue
    found.set(key, { menu, slot, key, balanced })
  }
  const meals = [...found.values()]
  return meals.sort((a, b) => Number(b.balanced) - Number(a.balanced) || order.get(a.menu.id)! - order.get(b.menu.id)!)
}
