// 食材の「1回に食べる量」の目安。ルールは src/data/serving-sizes.json（アプリが決めた目安で、公的な基準ではない）
import rulesJson from '../data/serving-sizes.json'
import type { Food } from './types'

export type ServingRule = {
  group?: string
  match: string[]
  unlessMatch?: string[]
  grams: number
  label: string
  // 名前に「乾」を含む食品だけ別の量にする（めんの乾・ゆでなど）
  dryGrams?: number
  dryLabel?: string
}

export type ServingRules = {
  overrides: Record<string, { grams: number; label: string }>
  rules: ServingRule[]
  groupDefaults: Record<string, number>
  groupDefaultLabels: Record<string, string>
}

export type Serving = { grams: number; label: string }

export const SERVING_RULES = rulesJson as ServingRules

// 「=」で始まる語は、食品名を全角空白で区切った語と完全一致させる（「=油揚げ」は［豆腐・油揚げ類］に当たらない）
function hits(name: string, words: string[]): boolean {
  const terms = name.split(/[\u3000 ]+/)
  return words.some((w) => (w.startsWith('=') ? terms.includes(w.slice(1)) : name.includes(w)))
}

export function servingFor(food: Pick<Food, 'id' | 'name' | 'group'>, rules: ServingRules = SERVING_RULES): Serving {
  const fixed = rules.overrides[food.id]
  if (fixed) return fixed
  for (const r of rules.rules) {
    if (r.group && r.group !== food.group) continue
    if (!hits(food.name, r.match)) continue
    if (r.unlessMatch && hits(food.name, r.unlessMatch)) continue
    if (r.dryGrams && food.name.includes('乾')) return { grams: r.dryGrams, label: r.dryLabel ?? r.label }
    return { grams: r.grams, label: r.label }
  }
  return { grams: rules.groupDefaults[food.group] ?? 50, label: rules.groupDefaultLabels[food.group] ?? '1食分' }
}
