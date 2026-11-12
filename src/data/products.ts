// 市販品のデータの組み立て（アプリの読み込みと、ビルドのときのページの書き出しの両方で使う。ブラウザの機能は使わない）
import { NUTRIENT_KEYS, type Product } from '../domain/types'

// store-products.json は書かれていない栄養素を省いているので null で補う
export function withNullNutrients(p: Product): Product {
  const nutrients = { ...p.nutrients }
  for (const k of NUTRIENT_KEYS) nutrients[k] ??= null
  return { ...p, nutrients }
}

// 公式サイトから取った商品（コンビニ各社・メーカー）を先に並べる（売り場にある商品から選びやすいように）。
// 同じJANの商品は公式サイトの値を使う。トップバリュは "topvalu-<JAN>" なので、JANの部分で同じ商品か見る。
// そのJANで保存された1日の食事も読めるよう、表示の単位が同じなら古いJANも公式の商品を指すようにする（一覧には1回だけ出す）
export function mergeProducts(official: Product[], others: Product[]): Map<string, Product> {
  const map = new Map(official.map((x) => [x.jan, x]))
  const byJan = new Map(official.flatMap((x) => (/^[a-z]+-\d{8,14}$/.test(x.jan) ? [[x.jan.split('-')[1], x] as const] : [])))
  for (const x of others) {
    if (map.has(x.jan)) continue
    const same = byJan.get(x.jan)
    map.set(x.jan, same && same.basis === x.basis ? same : x)
  }
  return map
}
