// 理想の献立のテストで共通に使うもの（テストの実行時間を短くするため、献立 × プロフィールの量の調整は1回だけ計算する）
import { readFileSync } from 'node:fs'
import { adjustIdealMenu, summarizeIdealMenu, type IdealMenu } from './idealMenus'
import type { Catalog } from './nutrition'
import { computeTargets, type Targets } from './targets'
import { NUTRIENT_KEYS, type Activity, type DayMenu, type Dish, type Product, type Profile, type Sex } from './types'

const readData = <T,>(file: string) => JSON.parse(readFileSync(new URL(`../../public/data/${file}`, import.meta.url), 'utf8')) as T
const { dishes } = readData<{ dishes: Dish[] }>('dishes.json')
// アプリと同じく、コンビニ・メーカーの商品（store-products.json。書かれていない栄養素は null）を、そのほかの市販品より優先して合わせる
const withNulls = (p: Product): Product => ({ ...p, nutrients: Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, p.nutrients[k] ?? null])) as Product['nutrients'] })
const stores = readData<{ products: Product[] }>('store-products.json').products.map(withNulls)
const others = readData<{ products: Product[] }>('products.json').products
export const products = new Map([...others, ...stores].map((p) => [p.jan, p]))
export const catalog: Catalog = { dishes: new Map(dishes.map((d) => [d.id, d])), myDishes: new Map(), products, foods: new Map() }

// 性別 × 年齢 × ふだんの活動量（目安 約1,400〜3,200 kcal）
export const profilesOf = (sex: Sex): Profile[] => [20, 35, 55, 70, 80].flatMap((age) => (['low', 'normal', 'high'] as Activity[]).map((activity) => ({ sex, age, activity })))
export const PROFILES: Profile[] = [...profilesOf('female'), ...profilesOf('male')]
export const label = (p: Profile) => `${p.sex === 'male' ? '男性' : '女性'}${p.age}歳・${p.activity}${p.goal ? `・${p.goal}` : ''}`

const cache = new Map<string, { t: Targets; menu: DayMenu; summary: ReturnType<typeof summarizeIdealMenu> }>()
export function planned(m: IdealMenu, profile: Profile) {
  const key = `${m.id}|${JSON.stringify(profile)}`
  let v = cache.get(key)
  if (!v) {
    const t = computeTargets(profile)
    const menu = adjustIdealMenu(m, catalog, t)
    v = { t, menu, summary: summarizeIdealMenu(menu, catalog, t) }
    cache.set(key, v)
  }
  return v
}
