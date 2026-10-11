// 使い方: npx tsx scripts/build-store-products.ts
// data/raw/stores/*.json（scripts/fetch-stores.ts で取得）と data/makers/labels.json（メーカー公式サイトで確かめた表示）から、
// 配信用の public/data/store-products.json を作る
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { toMakerProduct, type MakerLabel } from './lib/makers'
import { STORES, isAmbiguousSevenItem, toStoreProduct, type StoreId, type StoreItem } from './lib/stores'

const products = []
const stores = []
for (const store of Object.keys(STORES) as StoreId[]) {
  const path = `data/raw/stores/${store}.json`
  if (!existsSync(path)) continue
  const raw = JSON.parse(readFileSync(path, 'utf8')) as { fetchedAt: string; items: StoreItem[] }
  // 地域ごとに番号の違う同じ商品（名前も栄養成分も同じもの）は1つにまとめる
  const seen = new Set<string>()
  const items = raw.items.filter((i) => {
    if (isAmbiguousSevenItem(i)) return false
    const key = JSON.stringify([i.name, i.label])
    return !seen.has(key) && seen.add(key)
  })
  products.push(...items.map(toStoreProduct))
  stores.push({ id: store, name: STORES[store].name, url: STORES[store].site, fetchedAt: raw.fetchedAt, count: items.length })
  console.log(`${STORES[store].name}: ${items.length}品（${raw.fetchedAt} 取得）`)
}

const makers = JSON.parse(readFileSync('data/makers/labels.json', 'utf8')) as { items: MakerLabel[] }
const makerProducts = makers.items.map(toMakerProduct).filter((p) => p !== null)
// 売上上位のメーカー品を先に並べる
products.unshift(...makerProducts)
// 「おすすめ」で食事に選ぶことの多いものが先に来るよう、カテゴリ順に並べる（同じカテゴリの中はメーカー品・セブン・ファミマ・ローソンの順）
const CATEGORY_ORDER = ['onigiri', 'bento', 'sandwich', 'noodle', 'bread', 'side', 'dairy', 'snack', 'dessert', 'drink', 'alcohol']
const rank = (c: string) => (CATEGORY_ORDER.includes(c) ? CATEGORY_ORDER.indexOf(c) : CATEGORY_ORDER.length)
products.sort((a, b) => rank(a.category) - rank(b.category))

console.log(`メーカー公式サイト: ${makerProducts.length}品（表示の項目が足りない ${makers.items.length - makerProducts.length}品は除外）`)

writeFileSync(
  'public/data/store-products.json',
  JSON.stringify({
    source: {
      name: 'コンビニ各社・食品メーカー各社の公式サイトの商品情報',
      processing: '商品ページの栄養成分表示から、商品名と栄養成分の数値だけを取り出して作成。商品ごとに出典URLと取得日を記録',
    },
    stores,
    products,
  }),
)
console.log(`合計 ${products.length}品を書き出しました`)
