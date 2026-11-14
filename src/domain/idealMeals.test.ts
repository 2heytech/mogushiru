import { describe, expect, it } from 'vitest'
import { MEAL_SLOTS, fitsMealAlone, idealMeals, isMealSlot, soloMeals } from './idealMeals'
import { BREAKFAST_STYLES, DINNER_MAINS, LUNCH_STYLES, idealMealLeads, idealMenuFacets, idealSearchIndex, idealSearchTokens, matchesIdealSearch } from './idealMenuFacets'
import { IDEAL_MENUS, type IdealMenu } from './idealMenus'
import { PROFILES, catalog, label, planned } from './idealMenus.testkit'
import { slotBalance } from './slotBalance'
import { computeTargets } from './targets'
import type { Profile } from './types'

// プロフィール未入力の目安（女性30〜49歳・ふつう）
const F35: Profile = { sex: 'female', age: 35, activity: 'normal' }
const ids = (menu: IdealMenu, slot: (typeof MEAL_SLOTS)[number]) =>
  menu.slots[slot]
    .map((x) => (typeof x === 'string' ? x : x[0]))
    .sort()
    .join('|')
const search = (slot: (typeof MEAL_SLOTS)[number], query: string) => {
  const tokens = idealSearchTokens(query)
  return idealMeals(slot, IDEAL_MENUS).filter((m) => matchesIdealSearch(idealSearchIndex(m.menu, catalog, slot), tokens))
}

