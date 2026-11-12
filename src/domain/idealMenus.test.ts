import { describe, expect, it } from 'vitest'
import { IDEAL_GENRES, IDEAL_MENUS, idealMenuAvailable, idealMenuHasProducts, idealProductJan, menuItemRole } from './idealMenus'
import { catalog, planned } from './idealMenus.testkit'
import { WANT_NUTRIENTS } from './nutrientChecks'
import { slotBalance } from './slotBalance'
import { SLOTS, type Goal, type Profile } from './types'

// 30プロフィールごとの量の調整（カロリー・PFC・食塩・量の範囲・毎食バランスの1食ずつ）は idealMenus.profiles.*.test.ts で確かめる
// プロフィール未入力の目安（女性30〜49歳・ふつう）
const F35: Profile = { sex: 'female', age: 35, activity: 'normal' }

// 93種の献立をプロフィールごとに組み直すテストがあり、CIでは5秒をこえることがあるので長めにする
describe('理想の献立', { timeout: 30_000 }, () => {
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

  it('1日でバランスをとる献立と、朝・昼・晩それぞれでとる献立の両方があり、ジャンルは和洋中のほかにもいろいろある', () => {
    expect(new Set(IDEAL_MENUS.map((m) => m.id)).size).toBe(IDEAL_MENUS.length)
    expect(new Set(IDEAL_MENUS.map((m) => m.name)).size, '同じ名前の献立').toBe(IDEAL_MENUS.length)
    // 100種くらいから選べる
    expect(IDEAL_MENUS.length).toBeGreaterThanOrEqual(90)
    expect(IDEAL_MENUS.filter((m) => m.balance === 'day').length).toBeGreaterThanOrEqual(5)
    expect(IDEAL_MENUS.filter((m) => m.balance === 'meal').length).toBeGreaterThanOrEqual(10)
    const genres = new Set(IDEAL_MENUS.map((m) => m.genre))
    for (const g of genres) expect(IDEAL_GENRES).toContain(g)
    expect([...genres].filter((g) => !['和食', '洋食', '中華', '市販品'].includes(g)).length).toBeGreaterThanOrEqual(4)
  })

  it('市販品を使う献立もある', () => {
    expect(IDEAL_MENUS.filter(idealMenuHasProducts).length).toBeGreaterThanOrEqual(2)
  })

  it('朝・昼・晩・その他のどれにも料理がある', () => {
    for (const m of IDEAL_MENUS) for (const slot of SLOTS) expect(m.slots[slot].length, `${m.id} ${slot}`).toBeGreaterThan(0)
  })

  // 市販品はパッケージの表示にある成分（エネルギー・PFC・食塩など）しかなく、ビタミン・ミネラルを確かめられないので、料理だけの献立で見る
  it('女性30〜49歳・ふつう（プロフィール未入力の目安）で、とりたい栄養素がほぼ目安に届く（料理だけの献立）', () => {
    for (const m of IDEAL_MENUS.filter((x) => !idealMenuHasProducts(x))) {
      const s = planned(m, F35).summary
      const want = s.checks.filter((c) => (WANT_NUTRIENTS as readonly string[]).includes(c.key))
      // 8割未満（少ない）は2つまで、全体の3分の2以上は目安以上
      expect(want.filter((c) => c.status === 'low').length, m.id).toBeLessThanOrEqual(2)
      expect(want.filter((c) => c.status === 'ok').length, m.id).toBeGreaterThanOrEqual(Math.ceil((want.length * 2) / 3))
    }
  })

  // ごはんのない区分（コンビニのお昼など）も、市販品や果物を1個ずつ動かして区分の目安に合わせる
  it('女性30〜49歳・ふつう（プロフィール未入力の目安）で、朝・昼・晩とも区分の目安の±20%に入る', () => {
    for (const m of IDEAL_MENUS) {
      const { t, summary } = planned(m, F35)
      const totals = summary.totals
      for (const slot of ['breakfast', 'lunch', 'dinner'] as const) expect(slotBalance(totals.bySlot[slot], slot, t).energy, `${m.id} ${slot}`).toBe('ok')
    }
  })

  // ごはん2人前のような量にはせず、足りない分は足す一品で補う
  it('女性30〜49歳・ふつう（プロフィール未入力の目安）では、ごはんなど主食は1.3人前まで', () => {
    for (const m of IDEAL_MENUS) {
      const { menu } = planned(m, F35)
      for (const slot of SLOTS)
        for (const item of menu[slot]) if (menuItemRole(item, catalog) === 'staple') expect(item.portion, `${m.id} ${item.refId}`).toBeLessThanOrEqual(1.3)
    }
  })

  // 献立ごとに量を組み直すので重い。目標ごとにテストを分ける
  it.each([
    ['減らす', { sex: 'female', age: 35, activity: 'low' }, 'lose'],
    ['増やす', { sex: 'male', age: 20, activity: 'high' }, 'gain'],
  ] as [string, Profile, Goal][])('体重を%s目標でも、カロリーは目安の±5%に収まる', (_, profile, goal) => {
    for (const m of IDEAL_MENUS) {
      const { t, summary } = planned(m, { ...profile, goal })
      const kcal = summary.kcal
      expect(Math.abs(kcal - t.energyKcal) / t.energyKcal, `${m.id} ${goal}`).toBeLessThanOrEqual(0.05)
    }
  })

  it('配分が0%の区分（朝食をとらないなど）は空にして、ほかの区分で1日の目安に合わせる', () => {
    const profile: Profile = { sex: 'female', age: 35, activity: 'normal', slotShare: { breakfast: 0, lunch: 45, dinner: 45, other: 10 } }
    for (const m of IDEAL_MENUS) {
      const { t, menu, summary } = planned(m, profile)
      expect(menu.breakfast).toEqual([])
      const kcal = summary.kcal
      expect(Math.abs(kcal - t.energyKcal) / t.energyKcal, m.id).toBeLessThanOrEqual(0.05)
    }
  })
})
