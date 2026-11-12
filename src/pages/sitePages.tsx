import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Catalog } from '../domain/nutrition'
import { NUTRIENT_GROUPS, type PriceTable } from '../domain/ranking'
import { MENU_PAGES, MENUS_INDEX_PATH, menuPagePath, NUTRIENTS_INDEX_PATH, SITE_NAME, SITE_URL, VIEW_META, VIEW_PATH, type View } from '../routes'
import { MenuGenrePage, MenusIndexPage, menusFor, planMenus } from './menuPages'
import { NUTRIENT_COPY } from './nutrientCopy'
import { NutrientPage, nutrientPageData, nutrientPageDescription, NutrientsIndexPage, type NutrientPageData } from './nutrientPages'
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
}

const html = (el: ReactElement) => renderToStaticMarkup(el)

const APP_LINKS = [
  { name: '成分が多い食品ランキング', path: NUTRIENTS_INDEX_PATH },
  { name: '栄養バランスの整う献立の例', path: MENUS_INDEX_PATH },
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

  const pages: SitePage[] = [
    appPage('menu'),
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
    },
    ...nutrients.map((d: NutrientPageData) => ({
      path: d.path,
      title: `${d.copy.heading}｜1回の量・100gあたり・1日の目安｜${SITE_NAME}`,
      description: nutrientPageDescription(d),
      kind: 'static' as const,
      body: html(<NutrientPage data={d} />),
      crumbs: [{ name: SITE_NAME, path: '/' }, { name: '成分が多い食品ランキング', path: NUTRIENTS_INDEX_PATH }, { name: NUTRIENT_COPY[d.key]!.name }],
    })),
    {
      path: MENUS_INDEX_PATH,
      title: `栄養バランスの整う1日の献立の例｜和食・中華・洋食など${menuGroups.reduce((n, g) => n + g.plans.length, 0)}種｜${SITE_NAME}`,
      description: '1日のカロリー・PFCバランス・食塩が目安に合う献立の例を、和食・中華・洋食・郷土料理などのジャンルごとにまとめました。朝・昼・晩の料理と量、カロリーつき。',
      kind: 'static',
      body: html(<MenusIndexPage groups={menuGroups} />),
      crumbs: [{ name: SITE_NAME, path: '/' }, { name: '献立の例' }],
    },
    ...menuGroups.map(({ page, plans }) => ({
      path: menuPagePath(page),
      title: `${page.heading}（${plans.length}種）｜カロリー・PFCバランスつき｜${SITE_NAME}`,
      description: `${page.lead}朝・昼・晩の料理と量、1日のカロリー・PFCバランス・食塩つき。${plans
        .slice(0, 3)
        .map((p) => p.ideal.name)
        .join('・')}など。`,
      kind: 'static' as const,
      body: html(<MenuGenrePage page={page} plans={plans} catalog={catalog} />),
      crumbs: [{ name: SITE_NAME, path: '/' }, { name: '献立の例', path: MENUS_INDEX_PATH }, { name: page.title }],
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
  if (page.crumbs && !page.noindex) {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: page.crumbs.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        ...(c.path || i === page.crumbs!.length - 1 ? { item: `${SITE_URL}${c.path ?? page.path}` } : {}),
      })),
    }
    out = replaceOnce(out, /<\/head>/, `  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>\n  </head>`)
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
