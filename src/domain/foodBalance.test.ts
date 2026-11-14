import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { dayFoods, isDried, itemFoods, rehydratedGrams, roundServing, VARIETY_GROUPS } from './foodBalance'
import type { Catalog } from './nutrition'
import type { DayMenu, Dish, Food, MenuItem, MyDish, Product } from './types'

const read = <T,>(file: string) => JSON.parse(readFileSync(new URL(`../../public/data/${file}`, import.meta.url), 'utf8')) as T
const dishes = read<{ dishes: Dish[] }>('dishes.json').dishes
const foods = new Map(read<{ foods: Food[] }>('foods.json').foods.map((f) => [f.id, f]))
const product = { jan: 'test-onigiri', name: 'テストのおにぎり', brand: 'テスト', category: 'onigiri', basis: 'serving', nutrients: {}, source: { name: 'テスト', fetchedAt: '2026-01-01' } } as unknown as Product
const myDish: MyDish = { id: 'my-1', baseDishId: null, name: 'テストの野菜いため', ingredients: [{ foodId: '06061', grams: 100 }, { foodId: '14006', grams: 5 }], createdAt: '2026-01-01' }
const catalog: Catalog = {
  dishes: new Map(dishes.map((d) => [d.id, d])),
  myDishes: new Map([[myDish.id, myDish]]),
  products: new Map([[product.jan, product]]),
  foods,
}
let n = 0
const dish = (refId: string, portion = 1): MenuItem => ({ uid: `u${n++}`, kind: 'dish', refId, portion })
const empty: DayMenu = { breakfast: [], lunch: [], dinner: [], other: [] }

describe('食事バランスガイドの「つ（SV）」', () => {
  it('2/3未満は0つ、1.5未満は1つ、それより上は四捨五入', () => {
    expect(roundServing(0.66)).toBe(0)
    expect(roundServing(0.67)).toBe(1)
    expect(roundServing(1.49)).toBe(1)
    expect(roundServing(1.5)).toBe(2)
    expect(roundServing(2.49)).toBe(2)
    expect(roundServing(2.5)).toBe(3)
  })

  it('ごはん・焼き鮭・おひたし・牛乳・バナナを区分ごとに数える', () => {
    expect(itemFoods(dish('rice'), catalog).servings).toMatchObject({ staple: 1, main: 0, side: 0 })
    expect(itemFoods(dish('grilled-salmon'), catalog).servings.main).toBeGreaterThanOrEqual(1)
    expect(itemFoods(dish('ohitashi'), catalog).servings).toMatchObject({ side: 1, main: 0 })
    // 牛乳コップ1杯（カルシウム約220mg）は2つ
    expect(itemFoods(dish('milk'), catalog).servings.milk).toBe(2)
    expect(itemFoods(dish('banana'), catalog).servings.fruit).toBe(1)
  })

  it('人前をかけてから丸める', () => {
    expect(itemFoods(dish('rice', 2), catalog).servings.staple).toBe(roundServing(2 * (37.1 * 1.5) / 40))
  })

  it('献立の中で材料を変えた料理は、変えたあとの材料で数える', () => {
    const custom: MenuItem = { ...dish('rice'), customIngredients: [{ foodId: '01088', grams: 50 }] }
    expect(itemFoods(custom, catalog).servings.staple).toBe(0)
  })

  it('乾物は戻した重さで副菜に数える（野菜の量は乾いたままの重さ）', () => {
    const kiriboshi = foods.get('06136')!
    expect(isDried(kiriboshi)).toBe(true)
    expect(isDried(foods.get('06334')!)).toBe(false) // 切干しだいこん ゆで
    expect(rehydratedGrams(kiriboshi, 10)).toBe(50)
    const item: MenuItem = { uid: 'k', kind: 'food', refId: '06136', portion: 10 }
    const m = itemFoods(item, catalog)
    expect(m.servings.side).toBe(1)
    expect(m.vegetableG).toBe(10)
  })
})

describe('1日の食事', () => {
  it('主食・主菜・副菜がそろった食事を数える（その他は数えない）', () => {
    const menu: DayMenu = {
      breakfast: [dish('rice'), dish('grilled-salmon'), dish('ohitashi')],
      lunch: [dish('rice'), dish('grilled-salmon')],
      dinner: [dish('curry-rice')],
      other: [dish('rice'), dish('grilled-salmon'), dish('ohitashi')],
    }
    const d = dayFoods(menu, catalog)
    // カレーライスは1皿で主食・主菜・副菜がそろう
    expect(d.balancedSlots).toEqual(['breakfast', 'dinner'])
  })

  it('野菜・果物の重さと、10食品群を足す', () => {
    const menu: DayMenu = { ...empty, breakfast: [dish('ohitashi'), dish('banana')], lunch: [{ uid: 'm', kind: 'myDish', refId: 'my-1', portion: 1 }] }
    const d = dayFoods(menu, catalog)
    expect(d.day.vegetableG).toBeCloseTo(170)
    expect(d.day.fruitG).toBeCloseTo(100)
    expect([...d.day.groups].sort()).toEqual(['fruit', 'oil', 'vegetable'])
    // おひたしにかける少しの削り節は、魚に数えない
    expect(d.day.groups.has('fish')).toBe(false)
  })

  it('材料がわからない市販品は数えずに数だけ記録し、サプリは食べものに数えない', () => {
    const menu: DayMenu = {
      ...empty,
      lunch: [{ uid: 'p', kind: 'product', refId: product.jan, portion: 1 }],
      other: [{ uid: 's', kind: 'supplement', refId: product.jan, portion: 1 }],
    }
    const d = dayFoods(menu, catalog)
    expect(d.day.uncounted).toBe(1)
    expect(d.day.servings).toEqual({ staple: 0, main: 0, side: 0, milk: 0, fruit: 0 })
  })

  it('10食品群は10種類', () => {
    expect(VARIETY_GROUPS).toHaveLength(10)
  })
})
