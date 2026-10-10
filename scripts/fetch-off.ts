// 使い方: npx tsx scripts/fetch-off.ts
// Open Food Facts から「販売国に日本を含む商品」を取得し data/raw/off-japan.jsonl に保存する。
// 検索APIの呼び出し制限（1分あたり10回）を守るため、ページ間に待ち時間を入れる。
// v2 の検索API（/api/v2/search）は停止中のことがあるため、従来の検索（/cgi/search.pl）を使う。
// 一時的なエラー（429・5xx）は待ってから再試行する。
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

async function fetchPage(url: string, page: number): Promise<{ count: number; products: unknown[] }> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (res.ok) return (await res.json()) as { count: number; products: unknown[] }
    if (attempt >= 6 || !(res.status === 429 || res.status >= 500)) throw new Error(`HTTP ${res.status} (page ${page})`)
    const wait = WAIT_MS * 2 ** attempt
    console.log(`page ${page}: HTTP ${res.status}、${Math.round(wait / 1000)}秒後に再試行`)
    await sleep(wait)
  }
}

async function main() {
  mkdirSync('data/raw', { recursive: true })
  writeFileSync(OUT, '')
  let page = 1
  let total = Infinity
  while ((page - 1) * PAGE_SIZE < total) {
    const url =
      'https://world.openfoodfacts.org/cgi/search.pl?action=process&json=1' +
      '&tagtype_0=countries&tag_contains_0=contains&tag_0=en%3Ajapan' +
      `&fields=${FIELDS}&page_size=${PAGE_SIZE}&page=${page}`
    const body = await fetchPage(url, page)
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
