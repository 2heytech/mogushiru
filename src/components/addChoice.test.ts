import { describe, expect, it } from 'vitest'
import type { Catalog } from '../domain/nutrition'
import type { Dish, Food } from '../domain/types'
import { addChoice } from './addChoice'

const natto = { id: '04046', name: 'だいず　［納豆類］　糸引き納豆', displayName: '納豆', group: '04', per100g: { energyKcal: 184, protein: 16.5, fat: 10, carb: 12.1 } } as unknown as Food
const dish = { id: 'natto-gohan', name: '納豆ごはん', category: 'staple', ingredients: [], nutrients: { energyKcal: 320.4 } } as unknown as Dish
const catalog: Catalog = { foods: new Map([[natto.id, natto]]), dishes: new Map([[dish.id, dish]]), products: new Map(), myDishes: new Map() }

describe('読みもののページの「1日の食事に入れる」から来たときに入れるもの', () => {
  it('料理は1人前を入れる', () => {
    const c = addChoice({ kind: 'dish', id: 'natto-gohan' }, catalog)!
    expect(c.item).toEqual({ kind: 'dish', refId: 'natto-gohan', portion: 1 })
    expect(c.lead).toBe('「納豆ごはん」（1人前 320 kcal）を、1日の食事に入れます。量や材料は、入れたあとで変えられます。')
  })

  it('食品（食材）は、1回の量を入れる（納豆なら1パック45g）', () => {
    const c = addChoice({ kind: 'food', id: '04046' }, catalog)!
    expect(c.item).toEqual({ kind: 'food', refId: '04046', portion: 45 })
    expect(c.lead).toBe('「納豆」1パック（45g・83 kcal）を、1日の食事に入れます。量は、入れたあとで変えられます。')
  })

  it('もうない料理・食品は、何も入れない', () => {
    expect(addChoice({ kind: 'dish', id: 'gone' }, catalog)).toBeNull()
    expect(addChoice({ kind: 'food', id: '99999' }, catalog)).toBeNull()
    // 食品番号と料理の id を取りちがえない
    expect(addChoice({ kind: 'dish', id: '04046' }, catalog)).toBeNull()
  })
})
