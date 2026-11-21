import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { mergeProducts } from '../data/products'
import { adjustIdealMenu, IDEAL_MENUS, idealMenuAvailable, idealMenuHasProducts } from './idealMenus'
import type { Catalog } from './nutrition'
import { resultPreview, SAMPLE_MENU_ID } from './resultPreview'
import { computeTargets, DEFAULT_PROFILE } from './targets'
import { SLOTS, type DayMenu, type Dish, type Food, type Product } from './types'

// 最初の画面と同じ：料理・食材・市販品（products.json）だけ。コンビニ・メーカーの商品（store-products.json）は読まない
const readData = <T,>(file: string) => JSON.parse(readFileSync(new URL(`../../public/data/${file}`, import.meta.url), 'utf8')) as T
const catalog: Catalog = {
  dishes: new Map(readData<{ dishes: Dish[] }>('dishes.json').dishes.map((d) => [d.id, d])),
  foods: new Map(readData<{ foods: Food[] }>('foods.json').foods.map((f) => [f.id, f])),
  products: mergeProducts([], readData<{ products: Product[] }>('products.json').products),
  myDishes: new Map(),
}
const targets = computeTargets(DEFAULT_PROFILE)
const sample = IDEAL_MENUS.find((m) => m.id === SAMPLE_MENU_ID)!

describe('最初の画面の「結果の例」', () => {
  it('例に使う献立は、コンビニ・メーカーの商品を読まなくても入れられる', () => {
    expect(sample).toBeDefined()
    expect(idealMenuHasProducts(sample)).toBe(false)
    expect(idealMenuAvailable(sample, catalog)).toBe(true)
  })

  it('献立の名前・品数・カロリー・PFCバランス・まとめを出す', () => {
    const menu = adjustIdealMenu(sample, catalog, targets)
    const p = resultPreview(sample.name, menu, catalog, targets)
    expect(p.name).toBe(sample.name)
    expect(p.count).toBe(SLOTS.reduce((n, s) => n + menu[s].length, 0))
    expect(p.count).toBeGreaterThan(5)
    expect(p.targetKcal).toBe(targets.energyKcal)
    // 目安に合わせた量にしてあるので、カロリーは目安の±10%に入る
    expect(Math.abs(p.kcal - targets.energyKcal)).toBeLessThanOrEqual(targets.energyKcal * 0.1)
    expect(p.gaps?.map((g) => g.key)).toEqual(['p', 'f', 'c'])
    // 朝・昼・晩がそろっているので、入力の途中にはならない
    expect(p.summary.state).toBe('full')
    expect(p.summary.ok).toContain('energy')
  })

  it('まだ入っていない食事があれば、入力の途中として出す', () => {
    const menu: DayMenu = { ...adjustIdealMenu(sample, catalog, targets), dinner: [] }
    const p = resultPreview(sample.name, menu, catalog, targets)
    expect(p.summary.state).toBe('partial')
    expect(p.summary.missing).toEqual(['dinner'])
  })
})
