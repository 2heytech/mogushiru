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

// 一括データ（CSV）の1行 → 検索APIと同じ形の OffProduct
// CSV には product_quantity_unit がないため、内容量の表記（例「500 ml」）から mL かどうかを判定する
const CSV_NUTRIMENTS = [
  'energy-kcal', 'proteins', 'fat', 'carbohydrates', 'salt', 'sodium', 'fiber', 'alcohol',
  'saturated-fat', 'monounsaturated-fat', 'polyunsaturated-fat', 'omega-3-fat', 'omega-6-fat', 'calcium', 'iron', 'potassium', 'vitamin-c',
  'magnesium', 'zinc', 'vitamin-b6',
]
export function csvRowToOffProduct(row: Record<string, string>): OffProduct {
  const nutriments: Record<string, string> = {}
  for (const k of CSV_NUTRIMENTS) {
    const v = row[`${k}_100g`]
    if (v) nutriments[`${k}_100g`] = v
  }
  return {
    code: row.code,
    product_name: row.product_name,
    brands: row.brands,
    categories_tags: row.categories_tags ? row.categories_tags.split(',') : [],
    product_quantity_unit: isVolume(row.quantity ?? '') ? 'ml' : 'g',
    ...(row.serving_quantity ? { serving_quantity: row.serving_quantity } : {}),
    nutriments,
  }
}

// 「500ml」「1.5 L」「350mℓ」などの体積表記か
export function isVolume(quantity: string): boolean {
  return /\d\s*(ml|mℓ|cl|dl|l|ℓ|リットル)(?![a-z])/i.test(quantity.normalize('NFKC'))
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
  { id: 'snack', label: 'お菓子', patterns: [/snack|chocolate|チョコ|biscuit|cookie|candy|confectioner|菓子|chips|ポテト|せんべい|煎餅|おかき|あられ|クッキー|ビスケット|グミ|キャンディ|スナック|ガム|クラッカー|ピーナツ|ナッツ|グラノラ|グラノーラ/] },
  { id: 'dessert', label: 'デザート', patterns: [/dessert|ice-cream|アイス|pudding|プリン|羊羹|ようかん|大福|餅|饅頭|まんじゅう|どら焼|ワッフル|ヴァッフェル|ケーキ|ゼリー/] },
  { id: 'seasoning', label: '調味料', patterns: [/condiment|sauce|seasoning|dressing|調味料|醤油|しょうゆ|味噌|みそ|ドレッシング|ソース|たれ|タレ|だしの素|白だし|つゆ|ふりかけ|ケチャップ|マヨネーズ|ポン酢|みりん|カレールウ/] },
  { id: 'side', label: 'おかず・惣菜', patterns: [/meals|prepared|主菜|副菜|惣菜|おかず|tofu|豆腐|納豆|natto|厚揚げ|油揚げ|煮|唐揚|からあげ|ハンバーグ|餃子|ギョーザ|コロッケ|サラダ|スープ|みそ汁|味噌汁/] },
  { id: 'drink', label: '飲み物', patterns: [/beverage|drink|飲料|tea|茶|coffee|コーヒー|juice|ジュース|water|水/] },
  // 上のどれにも当たらない肉・魚・野菜などの素材
  { id: 'ingredient', label: '食材', patterns: [/meats|fishes|seafood|vegetables|legumes|cereals|肉|魚|鶏|豚|牛|えび|いか|たこ|さば|鮭|いわし|まぐろ|ツナ|鰹節|かつお|卵|たまご|野菜|ミックス|豆|米|麦|海苔|のり|わかめ|昆布/] },
]

const num = (v: unknown): number | null => {
  if (v === undefined || v === null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

// カテゴリタグで判定し、分からなければ商品名で判定する（日本の商品はタグが空のことが多い）
export function categorize(tags: string[] = [], name = ''): string {
  for (const text of [tags.join(' '), name]) {
    const t = text.toLowerCase()
    if (!t) continue
    const found = PRODUCT_CATEGORIES.find((c) => c.patterns.some((p) => p.test(t)))
    if (found) return found.id
  }
  return 'other'
}

// 日本語の商品名か（ひらがな・カタカナ・漢字を含む）。日本で売られていても外国語名だけの輸入品は選びにくいので外す
export function hasJapaneseName(name: string): boolean {
  return /[\u3040-\u30ff\u4e00-\u9fff]/u.test(name)
}

// 必須5項目（エネルギー・P・F・C・食塩相当量）が100g(mL)当たりで揃うものだけ採用する
export function toProduct(p: OffProduct, fetchedAt: string): Product | null {
  const code = (p.code ?? '').trim()
  if (!/^\d{8,14}$/.test(code)) return null
  const name = (p.product_name_ja || p.product_name || '').trim()
  if (!hasJapaneseName(name)) return null
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

  const category = categorize(p.categories_tags, name)
  const alcohol = g('alcohol')
  const nutrients = {} as Nutrients
  for (const k of NUTRIENT_KEYS) nutrients[k] = null
  Object.assign(nutrients, {
    energyKcal: energy,
    protein,
    fat,
    carb,
    salt,
    fiber: g('fiber'),
    // お酒以外でアルコールの記載がない商品は 0（成分表の「-」と同じ扱い）
    alcohol: alcohol !== null ? alcoholVolToG(alcohol) : category === 'alcohol' ? null : 0,
    satFat: g('saturated-fat'),
    monoUnsatFat: g('monounsaturated-fat'),
    polyUnsatFat: g('polyunsaturated-fat'),
    n3Fat: g('omega-3-fat'),
    n6Fat: g('omega-6-fat'),
    // OFF のミネラル・ビタミンは g 単位
    calcium: mgFromG(g('calcium')),
    iron: mgFromG(g('iron')),
    potassium: mgFromG(g('potassium')),
    vitaminC: mgFromG(g('vitamin-c')),
    magnesium: mgFromG(g('magnesium')),
    zinc: mgFromG(g('zinc')),
    vitaminB6: mgFromG(g('vitamin-b6')),
    // ビタミンE（α-トコフェロールに限らない）・ナイアシン（当量でない）・葉酸は成分表と基準がそろわないので未収録（null）
    // OFF の vitamin-a はレチノールとカロテンを区別しないので、レチノールは未収録（null）のまま
  })
  for (const k of NUTRIENT_KEYS) nutrients[k] = round(nutrients[k])

  const servingGrams = num(p.serving_quantity) ?? undefined
  return {
    jan: code,
    name,
    brand: (p.brands ?? '').split(',')[0].trim(),
    category,
    basis: (p.product_quantity_unit ?? '').toLowerCase() === 'ml' ? '100ml' : '100g',
    ...(servingGrams ? { servingGrams } : {}),
    nutrients,
    source: { name: 'Open Food Facts', fetchedAt, ...(saltConverted ? { saltConverted } : {}) },
  }
}

// 換算で出る長い小数（例 122.2222…）を丸める。食塩の 0.008 などが 0 にならないよう有効数字を残す
const round = (v: number | null) => (v === null ? null : Number(v.toPrecision(4)))

const mgFromG = (v: number | null) => (v === null ? null : v * 1000)

// OFF の alcohol は % vol。純アルコール量 g/100mL = 度数 × 0.8
export function alcoholVolToG(percentVol: number): number {
  return percentVol * 0.8
}
