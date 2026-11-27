import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 成分のページの「楽天市場でさがす」の欄に、商品の例を出すプログラム（public/rakuten-shop.js）。
// ここでは、画面のない計算のところ（API のアドレス・答えから出す商品を選ぶ・値段の形）を確かめる。
// ページに書く印（data-shop-…）とのつながりは sitePages.test.tsx、画面での動きは PR のときにブラウザで確かめる

type Picked = { name: string; price: number; href: string; image: string; free: boolean; stars: string; reviews: number }
type Shop = {
  searchUrl: (conf: { app: string; key: string; aff: string }, word: string, genre: string) => string
  pickItems: (data: unknown, max: number) => Picked[]
  yen: (n: number) => string
}

const source = readFileSync(new URL('../../public/rakuten-shop.js', import.meta.url), 'utf8')
// ブラウザと同じ「ふつうのスクリプト」として動かす。module を渡すと、計算のところだけを返して、画面にはさわらない
const load = (): Shop => {
  const module = { exports: {} as Shop }
  new Function('module', source)(module)
  return module.exports
}
const shop = load()

// テスト用の値（架空。形だけ合わせてある）
const CONF = { app: '01234567-89ab-cdef-0123-456789abcdef', key: 'pk_TESTtest0123456789', aff: '0123abcd.4567ef01.89abcdef.01234567' }
const IMAGE = 'https://thumbnail.image.rakuten.co.jp/@0_mall/shop/cabinet/a.jpg?_ex=128x128'
const LINK = 'https://hb.afl.rakuten.co.jp/hgc/xxxx/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fshop%2Fa%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fshop%2Fi%2F1%2F&rafcid=wsc'
const item = (over: Record<string, unknown> = {}) => ({ itemName: 'あさり水煮缶 125g', itemPrice: 1280, itemUrl: LINK, affiliateUrl: LINK, mediumImageUrls: [IMAGE], postageFlag: 1, reviewAverage: 4.63, reviewCount: 6793, ...over })

