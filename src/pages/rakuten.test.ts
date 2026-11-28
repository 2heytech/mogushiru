import { describe, expect, it } from 'vitest'
import { NUTRIENT_GROUPS } from '../domain/ranking'
import type { NutrientKey } from '../domain/types'
import { RAKUTEN_ACCESS_KEY, RAKUTEN_AFFILIATE_ID, RAKUTEN_APP_ID, RAKUTEN_MEASURE_ID } from '../site'
import { RAKUTEN_KINDS, RAKUTEN_PICKS, RAKUTEN_SHELF_KEYS, rakutenAffiliateUrl, rakutenApi, rakutenEnabled, rakutenGenreId, rakutenMeasure, rakutenSearchUrl, shopSection } from './rakuten'

// テスト用の ID（架空の値。形だけ合わせてある）
const TEST_ID = '0123abcd.4567ef01.89abcdef.01234567'
// 計測 ID としてリンクに入れる文字（架空。楽天アフィリエイトの管理画面で作るリンクに入る形）
const TEST_MEASURE = '_RTLink00000'

const ALL_KEYS = NUTRIENT_GROUPS.flatMap((g) => g.keys)
const picksOf = (key: NutrientKey, id = TEST_ID, measure = '') => shopSection(key, id, measure)?.picks ?? []

