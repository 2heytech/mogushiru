import { describe, expect, it } from 'vitest'
import { dailyReference, metricValue, rankFoods } from './ranking'
import { servingFor } from './serving'
import { computeTargets, DEFAULT_PROFILE } from './targets'
import type { Food, Nutrients } from './types'

const zero: Nutrients = {
  energyKcal: 0, protein: 0, fat: 0, carb: 0, fiber: 0, salt: 0, alcohol: 0, satFat: 0,
  monoUnsatFat: 0, polyUnsatFat: 0, n3Fat: 0, n6Fat: 0, retinol: 0,
  calcium: 0, iron: 0, potassium: 0, vitaminA: 0, vitaminD: 0, vitaminB1: 0, vitaminB2: 0, vitaminC: 0,
  magnesium: 0, zinc: 0, vitaminE: 0, niacin: 0, vitaminB6: 0, folate: 0,
}

const food = (id: string, name: string, group: string, n: Partial<Nutrients>): Food => ({
  id, name, displayName: name, kana: '', group, per100g: { ...zero, ...n },
})

const nori = food('09004', 'あまのり　焼きのり', '09', { energyKcal: 297, iron: 11, vitaminC: 210 })
const komatsuna = food('06086', 'こまつな　葉　生', '06', { energyKcal: 13, iron: 2.8, vitaminC: 39 })
const liver = food('11092', '＜畜肉類＞　ぶた　［副生物］　肝臓　生', '11', { energyKcal: 114, iron: 13 })
const tea = food('16037', '＜茶類＞　（緑茶類）　せん茶　浸出液', '16', { energyKcal: 2, vitaminC: 6 })
const unknown = food('99999', 'なにか', '06', { iron: null })

describe('1回に食べる量の目安', () => {
  it('乾物は少なく、野菜は小鉢1杯分', () => {
    expect(servingFor(nori).grams).toBe(3)
    expect(servingFor(komatsuna).grams).toBe(70)
    expect(servingFor(liver).grams).toBe(50)
  })
  it('「=」の語は区切った語と完全一致だけ当たる', () => {
    expect(servingFor({ id: 'x', name: 'だいず　［豆腐・油揚げ類］　木綿豆腐', group: '04' }).grams).toBe(100)
    expect(servingFor({ id: 'y', name: 'だいず　［豆腐・油揚げ類］　油揚げ　生', group: '04' }).grams).toBe(30)
  })
  it('めんは乾とゆでで量を変える', () => {
    expect(servingFor({ id: 'a', name: 'こむぎ　［うどん・そうめん類］　干しうどん　乾', group: '01' }).grams).toBe(80)
    expect(servingFor({ id: 'b', name: 'こむぎ　［うどん・そうめん類］　うどん　ゆで', group: '01' }).grams).toBe(200)
  })
  it('茶葉と浸出液を分ける', () => {
    expect(servingFor({ id: 'c', name: '＜茶類＞　（緑茶類）　せん茶　茶', group: '16' }).grams).toBe(3)
    expect(servingFor(tea).grams).toBe(200)
  })
})

describe('栄養素ランキング', () => {
  const foods = [nori, komatsuna, liver, tea, unknown]
  it('100gあたりでは焼きのりが上、1回量ではレバーや小松菜が上', () => {
    expect(rankFoods(foods, { nutrient: 'iron', metric: 'per100g' }).map((r) => r.food.id)).toEqual(['11092', '09004', '06086'])
    expect(rankFoods(foods, { nutrient: 'iron', metric: 'serving' }).map((r) => r.food.id)).toEqual(['11092', '06086', '09004'])
  })
  it('100kcalあたりは低カロリーすぎる食品（お茶）を除く', () => {
    const ids = rankFoods(foods, { nutrient: 'vitaminC', metric: 'per100kcal' }).map((r) => r.food.id)
    expect(ids).toEqual(['06086', '09004'])
  })
  it('未測定や 0 は出さない', () => {
    expect(rankFoods(foods, { nutrient: 'iron', metric: 'per100g' }).some((r) => r.food.id === '99999')).toBe(false)
    expect(metricValue(unknown, { nutrient: 'iron', metric: 'per100g' })).toBeNull()
  })
  it('100円あたりは価格のある食材だけ', () => {
    const prices = new Map([['06086', { yenPer100g: 50, item: 'こまつな' }]])
    const rows = rankFoods(foods, { nutrient: 'iron', metric: 'per100yen', prices })
    expect(rows.map((r) => r.food.id)).toEqual(['06086'])
    expect(rows[0].value).toBeCloseTo(5.6)
  })
  it('100円あたりは調味料を除く', () => {
    const salt = food('17012', '＜調味料類＞　（食塩類）　食塩', '17', { calcium: 22 })
    const prices = new Map([['17012', { yenPer100g: 13, item: '食塩' }]])
    expect(rankFoods([salt], { nutrient: 'calcium', metric: 'per100yen', prices })).toEqual([])
  })
  it('食品群でしぼれる', () => {
    expect(rankFoods(foods, { nutrient: 'iron', metric: 'per100g', group: '06' }).map((r) => r.food.id)).toEqual(['06086'])
  })
})

describe('1日の目安', () => {
  const t = computeTargets(DEFAULT_PROFILE)
  it('食塩は上限、食物繊維は目標で返す', () => {
    expect(dailyReference('salt', t)).toEqual({ value: t.saltMax, kind: 'max' })
    expect(dailyReference('fiber', t)).toEqual({ value: t.fiberMin, kind: 'target' })
    expect(dailyReference('vitaminC', t)).toEqual({ value: 100, kind: 'target' })
  })
})

describe('1日の目安（ビタミン・ミネラル）', () => {
  it('食事摂取基準の推奨量などを返し、基準のない栄養素は null', () => {
    const t = computeTargets({ sex: 'male', age: 25, activity: 'normal' })
    expect(dailyReference('vitaminC', t)).toEqual({ value: 100, kind: 'target' })
    expect(dailyReference('calcium', t)).toEqual({ value: 800, kind: 'target' })
    expect(dailyReference('monoUnsatFat', t)).toBeNull()
  })
})
