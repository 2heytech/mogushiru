import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Catalog } from '../domain/nutrition'
import { warmUpSearch } from '../domain/search'
import type { Dish, Food, MyDish, Product } from '../domain/types'
import { mergeProducts, withNullNutrients } from './products'

// 読み込めなかったデータの呼び名（画面の「〜のデータを読み込めませんでした」に出す）
export const STORES_DATA_NAME = 'コンビニ・メーカーの商品'

export type CatalogState =
  | { status: 'loading' }
  | {
      status: 'ready'
      catalog: Omit<Catalog, 'myDishes'>
      productCategories: Record<string, string>
      // 読み込めなかったデータ（料理・市販品・食材・コンビニ・メーカーの商品）。通信の失敗など。画面には、もう一度読み込む案内を出す
      failed: string[]
      // コンビニ・メーカーの商品（store-products.json、約8MB）を読み終えたか。読み込めなかったときも true（failed に入る）
      storesLoaded: boolean
    }

export type CatalogHandle = {
  state: CatalogState
  // コンビニ・メーカーの商品を読みはじめる（何回呼んでもよい）。使う画面をひらいたときに呼ぶ
  loadStores: () => void
  // 読み込めなかったデータを、もう一度読みにいく
  retry: () => void
  // もう一度読みにいっているあいだ true
  retrying: boolean
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// 通信がいっとき切れただけのこともあるので、少し待ってもう1回だけ試す。それでもだめなら null
export async function fetchWithRetry<T>(read: () => Promise<T | null>, tries = 2, pauseMs = 800): Promise<T | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const value = await read()
      if (value !== null) return value
    } catch {
      // 下でもう一度
    }
    if (i < tries - 1) await wait(pauseMs)
  }
  return null
}

const loadJson = <T,>(path: string): Promise<T | null> =>
  fetchWithRetry(async () => {
    const res = await fetch(path)
    return res.ok ? ((await res.json()) as T) : null
  })

// 画面を1回描いてから動かす（先に出した画面を待たせないように）
function afterPaint(f: () => void) {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => setTimeout(f, 0))
  else setTimeout(f, 0)
}

// 料理を選ぶ画面の検索で使う名前・よみ（pickerCards.ts の fields と同じもの）
const productFields = (products: Iterable<Product>) => [...products].flatMap((x) => [x.name, x.brand])

type Main = {
  catalog: Omit<Catalog, 'myDishes'>
  others: Product[]
  productCategories: Record<string, string>
  failed: string[]
}
// コンビニ・メーカーの商品：まだ読んでいない（null）・読み込めなかった・読み終えた
type Stores = null | 'failed' | Product[]

// 読み終えたデータから、画面にわたす形を作る
export function catalogState(main: Main | null, stores: Stores): CatalogState {
  if (!main) return { status: 'loading' }
  const loaded = Array.isArray(stores)
  return {
    status: 'ready',
    productCategories: main.productCategories,
    catalog: loaded ? { ...main.catalog, products: mergeProducts(stores, main.others) } : main.catalog,
    failed: stores === 'failed' ? [...main.failed, STORES_DATA_NAME] : main.failed,
    storesLoaded: stores !== null,
  }
}

// 生成済みの配信用JSON（public/data）を読む。
// コンビニ・メーカーの商品は大きい（圧縮後でも約0.8MB）ので、はじめには読まない。使う画面（1日の食事・料理を選ぶ・食品を調べる・
// 献立の例から選ぶ など）をひらいたときに loadStores() で読みはじめ、読み終えたら足す（最初の画面を見るだけの人には読ませない）。
// 読み込めなかったデータは failed に入れ、空として扱う（画面は止めない。もう一度読み込む案内を出す）
export function useCatalog(): CatalogHandle {
  const [main, setMain] = useState<Main | null>(null)
  const [stores, setStores] = useState<Stores>(null)
  const [storesWanted, setStoresWanted] = useState(false)
  // retry() で読み込みをやり直すたびに1つふえる（料理・市販品・食材と、コンビニ・メーカーの商品で別べつに）
  const [mainAttempt, setMainAttempt] = useState(0)
  const [storesAttempt, setStoresAttempt] = useState(0)
  const [retryingMain, setRetryingMain] = useState(false)
  const [retryingStores, setRetryingStores] = useState(false)

  useEffect(() => {
    let alive = true
    let stop = () => {}
    Promise.all([
      loadJson<{ dishes: Dish[] }>('/data/dishes.json'),
      loadJson<{ products: Product[]; categories?: Record<string, string> }>('/data/products.json'),
      loadJson<{ foods: Food[] }>('/data/foods.json'),
    ]).then(([d, p, f]) => {
      if (!alive) return
      const failed = [!d && '料理', !p && '市販品', !f && '食材'].filter((x): x is string => Boolean(x))
      const others = p?.products ?? []
      const catalog = {
        dishes: new Map((d?.dishes ?? []).map((x) => [x.id, x])),
        products: mergeProducts([], others),
        foods: new Map((f?.foods ?? []).map((x) => [x.id, x])),
      }
      setMain({ catalog, others, productCategories: p?.categories ?? {}, failed })
      setRetryingMain(false)
      stop = warmUpSearch([
        ...[...catalog.dishes.values()].flatMap((x) => [x.name, x.kana]),
        ...[...catalog.foods.values()].flatMap((x) => [x.displayName, x.kana, x.name]),
        ...productFields(catalog.products.values()),
      ])
    })
    return () => {
      alive = false
      stop()
    }
  }, [mainAttempt])

  // 料理・食材を読み終えてから取りにいく（同時にダウンロードすると、遅い回線では料理・食材の読み込みまで遅れる）
  const mainReady = main !== null
  useEffect(() => {
    if (!mainReady || !storesWanted) return
    let alive = true
    let stop = () => {}
    void fetchWithRetry(async () => {
      const res = await fetch('/data/store-products.json')
      return res.ok ? res.blob() : null
    }).then((blob) => {
      // 中身を読むのは、画面を出したあと
      afterPaint(async () => {
        let products: Product[] | null = null
        try {
          products = blob ? (JSON.parse(await blob.text()) as { products: Product[] }).products.map(withNullNutrients) : null
        } catch {
          products = null
        }
        if (!alive) return
        setStores(products ?? 'failed')
        setRetryingStores(false)
        if (products) stop = warmUpSearch(productFields(products))
      })
    })
    return () => {
      alive = false
      stop()
    }
  }, [mainReady, storesWanted, storesAttempt])

  const state = useMemo(() => catalogState(main, stores), [main, stores])
  const loadStores = useCallback(() => setStoresWanted(true), [])
  const mainFailed = Boolean(main && main.failed.length > 0)
  const storesFailed = stores === 'failed'
  // 読み込めなかったものだけを取りなおす（読めているものは、そのまま使う）
  const retry = useCallback(() => {
    if (mainFailed) {
      setRetryingMain(true)
      setMainAttempt((n) => n + 1)
    }
    if (storesFailed) {
      setRetryingStores(true)
      setStoresAttempt((n) => n + 1)
    }
  }, [mainFailed, storesFailed])
  return { state, loadStores, retry, retrying: retryingMain || retryingStores }
}

// ブラウザに保存したお気に入り（料理・登録した市販品）を足したカタログ
export const withMyData = (c: Omit<Catalog, 'myDishes'>, myDishes: MyDish[], myProducts: Product[]): Catalog => ({
  ...c,
  products: myProducts.length ? new Map([...c.products, ...myProducts.map((p) => [p.jan, p] as const)]) : c.products,
  myDishes: new Map(myDishes.map((d) => [d.id, d])),
})
