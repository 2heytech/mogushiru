import { describe, expect, it } from 'vitest'
import { matches, normalizeForSearch } from './search'

describe('検索の正規化', () => {
  it('カタカナ・半角・空白の揺れを吸収する', () => {
    expect(normalizeForSearch('カレー ライス')).toBe('かれーらいす')
    expect(normalizeForSearch('ｶﾚｰ')).toBe('かれー')
    expect(normalizeForSearch('ＡＢＣ')).toBe('abc')
  })
  it('よみ・名前のどちらかに含まれれば一致', () => {
    expect(matches('からあげ', '唐揚げ', 'からあげ')).toBe(true)
    expect(matches('カラアゲ', '唐揚げ', 'からあげ')).toBe(true)
    expect(matches('すし', '唐揚げ', 'からあげ')).toBe(false)
    expect(matches('', '唐揚げ')).toBe(true)
  })
})
