import { describe, expect, it } from 'vitest'
import type { Catalog } from '../domain/nutrition'
import { NUTRIENT_KEYS, type Dish, type MyDish, type Nutrients, type Product, type Slot } from '../domain/types'
import { buildCards, productStore } from './pickerCards'

// テスト用の架空の料理（実データではない）
const n = (): Nutrients => Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, 0])) as Nutrients
const dish = (id: string, name: string): Dish =>
  ({ id, name, kana: name, category: 'main', suggestedSlots: ['breakfast', 'lunch', 'dinner'], illustration: '', ingredients: [], nutrients: n() }) as Dish
const my = (id: string, slots: Slot[] | undefined, updatedAt: string): MyDish => ({
  id,
  baseDishId: null,
  name: `アレンジ${id}`,
  ingredients: [],
  createdAt: updatedAt,
  updatedAt,
  slots,
})

const catalog: Catalog = {
  foods: new Map(),
  products: new Map(),
  dishes: new Map([['d1', dish('d1', 'ふつうの料理')]]),
  myDishes: new Map([
    ['m-breakfast', my('m-breakfast', ['breakfast'], '2026-01-01T00:00:00Z')],
    ['m-dinner', my('m-dinner', ['dinner'], '2026-01-02T00:00:00Z')],
    ['m-old', my('m-old', undefined, '2026-01-03T00:00:00Z')],
  ]),
}
const keys = (tab: 'all' | 'dish' | 'myDish', slot: Slot) =>
  buildCards(tab, { catalog, slot, query: '', category: 'all', showAlcohol: true, favorites: new Set() }).map((c) => c.key)

describe('カスタマイズした料理の並び', () => {
  it('その区分で保存した料理だけを上に出し、ほかの区分のものは後ろに回す', () => {
    expect(keys('dish', 'breakfast')).toEqual(['myDish:m-old', 'myDish:m-breakfast', 'dish:d1', 'myDish:m-dinner'])
    expect(keys('dish', 'dinner')).toEqual(['myDish:m-old', 'myDish:m-dinner', 'dish:d1', 'myDish:m-breakfast'])
  })
  it('「すべて」「お気に入り」タブでも、その区分のものが先頭', () => {
    expect(keys('all', 'breakfast').slice(0, 2)).toEqual(['myDish:m-old', 'myDish:m-breakfast'])
    expect(keys('myDish', 'dinner')).toEqual(['myDish:m-old', 'myDish:m-dinner', 'myDish:m-breakfast'])
  })
})

describe('市販品のお店ごとの絞り込み', () => {
  // テスト用の架空の商品
  const product = (jan: string, source: Product['source']): Product => ({ jan, name: `商品${jan}`, brand: '', category: 'snack', basis: 'serving', nutrients: n(), source })
  const products = [
    product('seven-1', { name: 'セブン-イレブン', url: 'https://example.com/s', fetchedAt: '2026-10-11' }),
    product('lawson-1', { name: 'ローソン', url: 'https://example.com/l', fetchedAt: '2026-10-11' }),
    product('4900000000001', { name: 'テスト製菓', url: 'https://example.com/m', fetchedAt: '2026-10-11' }),
    product('4900000000002', { name: 'Open Food Facts', fetchedAt: '2026-10-10' }),
  ]
  const c: Catalog = { ...catalog, products: new Map(products.map((p) => [p.jan, p])) }
  const pick = (category: string) =>
    buildCards('product', { catalog: c, slot: 'lunch', query: '', category, showAlcohol: true, favorites: new Set() }).map((x) => x.item.refId)
  it('出どころを見分ける', () => {
    expect(products.map(productStore)).toEqual(['seven', 'lawson', 'maker', null])
  })
  it('お店・メーカー品で絞り込む', () => {
    expect(pick('store:seven')).toEqual(['seven-1'])
    expect(pick('store:maker')).toEqual(['4900000000001'])
  })
})