describe('楽天アフィリエイトのリンク', () => {
  it('商品を画像つきで出す設定（楽天ウェブサービスのアプリ ID・アクセスキー）は、空か、使える形。3つそろったときだけ使う', () => {
    // テスト用の値（架空。形だけ合わせてある）
    const app = '01234567-89ab-cdef-0123-456789abcdef'
    const key = 'pk_TESTtest0123456789'
    expect(rakutenApi(app, key, TEST_ID, '')).toEqual({ appId: app, accessKey: key, affiliateId: TEST_ID, measure: '' })
    // 計測 ID の文字は、使える形のときだけ持つ（形がちがっても、商品は出す）
    expect(rakutenApi(app, key, TEST_ID, TEST_MEASURE)?.measure).toBe(TEST_MEASURE)
    expect(rakutenApi(app, key, TEST_ID, 'a b')?.measure).toBe('')
    for (const [a, k, id] of [
      ['', key, TEST_ID],
      [app, '', TEST_ID],
      [app, key, ''],
      ['01234567-89ab-cdef-0123-456789abcde', key, TEST_ID],
      [`${app}&x=1`, key, TEST_ID],
      [app, 'sk_TESTtest0123456789', TEST_ID],
      [app, 'pk_short', TEST_ID],
      [app, `${key}"><script>`, TEST_ID],
      [app, key, 'abc'],
    ])
      expect(rakutenApi(a, k, id), `${a} ${k} ${id}`).toBeNull()
    // リポジトリに入れてある値：両方とも空（文字のリンクだけ）か、両方とも使える形
    expect([RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY].filter(Boolean).length === 0 || rakutenApi() !== null).toBe(true)
  })

  it('商品検索 API でさがす言葉とジャンルは、文字のリンクの先（楽天市場の検索結果）と同じ', () => {
    expect([rakutenGenreId('food'), rakutenGenreId('drink'), rakutenGenreId('all')]).toEqual(['100227', '100316', ''])
    // 食べ物（アマニ油）は「食品」、飲み物（トマトジュース）は「水・ソフトドリンク」、サプリメント・プロテインはジャンルでしぼらない
    const picks = [...picksOf('n3Fat'), ...picksOf('potassium'), ...picksOf('calcium')]
    expect(picks.map((p) => [p.label, p.word, p.genreId])).toEqual([
      ['DHA・EPA のサプリ', 'DHA EPA サプリ', ''],
      ['アマニ油', 'アマニ油', '100227'],
      ['トマトジュース（食塩無添加）', 'トマトジュース 食塩無添加', '100316'],
      ['野菜ジュース（食塩無添加）', '野菜ジュース 食塩無添加', '100316'],
      ['カルシウムのサプリ', 'カルシウム サプリ', ''],
      ['カルシウム＋マグネシウムのサプリ', 'カルシウム マグネシウム サプリ', ''],
    ])
    for (const key of ALL_KEYS)
      for (const p of picksOf(key)) expect(new URL(p.href).searchParams.get('pc'), p.label).toBe(rakutenSearchUrl({ word: p.word, genre: p.genreId === '100227' ? 'food' : p.genreId === '100316' ? 'drink' : 'all' }))
  })

  it('ID は、空か、8桁の英数字を「.」で4つつないだ形', () => {
    expect(RAKUTEN_AFFILIATE_ID === '' || rakutenEnabled(RAKUTEN_AFFILIATE_ID)).toBe(true)
    expect(rakutenEnabled(TEST_ID)).toBe(true)
    for (const bad of ['', 'abc', '0123abcd.4567ef01.89abcdef', `${TEST_ID}/?pc=x`, ' 0123abcd.4567ef01.89abcdef.01234567']) expect(rakutenEnabled(bad), bad).toBe(false)
  })

  it('行き先は、楽天市場の検索結果。食べ物・飲み物は、ジャンルでしぼれる', () => {
    expect(rakutenSearchUrl({ word: 'ひじき', genre: 'food' })).toBe(`https://search.rakuten.co.jp/search/mall/${encodeURIComponent('ひじき')}/100227/`)
    expect(rakutenSearchUrl({ word: '牛乳', genre: 'drink' })).toBe(`https://search.rakuten.co.jp/search/mall/${encodeURIComponent('牛乳')}/100316/`)
    expect(rakutenSearchUrl({ word: 'アップルパイ', genre: 'all' })).toBe(`https://search.rakuten.co.jp/search/mall/${encodeURIComponent('アップルパイ')}/`)
    // 言葉の間の空白や記号も、アドレスに入れられる形にする
    expect(rakutenSearchUrl({ word: 'うなぎ 蒲焼き', genre: 'food' })).toContain('/mall/%E3%81%86%E3%81%AA%E3%81%8E%20%E8%92%B2%E7%84%BC%E3%81%8D/100227/')
  })

  it('楽天のアドレスを、ID つきのアフィリエイトのリンクにする。ID が空・形がちがうときは作らない', () => {
    const url = rakutenSearchUrl({ word: 'ひじき', genre: 'food' })
    // 計測 ID のコードがないとき（あるときは、下のテスト）
    const link = rakutenAffiliateUrl(url, TEST_ID, '')!
    expect(link).toBe(`https://hb.afl.rakuten.co.jp/hgc/${TEST_ID}/?pc=${encodeURIComponent(url)}&link_type=text`)
    // 行き先を取り出すと、もとの検索結果のアドレスにもどる
    expect(new URL(link).searchParams.get('pc')).toBe(url)
    expect(rakutenAffiliateUrl(url, '')).toBeNull()
    expect(rakutenAffiliateUrl(url, 'not-an-id')).toBeNull()
  })

  it('計測 ID の文字は、アフィリエイトの ID のすぐあとに入れる。空・形がちがうときは入れない', () => {
    const url = rakutenSearchUrl({ word: 'ひじき', genre: 'food' })
    const plain = `https://hb.afl.rakuten.co.jp/hgc/${TEST_ID}/?pc=${encodeURIComponent(url)}&link_type=text`
    const link = rakutenAffiliateUrl(url, TEST_ID, TEST_MEASURE)!
    expect(link).toBe(`https://hb.afl.rakuten.co.jp/hgc/${TEST_ID}/${TEST_MEASURE}?pc=${encodeURIComponent(url)}&link_type=text`)
    // 行き先は変わらない
    expect(new URL(link).searchParams.get('pc')).toBe(url)
    expect(rakutenAffiliateUrl(url, TEST_ID, '')).toBe(plain)
    // アドレスをこわす字（「/」「?」「&」「"」・空白・かな）や、長すぎる文字は入れない
    for (const bad of ['a/b', 'a?b', 'a&b=1', 'a"b', 'a b', '計測', '<x>', '..', 'x'.repeat(41)]) {
      expect(rakutenMeasure(bad), bad).toBe('')
      expect(rakutenAffiliateUrl(url, TEST_ID, bad), bad).toBe(plain)
    }
    for (const ok of [TEST_MEASURE, 'mogu-1', 'A_b-9']) expect(rakutenMeasure(ok), ok).toBe(ok)
    // 種類ごとのリンクにも入る
    const picks = picksOf('protein', TEST_ID, TEST_MEASURE)
    expect(picks.length).toBe(4)
    for (const p of picks) expect(p.href.startsWith(`https://hb.afl.rakuten.co.jp/hgc/${TEST_ID}/${TEST_MEASURE}?pc=https%3A%2F%2Fsearch.rakuten.co.jp%2F`), p.label).toBe(true)
    // リポジトリに入れてある値：空（計測 ID なし）か、使える形
    expect(RAKUTEN_MEASURE_ID === '' || rakutenMeasure(RAKUTEN_MEASURE_ID) === RAKUTEN_MEASURE_ID).toBe(true)
  })
})

