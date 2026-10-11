import { describe, expect, it } from 'vitest'
import { containerMl, toMakerProduct, type MakerLabel } from './makers'

const label = (over: Partial<MakerLabel>): MakerLabel => ({
  jan: '4900000000001',
  name: 'テストのポテトチップス',
  maker: 'テスト製菓',
  category: 'snack',
  url: 'https://example.com/p/1',
  basis: '1袋55g当たり',
  servingAmount: 55,
  servingUnit: 'g',
  energyKcal: 308,
  protein: 2.8,
  fat: 19.8,
  carb: 29.7,
  salt: 0.5,
  fetchedAt: '2026-10-11',
  ...over,
})

describe('containerMl', () => {
  it('商品名の容量を読む', () => {
    expect(containerMl('お茶　ペット　６００ｍｌ')).toBe(600)
    expect(containerMl('コーラ 1.5L')).toBe(1500)
    expect(containerMl('ポテトチップス 55g')).toBeUndefined()
  })
})

describe('toMakerProduct', () => {
  it('1袋当たりの表示を100g当たりに直し、1袋を1回分にする', () => {
    const p = toMakerProduct(label({}))!
    expect(p.basis).toBe('100g')
    expect(p.servingGrams).toBe(55)
    expect(p.nutrients.energyKcal).toBeCloseTo(560, 0)
    expect(p.nutrients.alcohol).toBe(0)
    expect(p.source).toEqual({ name: 'テスト製菓', url: 'https://example.com/p/1', fetchedAt: '2026-10-11' })
  })
  it('100mL当たりの飲み物は1本の容量を1回分にする', () => {
    const p = toMakerProduct(label({ category: 'drink', basis: '100ml当たり', servingAmount: 100, servingUnit: 'ml', containerMl: 600, energyKcal: 0, protein: 0, fat: 0, carb: 0, salt: 0.03 }))!
    expect(p).toMatchObject({ basis: '100ml', servingGrams: 600 })
  })
  it('ビールは度数から純アルコール量を出し、食塩の表示が幅だけなら 0', () => {
    const p = toMakerProduct(label({ category: 'alcohol', basis: '100ml当たり', servingAmount: 100, servingUnit: 'ml', containerMl: 350, energyKcal: 40, protein: 0.4, fat: 0, carb: 2.7, salt: undefined, alcoholPercent: 5 }))!
    expect(p.nutrients.alcohol).toBe(4)
    expect(p.nutrients.salt).toBe(0)
  })
  it('量の書かれていない「1枚当たり」は1回分の表示のまま', () => {
    const p = toMakerProduct(label({ basis: '1枚当たり', servingAmount: undefined, servingUnit: undefined }))!
    expect(p).toMatchObject({ basis: 'serving', servingLabel: '1枚' })
    expect(p.nutrients.energyKcal).toBe(308)
  })
  it('必須の項目が足りなければ使わない', () => {
    expect(toMakerProduct(label({ protein: undefined }))).toBeNull()
  })
})
