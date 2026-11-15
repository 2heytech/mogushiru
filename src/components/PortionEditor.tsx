import type { Catalog } from '../domain/nutrition'
import type { MenuItem } from '../domain/types'
import { usesGrams } from './itemName'

const SERVING_STEPS = [0.5, 1, 1.5, 2]
// サプリは1回分を何回飲むか
const SUPPLEMENT_STEPS = [1, 2, 3]

// 量の変更。人前で数えるものは ½〜2人前、グラムで数えるものは数値で入れる。
// 何を決める数字か分かるように「食べる量」（飲み物は「飲む量」）と書き、いまの量を右に大きく出す
export function PortionEditor({ item, catalog, onPortion }: { item: MenuItem; catalog: Catalog; onPortion: (p: number) => void }) {
  const product = item.kind === 'product' || item.kind === 'supplement' ? catalog.products.get(item.refId) : undefined
  if (usesGrams(item, catalog)) {
    const ml = product?.basis === '100ml'
    return (
      <label className="flex items-center gap-2 text-sm">
        <span className="font-bold">{ml ? '飲む量' : '食べる量'}</span>
        <input
          type="number"
          min={1}
          step={10}
          defaultValue={Math.round(item.portion)}
          onChange={(e) => {
            const v = Number(e.target.value)
            if (v > 0) onPortion(v)
          }}
          className="min-h-11 w-24 rounded-full bg-white px-3 text-base"
        />
        {ml ? 'mL' : 'g'}
      </label>
    )
  }
  const supplement = item.kind === 'supplement'
  const unit = supplement ? '回分' : '人前'
  // 1人前の重さが分かる市販品は、合わせて何gかも出す
  const grams = !supplement && product?.servingGrams ? Math.round(product.servingGrams * item.portion) : null
  return (
    <div>
      <p className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="text-sm font-bold">{supplement ? '飲む量' : '食べる量'}</span>
        <span className="tabular-nums">
          <strong className="text-xl leading-tight">
            {Math.round(item.portion * 10) / 10}
            {unit}
          </strong>
          {grams !== null && <span className="text-sm text-ink-soft">（合計 {grams.toLocaleString()}g）</span>}
        </span>
      </p>
      <div className="flex gap-1">
        {(supplement ? SUPPLEMENT_STEPS : SERVING_STEPS).map((step) => (
          <button
            key={step}
            type="button"
            aria-pressed={item.portion === step}
            onClick={() => onPortion(step)}
            className={`min-h-11 min-w-12 flex-1 rounded-full px-3 text-sm whitespace-nowrap sm:flex-none ${item.portion === step ? 'bg-coral font-bold text-ink-strong' : 'bg-white'}`}
          >
            {step === 0.5 ? '½' : step}
            {unit}
          </button>
        ))}
      </div>
    </div>
  )
}
