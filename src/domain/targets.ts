import {
  ALCOHOL_RISK,
  BMR_PER_KG,
  CALCIUM_RDA,
  CALCIUM_UL,
  CARB_RATIO,
  FAT_RATIO,
  FIBER_MIN,
  FOLATE_RDA,
  FOLATE_SUPPLEMENT_UL,
  IRON_RDA,
  MAGNESIUM_RDA,
  MAGNESIUM_SUPPLEMENT_UL,
  NIACIN_RDA,
  NIACIN_SUPPLEMENT_UL,
  N3_AI,
  N6_AI,
  POTASSIUM_DG,
  VITAMIN_A_RDA,
  VITAMIN_A_UL,
  VITAMIN_B1_RDA,
  VITAMIN_B2_RDA,
  VITAMIN_C_RDA,
  VITAMIN_D_AI,
  VITAMIN_D_UL,
  VITAMIN_B6_RDA,
  VITAMIN_B6_UL,
  VITAMIN_E_AI,
  VITAMIN_E_UL,
  ZINC_RDA,
  ZINC_UL,
  MIN_SUPPORTED_AGE,
  PAL,
  PROTEIN_RATIO,
  REFERENCE_WEIGHT,
  SALT_MAX,
  SAT_FAT_RATIO_MAX,
  pick,
} from './dri'
import { slotShareFromPercent } from './slotBalance'
import type { Goal, NutrientKey, Profile, Slot } from './types'

export type Range = { lo: number; hi: number }

// PFC以外の栄養素の目安。食事摂取基準のどの指標かを basis に持つ
export type NutrientTarget =
  // これ以上とりたい（推奨量・目安量・目標量の下限）。upper は耐容上限量。
  // upperScope: 'supplement' は、上限がサプリメントなど通常の食品以外からとる分だけにかかるもの
  // （マグネシウム・ナイアシン・葉酸）。省略時は食事を含む全量にかかる
  | { kind: 'min'; value: number; basis: '推奨量' | '目安量' | '目標量'; upper?: number; upperScope?: UpperScope }
  // これより少なくしたい。overAtLimit は「〜未満」「〜以上でリスク」のように、ちょうどでも超過とするもの
  // 耐容上限量だけがある（ビタミンAのうちレチノール）ものも basis: '耐容上限量' でここに入る
  | { kind: 'max'; value: number; basis: '目標量' | '飲酒ガイドライン' | '耐容上限量'; overAtLimit: boolean }
  // 食事摂取基準に指標がない
  | { kind: 'none' }

export type UpperScope = 'all' | 'supplement'

// PFC（エネルギー・たんぱく質・脂質・炭水化物）はPFCバランスで別に扱う
export type CheckedNutrient = Exclude<NutrientKey, 'energyKcal' | 'protein' | 'fat' | 'carb'>

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
  nutrients: Record<CheckedNutrient, NutrientTarget>
  // 1日の目安を区分に分ける割合（合計1）。区分の目安カロリー・栄養素の目安に使う
  slotShare: Record<Slot, number>
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

// 女性の鉄：月経の有無が未設定なら50歳未満は「あり」とみなす。65歳以上は原典に「月経あり」の区分がない
function ironRda(profile: Profile, age: number): number {
  const row = pick(IRON_RDA, age)
  if (profile.sex === 'male') return row.male
  const menstruating = profile.menstruation ?? age < 50
  return menstruating && row.femaleMenstruating !== null ? row.femaleMenstruating : row.female
}

function nutrientTargets(profile: Profile, age: number, kcal: number): Record<CheckedNutrient, NutrientTarget> {
  const sex = profile.sex
  return {
    fiber: { kind: 'min', value: pick(FIBER_MIN, age)[sex], basis: '目標量' },
    salt: { kind: 'max', value: SALT_MAX[sex], basis: '目標量', overAtLimit: true },
    alcohol: { kind: 'max', value: ALCOHOL_RISK[sex], basis: '飲酒ガイドライン', overAtLimit: true },
    satFat: { kind: 'max', value: (kcal * SAT_FAT_RATIO_MAX) / 100 / 9, basis: '目標量', overAtLimit: false },
    monoUnsatFat: { kind: 'none' },
    polyUnsatFat: { kind: 'none' },
    n3Fat: { kind: 'min', value: pick(N3_AI, age)[sex], basis: '目安量' },
    n6Fat: { kind: 'min', value: pick(N6_AI, age)[sex], basis: '目安量' },
    potassium: { kind: 'min', value: POTASSIUM_DG[sex], basis: '目標量' },
    calcium: { kind: 'min', value: pick(CALCIUM_RDA, age)[sex], basis: '推奨量', upper: CALCIUM_UL },
    iron: { kind: 'min', value: ironRda(profile, age), basis: '推奨量' },
    magnesium: { kind: 'min', value: pick(MAGNESIUM_RDA, age)[sex], basis: '推奨量', upper: MAGNESIUM_SUPPLEMENT_UL, upperScope: 'supplement' },
    zinc: { kind: 'min', value: pick(ZINC_RDA, age)[sex], basis: '推奨量', upper: pick(ZINC_UL, age)[sex] },
    vitaminA: { kind: 'min', value: pick(VITAMIN_A_RDA, age)[sex], basis: '推奨量' },
    retinol: { kind: 'max', value: VITAMIN_A_UL, basis: '耐容上限量', overAtLimit: false },
    vitaminD: { kind: 'min', value: VITAMIN_D_AI, basis: '目安量', upper: VITAMIN_D_UL },
    vitaminE: { kind: 'min', value: pick(VITAMIN_E_AI, age)[sex], basis: '目安量', upper: pick(VITAMIN_E_UL, age)[sex] },
    vitaminB1: { kind: 'min', value: pick(VITAMIN_B1_RDA, age)[sex], basis: '推奨量' },
    vitaminB2: { kind: 'min', value: pick(VITAMIN_B2_RDA, age)[sex], basis: '推奨量' },
    niacin: { kind: 'min', value: pick(NIACIN_RDA, age)[sex], basis: '推奨量', upper: pick(NIACIN_SUPPLEMENT_UL, age)[sex], upperScope: 'supplement' },
    vitaminB6: { kind: 'min', value: pick(VITAMIN_B6_RDA, age)[sex], basis: '推奨量', upper: pick(VITAMIN_B6_UL, age)[sex] },
    folate: { kind: 'min', value: FOLATE_RDA, basis: '推奨量', upper: pick(FOLATE_SUPPLEMENT_UL, age).value, upperScope: 'supplement' },
    vitaminC: { kind: 'min', value: VITAMIN_C_RDA, basis: '推奨量' },
  }
}

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
    nutrients: nutrientTargets(profile, age, kcal),
    slotShare: slotShareFromPercent(profile.slotShare),
    usedReferenceWeight,
  }
}

// プロフィール未入力時の初期値
export const DEFAULT_PROFILE: Profile = { sex: 'female', age: 35, activity: 'normal' }
