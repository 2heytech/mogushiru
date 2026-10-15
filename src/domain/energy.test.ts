import { describe, expect, it } from 'vitest'
import {
  EXERCISE_TYPES,
  KCAL_PER_KG_FAT,
  SIM_PERIODS,
  exerciseKcalPerSession,
  exerciseMinutes,
  expenditure,
  simulateWeight,
} from './energy'
import { computeTargets, estimatedEnergy } from './targets'
import type { Profile } from './types'

// テスト用の架空のプロフィール
const base: Profile = { sex: 'male', age: 40, weightKg: 70, activity: 'normal' }

describe('運動のカロリー', () => {
  it('メッツ×時間×体重から安静時の分を引く（ガイド2023の早見表と同じ値）', () => {
    // 普通歩行 3.0メッツ・10分・60kg → 20kcal、ジョギング 7.0メッツ・10分・50kg → 50kcal
    expect(exerciseKcalPerSession({ type: 'custom', mets: 3.0, minutes: 10, perWeek: 1 }, 60)).toBeCloseTo(20)
    expect(exerciseKcalPerSession({ type: 'jog', minutes: 10, perWeek: 1 }, 50)).toBeCloseTo(50)
  })

  it('歩数は1,000歩＝10分として時間に直す', () => {
    expect(exerciseMinutes({ type: 'walk', minutes: 0, steps: 6000, perWeek: 7 })).toBe(60)
  })

  it('週の回数で1日あたりにならして消費に足す', () => {
    const none = expenditure(base)
    // ジョギング 7.0メッツを1時間・週7回 → (7−1)×1×70 = 420kcal/日
    const daily = expenditure({ ...base, exercises: [{ type: 'jog', minutes: 60, perWeek: 7 }] })
    expect(daily.exercise).toBeCloseTo(420)
    expect(daily.total - none.total).toBeCloseTo(420)
    // 週3回なら 3/7
    const thrice = expenditure({ ...base, exercises: [{ type: 'jog', minutes: 60, perWeek: 3 }] })
    expect(thrice.exercise).toBeCloseTo((420 * 3) / 7)
  })

  it('消費は基礎代謝・ふだんの生活・運動の合計で、運動がなければ従来の推定エネルギー必要量と同じ', () => {
    const e = expenditure(base)
    expect(e.bmr).toBeCloseTo(22.5 * 70)
    expect(e.bmr + e.daily).toBeCloseTo(22.5 * 70 * 1.75)
    expect(e.exercise).toBe(0)
    expect(estimatedEnergy(base).kcal).toBe(Math.round((22.5 * 70 * 1.75) / 10) * 10)
  })

  it('運動を入れると1日の目安カロリーも増える（体重の目標の係数はそのあとにかける）', () => {
    const p: Profile = { ...base, goal: 'lose', exercises: [{ type: 'jog', minutes: 60, perWeek: 7 }] }
    expect(computeTargets(p).energyKcal).toBe(Math.round(((22.5 * 70 * 1.75 + 420) * 0.9) / 10) * 10)
  })

  it('運動の種類はどれもメッツが1より大きく、id が重ならない', () => {
    expect(EXERCISE_TYPES.every((t) => t.mets > 1)).toBe(true)
    expect(new Set(EXERCISE_TYPES.map((t) => t.id)).size).toBe(EXERCISE_TYPES.length)
  })

  it('知らない種類の運動は0として扱う（保存データが古くても止まらない）', () => {
    expect(expenditure({ ...base, exercises: [{ type: 'unknown', minutes: 60, perWeek: 7 }] }).exercise).toBe(0)
  })
})

describe('体重の変化', () => {
  it('摂取と消費が同じなら体重は変わらない', () => {
    const sim = simulateWeight(expenditure(base).total, base)
    for (const { days } of SIM_PERIODS) expect(sim.at(days)).toBeCloseTo(70)
  })

  it('はじめは1日の差×日数÷7,000kcal で変わり、体重が減ると消費も減るので変化はだんだんゆるやかになる', () => {
    const tee = expenditure(base).total
    const sim = simulateWeight(tee - 500, base)
    // 最初の1か月は単純計算（500×30÷7000 ≒ 2.14kg）に近く、少しだけ小さい
    const month = 70 - sim.at(30)
    const simple = (500 * 30) / KCAL_PER_KG_FAT
    expect(month).toBeLessThan(simple)
    expect(month).toBeGreaterThan(simple * 0.9)
    // 1年後は単純計算（26kg）よりずっと小さい
    expect(70 - sim.at(365)).toBeLessThan(500 * 365 / KCAL_PER_KG_FAT / 2)
    // 摂取＝消費になる体重に近づく
    expect(sim.settle).toBeCloseTo(((tee - 500) / tee) * 70)
    expect(sim.at(365 * 20)).toBeCloseTo(sim.settle, 1)
  })

  it('運動を足すと同じ食事でも体重が減る方向に動く', () => {
    const intake = expenditure(base).total
    const withRun: Profile = { ...base, exercises: [{ type: 'jog', minutes: 30, perWeek: 3 }] }
    expect(simulateWeight(intake, withRun).at(91)).toBeLessThan(70)
  })

  it('体重が未入力なら参照体重から計算する', () => {
    const p: Profile = { sex: 'female', age: 35, activity: 'normal' }
    expect(simulateWeight(1500, p).start).toBe(53.3)
    expect(expenditure(p).usedReferenceWeight).toBe(true)
  })
})
