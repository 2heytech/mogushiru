import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Catalog } from '../domain/nutrition'
import { NAMED_FOOD_IDS } from '../domain/ranking'
import { NUTRIENT_KEYS, type Dish, type Food, type MyDish, type Nutrients, type Product } from '../domain/types'
import { browseLookup, foodCard, lookupCard, lookupFacets, lookupIndex, searchLookup, sortHits, STAPLE_FOOD_IDS } from './lookupCards'

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

const result = (query: string, c = catalog(), showAlcohol = true) => searchLookup(lookupIndex({ catalog: c, showAlcohol }), query)
const search = (query: string, c?: Catalog, showAlcohol = true) => result(query, c, showAlcohol).sections
const names = (query: string, kind: string, c?: Catalog) => search(query, c).find((s) => s.kind === kind)?.hits.map((x) => x.card.name)

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

describe('さがしやすくする工夫', () => {
  // ふだんの呼び名のある食材の番号を、もう1つ借りる
  const NAMED2 = [...NAMED_FOOD_IDS][1]
  const more = () => {
    const c = catalog()
    for (const f of [
      // 読みがなの途中にだけ「つな」が入っている（名前には入っていない）
      food(NAMED2, 'こまつな　葉　生', '小松菜', 'こまつな', '06'),
      food('90020', 'まぐろ　缶詰　水煮', 'ツナ缶（水煮）', 'つなかん', '10'),
      food('90021', 'さば　缶詰　水煮', 'さば 缶詰 水煮', 'さば/かんづめ/みずに', '10'),
      food('90022', 'こめ　水稲めし　精白米', 'ごはん（白米）', 'はくまい', '01'),
      food('90023', '米みそ　淡色辛みそ', 'みそ', 'こめみそ', '17'),
    ])
      c.foods.set(f.id, f)
    c.dishes.set('d-motsu', dish('d-motsu', 'もつ鍋', 'もつなべ'))
    c.dishes.set('d-tuna', dish('d-tuna', 'ツナサラダ', 'つなさらだ', { category: 'side' }))
    c.products.set('lawson-1', product('lawson-1', 'レトルト ビーフカレー 中辛', { nutrients: n({ energyKcal: 180, protein: 9 }) }))
    c.products.set('seven-2', product('seven-2', 'カレーうどん', { nutrients: n({ energyKcal: 420, protein: 14 }) }))
    return c
  }

  it('カタカナ・漢字で入れた短い言葉は、先頭からの一致があれば、読みがなの途中だけの一致を出さない', () => {
    expect(names('ツナ', 'food', more())).toEqual(['ツナ缶（水煮）'])
    expect(names('ツナ', 'dish', more())).toEqual(['ツナサラダ'])
    // ひらがなで入れたとき（かな漢字変換の途中など）は出すが、名前や語の先頭に一致するものより後ろ
    expect(names('つな', 'dish', more())).toEqual(['ツナサラダ', 'もつ鍋'])
  })

  it('空白で区切った言葉は、すべてに一致するものだけ（順番はどちらでも）', () => {
    expect(names('カレー レトルト', 'product', more())).toEqual(['レトルト ビーフカレー 中辛'])
    expect(search('カレー　ほげ', more())).toEqual([])
  })

  it('ふだんの言い方は、データの名前に読みかえてさがす（お米 → ごはん）。かっこの前の名前と同じなら先に出す', () => {
    expect(names('米', 'food', more())).toEqual(['ごはん（白米）', 'みそ'])
    expect(names('お米', 'food', more())).toEqual(['ごはん（白米）'])
  })

  it('そのままでは見つからないときは、言葉を2つに分けて両方に一致するものをさがす', () => {
    const r = result('さば缶', more())
    expect(r.split).toEqual(['さば', '缶'])
    expect(r.sections.map((s) => [s.kind, s.hits.map((h) => h.card.name)])).toEqual([['food', ['さば 缶詰 水煮']]])
    // そのまま見つかるときは分けない
    expect(result('カレー', more()).split).toBeNull()
    expect(result('ほげほげ', more())).toEqual({ sections: [], split: null })
  })

  it('候補には、種類の中の分け方（食品群・料理の種類・店）が付く', () => {
    const facets = (query: string, kind: string) => search(query, more()).find((s) => s.kind === kind)?.hits.map((h) => h.facet)
    expect(facets('ツナ', 'food')).toEqual(['10'])
    expect(facets('ツナ', 'dish')).toEqual(['side'])
    // 店の公式サイトから取った商品は店、自分で登録した商品は my
    expect(facets('カレー', 'product')).toEqual(['my', 'seven', 'seven', 'lawson'])
  })

  it('種類からさがす：その分け方のものを、名前を入れなくても全部出す', () => {
    const index = lookupIndex({ catalog: more(), showAlcohol: true })
    expect(browseLookup(index, 'food', '10').map((h) => h.card.name)).toEqual(['ツナ缶（水煮）', 'さば 缶詰 水煮'])
    expect(browseLookup(index, 'dish', 'soup').map((h) => h.card.name)).toEqual(['みそ汁'])
    expect(browseLookup(index, 'product', 'lawson').map((h) => h.card.name)).toEqual(['レトルト ビーフカレー 中辛'])
    expect(browseLookup(index, 'food', '99')).toEqual([])
  })

  it('20歳未満には、種類の一覧に「お酒」を出さない', () => {
    expect(lookupFacets('dish', { showAlcohol: true, home: true }).map((f) => f.id)).toContain('alcohol')
    expect(lookupFacets('dish', { showAlcohol: false, home: true }).map((f) => f.id)).not.toContain('alcohol')
    // 食材は食品群18、市販品は店・メーカー
    expect(lookupFacets('food', { showAlcohol: true, home: true })).toHaveLength(18)
    expect(lookupFacets('product', { showAlcohol: true, home: true }).map((f) => f.label)).toEqual(['セブン-イレブン', 'ファミリーマート', 'ローソン', 'トップバリュ', 'メーカー品'])
  })

  it('並べかえ：カロリーが低い順・たんぱく質が多い順。値のないものは後ろ', () => {
    const c = more()
    c.products.set('famima-1', product('famima-1', 'カレーまん', { nutrients: { ...n(), energyKcal: null, protein: null } }))
    const hits = search('カレー', c).find((s) => s.kind === 'product')!.hits
    const protein = (card: { item: { refId: string } }) => c.products.get(card.item.refId)!.nutrients.protein
    expect(sortHits(hits, 'default', protein)).toBe(hits)
    expect(sortHits(hits, 'kcalAsc', protein).map((h) => h.card.name)).toEqual(['いつものカレー', 'カレーパン', 'レトルト ビーフカレー 中辛', 'カレーうどん', 'カレーまん'])
    expect(sortHits(hits, 'proteinDesc', protein).map((h) => h.card.name)).toEqual(['カレーうどん', 'レトルト ビーフカレー 中辛', 'いつものカレー', 'カレーパン', 'カレーまん'])
  })

  it('最近見た食品は、種類と番号からカードにもどす（なくなったものは出さない）', () => {
    const c = more()
    expect(lookupCard({ kind: 'food', refId: '90020' }, c)?.name).toBe('ツナ缶（水煮）')
    expect(lookupCard({ kind: 'dish', refId: 'd-curry' }, c)?.name).toBe('カレーライス')
    expect(lookupCard({ kind: 'product', refId: 'seven-1' }, c)?.name).toBe('カレーパン')
    expect(lookupCard({ kind: 'product', refId: 'gone' }, c)).toBeNull()
    expect(lookupCard({ kind: 'myDish', refId: 'gone' }, c)).toBeNull()
  })

  it('定番の食品は、配信用のデータ（public/data/foods.json）にある食材', () => {
    const foods = (JSON.parse(readFileSync(new URL('../../public/data/foods.json', import.meta.url), 'utf8')) as { foods: Food[] }).foods
    const byId = new Map(foods.map((f) => [f.id, f]))
    expect(STAPLE_FOOD_IDS.map((id) => byId.get(id)?.displayName)).toEqual([
      'ごはん（白米）',
      '食パン',
      '卵（生）',
      '納豆',
      '牛乳',
      'ヨーグルト（無糖）',
      'バナナ',
      '鶏むね肉（皮なし）',
      '鮭（生）',
      '木綿豆腐',
      'ブロッコリー',
      'さつまいも',
    ])
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
