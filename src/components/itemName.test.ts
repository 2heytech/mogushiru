import { describe, expect, it } from 'vitest'
import type { Catalog } from '../domain/nutrition'
import type { Dish, MenuItem, Product } from '../domain/types'
import { portionText } from './itemName'

const dish = (id: string, grams: number[]) => ({ id, name: id, ingredients: grams.map((g, i) => ({ foodId: `0100${i}`, grams: g })) }) as unknown as Dish
const catalog: Catalog = {
  foods: new Map(),
  dishes: new Map([dish('gohan', [150]), dish('yakizake', [80]), dish('misoshiru', [150, 30, 12])].map((d) => [d.id, d])),
  products: new Map([['490', { jan: '490', name: 'おにぎり', basis: 'serving' } as Product]]),
  myDishes: new Map(),
}
const item = (refId: string, portion: number, more: Partial<MenuItem> = {}) => ({ kind: 'dish', refId, portion, ...more }) as MenuItem

describe('献立の例のページで、料理の名前のあとに書く量', () => {
  it('材料が1つの料理は、重さを書き添える（ごはん150g×1.1 → 約165g）', () => {
    expect(portionText(item('gohan', 1.1), catalog)).toBe('×1.1（約165g）')
    expect(portionText(item('gohan', 0.8), catalog)).toBe('×0.8（約120g）')
  })

  it('100g 以上は5gきざみ、100g より少ないときは1gきざみ', () => {
    expect(portionText(item('gohan', 1.3), catalog)).toBe('×1.3（約195g）')
    expect(portionText(item('gohan', 0.9), catalog)).toBe('×0.9（約135g）')
    expect(portionText(item('yakizake', 1.2), catalog)).toBe('×1.2（約96g）')
    expect(portionText(item('yakizake', 1.4), catalog)).toBe('×1.4（約110g）')
  })

  it('材料がいくつかある料理と、材料を変えた料理は、「×1.2人前」と書く', () => {
    expect(portionText(item('misoshiru', 1.2), catalog)).toBe('×1.2人前')
    expect(portionText(item('misoshiru', 0.5), catalog)).toBe('×0.5人前')
    expect(portionText(item('gohan', 1.1, { customIngredients: [{ foodId: '01088', grams: 200 }] }), catalog)).toBe('×1.1人前')
  })

  it('1人前ちょうどのときは、何も書かない', () => {
    expect(portionText(item('gohan', 1), catalog)).toBe('')
    expect(portionText(item('misoshiru', 1), catalog)).toBe('')
  })

  it('料理でないもの（食材・市販品）と、もうない料理は、アプリの画面と同じ', () => {
    expect(portionText({ kind: 'food', refId: '01088', portion: 150 } as MenuItem, catalog)).toBe('150g')
    expect(portionText({ kind: 'product', refId: '490', portion: 2 } as MenuItem, catalog)).toBe('×2')
    expect(portionText(item('gone', 1.1), catalog)).toBe('×1.1')
  })
})
