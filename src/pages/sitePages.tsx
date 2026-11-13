import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Catalog } from '../domain/nutrition'
import { NUTRIENT_GROUPS, type PriceTable } from '../domain/ranking'
import type { NutrientKey } from '../domain/types'
import { DISHES_INDEX_PATH, MENU_PAGES, MENUS_INDEX_PATH, menuPagePath, NUTRIENT_SLUG, NUTRIENTS_INDEX_PATH, SITE_ALT_NAMES, SITE_NAME, SITE_URL, VIEW_META, VIEW_PATH, type View } from '../routes'
import { dishesIndexOgCard, DishesIndexPage, dishOgCard, DishPage, dishPageDescription, dishPagesFor, dishPageTitle, dishRecipeJsonLd, relatedDishes } from './dishPages'
import { OPERATOR_NAME } from '../site'
import { menuGenreOgCard, MenuGenrePage, MenusIndexPage, menusFor, menusIndexOgCard, planMenus } from './menuPages'
import { NUTRIENT_COPY } from './nutrientCopy'
import { nutrientOgCard, NutrientPage, nutrientPageData, nutrientPageDescription, nutrientPageTitle, NutrientsIndexPage, type NutrientPageData } from './nutrientPages'
import type { OgCard } from './ogCard'
import { AppFallback, NotFoundPage, type Crumb } from './StaticLayout'

// ビルドのあと（scripts/prerender.tsx）に書き出すページの一覧と、その HTML の作り方。
// app: アプリの画面（プログラムを読んで動く。最初の HTML にはその画面の説明だけを入れておく）
// static: 読みもののページ（プログラムは読まない）

export type SitePage = {
  path: string
  title: string
  description: string
  kind: 'app' | 'static'
  body: string
  crumbs?: Crumb[]
  // サイトマップに入れない（404 など）
  noindex?: boolean
  // 検索エンジン向けのデータ（JSON-LD）。パンくずのほかに足すもの
  jsonLd?: Record<string, unknown>[]
  // SNS などに貼ったときの画像（ページごと。scripts/prerender.tsx が card から PNG を作って path に置く）。なければサイト共通の og-image.png
  og?: { path: string; alt: string; card: OgCard }
}

// はじめのページに入れるサイトの名前。ひらがな・ローマ字の書き方も伝える（Google の「サイト名」のしくみ）
const WEBSITE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  alternateName: SITE_ALT_NAMES,
  url: `${SITE_URL}/`,
  inLanguage: 'ja',
  description: VIEW_META.menu.description,
  publisher: { '@type': 'Organization', name: OPERATOR_NAME },
}

const og = (name: string, made: { card: OgCard; alt: string }): SitePage['og'] => ({ path: `/og/${name}.png`, ...made })

const html = (el: ReactElement) => renderToStaticMarkup(el)

// 成分の一覧のページの画像に名前を出す成分（よくさがされるものを1〜2行ぶん）
const OG_NUTRIENTS: NutrientKey[] = ['protein', 'fiber', 'iron', 'calcium', 'vitaminC', 'vitaminD', 'folate', 'zinc', 'salt']

const APP_LINKS = [
  { name: '成分が多い食品ランキング', path: NUTRIENTS_INDEX_PATH },
  { name: '栄養バランスの整う献立の例', path: MENUS_INDEX_PATH },
  { name: '料理の作り方とカロリー・栄養', path: DISHES_INDEX_PATH },
]

function appPage(view: View, links = APP_LINKS): SitePage {
  const meta = VIEW_META[view]
  return {
    path: VIEW_PATH[view],
    title: meta.title,
    description: meta.description,
    kind: 'app',
    body: html(<AppFallback heading={meta.heading} description={meta.description} links={links} />),
  }
}

