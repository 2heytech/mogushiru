import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Catalog } from '../domain/nutrition'
import { NUTRIENT_GROUPS, type PriceTable } from '../domain/ranking'
import type { NutrientKey } from '../domain/types'
import {
  ABOUT_PATH,
  DISHES_INDEX_PATH,
  FOOD_SLUG,
  MENU_PAGES,
  MENUS_INDEX_PATH,
  menuPagePath,
  NOINDEX_VIEWS,
  NUTRIENT_SLUG,
  NUTRIENTS_INDEX_PATH,
  POPULAR_LINKS,
  READING_LINKS,
  SITE_ALT_NAMES,
  SITE_NAME,
  SITE_URL,
  VIEW_META,
  VIEW_PATH,
  type View,
} from '../routes'
import {
  DISHES_INDEX_NAME,
  dishesIndexDescription,
  dishesIndexOgCard,
  DishesIndexPage,
  dishesIndexTitle,
  dishesItemListJsonLd,
  dishOgCard,
  DishPage,
  dishPageDescription,
  dishPagesFor,
  dishPageTitle,
  dishRecipeImages,
  dishRecipeJsonLd,
  relatedDishes,
  type RecipeImage,
} from './dishPages'
import { OPERATOR_NAME, OPERATOR_URL } from '../site'
import { ABOUT_DESCRIPTION, ABOUT_HEADING, ABOUT_OG, AboutPage, ABOUT_TITLE } from './aboutPage'
import { foodOgCard, FoodPage, foodPageDescription, foodPagesFor, foodPageTitle, FOODS_CRUMB } from './foodPages'
import { menuGenreDescription, menuGenreOgCard, menuGenreTitle, MenuGenrePage, MenusIndexPage, menusFor, menusIndexOgCard, menusIndexTitle, planMenus } from './menuPages'
import { NUTRIENT_COPY } from './nutrientCopy'
import {
  nutrientOgCard,
  NutrientPage,
  nutrientPageData,
  nutrientPageDescription,
  nutrientPageTitle,
  NUTRIENTS_INDEX_HEADING,
  NutrientsIndexPage,
  type NutrientPageData,
} from './nutrientPages'
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
  // 検索に載せない（最初の HTML に noindex を入れ、サイトマップにも入れない）。404 と、ランキングを並べ替える道具の画面（/ranking/）
  noindex?: boolean
  // このページを指す canonical を書かない（404 だけ。/ranking/ は、検索に載せなくても canonical は自分のまま）
  noCanonical?: boolean
  // 検索エンジン向けのデータ（JSON-LD）。パンくずのほかに足すもの
  jsonLd?: Record<string, unknown>[]
  // SNS などに貼ったときの画像（ページごと。scripts/prerender.tsx が card から PNG を作って path に置く）。なければサイト共通の og-image.png
  og?: { path: string; alt: string; card: OgCard }
  // レシピ用の画像（料理のページ。scripts/prerender.tsx が料理の絵から PNG を作って path に置く）
  images?: RecipeImage[]
  // このページだけが読む小さなプログラム（public に置いたファイルのパス）。読みもののページはふつう何も読まない
  script?: string
  // 公開した日と、中身が最後に変わった日（data/sitemap-lastmod.json から。scripts/prerender.tsx が入れる）。
  // 読みもののページの「最終更新」と、レシピのデータに書く
  dates?: PageDates
}

export type PageDates = { published: string; modified: string }

// 日付を書くデータの種類（schema.org）
const DATED_TYPES = new Set(['Recipe'])

// はじめのページに入れるサイトの名前。ひらがな・ローマ字の書き方も伝える（Google の「サイト名」のしくみ）
const WEBSITE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  alternateName: SITE_ALT_NAMES,
  url: `${SITE_URL}/`,
  inLanguage: 'ja',
  description: VIEW_META.menu.description,
  publisher: { '@type': 'Organization', name: OPERATOR_NAME, url: OPERATOR_URL },
}

