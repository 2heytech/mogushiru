// 最初の画面に出す「結果の例」。献立の例を1つ入れたときの結果の画面（まとめ）と同じ計算で、カロリー・PFCバランス・気になる点を出す。
// 何も押さなくても、どんな結果が見られるかが分かるようにするためのもの（押すと、その献立を入れた結果の画面がひらく）
import { computeAlerts } from './alerts'
import { missingMealSlots } from './dayProgress'
import { daySummary, type DaySummary } from './daySummary'
import { dayFoods } from './foodBalance'
import { nutrientChecks } from './nutrientChecks'
import { menuTotals, type Catalog } from './nutrition'
import { pfcGaps, type PfcGap } from './pfcGap'
import { swapIdeas } from './swaps'
import type { Targets } from './targets'
import { SLOTS, type DayMenu } from './types'

// 結果の例に使う献立の例（domain/idealMenus.ts）。コンビニ・メーカーの商品を使わない献立にする
// （最初の画面では、その商品のデータを読み込まないので。resultPreview.test.ts で確かめる）
export const SAMPLE_MENU_ID = 'washoku'

export type ResultPreview = {
  // 献立の名前と、入っている料理の数
  name: string
  count: number
  kcal: number
  targetKcal: number
  gaps: PfcGap[] | null
  // 目安の範囲内のもの・気になる点・次に試すこと（結果の画面のまとめと同じ）
  summary: DaySummary
}

export function resultPreview(name: string, menu: DayMenu, catalog: Catalog, targets: Targets): ResultPreview {
  const totals = menuTotals(menu, catalog)
  const gaps = pfcGaps(totals.day.values, targets)
  const summary = daySummary({
    totals,
    targets,
    foods: dayFoods(menu, catalog),
    alerts: computeAlerts(totals, targets),
    gaps,
    checks: nutrientChecks(totals.day, targets, undefined, totals.supplement),
    missing: missingMealSlots(menu, targets),
    hasSaltSwap: swapIdeas(menu, catalog).some((x) => x.kind === 'salt'),
  })
  return {
    name,
    count: SLOTS.reduce((n, s) => n + menu[s].length, 0),
    kcal: totals.day.values.energyKcal,
    targetKcal: targets.energyKcal,
    gaps,
    summary,
  }
}
