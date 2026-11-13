// 作り方の画面に出す材料の一覧（純粋関数）
// 料理の材料表（ingredients）は栄養の計算のためのもので、火を通したあとの食品と重さで書いているものがある
// （肉じゃがの「じゃがいも（水煮）68g」など）。作り方の画面では、作るときの食品と重さに直し、大さじ・個などの目安を添える
import { shortFoodName } from './customize'
import type { Food, Ingredient, RecipeExtra, RecipeMaterial } from './types'

// 火を通したあとの食品 → 作るときの食品。rate は成分表（八訂）第1章 表12の重量変化率（%）。
// 作るときの重さ ＝ 材料表の重さ ÷ rate × 100
export const RAW_FORMS: Record<string, { rawId: string; rate: number }> = {
  '02019': { rawId: '02017', rate: 97 }, // じゃがいも 水煮 → 生
  '06155': { rawId: '06153', rate: 89 }, // たまねぎ ゆで → 生
  '06215': { rawId: '06214', rate: 87 }, // にんじん ゆで → 生
  '06021': { rawId: '06020', rate: 98 }, // さやえんどう ゆで → 生
  '11271': { rawId: '11076', rate: 58 }, // 輸入牛 もも 皮下脂肪なし ゆで → 生
  '10155': { rawId: '10154', rate: 84 }, // まさば 水煮 → 生
  '01064': { rawId: '01063', rate: 220 }, // スパゲッティ ゆで → 乾
  '06268': { rawId: '06267', rate: 70 }, // ほうれんそう ゆで → 生
  '04086': { rawId: '04040', rate: 210 }, // 油揚げ 油抜き・ゆで → 生
  '06135': { rawId: '06134', rate: 86 }, // だいこん ゆで → 生
  '06062': { rawId: '06061', rate: 89 }, // キャベツ ゆで → 生
  '06192': { rawId: '06191', rate: 100 }, // なす ゆで → 生
  '08021': { rawId: '08020', rate: 100 }, // なめこ ゆで → 生
}

// 作り方の画面での呼び名。書いていない食品は、表示名から（ゆで）などのかっこを省いた名前
export const RECIPE_NAMES: Record<string, string> = {
  '01063': 'スパゲッティ（乾めん）',
  '01039': 'ゆでうどん',
  '01049': '焼きそば用の蒸しめん',
  '03023': 'メープルシロップ',
  '06020': '絹さや',
  '08020': 'なめこ',
  '09050': 'ひじき（乾）',
  '10154': 'さば',
  '11076': '牛もも肉',
  '16001': '酒',
  '16023': '酒',
}

// 小さじ1杯の重さ（g）。大さじ1は小さじ3杯。一般的な計量スプーンの重さ
const TEASPOON_GRAMS: Record<string, number> = {
  '17007': 6, // しょうゆ
  '17008': 6, // うすくちしょうゆ
  '16025': 6, // みりん
  '16001': 5, // 酒
  '16023': 5, // 料理酒
  '03003': 3, // 砂糖（上白糖）
  '17012': 6, // 食塩
  '17015': 5, // 酢
  '17044': 6, // みそ
  '17045': 6,
  '17046': 6,
  '14002': 4, // ごま油
  '14006': 4, // サラダ油
  '14017': 4, // バター
  '17036': 5, // ケチャップ
  '17001': 6, // ウスターソース
  '17002': 7, // 中濃ソース
  '17003': 7, // とんかつソース
  '17042': 4, // マヨネーズ
  '17004': 7, // 豆板醤
  '17028': 3, // 顆粒和風だし
  '17065': 2, // こしょう
  '02034': 3, // 片栗粉
  '01015': 3, // 小麦粉
  '01079': 1, // パン粉
  '13003': 5, // 牛乳
  '13038': 2, // 粉チーズ
  '05018': 2, // いりごま
  '03022': 7, // はちみつ
  '03023': 7, // メープルシロップ
}

// mL で書くもの（だし。1gを1mLとみなす）
const ML_FOODS = new Set(['17019', '17021'])

// 1個・1本などの重さ（g、食べられる部分）。一般的な大きさの目安
const PIECES: Record<string, { grams: number; unit: string }> = {
  '01026': { grams: 60, unit: '枚' }, // 食パン 6枚切り
  '01039': { grams: 230, unit: '玉' }, // ゆでうどん
  '01049': { grams: 150, unit: '玉' }, // 焼きそば用の蒸しめん
  '01074': { grams: 6, unit: '枚' }, // ぎょうざの皮
  '01088': { grams: 150, unit: '杯' }, // ごはん 茶碗1杯
  '02017': { grams: 135, unit: '個' }, // じゃがいも 中
  '04032': { grams: 300, unit: '丁' }, // 木綿豆腐
  '04033': { grams: 300, unit: '丁' }, // 絹ごし豆腐
  '04040': { grams: 20, unit: '枚' }, // 油揚げ
  '06061': { grams: 50, unit: '枚' }, // キャベツの葉
  '06065': { grams: 100, unit: '本' }, // きゅうり
  '06084': { grams: 150, unit: '本' }, // ごぼう
  '06103': { grams: 15, unit: 'かけ' }, // しょうが
  '06153': { grams: 190, unit: '個' }, // たまねぎ 中
  '06191': { grams: 70, unit: '本' }, // なす
  '06207': { grams: 100, unit: '束' }, // にら
  '06214': { grams: 145, unit: '本' }, // にんじん 中
  '06223': { grams: 5, unit: 'かけ' }, // にんにく
  '06226': { grams: 100, unit: '本' }, // 長ねぎ
  '06245': { grams: 30, unit: '個' }, // ピーマン
  '06267': { grams: 180, unit: '束' }, // ほうれんそう
  '06291': { grams: 200, unit: '袋' }, // もやし
  '07023': { grams: 8, unit: '粒' }, // 梅干し
  '09004': { grams: 3, unit: '枚' }, // 焼きのり 全形
  '10154': { grams: 100, unit: '切れ' }, // さば
  '10241': { grams: 80, unit: '切れ' }, // ぶり
  '11176': { grams: 10, unit: '枚' }, // ロースハム
  '11186': { grams: 15, unit: '本' }, // ウインナー
  '11221': { grams: 250, unit: '枚' }, // 鶏もも肉
  '12004': { grams: 50, unit: '個' }, // 卵 M
  '17051': { grams: 20, unit: 'かけ' }, // カレールウ
}

