// 1日に使うカロリー（消費）と、食事のカロリー（摂取）を続けたときの体重の変化
//
// 出典：厚生労働省「健康づくりのための身体活動・運動ガイド2023」
//       https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/undou/index.html
//       ・「参考」生活活動のメッツ表・運動のメッツ表（p.38〜39。国立健康・栄養研究所
//         改訂版「身体活動のメッツ（METs）表」より改変）
//       ・推奨事項の説明「60分の歩行は約6,000歩に相当」（成人版。1,000歩≒10分として歩数を時間に直す）
//       ・INFORMATION 8「身体活動とエネルギー・栄養素について」：
//         体脂肪1kgを減らすのに必要なエネルギー量は約7,000kcal、
//         運動で使う分は「メッツ×時間(h)×体重(kg)」から安静時の分を引いた値
import { BMR_PER_KG, MIN_SUPPORTED_AGE, PAL, REFERENCE_WEIGHT, pick } from './dri'
import type { Exercise, Profile } from './types'

export type ExerciseGroup = 'walk' | 'run' | 'bike' | 'water' | 'gym' | 'sport' | 'other'

export const EXERCISE_GROUP_LABEL: Record<ExerciseGroup, string> = {
  walk: '歩く',
  run: '走る',
  bike: '自転車',
  water: '水泳・水中',
  gym: '体操・筋トレ',
  sport: 'スポーツ',
  other: 'そのほか',
}

// 運動の種類。mets はガイド2023のメッツ表の値。steps: true は歩数でも入れられるもの
export type ExerciseType = { id: string; label: string; mets: number; group: ExerciseGroup; steps?: boolean }

export const EXERCISE_TYPES: ExerciseType[] = [
  { id: 'walk', label: 'ウォーキング（ふつう・散歩）', mets: 3.5, group: 'walk', steps: true },
  { id: 'walk-brisk', label: 'ウォーキング（やや速歩き）', mets: 4.3, group: 'walk', steps: true },
  { id: 'walk-fast', label: 'ウォーキング（速歩き）', mets: 5.0, group: 'walk', steps: true },
  { id: 'stairs', label: '階段をのぼる（ゆっくり）', mets: 4.0, group: 'walk' },
  { id: 'hike', label: '山登り（軽い荷物）', mets: 6.5, group: 'walk' },
  { id: 'jog-slow', label: 'ゆっくりジョギング', mets: 6.0, group: 'run' },
  { id: 'jog', label: 'ジョギング', mets: 7.0, group: 'run' },
  { id: 'run', label: 'ランニング（時速8km）', mets: 8.3, group: 'run' },
  { id: 'run-fast', label: 'ランニング（時速10km）', mets: 9.8, group: 'run' },
  { id: 'bike', label: '自転車（通勤・買い物）', mets: 4.0, group: 'bike' },
  { id: 'cycling', label: 'サイクリング（時速20km）', mets: 8.0, group: 'bike' },
  { id: 'ergo-light', label: 'エアロバイク（30〜50W）', mets: 3.5, group: 'bike' },
  { id: 'ergo', label: 'エアロバイク（90〜100W）', mets: 6.8, group: 'bike' },
  { id: 'water-walk', label: '水中ウォーキング', mets: 4.5, group: 'water' },
  { id: 'aquabics', label: 'アクアビクス', mets: 5.3, group: 'water' },
  { id: 'swim-easy', label: '水泳（のんびり泳ぐ）', mets: 6.0, group: 'water' },
  { id: 'swim-crawl', label: '水泳（クロール）', mets: 8.3, group: 'water' },
  { id: 'radio', label: 'ラジオ体操第1', mets: 4.0, group: 'gym' },
  { id: 'home-exercise', label: '体操（家で・軽め）', mets: 3.5, group: 'gym' },
  { id: 'pilates', label: 'ピラティス', mets: 3.0, group: 'gym' },
  { id: 'taichi', label: '太極拳', mets: 3.0, group: 'gym' },
  { id: 'power-yoga', label: 'パワーヨガ', mets: 4.0, group: 'gym' },
  { id: 'aerobics', label: 'エアロビクス', mets: 7.3, group: 'gym' },
  { id: 'strength', label: '筋トレ（腕立て・腹筋）', mets: 3.8, group: 'gym' },
  { id: 'squat', label: '筋トレ（スクワット）', mets: 5.0, group: 'gym' },
  { id: 'weights', label: 'ウェイトトレーニング（高強度）', mets: 6.0, group: 'gym' },
  { id: 'dance', label: 'ダンス（バレエ・ジャズ）', mets: 5.0, group: 'gym' },
  { id: 'ballroom', label: '社交ダンス', mets: 3.0, group: 'gym' },
  { id: 'golf', label: 'ゴルフ（手引きカート）', mets: 3.5, group: 'sport' },
  { id: 'bowling', label: 'ボウリング', mets: 3.0, group: 'sport' },
  { id: 'volleyball', label: 'バレーボール', mets: 3.0, group: 'sport' },
  { id: 'table-tennis', label: '卓球', mets: 4.0, group: 'sport' },
  { id: 'tennis-doubles', label: 'テニス（ダブルス）', mets: 4.5, group: 'sport' },
  { id: 'tennis', label: 'テニス（シングルス）', mets: 7.3, group: 'sport' },
  { id: 'baseball', label: '野球・ソフトボール', mets: 5.0, group: 'sport' },
  { id: 'badminton', label: 'バドミントン', mets: 5.5, group: 'sport' },
  { id: 'basketball', label: 'バスケットボール', mets: 6.0, group: 'sport' },
  { id: 'soccer', label: 'サッカー', mets: 7.0, group: 'sport' },
  { id: 'skate', label: 'スケート', mets: 7.0, group: 'sport' },
  { id: 'custom', label: 'そのほか（メッツを入れる）', mets: 4.0, group: 'other' },
]

