// 使い方: npx tsx scripts/fetch-maff.ts [HTMLを保存するフォルダ]
// 農林水産省「うちの郷土料理」の47都道府県のレシピページを取得し、材料表を data/raw/maff-kyodo.json に書き出す
// フォルダを指定すると取得したHTMLをそこに保存し、次回はそれを使う（サイトへの負荷を避けるため）
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { MAFF_BASE, parseMaffPage, type MaffRecipe } from './lib/maff'

const TOP = 'https://www.maff.go.jp/j/keikaku/syokubunka/k_ryouri/'
const cache = process.argv[2]
if (cache) mkdirSync(cache, { recursive: true })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function get(url: string, file: string): Promise<string> {
  const path = cache ? join(cache, file) : ''
  if (path && existsSync(path)) return readFileSync(path, 'utf8')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  const text = await res.text()
  if (path) writeFileSync(path, text)
  await sleep(300)
  return text
}

const top = await get(TOP, 'top.html')
const areas = [...new Set([...top.matchAll(/search_menu\/area\/([a-z_]+)\.html/g)].map((m) => m[1]))].sort()
const ids = new Set<string>()
for (const a of areas) {
  const html = await get(`${TOP}search_menu/area/${a}.html`, `area-${a}.html`)
  for (const m of html.matchAll(/menu\/([a-z0-9_]+)\.html/g)) ids.add(m[1])
}
console.log(`都道府県 ${areas.length}、レシピ ${ids.size}件`)

const recipes: MaffRecipe[] = []
const failed: string[] = []
for (const id of [...ids].sort()) {
  const r = parseMaffPage(await get(`${MAFF_BASE}${id}.html`, `${id}.html`), id)
  if (r) recipes.push(r)
  else failed.push(id)
}
writeFileSync(
  'data/raw/maff-kyodo.json',
  JSON.stringify(
    {
      source: '農林水産省ウェブサイト「うちの郷土料理」（https://www.maff.go.jp/j/keikaku/syokubunka/k_ryouri/）を加工して作成',
      license: '公共データ利用規約 第1.0版（PDL1.0）',
      fetchedAt: new Date().toISOString().slice(0, 10),
      recipes,
    },
    null,
    1,
  ) + '\n',
)
console.log(`材料表 ${recipes.length}件を書き出しました（読めなかったページ ${failed.length}件: ${failed.join(', ')}）`)
