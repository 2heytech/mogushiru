// 使い方: npx tsx scripts/fetch-off.ts
// Open Food Facts の一括データ（CSV, gzip, 約1.3GB）を読み流し、「販売国に日本を含む商品」だけを
// data/raw/off-japan.jsonl に保存する。検索APIは呼び出し制限が厳しく、混雑時は 503 が続くため使わない。
// 一括データの案内: https://world.openfoodfacts.org/data
import { createWriteStream, mkdirSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'
import type { ReadableStream } from 'node:stream/web'
import { createGunzip } from 'node:zlib'
import { csvRowToOffProduct } from './lib/off'

const URL = 'https://openfoodfacts-ds.s3.eu-west-3.amazonaws.com/en.openfoodfacts.org.products.csv.gz'
const OUT = 'data/raw/off-japan.jsonl'
const USER_AGENT = 'Mogushiru/0.1 (https://github.com/2heytech/mogushiru)'

async function main() {
  mkdirSync('data/raw', { recursive: true })
  const res = await fetch(URL, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
  const lines = createInterface({
    input: Readable.fromWeb(res.body as ReadableStream).pipe(createGunzip()),
    crlfDelay: Infinity,
  })
  const out = createWriteStream(OUT)
  let header: string[] | null = null
  let total = 0
  let kept = 0
  for await (const line of lines) {
    if (!header) {
      header = line.split('\t')
      continue
    }
    total++
    if (total % 500000 === 0) console.log(`${total}件を読み取り、日本 ${kept}件`)
    if (!line.includes('en:japan')) continue
    const cells = line.split('\t')
    const row = Object.fromEntries(header.map((h, i) => [h, cells[i] ?? '']))
    if (!row.countries_tags.split(',').includes('en:japan')) continue
    out.write(JSON.stringify(csvRowToOffProduct(row)) + '\n')
    kept++
  }
  out.end()
  console.log(`完了: 全${total}件のうち日本 ${kept}件`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
