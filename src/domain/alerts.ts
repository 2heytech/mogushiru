import { CHECKED_NUTRIENTS, tolerableUpper, upperScopeOf } from './nutrientChecks'
import { pfcRatio } from './nutrition'
import type { MenuTotals } from './nutrition'
import type { CheckedNutrient, Targets } from './targets'
import type { NutrientKey, Slot } from './types'

export type AlertLevel = 'warn' | 'over'

export type Alert = {
  key: CheckedNutrient | 'energy'
  level: AlertLevel
  amount: number
  limit: number
  // limit が何の値か。target: 目標量・飲酒ガイドラインなどの目安／upper: 耐容上限量
  limitKind: 'target' | 'upper'
  // amount がサプリの分だけの量（上限がサプリなど通常の食品以外の分だけにかかる栄養素）
  supplementOnly?: boolean
  unit: string
  // いちばん多く寄与している区分
  topSlot: Slot | null
}

// カロリー超過の目安：目標の +15% 超（アプリ独自）
export const ENERGY_OVER_FACTOR = 1.15
// 上限の 80% を超えたら「注意」
const WARN_FACTOR = 0.8

function topSlot(totals: MenuTotals, key: NutrientKey): Slot | null {
  let best: Slot | null = null
  let max = 0
  for (const [slot, t] of Object.entries(totals.bySlot) as [Slot, MenuTotals['day']][]) {
    if (t.values[key] > max) {
      max = t.values[key]
      best = slot
    }
  }
  return best
}

function check(
  key: Alert['key'],
  nutrient: NutrientKey,
  amount: number,
  limit: number,
  unit: string,
  totals: MenuTotals,
  // 原典が「〜未満」「〜以上でリスク」の値は、ちょうど上限でも超過として扱う
  overAtLimit = false,
  limitKind: Alert['limitKind'] = 'target',
): Alert | null {
  const base = { key, amount, limit, limitKind, unit, topSlot: topSlot(totals, nutrient) }
  if (overAtLimit ? amount >= limit : amount > limit) return { ...base, level: 'over' }
  if (amount > limit * WARN_FACTOR) return { ...base, level: 'warn' }
  return null
}

// 耐容上限量のある栄養素（カルシウム・ビタミンD・レチノールなど）。サプリを含む1日の合計で判定する。
// マグネシウム・ナイアシン・葉酸の上限はサプリなど通常の食品以外の分だけにかかるので、サプリの分だけで判定する
function upperLimitAlerts(totals: MenuTotals, targets: Targets): (Alert | null)[] {
  return CHECKED_NUTRIENTS.map((key) => {
    const target = targets.nutrients[key]
    const upper = tolerableUpper(target)
    if (upper === null) return null
    if (upperScopeOf(target) === 'supplement') {
      const a = check(key, key, totals.supplement.values[key], upper, UNIT[key], totals, false, 'upper')
      return a && { ...a, supplementOnly: true }
    }
    return check(key, key, totals.day.values[key], upper, UNIT[key], totals, false, 'upper')
  })
}

// アラートの単位（表示名・桁は components/labels.ts）
const UNIT: Record<CheckedNutrient, string> = {
  salt: 'g', satFat: 'g', alcohol: 'g', fiber: 'g', potassium: 'mg', calcium: 'mg', iron: 'mg',
  magnesium: 'mg', zinc: 'mg', vitaminA: 'µg', retinol: 'µg', vitaminD: 'µg', vitaminE: 'mg',
  vitaminB1: 'mg', vitaminB2: 'mg', niacin: 'mg', vitaminB6: 'mg', folate: 'µg', vitaminC: 'mg',
  n3Fat: 'g', n6Fat: 'g', monoUnsatFat: 'g', polyUnsatFat: 'g',
}

export function computeAlerts(totals: MenuTotals, targets: Targets): Alert[] {
  const v = totals.day.values
  return [
    // 耐容上限量こえは健康障害のおそれがあるので先に出す
    ...upperLimitAlerts(totals, targets),
    check('salt', 'salt', v.salt, targets.saltMax, 'g', totals, true),
    check('alcohol', 'alcohol', v.alcohol, targets.alcoholRiskG, 'g', totals, true),
    check('satFat', 'satFat', v.satFat, targets.satFatMaxG, 'g', totals),
    v.energyKcal > targets.energyKcal * ENERGY_OVER_FACTOR
      ? {
          key: 'energy' as const,
          level: 'over' as const,
          amount: v.energyKcal,
          limit: targets.energyKcal,
          limitKind: 'target' as const,
          unit: 'kcal',
          topSlot: topSlot(totals, 'energyKcal'),
        }
      : null,
  ].filter((a): a is Alert => a !== null)
}

export type Mood = 'happy' | 'okay' | 'worried'

// マスコットの表情。カロリー差・PFC範囲内の数・超過アラート数で決める
export function balanceMood(totals: MenuTotals, targets: Targets, alerts: Alert[]): Mood {
  const v = totals.day.values
  if (v.energyKcal === 0) return 'okay'
  const ratio = pfcRatio(v)
  const inRange = (x: number, r: { lo: number; hi: number }) => x >= r.lo && x <= r.hi
  const pfcOk = ratio
    ? [inRange(ratio.p, targets.pfcRatio.p), inRange(ratio.f, targets.pfcRatio.f), inRange(ratio.c, targets.pfcRatio.c)].filter(Boolean)
        .length
    : 0
  const energyDiff = Math.abs(v.energyKcal - targets.energyKcal) / targets.energyKcal
  const overs = alerts.filter((a) => a.level === 'over').length
  if (overs === 0 && pfcOk === 3 && energyDiff <= 0.1) return 'happy'
  if (overs >= 2 || pfcOk <= 1 || energyDiff > 0.25) return 'worried'
  return 'okay'
}
