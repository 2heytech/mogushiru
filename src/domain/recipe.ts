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
  '01048': { rawId: '01047', rate: 190 }, // 中華めん ゆで → 生
  '01128': { rawId: '01127', rate: 190 }, // そば ゆで → 生
  '01044': { rawId: '01043', rate: 270 }, // そうめん・ひやむぎ ゆで → 乾
  '02011': { rawId: '02010', rate: 95 }, // さといも 水煮 → 生
  '02061': { rawId: '02039', rate: 440 }, // 緑豆はるさめ ゆで → 乾
  '04075': { rawId: '04074', rate: 220 }, // 赤えんどう ゆで → 乾
  '04085': { rawId: '04040', rate: 99 }, // 油揚げ 油抜き・焼き → 生
  '06011': { rawId: '06010', rate: 94 }, // さやいんげん ゆで → 生
  '06049': { rawId: '06048', rate: 98 }, // 西洋かぼちゃ ゆで → 生
  '06055': { rawId: '06054', rate: 99 }, // カリフラワー ゆで → 生
  '06085': { rawId: '06084', rate: 91 }, // ごぼう ゆで → 生
  '06087': { rawId: '06086', rate: 88 }, // こまつな ゆで → 生
  '06100': { rawId: '06099', rate: 79 }, // しゅんぎく ゆで → 生
  '06123': { rawId: '06122', rate: 630 }, // 干しぜんまい ゆで → 乾
  '06234': { rawId: '06233', rate: 72 }, // はくさい ゆで → 生
  '06264': { rawId: '06263', rate: 111 }, // ブロッコリー ゆで → 生
  '06288': { rawId: '06287', rate: 85 }, // だいずもやし ゆで → 生
  '06292': { rawId: '06291', rate: 84 }, // りょくとうもやし ゆで → 生
  '06318': { rawId: '06317', rate: 91 }, // れんこん ゆで → 生
  '06350': { rawId: '06226', rate: 100 }, // 根深ねぎ ゆで → 生
  '08002': { rawId: '08001', rate: 86 }, // えのきたけ ゆで → 生
  '08007': { rawId: '08006', rate: 1000 }, // きくらげ ゆで → 乾
  '08014': { rawId: '08013', rate: 570 }, // 乾しいたけ ゆで → 乾
  '08032': { rawId: '08031', rate: 69 }, // マッシュルーム ゆで → 生
  '08040': { rawId: '08039', rate: 110 }, // 生しいたけ ゆで → 生
  '10101': { rawId: '10100', rate: 91 }, // まがれい 水煮 → 生
  '10156': { rawId: '10154', rate: 77 }, // まさば 焼き → 生
  '10242': { rawId: '10241', rate: 82 }, // ぶり 焼き → 生
  '10322': { rawId: '10321', rate: 95 }, // くるまえび ゆで → 生
  '11125': { rawId: '11123', rate: 77 }, // ぶた ロース 脂身つき ゆで → 生
  '11132': { rawId: '11131', rate: 71 }, // ぶた もも 皮下脂肪なし 焼き → 生
  '11222': { rawId: '11221', rate: 61 }, // 若どり もも 皮つき 焼き → 生
  '11223': { rawId: '11221', rate: 70 }, // 若どり もも 皮つき ゆで → 生
  '11228': { rawId: '11227', rate: 73 }, // 若どり ささみ 焼き → 生
  '11252': { rawId: '11046', rate: 81 }, // 乳用肥育牛 ばら 焼き → 生
  '11272': { rawId: '11089', rate: 65 }, // 牛ひき肉 焼き → 生
  '11277': { rawId: '11129', rate: 74 }, // ぶた ばら 焼き → 生
  '11280': { rawId: '11163', rate: 69 }, // 豚ひき肉 焼き → 生
  '11287': { rawId: '11219', rate: 62 }, // 若どり むね 皮つき 焼き → 生
  '11291': { rawId: '11230', rate: 62 }, // 鶏ひき肉 焼き → 生
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
  '01043': 'そうめん（乾めん）',
  '01047': '生中華めん',
  '01127': '生そば',
  '02039': 'はるさめ（乾）',
  '04074': '赤えんどう（乾）',
  '06010': 'さやいんげん',
  '06054': 'カリフラワー',
  '06086': '小松菜',
  '06099': '春菊',
  '06122': '干しぜんまい',
  '06287': '大豆もやし',
  '08006': 'きくらげ（乾）',
  '08013': '干ししいたけ',
  '08031': 'マッシュルーム',
  '10100': 'かれい',
  '10321': 'くるまえび',
  '11123': '豚ロース肉',
  '11130': '豚もも肉',
  '11131': '豚もも肉',
  '11227': '鶏ささみ',
  '04038': '焼き豆腐',
  '06104': '紅しょうが',
  '06205': 'ゴーヤー',
  '09056': '昆布（結び昆布など）',
  '10092': '削り節',
  '10115': '銀だら',
  '10325': 'さくらえび（素干し）',
  '11034': '牛肩ロース肉',
  '11047': '牛もも肉',
  '11098': '牛もつ（小腸）',
  '13032': 'チーズ（エメンタール）',
  '15079': 'パイ生地（冷凍パイシート）',
  '17024': '鶏がらスープ',
  '17025': '中華スープ',
  '17029': 'めんつゆ（ストレート）',
  '17044': '白みそ（甘みそ）',
  '17098': 'ごまだれ',
  '17106': 'テンメンジャン',
  '17110': 'ぽん酢しょうゆ',
  '17112': '焼き鳥のたれ',
  '17113': '焼き肉のたれ',
  '17117': 'ごまドレッシング',
  '17140': '鍋つゆ（ストレート）',
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
  '17031': 6, // オイスターソース
  '17093': 3, // 顆粒中華だし
  '17098': 6, // ごまだれ
  '17106': 6, // テンメンジャン
  '17110': 6, // ぽん酢しょうゆ
  '17112': 6, // 焼き鳥のたれ
  '17113': 6, // 焼き肉のたれ
  '17117': 5, // ごまドレッシング
}

