import {
  NUTRIENT_KEYS,
  type DayMenu,
  type Dish,
  type Food,
  type Ingredient,
  type MenuItem,
  type MyDish,
  type NutrientKey,
  type NutrientTotals,
  type Nutrients,
  type Product,
  type Slot,
} from './types'

export function emptyTotals(): NutrientTotals {
  const values = {} as Record<NutrientKey, number>
  for (const k of NUTRIENT_KEYS) values[k] = 0
  return { values, missing: new Set() }
}

// nutrients × factor を totals に足す。null は 0 として足さず、欠損として記録する
export function addScaled(totals: NutrientTotals, nutrients: Nutrients, factor: number): NutrientTotals {
  for (const k of NUTRIENT_KEYS) {
    const v = nutrients[k]
    if (v === null) totals.missing.add(k)
    else totals.values[k] += v * factor
  }
  return totals
}

export function scaleTotals(totals: NutrientTotals, factor: number): NutrientTotals {
  for (const k of NUTRIENT_KEYS) totals.values[k] *= factor
  return totals
}

export function mergeTotals(into: NutrientTotals, from: NutrientTotals): NutrientTotals {
  for (const k of NUTRIENT_KEYS) into.values[k] += from.values[k]
  for (const k of from.missing) into.missing.add(k)
  return into
}

// 材料（食品番号＋グラム）から栄養を計算する。料理のビルド時計算とカスタマイズで共通
export function ingredientsTotals(ingredients: Ingredient[], foods: Map<string, Food>): NutrientTotals {
  const totals = emptyTotals()
  for (const ing of ingredients) {
    const food = foods.get(ing.foodId)
    if (!food) throw new Error(`未知の食品番号: ${ing.foodId}`)
    addScaled(totals, food.per100g, ing.grams / 100)
  }
  return totals
}

export type Catalog = {
  dishes: Map<string, Dish>
  myDishes: Map<string, MyDish>
  products: Map<string, Product>
  foods: Map<string, Food>
}

export function itemTotals(item: MenuItem, catalog: Catalog): NutrientTotals {
  switch (item.kind) {
    case 'dish': {
      const dish = catalog.dishes.get(item.refId)
      if (!dish) throw new Error(`未知の料理: ${item.refId}`)
      if (item.customIngredients) return scaleTotals(ingredientsTotals(item.customIngredients, catalog.foods), item.portion)
      const t = addScaled(emptyTotals(), dish.nutrients, item.portion)
      for (const k of dish.missingNutrients ?? []) t.missing.add(k)
      return t
    }
    case 'myDish': {
      const my = catalog.myDishes.get(item.refId)
      if (!my) throw new Error(`未知のお気に入りの料理: ${item.refId}`)
      return scaleTotals(ingredientsTotals(item.customIngredients ?? my.ingredients, catalog.foods), item.portion)
    }
    case 'product': {
      const p = catalog.products.get(item.refId)
      if (!p) throw new Error(`未知の市販品: ${item.refId}`)
      const factor = p.basis === 'serving' ? item.portion : item.portion / 100
      return addScaled(emptyTotals(), p.nutrients, factor)
    }
    case 'supplement': {
      const p = catalog.products.get(item.refId)
      if (!p) throw new Error(`未知のサプリ: ${item.refId}`)
      return addScaled(emptyTotals(), p.nutrients, item.portion)
    }
    case 'food': {
      const f = catalog.foods.get(item.refId)
      if (!f) throw new Error(`未知の食品: ${item.refId}`)
      return addScaled(emptyTotals(), f.per100g, item.portion / 100)
    }
  }
}

export type MenuTotals = {
  bySlot: Record<Slot, NutrientTotals>
  day: NutrientTotals
  // サプリメントなど通常の食品以外からとった分だけの1日の合計。
  // マグネシウム・ナイアシン・葉酸の耐容上限量はこの量と比べる
  supplement: NutrientTotals
}

// 通常の食品以外（サプリメント）として扱う項目の種類
export const SUPPLEMENT_KINDS: readonly MenuItem['kind'][] = ['supplement']
export const isSupplementItem = (item: MenuItem): boolean => SUPPLEMENT_KINDS.includes(item.kind)

// データの更新でなくなった料理・市販品を外す（保存した1日の食事を呼び出すときに使う）
export function knownItemsOnly(menu: DayMenu, catalog: Catalog): DayMenu {
  const known = (i: MenuItem) =>
    i.kind === 'dish'
      ? catalog.dishes.has(i.refId)
      : i.kind === 'myDish'
        ? catalog.myDishes.has(i.refId)
        : i.kind === 'food'
          ? catalog.foods.has(i.refId)
          : catalog.products.has(i.refId)
  return Object.fromEntries(Object.entries(menu).map(([slot, items]) => [slot, items.filter(known)])) as DayMenu
}

export function menuTotals(menu: DayMenu, catalog: Catalog): MenuTotals {
  const day = emptyTotals()
  const supplement = emptyTotals()
  const bySlot = {} as Record<Slot, NutrientTotals>
  for (const slot of Object.keys(menu) as Slot[]) {
    const slotTotals = emptyTotals()
    for (const item of menu[slot]) {
      const t = itemTotals(item, catalog)
      mergeTotals(slotTotals, t)
      if (isSupplementItem(item)) mergeTotals(supplement, t)
    }
    bySlot[slot] = slotTotals
    mergeTotals(day, slotTotals)
  }
  return { bySlot, day, supplement }
}

// 食塩相当量[g] = ナトリウム[mg] × 2.54 ÷ 1000
export function sodiumMgToSaltG(sodiumMg: number): number {
  return (sodiumMg * 2.54) / 1000
}

export const KCAL_PER_G = { protein: 4, fat: 9, carb: 4, alcohol: 7 } as const

// P・F・C それぞれのカロリー（g × 4 / 9 / 4 kcal）
export function pfcKcal(values: Record<NutrientKey, number>): { p: number; f: number; c: number } {
  return { p: values.protein * KCAL_PER_G.protein, f: values.fat * KCAL_PER_G.fat, c: values.carb * KCAL_PER_G.carb }
}

// PFCのエネルギー比（％）。係数ベースで計算し、P+F+C=100 になるよう正規化する
export function pfcRatio(values: Record<NutrientKey, number>): { p: number; f: number; c: number } | null {
  const p = values.protein * KCAL_PER_G.protein
  const f = values.fat * KCAL_PER_G.fat
  const c = values.carb * KCAL_PER_G.carb
  const sum = p + f + c
  if (sum <= 0) return null
  return { p: (p / sum) * 100, f: (f / sum) * 100, c: (c / sum) * 100 }
}
