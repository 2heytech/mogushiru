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

// カフェインの1日の摂取量の目安（mg/日、この量まで）。日本の食事摂取基準には値がないため海外の評価を使う
// 出典：欧州食品安全機関（EFSA）Scientific Opinion on the safety of caffeine（2015）、
//       カナダ保健省（Health Canada）Caffeine in Food。
//       いずれも農林水産省「カフェインの過剰摂取について」
//       https://www.maff.go.jp/j/syouan/seisaku/risk_analysis/priority/hazard_chem/caffeine.html で紹介されている。
// 健康な大人は 400 mg/日まで（EFSA・カナダ保健省）。18歳未満は体重1kgあたり 2.5 mg/日まで（カナダ保健省）。
// 妊娠中・授乳中は 200 mg/日まで（EFSA）だが、アプリのプロフィールに妊娠の有無がないので注記だけにする
export const CAFFEINE_MAX_ADULT = 400
export const CAFFEINE_MAX_PER_KG_UNDER18 = 2.5
export const CAFFEINE_MAX_PREGNANT = 200

export function pick<T extends AgeBand>(rows: T[], age: number): T {
  const row = rows.find((r) => age >= r.min && age <= r.max)
  if (!row) throw new Error(`対応していない年齢: ${age}`)
  return row
}

// ---- ビタミン・ミネラル・脂肪酸（18歳以上の行のみ） ----
// 18歳未満も MIN_SUPPORTED_AGE（18歳）の行を使うため、小児の行は持たない

// n-6系脂肪酸の目安量（g/日）
// 出典：報告書「1-3 脂質」n-6系脂肪酸の食事摂取基準（g/日）の表（p.128）
export const N6_AI: Row<number>[] = [
  { min: 18, max: 29, male: 12, female: 9 },
  { min: 30, max: 49, male: 11, female: 9 },
  { min: 50, max: 64, male: 11, female: 9 },
  { min: 65, max: 74, male: 10, female: 9 },
  { min: 75, max: 150, male: 9, female: 8 },
]

// n-3系脂肪酸の目安量（g/日）
// 出典：報告書「1-3 脂質」n-3系脂肪酸の食事摂取基準（g/日）の表（p.128）
export const N3_AI: Row<number>[] = [
  { min: 18, max: 29, male: 2.2, female: 1.7 },
  { min: 30, max: 49, male: 2.2, female: 1.7 },
  { min: 50, max: 64, male: 2.3, female: 1.9 },
  { min: 65, max: 74, male: 2.3, female: 2.0 },
  { min: 75, max: 150, male: 2.3, female: 2.0 },
]
// 一価不飽和脂肪酸・多価不飽和脂肪酸（合計）には食事摂取基準の指標がない

// ビタミンAの推奨量（µgRAE/日）
// 出典：報告書「1-6 ビタミン」ビタミンAの食事摂取基準（µgRAE/日）の表（p.181）
// 耐容上限量 2,700 µgRAE/日は「プロビタミンAカロテノイドを含まない」（同表 脚注3）。
// 成分表のレチノール活性当量はβ-カロテン由来の分を含むので、上限はレチノール（RETOL）と比べる
export const VITAMIN_A_UL = 2700
export const VITAMIN_A_RDA: Row<number>[] = [
  { min: 18, max: 29, male: 850, female: 650 },
  { min: 30, max: 49, male: 900, female: 700 },
  { min: 50, max: 64, male: 900, female: 700 },
  { min: 65, max: 74, male: 850, female: 700 },
  { min: 75, max: 150, male: 800, female: 650 },
]

// ビタミンDの目安量・耐容上限量（µg/日、18歳以上は男女・年齢で同じ）
// 出典：報告書「1-6 ビタミン」ビタミンDの食事摂取基準（µg/日）の表（p.182）
export const VITAMIN_D_AI = 9.0
export const VITAMIN_D_UL = 100

// ビタミンB1の推奨量（mg/日、チアミン塩化物塩酸塩相当量）
// 出典：報告書「1-6 ビタミン」ビタミンB1の食事摂取基準（mg/日）の表（p.234）。
// 身体活動レベル「ふつう」の推定エネルギー必要量で算定された値
export const VITAMIN_B1_RDA: Row<number>[] = [
  { min: 18, max: 29, male: 1.1, female: 0.8 },
  { min: 30, max: 49, male: 1.2, female: 0.9 },
  { min: 50, max: 64, male: 1.1, female: 0.8 },
  { min: 65, max: 74, male: 1.0, female: 0.8 },
  { min: 75, max: 150, male: 1.0, female: 0.7 },
]