// 食品のページが読むプログラム（public/back-reload.js）。アプリで食品の窓をひらいたまま読みこみ直したあとの「戻る」で、アプリの画面にもどれるようにする
const BACK_RELOAD_SCRIPT = '/back-reload.js'
// 料理の一覧のページが読むプログラム（public/dish-index.js）。名前の検索・しぼりこみ・並べかえ
const DISH_INDEX_SCRIPT = '/dish-index.js'

const og = (name: string, made: { card: OgCard; alt: string }): SitePage['og'] => ({ path: `/og/${name}.png`, ...made })

const html = (el: ReactElement) => renderToStaticMarkup(el)

// 成分の一覧のページの画像に名前を出す成分（よくさがされるものを1〜2行ぶん）
const OG_NUTRIENTS: NutrientKey[] = ['protein', 'fiber', 'iron', 'calcium', 'vitaminC', 'vitaminD', 'folate', 'zinc', 'salt']

// アプリの画面の最初の HTML に入れておく、読みもののページへのリンク（呼び名は routes.ts の READING_LINKS で決める）
const APP_LINKS = READING_LINKS.map(({ name, path }) => ({ name, path }))

// はじめのページには、よくさがされるページへの直リンクも入れる（最初の画面の「人気のページ」と同じ。StartChoice.tsx）
const TOP_LINKS = [...POPULAR_LINKS.map(({ name, path }) => ({ name, path })), ...APP_LINKS]

function appPage(view: View, links = APP_LINKS): SitePage {
  const meta = VIEW_META[view]
  return {
    path: VIEW_PATH[view],
    title: meta.title,
    description: meta.description,
    kind: 'app',
    body: html(<AppFallback heading={meta.heading} description={meta.description} links={links} />),
    ...(NOINDEX_VIEWS.includes(view) ? { noindex: true } : {}),
  }
}

