import { describe, expect, it } from 'vitest'
import { clampPortion, customDishName, gramStep, round1, shortFoodName } from './customize'
import type { Ingredient } from './types'

const NAMES: Record<string, string> = { potato: 'じゃがいも（水煮）', beef: '牛もも肉（赤身・ゆで）', pork: '豚もも肉（ゆで）', sugar: '砂糖（上白糖）', egg: 'たまご' }
const foodName = (id: string) => NAMES[id] ?? id
const original: Ingredient[] = [
  { foodId: 'potato', grams: 68 },
  { foodId: 'beef', grams: 27, alternatives: ['pork'] },
  { foodId: 'sugar', grams: 4.5 },
]

describe('量のきざみ', () => {
  it('整数の量は1g、小数のある量は0.1g', () => {
    expect(gramStep(68)).toBe(1)
    expect(gramStep(4.5)).toBe(0.1)
    expect(gramStep(0.7)).toBe(0.1)
  })
  it('0.1を足し引きしても誤差が残らない', () => {
    expect(round1(0.1 + 0.2)).toBe(0.3)
    expect(clampPortion(1.5 - 0.1)).toBe(1.4)
    expect(clampPortion(0)).toBe(0.1)
  })
})

describe('保存名の初期値', () => {
  it('変えていなければ料理名のまま', () => {
    expect(customDishName('肉じゃが', 1, original, original, foodName)).toBe('肉じゃが')
  })
  it('人前と、増減した材料を短く入れる', () => {
    const current = original.map((i) => (i.foodId === 'potato' ? { ...i, grams: 88 } : i.foodId === 'sugar' ? { ...i, grams: 3.9 } : i))
    expect(customDishName('肉じゃが', 1.5, original, current, foodName)).toBe('肉じゃが（1.5人前・じゃがいも+20g・砂糖−0.6g）')
  })
  it('入れ替え・外した・足した材料', () => {
    const current: Ingredient[] = [
      { foodId: 'potato', grams: 68 },
      { foodId: 'pork', grams: 27, alternatives: ['beef'] },
      { foodId: 'sugar', grams: 0 },
      { foodId: 'egg', grams: 50 },
    ]
    expect(customDishName('肉じゃが', 1, original, current, foodName)).toBe('肉じゃが（牛もも肉→豚もも肉・砂糖なし・たまご追加）')
  })
  it('変更が多いときは3つまでにして「ほか」', () => {
    const current: Ingredient[] = [
      { foodId: 'potato', grams: 60 },
      { foodId: 'beef', grams: 30 },
      { foodId: 'sugar', grams: 5 },
      { foodId: 'egg', grams: 50 },
    ]
    expect(customDishName('肉じゃが', 2, original, current, foodName)).toBe('肉じゃが（2人前・じゃがいも−8g・牛もも肉+3g・砂糖+0.5g・ほか）')
  })
  it('食品名のかっこ書きを省く', () => {
    expect(shortFoodName('しょうゆ（濃口）')).toBe('しょうゆ')
    expect(shortFoodName('しらたき')).toBe('しらたき')
  })
})
