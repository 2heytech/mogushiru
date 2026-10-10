import { pfcRatio } from './nutrition'
import type { Targets } from './targets'
import type { NutrientTotals, Slot } from './types'

// 1日の目標カロリーを区分に割り振る目安（朝:昼:晩:その他 = 25:35:30:10）。
// 食事摂取基準には区分ごとの値がないため、アプリ独自の目安として扱う
export const SLOT_ENERGY_SHARE: Record<Slot, number> = { breakfast: 0.25, lunch: 0.35, dinner: 0.3, other: 0.1 }

// 区分の目安から ±この割合までは「ちょうどいい」
export const SLOT_ENERGY_TOLERANCE = 0.2

export type EnergyLevel = 'empty' | 'low' | 'ok' | 'high'
export type PfcKey = 'p' | 'f' | 'c'
export type PfcHint = { key: PfcKey; direction: 'low' | 'high' }

export type SlotBalance = {
  kcal: number
  targetKcal: number
  energy: EnergyLevel
  ratio: { p: number; f: number; c: number } | null
  // 目標範囲から外れたもの。外れ幅の大きい順
  hints: PfcHint[]
}

export function slotBalance(totals: NutrientTotals, slot: Slot, targets: Targets): SlotBalance {
  const kcal = totals.values.energyKcal
  const targetKcal = Math.round((targets.energyKcal * SLOT_ENERGY_SHARE[slot]) / 10) * 10
  const energy: EnergyLevel =
    kcal <= 0
      ? 'empty'
      : kcal < targetKcal * (1 - SLOT_ENERGY_TOLERANCE) && slot !== 'other' // 間食は少なくても問題にしない
        ? 'low'
        : kcal > targetKcal * (1 + SLOT_ENERGY_TOLERANCE)
          ? 'high'
          : 'ok'
  const ratio = pfcRatio(totals.values)
  // その他（間食・飲み物）は1品だけのことが多く、PFCの偏りを言っても意味が薄いので判定しない
  const hints: (PfcHint & { gap: number })[] = []
  if (ratio && slot !== 'other') {
    for (const key of ['p', 'f', 'c'] as const) {
      const r = targets.pfcRatio[key]
      if (ratio[key] < r.lo) hints.push({ key, direction: 'low', gap: r.lo - ratio[key] })
      else if (ratio[key] > r.hi) hints.push({ key, direction: 'high', gap: ratio[key] - r.hi })
    }
  }
  hints.sort((a, b) => b.gap - a.gap)
  return { kcal, targetKcal, energy, ratio, hints: hints.map(({ key, direction }) => ({ key, direction })) }
}
