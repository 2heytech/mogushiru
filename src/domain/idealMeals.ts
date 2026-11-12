// 理想の献立を、朝・昼・晩の1食ずつに分けて出す（「朝に追加」などの画面から、その1食だけ呼び出すため）。
// 同じ料理の組み合わせの1食は、いくつの献立に入っていても1つにまとめる
import { idealMenuHasProducts, type IdealMenu, type IdealMenuItem } from './idealMenus'
import type { Slot } from './types'

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
