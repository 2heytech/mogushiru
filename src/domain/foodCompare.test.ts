import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { COMPARE_START, compareNotes, compareTable, foodTraits, NEAR_OTHERS_MAX, NEAR_SAME_MAX, nearFoods, startPartners } from './foodCompare'
import { NUTRIENT_KEYS, type Food, type Nutrients } from './types'

// テスト用の架空の食材（値は実データではない）
const n = (over: Partial<Nutrients> = {}): Nutrients => ({ ...(Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, 0])) as Nutrients), ...over })
const food = (id: string, name: string, over: Partial<Nutrients> = {}, group = '11'): Food => ({ id, name, displayName: name.replace(/[\s　]+/g, ' '), kana: '', group, per100g: n({ energyKcal: 120, protein: 20, fat: 4, ...over }) })

describe('成分表の名前から、食材の性質を読みとる', () => {
  it('肉は、動物の種類・状態・形（内臓・ひき肉・加工品）', () => {
    expect(foodTraits({ name: '＜畜肉類＞　しか　にほんじか　赤肉　生', group: '11' })).toEqual({ species: 'しか', cls: '畜肉類', state: 'raw', form: null })
    expect(foodTraits({ name: '＜畜肉類＞　うし　［副生物］　舌　生', group: '11' })).toMatchObject({ species: 'うし', form: 'organ' })
    expect(foodTraits({ name: '＜畜肉類＞　うし　［ひき肉］　生', group: '11' })).toMatchObject({ species: 'うし', state: 'raw', form: 'minced' })
    expect(foodTraits({ name: '＜畜肉類＞　ぶた　［ハム類］　ロースハム　ロースハム', group: '11' })).toMatchObject({ species: 'ぶた', state: null, form: 'processed' })
    expect(foodTraits({ name: '＜鳥肉類＞　にわとり　［若どり・主品目］　むね　皮なし　焼き', group: '11' })).toMatchObject({ species: 'にわとり', cls: '鳥肉類', state: 'grilled', form: null })
  })

  it('魚は、（〜類）を種類にする。卵や内臓は、身と分ける', () => {
    expect(foodTraits({ name: '＜魚類＞　（さけ・ます類）　しろさけ　生', group: '10' })).toEqual({ species: 'さけ・ます類', cls: '魚類', state: 'raw', form: null })
    expect(foodTraits({ name: '＜魚類＞　（たら類）　すけとうだら　たらこ　生', group: '10' })).toMatchObject({ species: 'たら類', form: 'organ' })
    // （〜類）のない魚は、先頭の語
    expect(foodTraits({ name: '＜魚類＞　すずき　生', group: '10' })).toMatchObject({ species: 'すずき', state: 'raw' })
  })

  it('そのほかは、食品と区分（だいず［豆腐・油揚げ類］と だいず［納豆類］は別の食材）', () => {
    expect(foodTraits({ name: 'だいず　［豆腐・油揚げ類］　木綿豆腐', group: '04' })).toEqual({ species: 'だいず［豆腐・油揚げ類］', cls: null, state: null, form: null })
    expect(foodTraits({ name: 'だいず　［納豆類］　糸引き納豆', group: '04' }).species).toBe('だいず［納豆類］')
    expect(foodTraits({ name: 'ブロッコリー　花序　ゆで', group: '06' })).toMatchObject({ species: 'ブロッコリー', state: 'boiled' })
    // 先頭の語が「漬物」などのときは、前の（〜類）と合わせる
    expect(foodTraits({ name: '（だいこん類）　漬物　たくあん漬　塩押しだいこん漬', group: '06' })).toMatchObject({ species: 'だいこん類 漬物', state: 'pickled' })
  })
})

