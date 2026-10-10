import { describe, expect, it } from 'vitest'
import { defaultMenuName } from './menuName'

describe('保存するときの名前の初期値', () => {
  const today = new Date(2026, 9, 10)

  it('今日の日付が入る', () => {
    expect(defaultMenuName([], today)).toBe('10月10日の食事')
  })

  it('同じ名前があれば番号を付ける', () => {
    expect(defaultMenuName(['10月10日の食事'], today)).toBe('10月10日の食事 2')
    expect(defaultMenuName(['10月10日の食事', '10月10日の食事 2'], today)).toBe('10月10日の食事 3')
  })
})
