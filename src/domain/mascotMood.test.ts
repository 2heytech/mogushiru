import { describe, expect, it } from 'vitest'
import type { Alert } from './alerts'
import { dangoMoods, slotMoods } from './mascotMood'
import { emptyTotals, type MenuTotals } from './nutrition'
import { slotBalance } from './slotBalance'
import { computeTargets, DEFAULT_PROFILE } from './targets'

const targets = computeTargets(DEFAULT_PROFILE)

// PFCの割合（%）とカロリーから栄養の合計をつくる
function totals(kcal: number, p = 16.5, f = 25, c = 58.5) {
  const t = emptyTotals()
  Object.assign(t.values, {
    energyKcal: kcal,
    protein: (kcal * p) / 400,
    fat: (kcal * f) / 900,
    carb: (kcal * c) / 400,
  })
  return t
}

function menu(day: ReturnType<typeof totals>): MenuTotals {
  return {
    day,
    bySlot: {
      breakfast: emptyTotals(),
      lunch: day,
      dinner: emptyTotals(),
      other: emptyTotals(),
    },
  } as MenuTotals
}

const saltOver: Alert = {
  key: 'salt',
  level: 'over',
  amount: 9,
  limit: 7.5,
  unit: 'g',
  topSlot: 'lunch',
}

describe('PFCだんごモグの表情', () => {
  it('何も選んでいないときは全部ふつう', () => {
    expect(dangoMoods(menu(emptyTotals()), targets, [], 'okay')).toEqual({
      p: 'okay',
      f: 'okay',
      c: 'okay',
    })
  })

  it('バランスが良ければ全部ごきげん', () => {
    expect(dangoMoods(menu(totals(2000)), targets, [], 'happy')).toEqual({
      p: 'happy',
      f: 'happy',
      c: 'happy',
    })
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

describe('ちゃわんモグの表情（指標ごと）', () => {
  const lunchKcal = slotBalance(emptyTotals(), 'lunch', targets).targetKcal

  it('空の区分は出さない', () => {
    expect(slotMoods(emptyTotals(), 'lunch', targets, [])).toBeNull()
  })

  it('カロリーもPFCもちょうどよければ両方ごきげん', () => {
    expect(slotMoods(totals(lunchKcal), 'lunch', targets, [])).toEqual({
      energy: 'happy',
      pfc: 'happy',
    })
  })

  it('カロリーは少なめでふつう、多めで困り顔', () => {
    expect(slotMoods(totals(lunchKcal * 0.5), 'lunch', targets, [])?.energy).toBe('okay')
    expect(slotMoods(totals(lunchKcal * 1.5), 'lunch', targets, [])?.energy).toBe('worried')
  })

  it('PFCは外れが1つでふつう、2つ以上で困り顔', () => {
    expect(slotMoods(totals(lunchKcal, 10, 30, 60), 'lunch', targets, [])?.pfc).toBe('okay')
    expect(slotMoods(totals(lunchKcal, 15, 45, 40), 'lunch', targets, [])?.pfc).toBe('worried')
  })

  it('食塩の上限こえにいちばん寄与した区分はPFC側があせり顔', () => {
    expect(slotMoods(totals(lunchKcal), 'lunch', targets, [saltOver])).toEqual({
      energy: 'happy',
      pfc: 'alert',
    })
    expect(slotMoods(totals(lunchKcal), 'dinner', targets, [saltOver])?.pfc).toBe('happy')
  })

  it('その他はPFCの表情を出さない', () => {
    expect(slotMoods(totals(100), 'other', targets, [])?.pfc).toBeNull()
  })
})
