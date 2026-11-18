import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { mergeProducts, withNullNutrients } from '../data/products'
import type { Catalog } from '../domain/nutrition'
import { NUTRIENT_GROUPS, type PriceTable } from '../domain/ranking'
import type { Dish, Food, Product } from '../domain/types'
import { CUISINE_DISH_IDS } from './dishCuisine'
import { nutrientPageData } from './nutrientPages'
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
    for (const p of ['/', '/foods/', '/ranking/', '/customize/', '/about/', '/nutrients/', '/menus/']) expect(paths).toContain(p)
    expect(paths.filter((p) => /^\/nutrients\/[a-z0-9-]+\/$/.test(p))).toHaveLength(26)
    expect(paths.filter((p) => /^\/menus\/[a-z-]+\/$/.test(p)).length).toBeGreaterThanOrEqual(6)
  })

  it('タイトルと説明文はページごとにちがう', () => {
    expect(new Set(pages.map((p) => p.title)).size).toBe(pages.length)
    expect(new Set(pages.map((p) => p.description)).size).toBe(pages.length)
  })

  it('成分のページには、1回の量と100gあたりのランキングと1日の目安がある', () => {
    const iron = page('/nutrients/iron/')
    expect(iron.body).toContain('ふだん1回に食べる量で鉄分が多い食品')
    expect(iron.body).toContain('100gあたりで鉄分が多い食品')
    expect(iron.body).toContain('鉄分の1日の摂取量の目安')
    expect(iron.body).toContain('/ranking/#n=iron')
    // とりすぎに気をつけたい成分は、カロリーあたり・価格あたりでは並べない
    expect(page('/nutrients/salt/').body).not.toContain('100円あたり）')
  })

  it('成分のページのタイトルと見出しは「〜が多い食べ物・食品ランキング」ではじまる（「〜の多い食べ物」「〜 食品 ランキング」のどちらでさがした人にも合うように）', () => {
    const nutrientPages = pages.filter((p) => /^\/nutrients\/[a-z0-9-]+\/$/.test(p.path))
    for (const p of nutrientPages) {
      const heading = /<h1[^>]*>(.+?)<\/h1>/.exec(p.body)?.[1].replace(/<[^>]+>/g, '')
      expect(heading, p.path).toMatch(/(食べ物|飲み物)・食品ランキング$/)
      expect(p.title.startsWith(`${heading}｜`), p.path).toBe(true)
      expect(p.title, p.path).toMatch(/でくらべる｜モグシル$/)
    }
    expect(page('/nutrients/vitamin-c/').title).toBe('ビタミンCが多い食べ物・食品ランキング｜1回の量・100gあたりでくらべる｜モグシル')
    expect(page('/nutrients/calories/').title).toContain('カロリーが高い食べ物・食品ランキング')
    expect(page('/nutrients/salt/').title).toContain('塩分が多い食べ物・食品ランキング')
    expect(page('/nutrients/caffeine/').title).toContain('カフェインが多い飲み物・食品ランキング')
    expect(page('/nutrients/omega-6/').title).toContain('オメガ6脂肪酸（n-6系）が多い食べ物・食品ランキング')
    // 本文には「食材」の言い方も入れる
    expect(page('/nutrients/vitamin-b6/').body).toContain('ビタミンB6が多い食べ物・食材を')
  })

  it('成分のページの説明文は、上位3つの名前と量からはじめる（検索結果で、はじめの数十字しか出なくても中身が分かるように）', () => {
    const c = page('/nutrients/vitamin-c/')
    expect(c.description).toMatch(/^ビタミンCが多い食べ物・食品ランキング。ふだん1回に食べる量では、1位 .+ [\d.,]+mg、2位 .+ [\d.,]+mg、3位 .+ [\d.,]+mg。/)
    expect(c.description).toContain('野菜・果物')
    expect(c.description).toContain('1日の摂取量の目安')
    // 説明文の1位は、ページの一覧の1位と同じ食品
    const first = /^[^。]+。ふだん1回に食べる量では、1位 (.+?) [\d.,]+mg、/.exec(c.description)?.[1]
    const list = c.body.slice(c.body.indexOf('id="list-serving"'))
    expect(list.slice(0, list.indexOf('</li>'))).toContain(`>${first}</p>`)
  })

  it('成分のページの一覧には、成分表のままの名前（空白で区切った長い名前）を出さない', () => {
    // 落ちたときは、data/food-names.json の displayNames にふだんの呼び名を足して、foods.json を作り直す（scripts/import-mext.ts）
    const raw = new Set<string>()
    for (const key of NUTRIENT_GROUPS.flatMap((g) => g.keys)) {
      const data = nutrientPageData(key, catalog, prices)
      if (!data) continue
      const rows = [...data.lists.flatMap((l) => l.rows), ...data.groups.flatMap((g) => g.rows)]
      for (const r of rows) if (/\s/.test(r.food.displayName)) raw.add(`${r.food.id} ${r.food.displayName}`)
    }
    expect([...raw]).toEqual([])
  })

  it('成分のページの上位に、めずらしい食品でなく、身近な食品が並ぶ', () => {
    const top = (path: string) => /1位 (.+?) [\d.,]+/.exec(page(path).description)?.[1]
    expect(page('/nutrients/calcium/').description).not.toMatch(/どじょう|ほんもろこ/)
    expect(page('/nutrients/fat/').description).not.toContain('くじら')
    expect(top('/nutrients/omega-3/')).toBe('えごま油')
    expect(page('/nutrients/iron/').description).toContain('豚レバー')
    expect(page('/nutrients/iron/').description).not.toContain('副生物')
  })

  it('成分のページは、ランキングを1日の目安の表より上に出す', () => {
    for (const path of ['/nutrients/iron/', '/nutrients/protein/', '/nutrients/caffeine/', '/nutrients/monounsaturated-fat/']) {
      const body = page(path).body
      const firstList = body.indexOf('id="list-')
      expect(firstList, path).toBeGreaterThan(-1)
      expect(firstList, path).toBeLessThan(body.indexOf('id="reference"'))
    }
  })

  it('成分のページには、食品の種類べつの上位がある（1回の量の一覧のすぐあと）', () => {
    const c = page('/nutrients/vitamin-c/').body
    expect(c).toContain('食品の種類べつに見る、ビタミンCが多い食べ物')
    expect(c).toContain('ビタミンCが多い野菜</h3>')
    expect(c).toContain('ビタミンCが多い果物</h3>')
    expect(c.indexOf('id="list-serving"')).toBeLessThan(c.indexOf('id="by-group"'))
    expect(c.indexOf('id="by-group"')).toBeLessThan(c.indexOf('id="list-per100g"'))
    expect(c).toContain('href="#by-group"')
    expect(page('/nutrients/calcium/').body).toContain('カルシウムが多い牛乳・乳製品</h3>')
    expect(page('/nutrients/calories/').body).toContain('カロリーが高い肉</h3>')
    // 種類は6つまで、それぞれ5品まで
    for (const p of pages.filter((x) => /^\/nutrients\/[a-z0-9-]+\/$/.test(x.path))) {
      const start = p.body.indexOf('id="by-group"')
      if (start < 0) continue
      const section = p.body.slice(start, p.body.indexOf('</section>', start))
      const groups = section.split('<h3').slice(1)
      expect(groups.length, p.path).toBeGreaterThanOrEqual(2)
      expect(groups.length, p.path).toBeLessThanOrEqual(6)
      for (const g of groups) expect(g.split('<li').length - 1, p.path).toBeLessThanOrEqual(5)
    }
    // 飲み物にしか入っていないカフェインには出さない
    expect(page('/nutrients/caffeine/').body).not.toContain('id="by-group"')
  })

  it('成分のページには、その成分が多い料理があり、作り方のページへ行ける', () => {
    const c = page('/nutrients/vitamin-c/').body
    const start = c.indexOf('id="dishes"')
    expect(start).toBeGreaterThan(-1)
    const section = c.slice(start, c.indexOf('</section>', start))
    expect(section).toContain('ビタミンCが多い料理')
    const links = [...section.matchAll(/href="(\/dishes\/[a-z0-9-]+\/)"/g)].map((m) => m[1])
    expect(links).toHaveLength(10)
    for (const path of links) expect(pages.some((p) => p.path === path), path).toBe(true)
    // 量の多い順
    const amounts = [...section.matchAll(/<strong>([\d.,]+)<\/strong>/g)].map((m) => Number(m[1].replace(/,/g, '')))
    expect(amounts).toEqual([...amounts].sort((a, b) => b - a))
    expect(page('/nutrients/salt/').body).toContain('塩分が多い料理')
    // 料理が5品に満たない成分（カフェイン）には出さない
    expect(page('/nutrients/caffeine/').body).not.toContain('id="dishes"')
  })

  it('献立の例のページには、アプリで開くリンクがある', () => {
    const washoku = page('/menus/washoku/')
    expect(washoku.body).toContain('href="/#menu=')
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

  it('運営者の名前から、運営者のサイトに行ける（新しいタブでひらく）', () => {
    // 読みもののページの下の欄
    for (const path of ['/nutrients/', '/menus/washoku/', '/dishes/nikujaga/']) {
      expect(page(path).body).toContain('運営：<a href="https://heyteku.com/" target="_blank" rel="noopener"')
    }
    // 検索エンジン向けのデータにも、運営者のサイトを入れる
    expect(page('/').jsonLd?.[0]).toMatchObject({ publisher: { name: 'へいてく', url: 'https://heyteku.com/' } })
    expect(page('/dishes/nikujaga/').jsonLd?.[0]).toMatchObject({ author: { name: 'へいてく', url: 'https://heyteku.com/' } })
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
    expect(iron.body.indexOf('ふだん1回に食べる量で鉄分が多い食品')).toBeLessThan(iron.body.indexOf('id="reference"'))
    expect(iron.body.indexOf('ふだん1回に食べる量で鉄分が多い食品')).toBeLessThan(iron.body.indexOf('値段のわりに鉄分が多い食品'))
  })

  it('市販品のページには、コンビニ3社の昼ごはんの組み合わせが、商品名・カロリー・たんぱく質・食塩つきである', () => {
    const store = page('/menus/store-bought/')
    expect(store.title).toContain('コンビニの昼ごはんの組み合わせ例')
    expect(store.body).toContain('コンビニの昼ごはんの組み合わせ例')
    for (const name of ['セブン-イレブン', 'ファミリーマート', 'ローソン']) expect(store.body).toContain(`${name}の`)
    for (const id of ['konbini', 'konbini-famima', 'konbini-lawson']) {
      expect(store.body).toContain(`href="/#menu=${id}"`)
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

  it('サイトマップの更新日は、渡された日付だけを書く（日付のないページには書かない）', () => {
    const xml = sitemapXml(pages, { '/nutrients/iron/': '2026-11-13' })
    expect(xml).toContain('<loc>https://mogushiru.app/nutrients/iron/</loc>\n    <lastmod>2026-11-13</lastmod>')
    expect(xml.match(/<lastmod>/g)).toHaveLength(1)
    expect(sitemapXml(pages)).not.toContain('<lastmod>')
  })

  it('読みもののページからアプリを開くリンクは、? を使わない（検索エンジンが別のページとして読みに来ないように）', () => {
    for (const p of pages) expect(p.body, p.path).not.toMatch(/href="\/[^"#]*\?/)
  })

  it('献立の例の料理の名前から、作り方のページへ行ける', () => {
    const washoku = page('/menus/washoku/')
    const links = [...washoku.body.matchAll(/href="(\/dishes\/[a-z0-9-]+\/)"/g)].map((m) => m[1])
    expect(links.length).toBeGreaterThan(10)
    for (const path of links) expect(pages.some((p) => p.path === path), path).toBe(true)
    expect(washoku.body).toContain('下線のある料理は、名前から作り方のページを開けます。')
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
    expect(p.body).toContain('href="/customize/#dish=nikujaga"')
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

  it('レシピのデータに、料理の種類・キーワード・手順の名前とリンクがある', () => {
    const p = page('/dishes/nikujaga/')
    const ld = p.jsonLd?.[0] as Record<string, unknown>
    expect(ld.recipeCuisine).toBe('和食')
    // キーワードは、おもな材料（調味料はのぞく）とかかる時間。種類（主菜・和食）とは重ねない
    expect(ld.keywords).toBe('じゃがいも, たまねぎ, 牛もも肉, 30分以内, 200kcal以下')
    const steps = ld.recipeInstructions as { name: string; text: string; url: string }[]
    steps.forEach((step, i) => {
      // 名前は手順のはじめの1文。リンク先は、ページの中のその手順
      expect(step.text.startsWith(step.name)).toBe(true)
      expect(step.name).not.toContain('。')
      expect(step.url).toBe(`https://mogushiru.app/dishes/nikujaga/#step-${i + 1}`)
      expect(p.body).toContain(`id="step-${i + 1}"`)
    })
    // 画面にも料理の種類を出す（データだけに書かない）
    expect(p.body).toContain('和食・主菜の作り方')
    expect(page('/dishes/mapo-tofu/').body).toContain('中華料理・主菜の作り方')
  })

  it('どの料理にも料理の種類があり、キーワードが2つ以上ある', () => {
    const ids = dishPages.map((p) => p.path.split('/')[2])
    // 一覧（dishCuisine.ts）と作り方のページが、ちょうど合っている
    expect([...CUISINE_DISH_IDS].sort()).toEqual([...ids].sort())
    for (const p of dishPages) {
      const ld = p.jsonLd?.[0] as { recipeCuisine?: string; recipeCategory: string; keywords: string }
      expect(ld.recipeCuisine, p.path).toBeTruthy()
      const words = ld.keywords.split(', ')
      expect(words.length, p.path).toBeGreaterThanOrEqual(2)
      expect(new Set(words).size, p.path).toBe(words.length)
      expect(words, p.path).not.toContain(ld.recipeCategory)
      expect(words, p.path).not.toContain(ld.recipeCuisine)
    }
  })

  it('動画・評価など、ページにないものはレシピのデータに書かない', () => {
    for (const p of dishPages) {
      const ld = p.jsonLd?.[0] as Record<string, unknown>
      expect(ld).not.toHaveProperty('video')
      expect(ld).not.toHaveProperty('aggregateRating')
    }
  })

  it('style 属性を使わない（CSP で止められるため）', () => {
    for (const p of [...dishPages, page('/dishes/')]) expect(p.body).not.toContain('style=')
  })

  it('この料理に多い栄養素から、その成分のランキングのページへ行ける（3つまで、1日の目安に対する割合の大きい順）', () => {
    const p = page('/dishes/goya-champuru/')
    expect(p.body).toContain('この料理に多い栄養素')
    const rich = [...p.body.matchAll(/href="(\/nutrients\/[a-z0-9-]+\/)"[^>]*>([^<]+)<\/a><span[^>]*>[^<]*<span[^>]*>（目安の(?:<!-- -->)?(\d+)(?:<!-- -->)?%）/g)].map((m) => ({ path: m[1], name: m[2], percent: Number(m[3]) }))
    expect(rich.length).toBeGreaterThanOrEqual(1)
    expect(rich.length).toBeLessThanOrEqual(3)
    expect(rich.map((r) => r.percent)).toEqual([...rich.map((r) => r.percent)].sort((a, b) => b - a))
    for (const r of rich) {
      expect(r.percent).toBeGreaterThanOrEqual(20)
      expect(pages.some((x) => x.path === r.path), r.path).toBe(true)
    }
    // どの成分のページにも、料理のページのどれかからリンクがある…とは限らないが、主な成分には届く
    const linked = new Set(dishPages.flatMap((d) => [...d.body.matchAll(/href="(\/nutrients\/[a-z0-9-]+\/)"/g)].map((m) => m[1])))
    for (const path of ['/nutrients/protein/', '/nutrients/vitamin-c/', '/nutrients/iron/', '/nutrients/calcium/']) expect(linked, path).toContain(path)
  })
})
