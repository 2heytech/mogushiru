import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { IDEAL_MENUS, adjustIdealMenu, idealMenuAvailable, idealMenuHasProducts, idealProductJan, menuItemRole, summarizeIdealMenu } from './idealMenus'
import { WANT_NUTRIENTS } from './nutrientChecks'
import type { Catalog } from './nutrition'
import { slotBalance } from './slotBalance'
import { computeTargets } from './targets'
import { NUTRIENT_KEYS, SLOTS, type Activity, type Dish, type Goal, type Product, type Profile, type Sex } from './types'

const readData = <T,>(file: string) => JSON.parse(readFileSync(new URL(`../../public/data/${file}`, import.meta.url), 'utf8')) as T
const { dishes } = readData<{ dishes: Dish[] }>('dishes.json')
// アプリと同じく、コンビニ・メーカーの商品（store-products.json。書かれていない栄養素は null）を、そのほかの市販品より優先して合わせる
const withNulls = (p: Product): Product => ({ ...p, nutrients: Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, p.nutrients[k] ?? null])) as Product['nutrients'] })
const stores = readData<{ products: Product[] }>('store-products.json').products.map(withNulls)
const others = readData<{ products: Product[] }>('products.json').products
const products = new Map([...others, ...stores].map((p) => [p.jan, p]))
const catalog: Catalog = { dishes: new Map(dishes.map((d) => [d.id, d])), myDishes: new Map(), products, foods: new Map() }

// 性別 × 年齢 × ふだんの活動量（目安 約1,400〜3,200 kcal）
const PROFILES: Profile[] = (['female', 'male'] as Sex[]).flatMap((sex) =>
  [20, 35, 55, 70, 80].flatMap((age) => (['low', 'normal', 'high'] as Activity[]).map((activity) => ({ sex, age, activity }))),
)
const label = (p: Profile) => `${p.sex === 'male' ? '男性' : '女性'}${p.age}歳・${p.activity}${p.goal ? `・${p.goal}` : ''}`

