/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FOOD_PORTION, NOT_POPULAR, POPULAR_BY_SLOT, popularRank } from './popular'

// 配信用のJSON（public/data）を読む
const read = (name: string) => readFileSync(new URL(`../../public/data/${name}`, import.meta.url), 'utf8')
const dishesJson = read('dishes.json')
const foodsJson = read('foods.json')
const dishIds = new Set((JSON.parse(dishesJson) as { dishes: { id: string }[] }).dishes.map((d) => d.id))
const foodIds = new Set((JSON.parse(foodsJson) as { foods: { id: string }[] }).foods.map((f) => f.id))

describe('よく食べられるもの', () => {
  it('リストの料理・食材はすべてデータにある', () => {
    for (const keys of Object.values(POPULAR_BY_SLOT)) {
      for (const key of keys) {
        const [kind, id] = key.split(':')
        expect(kind === 'dish' ? dishIds.has(id) : kind === 'food' && foodIds.has(id), key).toBe(true)
      }
    }
    for (const id of Object.keys(FOOD_PORTION)) expect(foodIds.has(id), id).toBe(true)
  })
  it('区分ごとに重複がない', () => {
    for (const keys of Object.values(POPULAR_BY_SLOT)) expect(new Set(keys).size).toBe(keys.length)
  })
  it('朝は食パン・いちごジャムが上位', () => {
    expect(popularRank('breakfast', 'food:01026')).toBe(0)
    expect(popularRank('breakfast', 'food:07013')).toBe(1)
    expect(popularRank('lunch', 'food:01026')).toBe(NOT_POPULAR)
  })
  it('ヨーグルトは無糖より加糖が上', () => {
    for (const slot of ['breakfast', 'other'] as const) {
      expect(popularRank(slot, 'dish:sweets-yogurt-sweet')).toBeLessThan(popularRank(slot, 'dish:yogurt'))
    }
  })
  it('間食はお菓子、昼はおにぎり・麺類が上位', () => {
    expect(popularRank('other', 'dish:chocolate')).toBe(0)
    expect(popularRank('lunch', 'dish:onigiri-salmon')).toBeLessThan(10)
    expect(popularRank('lunch', 'dish:shoyu-ramen')).toBeLessThan(10)
  })
})
