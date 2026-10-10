import { useEffect, useState } from 'react'
import type { PriceTable } from '../domain/ranking'

// 食材の価格（public/data/prices.json）。まだ無ければ空のまま（「100円あたり」は出さない）
export function usePrices(): PriceTable {
  const [prices, setPrices] = useState<PriceTable>(() => new Map())
  useEffect(() => {
    let alive = true
    fetch('/data/prices.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { prices: { foodId: string; yenPer100g: number; item: string }[] } | null) => {
        if (alive && json?.prices) setPrices(new Map(json.prices.map((p) => [p.foodId, { yenPer100g: p.yenPer100g, item: p.item }])))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  return prices
}