// mL で書くもの（だし・スープ。1gを1mLとみなす）
const ML_FOODS = new Set(['17019', '17021', '17024', '17025', '17029', '17140'])
// 多いときは mL で書き、少ないときは大さじ・小さじの目安をつけるもの（牛乳・生クリーム）
const LIQUID_FOODS = new Set(['13003', '13014'])
const LIQUID_ML_FROM = 50
// 大さじ10をこえる量には、さじの目安をつけない（計量カップや重さで量るほうが楽なため）
const SPOON_MAX_TEASPOONS = 31

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
  '12005': { grams: 50, unit: '個' }, // ゆで卵 M
  '17051': { grams: 20, unit: 'かけ' }, // カレールウ
}

export type RecipeLine = { key: string; name: string; amount: string }

// 作り方を何人分で見るか（栄養の計算の人前とは別）。1人分きざみ
export const SERVINGS_MIN = 1
export const SERVINGS_MAX = 10
export const DEFAULT_SERVINGS = 2
export const clampServings = (n: number) => (Number.isFinite(n) ? Math.min(SERVINGS_MAX, Math.max(SERVINGS_MIN, Math.round(n))) : DEFAULT_SERVINGS)

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

const mlText = (grams: number) => `${grams < 20 ? Math.round(grams) : Math.round(grams / 5) * 5}mL`

// 重さと目安の文字列。「20g（大さじ1強）」「136g（約1個）」「150mL」。ごく少ない調味料は「少々」だけ
export function amountText(foodId: string | undefined, grams: number): string {
  if (foodId && (ML_FOODS.has(foodId) || (LIQUID_FOODS.has(foodId) && grams >= LIQUID_ML_FROM))) return mlText(grams)
  const t = foodId ? TEASPOON_GRAMS[foodId] : undefined
  const tsp = t && grams / t <= SPOON_MAX_TEASPOONS ? t : undefined
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
