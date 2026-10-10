// 小売物価統計調査の価格を、成分表の食品の「可食部100gあたりの価格」に直す
import { cellText } from './mext'

// 小売物価統計調査（動向編）第1表の1品目（1シート）から取り出したもの
export type KouriItem = {
  code: string // 銘柄符号
  item: string // 品目
  spec: string // 銘柄
  unit: string // 単位
  medianYen: number // 年平均価格の、調査市町村の中央値
  cities: number
}

export type PriceMapItem = {
  code: string
  unit: string
  grams: number // 単位1つの重さ（g）
  foodIds: string[]
  includesRefuse?: boolean // 皮・芯・骨などを含む重さの価格
  cookedYield?: number // 調理後の食品に当てるときの重量変化（例：精白米→ごはんは2.1倍）
  note?: string
}

export type FoodPrice = { foodId: string; yenPer100g: number; item: string; code: string }

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// シートの行（ExcelJS の row.values を 0 始まりにしたもの）から品目を取り出す。
// 見出し欄は「銘柄符号：」「品目：」などのラベルの右隣、価格の行は地域コードの右の「年平均」列
export function parseKouriSheet(rows: unknown[][]): KouriItem | null {
  const meta = new Map<string, string>()
  let headerRow = -1
  let yearCol = -1
  rows.forEach((r, i) => {
    const labelIdx = r.findIndex((c) => /^(銘柄符号|品目|銘柄|単位)：$/.test(cellText(c).trim()))
    if (labelIdx >= 0) meta.set(cellText(r[labelIdx]).trim().replace('：', ''), cellText(r[labelIdx + 1]).trim())
    const y = r.findIndex((c) => cellText(c).trim() === '年平均')
    if (y >= 0 && headerRow < 0) {
      headerRow = i
      yearCol = y
    }
  })
  if (headerRow < 0 || !meta.get('銘柄符号')) return null
  const prices = rows
    .slice(headerRow + 1)
    .map((r) => r[yearCol])
    .filter((v): v is number => typeof v === 'number' && v > 0)
  if (!prices.length) return null
  return {
    code: meta.get('銘柄符号')!,
    item: meta.get('品目') ?? '',
    spec: meta.get('銘柄') ?? '',
    unit: meta.get('単位') ?? '',
    medianYen: median(prices),
    cities: prices.length,
  }
}

// 成分表の本表から食品番号 → 廃棄率（%）
export function readRefuse(rows: unknown[][]): Map<string, number> {
  const headerRow = rows.findIndex((r) => r.some((c) => cellText(c).trim() === 'REFUSE'))
  if (headerRow < 0) throw new Error('廃棄率（REFUSE）の列が見つかりません')
  const refuseCol = rows[headerRow].findIndex((c) => cellText(c).trim() === 'REFUSE')
  const idCol = rows.slice(0, headerRow + 1).reduce((found, r) => (found >= 0 ? found : r.findIndex((c) => cellText(c).replace(/\s/g, '') === '食品番号')), -1)
  const out = new Map<string, number>()
  for (const r of rows.slice(headerRow + 1)) {
    const id = cellText(r[idCol]).trim()
    const v = Number(cellText(r[refuseCol]))
    if (/^\d{5}$/.test(id) && Number.isFinite(v)) out.set(id, v)
  }
  return out
}

export function buildFoodPrices(items: KouriItem[], map: PriceMapItem[], refuse: Map<string, number>): FoodPrice[] {
  const byCode = new Map(items.map((i) => [i.code, i]))
  const out: FoodPrice[] = []
  const seen = new Set<string>()
  for (const m of map) {
    const item = byCode.get(m.code)
    if (!item) throw new Error(`価格データに銘柄符号 ${m.code} がありません`)
    if (item.unit !== m.unit) throw new Error(`銘柄符号 ${m.code} の単位が「${item.unit}」に変わっています（対応表は「${m.unit}」）`)
    for (const foodId of m.foodIds) {
      if (seen.has(foodId)) throw new Error(`食品番号 ${foodId} に価格が2つ当たっています`)
      seen.add(foodId)
      const edible = m.includesRefuse ? 1 - (refuse.get(foodId) ?? 0) / 100 : 1
      if (edible <= 0) throw new Error(`食品番号 ${foodId} の廃棄率が100%です`)
      out.push({ foodId, yenPer100g: Math.round(((item.medianYen / m.grams) * 100 * 10) / edible / (m.cookedYield ?? 1)) / 10, item: item.item, code: m.code })
    }
  }
  return out
}