describe('近い食材', () => {
  const deer = food('90001', '＜畜肉類＞　しか　にほんじか　赤肉　生')
  const foods = [
    deer,
    food('90002', '＜畜肉類＞　しか　えぞしか　赤肉　生', { energyKcal: 130 }),
    // 牛は3つ。鹿にいちばん近い1つだけを出す
    food('90003', '＜畜肉類＞　うし　［輸入牛肉］　もも　赤肉　生', { energyKcal: 130, fat: 5 }),
    food('90004', '＜畜肉類＞　うし　［和牛肉］　ばら　脂身つき　生', { energyKcal: 470, protein: 11, fat: 45 }),
    food('90005', '＜畜肉類＞　うし　［副生物］　舌　生', { energyKcal: 125, fat: 4.5 }),
    food('90006', '＜畜肉類＞　ぶた　［大型種肉］　もも　赤肉　生', { energyKcal: 140, fat: 6 }),
    // 成分は近いが、焼いたもの。生どうしを先にする
    food('90007', '＜畜肉類＞　うま　肉　赤肉　焼き', { energyKcal: 121 }),
    food('90008', '＜鳥肉類＞　にわとり　［若どり・主品目］　むね　皮なし　生', { energyKcal: 110, fat: 2 }),
    // カロリーが測られていない食材・ほかの食品群の食材は、すすめない
    { ...food('90009', '＜畜肉類＞　やぎ　肉　赤肉　生'), per100g: n({ energyKcal: null }) },
    food('90010', '＜魚類＞　（まぐろ類）　くろまぐろ　赤身　生', {}, '10'),
  ]

  it('ほかの種類の近い食材を、種類ごとに1つ（鹿肉なら、牛・豚・鶏）', () => {
    const near = nearFoods(deer, foods)
    // 牛もも（生）→ 豚もも（生）→ 鶏むね（生。＜鳥肉類＞なので少し後ろ）→ 馬（焼き）
    expect(near.others.map((f) => f.id)).toEqual(['90003', '90006', '90008', '90007'])
    expect(near.same.map((f) => f.id)).toEqual(['90002'])
  })

  it('はじめに並べる相手は3つまで。ほかの種類が足りなければ、同じ食材の部位・状態ちがいで埋める', () => {
    expect(startPartners(nearFoods(deer, foods)).map((f) => f.id)).toEqual(['90003', '90006', '90008'])
    expect(startPartners(nearFoods(deer, foods.slice(0, 3))).map((f) => f.id)).toEqual(['90003', '90002'])
    expect(COMPARE_START).toBe(3)
  })

  describe('配信用のデータ（public/data/foods.json）で', () => {
    const real = (JSON.parse(readFileSync(new URL('../../public/data/foods.json', import.meta.url), 'utf8')) as { foods: Food[] }).foods
    const byName = (name: string) => real.find((f) => f.displayName === name)!

    it('鹿肉の相手は、牛・鶏・豚の生の肉（内臓・ひき肉・ハムではない）', () => {
      const near = nearFoods(byName('鹿肉（にほんじか・赤身）'), real)
      const start = startPartners(near)
      expect(start.map((f) => foodTraits(f).species).sort()).toEqual(['うし', 'にわとり', 'ぶた'])
      for (const f of start) expect(foodTraits(f), f.displayName).toMatchObject({ state: 'raw', form: null })
      // 同じ食材のちがう種類（えぞしか など）
      expect(near.same.length).toBeGreaterThan(0)
      for (const f of near.same) expect(f.displayName).toMatch(/^鹿肉/)
      expect(near.others.length).toBeLessThanOrEqual(NEAR_OTHERS_MAX)
      expect(near.same.length).toBeLessThanOrEqual(NEAR_SAME_MAX)
    })

    it('鮭の相手は、ほかの魚の身（たらこ・缶詰・練り製品ではない）', () => {
      const near = nearFoods(byName('鮭（生）'), real)
      expect(near.others.length).toBe(NEAR_OTHERS_MAX)
      for (const f of near.others) expect(foodTraits(f), f.displayName).toMatchObject({ cls: '魚類', state: 'raw', form: null })
    })

    it('木綿豆腐の相手に、納豆と豆乳がある。同じ食材には、ほかの豆腐', () => {
      const near = nearFoods(byName('木綿豆腐'), real)
      expect(near.others.map((f) => f.displayName)).toEqual(expect.arrayContaining(['納豆', '調製豆乳']))
      expect(near.same.map((f) => f.displayName)).toEqual(expect.arrayContaining(['絹ごし豆腐', '焼き豆腐']))
    })
  })
})

describe('並べてくらべる表', () => {
  const a = { ...food('90001', '＜畜肉類＞　しか　にほんじか　赤肉　生', { energyKcal: 120, protein: 24, fat: 4, iron: 5, salt: 0.1 }), per100g: n({ energyKcal: 120, protein: 24, fat: 4, iron: 5, salt: 0.1, vitaminD: null }) }
  const b = food('90003', '＜畜肉類＞　うし　［輸入牛肉］　もも　赤肉　生', { energyKcal: 130, protein: 20, fat: 7, iron: 2.5, salt: 0.1 })
  const row = (table: ReturnType<typeof compareTable>, key: string) => table.groups.flatMap((g) => g.rows).find((r) => r.key === key)!

  it('100gあたり：値はそのまま。いちばん多いところに印、棒はいちばん多い値に対する長さ', () => {
    const table = compareTable([a, b], 'per100g')
    expect(table.columns.map((c) => [c.food.id, c.grams, c.amountText])).toEqual([
      ['90001', 100, '100g'],
      ['90003', 100, '100g'],
    ])
    expect(row(table, 'protein').cells).toEqual([
      { amount: 24, share: 1, top: true },
      { amount: 20, share: 20 / 24, top: false },
    ])
    expect(row(table, 'fat').cells.map((c) => c.top)).toEqual([false, true])
  })

  it('値が同じ・どれも 0 の行には、印を付けない', () => {
    const table = compareTable([a, b], 'per100g')
    expect(row(table, 'salt').cells.map((c) => c.top)).toEqual([false, false])
    expect(row(table, 'vitaminC').cells).toEqual([
      { amount: 0, share: 0, top: false },
      { amount: 0, share: 0, top: false },
    ])
  })

  it('測られていない成分は、0 にしない（値なし）', () => {
    const cells = row(compareTable([a, b], 'per100g'), 'vitaminD').cells
    expect(cells[0]).toEqual({ amount: null, share: 0, top: false })
    expect(cells[1].amount).toBe(0)
  })

  it('1回の量で：それぞれの食材の「1回に食べる量」の値にする', () => {
    const table = compareTable([a, b], 'serving')
    const grams = table.columns[0].grams
    expect(grams).not.toBe(100)
    expect(table.columns[0].amountText).toContain(`${grams}g`)
    expect(row(table, 'protein').cells[0].amount).toBeCloseTo((24 * grams) / 100)
  })

  it('1つめを2つめとくらべて、ちがいの大きい成分を、多い・少ないで出す（小さな差は出さない）', () => {
    const notes = compareNotes(compareTable([a, b], 'per100g'))
    expect(notes.map((x) => [x.key, x.more])).toEqual([
      ['iron', true],
      ['fat', false],
      ['protein', true],
    ])
    expect(notes[0]).toMatchObject({ label: '鉄', unit: 'mg', self: 5, other: 2.5 })
    // エネルギーの差は 10kcal（20kcal 未満）なので出さない。1つだけのときは何も出さない
    expect(notes.some((x) => x.key === 'energyKcal')).toBe(false)
    expect(compareNotes(compareTable([a], 'per100g'))).toEqual([])
  })
})