// ビタミンB2の推奨量（mg/日）
// 出典：報告書「1-6 ビタミン」ビタミンB2の食事摂取基準（mg/日）の表（p.235）
export const VITAMIN_B2_RDA: Row<number>[] = [
  { min: 18, max: 29, male: 1.6, female: 1.2 },
  { min: 30, max: 49, male: 1.7, female: 1.2 },
  { min: 50, max: 64, male: 1.6, female: 1.2 },
  { min: 65, max: 74, male: 1.4, female: 1.1 },
  { min: 75, max: 150, male: 1.4, female: 1.1 },
]

// ビタミンCの推奨量（mg/日、18歳以上は男女・年齢で同じ）
// 出典：報告書「1-6 ビタミン」ビタミンCの食事摂取基準（mg/日）の表（p.242）
export const VITAMIN_C_RDA = 100

// カリウムの目標量（mg/日以上）。生活習慣病の予防のための値で、目安量（男性2,500・女性2,000）より多い
// 出典：報告書「1-7 ミネラル」カリウムの食事摂取基準（mg/日）の表（p.282）
export const POTASSIUM_DG: Record<Sex, number> = { male: 3000, female: 2600 }

// カルシウムの推奨量（mg/日）と耐容上限量（2,500 mg/日、18歳以上で同じ）
// 出典：報告書「1-7 ミネラル」カルシウムの食事摂取基準（mg/日）の表（p.283）
export const CALCIUM_RDA: Row<number>[] = [
  { min: 18, max: 29, male: 800, female: 650 },
  { min: 30, max: 49, male: 750, female: 650 },
  { min: 50, max: 64, male: 750, female: 650 },
  { min: 65, max: 74, male: 750, female: 650 },
  { min: 75, max: 150, male: 750, female: 600 },
]
export const CALCIUM_UL = 2500

// 鉄の推奨量（mg/日）。女性は月経の有無で分かれ、「月経あり」は64歳まで。
// 成人の耐容上限量は設定されていない
// 出典：報告書「1-7 ミネラル」鉄の食事摂取基準（mg/日）の表（p.345）
export const IRON_RDA: (AgeBand & { male: number; female: number; femaleMenstruating: number | null })[] = [
  { min: 18, max: 29, male: 7.0, female: 6.0, femaleMenstruating: 10.0 },
  { min: 30, max: 49, male: 7.5, female: 6.0, femaleMenstruating: 10.5 },
  { min: 50, max: 64, male: 7.0, female: 6.0, femaleMenstruating: 10.5 },
  { min: 65, max: 74, male: 7.0, female: 6.0, femaleMenstruating: null },
  { min: 75, max: 150, male: 6.5, female: 5.5, femaleMenstruating: null },
]

// ---- 2026-10 追加（サプリメントに多い栄養素）。各表と1行ずつ照合済み ----
// 耐容上限量には「食事を含む全量」にかかるものと、「通常の食品以外（サプリメント・強化食品）
// からの摂取量」だけにかかるものがある。後者は targets.ts で upperScope: 'supplement' にする

// マグネシウムの推奨量（mg/日）
// 出典：報告書「1-7 ミネラル」マグネシウムの食事摂取基準（mg/日）の表（p.284）。
// 耐容上限量 350 mg/日（成人）は通常の食品以外からの摂取量だけにかかる（同表 脚注1）。
// 通常の食品からの摂取には耐容上限量は設定されていない
export const MAGNESIUM_RDA: Row<number>[] = [
  { min: 18, max: 29, male: 340, female: 280 },
  { min: 30, max: 49, male: 380, female: 290 },
  { min: 50, max: 64, male: 370, female: 290 },
  { min: 65, max: 74, male: 350, female: 280 },
  { min: 75, max: 150, male: 330, female: 270 },
]
export const MAGNESIUM_SUPPLEMENT_UL = 350

// 亜鉛の推奨量・耐容上限量（mg/日）。上限は食事を含む全量にかかる
// 出典：報告書「1-8 ミネラル（微量ミネラル）」亜鉛の食事摂取基準（mg/日）の表（p.346）
export const ZINC_RDA: Row<number>[] = [
  { min: 18, max: 29, male: 9.0, female: 7.5 },
  { min: 30, max: 49, male: 9.5, female: 8.0 },
  { min: 50, max: 64, male: 9.5, female: 8.0 },
  { min: 65, max: 74, male: 9.0, female: 7.5 },
  { min: 75, max: 150, male: 9.0, female: 7.0 },
]
export const ZINC_UL: Row<number>[] = [
  { min: 18, max: 29, male: 40, female: 35 },
  { min: 30, max: 49, male: 45, female: 35 },
  { min: 50, max: 64, male: 45, female: 35 },
  { min: 65, max: 74, male: 45, female: 35 },
  { min: 75, max: 150, male: 40, female: 35 },
]

