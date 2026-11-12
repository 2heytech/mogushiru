import { describe, expect, it } from 'vitest'
import { missingMealSlots } from './dayProgress'
import { computeTargets, DEFAULT_PROFILE } from './targets'
import type { DayMenu, MenuItem } from './types'

const dish = (uid: string): MenuItem => ({ uid, kind: 'dish', refId: 'toast', portion: 1 })
const supplement = (uid: string): MenuItem => ({ uid, kind: 'supplement', refId: 'my-1', portion: 1 })
const menu = (m: Partial<DayMenu>): DayMenu => ({ breakfast: [], lunch: [], dinner: [], other: [], ...m })
const targets = computeTargets(DEFAULT_PROFILE)

describe('まだ入っていない区分', () => {
  it('朝だけ入れたときは、昼と晩が残る', () => {
    expect(missingMealSlots(menu({ breakfast: [dish('a')] }), targets)).toEqual(['lunch', 'dinner'])
  })
  it('朝・昼・晩がそろえば残りはない（その他は空でもよい）', () => {
    expect(missingMealSlots(menu({ breakfast: [dish('a')], lunch: [dish('b')], dinner: [dish('c')] }), targets)).toEqual([])
  })
  it('配分を0にした区分（食べない区分）は数えない', () => {
    const noBreakfast = computeTargets({ ...DEFAULT_PROFILE, slotShare: { breakfast: 0, lunch: 45, dinner: 45, other: 10 } })
    expect(missingMealSlots(menu({ lunch: [dish('b')], dinner: [dish('c')] }), noBreakfast)).toEqual([])
  })
  it('サプリだけの区分は、まだ入っていないとみなす', () => {
    expect(missingMealSlots(menu({ breakfast: [supplement('s')], lunch: [dish('b')], dinner: [dish('c')] }), targets)).toEqual(['breakfast'])
  })
})
