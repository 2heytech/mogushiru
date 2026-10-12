// メーカー公式サイトの商品ページで確かめた栄養成分表示（data/makers/labels.json）をアプリの市販品にする
import { NUTRIENT_KEYS, type Nutrients, type Product } from '../../src/domain/types'
import { sodiumMgToSaltG } from '../../src/domain/nutrition'
import { alcoholVolToG } from './off'

export type MakerLabel = {
  jan: string
  name: string
  maker: string
  category: string
  url: string
  basis: string // 表示の単位（「1袋55g当たり」「100ml当たり」など、ページの書き方のまま）
  servingAmount?: number // basis の量（g・mL）。「1枚当たり」のように書かれていなければなし
  servingUnit?: 'g' | 'ml'
  containerMl?: number // 飲み物・アイスの1本（1個）の容量（売り場の商品名から）
  energyKcal: number
  protein?: number
  fat?: number
  carb?: number
  salt?: number
  sodiumMg?: number
  fiber?: number
  alcoholPercent?: number
  caffeineMg?: number
  fetchedAt: string
  note?: string
}

// 商品名の容量（「600ml」「３５０ｍｌ」「1.5L」）。1本・1缶で選べるように使う
export function containerMl(name: string): number | undefined {
  const t = name.replace(/[０-９．ｍｌＬ]/g, (c) => ({ '．': '.', 'ｍ': 'm', 'ｌ': 'l', 'Ｌ': 'L' })[c] ?? String.fromCharCode(c.charCodeAt(0) - 0xfee0))
  const ml = t.match(/(\d+(?:\.\d+)?)\s*ml/i)
  if (ml) return Number(ml[1])
  const l = t.match(/(\d+(?:\.\d+)?)\s*L/)
  return l ? Number(l[1]) * 1000 : undefined
}

// 必須の値（エネルギー・たんぱく質・脂質・炭水化物・食塩相当量）がそろわないものは null
// 量の分かる表示は100g(mL)当たりに直し、1回分の量を servingGrams にする（量を変えて選べるように）
export function toMakerProduct(l: MakerLabel): Product | null {
  const salt = l.salt ?? (l.sodiumMg !== undefined ? sodiumMgToSaltG(l.sodiumMg) : l.category === 'alcohol' ? 0 : undefined)
  if (l.protein === undefined || l.fat === undefined || l.carb === undefined || salt === undefined) return null
  const per100 = l.servingAmount !== undefined && l.servingUnit !== undefined
  const factor = per100 ? 100 / l.servingAmount! : 1
  const nutrients = {} as Nutrients
  for (const k of NUTRIENT_KEYS) nutrients[k] = null
  const scale = (v: number | undefined) => (v === undefined ? null : Number((v * factor).toPrecision(4)))
  Object.assign(nutrients, {
    energyKcal: scale(l.energyKcal),
    protein: scale(l.protein),
    fat: scale(l.fat),
    carb: scale(l.carb),
    salt: scale(salt),
    fiber: scale(l.fiber),
    caffeine: scale(l.caffeineMg),
    // ビールの度数（% vol）は100mL当たりの純アルコール量に。お酒以外は 0
    alcohol: l.alcoholPercent !== undefined && l.servingUnit === 'ml' ? alcoholVolToG(l.alcoholPercent) : l.category === 'alcohol' ? null : 0,
  })
  const base = {
    jan: l.jan,
    name: l.name,
    brand: l.maker,
    category: l.category,
    nutrients,
    source: { name: l.maker, url: l.url, fetchedAt: l.fetchedAt },
  }
  if (!per100) return { ...base, basis: 'serving', servingLabel: l.basis.replace(/当[たり]+|あたり|（.*?）/g, '').trim() }
  // 飲み物・アイスは1本（1個）の容量、ほかは表示の量（100g当たりの表示なら100g）を1回分にする
  // 1Lの牛乳のような大きな容器は1回に飲む量ではないので、容量は600mLまでの食べきり・飲みきりのものだけ使う
  const container = l.containerMl ?? containerMl(l.name)
  const amount = l.servingAmount === 100 ? undefined : l.servingAmount
  const servingGrams = l.servingUnit === 'ml' ? (container && container <= 600 ? container : amount) : amount
  return {
    ...base,
    basis: l.servingUnit === 'ml' ? '100ml' : '100g',
    ...(servingGrams && servingGrams <= 2000 ? { servingGrams } : {}),
  }
}
