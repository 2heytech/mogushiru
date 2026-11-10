// 理想の献立を、男性の15プロフィール（年齢 × 活動量）で確かめる。男女でファイルを分けて、並列に走らせる
import { describe, expect, it } from 'vitest'
import { IDEAL_MENUS, menuItemRole } from './idealMenus'
import { catalog, label, planned, products, profilesOf } from './idealMenus.testkit'
import { nutrientChecks } from './nutrientChecks'
import { slotBalance } from './slotBalance'
import { SLOTS } from './types'

describe('理想の献立（男性）', () => {
  it.each(profilesOf('male').map((p) => [label(p), p] as const))('%s：カロリー・PFC・食塩が目安に収まり、とりすぎがなく、量も自然な範囲', (_, profile) => {
    for (const m of IDEAL_MENUS) {
      const { t, menu, summary: s } = planned(m, profile)
      const v = s.totals.day.values
      expect(Math.abs(v.energyKcal - t.energyKcal) / t.energyKcal, `${m.id} kcal ${Math.round(v.energyKcal)}/${t.energyKcal}`).toBeLessThanOrEqual(0.05)
      for (const k of ['p', 'f', 'c'] as const) {
        expect(s.ratio![k], `${m.id} ${k}`).toBeGreaterThanOrEqual(t.pfcRatio[k].lo)
        expect(s.ratio![k], `${m.id} ${k}`).toBeLessThanOrEqual(t.pfcRatio[k].hi)
      }
      expect(v.salt, `${m.id} 食塩`).toBeLessThan(t.saltMax)
      expect(s.checks.filter((c) => c.status === 'over').map((c) => c.key), m.id).toEqual([])
      // 量は0.1人前きざみで、主食は小盛り〜大盛り（1.5人前まで）・おかずは控えめ〜多め・果物や牛乳は1個
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
          if (role === 'staple') expect(item.portion, `${m.id} ${item.refId}`).toBeLessThanOrEqual(1.5)
        }
      // 毎食バランスの献立は、1食だけ呼び出しても、その区分の目安（カロリー±20%・PFCの範囲・食塩と飽和脂肪酸の上限）に収まる
      if (m.balance === 'meal')
        for (const slot of ['breakfast', 'lunch', 'dinner'] as const) {
          const b = slotBalance(s.totals.bySlot[slot], slot, t)
          expect(b.energy, `${m.id} ${slot} ${Math.round(b.kcal)}/${b.targetKcal}`).toBe('ok')
          expect(b.hints.map((h) => `${h.key}${h.gap.toFixed(1)}`), `${m.id} ${slot} PFC`).toEqual([])
          const over = nutrientChecks(s.totals.bySlot[slot], t, slot).filter((c) => c.status === 'over')
          expect(over.map((c) => c.key), `${m.id} ${slot}`).toEqual([])
        }
    }
  })
})
