// 使い方: npx tsx scripts/import-mext.ts data/raw/mext-honpyo.xlsx [data/raw/mext-fattyacid-1.xlsx]
// 2つ目は脂肪酸成分表の第1表（可食部100g当たり）。指定すると飽和・一価不飽和・多価不飽和・n-3系・n-6系脂肪酸を足す。
// 表示名・検索語は data/food-names.json と形態素解析（kuromoji）のよみで付ける。
// 出力: data/generated/foods.full.json（原表記つき）, public/data/foods.json（配信用）
import ExcelJS from 'exceljs'
import kuromoji from 'kuromoji'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { makeDisplayName, synonymTerms, toHiragana, type FoodNames } from './lib/food-names'
import { applyFattyAcids, FOOD_GROUPS, findColumns, readFattyAcids, rowToFood } from './lib/mext'

const SOURCE = {
  name: '文部科学省「日本食品標準成分表（八訂）増補2023年」本表・脂肪酸成分表編（2026年3月27日訂正反映）',
  url: 'https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html',
  processing:
    '食品名・単位を整形し、アプリで使う成分を抽出。アルコールの「-」は含まないものとして 0、脂肪酸成分表にない食品の脂肪酸は脂質が 0 なら 0 として扱う',
}

async function readRows(path: string): Promise<unknown[][]> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(path)
  const rows: unknown[][] = []
  wb.worksheets[0].eachRow({ includeEmpty: true }, (row) => rows.push((row.values as unknown[]).slice(1)))
  return rows
}

function buildTokenizer(): Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>> {
  const dicPath = join(dirname(createRequire(import.meta.url).resolve('kuromoji/package.json')), 'dict')
  return new Promise((resolve, reject) =>
    kuromoji.builder({ dicPath }).build((err, t) => (err ? reject(err) : resolve(t))),
  )
}

async function main() {
  const [path, fattyAcidPath] = process.argv.slice(2)
  if (!path) throw new Error('Excel ファイルのパスを指定してください')
  const rows = await readRows(path)
  const cols = findColumns(rows)
  console.log(`成分識別子の行: ${cols.headerRow + 1} / 対応できた栄養素: ${Object.keys(cols.nutrients).length}`)
  let foods = rows.slice(cols.headerRow + 1).map((r) => rowToFood(r, cols)).filter((f) => f !== null)
  console.log(`食品数: ${foods.length}`)
  const unknownGroups = [...new Set(foods.map((f) => f.group))].filter((g) => !(g in FOOD_GROUPS))
  if (unknownGroups.length) throw new Error(`未知の食品群: ${unknownGroups.join(', ')}`)

  if (fattyAcidPath) {
    const fattyAcids = readFattyAcids(await readRows(fattyAcidPath))
    foods = foods.map((f) => applyFattyAcids(f, fattyAcids))
    const filled = foods.filter((f) => f.per100g.satFat !== null).length
    console.log(`脂肪酸: 脂肪酸成分表 ${fattyAcids.size}件 → 値あり ${filled}件`)
  }

  const names = JSON.parse(readFileSync('data/food-names.json', 'utf8')) as FoodNames
  const displayNames = new Map(names.displayNames.map((d) => [d.id, d.name]))
  const unknownIds = [...displayNames.keys()].filter((id) => !foods.some((f) => f.id === id))
  if (unknownIds.length) throw new Error(`food-names.json に存在しない食品番号: ${unknownIds.join(', ')}`)
  const tokenizer = await buildTokenizer()
  const reading = (s: string) =>
    toHiragana(tokenizer.tokenize(s).map((t) => (t.reading && t.reading !== '*' ? t.reading : t.surface_form)).join(''))

  mkdirSync('data/generated', { recursive: true })
  const fetchedAt = new Date().toISOString().slice(0, 10)
  writeFileSync('data/generated/foods.full.json', JSON.stringify({ source: SOURCE, fetchedAt, foods }, null, 1))
  const slim = foods.map(({ id, name, group, per100g, traceFlags }) => {
    const plain = makeDisplayName(name)
    const displayName = displayNames.get(id) ?? plain
    // 検索語：よみ（空白区切りの語ごと）と同義語。表示名・原名に既にある語は省く
    const words = [...plain.split(' '), ...displayName.split(/[\s（）]+/)].filter(Boolean)
    // 辞書にない語は漢字が残るので、よみとしては使わない
    const readings = words.map(reading).filter((w) => !/[\u4e00-\u9fff]/u.test(w))
    const kana = [...new Set([...readings, ...synonymTerms(name, group, names.synonyms)])]
      .filter((w) => !plain.includes(w) && !displayName.includes(w))
      // 検索は空白を詰めて部分一致するので、語の境目をまたいだ一致（「かじつ なま」→「つな」）が起きないよう / で区切る
      .join('/')
    return { id, name, displayName, kana, group, per100g, ...(traceFlags.length ? { traceFlags } : {}) }
  })
  mkdirSync('public/data', { recursive: true })
  // 表示名を整えたよく使う食品を先に並べ、検索結果の上に出す
  const byId = new Map(slim.map((f) => [f.id, f]))
  const curated = [...displayNames.keys()].map((id) => byId.get(id)!)
  const rest = slim.filter((f) => !displayNames.has(f.id))
  writeFileSync('public/data/foods.json', JSON.stringify({ source: SOURCE, groups: FOOD_GROUPS, foods: [...curated, ...rest] }))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
