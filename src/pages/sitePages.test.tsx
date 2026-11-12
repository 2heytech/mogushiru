import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { mergeProducts, withNullNutrients } from '../data/products'
import type { Catalog } from '../domain/nutrition'
import type { PriceTable } from '../domain/ranking'
import type { Dish, Food, Product } from '../domain/types'
import { buildSitePages, NOT_FOUND_PAGE, renderDocument, sitemapXml, type SitePage } from './sitePages'

// ビルドで書き出すページを、配信用のデータ（public/data）から作ってたしかめる
const readData = <T,>(file: string) => JSON.parse(readFileSync(new URL(`../../public/data/${file}`, import.meta.url), 'utf8')) as T
const catalog: Catalog = {
  dishes: new Map(readData<{ dishes: Dish[] }>('dishes.json').dishes.map((d) => [d.id, d])),
  foods: new Map(readData<{ foods: Food[] }>('foods.json').foods.map((f) => [f.id, f])),
  products: mergeProducts(readData<{ products: Product[] }>('store-products.json').products.map(withNullNutrients), readData<{ products: Product[] }>('products.json').products),
  myDishes: new Map(),
}
const prices: PriceTable = new Map(
  readData<{ prices: { foodId: string; yenPer100g: number; item: string }[] }>('prices.json').prices.map((p) => [p.foodId, { yenPer100g: p.yenPer100g, item: p.item }]),
)
const pages = buildSitePages({ catalog, prices })
const page = (path: string) => pages.find((p) => p.path === path)!

// vite build が書き出す index.html と同じ形のひな形
const TEMPLATE = `<!doctype html>
<html lang="ja">
  <head>
    <title>モグシル</title>
    <meta name="description" content="もとの説明" />
    <link rel="canonical" href="https://mogushiru.app/" />
    <meta property="og:title" content="もとのタイトル" />
    <meta property="og:description" content="もとの説明" />
    <meta property="og:url" content="https://mogushiru.app/" />
    <script type="module" crossorigin src="/assets/index-abc.js"></script>
    <link rel="modulepreload" crossorigin href="/assets/vendor-abc.js">
    <link rel="stylesheet" crossorigin href="/assets/index-abc.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`

describe('書き出すページ', () => {
  it('アプリの4画面・成分26ページ・献立の例のページがあり、URL は重ならない', () => {
    const paths = pages.map((p) => p.path)
    expect(new Set(paths).size).toBe(paths.length)
    for (const p of ['/', '/ranking/', '/customize/', '/about/', '/nutrients/', '/menus/']) expect(paths).toContain(p)
    expect(paths.filter((p) => /^\/nutrients\/[a-z0-9-]+\/$/.test(p))).toHaveLength(26)
    expect(paths.filter((p) => /^\/menus\/[a-z-]+\/$/.test(p)).length).toBeGreaterThanOrEqual(6)
  })

  it('タイトルと説明文はページごとにちがう', () => {
    expect(new Set(pages.map((p) => p.title)).size).toBe(pages.length)
    expect(new Set(pages.map((p) => p.description)).size).toBe(pages.length)
  })

  it('成分のページには、1回の量と100gあたりのランキングと1日の目安がある', () => {
    const iron = page('/nutrients/iron/')
    expect(iron.title).toContain('鉄分が多い食品ランキング')
    expect(iron.body).toContain('ふだん1回に食べる量で鉄分が多い食品')
    expect(iron.body).toContain('100gあたりで鉄分が多い食品')
    expect(iron.body).toContain('1日の目安')
    expect(iron.body).toContain('/ranking/?n=iron')
    // とりすぎに気をつけたい成分は、カロリーあたり・価格あたりでは並べない
    expect(page('/nutrients/salt/').body).not.toContain('100円あたり）')
  })

  it('献立の例のページには、アプリで開くリンクがある', () => {
    const washoku = page('/menus/washoku/')
    expect(washoku.body).toContain('href="/?menu=')
    expect(washoku.body).toContain('kcal')
  })
})

describe('HTML のひな形への差しこみ', () => {
  it('アプリの画面は、プログラムを読んだうえで最初の字を入れる', () => {
    const out = renderDocument(TEMPLATE, page('/ranking/'))
    expect(out).toContain('<link rel="canonical" href="https://mogushiru.app/ranking/" />')
    expect(out).toContain('<meta property="og:url" content="https://mogushiru.app/ranking/" />')
    expect(out).toContain('src="/assets/index-abc.js"')
    expect(out).toMatch(/<div id="root">.+<\/div>/s)
  })

  it('読みもののページは、アプリのプログラムを読まず、パンくずを入れる', () => {
    const out = renderDocument(TEMPLATE, page('/nutrients/iron/'))
    expect(out).not.toContain('index-abc.js')
    expect(out).not.toContain('vendor-abc.js')
    expect(out).toContain('index-abc.css')
    expect(out).toContain('"@type":"BreadcrumbList"')
    expect(out).not.toContain('<div id="root">')
  })

  it('404 は検索に載せない', () => {
    const out = renderDocument(TEMPLATE, NOT_FOUND_PAGE())
    expect(out).toContain('<meta name="robots" content="noindex" />')
    expect(out).not.toContain('rel="canonical"')
  })

  it('タイトルの記号はエスケープする', () => {
    const p: SitePage = { path: '/x/', title: 'A & B <C>', description: '"引用"', kind: 'static', body: '<p>x</p>' }
    const out = renderDocument(TEMPLATE, p)
    expect(out).toContain('<title>A &amp; B &lt;C&gt;</title>')
    expect(out).toContain('content="&quot;引用&quot;"')
  })

  it('ひな形の目印がなくなっていたら、書き出しを止める', () => {
    expect(() => renderDocument('<html></html>', page('/'))).toThrow()
  })

  it('サイトマップには 404 を入れない', () => {
    const xml = sitemapXml([...pages, NOT_FOUND_PAGE()])
    expect(xml).toContain('<loc>https://mogushiru.app/nutrients/iron/</loc>')
    expect(xml).not.toContain('404')
  })
})
