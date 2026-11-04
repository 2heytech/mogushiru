import { describe, expect, it } from 'vitest'
import { productGroupKey, representativeProducts } from './productGroups'
import { NUTRIENT_KEYS, type Nutrients, type Product } from './types'

// 値は架空
const product = (jan: string, name: string, energyKcal: number, over: Partial<Product> = {}): Product => {
  const nutrients = Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, null])) as Nutrients
  return { jan, name, brand: 'テストストア', category: 'drink', basis: '100ml', servingGrams: 350, nutrients: { ...nutrients, energyKcal }, source: { name: 'テスト', fetchedAt: '2026-11-01' }, ...over }
}

describe('productGroupKey', () => {
  it('箱売りの印と空白を外し、会社・1回分の量で分ける', () => {
    expect(productGroupKey(product('a', 'レモンサワー<ケース>', 45))).toBe(productGroupKey(product('b', 'レモンサワー', 45)))
    expect(productGroupKey(product('a', '焼酎 25度(ケース)', 140))).toBe(productGroupKey(product('b', '焼酎25度', 140)))
    expect(productGroupKey(product('a', 'ビール<6缶パック>', 40))).toBe(productGroupKey(product('b', 'ビール', 40)))
    expect(productGroupKey(product('a', 'レモンサワー', 45, { servingGrams: 500 }))).not.toBe(productGroupKey(product('b', 'レモンサワー', 45)))
    expect(productGroupKey(product('a', 'レモンサワー', 45, { brand: '別の会社' }))).not.toBe(productGroupKey(product('b', 'レモンサワー', 45)))
    expect(productGroupKey(product('a', 'レモンサワー(西日本版)', 45))).not.toBe(productGroupKey(product('b', 'レモンサワー', 45)))
  })
})

describe('representativeProducts', () => {
  it('まとまりごとに1品だけ、最初に出てきた位置に残す。箱売りの印のない名前を代表に', () => {
    const list = [product('1', 'レモンサワー<ケース>', 45), product('2', 'お茶', 0), product('3', 'レモンサワー', 45)]
    expect(representativeProducts(list).map((p) => p.jan)).toEqual(['3', '2'])
  })
  it('地域で値の違う同じ名前の商品は、カロリーが真ん中のものを代表にする', () => {
    const list = [830, 611, 733, 783, 708].map((kcal, i) => product(String(i), '焼肉弁当', kcal, { basis: 'serving', servingGrams: undefined }))
    expect(representativeProducts(list).map((p) => p.nutrients.energyKcal)).toEqual([733])
  })
  it('まとめるものがなければそのまま', () => {
    const list = [product('1', 'お茶', 0), product('2', '紅茶', 10)]
    expect(representativeProducts(list)).toBe(list)
  })
})
