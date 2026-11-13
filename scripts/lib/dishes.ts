// 料理レシピ（YAML）→ 配信用の料理データ（純粋関数）
import { ingredientsTotals } from '../../src/domain/nutrition'
import { illustrationGenre } from './illustration-genre'
import { NUTRIENT_KEYS, SLOTS, type Dish, type DishCategory, type DishRecipe, type DishSource, type Food, type Ingredient, type Nutrients } from '../../src/domain/types'

export type RecipeInput = {
  id: string
  name: string
  kana: string
  category: DishCategory
  suggestedSlots: Dish['suggestedSlots']
  ingredients: Ingredient[]
  source?: DishSource
  recipe?: DishRecipe
}

const CATEGORIES: DishCategory[] = ['staple', 'main', 'side', 'soup', 'noodle', 'bowl', 'bread', 'snack', 'drink', 'alcohol']

// 1人前としてありえない値の目安（警告のみ）。お茶などはほぼ0kcalなので下限を見ない
const KCAL_RANGE = { min: 5, max: 1500 }
const SALT_MAX = 10

export type BuildResult = { dishes: Dish[]; errors: string[]; warnings: string[] }

// 作り方の手順の数と、1つの手順の長さ（スマホで読める長さにおさえる）
const STEPS_RANGE = { min: 2, max: 6 }
const STEP_MAX_CHARS = 110
// 手順の文に分量を書かない（分量は材料の一覧に出す。人前や材料を変えると文と食い違うため）
const AMOUNT_IN_STEP = /大さじ|小さじ|カップ|\d\s*(g|グラム|mL|ml|cc)(?![a-zA-Z])/

// 作り方の書き方を確かめる。問題があれば、その説明を返す
export function recipeProblems(recipe: DishRecipe, foods: Map<string, Food>): string[] {
  const out: string[] = []
  if (!(Number.isInteger(recipe.minutes) && recipe.minutes > 0)) out.push('minutes（調理時間の分）は正の整数で指定してください')
  const steps = recipe.steps ?? []
  if (steps.length < STEPS_RANGE.min || steps.length > STEPS_RANGE.max) out.push(`手順は${STEPS_RANGE.min}〜${STEPS_RANGE.max}個にしてください（いま${steps.length}個）`)
  steps.forEach((s, i) => {
    if (typeof s !== 'string' || !s.trim()) out.push(`手順${i + 1}が空です`)
    else {
      if (s.length > STEP_MAX_CHARS) out.push(`手順${i + 1}が長すぎます（${s.length}字。${STEP_MAX_CHARS}字まで）`)
      if (AMOUNT_IN_STEP.test(s)) out.push(`手順${i + 1}に分量が書かれています（分量は材料の一覧に出すので、文には書かない）`)
      if (!s.endsWith('。')) out.push(`手順${i + 1}は「。」で終えてください`)
    }
  })
  for (const e of recipe.extras ?? []) {
    if (!e.name) out.push('extras に名前のないものがあります')
    if (e.amount !== undefined && !(e.amount > 0 && e.unit)) out.push(`extras「${e.name}」: amount は正の数で、unit と一緒に書いてください`)
  }
  for (const m of recipe.materials ?? []) {
    if (!m.name) out.push('materials に名前のないものがあります')
    if (m.grams !== undefined && !(m.grams > 0)) out.push(`materials「${m.name}」: grams は正の数で指定してください`)
    if (m.foodId !== undefined && !foods.has(m.foodId)) out.push(`materials「${m.name}」: 成分表にない食品番号 ${m.foodId}`)
  }
  for (const [id, name] of Object.entries(recipe.names ?? {})) {
    if (!foods.has(id)) out.push(`names: 成分表にない食品番号 ${id}`)
    if (typeof name !== 'string' || !name.trim()) out.push(`names「${id}」: 呼び名が空です`)
  }
  return out
}

// イラストのファイル形式。先にあるほど優先（AIで作った webp・png を置けば、手描きの svg より優先される）
const ILLUSTRATION_EXTS = ['webp', 'png', 'svg']

const round = (v: number) => Math.round(v * 100) / 100

export function buildDishes(recipes: RecipeInput[], foods: Map<string, Food>, illustrations: Set<string>): BuildResult {
  const errors: string[] = []
  const warnings: string[] = []
  const seen = new Set<string>()
  const dishes: Dish[] = []

  for (const r of recipes) {
    const where = `料理「${r.name ?? r.id}」`
    if (!r.id || !/^[a-z0-9-]+$/.test(r.id)) errors.push(`${where}: id は英小文字・数字・ハイフンで指定してください`)
    if (seen.has(r.id)) errors.push(`${where}: id が重複しています（${r.id}）`)
    seen.add(r.id)
    if (!CATEGORIES.includes(r.category)) errors.push(`${where}: 不明なカテゴリ ${r.category}`)
    if (!r.suggestedSlots?.length || r.suggestedSlots.some((s) => !SLOTS.includes(s))) errors.push(`${where}: suggestedSlots が不正です`)
    if (!r.ingredients?.length) {
      errors.push(`${where}: 材料がありません`)
      continue
    }
    const unknown = r.ingredients.flatMap((i) => [i.foodId, ...(i.alternatives ?? [])]).filter((id) => !foods.has(id))
    if (unknown.length) {
      errors.push(`${where}: 成分表にない食品番号 ${unknown.join(', ')}`)
      continue
    }
    if (r.ingredients.some((i) => !(i.grams > 0))) errors.push(`${where}: グラム数は正の数で指定してください`)
    if (r.recipe) for (const p of recipeProblems(r.recipe, foods)) errors.push(`${where}の作り方: ${p}`)

    const totals = ingredientsTotals(r.ingredients, foods)
    const nutrients = {} as Nutrients
    for (const k of NUTRIENT_KEYS) nutrients[k] = round(totals.values[k])
    const kcal = nutrients.energyKcal ?? 0
    if ((r.category !== 'drink' && kcal < KCAL_RANGE.min) || kcal > KCAL_RANGE.max) warnings.push(`${where}: 1人前 ${kcal} kcal は範囲外の可能性`)
    if ((nutrients.salt ?? 0) > SALT_MAX) warnings.push(`${where}: 食塩 ${nutrients.salt} g は多すぎる可能性`)

    // 1品ずつの絵がなければ、ジャンル別の共通の絵（genre/）を使う
    const genre = `genre/${illustrationGenre(r.name, r.category)}.svg`
    const illustration =
      ILLUSTRATION_EXTS.map((ext) => `${r.id}.${ext}`).find((f) => illustrations.has(f)) ?? (illustrations.has(genre) ? genre : '')
    dishes.push({
      id: r.id,
      name: r.name,
      kana: r.kana,
      category: r.category,
      suggestedSlots: r.suggestedSlots,
      illustration,
      ingredients: r.ingredients,
      nutrients,
      ...(totals.missing.size ? { missingNutrients: [...totals.missing] } : {}),
      ...(r.source ? { source: r.source } : {}),
      ...(r.recipe ? { recipe: r.recipe } : {}),
    })
  }
  return { dishes, errors, warnings }
}
