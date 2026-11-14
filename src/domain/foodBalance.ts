// 食べものの単位で見るバランス：主食・主菜・副菜のそろい、野菜・果物の量、食べた食品の種類（10食品群）。
// 栄養素の数字ではなく、料理の材料（成分表の食品番号と重さ）から数える。
//
// 出典
// - 主食・主菜・副菜・牛乳乳製品・果物の「1つ（SV）」の基準と数え方：農林水産省「食事バランスガイド」
//   https://www.maff.go.jp/j/syokuiku/zissen_navi/balance/division.html
//   https://www.maff.go.jp/j/syokuiku/zissen_navi/use/rule.html
// - 主食・主菜・副菜を組み合わせた食事が1日2回以上、野菜350g、果物200g（ジャムを除く）：
//   厚生労働省「健康日本21（第三次）」 https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/kenkounippon21_00006.html
// - 10食品群（さあにぎやかにいただく）と「1日7点以上」「少量でも料理の中に入っていれば1点」：
//   東京都健康長寿医療センター研究所の食品摂取の多様性スコアをもとにした自治体のチェック表
//   （東京都福祉局「食べポチェック」、福岡市「10食品群チェック表」など）
import type { Catalog } from './nutrition'
import { SLOTS, type DayMenu, type Food, type Ingredient, type MenuItem, type Slot } from './types'

// 食事バランスガイドの料理区分
export const MEAL_PARTS = ['staple', 'main', 'side', 'milk', 'fruit'] as const
export type MealPart = (typeof MEAL_PARTS)[number]

// 1つ（SV）の基準。主食＝穀類由来の炭水化物、主菜＝魚・肉・卵・大豆製品由来のたんぱく質、
// 副菜＝野菜・きのこ・いも・豆（大豆を除く）・海藻の重さ、牛乳・乳製品＝カルシウム、果物＝重さ
export const SV_BASE: Record<MealPart, { amount: number; unit: string }> = {
  staple: { amount: 40, unit: 'g' }, // 炭水化物
  main: { amount: 6, unit: 'g' }, // たんぱく質
  side: { amount: 70, unit: 'g' }, // 重さ
  milk: { amount: 100, unit: 'mg' }, // カルシウム
  fruit: { amount: 100, unit: 'g' }, // 重さ
}

// 10食品群（さ＝魚、あ＝油、に＝肉、ぎ＝牛乳、や＝野菜、か＝海藻、い＝いも、た＝卵、だ＝大豆、く＝果物）
export const VARIETY_GROUPS = ['fish', 'oil', 'meat', 'milk', 'vegetable', 'seaweed', 'potato', 'egg', 'soy', 'fruit'] as const
export type VarietyGroup = (typeof VARIETY_GROUPS)[number]

// 健康日本21（第三次）の目標と、10食品群の目安
export const VEGETABLE_GOAL_G = 350
export const FRUIT_GOAL_G = 200
export const BALANCED_MEALS_GOAL = 2
export const VARIETY_GOAL = 7

// 食事（主食・主菜・副菜のそろい）として数える区分。その他（間食・飲み物）は数えない
export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner'] as const satisfies readonly Slot[]

const isSoy = (f: Food) => f.group === '04' && f.name.startsWith('だいず')
const isStarch = (f: Food) => f.group === '02' && f.name.startsWith('＜でん粉')
const isJam = (f: Food) => f.group === '07' && f.name.includes('ジャム')
// だし用の少しのこんぶ（素干し）は、食べるものとしては数えない
const isDashiKombu = (f: Food, grams: number) => f.group === '09' && f.name.includes('こんぶ') && f.name.includes('素干し') && grams < 3
// おひたしや冷奴にかける少しの削り節は、薬味として魚に数えない
const isTopping = (f: Food, grams: number) => f.group === '10' && /(かつお節|削り節)/.test(f.name) && grams < 3

// 乾物か（戻さずに材料の重さを書いているもの）。「水戻し」「ゆで」「水煮」は戻したあとの重さ
const DRIED = /(　乾|素干し|蒸し干し|凍み|干し)/
const REHYDRATED = /(水戻し|ゆで|水煮|甘煮|油いため|漬)/
export function isDried(f: Food): boolean {
  return DRIED.test(f.name) && !REHYDRATED.test(f.name)
}

