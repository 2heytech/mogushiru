import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { shortFoodName } from '../../src/domain/customize'
import { RAW_FORMS, RECIPE_NAMES } from '../../src/domain/recipe'
import type { Dish, Food } from '../../src/domain/types'

// 料理データ（public/data/dishes.json）の作り方を確かめる
const { dishes } = JSON.parse(readFileSync('public/data/dishes.json', 'utf8')) as { dishes: Dish[] }
const { foods } = JSON.parse(readFileSync('public/data/foods.json', 'utf8')) as { foods: Food[] }
const foodById = new Map(foods.map((f) => [f.id, f]))
const withRecipe = dishes.filter((d) => d.recipe)

// 作り方の文で、材料表の名前とちがう言い方をしてよいもの
const ALIASES: Record<string, string[]> = {
  ほうれんそう: ['ほうれん草'],
  大根: ['だいこん'],
  たらこ: ['焼きたらこ'],
}

describe('料理の作り方（データ）', () => {
  it('作り方のある料理が50品以上ある', () => {
    expect(withRecipe.length).toBeGreaterThanOrEqual(50)
  })

  it('主な材料（役割のある材料）が、手順のどこかに出てくる', () => {
    const problems: string[] = []
    for (const d of withRecipe) {
      if (d.recipe?.materials) continue
      const text = d.recipe!.steps.join('')
      for (const ing of d.ingredients.filter((i) => i.role)) {
        const id = RAW_FORMS[ing.foodId]?.rawId ?? ing.foodId
        const own = d.recipe!.names?.[ing.foodId] ?? d.recipe!.names?.[id] ?? ''
        const names = [ing.role!, shortFoodName(foodById.get(ing.foodId)?.displayName ?? ''), RECIPE_NAMES[id] ?? '', own].filter(Boolean)
        const all = names.flatMap((n) => [n, ...(ALIASES[n] ?? [])])
        if (!all.some((n) => text.includes(n))) problems.push(`${d.name}: ${names.join('／')}`)
      }
    }
    expect(problems).toEqual([])
  })

  it('作り方の材料の食品は、成分表にある', () => {
    for (const r of Object.values(RAW_FORMS)) expect(foodById.has(r.rawId)).toBe(true)
  })

  it('郷土料理には作り方を書かない（元のページへ案内する）', () => {
    expect(dishes.filter((d) => d.source && d.recipe)).toEqual([])
  })
})
