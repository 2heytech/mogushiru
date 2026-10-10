import { pfcRatio } from './nutrition'
import type { PfcKey } from './slotBalance'
import type { Range, Targets } from './targets'
import type { NutrientKey } from './types'

export type PfcGap = {
  key: PfcKey
  ratio: number // いまのエネルギー比（％）
  range: Range // 目標のエネルギー比（％）
  // 目標範囲からのずれ（％ポイント）。範囲内は 0、少なければマイナス、多ければプラス
  gap: number
  grams: number
}

const NUTRIENT: Record<PfcKey, NutrientKey> = { p: 'protein', f: 'fat', c: 'carb' }

export function pfcGaps(values: Record<NutrientKey, number>, targets: Targets): PfcGap[] | null {
  const ratio = pfcRatio(values)
  if (!ratio) return null
  return (['p', 'f', 'c'] as const).map((key) => {
    const range = targets.pfcRatio[key]
    const r = ratio[key]
    const gap = r < range.lo ? r - range.lo : r > range.hi ? r - range.hi : 0
    return { key, ratio: r, range, gap, grams: values[NUTRIENT[key]] }
  })
}

// 目標範囲のまんなかを合計100%にそろえたもの。「理想のPFCバランス」の帯に使う
export function idealPfc(targets: Targets): Record<PfcKey, number> {
  const mid = (r: Range) => (r.lo + r.hi) / 2
  const p = mid(targets.pfcRatio.p)
  const f = mid(targets.pfcRatio.f)
  const c = mid(targets.pfcRatio.c)
  const sum = p + f + c
  return { p: (p / sum) * 100, f: (f / sum) * 100, c: (c / sum) * 100 }
}

// 目標範囲とのずれを一言で。gap は％ポイント
export function gapText(gap: number): string {
  if (gap === 0) return 'ちょうどいい'
  const n = Math.round(Math.abs(gap))
  if (n === 0) return gap < 0 ? 'ほんの少し少ない' : 'ほんの少し多い'
  return gap < 0 ? `${n}% 少ない` : `${n}% 多い`
}
