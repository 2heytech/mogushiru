import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Catalog } from '../domain/nutrition'
import { MORE_NAMED_FOOD_IDS, NAMED_FOOD_IDS } from '../domain/ranking'
import { NUTRIENT_KEYS, type Dish, type Food, type MyDish, type Nutrients, type Product } from '../domain/types'
import { browseLookup, comparePicks, dishIngredientsText, foodCard, foodLookupGroups, lookupCard, lookupDishCard, lookupFacets, lookupIndex, searchFoods, searchLookup, sortHits, STAPLE_FOOD_IDS } from './lookupCards'

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
    // 同じ名前の料理と見分けられるように、食材だけの値であることを書く
    expect(card.sub).toBe('食材のみ・1食分（80g）')
    expect(card.kcal).toBe(160)
  })
  it('カロリーが未測定の食材は、カロリーを出さない（0 にしない）', () => {
    const f = food('90011', 'なにか', 'なにか', 'なにか')
    f.per100g.energyKcal = null
    expect(foodCard(f).kcal).toBeNull()
  })
})

describe('食材と料理の見分け', () => {
  // 架空の「納豆」（食材）と「納豆（1パック）」（料理：納豆としょうゆ）
  const c = () => {
    const base = catalog()
    base.foods.set('90030', food('90030', 'だいず　糸引き納豆', '納豆', 'なっとう', '04'))
    base.foods.set('90031', food('90031', 'こいくちしょうゆ', 'しょうゆ（濃口）', 'しょうゆ', '17'))
    base.dishes.set(
      'd-natto',
      dish('d-natto', '納豆（1パック）', 'なっとう', {
        ingredients: [
          { foodId: '90030', grams: 45 },
          { foodId: '90031', grams: 3 },
        ],
      }),
    )
    return base
  }

  it('材料が3つまでの料理は、何がどれだけ入っているかを書く', () => {
    const cat = c()
    const natto = cat.dishes.get('d-natto')!
    expect(dishIngredientsText(natto, cat)).toBe('納豆45g＋しょうゆ（濃口）3g')
    expect(lookupDishCard(natto, cat).sub).toBe('納豆45g＋しょうゆ（濃口）3g・主菜')
  })

  it('さがした結果で、食材は「食材のみ」、料理は材料が分かる', () => {
    const sections = search('納豆', c())
    const sub = (kind: string) => sections.find((s) => s.kind === kind)?.hits.map((x) => x.card.sub)
    expect(sub('food')).toEqual(['食材のみ・1パック（45g）'])
    expect(sub('dish')).toEqual(['納豆45g＋しょうゆ（濃口）3g・主菜'])
  })

  it('半端なグラム数は、小数1けたで書く', () => {
    const cat = c()
    const d = dish('d-half', 'しょうゆ少し', 'しょうゆすこし', { ingredients: [{ foodId: '90031', grams: 2.5 }] })
    expect(dishIngredientsText(d, cat)).toBe('しょうゆ（濃口）2.5g')
  })

  it('材料が4つ以上の料理・材料が分からない料理は、料理の種類だけ', () => {
    const cat = c()
    const many = dish('d-many', '具だくさん', 'ぐだくさん', {
      ingredients: ['90001', '90002', '90003', '90030'].map((foodId) => ({ foodId, grams: 10 })),
    })
    expect(dishIngredientsText(many, cat)).toBeNull()
    expect(lookupDishCard(many, cat).sub).toBe('主菜')
    // 材料のない料理（既製品の値をそのまま持つもの）
    expect(dishIngredientsText(cat.dishes.get('d-curry')!, cat)).toBeNull()
    // カタログにない食材を含む
    const unknown = dish('d-unknown', 'なぞの小鉢', 'なぞのこばち', { ingredients: [{ foodId: 'none', grams: 10 }] })
    expect(dishIngredientsText(unknown, cat)).toBeNull()
  })
})

describe('書き方のゆれ', () => {
  it('「鶏胸肉」「とりむね肉」「鳥むね肉」で、鶏むね肉が出る', () => {
    for (const q of ['鶏胸肉', 'とりむね肉', '鳥むね肉', 'とりむねにく', '鶏むね']) expect(names(q, 'food'), q).toContain('鶏むね肉')
  })
})

