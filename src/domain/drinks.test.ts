import { describe, expect, it } from 'vitest'
import type { Catalog } from './nutrition'
import { NUTRIENT_KEYS, type Dish, type MenuItem, type Nutrients, type Product } from './types'
import {
  canStepDown,
  drinkAmount,
  drinkAmountLabel,
  drinkCount,
  drinkCup,
  drinkSizeLabel,
  drinkSpec,
  findDrinkItem,
  nextCount,
  pickCup,
  prevCount,
  rememberDrink,
  RECENT_DRINKS_MAX,
} from './drinks'

// テスト用の架空のデータ（実データではない）
const n = (): Nutrients => Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, 0])) as Nutrients
const dish = (id: string, category: Dish['category'], grams: number): Dish =>
  ({ id, name: id, kana: id, category, suggestedSlots: ['dinner'], illustration: '', ingredients: [{ foodId: '00001', grams }], nutrients: n() }) as Dish
const product = (jan: string, p: Partial<Product>): Product => ({
  jan,
  name: `商品${jan}`,
  brand: '',
  category: 'drink',
  basis: '100ml',
  nutrients: n(),
  source: { name: 'テスト', fetchedAt: '2026-11-14' },
  ...p,
})
const catalog: Catalog = {
  foods: new Map(),
  myDishes: new Map([['m1', { id: 'm1', baseDishId: 'beer', name: 'アレンジ', ingredients: [], createdAt: '2026-11-14' }]]),
  dishes: new Map([
    ['beer', dish('beer', 'alcohol', 353)],
    ['drink-green-tea', dish('drink-green-tea', 'drink', 150)],
    ['sake', dish('sake', 'alcohol', 180)],
    ['new-drink', dish('new-drink', 'drink', 180)],
    ['curry', dish('curry', 'main', 300)],
  ]),
  products: new Map([
    ['can', product('can', { category: 'alcohol', servingGrams: 350 })],
    ['whisky', product('whisky', { category: 'alcohol', name: 'テストウイスキー 700ml' })],
    ['sour', product('sour', { category: 'alcohol', name: 'テストレモンサワー' })],
    ['tea', product('tea', {})],
    ['stick', product('stick', { basis: '100g', servingGrams: 9.7 })],
    ['cafe', product('cafe', { basis: 'serving' })],
    ['snack', product('snack', { category: 'snack', basis: '100g' })],
  ]),
}
const spec = (kind: MenuItem['kind'], refId: string) => drinkSpec({ kind, refId }, catalog)!

describe('飲み物の見分け方', () => {
  it('飲み物・お酒の料理と、mL や1本で数える市販品だけを飲み物にする', () => {
    expect(drinkSpec({ kind: 'dish', refId: 'beer' }, catalog)).not.toBeNull()
    expect(drinkSpec({ kind: 'dish', refId: 'curry' }, catalog)).toBeNull()
    expect(drinkSpec({ kind: 'product', refId: 'tea' }, catalog)).not.toBeNull()
    expect(drinkSpec({ kind: 'product', refId: 'cafe' }, catalog)).not.toBeNull()
    // 粉やスティックはグラムのまま
    expect(drinkSpec({ kind: 'product', refId: 'stick' }, catalog)).toBeNull()
    expect(drinkSpec({ kind: 'product', refId: 'snack' }, catalog)).toBeNull()
    expect(drinkSpec({ kind: 'food', refId: '00001' }, catalog)).toBeNull()
  })
  it('飲み物をアレンジして保存したものは、もとの飲み物と同じに数える', () => {
    expect(spec('myDish', 'm1').base).toEqual(spec('dish', 'beer').base)
  })
})