export function buildSitePages({ catalog, prices }: { catalog: Catalog; prices: PriceTable }): SitePage[] {
  const dishes = dishPagesFor(catalog)
  // 成分のページには、その成分が多い料理を、作り方のページへのリンクつきで出す
  const nutrients = NUTRIENT_GROUPS.flatMap((g) => g.keys).flatMap((key) => nutrientPageData(key, catalog, prices, dishes) ?? [])
  const nutrientLinks = nutrients.map((d) => ({ name: d.copy.heading, path: d.path }))
  const menuGroups = MENU_PAGES.map((page) => ({ page, plans: planMenus(menusFor(page), catalog) })).filter((g) => g.plans.length > 0)
  // 献立の例のページから、作り方のページがある料理へリンクする（読む人にも検索エンジンにも、料理のページへの道がふえる）
  const dishPaths = new Map(dishes.map((d) => [d.dish.id, d.path]))
  // 定番の食品のページ。「食品を調べる」の最初の HTML からも、ふつうのリンクでつなぐ
  const foods = foodPagesFor(catalog, dishes)
  const foodLinks = foods.map((d) => ({ name: `${d.food.displayName}のカロリー・栄養`, path: d.path }))

  const pages: SitePage[] = [
    { ...appPage('menu', TOP_LINKS), jsonLd: [WEBSITE_JSON_LD] },
    appPage('foods', [...foodLinks, ...APP_LINKS]),
    ...foods.map((d) => ({
      path: d.path,
      title: foodPageTitle(d),
      description: foodPageDescription(d),
      kind: 'static' as const,
      body: html(<FoodPage data={d} others={foods.filter((o) => o !== d)} />),
      crumbs: [{ name: SITE_NAME, path: '/' }, { name: FOODS_CRUMB, path: VIEW_PATH.foods }, { name: d.food.displayName }],
      og: og(`foods-${FOOD_SLUG[d.food.id]}`, foodOgCard(d)),
      script: BACK_RELOAD_SCRIPT,
    })),
    appPage('ranking', [...APP_LINKS, ...nutrientLinks]),
    appPage('customize'),
    {
      path: ABOUT_PATH,
      title: ABOUT_TITLE,
      description: ABOUT_DESCRIPTION,
      kind: 'static',
      body: html(<AboutPage />),
      crumbs: [{ name: SITE_NAME, path: '/' }, { name: ABOUT_HEADING }],
      og: og('about', ABOUT_OG),
    },
    {
      path: NUTRIENTS_INDEX_PATH,
      // 「食品成分ランキング」でさがす人の受け皿（並べ替える道具の /ranking/ は検索に載せない）。要点は最初の区切りに入れる
      title: `${NUTRIENTS_INDEX_HEADING}｜成分別に多い食べ物（${nutrients.length}成分）｜${SITE_NAME}`,
      description: `食品成分ランキング。たんぱく質・食物繊維・鉄分・カルシウム・ビタミンなど${nutrients.length}の成分について、多く含む食べ物・食品を、1食分（ふだん1回に食べる量）と100gあたりで比較できます。野菜・果物・魚介など種類べつの上位、成分が多い料理、年齢・性別ごとの1日の摂取量の目安つき。`,
      kind: 'static',
      body: html(<NutrientsIndexPage pages={nutrients} />),
      crumbs: [{ name: SITE_NAME, path: '/' }, { name: NUTRIENTS_INDEX_HEADING }],
      og: og('nutrients', {
        card: {
          title: NUTRIENTS_INDEX_HEADING,
          sub: `${nutrients.length}の成分を、1食分・100gあたりで比較`,
          chips: OG_NUTRIENTS.flatMap((k) => NUTRIENT_COPY[k]?.name ?? []),
          icons: ['10', '11', '04', '06', '13', '07'].map((group) => `/illustrations/food-group/${group}.svg`),
        },
        alt: `${NUTRIENTS_INDEX_HEADING}。たんぱく質・食物繊維・鉄分・カルシウムなど${nutrients.length}の成分`,
      }),
    },
    ...nutrients.map((d: NutrientPageData) => ({
      path: d.path,
      title: nutrientPageTitle(d),
      description: nutrientPageDescription(d),
      kind: 'static' as const,
      body: html(<NutrientPage data={d} />),
      crumbs: [{ name: SITE_NAME, path: '/' }, { name: NUTRIENTS_INDEX_HEADING, path: NUTRIENTS_INDEX_PATH }, { name: NUTRIENT_COPY[d.key]!.name }],
      og: og(`nutrients-${NUTRIENT_SLUG[d.key]}`, nutrientOgCard(d)),
    })),
    {
      path: MENUS_INDEX_PATH,
      title: menusIndexTitle(menuGroups),
      description: '1日のカロリー・PFCバランス・食塩が目安に合う献立の例を、和食・中華・洋食・郷土料理などのジャンルごとにまとめました。朝・昼・晩の料理と量、カロリーつき。',
      kind: 'static',
      body: html(<MenusIndexPage groups={menuGroups} />),
      crumbs: [{ name: SITE_NAME, path: '/' }, { name: '献立の例' }],
      og: og('menus', menusIndexOgCard(menuGroups, catalog)),
    },
    ...menuGroups.map(({ page, plans }) => ({
      path: menuPagePath(page),
      title: menuGenreTitle(page, plans, catalog),
      description: menuGenreDescription(page, plans, catalog),
      kind: 'static' as const,
      body: html(<MenuGenrePage page={page} plans={plans} catalog={catalog} dishPaths={dishPaths} />),
      crumbs: [{ name: SITE_NAME, path: '/' }, { name: '献立の例', path: MENUS_INDEX_PATH }, { name: page.title }],
      og: og(`menus-${page.slug}`, menuGenreOgCard(page, plans, catalog)),
    })),
    {
      path: DISHES_INDEX_PATH,
      title: dishesIndexTitle(dishes),
      description: dishesIndexDescription(dishes),
      kind: 'static' as const,
      body: html(<DishesIndexPage pages={dishes} />),
      crumbs: [{ name: SITE_NAME, path: '/' }, { name: DISHES_INDEX_NAME }],
      og: og('dishes', dishesIndexOgCard(dishes)),
      jsonLd: [dishesItemListJsonLd(dishes)],
      script: DISH_INDEX_SCRIPT,
    },
    ...dishes.map((d) => ({
      path: d.path,
      title: dishPageTitle(d),
      description: dishPageDescription(d),
      kind: 'static' as const,
      body: html(<DishPage data={d} related={relatedDishes(d, dishes)} />),
      crumbs: [{ name: SITE_NAME, path: '/' }, { name: DISHES_INDEX_NAME, path: DISHES_INDEX_PATH }, { name: d.dish.name }],
      og: og(`dishes-${d.dish.id}`, dishOgCard(d)),
      images: dishRecipeImages(d),
      jsonLd: [dishRecipeJsonLd(d)],
    })),
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
  noCanonical: true,
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
  // 検索に載せないページは、最初に返す HTML に noindex を書く（プログラムであとから付けたり外したりしない）
  const robots = page.noindex ? '<meta name="robots" content="noindex" />' : ''
  if (page.noCanonical) {
    out = replaceOnce(out, /\s*<link rel="canonical" href="[^"]*"\s*\/?>/, robots && `\n    ${robots}`)
    out = replaceOnce(out, /\s*<meta property="og:url" content="[^"]*"\s*\/?>/, '')
  } else {
    out = replaceOnce(out, /<link rel="canonical" href="[^"]*"\s*\/?>/, `${robots && `${robots}\n    `}<link rel="canonical" href="${url}" />`)
    out = replaceOnce(out, /<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${url}" />`)
  }
  if (page.og) {
    out = replaceOnce(out, /<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${SITE_URL}${page.og.path}" />`)
    out = replaceOnce(out, /<meta property="og:image:alt" content="[^"]*"\s*\/?>/, `<meta property="og:image:alt" content="${escapeHtml(page.og.alt)}" />`)
  }
  // レシピのデータには、公開した日と中身が最後に変わった日を足す
  const jsonLd: Record<string, unknown>[] = (page.jsonLd ?? []).map((d) =>
    page.dates && DATED_TYPES.has(String(d['@type'])) ? { ...d, datePublished: page.dates.published, dateModified: page.dates.modified } : d,
  )
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
  const body = withUpdatedDate(page.body, page.dates?.modified)
  // 読みもののページはアプリのプログラムを読まない（見た目の CSS と書体だけ使う）
  out = out.replace(/\s*<script type="module"[^>]*><\/script>/g, '').replace(/\s*<link rel="modulepreload"[^>]*>/g, '')
  if (page.script) out = replaceOnce(out, /<\/head>/, `  <script src="${page.script}" defer></script>\n  </head>`)
  return replaceOnce(out, /<div id="root"><\/div>/, body)
}

// 読みもののページの「最終更新」（StaticLayout.tsx が置いた場所に入れる）。日付のないページ（404）では、場所ごと消す。
// 日付は、ページの中身が最後に変わった日（data/sitemap-lastmod.json。サイトマップの更新日と同じ）
const UPDATED_SLOT = /<p data-page-updated=""([^>]*)><\/p>/
export function withUpdatedDate(body: string, modified: string | undefined): string {
  const [y, m, d] = (modified ?? '').split('-').map(Number)
  if (!y || !m || !d) return body.replace(UPDATED_SLOT, '')
  return body.replace(UPDATED_SLOT, (_, attrs: string) => `<p${attrs}>最終更新：<time datetime="${modified}">${y}年${m}月${d}日</time></p>`)
}

// lastmod：ページのパス → 中身が最後に変わった日（YYYY-MM-DD）。ビルドした日ではなく、実際に変わった日を入れる
// （scripts/lib/pageLastmod.ts。日付のないページは、更新日を書かない）
export function sitemapXml(pages: SitePage[], lastmod: Record<string, string> = {}): string {
  const urls = pages
    .filter((p) => !p.noindex)
    .map((p) => `  <url>\n    <loc>${SITE_URL}${p.path}</loc>${lastmod[p.path] ? `\n    <lastmod>${lastmod[p.path]}</lastmod>` : ''}\n  </url>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}
