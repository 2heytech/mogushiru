import { describe, expect, it } from 'vitest'
import { computeAlerts } from './alerts'
import { judge, notableChecks, nutrientChecks, summarizeChecks, tolerableUpper } from './nutrientChecks'
import { idealPfc, pfcGaps } from './pfcGap'
import { computeTargets } from './targets'
import { NUTRIENT_KEYS, type NutrientKey, type NutrientTotals } from './types'

// テスト用の架空の合計値
const totals = (partial: Partial<Record<NutrientKey, number>>, missing: NutrientKey[] = []): NutrientTotals => {
  const values = {} as Record<NutrientKey, number>
  for (const k of NUTRIENT_KEYS) values[k] = 0
  return { values: { ...values, ...partial }, missing: new Set(missing) }
}

describe('食事摂取基準の目安', () => {
  it('18〜29歳の値（原典の表どおり）', () => {
    const m = computeTargets({ sex: 'male', age: 25, activity: 'normal' }).nutrients
    expect(m.n6Fat).toEqual({ kind: 'min', value: 12, basis: '目安量' })
    expect(m.n3Fat).toMatchObject({ value: 2.2 })
    expect(m.vitaminA).toMatchObject({ value: 850, basis: '推奨量' })
    expect(m.vitaminB1).toMatchObject({ value: 1.1 })
    expect(m.vitaminB2).toMatchObject({ value: 1.6 })
    expect(m.calcium).toMatchObject({ value: 800, upper: 2500 })
    expect(m.vitaminD).toMatchObject({ value: 9, upper: 100 })
    expect(m.potassium).toMatchObject({ value: 3000, basis: '目標量' })
    expect(m.iron).toMatchObject({ value: 7.0 })
    expect(m.monoUnsatFat).toEqual({ kind: 'none' })
  })

  it('女性の鉄は月経の有無で変わり、未設定なら50歳未満は「あり」', () => {
    const iron = (age: number, menstruation?: boolean) =>
      computeTargets({ sex: 'female', age, activity: 'normal', menstruation }).nutrients.iron
    expect(iron(35)).toMatchObject({ value: 10.5 })
    expect(iron(35, false)).toMatchObject({ value: 6.0 })
    expect(iron(55)).toMatchObject({ value: 6.0 })
    expect(iron(55, true)).toMatchObject({ value: 10.5 })
    // 65歳以上は原典に「月経あり」の区分がない
    expect(iron(70, true)).toMatchObject({ value: 6.0 })
  })
})

describe('目安・上限との比較', () => {
  const targets = computeTargets({ sex: 'female', age: 35, activity: 'normal' })

  it('とりたい栄養素：達成・あと少し・不足、耐容上限量こえ', () => {
    const min = { kind: 'min', value: 100, basis: '推奨量', upper: 200 } as const
    expect(judge(100, min, 100, 200, true)).toBe('ok')
    expect(judge(80, min, 100, 200, true)).toBe('near')
    expect(judge(79, min, 100, 200, true)).toBe('low')
    expect(judge(201, min, 100, 200, true)).toBe('over')
    expect(judge(10, min, 100, 200, false)).toBe('info')
  })

  it('上限のある栄養素：「未満」はちょうどでも超過', () => {
    const salt = { kind: 'max', value: 6.5, basis: '目標量', overAtLimit: true } as const
    expect(judge(6.5, salt, 6.5, null, true)).toBe('over')
    expect(judge(5.3, salt, 6.5, null, true)).toBe('near')
    expect(judge(5.2, salt, 6.5, null, true)).toBe('ok')
  })

  it('1日の合計を判定し、未収録の食品があれば印をつける', () => {
    const checks = nutrientChecks(totals({ salt: 7, vitaminC: 120, calcium: 300 }, ['vitaminD']), targets)
    const by = Object.fromEntries(checks.map((c) => [c.key, c]))
    expect(by.salt.status).toBe('over')
    expect(by.vitaminC.status).toBe('ok')
    expect(by.calcium.status).toBe('low')
    expect(by.vitaminD.partial).toBe(true)
    expect(by.monoUnsatFat.status).toBe('info')
    expect(summarizeChecks(checks).over).toBe(1)
  })

  it('区分では目安を区分の割合で配分する。アルコールは1日の値、その他の区分は不足を判定しない', () => {
    const lunch = Object.fromEntries(nutrientChecks(totals({ salt: 2, alcohol: 10 }), targets, 'lunch').map((c) => [c.key, c]))
    expect(lunch.salt.goal).toBeCloseTo(6.5 * 0.35)
    expect(lunch.alcohol.goal).toBe(20)
    expect(lunch.vitaminC.status).toBe('low')
    const other = Object.fromEntries(nutrientChecks(totals({ salt: 0.1 }), targets, 'other').map((c) => [c.key, c]))
    expect(other.vitaminC.status).toBe('info')
  })
})

