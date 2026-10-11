import { describe, expect, it } from 'vitest'
import { computeAlerts, balanceMood } from './alerts'
import { swapIngredient } from './customize'
import { ingredientsTotals, itemTotals, knownItemsOnly, menuTotals, pfcKcal, pfcRatio, sodiumMgToSaltG, type Catalog } from './nutrition'
import { DRI_VERIFIED } from './dri'
import { computeTargets, estimatedEnergy } from './targets'
import { NUTRIENT_KEYS, type DayMenu, type Food, type Nutrients } from './types'

// テスト用の架空の食品（実データではない）
const n = (partial: Partial<Nutrients>): Nutrients => {
  const base = {} as Nutrients
  for (const k of NUTRIENT_KEYS) base[k] = 0
  return { ...base, ...partial }
}
const foodA: Food = { id: '00001', name: 'A', displayName: 'A', kana: 'えー', group: 'test',
  per100g: n({ energyKcal: 100, protein: 10, fat: 0, carb: 15, salt: 1 }) }
const foodB: Food = { id: '00002', name: 'B', displayName: 'B', kana: 'びー', group: 'test',
  per100g: n({ energyKcal: 900, fat: 100, vitaminD: null }) }
const foods = new Map([foodA, foodB].map((f) => [f.id, f]))

const catalog: Catalog = {
  foods,
  dishes: new Map([['d1', { id: 'd1', name: '料理', kana: 'りょうり', category: 'main', suggestedSlots: ['dinner'],
    illustration: '', ingredients: [], nutrients: n({ energyKcal: 500, protein: 20, fat: 15, carb: 70, salt: 3, alcohol: 0 }) }]]),
  myDishes: new Map([['m1', { id: 'm1', baseDishId: null, name: 'マイ', createdAt: '',
    ingredients: [{ foodId: '00001', grams: 200 }] }]]),
  products: new Map([
    ['4900000000001', { jan: '4900000000001', name: 'ビール', brand: '', category: 'alcohol', basis: '100ml',
      nutrients: n({ energyKcal: 40, alcohol: 4 }), source: { name: 'Open Food Facts', fetchedAt: '' } }],
    ['4900000000002', { jan: '4900000000002', name: 'おにぎり', brand: '', category: 'onigiri', basis: 'serving',
      nutrients: n({ energyKcal: 180, protein: 4, carb: 38, salt: 1.2 }), source: { name: 'Open Food Facts', fetchedAt: '' } }],
  ]),
}

