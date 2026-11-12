// ビルド（vite build）のあとに、ページごとの HTML を dist/ に書き出す（npm run build の最後に動く）。
// - アプリの画面（/ /ranking/ /customize/ /about/）：タイトル・説明文と、最初に見える説明の字を入れた index.html
// - 読みもののページ：成分ごとのランキング（/nutrients/…）と献立の例（/menus/…）
// - 404.html と sitemap.xml
// - SNS などに貼ったときに出る画像（dist/og/…png。読みもののページごと）
// 値は public/data の配信用 JSON から計算する（アプリと同じデータ・同じ計算）
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { mergeProducts, withNullNutrients } from '../src/data/products'
import type { Catalog } from '../src/domain/nutrition'
import type { PriceTable } from '../src/domain/ranking'
import type { Dish, Food, Product } from '../src/domain/types'
import { buildSitePages, NOT_FOUND_PAGE, renderDocument, sitemapXml } from '../src/pages/sitePages'
import { renderOgPng } from './lib/ogImage'

const DIST = 'dist'
const readJson = <T,>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T

const dishes = readJson<{ dishes: Dish[] }>('public/data/dishes.json').dishes
const foods = readJson<{ foods: Food[] }>('public/data/foods.json').foods
const products = readJson<{ products: Product[] }>('public/data/products.json').products
const stores = readJson<{ products: Product[] }>('public/data/store-products.json').products
const priceRows = readJson<{ prices: { foodId: string; yenPer100g: number; item: string }[] }>('public/data/prices.json').prices

const catalog: Catalog = {
  dishes: new Map(dishes.map((d) => [d.id, d])),
  foods: new Map(foods.map((f) => [f.id, f])),
  products: mergeProducts(stores.map(withNullNutrients), products),
  myDishes: new Map(),
}
const prices: PriceTable = new Map(priceRows.map((p) => [p.foodId, { yenPer100g: p.yenPer100g, item: p.item }]))

const template = readFileSync(join(DIST, 'index.html'), 'utf8')
const pages = buildSitePages({ catalog, prices })

const write = (path: string, content: string | Uint8Array) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

for (const page of pages) write(join(DIST, page.path, 'index.html'), renderDocument(template, page))
write(join(DIST, '404.html'), renderDocument(template, NOT_FOUND_PAGE()))
write(join(DIST, 'sitemap.xml'), sitemapXml(pages))

let images = 0
for (const page of pages) {
  if (!page.og) continue
  write(join(DIST, page.og.path), await renderOgPng(page.og.card))
  images++
}

console.log(`ページを書き出しました：${pages.length} ページ＋404.html、sitemap.xml に ${pages.filter((p) => !p.noindex).length} 件、共有の画像 ${images} 枚`)
