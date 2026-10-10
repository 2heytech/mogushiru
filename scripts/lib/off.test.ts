import { describe, expect, it } from 'vitest'
import { categorize, toProduct } from './off'

// 値は架空
const base = {
  code: '04901234567890'.slice(1),
  product_name: 'テストおにぎり',
  brands: 'テストブランド,別名',
  categories_tags: ['en:meals', 'ja:おにぎり'],
  serving_quantity: 110,
  nutriments: { 'energy-kcal_100g': 170, proteins_100g: 4, fat_100g: 1.5, carbohydrates_100g: 36, salt_100g: 1.1 },
}

describe('Open Food Facts の変換', () => {
  it('必須5項目が揃えば採用し、JANは文字列のまま保つ', () => {
    const p = toProduct({ ...base, code: '0049000000001' }, '2026-10-10')!
    expect(p.jan).toBe('0049000000001')
    expect(p.brand).toBe('テストブランド')
    expect(p.category).toBe('onigiri')
    expect(p.servingGrams).toBe(110)
    expect(p.nutrients.salt).toBe(1.1)
    expect(p.nutrients.fiber).toBeNull()
  })

  it('食塩がなくナトリウムだけなら換算し、その印を残す', () => {
    const { salt_100g: _, ...rest } = base.nutriments
    const p = toProduct({ ...base, nutriments: { ...rest, sodium_100g: 0.4 } }, '2026-10-10')!
    expect(p.nutrients.salt).toBeCloseTo(1.016)
    expect(p.source.saltConverted).toBe(true)
  })

  it('必須項目が欠けたら採用しない', () => {
    const { fat_100g: _, ...rest } = base.nutriments
    expect(toProduct({ ...base, nutriments: rest }, '2026-10-10')).toBeNull()
  })

  it('mL の商品は100mL基準、アルコールは度数から純アルコール量にする', () => {
    const p = toProduct(
      { ...base, categories_tags: ['en:beers'], product_quantity_unit: 'ml',
        nutriments: { ...base.nutriments, alcohol_100g: 5 } },
      '2026-10-10',
    )!
    expect(p.basis).toBe('100ml')
    expect(p.category).toBe('alcohol')
    expect(p.nutrients.alcohol).toBeCloseTo(4)
  })

  it('カテゴリが分からなければ other', () => {
    expect(categorize(['en:something'])).toBe('other')
  })
})
