import { describe, expect, it } from 'vitest'
import type { Catalog } from '../domain/nutrition'
import { foodImage, menuItemImage, productImage } from './illustration'

describe('食材・市販品の絵', () => {
  it('よく選ぶ食材は1品ずつの絵、ほかは食品群の絵', () => {
    expect(foodImage({ id: '01026', group: '01' })).toBe('/illustrations/food/01026.svg')
    expect(foodImage({ id: '01088', group: '01' })).toBe('/illustrations/food-group/01.svg')
  })

  it('市販品はカテゴリの絵。知らないカテゴリは「その他」', () => {
    expect(productImage({ category: 'onigiri' })).toBe('/illustrations/product/onigiri.svg')
    expect(productImage({ category: 'unknown' })).toBe('/illustrations/product/other.svg')
  })

  it('献立の食材・サプリにも絵を出す', () => {
    // 値は架空
    const catalog = { dishes: new Map(), myDishes: new Map(), products: new Map(), foods: new Map([['07013', { id: '07013', group: '07' }]]) } as unknown as Catalog
    expect(menuItemImage({ uid: 'a', kind: 'food', refId: '07013', portion: 15 }, catalog)).toBe('/illustrations/food/07013.svg')
    expect(menuItemImage({ uid: 'b', kind: 'supplement', refId: 'x', portion: 1 }, catalog)).toBe('/illustrations/product/supplement.svg')
    expect(menuItemImage({ uid: 'c', kind: 'product', refId: 'none', portion: 1 }, catalog)).toBeUndefined()
  })
})
