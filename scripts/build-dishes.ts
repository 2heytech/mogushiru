// 使い方: npx tsx scripts/build-dishes.ts
// data/recipes/*.yaml と public/data/foods.json から public/data/dishes.json を生成する
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { parse } from 'yaml'
import type { Food } from '../src/domain/types'
import { buildDishes, type RecipeInput } from './lib/dishes'

const foods = new Map(
  (JSON.parse(readFileSync('public/data/foods.json', 'utf8')) as { foods: Food[] }).foods.map((f) => [f.id, f]),
)
const recipes = readdirSync('data/recipes')
  .filter((f) => f.endsWith('.yaml'))
  .sort()
  .flatMap((f) => parse(readFileSync(`data/recipes/${f}`, 'utf8')) as RecipeInput[])
const illustrations = new Set(existsSync('public/illustrations') ? readdirSync('public/illustrations') : [])

const { dishes, errors, warnings } = buildDishes(recipes, foods, illustrations)
for (const w of warnings) console.warn(`注意: ${w}`)
if (errors.length) {
  for (const e of errors) console.error(`エラー: ${e}`)
  process.exit(1)
}
writeFileSync('public/data/dishes.json', JSON.stringify({ dishes }))
const withIllust = dishes.filter((d) => d.illustration).length
console.log(`料理 ${dishes.length}品（イラストあり ${withIllust}品）`)
for (const d of dishes) {
  const n = d.nutrients
  console.log(`  ${d.name}: ${Math.round(n.energyKcal ?? 0)}kcal P${n.protein} F${n.fat} C${n.carb} 食塩${n.salt}g${n.alcohol ? ` アルコール${n.alcohol}g` : ''}`)
}
