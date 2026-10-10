import { describe, expect, it } from 'vitest'
import type { Alert } from './alerts'
import { bowlMood, dangoMoods } from './mascotMood'
import { emptyTotals, type MenuTotals } from './nutrition'
import { slotBalance } from './slotBalance'
import { computeTargets, DEFAULT_PROFILE } from './targets'

const targets = computeTargets(DEFAULT_PROFILE)

// PFCの割合（%）とカロリーから栄養の合計をつくる
function totals(kcal: number, p = 16.5, f = 25, c = 58.5) {
  const t = emptyTotals()
  Object.assign(t.values, { energyKcal: kcal, protein: (kcal * p) / 400, fat: (kcal * f) / 900, carb: (kcal * c) / 400 })
  return t
}

function menu(day: ReturnType<typeof totals>): MenuTotals {
  return { day, bySlot: { breakfast: emptyTotals(), lunch: day, dinner: emptyTotals(), other: emptyTotals() } } as MenuTotals
}

const saltOver: Alert = { key: 'salt', level: 'over', amount: 9, limit: 7.5, unit: 'g', topSlot: 'lunch' }

describe('PFCだんごモグの表情', () => {
  it('何も選んでいないときは全部ふつう', () => {
    expect(dangoMoods(menu(emptyTotals()), targets, [], 'okay')).toEqual({ p: 'okay', f: 'okay', c: 'okay' })
  })

  it('バランスが良ければ全部ごきげん', () => {
    expect(dangoMoods(menu(totals(2000)), targets, [], 'happy')).toEqual({ p: 'happy', f: 'happy', c: 'happy' })
  })

  it('脂質が多いと脂質のだんごだけ困り顔', () => {
    const m = dangoMoods(menu(totals(2000, 15, 45, 40)), targets, [], 'worried')
    expect(m.f).toBe('worried')
    expect(m.p).toBe('okay')
  })

  it('上限こえのアラートがあると範囲内のだんごはあせり顔', () => {
    expect(dangoMoods(menu(totals(2000)), targets, [saltOver], 'okay')).toEqual({ p: 'alert', f: 'alert', c: 'alert' })
  })
})

describe('ちゃわんモグの表情', () => {
  const lunchKcal = slotBalance(emptyTotals(), 'lunch', targets).targetKcal

  it('空の区分はふつう', () => {
    expect(bowlMood(emptyTotals(), 'lunch', targets, [])).toBe('okay')
  })

  it('カロリーもPFCもちょうどよければごきげん', () => {
    expect(bowlMood(totals(lunchKcal), 'lunch', targets, [])).toBe('happy')
  })

  it('気になる点が1つならふつう、2つ以上なら困り顔', () => {
    expect(bowlMood(totals(lunchKcal * 1.5), 'lunch', targets, [])).toBe('okay')
    expect(bowlMood(totals(lunchKcal * 1.5, 15, 45, 40), 'lunch', targets, [])).toBe('worried')
  })

  it('上限こえにいちばん寄与した区分はあせり顔', () => {
    expect(bowlMood(totals(lunchKcal), 'lunch', targets, [saltOver])).toBe('alert')
    expect(bowlMood(totals(lunchKcal), 'dinner', targets, [saltOver])).toBe('happy')
  })
})