describe('理想の献立を1食ずつ呼び出す', { timeout: 30_000 }, () => {
  it('朝・昼・晩が1食ずつ呼び出せる（その他は対象にしない）', () => {
    expect(MEAL_SLOTS).toEqual(['breakfast', 'lunch', 'dinner'])
    expect(isMealSlot('dinner')).toBe(true)
    expect(isMealSlot('other')).toBe(false)
  })

  it('同じ組み合わせの1食は1つにまとめ、どの献立の1食も一覧のどれかに入っている', () => {
    for (const slot of MEAL_SLOTS) {
      const meals = idealMeals(slot, IDEAL_MENUS)
      // えらべるくらいの数がある
      expect(meals.length, slot).toBeGreaterThanOrEqual(20)
      expect(meals.length, slot).toBeLessThan(IDEAL_MENUS.length)
      const keys = meals.map((m) => m.key)
      expect(new Set(keys).size, slot).toBe(keys.length)
      for (const m of meals) expect(m.key, `${slot} ${m.menu.id}`).toBe(ids(m.menu, slot))
      for (const menu of IDEAL_MENUS) expect(keys, `${slot} ${menu.id}`).toContain(ids(menu, slot))
    }
  })

  it('毎食バランスの1食を先に並べ、同じ1食が両方の献立にあれば毎食バランスの献立を代表にする', () => {
    for (const slot of MEAL_SLOTS) {
      const meals = idealMeals(slot, IDEAL_MENUS)
      const firstDay = meals.findIndex((m) => !m.balanced)
      expect(firstDay, slot).toBeGreaterThan(0)
      expect(meals.slice(firstDay).every((m) => !m.balanced), slot).toBe(true)
      for (const m of meals) expect(m.balanced, `${slot} ${m.menu.id}`).toBe(m.menu.balance === 'meal')
      const perMeal = new Set(IDEAL_MENUS.filter((x) => x.balance === 'meal').map((x) => ids(x, slot)))
      for (const m of meals) expect(m.balanced, `${slot} ${m.menu.id}`).toBe(perMeal.has(m.key))
    }
  })

  it('1日でバランスの1食は、献立の並び順のまま', () => {
    const lunch = idealMeals('lunch', IDEAL_MENUS).filter((m) => !m.balanced)
    const order = lunch.map((m) => IDEAL_MENUS.findIndex((x) => ids(x, 'lunch') === m.key))
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it('市販品を使わない献立を代表にする（商品の読み込みを待たずに出せるように）', () => {
    const menu = (id: string, balance: IdealMenu['balance'], lunch: string[]): IdealMenu => ({
      id,
      name: id,
      balance,
      genre: '和食',
      lead: 'あの朝、いの昼、うの晩',
      point: '',
      slots: { breakfast: ['rice'], lunch, dinner: ['rice'], other: [] },
      extras: {},
    })
    const withProduct = menu('a', 'day', ['product:x'])
    const plain = menu('b', 'day', ['don-salmon'])
    const perMeal = menu('c', 'meal', ['don-tekka'])
    // 朝は3つとも同じなので1つにまとまり、毎食バランスの献立が代表。昼はそれぞれちがう
    expect(idealMeals('breakfast', [withProduct, plain, perMeal]).map((m) => m.menu.id)).toEqual(['c'])
    expect(idealMeals('breakfast', [withProduct, plain]).map((m) => m.menu.id)).toEqual(['b'])
    expect(idealMeals('lunch', [withProduct, plain, perMeal]).map((m) => m.menu.id)).toEqual(['c', 'a', 'b'])
  })

  it('どの1食にも名前にするひとことがあり、どの分け方にもえらべる1食がある', () => {
    const styles = { breakfast: BREAKFAST_STYLES, lunch: LUNCH_STYLES, dinner: DINNER_MAINS }
    for (const slot of MEAL_SLOTS) {
      const meals = idealMeals(slot, IDEAL_MENUS)
      for (const m of meals) expect(idealMealLeads(m.menu)?.[slot], `${slot} ${m.menu.id}`).toBeTruthy()
      const found = meals.map((m) => idealMenuFacets(m.menu, catalog)[slot] as string)
      for (const k of styles[slot]) expect(found, `${slot} ${k}`).toContain(k)
    }
  })

  it('さがすのは、その1食に入っている料理だけ（ほかの食事の料理や献立の名前では当たらない）', () => {
    // 「お刺身の晩ごはん」は晩に刺身、朝は卵焼き
    expect(search('dinner', '刺身').length).toBeGreaterThanOrEqual(2)
    expect(search('dinner', 'さしみ').map((m) => m.key)).toEqual(search('dinner', '刺身').map((m) => m.key))
    expect(search('breakfast', '刺身')).toEqual([])
    expect(search('breakfast', '納豆').length).toBeGreaterThanOrEqual(1)
    for (const m of search('breakfast', '納豆')) expect(m.key, m.menu.id).toContain('natto')
    expect(search('lunch', '').length).toBe(idealMeals('lunch', IDEAL_MENUS).length)
  })

  it('女性30〜49歳・ふつう（プロフィール未入力の目安）で、どの1食もその区分の目安の±20%に入る', () => {
    for (const slot of MEAL_SLOTS)
      for (const m of idealMeals(slot, IDEAL_MENUS)) {
        const { t, menu, summary } = planned(m.menu, F35)
        expect(menu[slot].length, `${slot} ${m.menu.id}`).toBeGreaterThan(0)
        expect(slotBalance(summary.totals.bySlot[slot], slot, t).energy, `${slot} ${m.menu.id}`).toBe('ok')
      }
  })
})

// 毎食バランスで、朝・昼・晩を1食ずつえらぶときの候補
describe('毎食バランスで1食ずつえらぶ', { timeout: 120_000 }, () => {
  const solo = (slot: (typeof MEAL_SLOTS)[number], profile: Profile) => {
    const t = computeTargets(profile)
    return { t, meals: soloMeals(slot, IDEAL_MENUS, catalog, t, (m) => planned(m, profile).menu) }
  }
  const perMealKeys = (slot: (typeof MEAL_SLOTS)[number]) => new Set(IDEAL_MENUS.filter((m) => m.balance === 'meal').map((m) => ids(m, slot)))

  it('どのプロフィールでも、毎食バランスの献立の1食はぜんぶ入り、ほかの1食はその1食だけで区分の目安に収まるものだけ', () => {
    for (const profile of PROFILES)
      for (const slot of MEAL_SLOTS) {
        const { t, meals } = solo(slot, profile)
        const keys = meals.map((m) => m.key)
        expect(new Set(keys).size, `${label(profile)} ${slot}`).toBe(keys.length)
        for (const k of perMealKeys(slot)) expect(keys, `${label(profile)} ${slot}`).toContain(k)
        // 毎食バランスの1食が先
        const firstDay = meals.findIndex((m) => !m.balanced)
        if (firstDay >= 0) expect(meals.slice(firstDay).every((m) => !m.balanced), `${label(profile)} ${slot}`).toBe(true)
        for (const m of meals) {
          const totals = planned(m.menu, profile).summary.totals.bySlot[slot]
          // 毎食バランスの献立の1食も、画面の「ちょうどいい」と食塩・飽和脂肪酸の目安に収まっている
          expect(fitsMealAlone(totals, slot, t), `${label(profile)} ${slot} ${m.menu.id}`).toBe(true)
        }
      }
  })

  it('毎食バランスの献立の1食だけより多くからえらべる（プロフィール未入力の目安では、朝・昼・晩とも8種以上）', () => {
    for (const slot of MEAL_SLOTS) {
      const n = solo(slot, F35).meals.length
      expect(n, slot).toBeGreaterThanOrEqual(8)
      expect(n, slot).toBeGreaterThan(perMealKeys(slot).size)
    }
  })

  it('配分が0%の区分（朝食をとらない設定）には候補を出さない', () => {
    const noBreakfast: Profile = { ...F35, slotShare: { breakfast: 0, lunch: 45, dinner: 40, other: 15 } }
    expect(solo('breakfast', noBreakfast).meals).toEqual([])
    expect(solo('lunch', noBreakfast).meals.length).toBeGreaterThan(0)
  })
})
