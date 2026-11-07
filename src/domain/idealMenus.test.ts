import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { IDEAL_MENUS, adjustIdealMenu, portionRole, summarizeIdealMenu } from './idealMenus'
import { WANT_NUTRIENTS } from './nutrientChecks'
import type { Catalog } from './nutrition'
import { computeTargets } from './targets'
import { SLOTS, type Activity, type Dish, type Goal, type Profile, type Sex } from './types'

const { dishes } = JSON.parse(readFileSync(new URL('../../public/data/dishes.json', import.meta.url), 'utf8')) as { dishes: Dish[] }
const catalog: Catalog = { dishes: new Map(dishes.map((d) => [d.id, d])), myDishes: new Map(), products: new Map(), foods: new Map() }

// 性別 × 年齢 × ふだんの活動量（目安 約1,400〜3,200 kcal）
const PROFILES: Profile[] = (['female', 'male'] as Sex[]).flatMap((sex) =>
  [20, 35, 55, 70, 80].flatMap((age) => (['low', 'normal', 'high'] as Activity[]).map((activity) => ({ sex, age, activity }))),
)
const label = (p: Profile) => `${p.sex === 'male' ? '男性' : '女性'}${p.age}歳・${p.activity}${p.goal ? `・${p.goal}` : ''}`

describe('理想の献立', () => {
  it('献立の料理がすべて料理データにある', () => {
    for (const m of IDEAL_MENUS) for (const slot of SLOTS) for (const x of m.slots[slot]) expect(catalog.dishes.has(typeof x === 'string' ? x : x[0]), `${m.id} ${x}`).toBe(true)
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

  it('女性30〜49歳・ふつう（プロフィール未入力の目安）で、とりたい栄養素がほぼ目安に届く', () => {
    const t = computeTargets({ sex: 'female', age: 35, activity: 'normal' })
    for (const m of IDEAL_MENUS) {
      const s = summarizeIdealMenu(adjustIdealMenu(m, catalog, t), catalog, t)
      const want = s.checks.filter((c) => (WANT_NUTRIENTS as readonly string[]).includes(c.key))
      // 8割未満（少ない）は2つまで、全体の3分の2以上は目安以上
      expect(want.filter((c) => c.status === 'low').length, m.id).toBeLessThanOrEqual(2)
      expect(want.filter((c) => c.status === 'ok').length, m.id).toBeGreaterThanOrEqual(Math.ceil((want.length * 2) / 3))
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

  it('量は0.1人前きざみで、主食は小盛り〜大盛り・おかずは控えめ〜多め・果物や牛乳などはそのまま', () => {
    for (const profile of PROFILES) {
      const t = computeTargets(profile)
      for (const m of IDEAL_MENUS) {
        const menu = adjustIdealMenu(m, catalog, t)
        for (const slot of SLOTS)
          for (const item of menu[slot]) {
            const role = portionRole(catalog.dishes.get(item.refId)!)
            expect(Math.round(item.portion * 10) / 10).toBe(item.portion)
            if (role === 'fixed') expect(item.portion).toBe(1)
            if (role === 'dish') expect(item.portion).toBeGreaterThanOrEqual(0.7)
            if (role === 'dish') expect(item.portion).toBeLessThanOrEqual(1.5)
            if (role === 'staple') expect(item.portion).toBeGreaterThanOrEqual(0.5)
            if (role === 'staple') expect(item.portion).toBeLessThanOrEqual(3)
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
