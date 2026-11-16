import { describe, expect, it } from 'vitest'
import type { Catalog } from '../domain/nutrition'
import { NAMED_FOOD_IDS } from '../domain/ranking'
import { NUTRIENT_KEYS, type Dish, type Food, type MyDish, type Nutrients, type Product } from '../domain/types'
import { foodCard, lookupIndex, searchLookup } from './lookupCards'

// テスト用の架空の食材・料理・商品（値は実データではない）
const n = (over: Partial<Nutrients> = {}): Nutrients => ({ ...(Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, 0])) as Nutrients), ...over })
const food = (id: string, name: string, displayName: string, kana: string, group = '11'): Food => ({ id, name, displayName, kana, group, per100g: n({ energyKcal: 200 }) })
const dish = (id: string, name: string, kana: string, over: Partial<Dish> = {}): Dish =>
  ({ id, name, kana, category: 'main', suggestedSlots: ['dinner'], illustration: '', ingredients: [], nutrients: n({ energyKcal: 300 }), ...over }) as Dish
const product = (jan: string, name: string, over: Partial<Product> = {}): Product => ({
  jan,
  name,
  brand: 'テスト食品',
  category: 'side',
  basis: 'serving',
  nutrients: n({ energyKcal: 100 }),
  source: { name: 'テスト食品', url: 'https://example.com/p', fetchedAt: '2026-11-01' },
  ...over,
})

// ふだんの呼び名のある食材の番号（data/food-names.json）を1つ借りる
const NAMED = [...NAMED_FOOD_IDS][0]

const catalog = (over: Partial<Catalog> = {}): Catalog => ({
  foods: new Map(
    [
      // 成分表の細かい分け方の食材（名前は「肉」と完全一致する語を持つ）
      food('90001', 'いのしし　肉　脂身つき　生', 'いのしし 肉 脂身つき 生', 'いのしし/にく'),
      // 料理の材料に使っている食材
      food('90002', 'ぶた　ひき肉　生', 'ぶた ひき肉 生', 'ぶた/ひきにく'),
      // ふだんの呼び名のある食材（「肉」は語の途中）
      food(NAMED, 'にわとり　むね　皮なし　生', '鶏むね肉', 'にわとり/とりむねにく'),
      food('90003', 'カレー粉', 'カレー粉', 'かれーこ', '17'),
    ].map((f) => [f.id, f]),
  ),
  dishes: new Map(
    [
      dish('d-nikujaga', '肉じゃが', 'にくじゃが', { ingredients: [{ foodId: '90002', grams: 50 }] }),
      dish('d-curry', 'カレーライス', 'かれーらいす'),
      dish('d-miso', 'みそ汁', 'みそしる', { category: 'soup' }),
      dish('d-beer', 'ビール', 'びーる', { category: 'alcohol' }),
    ].map((d) => [d.id, d]),
  ),
  products: new Map([product('seven-1', 'カレーパン'), product('my-1', 'いつものカレー', { source: { name: 'ユーザー登録', fetchedAt: '2026-11-01' } }), product('4900000000001', 'ビール 350ml', { category: 'alcohol' })].map((p) => [p.jan, p])),
  myDishes: new Map(),
  ...over,
})

const search = (query: string, c = catalog(), showAlcohol = true) => searchLookup(lookupIndex({ catalog: c, showAlcohol }), query)
const names = (query: string, kind: string, c?: Catalog) => search(query, c).find((s) => s.kind === kind)?.cards.map((x) => x.name)

describe('食品を名前でさがす', () => {
  it('何も入れていなければ候補を出さない', () => {
    expect(search('')).toEqual([])
    expect(search('　')).toEqual([])
  })

  it('食材は、ふだんの呼び名のあるもの → 料理に使うもの → そのほか の順。短い言葉でも途中の一致を出す', () => {
    expect(names('肉', 'food')).toEqual(['鶏むね肉', 'ぶた ひき肉 生', 'いのしし 肉 脂身つき 生'])
    // ひらがなでも同じ
    expect(names('にく', 'food')).toEqual(['鶏むね肉', 'ぶた ひき肉 生', 'いのしし 肉 脂身つき 生'])
  })

  it('種類は 食材 → 料理 → 市販品 の順で、一致したものがある種類だけ', () => {
    expect(search('カレー').map((s) => s.kind)).toEqual(['food', 'dish', 'product'])
    expect(search('みそしる').map((s) => s.kind)).toEqual(['dish'])
  })

  it('食材には途中の一致しかなく、料理は語の先頭から一致するときは、料理を先にする', () => {
    // 食材は「…ひきにく」「…むねにく」「いのしし/にく」… → 「にくじ」は料理（にくじゃが）だけが先頭から一致
    const c = catalog()
    c.foods.set('90004', food('90004', 'ぎゅうにくじる', 'ぎゅうにくじる', 'ぎゅうにくじる'))
    expect(search('にくじ', c).map((s) => s.kind)).toEqual(['dish', 'food'])
    // どちらも先頭から一致するなら、食材が先
    expect(search('カレー', c).map((s) => s.kind)[0]).toBe('food')
  })

  it('自分で登録した市販品を先に並べる', () => {
    expect(names('カレー', 'product')).toEqual(['いつものカレー', 'カレーパン'])
  })

  it('お気に入り（アレンジして保存した料理）は、料理の先頭に出す', () => {
    const my: MyDish = { id: 'm1', baseDishId: 'd-curry', name: 'カレーライス（ごはん少なめ）', ingredients: [], createdAt: '2026-11-01T00:00:00Z' }
    expect(names('カレー', 'dish', catalog({ myDishes: new Map([[my.id, my]]) }))).toEqual(['カレーライス（ごはん少なめ）', 'カレーライス'])
  })

  it('20歳未満には、お酒の料理・商品を出さない', () => {
    expect(search('ビール').map((s) => s.kind)).toEqual(['dish', 'product'])
    expect(search('ビール', catalog(), false)).toEqual([])
  })
})

describe('食材のカード', () => {
  it('ランキングと同じ「1回に食べる量」で、量とカロリーを出す', () => {
    // 肉（食品群11）は1回 80g
    const card = foodCard(food('90010', 'ぶた　ロース　脂身つき　生', '豚ロース', 'ぶた/ろーす'))
    expect(card.item).toEqual({ kind: 'food', refId: '90010', portion: 80 })
    expect(card.sub).toBe('1食分（80g）')
    expect(card.kcal).toBe(160)
  })
  it('カロリーが未測定の食材は、カロリーを出さない（0 にしない）', () => {
    const f = food('90011', 'なにか', 'なにか', 'なにか')
    f.per100g.energyKcal = null
    expect(foodCard(f).kcal).toBeNull()
  })
})
