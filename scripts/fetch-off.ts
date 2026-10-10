// 使い方: npx tsx scripts/fetch-off.ts
// Open Food Facts から「販売国に日本を含む商品」を取得し data/raw/off-japan.jsonl に保存する。
// 検索APIの呼び出し制限（1分あたり10回）を守るため、ページ間に待ち時間を入れる。
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs'

const FIELDS = [
  'code', 'product_name', 'product_name_ja', 'brands', 'categories_tags',
  'product_quantity_unit', 'serving_quantity', 'nutriments',
].join(',')
const PAGE_SIZE = 100
const WAIT_MS = 6500
const OUT = 'data/raw/off-japan.jsonl'
const USER_AGENT = 'Mogushiru/0.1 (https://github.com/2heytech/mogushiru)'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  mkdirSync('data/raw', { recursive: true })
  writeFileSync(OUT, '')
  let page = 1
  let total = Infinity
  while ((page - 1) * PAGE_SIZE < total) {
    const url = `https://world.openfoodfacts.org/api/v2/search?countries_tags=en%3Ajapan&fields=${FIELDS}&page_size=${PAGE_SIZE}&page=${page}`
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) throw new Error(`HTTP ${res.status} (page ${page})`)
    const body = (await res.json()) as { count: number; products: unknown[] }
    total = body.count
    appendFileSync(OUT, body.products.map((p) => JSON.stringify(p)).join('\n') + '\n')
    console.log(`page ${page}: ${body.products.length}件（全${total}件）`)
    page++
    await sleep(WAIT_MS)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
