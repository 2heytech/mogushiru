import {
  ALCOHOL_RISK,
  BMR_PER_KG,
  CARB_RATIO,
  FAT_RATIO,
  FIBER_MIN,
  MIN_SUPPORTED_AGE,
  PAL,
  PROTEIN_RATIO,
  REFERENCE_WEIGHT,
  SALT_MAX,
  SAT_FAT_RATIO_MAX,
  pick,
} from './dri'
import type { Goal, Profile } from './types'

export type Range = { lo: number; hi: number }

export type Targets = {
  energyKcal: number
  // エネルギー比（％）
  pfcRatio: { p: Range; f: Range; c: Range }
  // g換算（目標カロリーに対する範囲）
  pfcGrams: { p: Range; f: Range; c: Range }
  saltMax: number
  fiberMin: number
  satFatMaxG: number
  alcoholRiskG: number
  usedReferenceWeight: boolean
}

const GOAL_FACTOR: Record<Goal, number> = { lose: 0.9, keep: 1, gain: 1.1 }

export function estimatedEnergy(profile: Profile): { kcal: number; usedReferenceWeight: boolean } {
  const age = Math.max(profile.age, MIN_SUPPORTED_AGE)
  const bmrPerKg = pick(BMR_PER_KG, age)[profile.sex]
  const usedReferenceWeight = !profile.weightKg
  const weight = profile.weightKg ?? pick(REFERENCE_WEIGHT, age)[profile.sex]
  const pal = pick(PAL, age)[profile.activity]
  const kcal = bmrPerKg * weight * pal * GOAL_FACTOR[profile.goal ?? 'keep']
  return { kcal: Math.round(kcal / 10) * 10, usedReferenceWeight }
}

const toGrams = (kcal: number, r: Range, kcalPerG: number): Range => ({
  lo: (kcal * r.lo) / 100 / kcalPerG,
  hi: (kcal * r.hi) / 100 / kcalPerG,
})

export function computeTargets(profile: Profile): Targets {
  const age = Math.max(profile.age, MIN_SUPPORTED_AGE)
  const { kcal, usedReferenceWeight } = estimatedEnergy(profile)
  const p = pick(PROTEIN_RATIO, age)
  const pRange = { lo: p.lo, hi: p.hi }
  return {
    energyKcal: kcal,
    pfcRatio: { p: pRange, f: FAT_RATIO, c: CARB_RATIO },
    pfcGrams: {
      p: toGrams(kcal, pRange, 4),
      f: toGrams(kcal, FAT_RATIO, 9),
      c: toGrams(kcal, CARB_RATIO, 4),
    },
    saltMax: SALT_MAX[profile.sex],
    fiberMin: pick(FIBER_MIN, age)[profile.sex],
    satFatMaxG: (kcal * SAT_FAT_RATIO_MAX) / 100 / 9,
    alcoholRiskG: ALCOHOL_RISK[profile.sex],
    usedReferenceWeight,
  }
}

// プロフィール未入力時の初期値
export const DEFAULT_PROFILE: Profile = { sex: 'female', age: 35, activity: 'normal' }
