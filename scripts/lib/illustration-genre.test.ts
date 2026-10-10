import { describe, expect, it } from 'vitest'
import { illustrationGenre } from './illustration-genre'

describe('料理名からジャンル別の絵を選ぶ', () => {
  it('名前の後ろのほうの調理法を優先する', () => {
    expect(illustrationGenre('塩漬けタケノコの天ぷら', 'side')).toBe('agemono')
    expect(illustrationGenre('あんぽ柿のなます', 'side')).toBe('aemono')
    expect(illustrationGenre('味噌煮込みうどん', 'noodle')).toBe('udon')
    expect(illustrationGenre('白味噌雑煮', 'soup')).toBe('zoni')
  })

  it('焼き魚は魚の絵、当てはまらなければ分類で決める', () => {
    expect(illustrationGenre('鮎の塩焼', 'main')).toBe('fish')
    expect(illustrationGenre('しもつかれ', 'side')).toBe('aemono')
  })
})
