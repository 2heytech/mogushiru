import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mergeProducts, withNullNutrients } from '../../src/data/products'
import type { Catalog } from '../../src/domain/nutrition'
import type { PriceTable } from '../../src/domain/ranking'
import type { Dish, Food, Product } from '../../src/domain/types'

// ページの書き出し（prerender.tsx）と、サイトマップの更新日（update-lastmod.ts）で使うデータを、配信用の JSON（public/data）から読む。
// アプリと同じデータ・同じ計算になる
export function loadSiteInputs(dataDir = 'public/data'): { catalog: Catalog; prices: PriceTable } {
  const readJson = <T>(file: string): T => JSON.parse(readFileSync(join(dataDir, file), 'utf8')) as T
  const dishes = readJson<{ dishes: Dish[] }>('dishes.json').dishes
  const foods = readJson<{ foods: Food[] }>('foods.json').foods
  const products = readJson<{ products: Product[] }>('products.json').products
  const stores = readJson<{ products: Product[] }>('store-products.json').products
  const priceRows = readJson<{ prices: { foodId: string; yenPer100g: number; item: string }[] }>('prices.json').prices
  return {
    catalog: {
      dishes: new Map(dishes.map((d) => [d.id, d])),
      foods: new Map(foods.map((f) => [f.id, f])),
      products: mergeProducts(stores.map(withNullNutrients), products),
      myDishes: new Map(),
    },
    prices: new Map(priceRows.map((p) => [p.foodId, { yenPer100g: p.yenPer100g, item: p.item }])),
  }
}
