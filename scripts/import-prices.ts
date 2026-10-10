// 使い方: npx tsx scripts/import-prices.ts [小売物価統計調査のExcelを置いたフォルダ]
// フォルダを指定すると、総務省「小売物価統計調査（動向編）」第1表（調査品目の月別価格及び年平均価格）の
// Excel から各品目の年平均価格（調査市町村の中央値）を data/raw/kouri-prices.json に書き出す。
// そのあと data/price-map.json の対応表と成分表の廃棄率で、食品ごとの可食部100gあたりの価格を
// public/data/prices.json に書き出す（フォルダを省くと data/raw/kouri-prices.json から作り直す）。
import ExcelJS from 'exceljs'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildFoodPrices, parseKouriSheet, readRefuse, type KouriItem, type PriceMapItem } from './lib/prices'

const RAW = 'data/raw/kouri-prices.json'
const YEAR = '2025年'

const SOURCE = {
  name: `総務省統計局「小売物価統計調査（動向編）」${YEAR}平均 第1表 調査品目の月別価格及び年平均価格`,
  url: 'https://www.e-stat.go.jp/stat-search/files?toukei=00200571&tstat=000000680001',
  processing:
    '都道府県庁所在市及び人口15万以上の市の年平均価格の中央値を、調査銘柄の内容量で100gあたりに直し、皮・芯などを含む品目は文部科学省「日本食品標準成分表（八訂）増補2023年」の廃棄率で可食部の価格にした',
}

async function sheets(path: string): Promise<unknown[][][]> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(path)
  return wb.worksheets.map((ws) => {
    const rows: unknown[][] = []
    ws.eachRow({ includeEmpty: true }, (row) => rows.push((row.values as unknown[]).slice(1)))
    return rows
  })
}

async function main() {
  const dir = process.argv[2]
  if (dir) {
    const items: KouriItem[] = []
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.xlsx')).sort()) {
      for (const rows of await sheets(join(dir, f))) {
        const item = parseKouriSheet(rows)
        if (item) items.push(item)
      }
    }
    writeFileSync(RAW, JSON.stringify({ year: YEAR, source: SOURCE.url, items }, null, 1) + '\n')
    console.log(`品目: ${items.length}件 → ${RAW}`)
  }
  const raw = JSON.parse(readFileSync(RAW, 'utf8')) as { items: KouriItem[] }
  const map = (JSON.parse(readFileSync('data/price-map.json', 'utf8')) as { items: PriceMapItem[] }).items
  const honpyo = (await sheets('data/raw/mext-honpyo.xlsx'))[0]
  const prices = buildFoodPrices(raw.items, map, readRefuse(honpyo))
  writeFileSync('public/data/prices.json', JSON.stringify({ source: SOURCE, prices }) + '\n')
  console.log(`食品の価格: ${prices.length}件 → public/data/prices.json`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
