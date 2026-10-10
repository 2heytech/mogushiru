// 目標値テーブル
// 出典：厚生労働省「日本人の食事摂取基準（2025年版）」策定検討会報告書
//       https://www.mhlw.go.jp/stf/newpage_44138.html
//       （ページは報告書の印刷ページ。正誤表 令和7年3月25日 版まで反映済み）
//       厚生労働省「健康に配慮した飲酒に関するガイドライン」（2024年2月）
//       https://www.mhlw.go.jp/stf/newpage_38541.html
//
// 2026-10 に各表と1行ずつ照合済み（DRI_VERIFIED=true）。
import type { Activity, Sex } from './types'

export const DRI_VERIFIED = true

export type AgeBand = { min: number; max: number }

type Row<T> = AgeBand & { male: T; female: T }

// 個人向けの計算は18歳以上に対応する（成長期のエネルギー蓄積量は扱わない）
export const MIN_SUPPORTED_AGE = 18

// 基礎代謝基準値（kcal/kg体重/日）
// 出典：報告書「1-1 エネルギー」表3 基礎代謝量基準値（p.66）の (A) 列
export const BMR_PER_KG: Row<number>[] = [
  { min: 18, max: 29, male: 23.7, female: 22.1 },
  { min: 30, max: 49, male: 22.5, female: 21.9 },
  { min: 50, max: 64, male: 21.8, female: 20.7 },
  { min: 65, max: 74, male: 21.6, female: 20.7 },
  { min: 75, max: 150, male: 21.5, female: 20.7 },
]

// 参照体重（kg）。体重未入力時に使う
// 出典：報告書「総論」表3 参照体位（参照身長、参照体重）（p.11）
export const REFERENCE_WEIGHT: Row<number>[] = [
  { min: 18, max: 29, male: 63.0, female: 51.0 },
  { min: 30, max: 49, male: 70.0, female: 53.3 },
  { min: 50, max: 64, male: 69.1, female: 54.0 },
  { min: 65, max: 74, male: 64.4, female: 52.6 },
  { min: 75, max: 150, male: 61.0, female: 49.3 },
]

// 身体活動レベル（男女共通）
// 出典：報告書「1-1 エネルギー」表4 年齢区分及び身体活動レベル（カテゴリー）別の
//       身体活動レベル基準値（p.67）
// 75歳以上は原典に「高い」の区分がない（「低い」「ふつう」のみ、p.68）。
// アプリでは「高い」を選んでも「ふつう」と同じ 1.70 を使う。
export const PAL: (AgeBand & Record<Activity, number>)[] = [
  { min: 18, max: 64, low: 1.5, normal: 1.75, high: 2.0 },
  { min: 65, max: 74, low: 1.5, normal: 1.7, high: 1.9 },
  { min: 75, max: 150, low: 1.4, normal: 1.7, high: 1.7 },
]

// エネルギー産生栄養素バランスの目標量（%エネルギー、男女共通）
// 出典：報告書「1-5 エネルギー産生栄養素バランス」
//       エネルギー産生栄養素バランス（%エネルギー）の表（p.149）
// たんぱく質（下限・上限）
export const PROTEIN_RATIO: (AgeBand & { lo: number; hi: number })[] = [
  { min: 18, max: 49, lo: 13, hi: 20 },
  { min: 50, max: 64, lo: 14, hi: 20 },
  { min: 65, max: 150, lo: 15, hi: 20 },
]

export const FAT_RATIO = { lo: 20, hi: 30 }
export const CARB_RATIO = { lo: 50, hi: 65 }
// 飽和脂肪酸は「7以下」（18歳以上）
export const SAT_FAT_RATIO_MAX = 7

// 食塩相当量の目標量（g/日未満、18歳以上は全年齢区分で同じ）
// 出典：報告書「1-7 ミネラル（多量ミネラル）」表1 ナトリウムの目標量
//       （食塩相当量：g/日）を算定した方法（p.248）の (D) 列
export const SALT_MAX: Record<Sex, number> = { male: 7.5, female: 6.5 }

// 食物繊維の目標量（g/日以上）
// 出典：報告書「1-4 炭水化物」食物繊維の食事摂取基準（g/日）の表（p.144）
export const FIBER_MIN: Row<number>[] = [
  { min: 18, max: 29, male: 20, female: 18 },
  { min: 30, max: 49, male: 22, female: 18 },
  { min: 50, max: 64, male: 22, female: 18 },
  { min: 65, max: 74, male: 21, female: 18 },
  { min: 75, max: 150, male: 20, female: 17 },
]

// 生活習慣病のリスクを高める飲酒量（純アルコール g/日、この量以上）
// 出典：「健康に配慮した飲酒に関するガイドライン」3（2）（p.4）。健康日本21（第三次）の
//       指標で、個々人の許容量を示したものではない
export const ALCOHOL_RISK: Record<Sex, number> = { male: 40, female: 20 }

export function pick<T extends AgeBand>(rows: T[], age: number): T {
  const row = rows.find((r) => age >= r.min && age <= r.max)
  if (!row) throw new Error(`対応していない年齢: ${age}`)
  return row
}
