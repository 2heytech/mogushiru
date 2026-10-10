import { useMemo, useState } from 'react'
import foodNames from '../../data/food-names.json'
import type { Catalog } from '../domain/nutrition'
import {
  FOOD_GROUP_LABEL,
  RANKING_METRICS,
  RANKING_NUTRIENTS,
  dailyReference,
  rankFoods,
  type PriceTable,
  type RankingMetric,
} from '../domain/ranking'
import { matches } from '../domain/search'
import type { Targets } from '../domain/targets'
import type { NutrientKey } from '../domain/types'

const PAGE = 30

// 数字のキーは Object.entries で順番が崩れるので食品群番号で並べ直す
const FOOD_GROUPS = Object.entries(FOOD_GROUP_LABEL).sort(([a], [b]) => a.localeCompare(b))

// 表示名を付けた食材（data/food-names.json）と料理の材料を「よく使う食材」とする
function familiarFoodIds(catalog: Catalog): Set<string> {
  const ids = new Set(foodNames.displayNames.map((d) => d.id))
  for (const dish of catalog.dishes.values()) for (const ing of dish.ingredients) ids.add(ing.foodId)
  return ids
}

const fmt = (v: number) => (v >= 100 ? Math.round(v).toLocaleString() : v >= 10 ? v.toFixed(1) : v >= 1 ? v.toFixed(2) : v.toPrecision(2))

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-9 shrink-0 whitespace-nowrap rounded-full px-3 text-sm transition ${active ? 'bg-coral font-bold text-white' : 'bg-white text-ink shadow-sm'}`}
    >
      {children}
    </button>
  )
}

export function RankingView({ catalog, targets, prices }: { catalog: Catalog; targets: Targets; prices: PriceTable }) {
  const [nutrient, setNutrient] = useState<NutrientKey>('protein')
  const [metric, setMetric] = useState<RankingMetric>('serving')
  const [group, setGroup] = useState<string | null>(null)
  const [familiarOnly, setFamiliarOnly] = useState(true)
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const familiar = useMemo(() => familiarFoodIds(catalog), [catalog])
  const metrics = RANKING_METRICS.filter((m) => m.key !== 'per100yen' || prices.size > 0).filter((m) => !(m.key === 'per100kcal' && nutrient === 'energyKcal'))
  const activeMetric = metrics.some((m) => m.key === metric) ? metric : 'serving'
  const info = RANKING_NUTRIENTS.find((n) => n.key === nutrient)!
  const ref = dailyReference(nutrient, targets)

  const rows = useMemo(() => {
    const foods = [...catalog.foods.values()].filter(
      (f) => (!familiarOnly || familiar.has(f.id)) && (!query || matches(query, f.displayName, f.kana, f.name)),
    )
    return rankFoods(foods, { nutrient, metric: activeMetric, group, prices })
  }, [catalog, familiar, familiarOnly, query, nutrient, activeMetric, group, prices])

  const top = rows[0]?.value ?? 1
  const unitSuffix: Record<RankingMetric, string> = { serving: '/1回', per100g: '/100g', per100kcal: '/100kcal', per100yen: '/100円' }

  const reset = () => setLimit(PAGE)

  return (
    <section aria-labelledby="ranking-title" className="space-y-4">
      <div>
        <h2 id="ranking-title" className="text-xl font-bold">食材の栄養素ランキング</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {info.caution ? `${info.label}が多い食材です。とりすぎに気をつけたいときの目安にどうぞ。` : `${info.label}をとりやすい食材をさがせます。`}
        </p>
      </div>

      <div className="space-y-3 rounded-[var(--radius-card)] bg-white/70 p-4 shadow-sm">
        <div>
          <p className="mb-1.5 text-xs font-bold text-ink-soft">栄養素</p>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap">
            {RANKING_NUTRIENTS.map((n) => (
              <Chip key={n.key} active={n.key === nutrient} onClick={() => (setNutrient(n.key), reset())}>
                {n.label}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold text-ink-soft">くらべ方</p>
          <div className="flex flex-wrap gap-1.5">
            {metrics.map((m) => (
              <Chip key={m.key} active={m.key === activeMetric} onClick={() => (setMetric(m.key), reset())}>
                {m.label}
              </Chip>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-ink-soft">{metrics.find((m) => m.key === activeMetric)?.hint}</p>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold text-ink-soft">食品の種類</p>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap">
            <Chip active={group === null} onClick={() => (setGroup(null), reset())}>
              すべて
            </Chip>
            {FOOD_GROUPS.map(([id, label]) => (
              <Chip key={id} active={group === id} onClick={() => (setGroup(id), reset())}>
                {label}
              </Chip>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => (setQuery(e.target.value), reset())}
            placeholder="食材名でしぼる"
            aria-label="食材名でしぼる"
            className="min-h-10 min-w-0 flex-1 rounded-full bg-white px-4 text-sm shadow-sm outline-coral"
          />
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <input type="checkbox" checked={familiarOnly} onChange={(e) => (setFamiliarOnly(e.target.checked), reset())} className="h-4 w-4 accent-coral" />
            よく使う食材だけ
          </label>
        </div>
      </div>

      {activeMetric === 'serving' && (
        <p className="text-xs text-ink-soft">
          「1回の量」はアプリが決めた目安です（例：ごはん150g、焼きのり3g、しょうゆ6g）。
          {ref && `％は${ref.kind === 'max' ? '1日の上限' : '1日の目安'}（${fmt(ref.value)}${info.unit}）に対する割合です。`}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-ink-soft">条件に合う食材がありません</p>
      ) : (
        <ol className="space-y-2">
          {rows.slice(0, limit).map((r, i) => {
            const pct = ref ? (r.servingAmount / ref.value) * 100 : null
            return (
              <li key={r.food.id} className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 shadow-sm">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${i < 3 ? 'bg-coral text-white' : 'bg-cream text-ink-soft'}`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-bold" title={r.food.name.replace(/　/g, ' ')}>
                      {r.food.displayName}
                    </p>
                    <p className="shrink-0 text-sm">
                      <strong>{fmt(r.value)}</strong>
                      <span className="text-xs text-ink-soft">
                        {' '}
                        {info.unit}
                        {unitSuffix[activeMetric]}
                      </span>
                    </p>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-cream">
                    <div className={`h-full rounded-full ${info.caution ? 'bg-caution' : 'bg-ok'}`} style={{ width: `${Math.max((r.value / top) * 100, 2)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    {FOOD_GROUP_LABEL[r.food.group]}・1回 {r.serving.grams}g「{r.serving.label}」
                    {activeMetric !== 'serving' && <>で {fmt(r.servingAmount)}{info.unit}</>}
                    {pct !== null && <>・{ref?.kind === 'max' ? '上限' : '目安'}の {pct >= 10 ? Math.round(pct) : pct.toFixed(1)}%</>}
                    {r.yenPer100g !== undefined && <>・100gで約{Math.round(r.yenPer100g)}円</>}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
      {rows.length > limit && (
        <button type="button" onClick={() => setLimit(limit + PAGE)} className="min-h-11 w-full rounded-full bg-white text-sm font-bold shadow-sm">
          もっと見る（あと {rows.length - limit} 件）
        </button>
      )}
      <p className="text-xs text-ink-soft">{rows.length.toLocaleString()} 件の食材から。値は文部科学省「日本食品標準成分表（八訂）増補2023年」をもとに計算しています。{prices.size > 0 && '価格は総務省「小売物価統計調査（動向編）」2025年平均をもとに、可食部100gあたりに直したものです。'}</p>
    </section>
  )
}
