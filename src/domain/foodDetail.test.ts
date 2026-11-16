import { describe, expect, it } from 'vitest'
import { CAUTION_PERCENT, detailGroups, detailHighlights, RICH_PERCENT } from './foodDetail'
import { emptyTotals } from './nutrition'
import { dailyReference } from './ranking'
import { computeTargets, DEFAULT_PROFILE } from './targets'
import type { NutrientKey, NutrientTotals } from './types'

const targets = computeTargets(DEFAULT_PROFILE)
const ref = (k: NutrientKey) => dailyReference(k, targets)!.value

// テスト用の架空の値
const totals = (values: Partial<Record<NutrientKey, number>>, missing: NutrientKey[] = []): NutrientTotals => {
  const t = emptyTotals()
  Object.assign(t.values, values)
  for (const k of missing) t.missing.add(k)
  return t
}
const rows = (t: NutrientTotals, mode: 'sum' | 'blank' | 'hide' = 'blank') => detailGroups(t, targets, mode).flatMap((g) => g.rows)
const row = (t: NutrientTotals, key: NutrientKey, mode: 'sum' | 'blank' | 'hide' = 'blank') => rows(t, mode).find((r) => r.key === key)

describe('栄養素の一覧', () => {
  it('ランキングと同じ26の成分を、種類ごとに出す', () => {
    const groups = detailGroups(totals({}), targets, 'blank')
    expect(groups.map((g) => g.label)).toEqual(['主な栄養', 'ミネラル', 'ビタミン', '脂肪酸', 'とりすぎに気をつけたい'])
    expect(groups.flatMap((g) => g.rows)).toHaveLength(26)
  })

  it('1日の目安・上限に対する割合を出す。目安のない成分（脂質など）は割合なし', () => {
    const t = totals({ iron: ref('iron') / 2, salt: ref('salt') / 4, fat: 10 })
    expect(row(t, 'iron')).toMatchObject({ amount: ref('iron') / 2, percent: 50, kind: 'target' })
    expect(row(t, 'salt')).toMatchObject({ percent: 25, kind: 'max', caution: true })
    expect(row(t, 'fat')).toMatchObject({ amount: 10, percent: null, kind: null })
  })

  it('アルコールは、入っているときだけ出す', () => {
    expect(row(totals({}), 'alcohol')).toBeUndefined()
    expect(row(totals({ alcohol: 14 }), 'alcohol')).toMatchObject({ label: 'アルコール', kind: 'max' })
  })

  it('値のない成分：食材は「値なし」（0 にしない）、市販品は行を出さない、料理は分かる分だけの量に印をつける', () => {
    const t = totals({ vitaminD: 1 }, ['vitaminD', 'caffeine'])
    expect(row(t, 'vitaminD', 'blank')).toMatchObject({ amount: null, percent: null, partial: false })
    expect(row(t, 'vitaminD', 'hide')).toBeUndefined()
    expect(rows(t, 'hide')).toHaveLength(24)
    expect(row(t, 'vitaminD', 'sum')).toMatchObject({ amount: 1, partial: true })
    expect(row(t, 'vitaminD', 'sum')!.percent).toBeGreaterThan(0)
  })

  it('成分がぜんぶない種類は、見出しごと出さない', () => {
    const t = totals({}, ['n3Fat', 'n6Fat', 'monoUnsatFat', 'polyUnsatFat'])
    expect(detailGroups(t, targets, 'hide').map((g) => g.label)).not.toContain('脂肪酸')
  })
})

describe('多くとれる成分・とりすぎに気をつけたい成分', () => {
  const highlights = (t: NutrientTotals) => {
    const h = detailHighlights(detailGroups(t, targets, 'blank'))
    return { rich: h.rich.map((r) => r.key), caution: h.caution.map((r) => r.key) }
  }

  it('1日の目安に対する割合の高い順に3つまで。しきい値に届かないものは出さない', () => {
    const at = (k: NutrientKey, percent: number) => (ref(k) * percent) / 100
    const t = totals({ iron: at('iron', 40), calcium: at('calcium', 60), vitaminC: at('vitaminC', 20), folate: at('folate', RICH_PERCENT + 1), zinc: at('zinc', RICH_PERCENT - 1) })
    expect(highlights(t).rich).toEqual(['calcium', 'iron', 'vitaminC'])
  })

  it('カロリーと n-6系脂肪酸は「多くとれる」に入れない', () => {
    const t = totals({ energyKcal: targets.energyKcal, n6Fat: ref('n6Fat') })
    expect(highlights(t).rich).toEqual([])
  })

  it('上限に対して多いもの（食塩・飽和脂肪酸など）を、とりすぎに気をつけたい成分にする', () => {
    const t = totals({ salt: (ref('salt') * (CAUTION_PERCENT + 10)) / 100, satFat: (ref('satFat') * (CAUTION_PERCENT - 1)) / 100 })
    expect(highlights(t)).toEqual({ rich: [], caution: ['salt'] })
  })
})
