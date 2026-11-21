import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { mergeProducts, withNullNutrients } from '../data/products'
import { itemTotals, type Catalog } from '../domain/nutrition'
import { NUTRIENT_GROUPS, type PriceTable } from '../domain/ranking'
import { servingFor } from '../domain/serving'
import type { Dish, Food, Product } from '../domain/types'
import { FOOD_PAGE_IDS, foodIdFromPath, foodPagePath } from '../routes'
import { CUISINE_DISH_IDS } from './dishCuisine'
import { INDEX_FILTERS } from './dishPages'
import { nutrientPageData } from './nutrientPages'
import { buildSitePages, NOT_FOUND_PAGE, renderDocument, sitemapXml, withUpdatedDate, type SitePage } from './sitePages'

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
  it('アプリの4画面・このサイトについて・成分26ページ・献立の例のページがあり、URL は重ならない', () => {
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

  it('成分のページのタイトルは「〜が多い食べ物ランキング｜1食分・100gあたりで比較」（要点を最初の区切りに入れ、見出しとそろえる）', () => {
    const nutrientPages = pages.filter((p) => /^\/nutrients\/[a-z0-9-]+\/$/.test(p.path))
    for (const p of nutrientPages) {
      const heading = /<h1[^>]*>(.+?)<\/h1>/.exec(p.body)?.[1].replace(/<[^>]+>/g, '')
      expect(heading, p.path).toMatch(/(食べ物|飲み物)ランキング$/)
      expect(p.title.startsWith(`${heading}｜`), p.path).toBe(true)
      expect(p.title, p.path).toMatch(/｜1食分・100(g|円)あたりで比較$/)
    }
    expect(page('/nutrients/vitamin-c/').title).toBe('ビタミンCが多い食べ物ランキング｜1食分・100gあたりで比較')
    expect(page('/nutrients/calories/').title).toContain('カロリーが高い食べ物ランキング')
    expect(page('/nutrients/salt/').title).toContain('塩分が多い食べ物ランキング')
    expect(page('/nutrients/caffeine/').title).toContain('カフェインが多い飲み物ランキング')
    expect(page('/nutrients/omega-6/').title).toContain('オメガ6脂肪酸（n-6系）が多い食べ物ランキング')
    // 「食品」「食材」でさがす人のための言葉は、本文に入れる
    expect(page('/nutrients/vitamin-b6/').body).toContain('ビタミンB6が多い食べ物・食材を')
    expect(page('/nutrients/vitamin-b6/').body).toContain('ビタミンB6が多い食品')
  })

  it('成分・献立のページのタイトルは短い（検索結果で後ろが落ちても、要点が残るように）', () => {
    const targets = pages.filter((p) => /^\/(nutrients|menus)\//.test(p.path))
    expect(targets.length).toBeGreaterThanOrEqual(34)
    // いちばん長いのは、名前の長い成分（オメガ3脂肪酸（n-3系）など）
    for (const p of targets) expect(p.title.length, `${p.path} ${p.title}`).toBeLessThanOrEqual(40)
    const lengths = targets.map((p) => p.title.length).sort((a, b) => a - b)
    expect(lengths[Math.floor(lengths.length / 2)]).toBeLessThanOrEqual(32)
    expect(page('/nutrients/').title).toBe('食品成分ランキング｜成分別に多い食べ物（26成分）｜モグシル')
    expect(page('/menus/washoku/').title).toMatch(/^和食の1日の献立の例（\d+種）｜カロリー・PFCつき｜モグシル$/)
    expect(page('/menus/').title).toMatch(/^栄養バランスの整う1日の献立の例（\d+種）｜モグシル$/)
    // 見出し（h1）は、タイトルの最初の区切りと同じ言葉ではじまる
    for (const path of ['/nutrients/', '/menus/', '/menus/washoku/', '/menus/every-meal/']) {
      const heading = /<h1[^>]*>(.+?)<\/h1>/.exec(page(path).body)?.[1].replace(/<[^>]+>/g, '') ?? ''
      const first = page(path).title.split('｜')[0].replace(/（[^）]*）$/, '')
      expect(heading.startsWith(first), `${path} ${heading}`).toBe(true)
    }
  })

  it('成分のページの説明文は、上位3つの名前と量からはじめる（検索結果で、はじめの数十字しか出なくても中身が分かるように）', () => {
    const c = page('/nutrients/vitamin-c/')
    expect(c.description).toMatch(/^ビタミンCが多い食べ物ランキング。ふだん1回に食べる量では、1位 .+ [\d.,]+mg、2位 .+ [\d.,]+mg、3位 .+ [\d.,]+mg。/)
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

  it('はじめのページのタイトルは、さがされる言葉（栄養計算・栄養バランス）からはじめる。名前の読み（もぐしる）は説明文とデータで伝える', () => {
    const top = page('/')
    expect(top.title).toBe('栄養計算・栄養バランスチェック（無料）｜料理を選ぶだけ｜モグシル')
    expect(top.description).toContain('モグシル（もぐしる）')
    expect(top.jsonLd?.[0]).toMatchObject({ '@type': 'WebSite', name: 'モグシル', alternateName: expect.arrayContaining(['もぐしる', 'もぐシル', 'mogushiru']) })
    // ほかのページには入れない（サイトの名前は、はじめのページで伝える）
    expect(page('/foods/').jsonLd).toBeUndefined()
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
    expect(protein.title).toBe('たんぱく質が多い食べ物ランキング｜1食分・100円あたりで比較')
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
    expect(iron.title).toBe('鉄分が多い食べ物ランキング｜1食分・100gあたりで比較')
    expect(iron.body.indexOf('ふだん1回に食べる量で鉄分が多い食品')).toBeLessThan(iron.body.indexOf('id="reference"'))
    expect(iron.body.indexOf('ふだん1回に食べる量で鉄分が多い食品')).toBeLessThan(iron.body.indexOf('値段のわりに鉄分が多い食品'))
  })

  it('市販品のページは、タイトル・見出し・説明文を「コンビニ昼ごはんの組み合わせ3例」でそろえ、見出しのすぐ下に比較表を置く', () => {
    const store = page('/menus/store-bought/')
    expect(store.title).toBe('コンビニ昼ごはんの組み合わせ3例｜セブン・ファミマ・ローソン｜モグシル')
    expect(store.description).toMatch(/^セブン・ファミマ・ローソンの昼ごはんをカロリー・たんぱく質・食塩で比較。商品や量を変えて、朝・晩を含む1日の栄養も試せます。/)
    const body = store.body
    expect(/<h1[^>]*>(.+?)<\/h1>/.exec(body)?.[1].replace(/<[^>]+>/g, '')).toBe('コンビニ昼ごはんの組み合わせ3例と1日の献立')
    // 比較表は、見出しのあと・くわしい説明や内訳より前
    const table = body.indexOf('id="konbini-compare"')
    expect(table).toBeGreaterThan(body.indexOf('</h1>'))
    expect(table).toBeLessThan(body.indexOf('id="konbini-lunch"'))
    expect(table).toBeLessThan(body.indexOf('買ってきたものを取り入れた'))
    const compare = body.slice(table, body.indexOf('</section>', table))
    // 3つの組み合わせの合計（カロリー・たんぱく質・食塩相当量）と、内訳へのリンク
    const rows = [...compare.matchAll(/<a href="#(lunch-[a-z-]+)"[^>]*>(.+?)<\/a><\/th><td[^>]*>(\d+)<span[^>]*> kcal<\/span><\/td><td[^>]*>([\d.]+)<span[^>]*> g<\/span><\/td><td[^>]*>([\d.]+)<span/g)]
    expect(rows.map((r) => r[1])).toEqual(['lunch-konbini', 'lunch-konbini-famima', 'lunch-konbini-lawson'])
    expect(rows.map((r) => r[2].replace(/<[^>]+>/g, ''))).toEqual(['セブン-イレブンのおにぎりとサラダ', 'ファミリーマートのおにぎりとサラダ', 'ローソンのサンドイッチとサラダ'])
    for (const r of rows) {
      expect(body).toContain(`id="${r[1]}"`)
      // 表の合計は、内訳の「昼ごはんの合計」と同じ数字
      const card = body.slice(body.indexOf(`id="${r[1]}"`))
      const total = card.slice(card.indexOf('昼ごはんの合計'), card.indexOf('</tfoot>'))
      expect(total.replace(/<!-- -->/g, '')).toContain(`>${r[3]} kcal<`)
      expect(total.replace(/<!-- -->/g, '')).toContain(`>${r[4]} g<`)
    }
    // 1例の合計であること（平均や優劣ではない）と、値を取った日を、表のそばに書く
    expect(compare).toContain('各社の商品で組んだ1例の合計です（各社の平均や優劣ではありません）')
    expect(compare.replace(/<!-- -->/g, '')).toMatch(/各社公式サイトの栄養成分表示（\d{4}-\d{2}-\d{2} 時点）/)
    expect(body).not.toContain('目安に合いように')
    expect(body).toContain('食塩が目安に合うように量を決めています')
    expect(page('/menus/washoku/').body).toContain('食塩が目安に合い、ビタミンやミネラルもほぼ目安に届くように量を決めています')
  })

  it('市販品のページには、コンビニ3社の昼ごはんの組み合わせが、商品名・カロリー・たんぱく質・食塩つきである', () => {
    const store = page('/menus/store-bought/')
    expect(store.body).toContain('組み合わせごとの商品と内訳')
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
    expect(page('/menus/washoku/').body).not.toContain('コンビニ昼ごはん')
    expect(page('/menus/washoku/').body).not.toContain('id="konbini-compare"')
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
      for (const src of [...(p.og!.card.icons ?? []), ...(p.og!.card.rows ?? []).map((r) => r.image), ...(p.og!.card.hero ? [p.og!.card.hero] : [])]) expect(existsSync(new URL(`../../public${src}`, import.meta.url)), src).toBe(true)
    }
    const protein = page('/nutrients/protein/').og!.card
    expect(protein.rows).toHaveLength(3)
    expect(protein.sub).toContain('100円あたり')
  })
})

describe('HTML のひな形への差しこみ', () => {
  it('アプリの画面は、プログラムを読んだうえで最初の字を入れる', () => {
    const out = renderDocument(TEMPLATE, page('/foods/'))
    expect(out).toContain('<link rel="canonical" href="https://mogushiru.app/foods/" />')
    expect(out).toContain('<meta property="og:url" content="https://mogushiru.app/foods/" />')
    expect(out).toContain('src="/assets/index-abc.js"')
    expect(out).toMatch(/<div id="root">.+<\/div>/s)
  })

  it('アプリの画面の最初の HTML には、その画面の見出し（h1）が1つあり、ロゴは見出しにしない', () => {
    const headings: Record<string, string> = {
      '/': '料理を選ぶだけで、1日の栄養バランスがわかる',
      '/foods/': '食品の栄養素を名前で調べる',
      '/ranking/': 'ランキングを並べ替え',
      '/customize/': '料理をアレンジ',
    }
    for (const [path, heading] of Object.entries(headings)) {
      const h1 = [...page(path).body.matchAll(/<h1[^>]*>(.*?)<\/h1>/g)].map((m) => m[1])
      expect(h1, path).toEqual([heading])
    }
  })

  it('はじめのページの最初の HTML に、コンビニ昼ごはんと、100円あたりのたんぱく質のページへのリンクがある', () => {
    const top = page('/').body
    expect(top).toMatch(/<a href="\/menus\/store-bought\/"[^>]*>コンビニ昼ごはん[^<]*<\/a>/)
    expect(top).toMatch(/<a href="\/nutrients\/protein\/"[^>]*>100円あたりのたんぱく質[^<]*<\/a>/)
    for (const path of ['/nutrients/', '/menus/', '/dishes/']) expect(top).toContain(`href="${path}"`)
  })

  it('ランキングを並べ替える画面（/ranking/）は検索に載せない：最初の HTML に noindex、canonical は自分のまま、サイトマップに入れない', () => {
    const out = renderDocument(TEMPLATE, page('/ranking/'))
    expect(out).toContain('<meta name="robots" content="noindex" />')
    expect(out).toContain('<link rel="canonical" href="https://mogushiru.app/ranking/" />')
    // head の中に、プログラムより前に書く
    expect(out.indexOf('name="robots"')).toBeLessThan(out.indexOf('</head>'))
    const xml = sitemapXml(pages)
    expect(xml).not.toContain('/ranking/')
    // ほかの画面・読みもののページには付けない（同じアプリなので、1ページずつ確かめる）
    const noindex = pages.filter((p) => renderDocument(TEMPLATE, p).includes('noindex')).map((p) => p.path)
    expect(noindex).toEqual(['/ranking/'])
    expect(xml.match(/<loc>/g)).toHaveLength(pages.length - 1)
    for (const path of ['/', '/foods/', '/customize/', '/about/', '/nutrients/']) expect(xml).toContain(`<loc>https://mogushiru.app${path}</loc>`)
    // サイトの中のリンクは残す：成分のページの「くらべ方や種類を変えて見る」と、一覧の「条件を変えて並べ替える」
    expect(page('/nutrients/iron/').body).toContain('href="/ranking/#n=iron"')
    expect(page('/nutrients/').body).toMatch(/<a href="\/ranking\/"[^>]*>条件を変えて並べ替える<\/a>/)
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
    expect(washoku.body).toContain('下線のある料理は、名前からカロリー・栄養と作り方のページを開けます。')
  })

  it('献立の例の料理の「×1.1」には、重さか「人前」を書き添える（ごはん×1.1（約165g）・サーモン丼×1.2人前）', () => {
    const body = page('/menus/washoku/').body.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, '')
    expect(body).toMatch(/ごはん×\d\.\d（約\d+g）/)
    expect(body).toMatch(/サーモン丼×\d\.\d人前/)
    // 献立の中に、「×1.1」だけで終わるものはない（上の説明の「×1.2」は別）
    expect(body.replace('料理の「×1.2」は', '')).not.toMatch(/×\d(\.\d)?(?!\.?\d|（約|人前)/)
    expect(body).toContain('料理の「×1.2」は、1人前の1.2倍の量です。')
  })

  it('献立の例のページの上に目次があり、名前からその献立のところへ移れる', () => {
    for (const p of pages.filter((p) => /^\/menus\/[a-z0-9-]+\/$/.test(p.path))) {
      // スマホ用（たたんである）と広い画面用（いつも出ている）の2つ。中身は同じ
      const tocs = [...p.body.matchAll(/<nav aria-label="このページの献立"[^>]*>(.+?)<\/nav>/g)].map((m) => [...m[1].matchAll(/href="#([a-z0-9-]+)"/g)].map((l) => l[1]))
      expect(tocs.length, p.path).toBe(2)
      expect(tocs[1], p.path).toEqual(tocs[0])
      const links = tocs[0]
      const cards = [...p.body.matchAll(/<li id="([a-z0-9-]+)"/g)].map((m) => m[1])
      expect(links.length, p.path).toBeGreaterThan(2)
      // 目次の行き先は、どれもページの中の献立で、並びも同じ
      expect(cards.filter((id) => links.includes(id)), p.path).toEqual(links)
      expect(p.body, p.path).toContain(`目次：このページの献立（${links.length}種）`)
      expect(p.body, p.path).toMatch(/<details class="[^"]*sm:hidden">\s*<summary[^>]*>目次/)
      expect(p.body, p.path).toMatch(/<nav aria-label="このページの献立" class="[^"]*hidden [^"]*sm:block">/)
    }
  })
})

describe('料理のカロリー・栄養と作り方のページ', () => {
  const dishPages = pages.filter((p) => /^\/dishes\/[a-z0-9-]+\/$/.test(p.path))
  const h1 = (p: SitePage) => /<h1[^>]*>(.+?)<\/h1>/.exec(p.body)?.[1].replace(/<[^>]+>/g, '') ?? ''
  // 1人前の成分の表の行（成分の名前 → 量と割合の字）
  const tableRows = (p: SitePage) => {
    const table = /<table[\s\S]*?<\/table>/.exec(p.body)?.[0] ?? ''
    return [...table.matchAll(/<tr[^>]*><th scope="row"[^>]*>(.*?)<\/th><td[^>]*>(.*?)<\/td><td[^>]*>(.*?)<\/td><\/tr>/g)].map((m) => ({
      name: m[1].replace(/<[^>]+>/g, ''),
      amount: m[2].replace(/<[^>]+>/g, ''),
      percent: m[3].replace(/<[^>]+>/g, ''),
    }))
  }

  it('作り方のある料理（郷土料理をのぞく）ごとにページがあり、一覧からすべてにリンクする', () => {
    const withRecipe = [...catalog.dishes.values()].filter((d) => d.recipe && !d.source && !['drink', 'alcohol'].includes(d.category))
    expect(dishPages.length).toBe(withRecipe.length)
    expect(dishPages.length).toBeGreaterThanOrEqual(250)
    const index = page('/dishes/')
    for (const p of dishPages) expect(index.body).toContain(`href="${p.path}"`)
  })

  it('タイトル・見出し・説明文は、カロリーと栄養からはじめる（どの料理も同じ型）', () => {
    const saba = page('/dishes/saba-misoni/')
    expect(saba.title).toMatch(/^さばの味噌煮のカロリー・栄養（1人前\d+kcal）と作り方｜モグシル$/)
    expect(h1(saba)).toBe('さばの味噌煮のカロリー・栄養と作り方')
    expect(saba.description).toMatch(/^さばの味噌煮は1人前\d+kcal、たんぱく質[\d.]+g、脂質[\d.]+g、食塩[\d.]+g。ビタミン・ミネラルなど26成分と、2人分の作り方（約\d+分）も載せています。$/)
    for (const p of dishPages) {
      const name = catalog.dishes.get(p.path.split('/')[2])!.name
      expect(p.title, p.path).toMatch(/のカロリー・栄養（1人前\d+kcal）と作り方｜モグシル$/)
      expect(p.title.startsWith(`${name}のカロリー・栄養（1人前`), p.path).toBe(true)
      expect(h1(p), p.path).toBe(`${name}のカロリー・栄養と作り方`)
      expect(p.description.startsWith(`${name}は1人前`), p.path).toBe(true)
      // 共有の画像の見出しも、カロリー・栄養
      expect(p.og!.card.title, p.path).toBe(`${name}のカロリー・栄養`)
      expect(p.og!.card.badge, p.path).toMatch(/^1人前 \d+ kcal$/)
    }
    // 一覧・パンくず・フッターでの呼び名は「料理のカロリー・栄養」
    const index = page('/dishes/')
    expect(index.title).toBe(`料理のカロリー・栄養と作り方（${dishPages.length}品）｜モグシル`)
    expect(h1(index)).toBe(`料理のカロリー・栄養と作り方（${dishPages.length}品）`)
    expect(index.crumbs?.at(-1)?.name).toBe('料理のカロリー・栄養')
    expect(saba.crumbs?.[1]).toEqual({ name: '料理のカロリー・栄養', path: '/dishes/' })
    expect(saba.body).toContain('<a href="/dishes/" class="underline decoration-ink-soft/40 underline-offset-2">料理のカロリー・栄養</a>')
    for (const p of [saba, index]) expect(p.body).not.toContain('料理の作り方')
  })

  it('1人前の栄養 → 材料（2人分） → つくり方 の順に並び、アプリで開くリンクがある', () => {
    const p = page('/dishes/nikujaga/')
    const at = (text: string) => p.body.indexOf(text)
    expect(at('id="nutrition"')).toBeGreaterThan(0)
    expect(at('id="nutrition"')).toBeLessThan(at('id="ingredients"'))
    expect(at('id="ingredients"')).toBeLessThan(at('id="steps"'))
    expect(p.body).toContain('肉じゃが 1人前の栄養')
    expect(p.body).toContain('材料（2人分）')
    expect(p.body).toContain('つくり方')
    // ページの上から、それぞれの場所へとべる
    for (const id of ['nutrition', 'ingredients', 'steps']) expect(p.body).toContain(`href="#${id}"`)
    expect(p.body).toContain('href="/customize/#dish=nikujaga"')
    // 同じカテゴリのほかの料理へのリンク
    expect(p.body).toContain('ほかの主菜のカロリー・栄養')
  })

  it('どの料理にも、26成分の量と1日の目安に対する割合の表がある', () => {
    for (const p of dishPages) {
      const rows = tableRows(p)
      expect(rows.length, p.path).toBe(26)
      expect(new Set(rows.map((r) => r.name.replace('※', ''))).size, p.path).toBe(26)
      for (const r of rows) {
        expect(r.amount, `${p.path} ${r.name}`).toMatch(/^[\d,.]+ (kcal|g|mg|µg|mgNE)$/)
        expect(r.percent, `${p.path} ${r.name}`).toMatch(/^(—|(目安|上限)の[\d,.]+%)$/)
      }
      // 目安の条件と出典を添える
      expect(p.body, p.path).toContain('30〜49歳・女性')
      expect(p.body, p.path).toContain('日本人の食事摂取基準（2025年版）')
      expect(p.body, p.path).toContain('日本食品標準成分表（八訂）増補2023年')
    }
    const rows = tableRows(page('/dishes/saba-misoni/'))
    expect(rows.map((r) => r.name.replace('※', ''))).toEqual([
      ...['エネルギー', 'たんぱく質', '脂質', '炭水化物', '食物繊維'],
      ...['カルシウム', '鉄', 'カリウム', 'マグネシウム', '亜鉛'],
      ...['ビタミンA', 'ビタミンD', 'ビタミンE', 'ビタミンB1', 'ビタミンB2', 'ナイアシン', 'ビタミンB6', '葉酸', 'ビタミンC'],
      ...['n-3系脂肪酸', 'n-6系脂肪酸', '一価不飽和脂肪酸', '多価不飽和脂肪酸'],
      ...['食塩相当量', '飽和脂肪酸', 'カフェイン'],
    ])
    // とりたい成分は目安、とりすぎに気をつけたい成分は上限に対する割合。1日の量の目安がない成分は「—」
    const by = Object.fromEntries(rows.map((r) => [r.name.replace('※', ''), r]))
    expect(by['エネルギー'].percent).toMatch(/^目安の/)
    expect(by['食塩相当量'].percent).toMatch(/^上限の/)
    expect(by['脂質'].percent).toBe('—')
    // 表の量は、ページの上の数字・説明文と同じ
    const saba = page('/dishes/saba-misoni/')
    const kcal = /1人前(\d+)kcal/.exec(saba.description)![1]
    expect(by['エネルギー'].amount).toBe(`${kcal} kcal`)
    expect(saba.description).toContain(`たんぱく質${by['たんぱく質'].amount.replace(' g', '')}g`)
    expect(saba.description).toContain(`食塩${by['食塩相当量'].amount.replace(' g', '')}g`)
  })

  it('レシピのデータ（Recipe）に、材料・手順・時間・1人前の栄養と画像がある', () => {
    const ld = page('/dishes/nikujaga/').jsonLd?.[0] as Record<string, unknown>
    expect(ld).toMatchObject({ '@type': 'Recipe', name: '肉じゃが', recipeYield: '2人分', url: 'https://mogushiru.app/dishes/nikujaga/', inLanguage: 'ja' })
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
    expect(p.body).toContain('>和食・主菜</p>')
    expect(page('/dishes/mapo-tofu/').body).toContain('>中華料理・主菜</p>')
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

  it('レシピ用の画像は、料理の絵を大きく置いた3つの形（1:1・4:3・16:9）。写真は使わない', () => {
    for (const p of dishPages) {
      const id = p.path.split('/')[2]
      const ld = p.jsonLd?.[0] as { image: string[] }
      expect(ld.image, p.path).toEqual(['1x1', '4x3', '16x9'].map((n) => `https://mogushiru.app/recipe-images/${id}-${n}.png`))
      expect(p.images?.map((i) => `https://mogushiru.app${i.path}`), p.path).toEqual(ld.image)
      expect(p.images?.map((i) => i.width / i.height), p.path).toEqual([1, 4 / 3, 16 / 9])
      for (const i of p.images!) {
        expect(i.width, p.path).toBeGreaterThanOrEqual(1200)
        expect(existsSync(new URL(`../../public${i.illustration}`, import.meta.url)), i.illustration).toBe(true)
      }
      // 共有の画像（og:image）は、字の入った別の画像
      expect(ld.image).not.toContain(`https://mogushiru.app${p.og!.path}`)
    }
    expect(pages.filter((p) => p.images).length).toBe(dishPages.length)
  })

  it('レシピのデータに、公開した日と中身が最後に変わった日を書く（日付は data/sitemap-lastmod.json から）', () => {
    const p = { ...page('/dishes/nikujaga/'), dates: { published: '2026-11-14', modified: '2026-11-21' } }
    const out = renderDocument(TEMPLATE, p)
    const recipe = [...out.matchAll(/<script type="application\/ld\+json">(.+?)<\/script>/g)].map((m) => JSON.parse(m[1]) as Record<string, unknown>).find((d) => d['@type'] === 'Recipe')!
    expect(recipe).toMatchObject({ datePublished: '2026-11-14', dateModified: '2026-11-21' })
    // パンくずなど、ほかのデータには書かない。日付のないとき（テストなど）は、レシピにも書かない
    expect(out.match(/datePublished/g)).toHaveLength(1)
    expect(renderDocument(TEMPLATE, page('/dishes/nikujaga/'))).not.toContain('datePublished')
  })

  it('一覧のページに、料理のページの並び（ItemList）がある', () => {
    const ld = page('/dishes/').jsonLd?.[0] as { '@type': string; numberOfItems: number; itemListElement: { position: number; url: string; name: string }[] }
    expect(ld['@type']).toBe('ItemList')
    expect(ld.numberOfItems).toBe(dishPages.length)
    expect(ld.itemListElement.map((i) => i.url).sort()).toEqual(dishPages.map((p) => `https://mogushiru.app${p.path}`).sort())
    expect(ld.itemListElement.map((i) => i.position)).toEqual(dishPages.map((_, i) => i + 1))
    // 並びは、ページに出ている順
    const index = page('/dishes/').body
    const shown = [...index.matchAll(/href="(\/dishes\/[a-z0-9-]+\/)"/g)].map((m) => `https://mogushiru.app${m[1]}`)
    expect(ld.itemListElement.map((i) => i.url)).toEqual(shown)
  })

  // 一覧のページの、料理の行に書いた値（public/dish-index.js が読む）
  const indexRows = [...page('/dishes/').body.matchAll(/<li data-key="([^"]*)" data-kcal="(\d+)" data-protein="([\d.]+)" data-salt="([\d.]+)" data-min="(\d+)"/g)].map((m) => ({
    key: m[1],
    kcal: Number(m[2]),
    protein: Number(m[3]),
    salt: Number(m[4]),
    min: Number(m[5]),
  }))

  it('一覧のページの料理の行に、さがす・しぼりこむ・並べかえるための値がある（名前と読み・カロリー・たんぱく質・食塩・時間）', () => {
    const index = page('/dishes/')
    expect(indexRows.length).toBe(dishPages.length)
    // 名前でも読みでも見つかる。カタカナはひらがなにそろえ、区切りの「・」は入れない
    expect(indexRows.map((r) => r.key)).toContain('鶏の唐揚げ からあげ とりのからあげ')
    expect(indexRows.map((r) => r.key)).toContain('かれーらいす かれーらいす')
    expect(indexRows.map((r) => r.key)).toContain('焼き鳥(ねぎまたれ) やきとり ねぎま たれ')
    for (const r of indexRows) expect(r.key).not.toMatch(/[ァ-ヶA-Z・]/)
    // 行には、カロリーとたんぱく質をいつも出す。食塩・時間は、それでしぼりこむ・並べかえる間だけ（ふだんはかくす）
    const karaage = /<li data-key="鶏の唐揚げ[^>]*>(.+?)<\/li>/.exec(index.body)![1].replace(/<!-- -->/g, '')
    expect(karaage.replace(/<\/span>/g, '|').replace(/<[^>]+>/g, '')).toMatch(/^鶏の唐揚げ\d+ kcal\|たんぱく質 \d+\.\d g\|食塩 \d+\.\d g\|\d+分\|/)
    expect(karaage).toMatch(/<span class="hidden [^"]*">食塩 /)
    expect(karaage).toMatch(/<span class="hidden [^"]*">\d+分/)
  })

  it('一覧のページに、名前の検索・しぼりこみ・並べかえのフォームがある。どの条件でも、料理が10品より多く残る', () => {
    const index = page('/dishes/')
    const form = /<form data-dish-filter=""[^>]*>(.+?)<\/form>/.exec(index.body)![1]
    expect(form).toMatch(/<input type="search"[^>]* name="q"/)
    // しぼりこみの数字は、フォームに書いてプログラムへ渡す
    const boxes = [...form.matchAll(/<input type="checkbox"([^>]*)>/g)].map((m) => Object.fromEntries([...m[1].matchAll(/ (data-key|data-min|data-max|value)="([^"]*)"/g)].map((a) => [a[1], a[2]])))
    expect(boxes).toEqual(INDEX_FILTERS.map((f) => ({ value: f.id, 'data-key': f.key, ...(f.min === undefined ? {} : { 'data-min': String(f.min) }), ...(f.max === undefined ? {} : { 'data-max': String(f.max) }) })))
    for (const f of INDEX_FILTERS) {
      const left = indexRows.filter((r) => (f.min === undefined || r[f.key] >= f.min) && (f.max === undefined || r[f.key] <= f.max))
      expect(left.length, f.label).toBeGreaterThan(10)
      expect(left.length, f.label).toBeLessThan(indexRows.length)
    }
    expect([...form.matchAll(/<option value="([^"]*)"/g)].map((m) => m[1])).toEqual(['', 'kcal:asc', 'protein:desc', 'salt:asc', 'min:asc'])
    // プログラムを動かさない設定のブラウザでは、使えないフォームを出さない
    expect(index.body).toMatch(/<form data-dish-filter=""[^>]*class="[^"]*noscript:hidden/)
  })

  it('一覧のページは、アプリのプログラムは読まず、検索・しぼりこみの小さなプログラムだけを読む', () => {
    const out = renderDocument(TEMPLATE, page('/dishes/'))
    expect(out).not.toContain('type="module"')
    expect(out.match(/<script src="[^"]+"[^>]*>/g)).toEqual(['<script src="/dish-index.js" defer>'])
    expect(existsSync(new URL('../../public/dish-index.js', import.meta.url))).toBe(true)
    expect(renderDocument(TEMPLATE, page('/dishes/karaage/'))).not.toMatch(/<script src=/)
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

describe('このサイトについて（/about/）', () => {
  const about = page('/about/')
  const text = (html: string) => html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, '')
  const main = /<main>[\s\S]*<\/main>/.exec(about.body)![0]

  it('読みもののページ：プログラムを動かさなくても、本文が最初の HTML で読める', () => {
    expect(about.kind).toBe('static')
    expect(about.title).toBe('このサイトについて｜モグシル')
    const out = renderDocument(TEMPLATE, about)
    expect(out).not.toContain('type="module"')
    expect(out).not.toContain('読み込み中')
    expect([...about.body.matchAll(/<h1[^>]*>(.*?)<\/h1>/g)].map((m) => m[1])).toEqual(['このサイトについて'])
    expect([...main.matchAll(/<h2[^>]*>(.*?)<\/h2>/g)].map((m) => m[1])).toEqual(['モグシルとは', '運営者', '数値の確かめ方', '使うときの注意', 'プライバシー', '出典とライセンス', 'お問い合わせ'])
    expect(sitemapXml(pages)).toContain('<loc>https://mogushiru.app/about/</loc>')
  })

  it('運営者がだれかを書き、運営者のサイトとお問い合わせへ行ける', () => {
    const body = text(main)
    expect(body).toContain('モグシルは、へいてくが運営しています。へいてくは、スマートフォンアプリとWebサイトをつくる個人の開発スタジオです。')
    expect(main).toMatch(/<a href="https:\/\/heyteku\.com\/" target="_blank" rel="noopener"[^>]*>へいてく<\/a>/)
    expect(main).toMatch(/<a href="https:\/\/docs\.google\.com\/forms\/[^"]+" target="_blank" rel="noopener noreferrer"[^>]*>お問い合わせフォーム<\/a>/)
  })

  it('数値をどう作り、どう確かめているかと、読む人が自分で確かめる方法を書く', () => {
    const body = text(main)
    for (const word of ['食材', '料理', '市販品', '1日の目安', '自動のテスト', '自分で確かめるには']) expect(body, word).toContain(word)
    expect(body).toContain('成分表で測られていない成分は、0 にせず「値なし」として扱います。')
    expect(body).toContain('エネルギー・たんぱく質・脂質・炭水化物・食塩相当量の5つがそろわない商品は入れていません。')
    expect(main).toMatch(/<a href="https:\/\/fooddb\.mext\.go\.jp\/"[^>]*>食品成分データベース<\/a>/)
    expect(main).toMatch(/<a href="https:\/\/github\.com\/2heytech\/mogushiru"[^>]*>GitHub<\/a>/)
  })

  it('上の目次から、ページの中の見出しへ行ける', () => {
    const ids = [...main.matchAll(/<h2 id="([^"]+)"/g)].map((m) => m[1])
    const jumps = [...main.matchAll(/<a href="#([^"]+)"/g)].map((m) => m[1])
    expect(ids).toHaveLength(7)
    for (const id of ids) expect(jumps, id).toContain(id)
    for (const id of jumps) expect(ids, id).toContain(id)
  })

  it('どのページのフッターからも、ふつうのリンクで行ける（アプリの画面からも）', () => {
    for (const p of pages.filter((x) => x.kind === 'static')) expect(p.body, p.path).toMatch(/<footer[\s\S]*<a href="\/about\/"[^>]*>このサイトについて/)
  })
})

describe('読みもののページの「最終更新」', () => {
  const dates = { published: '2026-11-11', modified: '2026-11-18' }

  it('どの読みもののページにも、中身が最後に変わった日を出す（パンくずの横。本文の外）', () => {
    for (const p of pages.filter((x) => x.kind === 'static')) {
      const out = renderDocument(TEMPLATE, { ...p, dates })
      expect(out, p.path).toContain('最終更新：<time datetime="2026-11-18">2026年11月18日</time>')
      expect(out.indexOf('最終更新：'), p.path).toBeLessThan(out.indexOf('<main>'))
      expect(out, p.path).not.toContain('data-page-updated')
    }
  })

  it('日付のないページ（404）には出さない。アプリの画面にも出さない', () => {
    const notFound = renderDocument(TEMPLATE, NOT_FOUND_PAGE())
    expect(notFound).not.toContain('最終更新')
    expect(notFound).not.toContain('data-page-updated')
    expect(renderDocument(TEMPLATE, { ...page('/foods/'), dates })).not.toContain('最終更新')
  })

  it('日付は「2026年11月5日」の形（0 でうめない）。おかしな日付なら出さない', () => {
    const slot = '<p data-page-updated="" class="x"></p>'
    expect(withUpdatedDate(slot, '2026-11-05')).toBe('<p class="x">最終更新：<time datetime="2026-11-05">2026年11月5日</time></p>')
    expect(withUpdatedDate(slot, undefined)).toBe('')
    expect(withUpdatedDate(slot, 'きのう')).toBe('')
  })

  it('日付を入れる場所は本文（main）の外なので、日付が変わっても「中身が変わった」ことにならない', () => {
    for (const p of pages.filter((x) => x.kind === 'static')) {
      expect(p.body.match(/data-page-updated/g), p.path).toHaveLength(1)
      expect(/<main>[\s\S]*<\/main>/.exec(p.body)![0], p.path).not.toContain('data-page-updated')
    }
  })
})

describe('定番の食品のページ（/foods/natto/ など）', () => {
  const foodPages = FOOD_PAGE_IDS.map((id) => ({ id, food: catalog.foods.get(id)!, page: page(foodPagePath(id)!) }))
  const text = (html: string) => html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, '')
  const main = (p: SitePage) => /<main>[\s\S]*<\/main>/.exec(p.body)![0]

  it('定番の12食品にページがあり、検索に載せる（サイトマップに入る）', () => {
    expect(foodPages).toHaveLength(12)
    for (const { id, page: p } of foodPages) {
      expect(p, id).toBeDefined()
      expect(p.kind).toBe('static')
      expect(p.noindex).toBeUndefined()
      expect(sitemapXml(pages)).toContain(`<loc>https://mogushiru.app${p.path}</loc>`)
    }
  })

  it('タイトル・見出し・はじめの文は、その食品だけの量とカロリーからはじめる（ふだんの単位があれば1食分、なければ100g）', () => {
    const natto = page('/foods/natto/')
    expect(natto.title).toBe('納豆1パック（45g）のカロリーとたんぱく質｜モグシル')
    expect(text(/<h1[^>]*>(.*?)<\/h1>/.exec(natto.body)![1])).toBe('納豆1パック（45g）のカロリーとたんぱく質')
    expect(text(natto.body)).toContain('納豆のみなら、1パック（45g）で83kcal、たんぱく質7.4gです。100gあたりでは184kcal、たんぱく質16.5gです。')
    expect(natto.description.startsWith('納豆のみなら、1パック（45g）で83kcal、たんぱく質7.4gです。')).toBe(true)
    // 「1食分」としか言えない食品は、100gを先に答える
    const chicken = page('/foods/chicken-breast/')
    expect(chicken.title).toBe('鶏むね肉（皮なし）100gのカロリーとたんぱく質｜モグシル')
    expect(text(chicken.body)).toContain('鶏むね肉（皮なし）のみなら、100gで105kcal、たんぱく質23.3gです。1食分（80g）では84kcal、たんぱく質18.6gです。')
    // 1食分がちょうど100gの食品は、1食分だけ
    expect(page('/foods/banana/').title).toBe('バナナ1本（100g）のカロリーと炭水化物｜モグシル')
    expect(text(page('/foods/banana/').body)).not.toContain('100gあたりでは')
    for (const { food, page: p } of foodPages) {
      expect(p.title.startsWith(food.displayName), p.path).toBe(true)
      expect(p.title, p.path).toMatch(/のカロリーと(たんぱく質|炭水化物|カルシウム|ビタミンC)｜モグシル$/)
      expect(p.title.length, p.title).toBeLessThanOrEqual(40)
      expect(p.body.match(/<h1/g), p.path).toHaveLength(1)
    }
  })

  it('1食分と100gの26成分の表があり、値はアプリの「食品を調べる」と同じ計算', () => {
    for (const { id, food, page: p } of foodPages) {
      const table = /<table[\s\S]*?<\/table>/.exec(main(p))![0]
      const rows = [...table.matchAll(/<tr class="border-t[^"]*">([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => text(c[1]).trim()))
      expect(rows, p.path).toHaveLength(26)
      const serving = servingFor(food)
      const kcal = (grams: number) => String(Math.round(itemTotals({ uid: '', kind: 'food', refId: id, portion: grams }, catalog).values.energyKcal))
      const energy = rows.find((r) => r[0].startsWith('エネルギー'))!
      expect(energy[1], p.path).toBe(kcal(serving.grams))
      // 1食分が100gでない食品は、100gの列もある
      if (serving.grams !== 100) expect(energy[2], p.path).toBe(kcal(100))
      expect(energy.at(-1), p.path).toMatch(/^目安の[\d.]+%$/)
      expect(rows.find((r) => r[0].startsWith('食塩相当量'))!.at(-1), p.path).toMatch(/^上限の[\d.]+%$/)
    }
  })

  it('食品の状態と出典（成分表の名前と食品番号）を書く。近い食品と100gあたりでくらべる', () => {
    for (const { id, food, page: p } of foodPages) {
      const body = text(main(p))
      expect(body, p.path).toContain('この値について')
      expect(body, p.path).toContain(`文部科学省「日本食品標準成分表（八訂）増補2023年」の「${food.name.replace(/[　 ]+/g, ' ').trim()}」（食品番号 ${id}）`)
    }
    const chicken = text(main(page('/foods/chicken-breast/')))
    expect(chicken).toContain('皮をのぞいた、生のむね肉')
    expect(chicken).toContain('状態や種類でくらべる（100gあたり）')
    expect(chicken).toContain('鶏むね肉（皮なし・焼き）')
  })

  it('アプリへのボタン：食べた量で計算する（その食品の栄養素の窓）・この食品を1日の食事に入れる', () => {
    for (const { id, page: p } of foodPages) {
      const buttons = new Map([...main(p).matchAll(/<a href="(\/(?:foods\/)?#[^"]+)"[^>]*>(.*?)<\/a>/g)].map((m) => [text(m[2]), m[1]]))
      expect(buttons.get('食べた量で計算する'), p.path).toBe(`/foods/#food=${id}`)
      expect(buttons.get('この食品を1日の食事に入れる'), p.path).toBe(`/#add=food.${id}`)
    }
  })

  it('「食品を調べる」の最初の HTML と、ほかの食品のページ、成分のランキングの食品の名前から、ふつうのリンクでつながる', () => {
    const lookup = page('/foods/')
    const nutrientPages = pages.filter((p) => /^\/nutrients\/[a-z0-9-]+\/$/.test(p.path))
    for (const { food, page: p } of foodPages) {
      const link = `<a href="${p.path}"`
      expect(lookup.body, p.path).toContain(link)
      for (const other of foodPages) if (other.page !== p) expect(other.page.body, `${other.page.path} → ${p.path}`).toContain(link)
      // ランキングでは、食品の名前がそのままリンク
      const from = nutrientPages.filter((n) => new RegExp(`${link}[^>]*>${food.displayName.replace(/[（）]/g, '\\$&')}</a>`).test(n.body))
      expect(from.length, p.path).toBeGreaterThanOrEqual(2)
    }
    // 食品のページへのリンクは、どれも実際にあるページを指す（ページのない食品の名前は、リンクにしない）
    for (const p of pages) for (const m of p.body.matchAll(/href="(\/foods\/[a-z-]+\/)"/g)) expect(foodIdFromPath(m[1]), `${p.path} → ${m[1]}`).not.toBeNull()
  })

  it('多くとれる栄養素から成分のランキングへ、使う料理から料理のページへ行ける', () => {
    const natto = main(page('/foods/natto/'))
    expect(text(natto)).toContain('1パック（45g）で多くとれる栄養素')
    expect(natto).toMatch(/<a href="\/nutrients\/fiber\/"[^>]*>食物繊維<\/a>/)
    expect(natto).toMatch(/<a href="\/dishes\/[a-z0-9-]+\/"[^>]*>納豆ごはん<\/a>/)
    for (const { page: p } of foodPages) {
      for (const m of main(p).matchAll(/href="(\/(?:nutrients|dishes)\/[a-z0-9-]+\/)"/g)) expect(pages.some((x) => x.path === m[1]), `${p.path} → ${m[1]}`).toBe(true)
    }
  })

  it('パンくずは「モグシル › 食品を調べる › 食品の名前」。style 属性は使わない', () => {
    for (const { food, page: p } of foodPages) {
      expect(p.crumbs).toEqual([{ name: 'モグシル', path: '/' }, { name: '食品を調べる', path: '/foods/' }, { name: food.displayName }])
      expect(p.body, p.path).not.toContain('style=')
    }
    const out = renderDocument(TEMPLATE, page('/foods/natto/'))
    expect(out).toContain('"@type":"BreadcrumbList"')
    expect(out).toContain('"item":"https://mogushiru.app/foods/natto/"')
    expect(out).toContain('<meta property="og:image" content="https://mogushiru.app/og/foods-natto.png" />')
  })

  it('アプリのプログラムは読まず、「戻る」でアプリの画面にもどるための小さなプログラムだけを読む（ほかの読みもののページは何も読まない）', () => {
    const out = renderDocument(TEMPLATE, page('/foods/natto/'))
    expect(out).not.toContain('type="module"')
    expect(out.match(/<script src="[^"]+"[^>]*>/g)).toEqual(['<script src="/back-reload.js" defer>'])
    expect(existsSync(new URL('../../public/back-reload.js', import.meta.url))).toBe(true)
    // 料理の一覧だけは、検索・しぼりこみの小さなプログラムを読む
    for (const p of pages.filter((x) => x.kind === 'static')) expect(p.script, p.path).toBe(foodIdFromPath(p.path) ? '/back-reload.js' : p.path === '/dishes/' ? '/dish-index.js' : undefined)
    expect(renderDocument(TEMPLATE, page('/nutrients/iron/'))).not.toMatch(/<script src=/)
  })
})

describe('読みもののページの上のメニューと、アプリへの入口', () => {
  const reading = pages.filter((p) => p.kind === 'static')
  const header = (p: SitePage) => /<header[\s\S]*?<\/header>/.exec(p.body)?.[0] ?? ''
  // 追従するボタン（本文のあと、フッターの前。main の外）
  const sticky = (p: SitePage) => /<a href="([^"]+)"[^>]*>(.*?)<\/a>/.exec(/<\/main>([\s\S]*?)<footer/.exec(p.body)?.[1] ?? '')
  const text = (html: string) => html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, '')

  it('どのページの上にも、同じメニューがある：栄養バランスを計算する（ボタン）・食品を調べる・ランキング・献立の例・料理のカロリー・栄養', () => {
    expect(reading.length).toBeGreaterThan(290)
    for (const p of [...reading, NOT_FOUND_PAGE()]) {
      const head = header(p)
      expect(head, p.path).toContain('aria-label="サイトのメニュー"')
      expect(head, p.path).toMatch(/<a href="\/" aria-label="栄養バランスを計算する"/)
      const links = [...head.matchAll(/<li><a href="([^"]+)"[^>]*>(.*?)<\/a><\/li>/g)].map((m) => [m[1], text(m[2])])
      expect(links, p.path).toEqual([
        ['/foods/', '食品を調べる'],
        ['/nutrients/', 'ランキング'],
        ['/menus/', '献立の例'],
        ['/dishes/', '料理のカロリー・栄養'],
      ])
    }
  })

  it('いまいる場所（食品を調べる・ランキング・献立の例・料理のカロリー・栄養）に印がつく', () => {
    const current = (p: SitePage) => /<a href="([^"]+)" aria-current="true"/.exec(header(p))?.[1]
    for (const p of reading) {
      const section = /^\/(foods|nutrients|menus|dishes)\//.exec(p.path)?.[1]
      expect(current(p), p.path).toBe(section ? `/${section}/` : undefined)
    }
    expect(current(NOT_FOUND_PAGE())).toBeUndefined()
  })

  it('長いページには、画面の下に追従するボタンがある。料理のページは「この料理を1日の食事に入れる」、食品のページは「この食品を1日の食事に入れる」、ほかは「栄養バランスを計算する」', () => {
    for (const p of reading) {
      const found = sticky(p)
      expect(found, p.path).not.toBeNull()
      const id = /^\/dishes\/([a-z0-9-]+)\/$/.exec(p.path)?.[1]
      const foodId = foodIdFromPath(p.path)
      if (id) expect([found![1], text(found![2])], p.path).toEqual([`/#add=${id}`, 'この料理を1日の食事に入れる'])
      else if (foodId) expect([found![1], text(found![2])], p.path).toEqual([`/#add=food.${foodId}`, 'この食品を1日の食事に入れる'])
      else expect([found![1], text(found![2])], p.path).toEqual(['/', '栄養バランスを計算する'])
    }
    // 404 は短いので出さない
    expect(sticky(NOT_FOUND_PAGE())).toBeNull()
  })

  it('料理のページのボタンは、押すと何が起きるかを書く：1日の食事に入れる・材料と量を変える・作る人数を変える', () => {
    const p = page('/dishes/saba-misoni/')
    const main = /<main>[\s\S]*<\/main>/.exec(p.body)![0]
    const buttons = new Map([...main.matchAll(/<a href="(\/(?:customize\/)?#[^"]+)"[^>]*>(.*?)<\/a>/g)].map((m) => [text(m[2]), m[1]]))
    expect(buttons.get('この料理を1日の食事に入れる')).toBe('/#add=saba-misoni')
    expect(buttons.get('材料と量を変えて栄養を計算する')).toBe('/customize/#dish=saba-misoni')
    expect(buttons.get('作る人数を変えて見る')).toBe('/customize/#dish=saba-misoni&amp;tab=recipe')
  })

  it('アプリへのボタンに「アプリをひらく」「モグシルで開く」と書かない（何ができるかを書く）', () => {
    for (const p of [...pages, NOT_FOUND_PAGE()]) {
      for (const [, label] of p.body.matchAll(/<a [^>]*>(.*?)<\/a>/g)) expect(text(label), p.path).not.toMatch(/アプリを(ひら|開)く|モグシルで(ひら|開)く|アプリで(ひら|開)く/)
    }
  })

  it('呼び名をそろえる：「選ぶ」「献立の例」「アレンジ」と書き、「えらぶ」「献立案」「理想の献立」「カスタマイズ」は使わない', () => {
    for (const p of [...pages, NOT_FOUND_PAGE()]) {
      for (const s of [p.title, p.description, text(p.body)]) expect(s, p.path).not.toMatch(/えら[ばびぶべぼん]|献立案|理想の献立|カスタマイズ/)
    }
  })
})
