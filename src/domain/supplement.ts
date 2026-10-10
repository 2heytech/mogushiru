// サプリメント。成分のデータ源がないので、ラベルの「1日あたり（1回分）」の値を手入力して登録する。
// 市販品（Product）の一種として保存し、カテゴリで見分ける。1日の食事には kind: 'supplement' の項目として入る
import { NUTRIENT_KEYS, type NutrientKey, type Nutrients, type Product } from './types'

export const SUPPLEMENT_CATEGORY = 'supplement'

export const isSupplement = (p: Pick<Product, 'category'> | undefined): boolean => p?.category === SUPPLEMENT_CATEGORY

// 入力欄は NUTRIENT_KEYS から作る（栄養素が増えたら、ビタミン・ミネラルの欄に自動で出る）。
// 「そのほか」に回すもの（カロリー・PFCなど、サプリではたまにしか書かれていないもの）
export const SUPPLEMENT_OTHER_KEYS: NutrientKey[] = ['n3Fat', 'energyKcal', 'protein', 'fat', 'carb', 'fiber', 'salt']
// 入力しないもの：サプリで表示されることがまずないもの・ほかの値から決めるもの
const NOT_INPUT: NutrientKey[] = ['alcohol', 'satFat', 'monoUnsatFat', 'polyUnsatFat', 'n6Fat', 'retinol']

// ビタミン・ミネラルなど、サプリのラベルの主な成分
export const SUPPLEMENT_MAIN_KEYS: NutrientKey[] = NUTRIENT_KEYS.filter((k) => !SUPPLEMENT_OTHER_KEYS.includes(k) && !NOT_INPUT.includes(k))
export const SUPPLEMENT_KEYS: NutrientKey[] = [...SUPPLEMENT_MAIN_KEYS, ...SUPPLEMENT_OTHER_KEYS]

export type SupplementValues = Partial<Record<NutrientKey, number | null>>

// ラベルの値（空欄は入っていない）から栄養素をつくる。
// サプリは載っている成分がすべてなので、空欄は未収録（null）でなく 0 にする。
// こうしておくと、サプリを足しても1日の合計が「一部未収録」にならない。
// ビタミンAは、β-カロテン由来と分かるとき以外はレチノールとして扱う（耐容上限量の判定に入れるため）
export function supplementNutrients(values: SupplementValues, opts: { vitaminAFromCarotene?: boolean } = {}): Nutrients {
  const n = Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, 0])) as Nutrients
  for (const k of SUPPLEMENT_KEYS) {
    const v = values[k]
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) n[k] = v
  }
  // n-3系は多価不飽和脂肪酸の一部
  n.polyUnsatFat = n.n3Fat
  n.retinol = opts.vitaminAFromCarotene ? 0 : n.vitaminA
  return n
}

// 登録済みのサプリのビタミンAが β-カロテン由来か（レチノールが 0 なのにビタミンAがある）
export const vitaminAFromCarotene = (n: Nutrients): boolean => (n.vitaminA ?? 0) > 0 && (n.retinol ?? 0) === 0

export const hasAnyNutrient = (n: Nutrients): boolean => SUPPLEMENT_KEYS.some((k) => (n[k] ?? 0) > 0)

// 国際単位（IU）しか書かれていないとき用の換算
export const IU = {
  vitaminA: 0.3, // レチノール 1IU = 0.3µg
  vitaminD: 0.025, // 1IU = 0.025µg
} as const