export function buildSitePages({ catalog, prices }: { catalog: Catalog; prices: PriceTable }): SitePage[] {
  const nutrients = NUTRIENT_GROUPS.flatMap((g) => g.keys).flatMap((key) => nutrientPageData(key, catalog, prices) ?? [])
  const nutrientLinks = nutrients.map((d) => ({ name: d.copy.heading, path: d.path }))
  const menuGroups = MENU_PAGES.map((page) => ({ page, plans: planMenus(menusFor(page), catalog) })).filter((g) => g.plans.length > 0)
  const dishes = dishPagesFor(catalog)

  const pages: SitePage[] = [
    { ...appPage('menu'), jsonLd: [WEBSITE_JSON_LD] },
    appPage('ranking', [...APP_LINKS, ...nutrientLinks]),
    appPage('customize'),
    appPage('about'),
    {
      path: NUTRIENTS_INDEX_PATH,
      title: `成分が多い食品ランキング｜たんぱく質・鉄分・カルシウムなど${nutrients.length}成分｜${SITE_NAME}`,
      description: `たんぱく質・食物繊維・鉄分・カルシウム・ビタミンなど${nutrients.length}の成分について、多く含む食品を1回に食べる量と100gあたりで並べました。年齢・性別ごとの1日の目安つき。`,
      kind: 'static',
      body: html(<NutrientsIndexPage pages={nutrients} />),
      crumbs: [{ name: SITE_NAME, path: '/' }, { name: '成分が多い食品ランキング' }],
      og: og('nutrients', {
        card: {
          title: '成分が多い食品ランキング',
          sub: `${nutrients.length}の成分を、1回の量・100gあたりでくらべる`,
          chips: OG_NUTRIENTS.flatMap((k) => NUTRIENT_COPY[k]?.name ?? []),
          icons: ['10', '11', '04', '06', '13', '07'].map((group) => `/illustrations/food-group/${group}.svg`),
        },
        alt: `成分が多い食品ランキング。たんぱく質・食物繊維・鉄分・カルシウムなど${nutrients.length}の成分`,
      }),
    },
    ...nutrients.map((d: NutrientPageData) => ({
      path: d.path,
      title: nutrientPageTitle(d),
      description: nutrientPageDescription(d),
      kind: 'static' as const,
      body: html(<NutrientPage data={d} />),
      crumbs: [{ name: SITE_NAME, path: '/' }, { name: '成分が多い食品ランキング', path: NUTRIENTS_INDEX_PATH }, { name: NUTRIENT_COPY[d.key]!.name }],
      og: og(`nutrients-${NUTRIENT_SLUG[d.key]}`, nutrientOgCard(d)),
    })),
    {
      path: MENUS_INDEX_PATH,
      title: `栄養バランスの整う1日の献立の例｜和食・中華・洋食など${menuGroups.reduce((n, g) => n + g.plans.length, 0)}種｜${SITE_NAME}`,
      description: '1日のカロリー・PFCバランス・食塩が目安に合う献立の例を、和食・中華・洋食・郷土料理などのジャンルごとにまとめました。朝・昼・晩の料理と量、カロリーつき。',
      kind: 'static',
      body: html(<MenusIndexPage groups={menuGroups} />),
      crumbs: [{ name: SITE_NAME, path: '/' }, { name: '献立の例' }],
      og: og('menus', menusIndexOgCard(menuGroups, catalog)),
    },
    ...menuGroups.map(({ page, plans }) => ({
      path: menuPagePath(page),
      title: page.searchTitle ? `${page.searchTitle}｜${SITE_NAME}` : `${page.heading}（${plans.length}種）｜カロリー・PFCバランスつき｜${SITE_NAME}`,
      description:
        page.description ??
        `${page.lead}朝・昼・晩の料理と量、1日のカロリー・PFCバランス・食塩つき。${plans
          .slice(0, 3)
          .map((p) => p.ideal.name)
          .join('・')}など。`,
      kind: 'static' as const,
      body: html(<MenuGenrePage page={page} plans={plans} catalog={catalog} />),
      crumbs: [{ name: SITE_NAME, path: '/' }, { name: '献立の例', path: MENUS_INDEX_PATH }, { name: page.title }],
      og: og(`menus-${page.slug}`, menuGenreOgCard(page, plans, catalog)),
    })),
    {
      path: DISHES_INDEX_PATH,
      title: `料理の作り方・レシピとカロリー・栄養（${dishes.length}品）｜${SITE_NAME}`,
      description: `肉じゃが・唐揚げ・さばの味噌煮・豚汁など、ふだんの料理${dishes.length}品の作り方を、2人分の材料と手順、1人前のカロリー・たんぱく質・食塩つきでまとめました。`,
      kind: 'static' as const,
      body: html(<DishesIndexPage pages={dishes} />),
      crumbs: [{ name: SITE_NAME, path: '/' }, { name: '料理の作り方' }],
      og: og('dishes', dishesIndexOgCard(dishes)),
    },
    ...dishes.map((d) => {
      const image = og(`dishes-${d.dish.id}`, dishOgCard(d))!
      return {
        path: d.path,
        title: dishPageTitle(d),
        description: dishPageDescription(d),
        kind: 'static' as const,
        body: html(<DishPage data={d} related={relatedDishes(d, dishes)} />),
        crumbs: [{ name: SITE_NAME, path: '/' }, { name: '料理の作り方', path: DISHES_INDEX_PATH }, { name: d.dish.name }],
        og: image,
        jsonLd: [dishRecipeJsonLd(d, image.path)],
      }
    }),
  ]
  return pages
}

