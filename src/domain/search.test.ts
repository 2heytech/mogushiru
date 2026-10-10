import { describe, expect, it } from 'vitest'
import { matchRank, matches, normalizeForSearch, rankAcross, rankAndFilter } from './search'

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

describe('一致の度合い', () => {
  it('完全一致・先頭一致・途中一致の順に良い', () => {
    expect(matchRank('つな', 'ツナ')).toBe(0)
    expect(matchRank('つな', 'ツナ缶（油漬）')).toBe(1)
    expect(matchRank('つな', 'こまつな')).toBe(2)
    expect(matchRank('つな', 'ほうれんそう')).toBeNull()
  })
  it('「/」区切りの同義語それぞれで判定する', () => {
    expect(matchRank('まぐろ', 'ツナ缶', 'かんづめ/まぐろ/つなかん')).toBe(0)
  })
})

describe('並べ替えと絞り込み', () => {
  const items = [
    { name: 'こまつな', kana: 'こまつな' },
    { name: 'ツナ缶（油漬）', kana: 'つなかん/まぐろ' },
    { name: 'ツナ缶（水煮）', kana: 'つなかん/まぐろ' },
  ]
  const fields = (x: (typeof items)[number]) => [x.name, x.kana]

  it('短い検索語では、先頭一致があれば途中一致を出さない', () => {
    expect(rankAndFilter(items, 'ツナ', fields).map((x) => x.name)).toEqual(['ツナ缶（油漬）', 'ツナ缶（水煮）'])
  })
  it('長い検索語では途中一致も後ろに並べて出す', () => {
    const list = [{ name: 'さけおにぎり', kana: '' }, { name: 'おにぎり', kana: '' }]
    expect(rankAndFilter(list, 'おにぎり', (x) => [x.name, x.kana]).map((x) => x.name)).toEqual(['おにぎり', 'さけおにぎり'])
  })
  it('先頭一致がなければ短い語でも途中一致を出す', () => {
    expect(rankAndFilter(items, 'まつ', fields).map((x) => x.name)).toEqual(['こまつな'])
  })
})

describe('横断検索', () => {
  const dishes = [{ name: 'たまご焼き', kana: 'たまごやき' }, { name: 'オムライス', kana: 'おむらいす/たまご' }]
  const foods = [{ name: 'たまご', kana: 'たまご/卵/鶏卵' }, { name: 'うずら卵', kana: 'うずらたまご' }]
  const products = [{ name: 'たまごサンド', kana: '' }]
  const fields = (x: { name: string; kana: string }) => [x.name, x.kana]
  const groups = [
    { items: dishes, fields },
    { items: products, fields },
    { items: foods, fields },
  ]

  it('よく一致したものの中では先のグループ（料理）を前に、途中一致は最後に並べる', () => {
    expect(rankAcross(groups, 'たまご').map((x) => x.name)).toEqual(['オムライス', 'たまご焼き', 'たまごサンド', 'たまご', 'うずら卵'])
  })
  it('短い検索語では、どのグループかに先頭一致があれば途中一致を出さない', () => {
    const g = [
      { items: [{ name: 'こまつなのおひたし', kana: '' }], fields },
      { items: [{ name: 'ツナ缶', kana: 'つなかん' }], fields },
    ]
    expect(rankAcross(g, 'ツナ').map((x) => x.name)).toEqual(['ツナ缶'])
  })
  it('検索語が空ならグループの順にそのまま並べる', () => {
    expect(rankAcross(groups, '').length).toBe(5)
  })
})
