import type { Catalog } from '../domain/nutrition'
import type { Dish, DishCategory, Food, MenuItem, Product } from '../domain/types'

// 料理の絵。まだ絵のない料理は、カテゴリ色のふた付きのお皿（public/illustrations/category/）を出す
export function dishImage(dish: Pick<Dish, 'illustration' | 'category'>): string {
  return dish.illustration ? `/illustrations/${dish.illustration}` : categoryImage(dish.category)
}

export function categoryImage(category: DishCategory): string {
  return `/illustrations/category/${category}.svg`
}

// 1品ずつ絵のある食材（public/illustrations/food/<食品番号>.svg）。ほかの食材は食品群の絵（food-group/）
const FOOD_ILLUSTRATIONS = new Set(['01026', '07013', '14017', '14020', '03022', '01137', '09004'])
const FOOD_GROUPS = new Set(Array.from({ length: 18 }, (_, i) => String(i + 1).padStart(2, '0')))

export function foodImage(food: Pick<Food, 'id' | 'group'>): string {
  if (FOOD_ILLUSTRATIONS.has(food.id)) return `/illustrations/food/${food.id}.svg`
  return `/illustrations/food-group/${FOOD_GROUPS.has(food.group) ? food.group : '18'}.svg`
}

// 市販品はカテゴリごとの絵（public/illustrations/product/<カテゴリ>.svg）
const PRODUCT_CATEGORIES = new Set(['my', 'supplement', 'onigiri', 'bento', 'sandwich', 'noodle', 'bread', 'side', 'dairy', 'snack', 'dessert', 'drink', 'alcohol', 'seasoning', 'ingredient', 'other'])

export function productImage(product: Pick<Product, 'category'>): string {
  return `/illustrations/product/${PRODUCT_CATEGORIES.has(product.category) ? product.category : 'other'}.svg`
}

export const SUPPLEMENT_IMAGE = '/illustrations/product/supplement.svg'

// 献立の項目の絵（お気に入りの料理は元の料理の絵を使う）
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
  if (item.kind === 'food') {
    const f = catalog.foods.get(item.refId)
    return f && foodImage(f)
  }
  if (item.kind === 'supplement') return SUPPLEMENT_IMAGE
  if (item.kind === 'product') {
    const p = catalog.products.get(item.refId)
    return p && productImage(p)
  }
  return undefined
}
