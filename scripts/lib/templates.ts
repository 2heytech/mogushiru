// 料理の型（テンプレート）→ 料理レシピへの展開（純粋関数）
// 例: 「{name}の塩焼き」の型に、あじ・ぶり・さんま…の食品番号と量を当てはめて料理を作る
import type { Ingredient } from '../../src/domain/types'
import type { RecipeInput } from './dishes'

type TemplateIngredient = Omit<Ingredient, 'foodId' | 'grams'> & { foodId: string; grams: number | string }

export type TemplateVariant = {
  id: string
  name: string
  kana: string
  food?: string
  grams?: number
  alternatives?: string[]
  // 型の材料に足す材料（具や付け合わせ）
  extra?: Ingredient[]
  suggestedSlots?: RecipeInput['suggestedSlots']
}

export type TemplateInput = Omit<RecipeInput, 'id' | 'ingredients'> & {
  template: string
  ingredients: TemplateIngredient[]
  variants: TemplateVariant[]
}

export const isTemplate = (x: RecipeInput | TemplateInput): x is TemplateInput => 'template' in x

const fill = (s: string, v: TemplateVariant) => s.replaceAll('{name}', v.name).replaceAll('{kana}', v.kana)

export function expandTemplate(t: TemplateInput): { recipes: RecipeInput[]; errors: string[] } {
  const errors: string[] = []
  const recipes = (t.variants ?? []).map((v) => {
    const ingredients: Ingredient[] = t.ingredients.map(({ foodId, grams, ...rest }) => {
      const usesVariant = foodId === '{food}'
      if (usesVariant && !v.food) errors.push(`型「${t.template}」の「${v.name}」: food がありません`)
      if (grams === '{grams}' && !(typeof v.grams === 'number')) errors.push(`型「${t.template}」の「${v.name}」: grams がありません`)
      return {
        ...rest,
        foodId: usesVariant ? (v.food ?? '') : foodId,
        grams: grams === '{grams}' ? (v.grams ?? 0) : Number(grams),
        ...(usesVariant && v.alternatives ? { alternatives: v.alternatives } : {}),
      }
    })
    return {
      id: `${t.template}-${v.id}`,
      name: fill(t.name, v),
      kana: fill(t.kana, v),
      category: t.category,
      suggestedSlots: v.suggestedSlots ?? t.suggestedSlots,
      ingredients: [...ingredients, ...(v.extra ?? [])],
    }
  })
  return { recipes, errors }
}
