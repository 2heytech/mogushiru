import { pfcRatio } from './nutrition'
import type { Targets } from './targets'
import { SLOTS, type NutrientTotals, type Slot } from './types'

// 1日の目標カロリーを区分に割り振る目安の初期値（朝:昼:晩:その他 = 25:35:30:10）。
// 食事摂取基準には区分ごとの値がないため、アプリ独自の目安として扱う。プロフィールで変えられる
export const SLOT_ENERGY_SHARE: Record<Slot, number> = { breakfast: 0.25, lunch: 0.35, dinner: 0.3, other: 0.1 }
export const DEFAULT_SLOT_SHARE_PERCENT: Record<Slot, number> = { breakfast: 25, lunch: 35, dinner: 30, other: 10 }

// プロフィールの配分（％）を割合（合計1）にする。未設定・不正な値なら初期値
export function slotShareFromPercent(percent: Record<Slot, number> | undefined): Record<Slot, number> {
  if (!percent) return SLOT_ENERGY_SHARE
  const values = SLOTS.map((s) => percent[s])
  if (values.some((v) => typeof v !== 'number' || !Number.isFinite(v) || v < 0)) return SLOT_ENERGY_SHARE
  const sum = values.reduce((a, b) => a + b, 0)
  if (sum <= 0) return SLOT_ENERGY_SHARE
  return Object.fromEntries(SLOTS.map((s) => [s, percent[s] / sum])) as Record<Slot, number>
}

// 区分の目安から ±この割合までは「ちょうどいい」
export const SLOT_ENERGY_TOLERANCE = 0.2

export type EnergyLevel = 'empty' | 'low' | 'ok' | 'high'
export type PfcKey = 'p' | 'f' | 'c'
// gap は目標範囲からのずれ（％ポイント）。少なければマイナス、多ければプラス
export type PfcHint = { key: PfcKey; direction: 'low' | 'high'; gap: number }

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
  const targetKcal = Math.round((targets.energyKcal * targets.slotShare[slot]) / 10) * 10
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
  const hints: PfcHint[] = []
  if (ratio && slot !== 'other') {
    for (const key of ['p', 'f', 'c'] as const) {
      const r = targets.pfcRatio[key]
      if (ratio[key] < r.lo) hints.push({ key, direction: 'low', gap: ratio[key] - r.lo })
      else if (ratio[key] > r.hi) hints.push({ key, direction: 'high', gap: ratio[key] - r.hi })
    }
  }
  hints.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
  return { kcal, targetKcal, energy, ratio, hints }
}
