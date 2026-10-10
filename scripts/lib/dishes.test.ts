import { describe, expect, it } from 'vitest'
import { NUTRIENT_KEYS, type Food, type Nutrients } from '../../src/domain/types'
import { buildDishes, type RecipeInput } from './dishes'

// 値は架空
const n = (p: Partial<Nutrients>): Nutrients => {
  const base = {} as Nutrients
  for (const k of NUTRIENT_KEYS) base[k] = 0
  return { ...base, ...p }
}
const foods = new Map<string, Food>([
  ['01088', { id: '01088', name: 'めし', displayName: 'めし', kana: '', group: '01', per100g: n({ energyKcal: 156, carb: 37, satFat: null }) }],
  ['17012', { id: '17012', name: '食塩', displayName: '食塩', kana: '', group: '17', per100g: n({ salt: 99.5 }) }],
])
const recipe = (p: Partial<RecipeInput>): RecipeInput => ({
  id: 'rice', name: 'ごはん', kana: 'ごはん', category: 'staple', suggestedSlots: ['lunch'],
  ingredients: [{ foodId: '01088', grams: 150 }], ...p,
})

describe('料理データの生成', () => {
  it('材料から1人前の栄養を計算し、未測定の成分を記録する', () => {
    const { dishes, errors } = buildDishes([recipe({})], foods, new Set())
    expect(errors).toEqual([])
    expect(dishes[0].nutrients.energyKcal).toBe(234)
    expect(dishes[0].missingNutrients).toEqual(['satFat'])
    expect(dishes[0].illustration).toBe('')
  })

  it('イラストがあればファイル名を入れる', () => {
    const { dishes } = buildDishes([recipe({})], foods, new Set(['rice.webp']))
    expect(dishes[0].illustration).toBe('rice.webp')
  })

  it('同じ料理に複数の形式があれば webp・png を svg より優先する', () => {
    expect(buildDishes([recipe({})], foods, new Set(['rice.svg'])).dishes[0].illustration).toBe('rice.svg')
    expect(buildDishes([recipe({})], foods, new Set(['rice.svg', 'rice.png'])).dishes[0].illustration).toBe('rice.png')
  })

  it('未知の食品番号・重複ID・不正なカテゴリはエラー', () => {
    const { errors } = buildDishes(
      [
        recipe({ ingredients: [{ foodId: '99999', grams: 1 }] }),
        recipe({ id: 'a' }),
        recipe({ id: 'a', category: 'xxx' as never }),
        recipe({ id: 'b', ingredients: [{ foodId: '01088', grams: 1, alternatives: ['88888'] }] }),
      ],
      foods,
      new Set(),
    )
    expect(errors.some((e) => e.includes('99999'))).toBe(true)
    expect(errors.some((e) => e.includes('重複'))).toBe(true)
    expect(errors.some((e) => e.includes('カテゴリ'))).toBe(true)
    expect(errors.some((e) => e.includes('88888'))).toBe(true)
  })

  it('食塩が多すぎる料理は警告', () => {
    const { warnings } = buildDishes([recipe({ ingredients: [{ foodId: '01088', grams: 150 }, { foodId: '17012', grams: 12 }] })], foods, new Set())
    expect(warnings.some((w) => w.includes('食塩'))).toBe(true)
  })
})
