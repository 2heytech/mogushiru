import { useEffect, useState } from 'react'
import type { Catalog } from '../domain/nutrition'
import type { Dish, Food, MyDish, Product } from '../domain/types'

export type CatalogState =
  | { status: 'loading' }
  | { status: 'ready'; catalog: Omit<Catalog, 'myDishes'>; productCategories: Record<string, string>; missing: string[] }

async function loadJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

// 生成済みの配信用JSON（public/data）を読む。まだ生成されていないファイルは空として扱う
export function useCatalog(): CatalogState {
  const [state, setState] = useState<CatalogState>({ status: 'loading' })
  useEffect(() => {
    let alive = true
    Promise.all([
      loadJson<{ dishes: Dish[] }>('/data/dishes.json'),
      loadJson<{ products: Product[]; categories?: Record<string, string> }>('/data/products.json'),
      loadJson<{ foods: Food[] }>('/data/foods.json'),
    ]).then(([d, p, f]) => {
      if (!alive) return
      const missing = [!d && '料理', !p && '市販品', !f && '食材'].filter((x): x is string => Boolean(x))
      setState({
        status: 'ready',
        missing,
        productCategories: p?.categories ?? {},
        catalog: {
          dishes: new Map((d?.dishes ?? []).map((x) => [x.id, x])),
          products: new Map((p?.products ?? []).map((x) => [x.jan, x])),
          foods: new Map((f?.foods ?? []).map((x) => [x.id, x])),
        },
      })
    })
    return () => {
      alive = false
    }
  }, [])
  return state
}

export const withMyDishes = (c: Omit<Catalog, 'myDishes'>, myDishes: MyDish[]): Catalog => ({
  ...c,
  myDishes: new Map(myDishes.map((d) => [d.id, d])),
})
