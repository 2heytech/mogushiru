import { describe, expect, it } from 'vitest'
import { menuTotals, type Catalog } from './nutrition'
import { hasAnyNutrient, SUPPLEMENT_KEYS, SUPPLEMENT_MAIN_KEYS, supplementNutrients, vitaminAFromCarotene } from './supplement'
import { NUTRIENT_KEYS, type Product } from './types'

describe('サプリの栄養素', () => {
  it('入れた成分だけ値が入り、空欄は 0（未収録にしない）', () => {
    const n = supplementNutrients({ vitaminC: 500, vitaminD: 25, iron: null })
    expect(n.vitaminC).toBe(500)
    expect(n.vitaminD).toBe(25)
    expect(n.iron).toBe(0)
    for (const k of NUTRIENT_KEYS) expect(n[k]).not.toBeNull()
  })

  it('n-3系脂肪酸は多価不飽和脂肪酸にも数える', () => {
    const n = supplementNutrients({ n3Fat: 0.5 })
    expect(n.polyUnsatFat).toBe(0.5)
  })

  it('ビタミンAはレチノールとして上限の判定に入れる。β-カロテン由来なら入れない', () => {
    expect(supplementNutrients({ vitaminA: 600 }).retinol).toBe(600)
    const carotene = supplementNutrients({ vitaminA: 600 }, { vitaminAFromCarotene: true })
    expect(carotene.retinol).toBe(0)
    expect(vitaminAFromCarotene(carotene)).toBe(true)
  })

  it('入力欄は栄養素の一覧から作り、ビタミン・ミネラルはすべて入れられる', () => {
    for (const k of ['vitaminA', 'vitaminD', 'vitaminB1', 'vitaminB2', 'vitaminC', 'calcium', 'iron', 'potassium'] as const) {
      expect(SUPPLEMENT_MAIN_KEYS).toContain(k)
    }
    expect(SUPPLEMENT_KEYS).not.toContain('retinol')
    expect(new Set(SUPPLEMENT_KEYS).size).toBe(SUPPLEMENT_KEYS.length)
  })

  it('マイナスや数でない値は入れない。成分がひとつもなければ登録できない', () => {
    const n = supplementNutrients({ vitaminC: -1, calcium: Number.NaN })
    expect(n.vitaminC).toBe(0)
    expect(hasAnyNutrient(n)).toBe(false)
    expect(hasAnyNutrient(supplementNutrients({ calcium: 200 }))).toBe(true)
  })

  it('1日の合計に回数分が入り、ほかの成分を未収録にしない', () => {
    const supp: Product = {
      jan: 'my-supp',
      name: 'ビタミンD',
      brand: '',
      category: 'supplement',
      basis: 'serving',
      nutrients: supplementNutrients({ vitaminD: 25 }),
      source: { name: 'ユーザー登録', fetchedAt: '2026-01-01T00:00:00Z' },
    }
    const catalog: Catalog = { dishes: new Map(), myDishes: new Map(), foods: new Map(), products: new Map([[supp.jan, supp]]) }
    const menu = { breakfast: [{ uid: 'a', kind: 'supplement' as const, refId: supp.jan, portion: 2 }], lunch: [], dinner: [], other: [] }
    const { day } = menuTotals(menu, catalog)
    expect(day.values.vitaminD).toBe(50)
    expect(day.missing.size).toBe(0)
  })
})