describe('栄養計算', () => {
  it('材料のグラム数で按分して合算する', () => {
    const t = ingredientsTotals([{ foodId: '00001', grams: 150 }, { foodId: '00002', grams: 10 }], foods)
    expect(t.values.energyKcal).toBeCloseTo(240)
    expect(t.values.protein).toBeCloseTo(15)
    expect(t.values.fat).toBeCloseTo(10)
  })

  it('未測定（null）は0にせず欠損として記録する', () => {
    const t = ingredientsTotals([{ foodId: '00002', grams: 10 }], foods)
    expect(t.missing.has('vitaminD')).toBe(true)
    expect(t.missing.has('fat')).toBe(false)
  })

  it('未知の食品番号はエラー', () => {
    expect(() => ingredientsTotals([{ foodId: '99999', grams: 1 }], foods)).toThrow()
  })

  it('区分別と1日合計を計算する（料理・マイ料理・市販品・食材）', () => {
    const menu: DayMenu = {
      breakfast: [{ uid: '1', kind: 'product', refId: '4900000000002', portion: 2 }],
      lunch: [{ uid: '2', kind: 'myDish', refId: 'm1', portion: 0.5 }],
      dinner: [{ uid: '3', kind: 'dish', refId: 'd1', portion: 1.5 }],
      other: [
        { uid: '4', kind: 'product', refId: '4900000000001', portion: 350 },
        { uid: '5', kind: 'food', refId: '00001', portion: 50 },
      ],
    }
    const t = menuTotals(menu, catalog)
    expect(t.bySlot.breakfast.values.energyKcal).toBeCloseTo(360)
    expect(t.bySlot.lunch.values.energyKcal).toBeCloseTo(100)
    expect(t.bySlot.dinner.values.energyKcal).toBeCloseTo(750)
    expect(t.bySlot.other.values.energyKcal).toBeCloseTo(140 + 50)
    expect(t.bySlot.other.values.alcohol).toBeCloseTo(14)
    expect(t.day.values.energyKcal).toBeCloseTo(360 + 100 + 750 + 190)
    // サプリの項目がなければサプリ分は 0
    expect(t.supplement.values.energyKcal).toBe(0)
  })

  it('サプリの項目はサプリ分の合計にも入り、マグネシウムの上限はその量と比べる', () => {
    const withSupplement: Catalog = {
      ...catalog,
      products: new Map([
        ...catalog.products,
        ['my-sup', { jan: 'my-sup', name: 'マグネシウム', brand: '', category: 'supplement', basis: 'serving',
          nutrients: n({ magnesium: 200 }), source: { name: 'ユーザー登録', fetchedAt: '' } }],
      ]),
    }
    const menu: DayMenu = {
      breakfast: [{ uid: '1', kind: 'supplement', refId: 'my-sup', portion: 2 }],
      lunch: [], dinner: [{ uid: '2', kind: 'dish', refId: 'd1', portion: 1 }], other: [],
    }
    const t = menuTotals(menu, withSupplement)
    expect(t.supplement.values.magnesium).toBe(400)
    expect(t.day.values.magnesium).toBe(400)
    const mg = computeAlerts(t, computeTargets({ sex: 'female', age: 35, activity: 'normal' })).find((a) => a.key === 'magnesium')!
    expect(mg).toMatchObject({ level: 'over', amount: 400, limit: 350, supplementOnly: true })
  })

  it('保存済みの市販品にあとから増えた栄養素がないときは欠損、サプリなら 0 として扱う', () => {
    const old = { ...n({ energyKcal: 100 }) } as Partial<Nutrients>
    delete old.caffeine
    const c: Catalog = {
      ...catalog,
      products: new Map([
        ['my-old', { jan: 'my-old', name: '昔の登録', brand: '', category: 'other', basis: 'serving', nutrients: old as Nutrients, source: { name: 'ユーザー登録', fetchedAt: '' } }],
        ['my-sup', { jan: 'my-sup', name: '昔のサプリ', brand: '', category: 'supplement', basis: 'serving', nutrients: old as Nutrients, source: { name: 'ユーザー登録', fetchedAt: '' } }],
      ]),
    }
    const product = itemTotals({ uid: '1', kind: 'product', refId: 'my-old', portion: 1 }, c)
    expect(product.values.caffeine).toBe(0)
    expect(product.missing.has('caffeine')).toBe(true)
    const sup = itemTotals({ uid: '2', kind: 'supplement', refId: 'my-sup', portion: 1 }, c)
    expect(sup.values.caffeine).toBe(0)
    expect(sup.missing.size).toBe(0)
  })

  it('献立の中でアレンジした料理は、アレンジ後の材料から計算する', () => {
    const t = itemTotals(
      { uid: '1', kind: 'dish', refId: 'd1', portion: 2, customIngredients: [{ foodId: '00001', grams: 100 }] },
      catalog,
    )
    expect(t.values.energyKcal).toBeCloseTo(200)
    expect(t.values.salt).toBeCloseTo(2)
  })

  it('材料の入れ替えは候補の中だけで、元の食材は候補に回る', () => {
    const ing = { foodId: 'a', grams: 50, alternatives: ['b', 'c'] }
    const swapped = swapIngredient(ing, 'b')
    expect(swapped).toEqual({ foodId: 'b', grams: 50, alternatives: ['a', 'c'] })
    expect(swapIngredient(swapped, 'a')).toEqual({ foodId: 'a', grams: 50, alternatives: ['b', 'c'] })
    expect(swapIngredient(ing, 'z')).toBe(ing)
  })

  it('ナトリウムから食塩相当量に換算する', () => {
    expect(sodiumMgToSaltG(1000)).toBeCloseTo(2.54)
  })

  it('PFC比は合計100%', () => {
    const r = pfcRatio(n({ protein: 25, fat: 20, carb: 100 }) as Record<string, number> as never)!
    expect(r.p + r.f + r.c).toBeCloseTo(100)
    expect(r.f).toBeCloseTo((180 / (100 + 180 + 400)) * 100)
  })

  it('P・F・C のカロリーは 4・9・4 kcal/g', () => {
    expect(pfcKcal(n({ protein: 25, fat: 20, carb: 100 }) as Record<string, number> as never)).toEqual({ p: 100, f: 180, c: 400 })
  })

  it('保存した1日の食事から、データにない料理を外す', () => {
    const menu = { breakfast: [{ uid: '1', kind: 'dish' as const, refId: 'd1', portion: 1 }, { uid: '2', kind: 'dish' as const, refId: 'gone', portion: 1 }], lunch: [], dinner: [{ uid: '3', kind: 'product' as const, refId: 'none', portion: 1 }], other: [] }
    const kept = knownItemsOnly(menu, catalog)
    expect(kept.breakfast.map((i) => i.uid)).toEqual(['1'])
    expect(kept.dinner).toEqual([])
  })

  it('保存した1日の食事の食材は、食材のデータにあれば残す', () => {
    const menu = { breakfast: [{ uid: '1', kind: 'food' as const, refId: '00001', portion: 100 }, { uid: '2', kind: 'food' as const, refId: 'gone', portion: 100 }], lunch: [], dinner: [], other: [] }
    expect(knownItemsOnly(menu, catalog).breakfast.map((i) => i.uid)).toEqual(['1'])
  })
})