// 乾物を戻したときの重さの倍率（おおよそ）。食事バランスガイドは副菜の重さを「戻して調理に使う状態」で数える。
// 豆は成分表の「乾」と「ゆで」のエネルギーの比（あずき2.45・いんげんまめ2.2・ささげ2.15）から。
// きのこ・野菜・海藻・こんにゃくは一般的な戻し率のおおよその値
const REHYDRATE: Record<string, number> = { '04': 2.3, '08': 5, '06': 5, '09': 8, '02': 4.5 }
export function rehydratedGrams(f: Food, grams: number): number {
  return isDried(f) ? grams * (REHYDRATE[f.group] ?? 1) : grams
}

// 調理済み流通食品（18群）は、料理名から主菜・主食に数える（材料の内訳が成分表にないため）
const PREPARED_STAPLE = /(チャーハン|お好み焼き)/
const PREPARED_SIDE = /(スープ|春巻き)/

// 1つの材料が、各区分の基準量をいくつ分ふくむか（丸める前）
function partAmounts(f: Food, grams: number): Record<MealPart, number> {
  const out: Record<MealPart, number> = { staple: 0, main: 0, side: 0, milk: 0, fruit: 0 }
  const per = (k: 'carb' | 'protein' | 'calcium') => ((f.per100g[k] ?? 0) * grams) / 100
  switch (f.group) {
    case '01':
      out.staple = per('carb') / SV_BASE.staple.amount
      break
    case '02':
      if (!isStarch(f)) out.side = rehydratedGrams(f, grams) / SV_BASE.side.amount
      break
    case '04':
      if (isSoy(f)) out.main = per('protein') / SV_BASE.main.amount
      else out.side = rehydratedGrams(f, grams) / SV_BASE.side.amount
      break
    case '06':
    case '08':
      out.side = rehydratedGrams(f, grams) / SV_BASE.side.amount
      break
    case '09':
      if (!isDashiKombu(f, grams)) out.side = rehydratedGrams(f, grams) / SV_BASE.side.amount
      break
    case '07':
      if (!isJam(f)) out.fruit = grams / SV_BASE.fruit.amount
      break
    case '10':
    case '11':
    case '12':
      out.main = per('protein') / SV_BASE.main.amount
      break
    case '13':
      out.milk = per('calcium') / SV_BASE.milk.amount
      break
    case '18':
      if (PREPARED_SIDE.test(f.name)) break
      out.main = per('protein') / SV_BASE.main.amount
      if (PREPARED_STAPLE.test(f.name)) out.staple = per('carb') / SV_BASE.staple.amount
      break
  }
  return out
}

// 食事バランスガイドの丸め方：基準の2/3未満は0つ、2/3以上1.5未満は1つ、それより上は四捨五入。
// （ごはんの1.5つという例外は、そろいの判定に影響しないので使わない）
export function roundServing(v: number): number {
  if (v < 2 / 3) return 0
  if (v < 1.5) return 1
  return Math.round(v)
}

// 10食品群のどれに入るか（入らなければ null）。少量でも料理の中に入っていれば数える
function varietyGroupOf(f: Food, grams: number): VarietyGroup | null {
  if (grams <= 0) return null
  switch (f.group) {
    case '10':
      return isTopping(f, grams) ? null : 'fish'
    case '14':
      return 'oil'
    case '17':
      // マヨネーズは油を使ったものとして数える（10食品群の「油」は油を使った料理）
      return f.name.includes('マヨネーズ') ? 'oil' : null
    case '11':
      return 'meat'
    case '13':
      return 'milk'
    case '06':
      return 'vegetable'
    case '09':
      return isDashiKombu(f, grams) ? null : 'seaweed'
    case '02':
      return isStarch(f) ? null : 'potato'
    case '12':
      return 'egg'
    case '04':
      return isSoy(f) ? 'soy' : null
    case '07':
      return isJam(f) ? null : 'fruit'
    default:
      return null
  }
}