describe('成分ごとの、出す商品の種類', () => {
  it('たんぱく質はプロテイン、食物繊維は難消化性デキストリンなど、カルシウムはカルシウムのサプリ', () => {
    expect(picksOf('protein').map((p) => p.label)).toEqual(['ホエイプロテイン', 'ソイプロテイン', 'プロテインバー', 'プロテインドリンク'])
    expect(picksOf('fiber').map((p) => p.label)).toEqual(['難消化性デキストリン', 'イヌリン', 'サイリウム（オオバコ）', 'グアーガム分解物'])
    expect(picksOf('calcium').map((p) => p.label)).toEqual(['カルシウムのサプリ', 'カルシウム＋マグネシウムのサプリ'])
    expect(shopSection('protein', TEST_ID)!.title).toBe('プロテインなど')
    expect(shopSection('fiber', TEST_ID)!.title).toBe('食物繊維のサプリメントなど')
    expect(shopSection('calcium', TEST_ID)!.title).toBe('カルシウムのサプリメントなど')
    for (const p of picksOf('protein')) expect(p.href.startsWith(`https://hb.afl.rakuten.co.jp/hgc/${TEST_ID}/?pc=https%3A%2F%2Fsearch.rakuten.co.jp%2Fsearch%2Fmall%2F`), p.label).toBe(true)
  })

  it('脂質・炭水化物・カロリー・オメガ6・一価不飽和脂肪酸と、とりすぎに気をつけたい成分のページには、欄を出さない', () => {
    const none: NutrientKey[] = ['energyKcal', 'fat', 'carb', 'n6Fat', 'monoUnsatFat', 'salt', 'satFat', 'caffeine']
    for (const key of none) expect(shopSection(key, TEST_ID), key).toBeNull()
    expect(ALL_KEYS.filter((key) => shopSection(key, TEST_ID) !== null).sort()).toEqual([...RAKUTEN_SHELF_KEYS].sort())
    expect([...RAKUTEN_SHELF_KEYS, ...none].sort()).toEqual([...ALL_KEYS].sort())
    expect(RAKUTEN_SHELF_KEYS).toHaveLength(18)
  })

  it('どの欄も、種類は2つから4つ。同じ種類を2度出さない。見出しは「〜など」', () => {
    for (const key of RAKUTEN_SHELF_KEYS) {
      const section = shopSection(key, TEST_ID)!
      expect(section.picks.length, key).toBeGreaterThanOrEqual(2)
      expect(section.picks.length, key).toBeLessThanOrEqual(4)
      expect(new Set(section.picks.map((p) => p.key)).size, key).toBe(section.picks.length)
      expect(new Set(section.picks.map((p) => p.label)).size, key).toBe(section.picks.length)
      expect(section.title, key).toMatch(/など$/)
    }
  })

  it('カリウムは、サプリメントではなく、食塩を足していない野菜の飲み物を出す。ビタミンAは、β-カロテンを出す（とりすぎになりやすいものをすすめない）', () => {
    const potassium = shopSection('potassium', TEST_ID)!
    expect(potassium.food).toBe(true)
    expect(potassium.picks.map((p) => p.label).join()).not.toContain('サプリ')
    for (const p of potassium.picks) expect(p.word, p.label).toContain('食塩無添加')
    expect(potassium.caution).toContain('腎臓')
    const vitaminA = shopSection('vitaminA', TEST_ID)!
    expect(vitaminA.picks.map((p) => p.label)).toEqual(['β-カロテンのサプリ', 'マルチビタミン'])
    expect(vitaminA.food).toBe(false)
    expect(vitaminA.caution).toContain('とりすぎ')
    // ほかの欄は、サプリメントなどの欄（使い方の注意を添える）
    for (const key of RAKUTEN_SHELF_KEYS) if (key !== 'potassium') expect(shopSection(key, TEST_ID)!.food, key).toBe(false)
  })

  it('種類の表：名前とさがす言葉は空でない。どの種類も、どこかの欄で使う。さがす言葉は種類ごとにちがう', () => {
    const used = new Set(RAKUTEN_SHELF_KEYS.flatMap((key) => picksOf(key).map((p) => p.key)))
    expect([...used].sort()).toEqual(Object.keys(RAKUTEN_KINDS).sort())
    const kinds = Object.values(RAKUTEN_KINDS)
    expect(new Set(kinds.map((k) => k.word)).size).toBe(kinds.length)
    expect(new Set(kinds.map((k) => k.label)).size).toBe(kinds.length)
    for (const [key, kind] of Object.entries(RAKUTEN_KINDS)) {
      expect(kind.label.length, key).toBeGreaterThan(0)
      expect(kind.word.trim(), key).toBe(kind.word)
      expect(kind.word.length, key).toBeGreaterThan(0)
    }
  })

  it('種類の説明には、体へのはたらき（効く・治る・防ぐ・やせる など）を書かない', () => {
    const claims = /効|治|予防|防ぐ|防ぎ|改善|やせ|ダイエット|健康に|病気|血圧|血糖|コレステロール|免疫|おすすめ|人気|ランキング1位/
    for (const [key, kind] of Object.entries(RAKUTEN_KINDS)) {
      expect(kind.label, key).not.toMatch(claims)
      if (kind.note) expect(kind.note, key).not.toMatch(claims)
    }
    for (const key of RAKUTEN_SHELF_KEYS) expect(shopSection(key, TEST_ID)!.title, key).not.toMatch(claims)
  })

  it('どの種類にも、前もって選んだ商品がある（data/rakuten-picks.json の見出しは、種類のさがす言葉）', () => {
    expect(Object.keys(RAKUTEN_PICKS.picks).sort()).toEqual(Object.values(RAKUTEN_KINDS).map((k) => k.word).sort())
  })

  it('ID が空・形がちがうときは、欄を出さない（「広告」の表示も出ない）', () => {
    expect(shopSection('protein', '')).toBeNull()
    expect(shopSection('protein', 'not-an-id')).toBeNull()
  })
})
