import { useMemo, useState } from 'react'
import type { Catalog } from '../domain/nutrition'
import {
  FOOD_GROUP_LABEL,
  NUTRIENT_GROUPS,
  RANKING_METRICS,
  RANKING_NUTRIENTS,
  dailyReference,
  familiarFoodIds,
  formatAmount as fmt,
  rankFoods,
  type PriceTable,
  type RankingMetric,
} from '../domain/ranking'
import { matches } from '../domain/search'
import { SERVING_NOTE } from '../domain/serving'
import type { Targets } from '../domain/targets'
import type { NutrientKey } from '../domain/types'
import { nutrientPagePath } from '../routes'

const PAGE = 30

// 数字のキーは Object.entries で順番が崩れるので食品群番号で並べ直す
const FOOD_GROUPS = Object.entries(FOOD_GROUP_LABEL).sort(([a], [b]) => a.localeCompare(b))

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-9 shrink-0 whitespace-nowrap rounded-full px-3 text-sm transition lg:min-h-8 lg:px-2.5 lg:text-[13px] ${active ? 'bg-coral font-bold text-ink-strong' : 'bg-white text-ink shadow-sm'}`}
    >
      {children}
    </button>
  )
}

export function RankingView({
  catalog,
  targets,
  prices,
  initialNutrient = 'protein',
}: {
  catalog: Catalog
  targets: Targets
  prices: PriceTable
  initialNutrient?: NutrientKey
}) {
  const [nutrient, setNutrient] = useState<NutrientKey>(initialNutrient)
  const [metric, setMetric] = useState<RankingMetric>('serving')
  const [group, setGroup] = useState<string | null>(null)
  const [familiarOnly, setFamiliarOnly] = useState(true)
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)
  // スマホ・タブレットでは「くらべ方・種類・検索」を畳み、成分をえらんだらすぐ結果が見えるようにする（PCは常にひらく）
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [nutrientOpen, setNutrientOpen] = useState(false)

  const familiar = useMemo(() => familiarFoodIds(catalog), [catalog])
  const metrics = RANKING_METRICS.filter((m) => m.key !== 'per100yen' || prices.size > 0).filter((m) => !(m.key === 'per100kcal' && nutrient === 'energyKcal'))
  const activeMetric = metrics.some((m) => m.key === metric) ? metric : 'serving'
  const info = RANKING_NUTRIENTS.find((n) => n.key === nutrient)!
  const ref = dailyReference(nutrient, targets)
  const pagePath = nutrientPagePath(nutrient)

  const rows = useMemo(() => {
    const foods = [...catalog.foods.values()].filter(
      (f) => (!familiarOnly || familiar.has(f.id)) && (!query || matches(query, f.displayName, f.kana, f.name)),
    )
    return rankFoods(foods, { nutrient, metric: activeMetric, group, prices })
  }, [catalog, familiar, familiarOnly, query, nutrient, activeMetric, group, prices])

  const top = rows[0]?.value ?? 1
  const unitSuffix: Record<RankingMetric, string> = { serving: '/1回', per100g: '/100g', per100kcal: '/100kcal', per100yen: '/100円' }

  const reset = () => setLimit(PAGE)
  const filterSummary = [
    metrics.find((m) => m.key === activeMetric)?.label,
    group ? FOOD_GROUP_LABEL[group] : '全種類',
    query && `「${query}」`,
    !familiarOnly && 'すべての食品',
  ]
    .filter(Boolean)
    .join('・')

  return (
    <section aria-labelledby="ranking-title" className="space-y-4">
      <div>
        <h2 id="ranking-title" className="text-xl font-bold">食品成分ランキング</h2>
        <p className="mt-1 text-sm text-ink-soft">
          肉・魚・野菜・調味料などの食品（料理ではなく材料）を、成分の多い順に並べます。
          {info.caution ? `いまは${info.label}が多い食品。とりすぎに気をつけたいときの目安にどうぞ。` : `いまは${info.label}をとりやすい食品の順です。`}
          {pagePath && (
            <>
              {' '}
              <a href={pagePath} className="font-bold text-coral-ink underline decoration-coral/60 underline-offset-2">
                {info.label}の1日の目安（年齢・性別ごと）
              </a>
            </>
          )}
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start lg:gap-5">
        <div className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-white/70 p-4 shadow-sm lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto">
          <div>
            {/* スマホ・タブレット：いま選んでいる成分だけ見せ、押すと種類ごとの一覧がひらく。広い画面は左の列にいつも出す */}
            <button
              type="button"
              aria-expanded={nutrientOpen}
              aria-controls="ranking-nutrients"
              onClick={() => setNutrientOpen(!nutrientOpen)}
              className="flex min-h-11 w-full items-center gap-2 rounded-full bg-cream px-4 text-left text-sm lg:hidden"
            >
              <span className="shrink-0 font-bold">成分</span>
              <span className="min-w-0 flex-1 truncate font-bold text-coral-ink">{info.label}</span>
              <span className="shrink-0 text-xs text-ink-soft">{nutrientOpen ? 'とじる' : 'ほかの成分をえらぶ'}</span>
              <span aria-hidden className={`shrink-0 text-xs transition ${nutrientOpen ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            <p className="mb-1.5 hidden text-xs font-bold text-ink-soft lg:block">成分</p>
            <div id="ranking-nutrients" className={`space-y-2 lg:block ${nutrientOpen ? 'mt-2' : 'hidden'}`}>
              {NUTRIENT_GROUPS.map((g) => (
                <div key={g.label}>
                  <p className="mb-1 text-[12px] text-ink-soft">{g.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {g.keys.map((k) => {
                      const n = RANKING_NUTRIENTS.find((x) => x.key === k)!
                      return (
                        <Chip key={k} active={k === nutrient} onClick={() => (setNutrient(k), reset(), setNutrientOpen(false))}>
                          {n.label}
                        </Chip>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="ranking-filters"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="flex min-h-10 w-full items-center gap-2 rounded-full bg-cream px-4 text-left text-sm lg:hidden"
          >
            <span className="shrink-0 font-bold">しぼりこみ</span>
            <span className="min-w-0 flex-1 truncate text-xs text-ink-soft">{filterSummary}</span>
            <span aria-hidden className={`shrink-0 text-xs transition ${filtersOpen ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          <div id="ranking-filters" className={`space-y-3 lg:block ${filtersOpen ? '' : 'hidden'}`}>
            <div className="lg:hidden">
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
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <input
                type="search"
                value={query}
                onChange={(e) => (setQuery(e.target.value), reset())}
                placeholder="食品名でしぼる"
                aria-label="食品名でしぼる"
                className="min-h-10 min-w-40 flex-1 rounded-full bg-white px-4 text-sm shadow-sm outline-coral"
              />
              <label className="flex min-h-10 items-center gap-2 text-sm">
                <input type="checkbox" checked={familiarOnly} onChange={(e) => (setFamiliarOnly(e.target.checked), reset())} className="h-4 w-4 accent-coral" />
                よく使う食品だけ
              </label>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3 lg:mt-0">
          {/* 広い画面：くらべ方は一覧のすぐ上に */}
          <div className="hidden items-center gap-3 lg:flex">
            <p className="text-xs font-bold text-ink-soft">くらべ方</p>
            <div className="flex gap-1 rounded-full bg-white/70 p-1 shadow-sm">
              {metrics.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  aria-pressed={m.key === activeMetric}
                  onClick={() => (setMetric(m.key), reset())}
                  className={`min-h-8 rounded-full px-3.5 text-[13px] whitespace-nowrap ${m.key === activeMetric ? 'bg-coral font-bold text-ink-strong' : 'text-ink-soft hover:bg-white'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="min-w-0 flex-1 text-xs text-ink-soft">{metrics.find((m) => m.key === activeMetric)?.hint}</p>
          </div>
          {activeMetric === 'serving' && (
            <p className="text-xs text-ink-soft">
              {SERVING_NOTE}
              {ref && `％は${ref.kind === 'max' ? '1日の上限' : '1日の目安'}（${fmt(ref.value)}${info.unit}）に対する割合です。`}
            </p>
          )}

          {rows.length === 0 ? (
            <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-ink-soft">条件に合う食品がありません</p>
          ) : (
            <ol className="space-y-2">
              {rows.slice(0, limit).map((r, i) => {
                const pct = ref ? (r.servingAmount / ref.value) * 100 : null
                return (
                  <li key={r.food.id} className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 shadow-sm">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${i < 3 ? 'bg-coral text-ink-strong' : 'bg-cream text-ink-soft'}`}>{i + 1}</span>
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
          <p className="text-xs text-ink-soft">{rows.length.toLocaleString()} 件の食品から。値は文部科学省「日本食品標準成分表（八訂）増補2023年」をもとに計算しています。{prices.size > 0 && '価格は総務省「小売物価統計調査（動向編）」2025年平均をもとに、可食部100gあたりに直したものです。'}</p>
        </div>
      </div>
    </section>
  )
}
