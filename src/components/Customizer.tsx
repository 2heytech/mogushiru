import { useMemo, useState } from 'react'
import { clampPortion, customDishName, formatPortion, gramStep, PORTION_MAX, PORTION_MIN, PORTION_STEP, round1, swapIngredient } from '../domain/customize'
import { ingredientsTotals, scaleTotals } from '../domain/nutrition'
import { rankAndFilter } from '../domain/search'
import type { DishSource, Food, Ingredient } from '../domain/types'

const SUGGEST_LIMIT = 8
const ADD_GRAMS = 50

function Summary({ label, kcal, p, f, c, salt }: { label: string; kcal: number; p: number; f: number; c: number; salt: number }) {
  return (
    <div className="flex-1 rounded-2xl bg-white px-3 py-2 text-center">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="text-lg font-bold tabular-nums">{Math.round(kcal)} kcal</p>
      <p className="text-xs tabular-nums text-ink-soft">
        P {p.toFixed(1)} ・ F {f.toFixed(1)} ・ C {c.toFixed(1)} ・ 食塩 {salt.toFixed(1)}g
      </p>
    </div>
  )
}

const sliderMax = (grams: number) => (grams < 10 ? Math.max(10, Math.ceil(grams * 3)) : Math.max(50, Math.ceil((grams * 3) / 10) * 10))

// 画面内の行。スライダーの上限ときざみは開いたとき（または追加したとき）の量で決め、動かしても変えない
type Row = { key: number; ing: Ingredient; max: number; step: number }
let nextKey = 0
const toRows = (xs: Ingredient[]): Row[] => xs.map((ing) => ({ key: nextKey++, ing, max: sliderMax(ing.grams), step: gramStep(ing.grams) }))

const STEP_BUTTON = 'grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream text-lg font-bold text-coral-dark hover:bg-coral/15 disabled:opacity-40'

// 人前のスライダー。0.1人前きざみで、−・＋でも1きざみずつ動かせる
function PortionSlider({ portion, onChange }: { portion: number; onChange: (p: number) => void }) {
  const max = Math.max(PORTION_MAX, portion)
  const set = (p: number) => onChange(Math.min(max, clampPortion(p)))
  return (
    <div className="rounded-2xl bg-white px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-sm font-bold">量</span>
        <button type="button" className={STEP_BUTTON} onClick={() => set(portion - PORTION_STEP)} disabled={portion <= PORTION_MIN} aria-label="0.1人前へらす">
          −
        </button>
        <input
          type="range"
          min={PORTION_MIN}
          max={max}
          step={PORTION_STEP}
          value={portion}
          onChange={(e) => set(Number(e.target.value))}
          className="min-w-0 flex-1 accent-coral"
          aria-label="何人前"
          aria-valuetext={formatPortion(portion)}
        />
        <button type="button" className={STEP_BUTTON} onClick={() => set(portion + PORTION_STEP)} disabled={portion >= max} aria-label="0.1人前ふやす">
          ＋
        </button>
        <output className="w-16 shrink-0 text-right text-base font-bold tabular-nums" aria-live="polite">
          {formatPortion(portion)}
        </output>
      </div>
      <div className="mt-1 flex justify-end gap-1">
        {[0.5, 1, 1.5, 2].map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={portion === p}
            onClick={() => set(p)}
            className={`min-h-8 rounded-full px-3 text-xs ${portion === p ? 'bg-coral font-bold text-white' : 'bg-cream'}`}
          >
            {p === 0.5 ? '½' : p}人前
          </button>
        ))}
      </div>
    </div>
  )
}

