import { useEffect, useState } from 'react'
import type { Catalog } from '../domain/nutrition'
import { warmUpSearch } from '../domain/search'
import { NUTRIENT_KEYS, type Dish, type Food, type MyDish, type Product } from '../domain/types'

export type CatalogState =
  | { status: 'loading' }
  | {
      status: 'ready'
      catalog: Omit<Catalog, 'myDishes'>
      productCategories: Record<string, string>
      missing: string[]
      // コンビニ・メーカーの商品（store-products.json、約8MB）を読み終えたか
      storesLoaded: boolean
    }

async function loadJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

// 画面を1回描いてから動かす（先に出した画面を待たせないように）
function afterPaint(f: () => void) {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => setTimeout(f, 0))
  else setTimeout(f, 0)
}

// 料理をえらぶ画面の検索で使う名前・よみ（pickerCards.ts の fields と同じもの）
const productFields = (products: Iterable<Product>) => [...products].flatMap((x) => [x.name, x.brand])

// 生成済みの配信用JSON（public/data）を読む。まだ生成されていないファイルは空として扱う。
// コンビニ・メーカーの商品は大きいので、料理・食材などを先に出し、あとから足す（ダウンロードは同時に始める）
export function useCatalog(): CatalogState {
  const [state, setState] = useState<CatalogState>({ status: 'loading' })
  useEffect(() => {
    let alive = true
    const stops: (() => void)[] = []
    // 読み込み（ダウンロード）は今すぐ始め、中身を読むのは料理・食材の画面を出したあとにする
    const storesBlob = fetch('/data/store-products.json')
      .then((res) => (res.ok ? res.blob() : null))
      .catch(() => null)
    Promise.all([
      loadJson<{ dishes: Dish[] }>('/data/dishes.json'),
      loadJson<{ products: Product[]; categories?: Record<string, string> }>('/data/products.json'),
      loadJson<{ foods: Food[] }>('/data/foods.json'),
    ]).then(([d, p, f]) => {
      if (!alive) return
      const missing = [!d && '料理', !p && '市販品', !f && '食材'].filter((x): x is string => Boolean(x))
      const others = p?.products ?? []
      const catalog = {
        dishes: new Map((d?.dishes ?? []).map((x) => [x.id, x])),
        products: mergeProducts([], others),
        foods: new Map((f?.foods ?? []).map((x) => [x.id, x])),
      }
      setState({ status: 'ready', missing, productCategories: p?.categories ?? {}, catalog, storesLoaded: false })
      stops.push(
        warmUpSearch([
          ...[...catalog.dishes.values()].flatMap((x) => [x.name, x.kana]),
          ...[...catalog.foods.values()].flatMap((x) => [x.displayName, x.kana, x.name]),
          ...productFields(catalog.products.values()),
        ]),
      )
      afterPaint(async () => {
        const blob = await storesBlob
        let s: { products: Product[] } | null = null
        try {
          s = blob ? (JSON.parse(await blob.text()) as { products: Product[] }) : null
        } catch {
          s = null
        }
        if (!alive) return
        const official = (s?.products ?? []).map(withNullNutrients)
        setState({ status: 'ready', missing, productCategories: p?.categories ?? {}, catalog: { ...catalog, products: mergeProducts(official, others) }, storesLoaded: true })
        stops.push(warmUpSearch(productFields(official)))
      })
    })
    return () => {
      alive = false
      stops.forEach((stop) => stop())
    }
  }, [])
  return state
}

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

// ブラウザに保存したお気に入り（料理・登録した市販品）を足したカタログ
export const withMyData = (c: Omit<Catalog, 'myDishes'>, myDishes: MyDish[], myProducts: Product[]): Catalog => ({
  ...c,
  products: myProducts.length ? new Map([...c.products, ...myProducts.map((p) => [p.jan, p] as const)]) : c.products,
  myDishes: new Map(myDishes.map((d) => [d.id, d])),
})