// ビタミンEの目安量・耐容上限量（mg/日、α-トコフェロール）。上限は食事を含む全量にかかる
// 出典：報告書「1-6 ビタミン」ビタミンEの食事摂取基準（mg/日）の表（p.183）
export const VITAMIN_E_AI: Row<number>[] = [
  { min: 18, max: 29, male: 6.5, female: 5.0 },
  { min: 30, max: 49, male: 6.5, female: 6.0 },
  { min: 50, max: 64, male: 6.5, female: 6.0 },
  { min: 65, max: 74, male: 7.5, female: 7.0 },
  { min: 75, max: 150, male: 7.0, female: 6.0 },
]
export const VITAMIN_E_UL: Row<number>[] = [
  { min: 18, max: 29, male: 800, female: 650 },
  { min: 30, max: 49, male: 800, female: 700 },
  { min: 50, max: 64, male: 800, female: 700 },
  { min: 65, max: 74, male: 800, female: 700 },
  { min: 75, max: 150, male: 800, female: 650 },
]

// ナイアシンの推奨量（mgNE/日）と耐容上限量（mg/日）
// 出典：報告書「1-6 ビタミン」ナイアシンの食事摂取基準（mgNE/日）の表（p.236）。
// 耐容上限量はニコチンアミドの重量で、（ ）内のニコチン酸の値は使わない（同表 脚注3）。
// 耐容上限量は強化食品・サプリメント由来のニコチンアミド・ニコチン酸に対する値で、
// 通常の食品からの摂取には適用しない（報告書「1-6 ビタミン」3-2-2 耐容上限量の策定方法、p.196）
export const NIACIN_RDA: Row<number>[] = [
  { min: 18, max: 29, male: 15, female: 11 },
  { min: 30, max: 49, male: 16, female: 12 },
  { min: 50, max: 64, male: 15, female: 11 },
  { min: 65, max: 74, male: 14, female: 11 },
  { min: 75, max: 150, male: 13, female: 10 },
]
export const NIACIN_SUPPLEMENT_UL: Row<number>[] = [
  { min: 18, max: 29, male: 300, female: 250 },
  { min: 30, max: 49, male: 350, female: 250 },
  { min: 50, max: 64, male: 350, female: 250 },
  { min: 65, max: 74, male: 300, female: 250 },
  { min: 75, max: 150, male: 300, female: 250 },
]

// ビタミンB6の推奨量・耐容上限量（mg/日）。上限はピリドキシンとしての量で、食事を含む全量にかかる
// 出典：報告書「1-6 ビタミン」ビタミンB6の食事摂取基準（mg/日）の表（p.237）
export const VITAMIN_B6_RDA: Row<number>[] = [
  { min: 18, max: 29, male: 1.5, female: 1.2 },
  { min: 30, max: 49, male: 1.5, female: 1.2 },
  { min: 50, max: 64, male: 1.5, female: 1.2 },
  { min: 65, max: 74, male: 1.4, female: 1.2 },
  { min: 75, max: 150, male: 1.4, female: 1.2 },
]
export const VITAMIN_B6_UL: Row<number>[] = [
  { min: 18, max: 29, male: 55, female: 45 },
  { min: 30, max: 49, male: 60, female: 45 },
  { min: 50, max: 64, male: 60, female: 45 },
  { min: 65, max: 74, male: 55, female: 45 },
  { min: 75, max: 150, male: 50, female: 40 },
]

// 葉酸の推奨量（µg/日、18歳以上は男女・年齢で同じ）と耐容上限量（µg/日、男女共通）
// 出典：報告書「1-6 ビタミン」葉酸の食事摂取基準（µg/日）の表（p.239）。
// 耐容上限量は「通常の食品以外の食品に含まれる葉酸に適用する」（同表 脚注2）。
// サプリメントや強化食品の葉酸（プテロイルモノグルタミン酸）にかかる値で、通常の食品の葉酸には適用しない
export const FOLATE_RDA = 240
export const FOLATE_SUPPLEMENT_UL: (AgeBand & { value: number })[] = [
  { min: 18, max: 29, value: 900 },
  { min: 30, max: 49, value: 1000 },
  { min: 50, max: 64, value: 1000 },
  { min: 65, max: 74, value: 900 },
  { min: 75, max: 150, value: 900 },
]