describe('目標値', () => {
  it('基礎代謝基準値×体重×身体活動レベルで推定エネルギー必要量を出す', () => {
    const e = estimatedEnergy({ sex: 'male', age: 40, weightKg: 70, activity: 'normal' })
    expect(e.kcal).toBe(Math.round((22.5 * 70 * 1.75) / 10) * 10)
    expect(e.usedReferenceWeight).toBe(false)
  })

  it('体重未入力なら参照体重を使う', () => {
    expect(estimatedEnergy({ sex: 'female', age: 25, activity: 'low' }).usedReferenceWeight).toBe(true)
  })

  it('年齢でたんぱく質の下限が変わる', () => {
    expect(computeTargets({ sex: 'male', age: 30, activity: 'normal' }).pfcRatio.p.lo).toBe(13)
    expect(computeTargets({ sex: 'male', age: 70, activity: 'normal' }).pfcRatio.p.lo).toBe(15)
  })

  it('食物繊維の目標量は原典の年齢区分どおり', () => {
    const fiber = (sex: 'male' | 'female', age: number) => computeTargets({ sex, age, activity: 'normal' }).fiberMin
    expect([25, 40, 60, 70, 80].map((a) => fiber('male', a))).toEqual([20, 22, 22, 21, 20])
    expect([25, 40, 60, 70, 80].map((a) => fiber('female', a))).toEqual([18, 18, 18, 18, 17])
  })

  it('75歳以上は身体活動レベル「高い」がないので「ふつう」と同じ値を使う', () => {
    const kcal = (activity: 'normal' | 'high') => estimatedEnergy({ sex: 'female', age: 80, weightKg: 50, activity }).kcal
    expect(kcal('normal')).toBe(Math.round((20.7 * 50 * 1.7) / 10) * 10)
    expect(kcal('high')).toBe(kcal('normal'))
  })

  it('目標値は原典と照合済み', () => {
    expect(DRI_VERIFIED).toBe(true)
  })
})

describe('アラートとマスコット', () => {
  const targets = computeTargets({ sex: 'female', age: 35, weightKg: 53, activity: 'normal' })

  it('食塩とアルコールの超過を検知し、いちばん寄与した区分を示す', () => {
    const menu: DayMenu = {
      breakfast: [],
      lunch: [{ uid: '1', kind: 'dish', refId: 'd1', portion: 3 }],
      dinner: [],
      other: [{ uid: '2', kind: 'product', refId: '4900000000001', portion: 700 }],
    }
    const alerts = computeAlerts(menuTotals(menu, catalog), targets)
    const salt = alerts.find((a) => a.key === 'salt')!
    expect(salt.level).toBe('over')
    expect(salt.topSlot).toBe('lunch')
    expect(alerts.find((a) => a.key === 'alcohol')!.level).toBe('over')
  })

  it('アルコールはリスクを高める量ちょうどでも超過にする', () => {
    const menu: DayMenu = { breakfast: [], lunch: [], dinner: [], other: [{ uid: '1', kind: 'product', refId: '4900000000001', portion: 500 }] }
    const alcohol = computeAlerts(menuTotals(menu, catalog), targets).find((a) => a.key === 'alcohol')!
    expect(alcohol.amount).toBeCloseTo(20)
    expect(alcohol.level).toBe('over')
  })

  it('空の献立では普通の表情', () => {
    const empty: DayMenu = { breakfast: [], lunch: [], dinner: [], other: [] }
    const t = menuTotals(empty, catalog)
    expect(balanceMood(t, targets, computeAlerts(t, targets))).toBe('okay')
  })
})
