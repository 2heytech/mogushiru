// 使い方: npx tsx scripts/import-off.ts [data/raw/off-japan.jsonl]
// 出力: public/data/products.json（ODbL。出典とライセンスを同梱）
import { readFileSync, writeFileSync } from 'node:fs'
import { toProduct, type OffProduct } from './lib/off'

const path = process.argv[2] ?? 'data/raw/off-japan.jsonl'
const fetchedAt = new Date().toISOString().slice(0, 10)
const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean)
const seen = new Set<string>()
const products = []
for (const line of lines) {
  const p = toProduct(JSON.parse(line) as OffProduct, fetchedAt)
  if (p && !seen.has(p.jan)) {
    seen.add(p.jan)
    products.push(p)
  }
}
const byCategory: Record<string, number> = {}
for (const p of products) byCategory[p.category] = (byCategory[p.category] ?? 0) + 1
console.log(`取得 ${lines.length}件 → 採用 ${products.length}件`, byCategory)

writeFileSync(
  'public/data/products.json',
  JSON.stringify({
    source: {
      name: 'Open Food Facts',
      url: 'https://world.openfoodfacts.org/',
      license: 'Open Database License (ODbL) v1.0 / Database Contents License (DbCL) v1.0',
      processing: '販売国に日本を含む商品から、必須の栄養5項目が揃うものを抽出・整形',
      fetchedAt,
    },
    products,
  }),
)
