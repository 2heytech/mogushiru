// 郷土料理の材料表（農水省「うちの郷土料理」）→ 1人前の料理レシピ（純粋関数）
// 材料名は data/kyodo/ingredients.yaml の対応表で成分表の食品番号に置き換え、分量はグラムに換算する
import type { DishCategory, Food, Ingredient, Slot } from '../../src/domain/types'
import type { RecipeInput } from './dishes'
import { normalizeName, parsePeople, parsePieces, parseQuantity, type MaffRecipe } from './maff'

export type IngredientRule = {
  names: string[]
  food?: string // 成分表の食品番号
  skip?: boolean // 水・打ち粉・笹の葉など、食べないもの
  broth?: boolean // だし汁。汁物・麺のときだけ数える
  unknown?: boolean // 成分表に該当も近い代わりもないもの（その料理は取り込まない）
  density?: number // 1mL当たりのグラム（大さじ・カップの換算用。既定は1）
  pieces?: Record<string, number> // 1個・1本などのグラム
  pinch?: number // 「少々」のグラム（既定は数えない）
}

export type KyodoOverride = {
  category?: DishCategory
  suggestedSlots?: Slot[]
  exclude?: string // 取り込まない理由
  servings?: number // 人数をページと別に決めるとき
}

const SPOON: Record<string, number> = { 大さじ: 15, 小さじ: 5, カップ: 200, ml: 1, 合: 180 }
// 調味料・油・香辛料は「適量」「少々」なら数えなくてよい（主な材料の量が不明なときだけ取り込まない）
const MINOR_GROUPS = new Set(['14', '16', '17'])

export type ConvertResult = { recipe: RecipeInput; notes: string[] } | { error: string }

export function buildRuleIndex(rules: IngredientRule[]): Map<string, IngredientRule> {
  const index = new Map<string, IngredientRule>()
  for (const r of rules) for (const n of r.names) index.set(normalizeName(n), r)
  return index
}

// 材料名から対応表を引く。完全一致がなければ前後の修飾（「生」「むき」「乾燥」など）を外して引く
export function lookup(name: string, index: Map<string, IngredientRule>): IngredientRule | undefined {
  const n = normalizeName(name)
  if (!n) return undefined
  if (index.has(n)) return index.get(n)
  for (const alt of n.split(/[、,・／/]|または|or/)) if (index.has(alt)) return index.get(alt)
  return undefined
}

export function guessCategory(fullName: string): DishCategory {
  const name = fullName.split(/[／/]/)[0]
  if (/うどん|そば|蕎麦|そうめん|素麺|ラーメン|麺|きしめん|焼きそば|ちゃんぽん|冷麺|ほうとう|ひやむぎ/.test(name)) return 'noodle'
  if (/汁|鍋|雑煮|スープ|すいとん|ひっつみ|はっと|だんご汁|団子汁|ほうとう|おつゆ|煮込み|のっぺ|けんちん|呉汁|じゃっぱ|三平/.test(name)) return 'soup'
  if (/丼|どんぶり/.test(name)) return 'bowl'
  if (/まんじゅう|饅頭|羊羹|ようかん|かん$|寒天|ぼたもち|おはぎ|大福|せんべい|煎餅|菓子|ケーキ|カステラ|だんご|団子|餅$|もち$|ういろう|ゆべし|おやき|まんじゅ|ちまき|あめ$|飴$|ぜんざい|しるこ|汁粉|きんつば|どら焼|どらやき|カルカン|かるかん|ドーナツ|あんぷ|おこし|くずもち|わらびもち|ずんだ|プリン|ゼリー/.test(name)) return 'snack'
  if (/寿司|すし|鮨|ずし|飯|めし|ごはん|ご飯|おこわ|赤飯|おにぎり|むすび|握り|粥|かゆ|ぞうすい|雑炊|ずーし|じゅーしー|ジューシー|まぜご|炊き込み|茶漬|ちらし|いなり|かんぴょう巻|太巻|巻き寿司|巻きずし|恵方巻|のり巻|TOKYO-X巻/.test(name)) return 'staple'
  return 'main'
}

const SLOTS_BY_CATEGORY: Record<DishCategory, Slot[]> = {
  staple: ['breakfast', 'lunch', 'dinner'],
  main: ['lunch', 'dinner'],
  side: ['breakfast', 'lunch', 'dinner'],
  soup: ['breakfast', 'lunch', 'dinner'],
  noodle: ['lunch', 'dinner'],
  bowl: ['lunch', 'dinner'],
  bread: ['breakfast', 'lunch'],
  snack: ['other'],
  drink: ['other'],
  alcohol: ['other'],
}

