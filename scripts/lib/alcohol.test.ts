import { describe, expect, it } from 'vitest'
import { abvFromName, estimateAlcohol, notDrinkCategory } from './alcohol'

describe('abvFromName', () => {
  it('商品名の度数を読む。糖質オフの「%」は読まない', () => {
    expect(abvFromName('焼酎 25度')).toBe(25)
    expect(abvFromName('スナズ WHISKY Alc.37%')).toBe(37)
    expect(abvFromName('レモンサワー アルコール分９％')).toBe(9)
    expect(abvFromName('ノンアルコールビールテイスト0.00%')).toBe(0)
    expect(abvFromName('生ビール　糖質70％オフ　500ml')).toBeNull()
    expect(abvFromName('あさりの酒蒸し(-18℃)')).toBeNull()
  })
})

describe('estimateAlcohol', () => {
  it('度数があれば100mL当たりの純アルコール量にする', () => {
    expect(estimateAlcohol('焼酎 25度', { energyKcal: 140, protein: 0, fat: 0, carb: 0 }, 100)).toEqual({ grams: 20, from: 'name' })
  })
  it('度数がなければエネルギーからたんぱく質・脂質・炭水化物の分を引いた残りで推定する', () => {
    // 100mL当たり 55.7kcal・炭水化物0.8g → (55.7 − 3.2) / 7 = 7.5g（度数9%ほど）
    expect(estimateAlcohol('ストロング レモン', { energyKcal: 55.7, protein: 0, fat: 0, carb: 0.8 }, 100)).toEqual({ grams: 7.5, from: 'energy' })
  })
  it('残りがほとんどないもの（ノンアルコール）は 0', () => {
    expect(estimateAlcohol('プライムフリー', { energyKcal: 12, protein: 0.11, fat: 0, carb: 3.03 }, 100)).toEqual({ grams: 0, from: 'energy' })
    expect(estimateAlcohol('ノンアルコール レモンサワーテイスト', { energyKcal: 3.7, protein: 0, fat: 0, carb: 1 }, 100)).toEqual({ grams: 0, from: 'name' })
  })
  it('量の分からない表示では度数を使わずエネルギーから推定する', () => {
    expect(estimateAlcohol('焼酎 25度 1杯', { energyKcal: 70, protein: 0, fat: 0, carb: 0 })).toEqual({ grams: 10, from: 'energy' })
  })
})

describe('notDrinkCategory', () => {
  it('酒蒸し・甘酒・料理酒などはお酒にしない', () => {
    expect(notDrinkCategory('ASC認証ふっくら仕上がる あさりの酒蒸し(-18℃)')).toBe('side')
    expect(notDrinkCategory('ムール貝とあさりの白ワイン蒸し')).toBe('side')
    expect(notDrinkCategory('酒まんじゅう')).toBe('dessert')
    expect(notDrinkCategory('家族の甘酒')).toBe('drink')
    expect(notDrinkCategory('料理用日本酒')).toBe('seasoning')
    expect(notDrinkCategory('純米酒')).toBeNull()
    expect(notDrinkCategory('ほろよい 白いサワー')).toBeNull()
  })
})
