import { describe, expect, it } from 'vitest'
import type { Alert } from './alerts'
import { dangoMoods, dangoScale, slotMoods } from './mascotMood'
import { pfcGaps } from './pfcGap'
import { emptyTotals } from './nutrition'
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

const saltOver: Alert = {
  key: 'salt',
  level: 'over',
  amount: 9,
  limit: 7.5,
  limitKind: 'target',
  unit: 'g',
  topSlot: 'lunch',
}

describe('PFCだんごモグの表情', () => {
  it('何も選んでいないときは全部ふつう', () => {
    expect(dangoMoods(pfcGaps(emptyTotals().values, targets))).toEqual({ p: 'okay', f: 'okay', c: 'okay' })
  })

  it('目標範囲内なら全部ごきげん', () => {
    expect(dangoMoods(pfcGaps(totals(2000).values, targets))).toEqual({ p: 'happy', f: 'happy', c: 'happy' })
  })

  it('多いだんごはあせり顔、少ないだんごは困り顔', () => {
    expect(dangoMoods(pfcGaps(totals(2000, 15, 45, 40).values, targets))).toEqual({ p: 'happy', f: 'alert', c: 'worried' })
  })

  it('ほかの栄養素のアラートには反応しない', () => {
    // 引数にアラートを取らないこと自体が仕様。食塩が多くてもPFCが範囲内ならごきげん
    expect(dangoMoods(pfcGaps(totals(2000).values, targets)).p).toBe('happy')
  })
})

describe('だんごの大きさ', () => {
  it('目標のまんなかで1、多いほど大きく、少ないほど小さい（上下限あり）', () => {
    const gaps = pfcGaps(totals(2000, 15, 45, 40).values, targets)!
    const [p, f, c] = gaps.map(dangoScale)
    expect(f).toBeGreaterThan(1)
    expect(c).toBeLessThan(1)
    expect(p).toBeGreaterThan(0.85)
    expect(p).toBeLessThan(1.15)
    expect(dangoScale({ ...gaps[1], ratio: 500 })).toBe(1.45)
    expect(dangoScale({ ...gaps[1], ratio: 0 })).toBe(0.55)
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