const round1 = (v: number) => Math.round(v * 10) / 10

export function convertKyodo(
  r: MaffRecipe,
  index: Map<string, IngredientRule>,
  foods: Map<string, Food>,
  override: KyodoOverride = {},
): ConvertResult {
  if (override.exclude) return { error: override.exclude }
  const notes: string[] = []
  let category = override.category ?? guessCategory(r.name)
  const people = override.servings ?? parsePeople(r.servings)
  const pieces = people ? null : parsePieces(r.servings)
  if (!people && !pieces) return { error: `人数が読めない（${r.servings}）` }

  const grams = new Map<string, number>()
  const order: string[] = []
  // 主な材料以外で量が「適量」のもの（薬味・飾り）は数えない。1品目か2つ以上あれば取り込まない
  const vague: string[] = []
  let first = true
  for (const [rawName, rawQty] of r.ingredients) {
    if (!rawQty) continue // 見出し行
    const isFirst = first
    first = false
    const rule = lookup(rawName, index)
    if (!rule) return { error: `材料が対応表にない（${rawName}）` }
    if (rule.skip) continue
    if (rule.unknown) {
      // 量が「適量」「少々」なら飾り・薬味として数えない
      const uq = parseQuantity(rawQty)
      if (!uq || uq.unit === '少々') continue
      return { error: `成分表に該当がない（${rawName}）` }
    }
    if (rule.broth && category !== 'soup' && category !== 'noodle') continue
    const food = rule.food ? foods.get(rule.food) : undefined
    if (!food) return { error: `成分表にない食品番号（${rawName} → ${rule.food}）` }
    const minor = MINOR_GROUPS.has(food.group) || rule.pinch !== undefined
    const q = parseQuantity(rawQty)
    let g: number | null = null
    if (!q) {
      if (minor) continue
      if (isFirst) return { error: `主な材料の分量が読めない（${rawName}: ${rawQty}）` }
      vague.push(rawName)
      continue
    } else if (q.unit === '少々') {
      if (rule.pinch) g = rule.pinch
      else continue
    } else if (q.unit === 'g') g = q.value
    else if (rule.pieces?.[q.unit] !== undefined) g = q.value * rule.pieces[q.unit]
    else if (SPOON[q.unit] !== undefined) g = q.value * SPOON[q.unit] * (rule.density ?? 1)
    if (g === null) return { error: `単位を換算できない（${rawName}: ${rawQty}）` }
    if (!grams.has(food.id)) order.push(food.id)
    grams.set(food.id, (grams.get(food.id) ?? 0) + g)
  }
  if (!order.length) return { error: '材料がない' }
  if (vague.length > 1) return { error: `分量が読めない材料が多い（${vague.join('、')}）` }
  if (vague.length) notes.push(`分量が「適量」の${vague[0]}は数えていない`)

  // 1人前に割る。「12個分」は1個を1人前とし、軽いお菓子（60kcal未満）は2個にする
  let divisor = people ?? pieces!.count
  const kcalOf = (d: number) => order.reduce((s, id) => s + ((grams.get(id)! / d) * (foods.get(id)!.per100g.energyKcal ?? 0)) / 100, 0)
  if (pieces && kcalOf(divisor) < 60) {
    divisor /= 2
    notes.push(`1人前は2${pieces.unit}`)
  } else if (pieces) notes.push(`1人前は1${pieces.unit}`)
  if (category === 'main' && kcalOf(divisor) < 150) {
    // 主菜にしては軽いもの（和え物・漬物・煮物の小鉢）は副菜にする
    const protein = order.reduce((s, id) => s + ((grams.get(id)! / divisor) * (foods.get(id)!.per100g.protein ?? 0)) / 100, 0)
    if (protein < 10 && !override.category) category = 'side'
  }
  const ingredients: Ingredient[] = order
    .map((id) => ({ foodId: id, grams: round1(grams.get(id)! / divisor) }))
    .filter((i) => i.grams >= 0.1)

  const name = r.name.split(/[／/]/)[0].trim()
  const kana = [r.kana.split(/[／/]/)[0].trim(), r.pref.replace(/[都府県]$/, ''), r.pref].filter(Boolean).join(' ')
  return {
    recipe: {
      id: `kyodo-${r.id.replace(/_/g, '-')}`,
      name,
      kana,
      category,
      suggestedSlots: override.suggestedSlots ?? SLOTS_BY_CATEGORY[category],
      ingredients,
      source: { label: '農林水産省「うちの郷土料理」', url: r.url, region: r.pref },
    },
    notes,
  }
}
