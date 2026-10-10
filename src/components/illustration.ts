import type { Catalog } from '../domain/nutrition'
import type { Dish, DishCategory, MenuItem } from '../domain/types'

// 料理の絵。まだ絵のない料理は、カテゴリ色のふた付きのお皿（public/illustrations/category/）を出す
export function dishImage(dish: Pick<Dish, 'illustration' | 'category'>): string {
  return dish.illustration ? `/illustrations/${dish.illustration}` : categoryImage(dish.category)
}

export function categoryImage(category: DishCategory): string {
  return `/illustrations/category/${category}.svg`
}

// 献立の項目の絵（料理とお気に入りの料理だけ。お気に入りの料理は元の料理の絵を使う）
export function menuItemImage(item: MenuItem, catalog: Catalog): string | undefined {
  if (item.kind === 'dish') {
    const d = catalog.dishes.get(item.refId)
    return d && dishImage(d)
  }
  if (item.kind === 'myDish') {
    const base = catalog.myDishes.get(item.refId)?.baseDishId
    const d = base ? catalog.dishes.get(base) : undefined
    return d ? dishImage(d) : '/illustrations/category/main.svg'
  }
  return undefined
}