describe('杯数と1杯の量', () => {
  it('ビールは缶1本が1人前。ロング缶・中ジョッキ・中瓶もえらべる', () => {
    const s = spec('dish', 'beer')
    expect(s.short).toBe('ビール')
    expect(s.sizes.map(drinkSizeLabel)).toEqual(['缶 350mL', '中ジョッキ 約400mL', 'ロング缶 500mL', '中瓶 500mL'])
    expect(drinkCount({ portion: 2 }, s)).toBe(2)
    expect(drinkAmountLabel(drinkCup({}, s), 2)).toBe('缶2本')
  })
  it('1杯の量を変えても杯数はそのままで、量（人前）が変わる', () => {
    const s = spec('dish', 'beer')
    const long = s.sizes.find((x) => x.label === 'ロング缶')!
    const a = drinkAmount(s, 2, long)
    expect(a.cup).toEqual(long)
    expect(a.portion).toBeCloseTo((2 * 500) / 350, 3)
    expect(drinkCount(a, s)).toBeCloseTo(2, 3)
    expect(drinkAmountLabel(drinkCup(a, s), drinkCount(a, s))).toBe('ロング缶2本')
    // 1人前の量にもどすと cup は持たない
    expect(drinkAmount(s, 3, s.base)).toEqual({ portion: 3, cup: undefined })
  })
  it('料理の量に合わせて、同じ量の呼び名を置きかえる（緑茶は湯のみ）', () => {
    const s = spec('dish', 'drink-green-tea')
    expect(s.sizes.map((x) => x.label)).toEqual(['湯のみ', 'コップ', 'マグカップ', '缶', 'ペットボトル'])
  })
  it('日本酒は合で数え、量はえらばない', () => {
    const s = spec('dish', 'sake')
    expect(s.sizes).toEqual([])
    expect(drinkAmountLabel(s.base, 2)).toBe('2合')
  })
  it('表にない飲み物は、材料の量を1杯にして杯数だけ数える', () => {
    const s = spec('dish', 'new-drink')
    expect(s.base).toEqual({ label: '', ml: 180, unit: '杯' })
    expect(s.sizes).toEqual([])
  })
  it('100mL 基準の市販品は mL で持ち、1本の量が分かればそれを1本にする', () => {
    const s = spec('product', 'can')
    expect(s.per).toBe('ml')
    expect(s.base).toEqual({ label: '', ml: 350, unit: '本' })
    expect(drinkCount({ portion: 700 }, s)).toBe(2)
    expect(drinkAmount(s, 3)).toEqual({ portion: 1050, cup: undefined })
    // 缶のお酒は缶・ジョッキ・瓶から。同じ量の「缶」は1本の量と重なるので出さない
    expect(s.sizes.map(drinkSizeLabel)).toEqual(['1本 350mL', '中ジョッキ 約400mL', 'ロング缶 500mL', '中瓶 500mL'])
  })
  it('缶でない市販のお酒は、シングル・グラス・合などから', () => {
    const s = spec('product', 'whisky')
    expect(s.base.label).toBe('グラス')
    expect(s.sizes.map(drinkSizeLabel)).toEqual(['シングル 30mL', 'ダブル 60mL', 'グラス 120mL', '1合 180mL'])
    // 名前で缶のお酒と分かるもの
    expect(spec('product', 'sour').base.label).toBe('缶')
  })
  it('1本の量が分からない飲み物はコップ1杯で数える', () => {
    const s = spec('product', 'tea')
    expect(s.base.label).toBe('コップ')
    expect(drinkAmount(s, 2)).toEqual({ portion: 400, cup: undefined })
  })
  it('1食分の市販品（コーヒーの S・M など）は個数で数える', () => {
    const s = spec('product', 'cafe')
    expect(drinkCount({ portion: 2 }, s)).toBe(2)
    expect(drinkAmount(s, 3)).toEqual({ portion: 3, cup: undefined })
  })
  it('前と同じ1杯の量を使う（いまはえらべない量なら1人前の量）', () => {
    const s = spec('dish', 'beer')
    const long = s.sizes.find((x) => x.label === 'ロング缶')!
    expect(pickCup(s, long)).toEqual(long)
    expect(pickCup(s, { label: 'バケツ', ml: 5000, unit: '杯' })).toEqual(s.base)
    expect(pickCup(s)).toEqual(s.base)
  })
})

describe('＋1杯・−1杯', () => {
  it('半端な杯数は、きりのいい数にそろえる', () => {
    expect(nextCount(1)).toBe(2)
    expect(nextCount(1.4)).toBe(2)
    expect(prevCount(3)).toBe(2)
    expect(prevCount(2.5)).toBe(2)
    expect(prevCount(1.5)).toBe(1)
  })
  it('1杯より下には減らさない（外すのは×で）', () => {
    expect(canStepDown(1)).toBe(false)
    expect(canStepDown(1.0000001)).toBe(false)
    expect(canStepDown(1.5)).toBe(true)
    expect(prevCount(1)).toBe(1)
  })
})

describe('最近の飲み物', () => {
  it('新しいものを先頭に、同じものは1つにまとめ、前の量は新しい量で上書きする', () => {
    const cup = { label: 'ロング缶', ml: 500, unit: '本' }
    let list = rememberDrink([], 'dish:beer')
    list = rememberDrink(list, 'dish:drink-green-tea')
    list = rememberDrink(list, 'dish:beer', cup)
    expect(list).toEqual([{ key: 'dish:beer', cup }, { key: 'dish:drink-green-tea' }])
  })
  it(`覚えるのは ${RECENT_DRINKS_MAX} 件まで`, () => {
    let list = rememberDrink([], 'dish:x0')
    for (let i = 1; i < 20; i++) list = rememberDrink(list, `dish:x${i}`)
    expect(list).toHaveLength(RECENT_DRINKS_MAX)
    expect(list[0].key).toBe('dish:x19')
  })
})

describe('同じ飲み物の項目', () => {
  const long = { label: 'ロング缶', ml: 500, unit: '本' }
  const items: MenuItem[] = [
    { uid: 'a', kind: 'dish', refId: 'beer', portion: 1, customIngredients: [] },
    { uid: 'b', kind: 'dish', refId: 'beer', portion: 1 },
    { uid: 'c', kind: 'dish', refId: 'beer', portion: 1.4, cup: long },
    { uid: 'd', kind: 'dish', refId: 'sake', portion: 1 },
  ]
  it('アレンジしたものはのぞき、1杯の量が同じものを先に', () => {
    expect(findDrinkItem(items, { kind: 'dish', refId: 'beer' }, long)?.uid).toBe('c')
    expect(findDrinkItem(items, { kind: 'dish', refId: 'beer' })?.uid).toBe('b')
    expect(findDrinkItem(items, { kind: 'dish', refId: 'red-wine' })).toBeUndefined()
  })
})
