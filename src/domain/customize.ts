import type { Ingredient } from './types'

// 入れ替え候補は「いまの食材＋alternatives」。入れ替えたら元の食材を候補側へ回す
export function swapIngredient(ing: Ingredient, foodId: string): Ingredient {
  const options = [ing.foodId, ...(ing.alternatives ?? [])]
  if (!options.includes(foodId)) return ing
  return { ...ing, foodId, alternatives: options.filter((id) => id !== foodId) }
}
