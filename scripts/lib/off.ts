// Open Food Facts の商品データ → アプリの Product に変換（純粋関数）
import { NUTRIENT_KEYS, type Nutrients, type Product } from '../../src/domain/types'
import { sodiumMgToSaltG } from '../../src/domain/nutrition'

export type OffProduct = {
  code?: string
  product_name?: string
  product_name_ja?: string
  brands?: string
  categories_tags?: string[]
  product_quantity_unit?: string
  serving_quantity?: number | string
  nutriments?: Record<string, number | string | undefined>
}

// アプリのカテゴリ。OFF のカテゴリタグ（英語・日本語）に含まれる語で判定する（上から優先）
export const PRODUCT_CATEGORIES: { id: string; label: string; patterns: RegExp[] }[] = [
  { id: 'alcohol', label: 'お酒', patterns: [/beer|ビール|sake|日本酒|wine|ワイン|chuhai|チューハイ|alcoholic|酒/] },
  { id: 'onigiri', label: 'おにぎり', patterns: [/onigiri|おにぎり|rice-ball/] },
  { id: 'bento', label: 'お弁当', patterns: [/bento|弁当/] },
  { id: 'sandwich', label: 'サンドイッチ', patterns: [/sandwich|サンド/] },
  { id: 'noodle', label: 'カップ麺・麺', patterns: [/noodle|ramen|ラーメン|udon|うどん|soba|そば|麺/] },
  { id: 'bread', label: 'パン', patterns: [/bread|パン/] },
  { id: 'dairy', label: '乳製品', patterns: [/yogurt|ヨーグルト|milk|牛乳|cheese|チーズ|dairies/] },
  { id: 'snack', label: 'お菓子', patterns: [/snack|chocolate|チョコ|biscuit|cookie|candy|confectioner|菓子|chips/] },
  { id: 'dessert', label: 'デザート', patterns: [/dessert|ice-cream|アイス|pudding|プリン/] },
  { id: 'drink', label: '飲み物', patterns: [/beverage|drink|飲料|tea|茶|coffee|コーヒー|juice|ジュース|water/] },
]

const num = (v: unknown): number | null => {
  if (v === undefined || v === null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

export function categorize(tags: string[] = []): string {
  const joined = tags.join(' ').toLowerCase()
  return PRODUCT_CATEGORIES.find((c) => c.patterns.some((p) => p.test(joined)))?.id ?? 'other'
}

// 必須5項目（エネルギー・P・F・C・食塩相当量）が100g(mL)当たりで揃うものだけ採用する
export function toProduct(p: OffProduct, fetchedAt: string): Product | null {
  const code = (p.code ?? '').trim()
  if (!/^\d{8,14}$/.test(code)) return null
  const name = (p.product_name_ja || p.product_name || '').trim()
  if (!name) return null
  const n = p.nutriments ?? {}
  const g = (k: string) => num(n[`${k}_100g`])

  let salt = g('salt')
  let saltConverted = false
  if (salt === null) {
    const sodiumG = g('sodium')
    if (sodiumG !== null) {
      salt = sodiumMgToSaltG(sodiumG * 1000)
      saltConverted = true
    }
  }
  const energy = g('energy-kcal')
  const protein = g('proteins')
  const fat = g('fat')
  const carb = g('carbohydrates')
  if ([energy, protein, fat, carb, salt].some((v) => v === null)) return null

  const nutrients = {} as Nutrients
  for (const k of NUTRIENT_KEYS) nutrients[k] = null
  Object.assign(nutrients, {
    energyKcal: energy,
    protein,
    fat,
    carb,
    salt,
    fiber: g('fiber'),
    alcohol: g('alcohol') !== null ? alcoholVolToG(g('alcohol')!) : null,
    satFat: g('saturated-fat'),
    // OFF のミネラル・ビタミンは g 単位
    calcium: mgFromG(g('calcium')),
    iron: mgFromG(g('iron')),
    potassium: mgFromG(g('potassium')),
    vitaminC: mgFromG(g('vitamin-c')),
  })

  const servingGrams = num(p.serving_quantity) ?? undefined
  return {
    jan: code,
    name,
    brand: (p.brands ?? '').split(',')[0].trim(),
    category: categorize(p.categories_tags),
    basis: (p.product_quantity_unit ?? '').toLowerCase() === 'ml' ? '100ml' : '100g',
    ...(servingGrams ? { servingGrams } : {}),
    nutrients,
    source: { name: 'Open Food Facts', fetchedAt, ...(saltConverted ? { saltConverted } : {}) },
  }
}

const mgFromG = (v: number | null) => (v === null ? null : v * 1000)

// OFF の alcohol は % vol。純アルコール量 g/100mL = 度数 × 0.8
export function alcoholVolToG(percentVol: number): number {
  return percentVol * 0.8
}
