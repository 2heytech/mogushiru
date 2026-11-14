// 食塩とカリウムのつり合い（ナトカリ比＝ナトリウムとカリウムのモル比）。
//
// 出典
// - 日本高血圧学会「尿ナトカリ比の目標値に関するコンセンサスステートメント」（Hypertension Research、2024年10月）：
//   尿のナトカリ比は2未満が至適目標（食事摂取基準の食塩とカリウムの目標量に相当）、4未満が実現可能目標
// - 日本高血圧学会「高血圧管理・治療ガイドライン2025」：減塩とともにカリウムを多くとる（カリウム制限が要る腎臓病の人を除く）
//
// アプリでは食事の成分から計算する。尿の値とは同じにならない（ナトリウムは食べた量の90%以上、カリウムは70〜80%が尿に出る）ので、
// 目安は尿の値ではなく、食事摂取基準の目標量どおりに食べたときの比（男女とも約1.7）にする
import type { Targets } from './targets'

const NA_MG_PER_SALT_G = 1000 / 2.54 // 食塩相当量 = ナトリウム × 2.54
const NA_MOLAR = 22.99
const K_MOLAR = 39.1

// ナトカリ比（モル比）。カリウムが0なら計算できない
export function naKRatio(saltG: number, potassiumMg: number): number | null {
  if (potassiumMg <= 0) return null
  return (saltG * NA_MG_PER_SALT_G) / NA_MOLAR / (potassiumMg / K_MOLAR)
}

// 食事摂取基準の目標量（食塩はこれ未満、カリウムはこれ以上）どおりに食べたときの比。目標量がなければ null
export function targetNaKRatio(targets: Targets): number | null {
  const salt = targets.nutrients.salt
  const k = targets.nutrients.potassium
  if (salt.kind !== 'max' || k.kind !== 'min') return null
  return naKRatio(salt.value, k.value)
}