export const EXERCISE_TYPE = new Map(EXERCISE_TYPES.map((t) => [t.id, t]))

// 1,000歩 ≒ 10分（ガイド2023「60分の歩行は約6,000歩に相当」）
export const STEPS_PER_MINUTE = 100

// 体脂肪1kg ≒ 7,000kcal（ガイド2023 INFORMATION 8）
export const KCAL_PER_KG_FAT = 7000

export const exerciseMinutes = (e: Exercise): number => (e.steps !== undefined ? e.steps / STEPS_PER_MINUTE : e.minutes)

export const exerciseMets = (e: Exercise): number => e.mets ?? EXERCISE_TYPE.get(e.type)?.mets ?? 0

// 運動で使う分（1日あたり・体重1kgあたり）。安静時の1メッツ分は基礎代謝・ふだんの生活に入っているので引く
export function exerciseKcalPerKgPerDay(exercises: Exercise[] | undefined): number {
  return (exercises ?? []).reduce((sum, e) => {
    const mets = exerciseMets(e)
    if (mets <= 1) return sum
    return sum + ((mets - 1) * (exerciseMinutes(e) / 60) * e.perWeek) / 7
  }, 0)
}

// 1回の運動で使う分（kcal）
export const exerciseKcalPerSession = (e: Exercise, weightKg: number): number =>
  Math.max(exerciseMets(e) - 1, 0) * (exerciseMinutes(e) / 60) * weightKg

export type Expenditure = {
  weightKg: number
  usedReferenceWeight: boolean
  // 基礎代謝
  bmr: number
  // ふだんの生活（身体活動レベルのうち基礎代謝をこえる分。食事で使う分もふくむ）
  daily: number
  // 入れた運動（1日あたりにならした分）
  exercise: number
  total: number
  // 体重1kgあたりの消費。体重が変わると消費も比例して変わるとして体重の変化を計算する
  perKg: number
}

// 1日に使うカロリー。基礎代謝基準値×体重×身体活動レベル＋運動
export function expenditure(profile: Profile, weightKg?: number): Expenditure {
  const age = Math.max(profile.age, MIN_SUPPORTED_AGE)
  const bmrPerKg = pick(BMR_PER_KG, age)[profile.sex]
  const usedReferenceWeight = weightKg === undefined && !profile.weightKg
  const w = weightKg ?? profile.weightKg ?? pick(REFERENCE_WEIGHT, age)[profile.sex]
  const pal = pick(PAL, age)[profile.activity]
  const exPerKg = exerciseKcalPerKgPerDay(profile.exercises)
  const bmr = bmrPerKg * w
  const daily = bmr * (pal - 1)
  const exercise = exPerKg * w
  return { weightKg: w, usedReferenceWeight, bmr, daily, exercise, total: bmr + daily + exercise, perKg: bmrPerKg * pal + exPerKg }
}

export type WeightPoint = { day: number; weightKg: number }

export type WeightSimulation = {
  start: number
  // このまま続けたとき、体重が落ち着くところ（摂取＝消費になる体重）
  settle: number
  at: (day: number) => number
}

// 毎日 intakeKcal を食べ、運動を続けたときの体重。
// 体重が変わると消費も変わる（体重1kgあたりの消費 k は一定）として、
// dW/dt = (摂取 − k·W) / 7,000 を解く：W(t) = W∞ + (W0 − W∞)·e^(−k·t/7000)、W∞ = 摂取 / k
export function simulateWeight(intakeKcal: number, profile: Profile): WeightSimulation {
  const { weightKg: start, perKg } = expenditure(profile)
  const settle = intakeKcal / perKg
  return {
    start,
    settle,
    at: (day) => settle + (start - settle) * Math.exp((-perKg * day) / KCAL_PER_KG_FAT),
  }
}

// シミュレーションで見せる期間（日数）
export const SIM_PERIODS: { label: string; days: number }[] = [
  { label: '1か月後', days: 30 },
  { label: '3か月後', days: 91 },
  { label: '6か月後', days: 183 },
  { label: '1年後', days: 365 },
]

export const bmi = (weightKg: number, heightCm: number) => weightKg / (heightCm / 100) ** 2
