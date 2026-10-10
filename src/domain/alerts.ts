import { pfcRatio } from './nutrition'
import type { MenuTotals } from './nutrition'
import type { Targets } from './targets'
import type { NutrientKey, Slot } from './types'

export type AlertLevel = 'warn' | 'over'

export type Alert = {
  key: 'salt' | 'alcohol' | 'satFat' | 'energy'
  level: AlertLevel
  amount: number
  limit: number
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
): Alert | null {
  if (overAtLimit ? amount >= limit : amount > limit) return { key, level: 'over', amount, limit, unit, topSlot: topSlot(totals, nutrient) }
  if (amount > limit * WARN_FACTOR) return { key, level: 'warn', amount, limit, unit, topSlot: topSlot(totals, nutrient) }
  return null
}

export function computeAlerts(totals: MenuTotals, targets: Targets): Alert[] {
  const v = totals.day.values
  return [
    check('salt', 'salt', v.salt, targets.saltMax, 'g', totals, true),
    check('alcohol', 'alcohol', v.alcohol, targets.alcoholRiskG, 'g', totals, true),
    check('satFat', 'satFat', v.satFat, targets.satFatMaxG, 'g', totals),
    v.energyKcal > targets.energyKcal * ENERGY_OVER_FACTOR
      ? {
          key: 'energy' as const,
          level: 'over' as const,
          amount: v.energyKcal,
          limit: targets.energyKcal,
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