export const NOT_FOUND_PAGE = (): SitePage => ({
  path: '/404.html',
  title: `ページが見つかりません｜${SITE_NAME}`,
  description: 'お探しのページは見つかりませんでした。',
  kind: 'static',
  body: html(<NotFoundPage />),
  noindex: true,
})

// ---- HTML（ビルドした index.html をひな形にして、ページごとに中身を差しかえる） ----

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function replaceOnce(src: string, pattern: RegExp, to: string): string {
  if (!pattern.test(src)) throw new Error(`index.html に ${pattern} が見つかりません（ページの書き出しに使う目印です）`)
  return src.replace(pattern, () => to)
}

export function renderDocument(template: string, page: SitePage): string {
  const url = `${SITE_URL}${page.path}`
  let out = template
  out = replaceOnce(out, /<title>[^<]*<\/title>/, `<title>${escapeHtml(page.title)}</title>`)
  out = replaceOnce(out, /<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${escapeHtml(page.description)}" />`)
  out = replaceOnce(out, /<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${escapeHtml(page.title)}" />`)
  out = replaceOnce(out, /<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${escapeHtml(page.description)}" />`)
  if (page.noindex) {
    out = replaceOnce(out, /\s*<link rel="canonical" href="[^"]*"\s*\/?>/, '\n    <meta name="robots" content="noindex" />')
    out = replaceOnce(out, /\s*<meta property="og:url" content="[^"]*"\s*\/?>/, '')
  } else {
    out = replaceOnce(out, /<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${url}" />`)
    out = replaceOnce(out, /<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${url}" />`)
  }
  if (page.og) {
    out = replaceOnce(out, /<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${SITE_URL}${page.og.path}" />`)
    out = replaceOnce(out, /<meta property="og:image:alt" content="[^"]*"\s*\/?>/, `<meta property="og:image:alt" content="${escapeHtml(page.og.alt)}" />`)
  }
  const jsonLd: Record<string, unknown>[] = [...(page.jsonLd ?? [])]
  if (page.crumbs && !page.noindex) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: page.crumbs.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        ...(c.path || i === page.crumbs!.length - 1 ? { item: `${SITE_URL}${c.path ?? page.path}` } : {}),
      })),
    })
  }
  for (const data of jsonLd) {
    out = replaceOnce(out, /<\/head>/, `  <script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>\n  </head>`)
  }
  if (page.kind === 'app') return replaceOnce(out, /<div id="root"><\/div>/, `<div id="root">${page.body}</div>`)
  // 読みもののページはアプリのプログラムを読まない（見た目の CSS と書体だけ使う）
  out = out.replace(/\s*<script type="module"[^>]*><\/script>/g, '').replace(/\s*<link rel="modulepreload"[^>]*>/g, '')
  return replaceOnce(out, /<div id="root"><\/div>/, page.body)
}

export function sitemapXml(pages: SitePage[]): string {
  const urls = pages
    .filter((p) => !p.noindex)
    .map((p) => `  <url>\n    <loc>${SITE_URL}${p.path}</loc>\n  </url>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}
