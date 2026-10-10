// 使い方: npx tsx scripts/import-mext.ts data/raw/mext-honpyo.xlsx
// 出力: data/generated/foods.full.json（原表記つき）, public/data/foods.json（配信用）
import ExcelJS from 'exceljs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { findColumns, rowToFood } from './lib/mext'

const SOURCE = {
  name: '文部科学省「日本食品標準成分表（八訂）増補2023年」（2026年3月27日訂正反映）',
  url: 'https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html',
  processing: '食品名・単位を整形し、アプリで使う成分を抽出',
}

async function main() {
  const path = process.argv[2]
  if (!path) throw new Error('Excel ファイルのパスを指定してください')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(path)
  const sheet = wb.worksheets[0]
  const rows: unknown[][] = []
  sheet.eachRow({ includeEmpty: true }, (row) => {
    const values = row.values as unknown[]
    rows.push(values.slice(1).map((v) => (v && typeof v === 'object' && 'result' in v ? (v as { result: unknown }).result : v)))
  })
  const cols = findColumns(rows)
  const missingCols = Object.keys(cols.nutrients).length
  console.log(`成分識別子の行: ${cols.headerRow + 1} / 対応できた栄養素: ${missingCols}`)
  const foods = rows.slice(cols.headerRow + 1).map((r) => rowToFood(r, cols)).filter((f) => f !== null)
  console.log(`食品数: ${foods.length}`)

  mkdirSync('data/generated', { recursive: true })
  const fetchedAt = new Date().toISOString().slice(0, 10)
  writeFileSync('data/generated/foods.full.json', JSON.stringify({ source: SOURCE, fetchedAt, foods }, null, 1))
  const slim = foods.map(({ id, name, group, per100g, traceFlags }) => ({
    id,
    name,
    displayName: name,
    kana: '',
    group,
    per100g,
    ...(traceFlags.length ? { traceFlags } : {}),
  }))
  writeFileSync('public/data/foods.json', JSON.stringify({ source: SOURCE, foods: slim }))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
