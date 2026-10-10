// 目標値テーブル
// 出典：厚生労働省「日本人の食事摂取基準（2025年版）」
//       厚生労働省「健康に配慮した飲酒に関するガイドライン」（2024年）
//
// 注意：以下の数値は設計時点の転記で、原典との照合が済んでいない（DRI_VERIFIED=false）。
// 公開前に原典の表と1行ずつ照合し、照合後に DRI_VERIFIED を true にする。
import type { Activity, Sex } from './types'

export const DRI_VERIFIED = false

export type AgeBand = { min: number; max: number }

type Row<T> = AgeBand & { male: T; female: T }

// 個人向けの計算は18歳以上に対応する（成長期のエネルギー蓄積量は扱わない）
export const MIN_SUPPORTED_AGE = 18

// 基礎代謝基準値（kcal/kg体重/日）
export const BMR_PER_KG: Row<number>[] = [
  { min: 18, max: 29, male: 23.7, female: 22.1 },
  { min: 30, max: 49, male: 22.5, female: 21.9 },
  { min: 50, max: 64, male: 21.8, female: 20.7 },
  { min: 65, max: 74, male: 21.6, female: 20.7 },
  { min: 75, max: 150, male: 21.5, female: 20.7 },
]

// 参照体重（kg）。体重未入力時に使う
export const REFERENCE_WEIGHT: Row<number>[] = [
  { min: 18, max: 29, male: 63.0, female: 51.0 },
  { min: 30, max: 49, male: 70.0, female: 53.3 },
  { min: 50, max: 64, male: 69.1, female: 54.0 },
  { min: 65, max: 74, male: 64.4, female: 52.6 },
  { min: 75, max: 150, male: 61.0, female: 49.3 },
]

// 身体活動レベル
export const PAL: (AgeBand & Record<Activity, number>)[] = [
  { min: 18, max: 64, low: 1.5, normal: 1.75, high: 2.0 },
  { min: 65, max: 74, low: 1.5, normal: 1.7, high: 1.9 },
  { min: 75, max: 150, low: 1.4, normal: 1.65, high: 1.65 },
]

// たんぱく質の目標量（エネルギー比％の下限・上限）
export const PROTEIN_RATIO: (AgeBand & { lo: number; hi: number })[] = [
  { min: 18, max: 49, lo: 13, hi: 20 },
  { min: 50, max: 64, lo: 14, hi: 20 },
  { min: 65, max: 150, lo: 15, hi: 20 },
]

export const FAT_RATIO = { lo: 20, hi: 30 }
export const CARB_RATIO = { lo: 50, hi: 65 }
export const SAT_FAT_RATIO_MAX = 7

// 食塩相当量の目標量（g/日未満）
export const SALT_MAX: Record<Sex, number> = { male: 7.5, female: 6.5 }

// 食物繊維の目標量（g/日以上）
export const FIBER_MIN: Row<number>[] = [
  { min: 18, max: 64, male: 22, female: 18 },
  { min: 65, max: 150, male: 20, female: 17 },
]

// 生活習慣病のリスクを高める飲酒量（純アルコール g/日）
export const ALCOHOL_RISK: Record<Sex, number> = { male: 40, female: 20 }

export function pick<T extends AgeBand>(rows: T[], age: number): T {
  const row = rows.find((r) => age >= r.min && age <= r.max)
  if (!row) throw new Error(`対応していない年齢: ${age}`)
  return row
}
