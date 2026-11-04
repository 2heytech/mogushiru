import type { Product } from './types'

// 同じ商品の箱売り（「<ケース>」「<6缶パック>」）や、地域で商品番号の違う同じ名前の商品は、
// えらぶ画面では1つにまとめる。データは消さない（保存した食事・お気に入りはそのまま使える）

// 商品名の最後の箱売り・まとめ売りの印
const PACK = /\s*[<＜(（](?:ケース|ボール|ボール販売|\d*(?:缶|食|個|本|袋)?パック|\d+缶|\d+本)[>＞)）]\s*$/

const KEYS = new WeakMap<Product, string>()

// 会社・名前（まとめ売りの印を外す）・1回分の量が同じなら同じ商品とみる
export function productGroupKey(p: Product): string {
  let key = KEYS.get(p)
  if (key === undefined) {
    const name = p.name.replace(PACK, '').replace(/\s+/g, '')
    key = [p.brand, name, p.basis, p.servingGrams ?? p.servingLabel ?? ''].join('|')
    KEYS.set(p, key)
  }
  return key
}

// 1つのまとまりから1品だけ残す（並びは最初に出てきた位置）。
// 地域で値が少しずつ違うものはカロリーが真ん中のもの、同じなら名前の短いもの（まとめ売りの印のないもの）を代表にする
export function representativeProducts(products: Product[]): Product[] {
  const groups = new Map<string, Product[]>()
  for (const p of products) {
    const key = productGroupKey(p)
    const g = groups.get(key)
    if (g) g.push(p)
    else groups.set(key, [p])
  }
  if (groups.size === products.length) return products
  return [...groups.values()].map((g) => (g.length === 1 ? g[0] : representative(g)))
}

function representative(group: Product[]): Product {
  const kcal = group.map((p) => p.nutrients.energyKcal ?? 0).sort((a, b) => a - b)
  const median = kcal[Math.floor((kcal.length - 1) / 2)]
  return group.reduce((best, p) => {
    const d = Math.abs((p.nutrients.energyKcal ?? 0) - median) - Math.abs((best.nutrients.energyKcal ?? 0) - median)
    return d < 0 || (d === 0 && p.name.length < best.name.length) ? p : best
  })
}