describe('PFCの理想と実績の差', () => {
  const targets = computeTargets({ sex: 'female', age: 35, activity: 'normal' })

  it('目標範囲からのずれを％ポイントで返す（範囲内は0）', () => {
    // P 10g=40kcal、F 20g=180kcal、C 45g=180kcal → P10% F45% C45%
    const gaps = pfcGaps(totals({ protein: 10, fat: 20, carb: 45 }).values, targets)!
    expect(gaps[0].gap).toBeCloseTo(-3)
    expect(gaps[1].gap).toBeCloseTo(15)
    expect(gaps[2].gap).toBeCloseTo(-5)
    expect(pfcGaps(totals({ protein: 20, fat: 13, carb: 70 }).values, targets)!.every((g) => g.gap === 0)).toBe(true)
    expect(pfcGaps(totals({}).values, targets)).toBeNull()
  })

  it('理想の帯は目標範囲のまんなかを合計100%にしたもの', () => {
    const ideal = idealPfc(targets)
    expect(ideal.p + ideal.f + ideal.c).toBeCloseTo(100)
    expect(ideal.f).toBeGreaterThan(ideal.p)
  })
})

describe('達成の割合と、畳んだときに見せる栄養素', () => {
  const targets = computeTargets({ sex: 'female', age: 35, activity: 'normal' })

  it('目安（上限）に対する割合を返し、基準のない栄養素は null', () => {
    const by = Object.fromEntries(nutrientChecks(totals({ vitaminC: 50, salt: 13 }), targets).map((c) => [c.key, c]))
    expect(by.vitaminC.percent).toBeCloseTo(50)
    expect(by.salt.percent).toBeCloseTo(200)
    expect(by.monoUnsatFat.percent).toBeNull()
  })

  it('こえているもの、割合の低い不足の順に返す', () => {
    const checks = nutrientChecks(totals({ salt: 13, vitaminC: 50, calcium: 100, iron: 10 }), targets)
    expect(notableChecks(checks, 3).map((c) => c.key)).toEqual(['salt', 'fiber', 'potassium'])
  })
})

describe('とりすぎ（耐容上限量）のアラート', () => {
  const targets = computeTargets({ sex: 'female', age: 35, activity: 'normal' })
  // 区分ごとの合計も持つ MenuTotals（テスト用の架空の値）
  const menuOf = (dinner: Partial<Record<NutrientKey, number>>) => {
    const day = totals(dinner)
    return { day, bySlot: { breakfast: totals({}), lunch: totals({}), dinner: day, other: totals({}) } }
  }

  it('カルシウム・ビタミンD・レチノールが耐容上限量をこえるとアラートを出し、先頭に並べる', () => {
    const alerts = computeAlerts(menuOf({ salt: 7, calcium: 2600, vitaminD: 120, retinol: 3000 }), targets)
    expect(alerts.slice(0, 3).map((a) => [a.key, a.level, a.limitKind])).toEqual([
      ['retinol', 'over', 'upper'],
      ['calcium', 'over', 'upper'],
      ['vitaminD', 'over', 'upper'],
    ])
    expect(alerts.find((a) => a.key === 'calcium')!.limit).toBe(2500)
    expect(alerts.find((a) => a.key === 'calcium')!.topSlot).toBe('dinner')
    expect(alerts.find((a) => a.key === 'salt')!.limitKind).toBe('target')
  })

  it('上限の8割をこえたら注意、推奨量を満たすだけではアラートにしない', () => {
    const alerts = computeAlerts(menuOf({ calcium: 2100, vitaminD: 9, retinol: 500 }), targets)
    expect(alerts.find((a) => a.key === 'calcium')!.level).toBe('warn')
    expect(alerts.find((a) => a.key === 'vitaminD')).toBeUndefined()
    expect(alerts.find((a) => a.key === 'retinol')).toBeUndefined()
  })

  it('上限のない栄養素（鉄・ビタミンCなど）はどれだけ多くてもアラートにしない', () => {
    const alerts = computeAlerts(menuOf({ iron: 100, vitaminC: 5000 }), targets)
    expect(alerts.map((a) => a.key)).not.toContain('iron')
    expect(alerts.map((a) => a.key)).not.toContain('vitaminC')
  })

  it('区分のチェックでも、耐容上限量は1日の値のまま比べる', () => {
    const lunch = Object.fromEntries(nutrientChecks(totals({ retinol: 1000 }), targets, 'lunch').map((c) => [c.key, c]))
    expect(lunch.retinol.goal).toBe(2700)
    expect(lunch.retinol.status).toBe('ok')
    expect(tolerableUpper(targets.nutrients.calcium)).toBe(2500)
    expect(tolerableUpper(targets.nutrients.salt)).toBeNull()
  })
})
