// 使い方: npx tsx scripts/fetch-stores.ts [HTMLを保存するフォルダ] [seven|famima|lawson|topvalu ...]
// コンビニ3社とトップバリュ（イオンなどのスーパーのお店のブランド）の公式サイトの商品ページから栄養成分表示を読み取り、data/raw/stores/<店>.json に書き出す
// 商品の入れ替わりが速いので、何度でも取り直せるようにしている（月に1回の取り直しを想定）
// フォルダを指定すると取得したHTMLをそこに保存し、次回はそれを使う（同じ日に作り直すときにサイトへの負荷を避けるため）
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { categorize } from './lib/off'
import {
  FAMIMA_PAGES,
  LAWSON_CATEGORIES,
  SEVEN_CATEGORIES,
  STORES,
  TOPVALU_CATEGORIES,
  lawsonDetailCodes,
  parseFamimaSafety,
  parseLawsonDetail,
  parseSevenItem,
  parseTopvaluDetail,
  sevenItemCodes,
  topvaluItemCodes,
  type StoreId,
  type StoreItem,
} from './lib/stores'

const USER_AGENT = 'Mozilla/5.0 (compatible; MogushiruBot/0.1; +https://github.com/2heytech/mogushiru)'
const WAIT_MS = 1000 // 1秒に1回まで

const args = process.argv.slice(2)
const storeArgs = args.filter((a): a is StoreId => a in STORES)
const cache = args.find((a) => !(a in STORES))
const targets: StoreId[] = storeArgs.length ? storeArgs : ['seven', 'famima', 'lawson', 'topvalu']
const fetchedAt = new Date().toISOString().slice(0, 10)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function get(url: string): Promise<string | null> {
  const path = cache ? join(cache, url.replace(/^https:\/\//, '').replace(/[^a-zA-Z0-9._-]/g, '_')) : ''
  if (path && existsSync(path)) return readFileSync(path, 'utf8')
  await sleep(WAIT_MS)
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) {
    console.warn(`${url}: ${res.status}`)
    return null
  }
  const text = await res.text()
  if (path) writeFileSync(path, text)
  return text
}

async function seven(): Promise<StoreItem[]> {
  const base = 'https://www.sej.co.jp/products/a/'
  const itemCategory = new Map<string, string | null>()
  // 一覧は「/products/a/<カテゴリ>/<ページ>/l100/」か、小分類ごとの「/products/a/cat/<番号>/<ページ>/l100/」
  // （セブンプレミアムは「/products/a/7premium/cat/<番号>/…」）
  const pages = async (list: string, codes: Set<string>) => {
    for (let page = 1; page <= 30; page++) {
      const html = await get(`${base}${list}/${page}/l100/`)
      const before = codes.size
      for (const c of html ? sevenItemCodes(html) : []) codes.add(c)
      if (codes.size === before || !html?.includes(`/${list}/${page + 1}/`)) break
    }
  }
  for (const [cat, appCategory] of Object.entries(SEVEN_CATEGORIES)) {
    const top = await get(`${base}${cat}/`)
    if (!top) continue
    const codes = new Set(sevenItemCodes(top))
    if (top.includes(`/products/a/${cat}/1/l100/`)) await pages(cat, codes)
    for (const list of new Set([...top.matchAll(/\/products\/a\/((?:7premium\/)?cat\/\d+)\//g)].map((m) => m[1]))) await pages(list, codes)
    for (const c of codes) if (!itemCategory.has(c)) itemCategory.set(c, appCategory)
    console.log(`セブン-イレブン ${cat}: ${codes.size}品`)
  }
  const items: StoreItem[] = []
  for (const [code, appCategory] of itemCategory) {
    const html = await get(`${base}item/${code}/`)
    const item = html ? parseSevenItem(html, code) : null
    if (item) items.push({ ...item, category: appCategory ?? categorize([], item.name), fetchedAt })
  }
  return items
}

async function famima(): Promise<StoreItem[]> {
  const items: StoreItem[] = []
  for (const [page, appCategory] of Object.entries(FAMIMA_PAGES)) {
    const url = `https://www.family.co.jp/goods/safety/${page}.html`
    const html = await get(url)
    const found = html ? parseFamimaSafety(html, url) : []
    console.log(`ファミリーマート ${page}: ${found.length}品`)
    for (const item of found) items.push({ ...item, category: appCategory, fetchedAt })
  }
  return items
}

async function lawson(): Promise<StoreItem[]> {
  const base = 'https://www.lawson.co.jp/recommend/original/'
  const itemCategory = new Map<string, string | null>()
  for (const [cat, appCategory] of Object.entries(LAWSON_CATEGORIES)) {
    const html = await get(`${base}${cat}/`)
    const codes = html ? lawsonDetailCodes(html) : []
    for (const c of codes) if (!itemCategory.has(c)) itemCategory.set(c, appCategory)
    console.log(`ローソン ${cat}: ${codes.length}品`)
  }
  const items: StoreItem[] = []
  for (const [code, appCategory] of itemCategory) {
    const html = await get(`${base}detail/${code}.html`)
    const item = html ? parseLawsonDetail(html, code) : null
    if (item) items.push({ ...item, category: appCategory ?? categorize([], item.name), fetchedAt })
  }
  return items
}

async function topvalu(): Promise<StoreItem[]> {
  const base = 'https://www.topvalu.net/items/'
  const itemCategory = new Map<string, string | null>()
  for (const [cat, appCategory] of Object.entries(TOPVALU_CATEGORIES)) {
    const codes = new Set<string>()
    // 1ページ目はカテゴリのページ、2ページ目からは一覧（1ページ30品）
    for (let page = 1; page <= 100; page++) {
      const html = await get(page === 1 ? `${base}category/${cat}/` : `${base}list/${cat}?page=${page}&sort=Products.release_datetime&direction=desc`)
      const before = codes.size
      for (const c of html ? topvaluItemCodes(html) : []) codes.add(c)
      if (codes.size === before || !html?.includes(`page=${page + 1}&`)) break
    }
    for (const c of codes) if (!itemCategory.has(c)) itemCategory.set(c, appCategory)
    console.log(`トップバリュ ${cat}: ${codes.size}品`)
  }
  const items: StoreItem[] = []
  for (const [code, appCategory] of itemCategory) {
    const html = await get(`${base}detail/${code}/`)
    const item = html ? parseTopvaluDetail(html, code) : null
    // おにぎり・お弁当は売っていないので、名前に「おにぎり」とあるもの（おにぎりのりなど）は食材
    const byName = () => categorize([], item!.name).replace(/^(onigiri|bento)$/, 'ingredient')
    if (item) items.push({ ...item, category: appCategory ?? byName(), fetchedAt })
  }
  return items
}

if (cache) mkdirSync(cache, { recursive: true })
mkdirSync('data/raw/stores', { recursive: true })
const fetchers: Record<StoreId, () => Promise<StoreItem[]>> = { seven, famima, lawson, topvalu }
for (const store of targets) {
  const all = await fetchers[store]()
  // 同じ商品番号は最初のものだけ（地域ごとのページに同じ商品が出るため）
  const seen = new Set<string>()
  const items = all.filter((i) => !seen.has(i.code) && seen.add(i.code)).sort((a, b) => a.code.localeCompare(b.code))
  writeFileSync(
    `data/raw/stores/${store}.json`,
    JSON.stringify({ store: STORES[store].name, site: STORES[store].site, fetchedAt, items }, null, 1) + '\n',
  )
  console.log(`${STORES[store].name}: ${items.length}品を書き出しました`)
}