// 献立の1品の材料（重さは人前・量をかけたもの）。材料がわからない市販品・サプリは null
export function itemIngredients(item: MenuItem, catalog: Catalog): Ingredient[] | null {
  const scale = (ings: Ingredient[], factor: number) => ings.map((i) => ({ ...i, grams: i.grams * factor }))
  switch (item.kind) {
    case 'dish': {
      const dish = catalog.dishes.get(item.refId)
      return dish ? scale(item.customIngredients ?? dish.ingredients, item.portion) : null
    }
    case 'myDish': {
      const my = catalog.myDishes.get(item.refId)
      return my ? scale(item.customIngredients ?? my.ingredients, item.portion) : null
    }
    case 'food':
      return [{ foodId: item.refId, grams: item.portion }]
    case 'product':
    case 'supplement':
      return null
  }
}

export type MealFoods = {
  // 1品ずつ丸めた「つ（SV）」の合計
  servings: Record<MealPart, number>
  vegetableG: number // 野菜（成分表の野菜類。乾物は乾いたままの重さ）
  fruitG: number // 果物（成分表の果実類。ジャムを除く）
  groups: Set<VarietyGroup>
  // 材料がわからないので数えていない市販品の数（サプリは食べものではないので数えない）
  uncounted: number
}

export function emptyMealFoods(): MealFoods {
  return { servings: { staple: 0, main: 0, side: 0, milk: 0, fruit: 0 }, vegetableG: 0, fruitG: 0, groups: new Set(), uncounted: 0 }
}

export function itemFoods(item: MenuItem, catalog: Catalog): MealFoods {
  const out = emptyMealFoods()
  if (item.kind === 'supplement') return out
  const ings = itemIngredients(item, catalog)
  if (!ings) {
    out.uncounted = 1
    return out
  }
  const raw: Record<MealPart, number> = { staple: 0, main: 0, side: 0, milk: 0, fruit: 0 }
  for (const ing of ings) {
    const f = catalog.foods.get(ing.foodId)
    if (!f) continue
    const a = partAmounts(f, ing.grams)
    for (const p of MEAL_PARTS) raw[p] += a[p]
    if (f.group === '06') out.vegetableG += ing.grams
    if (f.group === '07' && !isJam(f)) out.fruitG += ing.grams
    const g = varietyGroupOf(f, ing.grams)
    if (g) out.groups.add(g)
  }
  // 食事バランスガイドは料理ごとに数える（薬味・衣・つなぎのような少しの材料は、丸めると0つになる）
  for (const p of MEAL_PARTS) out.servings[p] = roundServing(raw[p])
  return out
}

export function mergeMealFoods(into: MealFoods, from: MealFoods): MealFoods {
  for (const p of MEAL_PARTS) into.servings[p] += from.servings[p]
  into.vegetableG += from.vegetableG
  into.fruitG += from.fruitG
  for (const g of from.groups) into.groups.add(g)
  into.uncounted += from.uncounted
  return into
}

// 主食・主菜・副菜がそれぞれ1つ以上そろった食事か
export const isBalancedMeal = (m: MealFoods): boolean => m.servings.staple >= 1 && m.servings.main >= 1 && m.servings.side >= 1

export type DayFoods = {
  bySlot: Record<Slot, MealFoods>
  day: MealFoods
  // 主食・主菜・副菜がそろった食事（朝・昼・晩）
  balancedSlots: Slot[]
}

export function dayFoods(menu: DayMenu, catalog: Catalog): DayFoods {
  const bySlot = {} as Record<Slot, MealFoods>
  const day = emptyMealFoods()
  for (const slot of SLOTS) {
    const m = emptyMealFoods()
    for (const item of menu[slot] ?? []) mergeMealFoods(m, itemFoods(item, catalog))
    bySlot[slot] = m
    mergeMealFoods(day, m)
  }
  const balancedSlots = MEAL_SLOTS.filter((s) => isBalancedMeal(bySlot[s]))
  return { bySlot, day, balancedSlots }
}
