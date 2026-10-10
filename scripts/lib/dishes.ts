// 料理レシピ（YAML）→ 配信用の料理データ（純粋関数）
import { ingredientsTotals } from '../../src/domain/nutrition'
import { NUTRIENT_KEYS, SLOTS, type Dish, type DishCategory, type Food, type Ingredient, type Nutrients } from '../../src/domain/types'

export type RecipeInput = {
  id: string
  name: string
  kana: string
  category: DishCategory
  suggestedSlots: Dish['suggestedSlots']
  ingredients: Ingredient[]
}

const CATEGORIES: DishCategory[] = ['staple', 'main', 'side', 'soup', 'noodle', 'bowl', 'bread', 'snack', 'drink', 'alcohol']

// 1人前としてありえない値の目安（警告のみ）。お茶などはほぼ0kcalなので下限を見ない
const KCAL_RANGE = { min: 5, max: 1500 }
const SALT_MAX = 10

export type BuildResult = { dishes: Dish[]; errors: string[]; warnings: string[] }

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

    const totals = ingredientsTotals(r.ingredients, foods)
    const nutrients = {} as Nutrients
    for (const k of NUTRIENT_KEYS) nutrients[k] = round(totals.values[k])
    const kcal = nutrients.energyKcal ?? 0
    if ((r.category !== 'drink' && kcal < KCAL_RANGE.min) || kcal > KCAL_RANGE.max) warnings.push(`${where}: 1人前 ${kcal} kcal は範囲外の可能性`)
    if ((nutrients.salt ?? 0) > SALT_MAX) warnings.push(`${where}: 食塩 ${nutrients.salt} g は多すぎる可能性`)

    const illustration = ILLUSTRATION_EXTS.map((ext) => `${r.id}.${ext}`).find((f) => illustrations.has(f)) ?? ''
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
    })
  }
  return { dishes, errors, warnings }
}
