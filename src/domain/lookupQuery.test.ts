import { describe, expect, it } from 'vitest'
import { eachWord, hasLiteral, highlightRanges, lookupWords, matchLookup, parseLookupQuery, splitCandidates, synonymsOf, withoutNoiseSuffix } from './lookupQuery'

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

  it('漢字とかなで書き方がゆれる言葉は、どちらで入れても見つかる（鶏胸肉・とりむね肉 → 鶏むね肉）', () => {
    const chicken: [string[], string[]] = [['鶏むね肉（皮なし）', '鶏むね肉 皮なし'], ['にわとりむねにく/鶏肉/とりにく/とり肉/チキン']]
    expect(match('鶏むね肉', ...chicken)?.rank).toBe(0)
    expect(match('鶏胸肉', ...chicken)?.rank).toBe(0)
    expect(match('とりむね肉', ...chicken)?.rank).toBe(0)
    expect(match('鳥むね肉', ...chicken)?.rank).toBe(0)
    expect(match('とりむねにく', ...chicken)?.rank).toBe(0)
    // 読みのない名前（市販品）も、かなで見つかる
    expect(match('とうふ', ['木綿豆腐'], [])?.rank).toBe(3)
    expect(match('もめんとうふ', ['もめん豆腐'], [])?.rank).toBe(0)
    expect(match('玉子', ['卵（生）', '卵 生'], [])?.rank).toBe(0)
    // ひらがなにそろえて途中に入っているだけのものは、名前の一致にしない（牛丼＝ぎゅうどん の「うどん」）
    expect(match('うどん', ['牛丼'], [])?.rank).toBe(3)
    // 読みがほかの食べものと重なる字は、そろえない（酒で鮭、桃でもも肉を出さない）
    expect(match('酒', ['鮭（生）'], ['さけ'])).toBeNull()
    expect(match('桃', ['鶏もも肉'], ['とりももにく'])).toBeNull()
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
  it('漢字とかなで書き方がゆれる言葉は、どちらで入れても同じところを太くする', () => {
    expect(highlightRanges('鶏むね肉（皮なし）', lookupWords('鶏胸肉'))).toEqual([[0, 4]])
    expect(highlightRanges('鶏むね肉（皮なし）', lookupWords('とりむね肉'))).toEqual([[0, 4]])
    expect(highlightRanges('卵（生）', lookupWords('たまご'))).toEqual([[0, 1]])
    // 言葉の一部でも、その言葉ぜんたいを太くする
    expect(highlightRanges('木綿豆腐', lookupWords('とう'))).toEqual([[2, 4]])
  })

  it('重なり・となり合わせはまとめる。名前にない言葉（読みがなで一致）は何も返さない', () => {
    expect(highlightRanges('さば缶詰', ['さば', '缶'])).toEqual([[0, 3]])
    expect(highlightRanges('親子丼', lookupWords('おやこ'))).toEqual([])
    expect(highlightRanges('カレー', [])).toEqual([])
  })
})

describe('食材を名前でさがすときの工夫', () => {
  it('画面に出ない読みがな・別名の途中にだけ入っているものは 4（「しか」で、脱脂加糖＝だっしかとう）', () => {
    expect(match('しか', ['ヨーグルト（加糖）'], ['よーぐると/だっしかとう'])?.rank).toBe(4)
    // 別名の語と同じ・語の先頭からなら、名前の一致と同じ
    expect(match('しか', ['鹿肉（にほんじか・赤身）'], ['しか/にほんじか/鹿肉/鹿/しかにく'])?.rank).toBe(0)
    expect(match('鹿', ['鹿肉（にほんじか・赤身）'], ['しか/にほんじか/鹿肉/鹿/しかにく'])?.rank).toBe(0)
    expect(match('シカ', ['鹿肉（にほんじか・赤身）'], ['しか/にほんじか/鹿肉/鹿/しかにく'])?.rank).toBe(0)
  })

  it('「カロリー」「栄養」などの言葉は、ほかに言葉があれば読みとばす', () => {
    expect(match('鹿肉 カロリー', ['鹿肉'], [])?.rank).toBe(0)
    expect(match('鹿肉　栄養素', ['鹿肉'], [])?.rank).toBe(0)
    expect(lookupWords('鹿肉 カロリー')).toEqual(lookupWords('鹿肉'))
    // それだけのときは、そのままさがす
    expect(match('カロリー', ['カロリーメイト'], [])?.rank).toBe(1)
    expect(match('カロリー', ['鹿肉'], [])).toBeNull()
  })

  it('1語の後ろに付いた「の栄養」「カロリー」を外した言葉', () => {
    expect(withoutNoiseSuffix('鹿肉の栄養')).toBe('鹿肉')
    expect(withoutNoiseSuffix('鹿肉カロリー')).toBe('鹿肉')
    expect(withoutNoiseSuffix('牛肉の栄養成分')).toBe('牛肉')
    // 外すものがない・外すと何も残らない・2語のときは null
    expect(withoutNoiseSuffix('鹿肉')).toBeNull()
    expect(withoutNoiseSuffix('カロリー')).toBeNull()
    expect(withoutNoiseSuffix('鹿肉 牛肉の栄養')).toBeNull()
  })

  it('短い言葉をカタカナ・漢字で入れたとき、名前にその字のまま入っているか', () => {
    const horse = parseLookupQuery('馬')!
    expect(hasLiteral(horse, ['馬肉（赤身）'])).toBe(true)
    // じゃがいもは、別名（馬鈴薯）にだけ入っている
    expect(hasLiteral(horse, ['じゃがいも'])).toBe(false)
    // ひらがな・長い言葉・2語のときは、いつも true
    expect(hasLiteral(parseLookupQuery('うま')!, ['じゃがいも'])).toBe(true)
    expect(hasLiteral(parseLookupQuery('馬鈴薯')!, ['じゃがいも'])).toBe(true)
    expect(hasLiteral(parseLookupQuery('馬 肉')!, ['じゃがいも'])).toBe(true)
  })

  it('2つ以上の言葉を入れたときの、1つずつ（1語なら空）', () => {
    expect(eachWord('鹿肉 牛肉')).toEqual(['鹿肉', '牛肉'])
    expect(eachWord('鹿肉、牛肉　豚肉')).toEqual(['鹿肉', '牛肉', '豚肉'])
    expect(eachWord('鹿肉')).toEqual([])
    // 食品の名前ではない言葉は数えない
    expect(eachWord('鹿肉 カロリー')).toEqual([])
  })
})