export type RecipeLine = { key: string; name: string; amount: string }

const FRACTIONS: [number, string][] = [
  [1 / 4, '1/4'],
  [1 / 3, '1/3'],
  [1 / 2, '1/2'],
  [2 / 3, '2/3'],
  [3 / 4, '3/4'],
]

// 1.5 → 「1と1/2」、0.5 → 「1/2」、2 → 「2」
export function formatCount(x: number): string {
  const whole = Math.floor(x + 1e-9)
  const rest = x - whole
  if (rest < 1e-6) return String(whole)
  const frac = FRACTIONS.find(([v]) => Math.abs(v - rest) < 1e-6)?.[1] ?? String(Math.round(rest * 100) / 100)
  return whole ? `${whole}と${frac}` : frac
}

const nearest = (x: number, candidates: number[]) => candidates.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a))

const TEASPOON_STEPS = [1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4, 1, 4 / 3]
const TABLESPOON_STEPS = [1 / 2, 2 / 3, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10]
const PIECE_STEPS = [
  ...[0, 1, 2].flatMap((w) => [0, ...FRACTIONS.map(([v]) => v)].map((f) => w + f)).filter((x) => x > 0),
  3.5, 4, 4.5, 5, 5.5, 6,
  ...Array.from({ length: 24 }, (_, i) => i + 7),
]

// 大さじ・小さじの目安。ぴったりから8%以上ずれていれば「強」「弱」をつける。ごく少ない量は「少々」
export function spoonHint(grams: number, teaspoonGrams: number): string {
  const tsp = grams / teaspoonGrams
  if (tsp < 0.2) return '少々'
  const [label, x, steps] = tsp >= 1.5 ? ['大さじ', tsp / 3, TABLESPOON_STEPS] : ['小さじ', tsp, TEASPOON_STEPS]
  const c = nearest(x, steps)
  const err = (x - c) / c
  const mark = Math.abs(err) <= 0.08 ? '' : err > 0 ? '強' : '弱'
  return `${label}${formatCount(c)}${mark}`
}

// 1個・1本などの目安。いちばん近い数から12%以上ずれるときと、とても少ないときは出さない
export function pieceHint(grams: number, piece: { grams: number; unit: string }): string | null {
  const x = grams / piece.grams
  if (x < 0.2) return null
  const c = nearest(x, PIECE_STEPS)
  if (Math.abs(x - c) / c > 0.12) return null
  return `約${formatCount(c)}${piece.unit}`
}

const formatGrams = (g: number) => (g < 10 ? `${Math.round(g * 10) / 10}g` : `${Math.round(g)}g`)

// 重さと目安の文字列。「20g（大さじ1強）」「136g（約1個）」「150mL」。ごく少ない調味料は「少々」だけ
export function amountText(foodId: string | undefined, grams: number): string {
  if (foodId && ML_FOODS.has(foodId)) return `${grams < 20 ? Math.round(grams) : Math.round(grams / 5) * 5}mL`
  const tsp = foodId ? TEASPOON_GRAMS[foodId] : undefined
  const piece = foodId ? PIECES[foodId] : undefined
  const hint = tsp ? spoonHint(grams, tsp) : piece ? pieceHint(grams, piece) : null
  if (hint === '少々' && grams < 1) return '少々'
  return hint ? `${formatGrams(grams)}（${hint}）` : formatGrams(grams)
}

const recipeName = (id: string, foods: Map<string, Food>) => RECIPE_NAMES[id] ?? shortFoodName(foods.get(id)?.displayName ?? id)

// 材料表（1人前あたり）→ 作り方の画面の材料の一覧（portion 人前）。同じ食品はまとめる
export function recipeLines(ingredients: Ingredient[], portion: number, foods: Map<string, Food>): RecipeLine[] {
  const merged = new Map<string, number>()
  for (const ing of ingredients) {
    if (!(ing.grams > 0)) continue
    const raw = RAW_FORMS[ing.foodId]
    const id = raw?.rawId ?? ing.foodId
    const grams = raw ? (ing.grams * 100) / raw.rate : ing.grams
    merged.set(id, (merged.get(id) ?? 0) + grams * portion)
  }
  return [...merged].map(([id, grams]) => ({ key: id, name: recipeName(id, foods), amount: amountText(id, grams) }))
}

// 作るときの材料（materials）→ 一覧（portion 人前）。grams がないものは「適量」
export function materialLines(materials: RecipeMaterial[], portion: number): RecipeLine[] {
  return materials.map((m, i) => ({ key: `${i}-${m.name}`, name: m.name, amount: m.grams ? amountText(m.foodId, m.grams * portion) : '適量' }))
}

// 栄養に数えていない材料（水・揚げ油など）→「水 200mL」「揚げ油 適量」
export function extraTexts(extras: RecipeExtra[], portion: number): string[] {
  return extras.map((e) => {
    if (!e.amount || !e.unit) return `${e.name} 適量`
    const v = e.amount * portion
    const shown = v >= 20 ? Math.round(v / 5) * 5 : Math.round(v)
    return `${e.name} ${shown}${e.unit}`
  })
}