describe('食材を、漢字・ひらがな・カタカナでさがす', () => {
  // 名前でさがす人のいる食材（鹿肉・馬肉 など）の番号を1つ借りる
  const MORE = [...MORE_NAMED_FOOD_IDS][0]
  const NAMED2 = [...NAMED_FOOD_IDS][1]
  const NAMED3 = [...NAMED_FOOD_IDS][2]
  const game = () => {
    const c = catalog()
    for (const f of [
      // ふだんの呼び名のある食材。読みがなの途中にだけ「しか」が入っている（脱脂加糖）
      food(NAMED2, 'ヨーグルト　脱脂加糖', 'ヨーグルト（加糖）', 'よーぐると/だっしかとう', '13'),
      // 別名に「馬鈴薯」がある
      food(NAMED3, 'じゃがいも　塊茎　皮なし　生', 'じゃがいも', 'かいけい/かわなし/なま/馬鈴薯/ばれいしょ', '02'),
      food(MORE, '＜畜肉類＞　しか　にほんじか　赤肉　生', '鹿肉（にほんじか・赤身）', 'しか/にほんじか/あかにく/なま/鹿肉/鹿/しかにく'),
      food('90030', '＜畜肉類＞　うま　肉　赤肉　生', 'うま 肉 赤肉 生', 'うま/にく/あかにく/なま/馬肉/馬/ばにく'),
      food('90031', '＜畜肉類＞　うし　［和牛肉］　もも　赤肉　生', 'うし 和牛肉 もも 赤肉 生', 'うし/わぎゅうにく/もも/牛肉/ぎゅうにく'),
    ])
      c.foods.set(f.id, f)
    return c
  }

  it('鹿肉・しか・シカ・鹿 のどれでも、鹿肉が先頭', () => {
    for (const q of ['鹿肉', 'しか', 'シカ', '鹿', 'しかにく', 'シカ肉']) expect(names(q, 'food', game())?.[0], q).toBe('鹿肉（にほんじか・赤身）')
  })

  it('読みがなの途中にだけ入っているものは、ふだんの呼び名のある食材でも後ろ（「しか」で、脱脂加糖のヨーグルト）', () => {
    expect(names('しか', 'food', game())).toEqual(['鹿肉（にほんじか・赤身）', 'ヨーグルト（加糖）'])
    // カタカナ・漢字で入れたときは、出さない
    expect(names('シカ', 'food', game())).toEqual(['鹿肉（にほんじか・赤身）'])
  })

  it('短い言葉を漢字で入れたときは、名前にその字のあるものが先（「馬」で、別名が馬鈴薯のじゃがいもより馬肉）', () => {
    expect(names('馬', 'food', game())).toEqual(['うま 肉 赤肉 生', 'じゃがいも'])
    // 別名とぴったり同じもの（「牛肉」）は、名前に入っているものと同じに扱う
    expect(names('牛肉', 'food', game())).toEqual(['うし 和牛肉 もも 赤肉 生'])
  })

  it('呼び名を付けた食材は、ふだんよく使うもの → 名前でさがす人のいるもの（鹿肉など）→ そのほか の順', () => {
    expect(names('にく', 'food', game())).toEqual(['鶏むね肉', '鹿肉（にほんじか・赤身）', 'ぶた ひき肉 生', 'いのしし 肉 脂身つき 生', 'うま 肉 赤肉 生', 'うし 和牛肉 もも 赤肉 生'])
  })

  it('「カロリー」「栄養」を付けて入れても、食材が見つかる', () => {
    expect(names('鹿肉 カロリー', 'food', game())).toEqual(['鹿肉（にほんじか・赤身）'])
    expect(names('鹿肉の栄養', 'food', game())).toEqual(['鹿肉（にほんじか・赤身）'])
    expect(names('鹿肉カロリー', 'food', game())).toEqual(['鹿肉（にほんじか・赤身）'])
  })

  it('2つの言葉の両方に一致するものがなければ、どちらかに一致するものを、入れた順に出す（鹿肉 牛肉）', () => {
    const r = result('鹿肉 牛肉', game())
    expect(r.either).toEqual(['鹿肉', '牛肉'])
    expect(r.sections.map((s) => [s.kind, s.hits.map((h) => h.card.name)])).toEqual([['food', ['鹿肉（にほんじか・赤身）', 'うし 和牛肉 もも 赤肉 生']]])
    // 見つからない言葉がまじっているときは、出さない。両方に一致するものがあるときは、ふつうにさがす
    expect(result('鹿肉 ほげ', game())).toEqual({ sections: [], split: null })
    expect(result('うし もも', game()).either).toBeUndefined()
  })

  it('食材だけをさがす（食材をくらべる窓の「食材を足す」）', () => {
    const groups = foodLookupGroups(game())
    expect(searchFoods(groups, 'しか').map((c) => c.name)).toEqual(['鹿肉（にほんじか・赤身）', 'ヨーグルト（加糖）'])
    // 料理・市販品は出さない
    expect(searchFoods(groups, 'カレー').map((c) => c.name)).toEqual(['カレー粉'])
    expect(searchFoods(groups, '鹿肉の栄養').map((c) => c.name)).toEqual(['鹿肉（にほんじか・赤身）'])
    expect(searchFoods(groups, '')).toEqual([])
    expect(searchFoods(groups, 'ほげほげ')).toEqual([])
  })

  describe('配信用のデータ（public/data/foods.json）で', () => {
    const foods = (JSON.parse(readFileSync(new URL('../../public/data/foods.json', import.meta.url), 'utf8')) as { foods: Food[] }).foods
    const real: Catalog = { foods: new Map(foods.map((f) => [f.id, f])), dishes: new Map(), products: new Map(), myDishes: new Map() }
    const groups = foodLookupGroups(real)
    const first = (q: string) => searchFoods(groups, q)[0]?.name

    it.each([
      ['鹿肉', '鹿肉（にほんじか・赤身）'],
      ['しか', '鹿肉（にほんじか・赤身）'],
      ['シカ', '鹿肉（にほんじか・赤身）'],
      ['鹿', '鹿肉（にほんじか・赤身）'],
      ['ジビエ', '鹿肉（にほんじか・赤身）'],
      ['馬肉', '馬肉（赤身）'],
      ['馬', '馬肉（赤身）'],
      ['ばにく', '馬肉（赤身）'],
      ['猪', 'いのしし肉（脂身つき）'],
      ['羊', 'ラム肉（ロース）'],
      ['鯨', 'くじら肉（赤身）'],
      ['ハラミ', '牛ハラミ（生）'],
      ['牛肉', '牛ひき肉'],
      ['ぎゅうにく', '牛ひき肉'],
    ])('「%s」の先頭は %s', (q, name) => {
      expect(first(q)).toBe(name)
    })

    it('「牛肉」で、鹿肉（きゅうしゅうじか）は出ない', () => {
      expect(searchFoods(groups, '牛肉').some((c) => c.name.startsWith('鹿肉'))).toBe(false)
      expect(searchFoods(groups, 'ぎゅうにく').some((c) => c.name.startsWith('鹿肉'))).toBe(false)
    })

    it('食材の名前を2つ入れたとき（鹿肉 牛肉）に並べる食材：1つめは先頭の食材、2つめは、その言葉で見つかる中で1つめに近いもの', () => {
      const picks = (words: string[]) => comparePicks(groups, words, real).map((id) => real.foods.get(id)?.displayName)
      // 牛肉の先頭は牛ひき肉だが、鹿肉の赤身とくらべるのは、牛ももの赤身
      expect(picks(['鹿肉', '牛肉'])).toEqual(['鹿肉（にほんじか・赤身）', '牛もも肉（輸入・赤身）'])
      expect(picks(['鹿肉', '牛肉', '豚肉'])).toEqual(['鹿肉（にほんじか・赤身）', '牛もも肉（輸入・赤身）', '豚もも肉（生）'])
      // 近い食材の中にないときは、その言葉の先頭の食材
      expect(picks(['鹿肉', '納豆'])).toEqual(['鹿肉（にほんじか・赤身）', '納豆'])
      // 見つからない言葉は数えない。2つ選べなければ空
      expect(picks(['鹿肉', 'ほげほげ'])).toEqual([])
      expect(picks(['ほげほげ', '牛肉'])).toEqual([])
    })

    it('名前でさがす人のいる食材（鹿肉など）は、配信用のデータにあり、ふだんの呼び名のある食材（成分ランキングに出す食材）とは重ならない', () => {
      for (const id of MORE_NAMED_FOOD_IDS) {
        expect(real.foods.has(id), id).toBe(true)
        expect(NAMED_FOOD_IDS.has(id), id).toBe(false)
      }
    })
  })
})
