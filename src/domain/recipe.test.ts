import { describe, expect, it } from 'vitest'
import { amountText, extraTexts, formatCount, materialLines, pieceHint, recipeLines, spoonHint } from './recipe'
import type { Food } from './types'

const food = (id: string, displayName: string) => ({ id, displayName }) as Food
const FOODS = new Map(
  [
    food('02019', 'じゃがいも（水煮）'),
    food('02017', 'じゃがいも'),
    food('11271', '牛もも肉（赤身・ゆで）'),
    food('11076', 'うし 輸入牛肉 もも 皮下脂肪なし 生'),
    food('17007', 'しょうゆ（濃口）'),
    food('17012', '食塩'),
    food('17021', 'だし（かつお・昆布）'),
  ].map((f) => [f.id, f]),
)

describe('分数の書き方', () => {
  it('1/2・1と1/2・2', () => {
    expect(formatCount(0.5)).toBe('1/2')
    expect(formatCount(1.5)).toBe('1と1/2')
    expect(formatCount(2)).toBe('2')
    expect(formatCount(1 / 3)).toBe('1/3')
  })
})

describe('大さじ・小さじの目安', () => {
  it('ぴったりなら強・弱をつけない', () => {
    expect(spoonHint(18, 6)).toBe('大さじ1')
    expect(spoonHint(6, 6)).toBe('小さじ1')
    expect(spoonHint(9, 6)).toBe('大さじ1/2')
  })
  it('ずれていれば強・弱', () => {
    expect(spoonHint(20, 6)).toBe('大さじ1強')
    expect(spoonHint(10, 6)).toBe('大さじ1/2強')
    expect(spoonHint(4.5, 3)).toBe('大さじ1/2')
    expect(spoonHint(2.5, 3)).toBe('小さじ3/4強')
  })
  it('ごく少ない量は少々', () => {
    expect(spoonHint(0.3, 6)).toBe('少々')
  })
})

describe('1個・1本の目安', () => {
  it('近い数があれば「約」をつけて出す', () => {
    expect(pieceHint(140, { grams: 135, unit: '個' })).toBe('約1個')
    expect(pieceHint(100, { grams: 50, unit: '個' })).toBe('約2個')
    expect(pieceHint(36, { grams: 6, unit: '枚' })).toBe('約6枚')
  })
  it('とても少ないとき・近い数がないときは出さない', () => {
    expect(pieceHint(5, { grams: 135, unit: '個' })).toBeNull()
  })
})

describe('材料の一覧', () => {
  it('火を通したあとの食品は、作るときの食品と重さに直す', () => {
    const lines = recipeLines(
      [
        { foodId: '02019', grams: 68 },
        { foodId: '11271', grams: 27 },
      ],
      1,
      FOODS,
    )
    expect(lines.map((l) => l.name)).toEqual(['じゃがいも', '牛もも肉'])
    // 牛もも肉 ゆで 27g は、重量変化率58%で生 47g
    expect(lines[1].amount).toBe('47g')
  })
  it('人前をかけ、同じ食品はまとめる', () => {
    const lines = recipeLines(
      [
        { foodId: '17007', grams: 3 },
        { foodId: '17007', grams: 7 },
      ],
      2,
      FOODS,
    )
    expect(lines).toHaveLength(1)
    expect(lines[0].amount).toBe('20g（大さじ1強）')
  })
  it('だしは mL、ごく少ない塩は「少々」だけ', () => {
    expect(amountText('17021', 150)).toBe('150mL')
    expect(amountText('17012', 0.3)).toBe('少々')
  })
  it('牛乳は多いと mL、少ないと大さじ・小さじ。とても多い量にはさじの目安をつけない', () => {
    expect(amountText('13003', 200)).toBe('200mL')
    expect(amountText('13003', 15)).toBe('15g（大さじ1）')
    expect(amountText('03003', 120)).toBe('120g')
  })
  it('量が0の材料は出さない', () => {
    expect(recipeLines([{ foodId: '17007', grams: 0 }], 1, FOODS)).toEqual([])
  })
})

describe('作るときの材料・ほかに使うもの', () => {
  it('人前をかける。量のないものは適量', () => {
    expect(materialLines([{ name: '鶏もも肉', grams: 160 }, { name: '揚げ油' }], 2).map((l) => l.amount)).toEqual(['320g', '適量'])
    expect(extraTexts([{ name: '水', amount: 100, unit: 'mL' }, { name: '揚げ油' }], 1.5)).toEqual(['水 150mL', '揚げ油 適量'])
  })
})