describe('商品の例を出すプログラム（public/rakuten-shop.js）', () => {
  it('楽天市場商品検索 API のアドレス：さがす言葉・ジャンル・アフィリエイトの ID を付け、画像のある・売り切れていない商品だけをもらう', () => {
    const url = new URL(shop.searchUrl(CONF, 'うなぎ 蒲焼き', '100227'))
    expect(url.origin + url.pathname).toBe('https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      applicationId: CONF.app,
      accessKey: CONF.key,
      affiliateId: CONF.aff,
      format: 'json',
      formatVersion: '2',
      keyword: 'うなぎ 蒲焼き',
      hits: '10',
      imageFlag: '1',
      availability: '1',
      genreId: '100227',
    })
    // ジャンルでしぼらない食品（お菓子など）は、genreId を付けない
    expect(new URL(shop.searchUrl(CONF, 'あんぱん', '')).searchParams.has('genreId')).toBe(false)
    // 記号の入った言葉も、アドレスをこわさない
    expect(new URL(shop.searchUrl(CONF, 'a&b=c#d', '')).searchParams.get('keyword')).toBe('a&b=c#d')
  })

  it('問い合わせ先と画像の場所は、読みこんでよい場所の決まり（CSP）に入っている', () => {
    const csp = /^\s+Content-Security-Policy: (.*)$/m.exec(readFileSync(new URL('../../public/_headers', import.meta.url), 'utf8'))![1]
    expect(csp).toContain(` ${new URL(shop.searchUrl(CONF, 'x', '')).origin}`)
    expect(csp).toContain(` ${new URL(shop.pickItems({ Items: [item()] }, 1)[0].image).origin}`)
  })

  it('答えから、名前・値段・リンク・画像のそろった商品を、上から順に選ぶ', () => {
    const picked = shop.pickItems({ count: 3, Items: [item(), item({ itemName: '  豚レバー\n 500g  ', itemPrice: '2480', mediumImageUrls: [{ imageUrl: IMAGE.replace('a.jpg', 'b.jpg') }], postageFlag: 0, reviewCount: 0, reviewAverage: 0 })] }, 6)
    expect(picked).toEqual([
      { name: 'あさり水煮缶 125g', price: 1280, href: LINK, image: IMAGE.replace('128x128', '240x240'), free: false, stars: '4.6', reviews: 6793 },
      { name: '豚レバー 500g', price: 2480, href: LINK, image: IMAGE.replace('a.jpg', 'b.jpg').replace('128x128', '240x240'), free: true, stars: '', reviews: 0 },
    ])
    // 数は max まで
    const many = Array.from({ length: 10 }, (_, i) => item({ itemName: `商品${i}`, mediumImageUrls: [IMAGE.replace('a.jpg', `${i}.jpg`)] }))
    expect(shop.pickItems({ Items: many }, 6).map((x) => x.name)).toEqual(['商品0', '商品1', '商品2', '商品3', '商品4', '商品5'])
    // 前の形の答え（{ Item: … } で包んである・items が小文字）も読める
    expect(shop.pickItems({ Items: [{ Item: item() }] }, 6)).toHaveLength(1)
    expect(shop.pickItems({ items: [item()] }, 6)).toHaveLength(1)
  })

  it('同じ商品（同じ名前・同じ画像）は1つだけ', () => {
    const picked = shop.pickItems({ Items: [item(), item({ itemPrice: 1380 }), item({ itemName: '別の名前' }), item({ itemName: '別の商品', mediumImageUrls: [IMAGE.replace('a.jpg', 'c.jpg')] })] }, 6)
    expect(picked.map((x) => x.name)).toEqual(['あさり水煮缶 125g', '別の商品'])
  })

  it('名前・値段・リンク・画像のどれかが欠けた商品は出さない', () => {
    const bad = [
      item({ itemName: '' }),
      item({ itemName: '   ' }),
      item({ itemPrice: 0 }),
      item({ itemPrice: -100 }),
      item({ itemPrice: 'abc' }),
      item({ itemPrice: Infinity }),
      item({ mediumImageUrls: [] }),
      item({ mediumImageUrls: undefined }),
      item({ affiliateUrl: '', itemUrl: '' }),
      null,
      'x',
      42,
    ]
    expect(shop.pickItems({ Items: bad }, 6)).toEqual([])
    // アフィリエイトのリンクがなければ、商品のページのアドレスを使う
    expect(shop.pickItems({ Items: [item({ affiliateUrl: '', itemUrl: 'https://item.rakuten.co.jp/shop/a/' })] }, 6)[0].href).toBe('https://item.rakuten.co.jp/shop/a/')
  })

  it('リンクは https の楽天のアドレスだけ、画像は https の決まった場所だけを通す（ほかは出さない）', () => {
    const links = [
      'javascript:alert(1)',
      'http://item.rakuten.co.jp/shop/a/',
      'https://example.com/?x=rakuten.co.jp',
      'https://rakuten.co.jp.example.com/',
      'https://item.rakuten.co.jp@example.com/',
      'https://example.com/#.rakuten.co.jp',
      'https://xrakuten.co.jp/',
      '//item.rakuten.co.jp/shop/a/',
      ' https://item.rakuten.co.jp/shop/a/',
      'https://item.rakuten.co.jp/"><script>alert(1)</script>',
      'data:text/html,<script>alert(1)</script>',
      { toString: () => 'https://item.rakuten.co.jp/' },
    ]
    for (const link of links) expect(shop.pickItems({ Items: [item({ affiliateUrl: link, itemUrl: link })] }, 6), String(link)).toEqual([])
    const images = [
      'http://thumbnail.image.rakuten.co.jp/a.jpg',
      'https://example.com/a.jpg',
      'https://image.rakuten.co.jp/a.jpg',
      'https://thumbnail.image.rakuten.co.jp.example.com/a.jpg',
      'https://thumbnail.image.rakuten.co.jp@example.com/a.jpg',
      'data:image/svg+xml,<svg onload=alert(1)>',
      'javascript:alert(1)',
    ]
    for (const image of images) expect(shop.pickItems({ Items: [item({ mediumImageUrls: [image] })] }, 6), image).toEqual([])
    // 楽天のアドレスは通す
    for (const link of ['https://item.rakuten.co.jp/shop/a/', 'https://hb.afl.rakuten.co.jp/hgc/x/?pc=a&m=b', 'https://HB.AFL.RAKUTEN.CO.JP/hgc/x/']) expect(shop.pickItems({ Items: [item({ affiliateUrl: link })] }, 6)[0].href, link).toBe(link)
  })

  it('エラーの答え・商品のない答え・こわれた答えは、商品なし（文字のリンクのままになる）', () => {
    for (const data of [null, undefined, {}, [], 'x', { count: 0, Items: [] }, { errors: { errorCode: 403, errorMessage: 'REQUEST_CONTEXT_BODY_HTTP_REFERRER_MISSING' } }, { error: 'wrong_parameter', error_description: 'x' }, { Items: 'x' }, { Items: {} }])
      expect(shop.pickItems(data, 6), JSON.stringify(data)).toEqual([])
  })

  it('送料無料は、送料こみ（postageFlag が 0）の商品だけ。レビューは、件数があるときだけ', () => {
    const one = (over: Record<string, unknown>) => shop.pickItems({ Items: [item(over)] }, 6)[0]
    expect(one({ postageFlag: 0 }).free).toBe(true)
    expect(one({ postageFlag: '0' }).free).toBe(true)
    for (const flag of [1, '1', null, undefined, '', false]) expect(one({ postageFlag: flag }).free, String(flag)).toBe(false)
    expect(one({ reviewAverage: 4.96, reviewCount: 3 })).toMatchObject({ stars: '5.0', reviews: 3 })
    expect(one({ reviewAverage: 0, reviewCount: 0 })).toMatchObject({ stars: '', reviews: 0 })
    expect(one({ reviewAverage: 4.2, reviewCount: 0 })).toMatchObject({ stars: '', reviews: 0 })
    expect(one({ reviewAverage: 99, reviewCount: 5 }).stars).toBe('')
    expect(one({ reviewAverage: undefined, reviewCount: undefined })).toMatchObject({ stars: '', reviews: 0 })
  })

  it('値段は「1,280」の形', () => {
    expect([0, 5, 980, 1280, 10800, 123456, 1234567].map(shop.yen)).toEqual(['0', '5', '980', '1,280', '10,800', '123,456', '1,234,567'])
  })

  it('楽天から来た字を HTML として読まない（textContent で入れる）。ほかのプログラムを読みこまない', () => {
    expect(source).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function|createElement\('script'\)|import\(/)
    expect(source).toContain('.textContent = it.name')
    // 画面のないところ（このテスト）では、計算のところだけを返して終わる
    expect(Object.keys(shop).sort()).toEqual(['pickItems', 'searchUrl', 'yen'])
  })
})
