import { describe, expect, it } from 'vitest'
import { highlightRanges, lookupWords, matchLookup, parseLookupQuery, splitCandidates, synonymsOf } from './lookupQuery'

const match = (query: string, visible: string[], readings: string[] = []) => matchLookup(parseLookupQuery(query)!, visible, readings)

describe('名前でさがすときの一致の度合い', () => {
  it('何も入っていなければ null', () => {
    expect(parseLookupQuery('')).toBeNull()
    expect(parseLookupQuery(' 　')).toBeNull()
  })

  it('語と完全一致 0 → 語の先頭 1 → 名前の途中 2 → 読みがなの途中だけ 3', () => {
    expect(match('たまご', ['卵'], ['たまご'])?.rank).toBe(0)
    expect(match('たま', ['卵'], ['たまご'])?.rank).toBe(1)
    expect(match('うどん', ['かけうどん'], ['かけうどん'])?.rank).toBe(2)
    // 牛丼（ぎゅうどん）は、読みがなの途中にたまたま「うどん」が入っているだけ
    expect(match('うどん', ['牛丼'], ['ぎゅうどん'])?.rank).toBe(3)
    expect(match('そば', ['牛丼'], ['ぎゅうどん'])).toBeNull()
  })

  it('空白で区切った言葉は、すべてに一致するもの。度合いは、いちばん弱い言葉に合わせる', () => {
    expect(match('カレー レトルト', ['レトルト ビーフカレー'])?.rank).toBe(2)
    expect(match('カレー、レトルト', ['レトルト カレー'])?.rank).toBe(0)
    expect(match('カレー ほげ', ['レトルト カレー'])).toBeNull()
  })

  it('別の呼び名でも一致する', () => {
    expect(synonymsOf('シャケ')).toEqual(['鮭'])
    expect(synonymsOf('カレー')).toEqual([])
    expect(match('しゃけ', ['焼き鮭'])?.rank).toBe(2)
    expect(match('オリーブオイル', ['オリーブ油'])?.rank).toBe(0)
    expect(match('お米', ['ごはん', '白米'])?.rank).toBe(0)
  })

  it('弱い一致：カタカナ・漢字で入れた2文字までの言葉が、名前にその字のまま入っていない', () => {
    expect(match('ツナ', ['小松菜'], ['こまつな'])).toEqual({ rank: 3, weak: true })
    expect(match('ツナ', ['こまつな 葉 生'])).toEqual({ rank: 2, weak: true })
    expect(match('肉', ['鶏むね肉'])).toEqual({ rank: 2, weak: false })
    expect(match('パン', ['食パン'])).toEqual({ rank: 2, weak: false })
    // 先頭からの一致は弱くない
    expect(match('ツナ', ['まぐろ 缶詰'], ['つなかん'])).toEqual({ rank: 1, weak: false })
    // ひらがな・3文字以上・2語以上では確かめない
    expect(match('つな', ['小松菜'], ['こまつな'])?.weak).toBe(false)
    expect(match('カレー', ['ビーフかれー'])?.weak).toBe(false)
    expect(match('ツナ 缶', ['こまつな 缶'])?.weak).toBe(false)
  })
})

describe('言葉を2つに分ける', () => {
  it('3文字以上の1語だけ。どちらも2文字以上になる分け方を先にためす', () => {
    expect(splitCandidates('さば缶')).toEqual([
      ['さば', '缶'],
      ['さ', 'ば缶'],
    ])
    expect(splitCandidates('さばかん')[0]).toEqual(['さば', 'かん'])
    expect(splitCandidates('ツナ')).toEqual([])
    expect(splitCandidates('さば 缶')).toEqual([])
    expect(splitCandidates('あいうえおかきくけこ')).toHaveLength(6)
  })
})

describe('名前の中の、さがしている言葉と同じところ', () => {
  it('ひらがな・カタカナ、全角・半角のちがいは同じとみなす', () => {
    expect(lookupWords('カレー　レトルト')).toEqual(['かれー', 'れとると'])
    expect(highlightRanges('ビーフカレー', lookupWords('かれー'))).toEqual([[3, 6]])
    expect(highlightRanges('Ｓｕａｇｅ監修カレー', lookupWords('suage'))).toEqual([[0, 5]])
    expect(highlightRanges('カレー カレー', lookupWords('カレー'))).toEqual([
      [0, 3],
      [4, 7],
    ])
  })
  it('重なり・となり合わせはまとめる。名前にない言葉（読みがなで一致）は何も返さない', () => {
    expect(highlightRanges('さば缶詰', ['さば', '缶'])).toEqual([[0, 3]])
    expect(highlightRanges('卵（生）', lookupWords('たまご'))).toEqual([])
    expect(highlightRanges('カレー', [])).toEqual([])
  })
})
