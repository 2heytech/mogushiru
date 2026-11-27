import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { RankingRow } from '../domain/ranking'
import type { Food } from '../domain/types'
import { RAKUTEN_ACCESS_KEY, RAKUTEN_AFFILIATE_ID, RAKUTEN_APP_ID, RAKUTEN_MEASURE_ID } from '../site'
import { RAKUTEN_SEARCH_IDS, rakutenAffiliateUrl, rakutenApi, rakutenEnabled, rakutenGenreId, rakutenMeasure, rakutenSearchFor, rakutenSearchUrl, SHOP_SIZE, shopPicks } from './rakuten'

// テスト用の ID（架空の値。形だけ合わせてある）
const TEST_ID = '0123abcd.4567ef01.89abcdef.01234567'
// 計測 ID としてリンクに入れる文字（架空。楽天アフィリエイトの管理画面で作るリンクに入る形）
const TEST_MEASURE = '_RTLink00000'

const foods = (JSON.parse(readFileSync(new URL('../../public/data/foods.json', import.meta.url), 'utf8')) as { foods: Food[] }).foods
const food = (id: string) => foods.find((f) => f.id === id)!
const row = (id: string): RankingRow => ({ food: food(id), value: 1, serving: { grams: 100, label: '1回' }, servingAmount: 1 }) as RankingRow

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
    const picks = shopPicks([row('14001'), row('13003'), row('15168')], TEST_ID)
    expect(picks.map((p) => [p.label, p.word, p.genreId])).toEqual([
      ['オリーブ油', 'オリーブオイル', '100227'],
      ['牛乳', '牛乳', '100316'],
      ['あんパン', 'あんぱん', ''],
    ])
    for (const p of picks) expect(new URL(p.href).searchParams.get('pc')).toBe(rakutenSearchUrl({ word: p.word, genre: p.genreId === '100227' ? 'food' : p.genreId === '100316' ? 'drink' : 'all' }))
  })

  it('ID は、空か、8桁の英数字を「.」で4つつないだ形', () => {
    expect(RAKUTEN_AFFILIATE_ID === '' || rakutenEnabled(RAKUTEN_AFFILIATE_ID)).toBe(true)
    expect(rakutenEnabled(TEST_ID)).toBe(true)
    for (const bad of ['', 'abc', '0123abcd.4567ef01.89abcdef', `${TEST_ID}/?pc=x`, ' 0123abcd.4567ef01.89abcdef.01234567']) expect(rakutenEnabled(bad), bad).toBe(false)
  })

  it('行き先は、楽天市場の検索結果。食べ物のジャンルにしぼる', () => {
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
    // 食品ごとのリンクにも入る
    const picks = shopPicks([row('14001'), row('13003')], TEST_ID, SHOP_SIZE, TEST_MEASURE)
    expect(picks.length).toBe(2)
    for (const p of picks) expect(p.href.startsWith(`https://hb.afl.rakuten.co.jp/hgc/${TEST_ID}/${TEST_MEASURE}?pc=https%3A%2F%2Fsearch.rakuten.co.jp%2F`), p.label).toBe(true)
    // リポジトリに入れてある値：空（計測 ID なし）か、使える形
    expect(RAKUTEN_MEASURE_ID === '' || rakutenMeasure(RAKUTEN_MEASURE_ID) === RAKUTEN_MEASURE_ID).toBe(true)
  })
})

describe('食品ごとの、さがす言葉', () => {
  it('表にない食品は、名前からかっこを取った言葉でさがす', () => {
    expect(rakutenSearchFor({ id: '99999', displayName: 'ひじき（乾）', group: '09' })).toEqual({ word: 'ひじき', label: 'ひじき', genre: 'food' })
    expect(rakutenSearchFor({ id: '99999', displayName: '鶏むね肉（皮つき・焼き）', group: '11' })).toEqual({ word: '鶏むね肉', label: '鶏むね肉', genre: 'food' })
  })

  it('飲み物は「水・ソフトドリンク」、お菓子・菓子パンはジャンルでしぼらない', () => {
    expect(rakutenSearchFor({ id: '99999', displayName: '抹茶（粉）', group: '16' })?.genre).toBe('drink')
    expect(rakutenSearchFor({ id: '99999', displayName: 'アップルパイ', group: '15' })?.genre).toBe('all')
    expect(rakutenSearchFor(food('13003'))).toEqual({ word: '牛乳', label: '牛乳', genre: 'drink' })
    expect(rakutenSearchFor(food('04053'))?.genre).toBe('drink')
  })

  it('店での言い方でさがす（オリーブ油 → オリーブオイル、かき → 牡蠣）。葉だけでは売られていない食品は出さない', () => {
    expect(rakutenSearchFor(food('14001'))).toEqual({ word: 'オリーブオイル', label: 'オリーブ油', genre: 'food' })
    expect(rakutenSearchFor(food('10292'))).toEqual({ word: '牡蠣', label: 'かき（牡蠣）', genre: 'food' })
    expect(rakutenSearchFor(food('06130'))).toBeNull()
    expect(rakutenSearchFor(food('06034'))).toBeNull()
  })

  it('表の食品番号は、成分表にある。言葉と名前は空でない', () => {
    for (const id of RAKUTEN_SEARCH_IDS) {
      const f = foods.find((x) => x.id === id)
      expect(f, id).toBeDefined()
      const search = rakutenSearchFor(f!)
      if (!search) continue
      expect(search.word.trim(), id).toBe(search.word)
      expect(search.word.length, id).toBeGreaterThan(0)
      expect(search.label.length, id).toBeGreaterThan(0)
      // 欄に出す名前に、成分表のままの長い名前（全角の空白で区切ったもの）を使わない
      expect(search.label, id).not.toContain('　')
    }
  })
})

describe('欄に出す食品を選ぶ', () => {
  it('ランキングの上から順に選ぶ。出さない食品はとばし、同じ名前は上の1つだけ', () => {
    // 鶏むね肉（皮つき・焼き）・大根の葉・鶏ささみ（焼き）・鶏むね肉（皮なし）・ささみ・豚レバー
    const picks = shopPicks(['11287', '06130', '11228', '11220', '11227', '11166'].map(row), TEST_ID, SHOP_SIZE, '')
    expect(picks.map((p) => p.label)).toEqual(['鶏むね肉', '鶏ささみ', '豚レバー'])
    expect(picks.map((p) => p.food.id)).toEqual(['11287', '11228', '11166'])
    for (const p of picks) expect(p.href.startsWith(`https://hb.afl.rakuten.co.jp/hgc/${TEST_ID}/?pc=https%3A%2F%2Fsearch.rakuten.co.jp%2Fsearch%2Fmall%2F`), p.label).toBe(true)
  })

  it(`${SHOP_SIZE}つまで`, () => {
    const many = ['10283', '11166', '11232', '11271', '11272', '04052', '04053', '04041', '04039', '06201', '11092', '06086'].map(row)
    expect(shopPicks(many, TEST_ID)).toHaveLength(SHOP_SIZE)
    expect(shopPicks(many, TEST_ID, 3)).toHaveLength(3)
  })

  it('ID が空のときは、何も選ばない（欄も「広告」の表示も出ない）', () => {
    expect(shopPicks(['10283', '11166'].map(row), '')).toEqual([])
  })
})
