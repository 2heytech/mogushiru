// 食材の「1回に食べる量」の目安。ルールは src/data/serving-sizes.json（アプリが決めた目安で、公的な基準ではない。量のもとにしたものは JSON の $comment）
import rulesJson from '../data/serving-sizes.json'
import type { Food } from './types'

export type ServingRule = {
  group?: string
  // 食品名にどれかを含む
  match: string[]
  // 指定したときは、このうちどれかも含む（「めん」のうち「乾」のもの、のように状態でしぼる）
  also?: string[]
  // どれかを含むものは除く
  unlessMatch?: string[]
  grams: number
  label: string
}

export type ServingRules = {
  overrides: Record<string, { grams: number; label: string }>
  rules: ServingRule[]
  groupDefaults: Record<string, number>
  groupDefaultLabels: Record<string, string>
}

export type Serving = { grams: number; label: string }

export const SERVING_RULES = rulesJson as ServingRules

// 画面に出す、量の決め方の説明（アプリのランキングと /nutrients/ のページで同じ文を使う）
export const SERVING_NOTE =
  '「1回の量」は、農林水産省「食事バランスガイド」の早見表の量や、1個・1パック・大さじ1などの重さをもとにモグシルが決めた目安です（例：ごはん150g、焼きのり3g、しょうゆ6g）。'

// 「=」で始まる語は、食品名を全角空白で区切った語と完全一致させる（「=油揚げ」は［豆腐・油揚げ類］に当たらない）
function hits(name: string, words: string[]): boolean {
  const terms = name.split(/[　 ]+/)
  return words.some((w) => (w.startsWith('=') ? terms.includes(w.slice(1)) : name.includes(w)))
}

export function servingFor(food: Pick<Food, 'id' | 'name' | 'group'>, rules: ServingRules = SERVING_RULES): Serving {
  const fixed = rules.overrides[food.id]
  if (fixed) return fixed
  for (const r of rules.rules) {
    if (r.group && r.group !== food.group) continue
    if (!hits(food.name, r.match)) continue
    if (r.also && !hits(food.name, r.also)) continue
    if (r.unlessMatch && hits(food.name, r.unlessMatch)) continue
    return { grams: r.grams, label: r.label }
  }
  return { grams: rules.groupDefaults[food.group] ?? 50, label: rules.groupDefaultLabels[food.group] ?? '1食分' }
}