export function Customizer({
  title,
  baseName = title,
  initialName,
  original,
  initial,
  initialPortion = 1,
  source,
  foods,
  saveLabel,
  applyLabel = 'この1日の食事に反映',
  onApply,
  onSave,
  onClose,
}: {
  title: string
  // 保存名の初期値のもとになる名前（元の料理の名前）
  baseName?: string
  // 保存済みの名前（あれば人前や材料を変えても名前は自動で変えない）
  initialName?: string
  original: Ingredient[]
  initial: Ingredient[]
  initialPortion?: number
  source?: DishSource
  foods: Map<string, Food>
  saveLabel: string
  applyLabel?: string
  // 材料は1人前あたり。portion は何人前か
  onApply?: (ingredients: Ingredient[], portion: number) => void
  onSave: (name: string, ingredients: Ingredient[], portion: number) => void
  onClose: () => void
}) {
  const [rows, setRows] = useState<Row[]>(() => toRows(initial))
  const [portion, setPortion] = useState(initialPortion)
  const [query, setQuery] = useState('')
  // 名前を自分で直すまでは、人前や変えた材料に合わせて初期値を作り直す
  const [typedName, setTypedName] = useState<string | null>(initialName ?? null)

  const before = useMemo(() => ingredientsTotals(original, foods).values, [original, foods])
  const result = useMemo(() => rows.map((r) => r.ing).filter((i) => i.grams > 0), [rows])
  const after = useMemo(() => scaleTotals(ingredientsTotals(result, foods), portion).values, [result, foods, portion])
  const autoName = useMemo(
    () => customDishName(baseName, portion, original, result, (id) => foods.get(id)?.displayName ?? id),
    [baseName, portion, original, result, foods],
  )
  const name = typedName ?? autoName
  const suggestions = useMemo(
    () => (query ? rankAndFilter([...foods.values()], query, (f) => [f.displayName, f.kana, f.name]).slice(0, SUGGEST_LIMIT) : []),
    [query, foods],
  )

  const update = (key: number, f: (ing: Ingredient) => Ingredient) => setRows((xs) => xs.map((r) => (r.key === key ? { ...r, ing: f(r.ing) } : r)))
  const setGrams = (key: number, grams: number) => update(key, (x) => ({ ...x, grams: Math.max(0, round1(grams)) }))
  const remove = (key: number) => setRows((xs) => xs.filter((r) => r.key !== key))
  const add = (food: Food) => {
    setRows((xs) => [...xs, ...toRows([{ foodId: food.id, grams: ADD_GRAMS }])])
    setQuery('')
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-ink/30 md:items-center md:justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${title}を編集`}
        className="flex max-h-[92vh] w-full flex-col rounded-t-[var(--radius-card)] bg-cream p-4 shadow-xl md:max-w-2xl md:rounded-[var(--radius-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex shrink-0 items-center justify-between">
          <h2 className="text-lg font-bold">{title}を編集</h2>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full hover:bg-white" aria-label="閉じる">
            ×
          </button>
        </header>
        {source && (
          <p className="-mt-2 mb-3 shrink-0 text-xs text-ink-soft">
            {source.region && `${source.region}の郷土料理。`}
            <a href={source.url} target="_blank" rel="noreferrer" className="underline">
              {source.label}
            </a>
            のレシピを1人前に換算
          </p>
        )}
        <div className="mb-3 shrink-0">
          <PortionSlider portion={portion} onChange={setPortion} />
        </div>
        <div className="mb-3 flex shrink-0 items-center gap-2" aria-live="polite">
          <Summary label="元のレシピ（1人前）" kcal={before.energyKcal} p={before.protein} f={before.fat} c={before.carb} salt={before.salt} />
          <span aria-hidden className="text-coral">→</span>
          <Summary label={`いまの材料（${formatPortion(portion)}）`} kcal={after.energyKcal} p={after.protein} f={after.fat} c={after.carb} salt={after.salt} />
        </div>
        <p className="mb-1 shrink-0 text-xs text-ink-soft">材料の量（1人前あたり）</p>

        <ul className="-mx-1 flex-1 space-y-2 overflow-y-auto px-1">
          {rows.map(({ key, ing, max, step }) => {
            const food = foods.get(ing.foodId)
            const alternatives = [ing.foodId, ...(ing.alternatives ?? [])]
            return (
              <li key={key} className="rounded-2xl bg-white p-3">
                <div className="mb-1 flex items-center gap-2">
                  {alternatives.length > 1 ? (
                    <select
                      value={ing.foodId}
                      onChange={(e) => update(key, (x) => swapIngredient(x, e.target.value))}
                      className="min-h-10 flex-1 rounded-full bg-cream px-3 text-sm font-bold"
                      aria-label="食材を入れ替える"
                    >
                      {alternatives.map((id) => (
                        <option key={id} value={id}>
                          {foods.get(id)?.displayName ?? id}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="flex-1 text-sm font-bold">{food?.displayName ?? ing.foodId}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(key)}
                    className="grid h-10 w-10 place-items-center rounded-full text-ink-soft hover:bg-cream"
                    aria-label={`${food?.displayName ?? '材料'}を外す`}
                  >
                    🗑
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className={STEP_BUTTON} onClick={() => setGrams(key, ing.grams - step)} disabled={ing.grams <= 0} aria-label={`${step}gへらす`}>
                    −
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(max, ing.grams)}
                    step={step}
                    value={ing.grams}
                    onChange={(e) => setGrams(key, Number(e.target.value))}
                    className="min-w-0 flex-1 accent-coral"
                    aria-label={`${food?.displayName ?? '材料'}の量`}
                  />
                  <button type="button" className={STEP_BUTTON} onClick={() => setGrams(key, ing.grams + step)} aria-label={`${step}gふやす`}>
                    ＋
                  </button>
                  <label className="flex shrink-0 items-center gap-1 text-sm">
                    <input
                      type="number"
                      min={0}
                      step={step}
                      inputMode="decimal"
                      value={ing.grams}
                      onChange={(e) => setGrams(key, Number(e.target.value) || 0)}
                      className="min-h-10 w-20 rounded-full bg-cream px-3 text-right text-base tabular-nums"
                      aria-label={`${food?.displayName ?? '材料'}のグラム数`}
                    />
                    g
                  </label>
                </div>
              </li>
            )
          })}
          <li className="rounded-2xl border-2 border-dashed border-coral/50 p-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="＋ 食材を追加（例：たまご、ブロッコリー）"
              className="min-h-11 w-full rounded-full bg-white px-4 text-base outline-none focus:ring-2 focus:ring-coral"
            />
            {suggestions.length > 0 && (
              <ul className="mt-2 space-y-1">
                {suggestions.map((f) => (
                  <li key={f.id}>
                    <button type="button" onClick={() => add(f)} className="flex w-full justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-white">
                      <span>{f.displayName}</span>
                      <span className="text-ink-soft">{f.per100g.energyKcal ?? '—'} kcal/100g</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        </ul>

        <footer className="mt-3 shrink-0 space-y-2">
          <label className="flex items-center gap-2 text-sm">
            名前
            <input value={name} onChange={(e) => setTypedName(e.target.value)} className="min-h-10 min-w-0 flex-1 rounded-full bg-white px-4 text-base" />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setRows(toRows(original))
                setPortion(1)
              }}
              className="min-h-11 rounded-full bg-white px-4 text-sm"
            >
              元に戻す
            </button>
            {onApply && (
              <button
                type="button"
                disabled={result.length === 0}
                onClick={() => onApply(result, portion)}
                className="min-h-11 flex-1 rounded-full bg-white text-sm font-bold text-coral disabled:opacity-50"
              >
                {applyLabel}
              </button>
            )}
            <button
              type="button"
              disabled={result.length === 0 || !name.trim()}
              onClick={() => onSave(name.trim(), result, portion)}
              className="min-h-11 flex-1 rounded-full bg-coral text-sm font-bold text-white disabled:opacity-50"
            >
              {saveLabel}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
