import { existsSync, readFileSync } from 'node:fs'
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
    <meta property="og:image" content="https://mogushiru.app/og-image.png" />
    <meta property="og:image:alt" content="もとの画像の説明" />
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

  it('はじめのページのタイトルと説明文に、名前の読み（もぐしる）がある', () => {
    const top = page('/')
    expect(top.title).toContain('モグシル（もぐしる）')
    expect(top.description).toContain('もぐしる')
    expect(top.jsonLd?.[0]).toMatchObject({ '@type': 'WebSite', name: 'モグシル', alternateName: expect.arrayContaining(['もぐしる', 'もぐシル', 'mogushiru']) })
    // ほかのページには入れない（サイトの名前は、はじめのページで伝える）
    expect(page('/ranking/').jsonLd).toBeUndefined()
  })

  it('たんぱく質のページは、100円あたりの一覧を先に出し、身近な食品の1回分の値段を書く', () => {
    const protein = page('/nutrients/protein/')
    expect(protein.title).toContain('100円あたり・1回の量')
    const yen = protein.body.indexOf('値段のわりにたんぱく質が多い食品（100円あたり）')
    expect(yen).toBeGreaterThan(-1)
    expect(yen).toBeLessThan(protein.body.indexOf('id="reference"'))
    expect(yen).toBeLessThan(protein.body.indexOf('ふだん1回に食べる量でたんぱく質が多い食品'))
    // 卵1個・納豆1パックの値段とたんぱく質（本文と説明文の両方）
    expect(protein.body).toMatch(/卵（生）1個（50g）は約\d+円で[\d.]+g/)
    expect(protein.description).toMatch(/納豆1パック（45g）は約\d+円で[\d.]+g/)
    expect(protein.body).toContain('小売物価統計調査')
    // 一覧の行にも1回分の値段
    expect(protein.body).toMatch(/・約<!-- -->\d+<!-- -->円（100gで約<!-- -->\d+<!-- -->円）|・約\d+円（100gで約\d+円）/)
    // ほかの成分は、これまでどおり1回の量から
    const iron = page('/nutrients/iron/')
    expect(iron.title).toContain('1回の量・100gあたり')
    expect(iron.body.indexOf('id="reference"')).toBeLessThan(iron.body.indexOf('ふだん1回に食べる量で鉄分が多い食品'))
    expect(iron.body.indexOf('ふだん1回に食べる量で鉄分が多い食品')).toBeLessThan(iron.body.indexOf('値段のわりに鉄分が多い食品'))
  })

  it('市販品のページには、コンビニ3社の昼ごはんの組み合わせが、商品名・カロリー・たんぱく質・食塩つきである', () => {
    const store = page('/menus/store-bought/')
    expect(store.title).toContain('コンビニの昼ごはんの組み合わせ例')
    expect(store.body).toContain('コンビニの昼ごはんの組み合わせ例')
    for (const name of ['セブン-イレブン', 'ファミリーマート', 'ローソン']) expect(store.body).toContain(`${name}の`)
    for (const id of ['konbini', 'konbini-famima', 'konbini-lawson']) {
      expect(store.body).toContain(`href="/?menu=${id}"`)
      expect(store.body).toContain(`href="#${id}"`)
      expect(store.body).toContain(`id="${id}"`)
    }
    expect(store.body).toContain('昼ごはんの合計')
    // 商品名から各社の商品ページ（出典）に行ける
    expect(store.body).toMatch(/href="https:\/\/www\.sej\.co\.jp\/products\/[^"]+" rel="noopener"/)
    // ほかのジャンルのページには出さない
    expect(page('/menus/washoku/').body).not.toContain('コンビニの昼ごはんの組み合わせ例')
  })

  it('読みもののページには、ページごとの共有の画像がある', () => {
    const withOg = pages.filter((p) => p.og)
    expect(withOg.map((p) => p.path).sort()).toEqual(pages.filter((p) => p.kind === 'static').map((p) => p.path).sort())
    expect(new Set(withOg.map((p) => p.og!.path)).size).toBe(withOg.length)
    for (const p of withOg) {
      expect(p.og!.path).toMatch(/^\/og\/[a-z0-9-]+\.png$/)
      expect(p.og!.alt.length).toBeGreaterThan(10)
      expect(p.og!.card.title.length).toBeLessThanOrEqual(24)
      // 絵は public にあるもの
      for (const src of [...(p.og!.card.icons ?? []), ...(p.og!.card.rows ?? []).map((r) => r.image)]) expect(existsSync(new URL(`../../public${src}`, import.meta.url)), src).toBe(true)
    }
    const protein = page('/nutrients/protein/').og!.card
    expect(protein.rows).toHaveLength(3)
    expect(protein.sub).toContain('100円あたり')
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

  it('共有の画像と、はじめのページのサイト名のデータを入れる', () => {
    const iron = renderDocument(TEMPLATE, page('/nutrients/iron/'))
    expect(iron).toContain('<meta property="og:image" content="https://mogushiru.app/og/nutrients-iron.png" />')
    expect(iron).not.toContain('もとの画像の説明')
    // アプリの画面は、サイト共通の画像のまま
    const top = renderDocument(TEMPLATE, page('/'))
    expect(top).toContain('<meta property="og:image" content="https://mogushiru.app/og-image.png" />')
    expect(top).toContain('"@type":"WebSite"')
    expect(top).toContain('"alternateName":["もぐしる","もぐシル","mogushiru"]')
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

describe('料理の作り方のページ', () => {
  const dishPages = pages.filter((p) => /^\/dishes\/[a-z0-9-]+\/$/.test(p.path))

  it('作り方のある料理（郷土料理をのぞく）ごとにページがあり、一覧からすべてにリンクする', () => {
    const withRecipe = [...catalog.dishes.values()].filter((d) => d.recipe && !d.source && !['drink', 'alcohol'].includes(d.category))
    expect(dishPages.length).toBe(withRecipe.length)
    expect(dishPages.length).toBeGreaterThanOrEqual(250)
    const index = page('/dishes/')
    for (const p of dishPages) expect(index.body).toContain(`href="${p.path}"`)
  })

  it('材料（2人分）・手順・1人前の栄養と、アプリで開くリンクがある', () => {
    const p = page('/dishes/nikujaga/')
    expect(p.title).toContain('肉じゃがの作り方')
    expect(p.body).toContain('材料（2人分）')
    expect(p.body).toContain('つくり方')
    expect(p.body).toContain('1人前の栄養')
    expect(p.body).toContain('href="/customize/?dish=nikujaga"')
    // 同じカテゴリのほかの料理へのリンク
    expect(p.body).toContain('ほかの主菜の作り方')
  })

  it('レシピのデータ（Recipe）に、材料・手順・時間・1人前の栄養と画像がある', () => {
    const ld = page('/dishes/nikujaga/').jsonLd?.[0] as Record<string, unknown>
    expect(ld).toMatchObject({ '@type': 'Recipe', name: '肉じゃが', recipeYield: '2人分', image: ['https://mogushiru.app/og/dishes-nikujaga.png'] })
    expect((ld.recipeIngredient as string[]).length).toBeGreaterThan(3)
    expect((ld.recipeInstructions as { text: string }[])[0].text).toMatch(/。$/)
    expect(ld.totalTime).toMatch(/^PT\d+M$/)
    expect(ld.nutrition).toMatchObject({ servingSize: '1人前', calories: expect.stringMatching(/^\d+ kcal$/) })
  })

  it('style 属性を使わない（CSP で止められるため）', () => {
    for (const p of [...dishPages, page('/dishes/')]) expect(p.body).not.toContain('style=')
  })
})
