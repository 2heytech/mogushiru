import { describe, expect, it } from 'vitest'
import { emptyTotals } from './nutrition'
import { nutrientChecks } from './nutrientChecks'
import { SLOT_ENERGY_SHARE, slotBalance, slotShareFromPercent } from './slotBalance'
import { computeTargets, DEFAULT_PROFILE } from './targets'

const targets = computeTargets(DEFAULT_PROFILE)

function totals(kcal: number, protein: number, fat: number, carb: number) {
  const t = emptyTotals()
  Object.assign(t.values, { energyKcal: kcal, protein, fat, carb })
  return t
}

describe('区分ごとのバランス', () => {
  it('区分の割り振りは合計100%', () => {
    expect(Object.values(SLOT_ENERGY_SHARE).reduce((a, b) => a + b, 0)).toBeCloseTo(1)
  })

  it('目安カロリーは1日の目標を割り振った値', () => {
    const b = slotBalance(totals(0, 0, 0, 0), 'lunch', targets)
    expect(b.targetKcal).toBe(Math.round((targets.energyKcal * 0.35) / 10) * 10)
    expect(b.energy).toBe('empty')
  })

  it('目安の±20%を超えると少なめ・多め', () => {
    const target = slotBalance(totals(0, 0, 0, 0), 'dinner', targets).targetKcal
    expect(slotBalance(totals(target * 0.7, 0, 0, 0), 'dinner', targets).energy).toBe('low')
    expect(slotBalance(totals(target, 0, 0, 0), 'dinner', targets).energy).toBe('ok')
    expect(slotBalance(totals(target * 1.3, 0, 0, 0), 'dinner', targets).energy).toBe('high')
  })

  it('PFCが目標範囲から外れたものを外れ幅の大きい順に返す', () => {
    // P 10%・F 50%・C 40%: 脂質が大きく多め、炭水化物とたんぱく質が少なめ
    const b = slotBalance(totals(600, 15, 33.3, 60), 'dinner', targets)
    expect(b.hints[0]).toMatchObject({ key: 'f', direction: 'high' })
    expect(b.hints[0].gap).toBeGreaterThan(0)
    expect(b.hints.map((h) => h.key)).toContain('c')
  })

  it('バランスが範囲内ならヒントなし、その他の区分はPFCを判定しない', () => {
    // P 15%・F 25%・C 60%
    expect(slotBalance(totals(600, 22.5, 16.7, 90), 'lunch', targets).hints).toEqual([])
    expect(slotBalance(totals(600, 15, 33.3, 60), 'other', targets).hints).toEqual([])
  })

  it('その他（間食）は少なくても「少なめ」にしない', () => {
    expect(slotBalance(totals(50, 0, 0, 0), 'other', targets).energy).toBe('ok')
  })
})

describe('朝・昼・晩・その他の配分を自分で決める', () => {
  const custom = computeTargets({ ...DEFAULT_PROFILE, slotShare: { breakfast: 20, lunch: 30, dinner: 40, other: 10 } })

  it('未設定なら 25:35:30:10', () => {
    expect(targets.slotShare).toEqual(SLOT_ENERGY_SHARE)
  })

  it('設定した配分で区分の目安カロリーが変わる', () => {
    expect(slotBalance(totals(0, 0, 0, 0), 'dinner', custom).targetKcal).toBe(Math.round((custom.energyKcal * 0.4) / 10) * 10)
    expect(slotBalance(totals(0, 0, 0, 0), 'breakfast', custom).targetKcal).toBe(Math.round((custom.energyKcal * 0.2) / 10) * 10)
  })

  it('区分の栄養素の目安と判定も設定した配分に従う', () => {
    const dinner = nutrientChecks(emptyTotals(), custom, 'dinner').find((c) => c.key === 'vitaminC')!
    expect(dinner.goal).toBeCloseTo(100 * 0.4)
    const salt = nutrientChecks(emptyTotals(), custom, 'breakfast').find((c) => c.key === 'salt')!
    expect(salt.goal).toBeCloseTo(custom.saltMax * 0.2)
  })

  it('合計が100でなくても割合に直し、不正な値は初期値に戻す', () => {
    expect(slotShareFromPercent({ breakfast: 1, lunch: 1, dinner: 2, other: 0 })).toEqual({ breakfast: 0.25, lunch: 0.25, dinner: 0.5, other: 0 })
    expect(slotShareFromPercent({ breakfast: 0, lunch: 0, dinner: 0, other: 0 })).toEqual(SLOT_ENERGY_SHARE)
    expect(slotShareFromPercent({ breakfast: -5, lunch: 50, dinner: 50, other: 5 })).toEqual(SLOT_ENERGY_SHARE)
    expect(slotShareFromPercent(undefined)).toEqual(SLOT_ENERGY_SHARE)
  })
})
