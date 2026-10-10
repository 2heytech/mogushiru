import type { Catalog } from '../domain/nutrition'
import type { MenuItem } from '../domain/types'

export function itemName(item: MenuItem, catalog: Catalog): string {
  switch (item.kind) {
    case 'dish': {
      const name = catalog.dishes.get(item.refId)?.name ?? '（不明な料理）'
      return item.customIngredients ? `${name}（アレンジ）` : name
    }
    case 'myDish':
      return catalog.myDishes.get(item.refId)?.name ?? '（削除されたお気に入り）'
    case 'product':
      return catalog.products.get(item.refId)?.name ?? '（不明な市販品）'
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
  return item.portion === 1 ? '' : `×${item.portion}`
}
