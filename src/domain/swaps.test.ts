import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { menuTotals, type Catalog } from './nutrition'
import { naKRatio, targetNaKRatio } from './sodiumPotassium'
import { applySwap, SWAP_RULES, swapIdeas } from './swaps'
import { computeTargets } from './targets'
import type { DayMenu, Dish, Food, MenuItem, MyDish } from './types'

const read = <T,>(file: string) => JSON.parse(readFileSync(new URL(`../../public/data/${file}`, import.meta.url), 'utf8')) as T
const dishes = read<{ dishes: Dish[] }>('dishes.json').dishes
const foods = new Map(read<{ foods: Food[] }>('foods.json').foods.map((f) => [f.id, f]))
const myDish: MyDish = { id: 'my-1', baseDishId: null, name: 'テストの塩むすび', ingredients: [{ foodId: '01088', grams: 100 }, { foodId: '17012', grams: 1 }], createdAt: '2026-01-01' }
const catalog: Catalog = { dishes: new Map(dishes.map((d) => [d.id, d])), myDishes: new Map([[myDish.id, myDish]]), products: new Map(), foods }
let n = 0
const dish = (refId: string, portion = 1): MenuItem => ({ uid: `u${n++}`, kind: 'dish', refId, portion })
const empty: DayMenu = { breakfast: [], lunch: [], dinner: [], other: [] }
const rule = (to: string) => SWAP_RULES.find((r) => r.to === to)!

describe('ナトカリ比', () => {
  it('食塩とカリウムのモル比', () => {
    // 食塩 6.5g（ナトリウム約2,559mg＝111mmol）、カリウム 2,600mg（66.5mmol）
    expect(naKRatio(6.5, 2600)).toBeCloseTo(1.67, 2)
    expect(naKRatio(5, 0)).toBeNull()
  })

  it('目標量どおりに食べたときの比は男女とも約1.7', () => {
    expect(targetNaKRatio(computeTargets({ sex: 'female', age: 35, activity: 'normal' }))).toBeCloseTo(1.67, 1)
    expect(targetNaKRatio(computeTargets({ sex: 'male', age: 35, activity: 'normal' }))).toBeCloseTo(1.67, 1)
  })
})

describe('置きかえの案', () => {
  it('みそ汁のみそを減塩みそに、肉じゃがのしょうゆを減塩しょうゆにする', () => {
    const menu: DayMenu = { ...empty, breakfast: [dish('miso-soup')], dinner: [dish('nikujaga', 2)] }
    const ideas = swapIdeas(menu, catalog)
    const nikujaga = ideas.find((i) => i.itemName === '肉じゃが' && i.toLabel === '減塩しょうゆ')!
    // こいくちしょうゆ 10g × 2人前：食塩 14.5 → 8.3 g/100g
    expect(nikujaga.gain).toBeCloseTo(((14.5 - 8.3) * 10 * 2) / 100)
    expect(nikujaga.slot).toBe('dinner')
    const miso = ideas.find((i) => i.toLabel === '減塩みそ')!
    expect(miso.ingredients.find((i) => i.foodId === '17119')).toMatchObject({ grams: 12, role: 'みそ' })
    // 変わる量の多い順
    expect(ideas[0]).toBe(nikujaga)
  })

  it('少しのうすくちしょうゆ（0.5g）のように変化が小さいものは勧めない', () => {
    const ideas = swapIdeas({ ...empty, dinner: [dish('nikujaga')] }, catalog)
    expect(ideas.some((i) => i.fromLabel === 'うすくちしょうゆ')).toBe(false)
  })

  it('食塩を減塩タイプにするとカリウムが増え、注意書きがつく', () => {
    const ideas = swapIdeas({ ...empty, lunch: [{ uid: 'm', kind: 'myDish', refId: 'my-1', portion: 1 }] }, catalog)
    const salt = ideas.find((i) => i.toLabel === '減塩タイプの食塩')!
    expect(salt.gain).toBeCloseTo((99.5 - 49.4) / 100)
    expect(salt.potassiumGain).toBeGreaterThan(150)
    expect(salt.caution).toMatch(/腎臓/)
  })

  it('ごはんは押麦を3割まぜた麦ごはんで食物繊維が増える', () => {
    const ideas = swapIdeas({ ...empty, breakfast: [dish('rice')] }, catalog)
    const rice = ideas.find((i) => i.kind === 'fiber')!
    expect(rice.ingredients).toEqual([
      { foodId: '01088', grams: 105, role: 'ごはん', alternatives: ['01085', '01089'] },
      { foodId: '01170', grams: 45 },
    ])
    expect(rice.gain).toBeCloseTo((45 * (4.2 - 1.5)) / 100)
  })

  it('置きかえた材料では、同じ案はもう出ない（献立の中で材料を変えた料理も、その材料で考える）', () => {
    const rice = dish('rice')
    const swapped: MenuItem = { ...rice, customIngredients: applySwap(dishes.find((d) => d.id === 'rice')!.ingredients, rule('01170')) }
    expect(swapIdeas({ ...empty, breakfast: [swapped] }, catalog)).toEqual([])
  })

  it('置きかえた材料で計算すると、その分だけ食塩が減る', () => {
    const before: DayMenu = { ...empty, breakfast: [dish('miso-soup')] }
    const idea = swapIdeas(before, catalog).find((i) => i.kind === 'salt')!
    const after: DayMenu = { ...empty, breakfast: [{ ...before.breakfast[0], customIngredients: idea.ingredients }] }
    const diff = menuTotals(before, catalog).day.values.salt - menuTotals(after, catalog).day.values.salt
    expect(diff).toBeCloseTo(idea.gain)
  })

  it('材料を変えられない食品・市販品は案にしない', () => {
    const menu: DayMenu = { ...empty, breakfast: [{ uid: 'f', kind: 'food', refId: '01088', portion: 150 }] }
    expect(swapIdeas(menu, catalog)).toEqual([])
  })
})
