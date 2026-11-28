// ビルド（vite build）のあとに、ページごとの HTML を dist/ に書き出す（npm run build の最後に動く）。
// - アプリの画面（/ /foods/ /ranking/ /customize/）：タイトル・説明文と、最初に見える説明の字を入れた index.html
// - 読みもののページ：成分ごとのランキング（/nutrients/…）・献立の例（/menus/…）・料理（/dishes/…）・食品（/foods/…）・このサイトについて（/about/）。
//   ページの中身が最後に変わった日（最終更新）も入れる
// - どのページにも、Google アナリティクスを読みこむ1行（測定 ID があるときだけ。src/analytics.ts）
// - 404.html と sitemap.xml（更新日は、ページの中身が実際に変わった日。scripts/lib/pageLastmod.ts）
// - SNS などに貼ったときに出る画像（dist/og/…png。読みもののページごと）と、レシピ用の画像（dist/recipe-images/…png。料理ごとに3つの形）
// 値は public/data の配信用 JSON から計算する（アプリと同じデータ・同じ計算）
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { withGa } from '../src/analytics'
import { buildSitePages, NOT_FOUND_PAGE, renderDocument, sitemapXml } from '../src/pages/sitePages'
import { renderOgPng, renderRecipePng } from './lib/ogImage'
import { LASTMOD_FILE, lastmodDates, pageDates, staleLastmod, todayInJapan, type LastmodTable } from './lib/pageLastmod'
import { loadSiteInputs } from './lib/siteInputs'

const DIST = 'dist'

const { catalog, prices } = loadSiteInputs()

const template = readFileSync(join(DIST, 'index.html'), 'utf8')
// 公開した日・中身が最後に変わった日（data/sitemap-lastmod.json）を、ページに持たせる（レシピのデータに書く）
const lastmodTable = JSON.parse(readFileSync(LASTMOD_FILE, 'utf8')) as LastmodTable
const built = buildSitePages({ catalog, prices })
const dates = pageDates(built, lastmodTable, todayInJapan())
const pages = built.map((p) => (dates[p.path] ? { ...p, dates: dates[p.path] } : p))

const write = (path: string, content: string | Uint8Array) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

// どのページにも、Google アナリティクスを読みこむ1行を入れる（測定 ID があるときだけ。src/analytics.ts）
for (const page of pages) write(join(DIST, page.path, 'index.html'), withGa(renderDocument(template, page)))
write(join(DIST, '404.html'), withGa(renderDocument(template, NOT_FOUND_PAGE())))

// サイトマップの更新日は、ページの中身が実際に変わった日（data/sitemap-lastmod.json）。ビルドした日は使わない。
// 表が古いページ（テストで止まるので、ふつうは出ない）だけ、今日の日付にする
const stale = staleLastmod(pages, lastmodTable).changed
if (stale.length > 0) console.warn(`サイトマップの更新日の表が古いページが ${stale.length} 件あります（今日の日付にします）。npm run sitemap:lastmod で直してください`)
write(join(DIST, 'sitemap.xml'), sitemapXml(pages, lastmodDates(pages, lastmodTable, todayInJapan())))

let images = 0
for (const page of pages) {
  if (!page.og) continue
  write(join(DIST, page.og.path), await renderOgPng(page.og.card))
  images++
}

// レシピ用の画像は数が多いので、いくつかずつ並べて作る
const recipeImages = pages.flatMap((p) => p.images ?? [])
const RECIPE_IMAGE_BATCH = 8
for (let i = 0; i < recipeImages.length; i += RECIPE_IMAGE_BATCH) {
  await Promise.all(recipeImages.slice(i, i + RECIPE_IMAGE_BATCH).map(async (image) => write(join(DIST, image.path), await renderRecipePng(image.illustration, image.width, image.height))))
}

console.log(`ページを書き出しました：${pages.length} ページ＋404.html、sitemap.xml に ${pages.filter((p) => !p.noindex).length} 件、共有の画像 ${images} 枚、レシピ用の画像 ${recipeImages.length} 枚`)