describe('理想の献立', () => {
  // コンビニの商品は毎月のデータ更新でなくなることがある。落ちたら、同じお店の似た商品に差し替える
  it('献立の料理・市販品がすべてデータにある', () => {
    for (const m of IDEAL_MENUS) {
      for (const slot of SLOTS)
        for (const x of m.slots[slot]) {
          const jan = idealProductJan(x)
          expect(jan ? catalog.products.has(jan) : catalog.dishes.has(typeof x === 'string' ? x : x[0]), `${m.id} ${x}`).toBe(true)
        }
      expect(idealMenuAvailable(m, catalog), m.id).toBe(true)
      for (const x of Object.values(m.extras).flat()) expect(catalog.dishes.has(typeof x === 'string' ? x : x[0]), `${m.id} 足す一品 ${x}`).toBe(true)
    }
  })

  it('足す一品は、同じ献立の料理と重ならない', () => {
    for (const m of IDEAL_MENUS) {
      const idOf = (x: string | [string, ...number[]]) => (typeof x === 'string' ? x : x[0])
      const base = new Set(SLOTS.flatMap((slot) => m.slots[slot]).map(idOf))
      const extras = Object.values(m.extras).flat().map(idOf)
      expect(extras.filter((id, i) => base.has(id) || extras.indexOf(id) !== i), m.id).toEqual([])
    }
  })

  it('市販品を使う献立もある', () => {
    expect(IDEAL_MENUS.filter(idealMenuHasProducts).length).toBeGreaterThanOrEqual(2)
  })

  it('朝・昼・晩・その他のどれにも料理がある', () => {
    for (const m of IDEAL_MENUS) for (const slot of SLOTS) expect(m.slots[slot].length, `${m.id} ${slot}`).toBeGreaterThan(0)
  })

  it.each(PROFILES.map((p) => [label(p), p] as const))('%s：カロリー・PFC・食塩が目安に収まり、とりすぎがない', (_, profile) => {
    const t = computeTargets(profile)
    for (const m of IDEAL_MENUS) {
      const s = summarizeIdealMenu(adjustIdealMenu(m, catalog, t), catalog, t)
      const v = s.totals.day.values
      expect(Math.abs(v.energyKcal - t.energyKcal) / t.energyKcal, `${m.id} kcal ${Math.round(v.energyKcal)}/${t.energyKcal}`).toBeLessThanOrEqual(0.05)
      for (const k of ['p', 'f', 'c'] as const) {
        expect(s.ratio![k], `${m.id} ${k}`).toBeGreaterThanOrEqual(t.pfcRatio[k].lo)
        expect(s.ratio![k], `${m.id} ${k}`).toBeLessThanOrEqual(t.pfcRatio[k].hi)
      }
      expect(v.salt, `${m.id} 食塩`).toBeLessThan(t.saltMax)
      expect(s.checks.filter((c) => c.status === 'over').map((c) => c.key), m.id).toEqual([])
    }
  })

  // 市販品はパッケージの表示にある成分（エネルギー・PFC・食塩など）しかなく、ビタミン・ミネラルを確かめられないので、料理だけの献立で見る
  it('女性30〜49歳・ふつう（プロフィール未入力の目安）で、とりたい栄養素がほぼ目安に届く（料理だけの献立）', () => {
    const t = computeTargets({ sex: 'female', age: 35, activity: 'normal' })
    for (const m of IDEAL_MENUS.filter((x) => !idealMenuHasProducts(x))) {
      const s = summarizeIdealMenu(adjustIdealMenu(m, catalog, t), catalog, t)
      const want = s.checks.filter((c) => (WANT_NUTRIENTS as readonly string[]).includes(c.key))
      // 8割未満（少ない）は2つまで、全体の3分の2以上は目安以上
      expect(want.filter((c) => c.status === 'low').length, m.id).toBeLessThanOrEqual(2)
      expect(want.filter((c) => c.status === 'ok').length, m.id).toBeGreaterThanOrEqual(Math.ceil((want.length * 2) / 3))
    }
  })

  // ごはんのない区分（コンビニのお昼など）も、市販品や果物を1個ずつ動かして区分の目安に合わせる
  it('女性30〜49歳・ふつう（プロフィール未入力の目安）で、朝・昼・晩とも区分の目安の±20%に入る', () => {
    const t = computeTargets({ sex: 'female', age: 35, activity: 'normal' })
    for (const m of IDEAL_MENUS) {
      const totals = summarizeIdealMenu(adjustIdealMenu(m, catalog, t), catalog, t).totals
      for (const slot of ['breakfast', 'lunch', 'dinner'] as const) expect(slotBalance(totals.bySlot[slot], slot, t).energy, `${m.id} ${slot}`).toBe('ok')
    }
  })

  // ごはん2人前のような量にはせず、足りない分は足す一品で補う
  it('女性30〜49歳・ふつう（プロフィール未入力の目安）では、ごはんなど主食は1.3人前まで', () => {
    const t = computeTargets({ sex: 'female', age: 35, activity: 'normal' })
    for (const m of IDEAL_MENUS) {
      const menu = adjustIdealMenu(m, catalog, t)
      for (const slot of SLOTS)
        for (const item of menu[slot]) if (menuItemRole(item, catalog) === 'staple') expect(item.portion, `${m.id} ${item.refId}`).toBeLessThanOrEqual(1.3)
    }
  })

  it('体重を減らす・増やす目標でも、カロリーは目安の±5%に収まる', () => {
    for (const [profile, goal] of [
      [{ sex: 'female', age: 35, activity: 'low' }, 'lose'],
      [{ sex: 'male', age: 20, activity: 'high' }, 'gain'],
    ] as [Profile, Goal][]) {
      const t = computeTargets({ ...profile, goal })
      for (const m of IDEAL_MENUS) {
        const kcal = summarizeIdealMenu(adjustIdealMenu(m, catalog, t), catalog, t).kcal
        expect(Math.abs(kcal - t.energyKcal) / t.energyKcal, `${m.id} ${goal}`).toBeLessThanOrEqual(0.05)
      }
    }
  })

  it('量は0.1人前きざみで、主食は小盛り〜大盛り（1.5人前まで）・おかずは控えめ〜多め・果物や牛乳は1個', () => {
    for (const profile of PROFILES) {
      const t = computeTargets(profile)
      for (const m of IDEAL_MENUS) {
        const menu = adjustIdealMenu(m, catalog, t)
        for (const slot of SLOTS)
          for (const item of menu[slot]) {
            const role = menuItemRole(item, catalog)
            expect(Math.round(item.portion * 10) / 10).toBe(item.portion)
            if (role === 'fixed') expect(item.portion, `${m.id} ${item.refId}`).toBe(1)
            if (role === 'count') expect(item.portion).toBeGreaterThan(0)
            // 1個・1食で表示の市販品（おにぎり・サラダなど）は個数
            if (item.kind === 'product' && products.get(item.refId)!.basis === 'serving') expect(Number.isInteger(item.portion), item.refId).toBe(true)
            if (role === 'dish') expect(item.portion).toBeGreaterThanOrEqual(0.7)
            if (role === 'dish') expect(item.portion).toBeLessThanOrEqual(1.5)
            if (role === 'staple') expect(item.portion).toBeGreaterThanOrEqual(0.5)
            if (role === 'staple') expect(item.portion, `${m.id} ${label(profile)} ${item.refId}`).toBeLessThanOrEqual(1.5)
          }
      }
    }
  })

  it('配分が0%の区分（朝食をとらないなど）は空にして、ほかの区分で1日の目安に合わせる', () => {
    const t = computeTargets({ sex: 'female', age: 35, activity: 'normal', slotShare: { breakfast: 0, lunch: 45, dinner: 45, other: 10 } })
    for (const m of IDEAL_MENUS) {
      const menu = adjustIdealMenu(m, catalog, t)
      expect(menu.breakfast).toEqual([])
      const kcal = summarizeIdealMenu(menu, catalog, t).kcal
      expect(Math.abs(kcal - t.energyKcal) / t.energyKcal, m.id).toBeLessThanOrEqual(0.05)
    }
  })
})
