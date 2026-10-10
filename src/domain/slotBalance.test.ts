import { describe, expect, it } from 'vitest'
import { emptyTotals } from './nutrition'
import { SLOT_ENERGY_SHARE, slotBalance } from './slotBalance'
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
