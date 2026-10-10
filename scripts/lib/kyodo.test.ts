import { describe, expect, it } from 'vitest'
import type { Food, Nutrients } from '../../src/domain/types'
import { buildRuleIndex, convertKyodo, guessCategory, type IngredientRule } from './kyodo'
import { normalizeName, parseMaffPage, parsePeople, parsePieces, parseQuantity, type MaffRecipe } from './maff'

describe('分量の読み取り', () => {
  it.each([
    ['大さじ3', { value: 3, unit: '大さじ' }],
    ['小さじ1／2', { value: 0.5, unit: '小さじ' }],
    ['大さじ1と1/2', { value: 1.5, unit: '大さじ' }],
    ['大さじ1・1/2', { value: 1.5, unit: '大さじ' }],
    ['２００ｇ', { value: 200, unit: 'g' }],
    ['1,500cc', { value: 1500, unit: 'ml' }],
    ['1.2kg', { value: 1200, unit: 'g' }],
    ['5～6本', { value: 5.5, unit: '本' }],
    ['2丁（600g）', { value: 600, unit: 'g' }],
    ['大2尾', { value: 2, unit: '尾' }],
    ['大3', { value: 3, unit: '大さじ' }],
    ['1升', { value: 10, unit: '合' }],
    ['2個', { value: 2, unit: '個' }],
    ['少々', { value: 1, unit: '少々' }],
  ])('%s', (raw, q) => expect(parseQuantity(raw)).toEqual(q))

  it('「適量」は読めない', () => {
    expect(parseQuantity('適量')).toBeNull()
    expect(parseQuantity('お好みで')).toBeNull()
  })

  it('人数・個数', () => {
    expect(parsePeople('4人分')).toBe(4)
    expect(parsePeople('4～6人分')).toBe(5)
    expect(parsePeople('作りやすい分量')).toBeNull()
    expect(parsePieces('12個分')).toEqual({ count: 12, unit: '個' })
  })

  it('材料名の見出し・括弧を外す', () => {
    expect(normalizeName('【A】 赤味噌')).toBe('赤味噌')
    expect(normalizeName('木綿豆腐（水切りする）')).toBe('木綿豆腐')
  })
})

describe('レシピページの読み取り', () => {
  it('料理名・人数・材料を取り出す', () => {
    const html = `<span class="pref">愛知県</span><span class="name">味噌煮込みうどん（みそにこみうどん）</span>
      <h2 class="tit05">材料（2人分）</h2><ul class="menu_material">
      <li><ul class="list"><li>ゆでうどん</li><li>2玉</li></ul></li>
      <li><ul class="list"><li>【A】 赤味噌</li><li>大さじ3</li></ul></li></ul>
      <h2>作り方</h2><p class="taR">レシピ提供元名 : 「例」</p>`
    expect(parseMaffPage(html, 'misonikomiudon_aichi')).toMatchObject({
      pref: '愛知県',
      name: '味噌煮込みうどん',
      kana: 'みそにこみうどん',
      servings: '2人分',
      ingredients: [
        ['ゆでうどん', '2玉'],
        ['【A】 赤味噌', '大さじ3'],
      ],
    })
  })
})

const nutrients = (energyKcal: number, protein: number, salt = 0) => ({ energyKcal, protein, salt }) as Nutrients
const food = (id: string, group: string, n: Nutrients): Food => ({ id, name: id, displayName: id, kana: '', group, per100g: n })
const foods = new Map(
  [
    food('01039', '01', nutrients(95, 2.6)), // ゆでうどん
    food('17046', '17', nutrients(207, 17, 10.9)), // 豆みそ
    food('12004', '12', nutrients(142, 12.2)), // 卵
    food('06226', '06', nutrients(35, 1.4)), // ねぎ
    food('17019', '17', nutrients(2, 0.3, 0.1)), // だし
  ].map((f) => [f.id, f]),
)
const rules: IngredientRule[] = [
  { names: ['ゆでうどん'], food: '01039', pieces: { 玉: 230 } },
  { names: ['赤味噌'], food: '17046', density: 1.2 },
  { names: ['卵'], food: '12004', pieces: { 個: 50 } },
  { names: ['ねぎ', '長ねぎ'], food: '06226', pieces: { 本: 100 } },
  { names: ['だし汁'], food: '17019', broth: true, density: 1 },
  { names: ['水'], skip: true },
  { names: ['どんぐり'], unknown: true },
]
const index = buildRuleIndex(rules)
const recipe = (over: Partial<MaffRecipe>): MaffRecipe => ({
  id: 'misonikomiudon_aichi',
  pref: '愛知県',
  name: '味噌煮込みうどん',
  kana: 'みそにこみうどん',
  servings: '2人分',
  ingredients: [],
  url: 'https://example.invalid/',
  ...over,
})

describe('郷土料理の換算', () => {
  it('材料をグラムに換算し、人数で割る', () => {
    const res = convertKyodo(
      recipe({
        ingredients: [
          ['ゆでうどん', '2玉'],
          ['だし汁', '500ml'],
          ['【A】 赤味噌', '大さじ3'],
          ['卵', '2個'],
          ['水', '100ml'],
          ['ねぎ', '適量'],
        ],
      }),
      index,
      foods,
    )
    if ('error' in res) throw new Error(res.error)
    expect(res.recipe).toMatchObject({ id: 'kyodo-misonikomiudon-aichi', category: 'noodle', kana: 'みそにこみうどん 愛知 愛知県' })
    expect(res.recipe.ingredients).toEqual([
      { foodId: '01039', grams: 230 },
      { foodId: '17019', grams: 250 },
      { foodId: '17046', grams: 27 },
      { foodId: '12004', grams: 50 },
    ])
    expect(res.recipe.source).toMatchObject({ region: '愛知県' })
  })

  it('だし汁は汁物・麺以外では数えない', () => {
    const res = convertKyodo(
      recipe({ name: 'ねぎの味噌煮', ingredients: [['ねぎ', '2本'], ['だし汁', '200ml'], ['赤味噌', '大さじ1']] }),
      index,
      foods,
    )
    if ('error' in res) throw new Error(res.error)
    expect(res.recipe.ingredients.map((i) => i.foodId)).toEqual(['06226', '17046'])
  })

  it('対応表にない材料・該当のない主な材料・読めない人数は取り込まない', () => {
    expect(convertKyodo(recipe({ ingredients: [['ほや', '2個']] }), index, foods)).toEqual({ error: '材料が対応表にない（ほや）' })
    expect(convertKyodo(recipe({ ingredients: [['どんぐり', '85個']] }), index, foods)).toEqual({ error: '成分表に該当がない（どんぐり）' })
    expect(convertKyodo(recipe({ servings: '作りやすい分量', ingredients: [['卵', '1個']] }), index, foods)).toHaveProperty('error')
  })

  it('「12個分」は1個を1人前にする', () => {
    const res = convertKyodo(recipe({ name: 'たまごまんじゅう', servings: '2個分', ingredients: [['卵', '4個']] }), index, foods)
    if ('error' in res) throw new Error(res.error)
    expect(res.recipe.category).toBe('snack')
    expect(res.recipe.ingredients).toEqual([{ foodId: '12004', grams: 100 }])
  })

  it('料理名から分類を推定する', () => {
    expect(guessCategory('いもの子汁')).toBe('soup')
    expect(guessCategory('きしめん')).toBe('noodle')
    expect(guessCategory('ばらずし')).toBe('staple')
    expect(guessCategory('ひなまんじゅう')).toBe('snack')
    expect(guessCategory('ぶり大根')).toBe('main')
  })
})
