import type { Catalog } from '../domain/nutrition'
import type { MenuItem } from '../domain/types'

export function itemName(item: MenuItem, catalog: Catalog): string {
  switch (item.kind) {
    case 'dish': {
      const name = catalog.dishes.get(item.refId)?.name ?? '（不明な料理）'
      return item.customIngredients ? `${name}（アレンジ）` : name
    }
    case 'myDish': {
      const name = catalog.myDishes.get(item.refId)?.name ?? '（削除されたお気に入り）'
      return item.customIngredients ? `${name}（アレンジ）` : name
    }
    case 'product':
      return catalog.products.get(item.refId)?.name ?? '（不明な市販品）'
    case 'supplement':
      return catalog.products.get(item.refId)?.name ?? '（削除されたサプリ）'
    case 'food':
      return catalog.foods.get(item.refId)?.displayName ?? '（不明な食材）'
  }
}

// 人前で数えるもの（料理・お気に入りの料理・1食基準の市販品）と、グラムで数えるもの
export function usesGrams(item: MenuItem, catalog: Catalog): boolean {
  if (item.kind === 'food') return true
  if (item.kind === 'product') return catalog.products.get(item.refId)?.basis !== 'serving'
  return false
}

export function portionLabel(item: MenuItem, catalog: Catalog): string {
  if (usesGrams(item, catalog)) {
    const ml = item.kind === 'product' && catalog.products.get(item.refId)?.basis === '100ml'
    return `${Math.round(item.portion)}${ml ? 'mL' : 'g'}`
  }
  return item.portion === 1 ? '' : `×${Math.round(item.portion * 10) / 10}`
}

// 献立の例のページで、料理の名前のあとに書く量。「×1.1」だけでは量が思いうかばないので、
// 材料が1つの料理（ごはん・パン・あじの開きなど）は重さを書き添え（「×1.1（約165g）」）、ほかの料理は「×1.2人前」と書く。
// 料理でないもの（市販品・食材）は、アプリの画面と同じ（個数や g）。1人前ちょうどの料理は ''
export function portionText(item: MenuItem, catalog: Catalog): string {
  const label = portionLabel(item, catalog)
  const dish = item.kind === 'dish' ? catalog.dishes.get(item.refId) : undefined
  if (!label || !dish) return label
  if (dish.ingredients.length !== 1 || item.customIngredients) return `${label}人前`
  const grams = dish.ingredients[0].grams * item.portion
  // 100g 以上は5gきざみ（ごはん150g×1.1 → 約165g）
  return `${label}（約${grams >= 100 ? Math.round(grams / 5) * 5 : Math.round(grams)}g）`
}

// 飲み物は量を「缶2本」などで別に出すので、料理の名前から量を外す（「ビール（350mL缶）」→「ビール」）
export function drinkItemName(item: MenuItem, catalog: Catalog, short?: string): string {
  return short && item.kind === 'dish' && !item.customIngredients ? short : itemName(item, catalog)
}
