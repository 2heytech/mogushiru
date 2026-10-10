// 食材の栄養素ランキング
// 「100gあたり」だけでなく、1回に食べる量・カロリー・価格あたりでも並べられるようにする
import { servingFor, type Serving } from './serving'
import type { Targets } from './targets'
import type { Food, NutrientKey } from './types'

export type RankingMetric = 'serving' | 'per100g' | 'per100kcal' | 'per100yen'

export const RANKING_METRICS: { key: RankingMetric; label: string; hint: string }[] = [
  { key: 'serving', label: '1回の量で', hint: 'ふだん1回に食べる量でくらべます。乾物や調味料のように一度にたくさん食べないものは下がります' },
  { key: 'per100g', label: '100gあたり', hint: '成分表の100gあたりの量でくらべます' },
  { key: 'per100kcal', label: '100kcalあたり', hint: 'カロリーをとりすぎずにとれる食材が上に来ます（100gあたり10kcal未満の食材は除きます）' },
  { key: 'per100yen', label: '100円あたり', hint: '店頭価格で、100円分に含まれる量でくらべます' },
]

export type RankingNutrient = { key: NutrientKey; label: string; unit: string; caution?: boolean }

export const RANKING_NUTRIENTS: RankingNutrient[] = [
  { key: 'protein', label: 'たんぱく質', unit: 'g' },
  { key: 'fiber', label: '食物繊維', unit: 'g' },
  { key: 'calcium', label: 'カルシウム', unit: 'mg' },
  { key: 'iron', label: '鉄', unit: 'mg' },
  { key: 'potassium', label: 'カリウム', unit: 'mg' },
  { key: 'vitaminA', label: 'ビタミンA', unit: 'µg' },
  { key: 'vitaminD', label: 'ビタミンD', unit: 'µg' },
  { key: 'vitaminB1', label: 'ビタミンB1', unit: 'mg' },
  { key: 'vitaminB2', label: 'ビタミンB2', unit: 'mg' },
  { key: 'vitaminC', label: 'ビタミンC', unit: 'mg' },
  { key: 'energyKcal', label: 'エネルギー', unit: 'kcal' },
  { key: 'fat', label: '脂質', unit: 'g' },
  { key: 'carb', label: '炭水化物', unit: 'g' },
  { key: 'salt', label: '食塩', unit: 'g', caution: true },
  { key: 'satFat', label: '飽和脂肪酸', unit: 'g', caution: true },
]

// 食品群の短い表示名（成分表の食品群番号）
export const FOOD_GROUP_LABEL: Record<string, string> = {
  '01': '穀類',
  '02': 'いも',
  '03': '砂糖・甘味',
  '04': '豆',
  '05': '種実',
  '06': '野菜',
  '07': '果物',
  '08': 'きのこ',
  '09': '海藻',
  '10': '魚介',
  '11': '肉',
  '12': '卵',
  '13': '乳',
  '14': '油脂',
  '15': '菓子',
  '16': '飲み物',
  '17': '調味料',
  '18': '調理済み',
}

// 食品番号 → 100gあたりの価格（円）
export type PriceTable = Map<string, { yenPer100g: number; item: string }>

export type RankingRow = {
  food: Food
  value: number
  serving: Serving
  servingAmount: number // 1回量に含まれる量
  yenPer100g?: number
}

export const MIN_KCAL_FOR_DENSITY = 10

export type RankingQuery = {
  nutrient: NutrientKey
  metric: RankingMetric
  group?: string | null
  prices?: PriceTable
}

export function metricValue(food: Food, q: RankingQuery): number | null {
  const v = food.per100g[q.nutrient]
  if (v === null) return null
  switch (q.metric) {
    case 'per100g':
      return v
    case 'serving':
      return (v * servingFor(food).grams) / 100
    case 'per100kcal': {
      const kcal = food.per100g.energyKcal
      if (q.nutrient === 'energyKcal' || kcal === null || kcal < MIN_KCAL_FOR_DENSITY) return null
      return (v / kcal) * 100
    }
    case 'per100yen': {
      const price = q.prices?.get(food.id)
      if (!price || price.yenPer100g <= 0) return null
      return (v / price.yenPer100g) * 100
    }
  }
}

// 値の大きい順。0 や未測定は出さない
export function rankFoods(foods: Iterable<Food>, q: RankingQuery): RankingRow[] {
  const rows: RankingRow[] = []
  for (const food of foods) {
    if (q.group && food.group !== q.group) continue
    const value = metricValue(food, q)
    if (value === null || !(value > 0)) continue
    const serving = servingFor(food)
    rows.push({
      food,
      value,
      serving,
      servingAmount: ((food.per100g[q.nutrient] ?? 0) * serving.grams) / 100,
      yenPer100g: q.prices?.get(food.id)?.yenPer100g,
    })
  }
  return rows.sort((a, b) => b.value - a.value || a.food.id.localeCompare(b.food.id))
}

// 1日の目安量（％表示用）。目安がない栄養素は null
export function dailyReference(nutrient: NutrientKey, t: Targets): { value: number; kind: 'target' | 'max' } | null {
  switch (nutrient) {
    case 'energyKcal':
      return { value: t.energyKcal, kind: 'target' }
    case 'protein':
      return { value: t.pfcGrams.p.lo, kind: 'target' }
    case 'fiber':
      return { value: t.fiberMin, kind: 'target' }
    case 'salt':
      return { value: t.saltMax, kind: 'max' }
    case 'satFat':
      return { value: t.satFatMaxG, kind: 'max' }
    case 'alcohol':
      return { value: t.alcoholRiskG, kind: 'max' }
    default:
      return null
  }
}
