// 1つの食品（食材・料理・市販品）の栄養素の一覧。「食品を調べる」で名前からさがしたときに出す
import { dailyReference, NUTRIENT_GROUPS, RANKING_NUTRIENTS } from './ranking'
import type { Targets } from './targets'
import type { NutrientKey, NutrientTotals } from './types'

export type DetailRow = {
  key: NutrientKey
  label: string
  unit: string
  // null = 値がない（成分表で未測定・商品の表示にない）。0 とは区別する
  amount: number | null
  // 料理の材料の一部に値がなく、分かる分だけを足した量
  partial: boolean
  // 1日の目安（target）か上限（max）に対する割合（％）。目安のない成分・値のない成分は null
  percent: number | null
  kind: 'target' | 'max' | null
  caution: boolean
}

export type DetailGroup = { label: string; rows: DetailRow[] }

const ALCOHOL = { key: 'alcohol', label: 'アルコール', unit: 'g', caution: true } as const

// missing（値のない成分）の扱い：
// ・sum（料理）: 材料の分かる分だけを足した量を出し、partial にする
// ・blank（食材）: 「値なし」として行は残す
// ・hide（市販品）: 表示にない成分は行ごと出さない（ほとんどの商品はカロリー・たんぱく質・脂質・炭水化物・食塩だけ）
export type MissingMode = 'sum' | 'blank' | 'hide'

export function detailGroups(totals: NutrientTotals, targets: Targets, missing: MissingMode): DetailGroup[] {
  const row = (n: { key: NutrientKey; label: string; unit: string; caution?: boolean }): DetailRow | null => {
    const lacks = totals.missing.has(n.key)
    if (lacks && missing === 'hide') return null
    const amount = lacks && missing === 'blank' ? null : totals.values[n.key]
    const ref = dailyReference(n.key, targets)
    return {
      key: n.key,
      label: n.label,
      unit: n.unit,
      amount,
      partial: lacks && missing === 'sum',
      percent: ref && amount !== null && ref.value > 0 ? (amount / ref.value) * 100 : null,
      kind: ref?.kind ?? null,
      caution: Boolean(n.caution),
    }
  }
  return NUTRIENT_GROUPS.map((g, i) => {
    const rows = g.keys.flatMap((k) => row(RANKING_NUTRIENTS.find((n) => n.key === k)!) ?? [])
    // アルコールは入っているものだけ、とりすぎに気をつけたいものの最後に出す
    if (i === NUTRIENT_GROUPS.length - 1 && totals.values.alcohol > 0) rows.push(row(ALCOHOL)!)
    return { label: g.label, rows }
  }).filter((g) => g.rows.length > 0)
}

// この量で多くとれる成分：1日の目安の RICH_PERCENT ％以上のものを、割合の高い順に RICH_MAX つまで。
// カロリーと、ふだんの食事で足りないことの少ない n-6系脂肪酸は「多くとれる」と言うものではないので入れない
export const RICH_PERCENT = 15
export const RICH_MAX = 3
const NOT_RICH: NutrientKey[] = ['energyKcal', 'n6Fat']
// この量でとりすぎに気をつけたい成分：1日の上限・目安の CAUTION_PERCENT ％以上のもの
export const CAUTION_PERCENT = 30

export function detailHighlights(groups: DetailGroup[]): { rich: DetailRow[]; caution: DetailRow[] } {
  // 料理で材料の一部に値がないもの（partial）は、分かる分だけでも多ければ出す
  const rows = groups.flatMap((g) => g.rows).filter((r) => r.percent !== null)
  const byPercent = (a: DetailRow, b: DetailRow) => b.percent! - a.percent!
  return {
    rich: rows
      .filter((r) => r.kind === 'target' && !NOT_RICH.includes(r.key) && r.percent! >= RICH_PERCENT)
      .sort(byPercent)
      .slice(0, RICH_MAX),
    caution: rows.filter((r) => r.kind === 'max' && r.percent! >= CAUTION_PERCENT).sort(byPercent),
  }
}
