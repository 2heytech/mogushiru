import type { Catalog } from '../domain/nutrition'
import type { MenuItem } from '../domain/types'
import { usesGrams } from './itemName'

const SERVING_STEPS = [0.5, 1, 1.5, 2]

// 量の変更。人前で数えるものは ½〜2人前、グラムで数えるものは数値で入れる
export function PortionEditor({ item, catalog, onPortion }: { item: MenuItem; catalog: Catalog; onPortion: (p: number) => void }) {
  if (usesGrams(item, catalog)) {
    return (
      <label className="flex items-center gap-2 text-sm">
        量
        <input
          type="number"
          min={1}
          step={10}
          defaultValue={Math.round(item.portion)}
          onChange={(e) => {
            const v = Number(e.target.value)
            if (v > 0) onPortion(v)
          }}
          className="min-h-10 w-24 rounded-full bg-white px-3 text-base"
        />
        {item.kind === 'product' && catalog.products.get(item.refId)?.basis === '100ml' ? 'mL' : 'g'}
      </label>
    )
  }
  return (
    <div className="flex gap-1">
      {SERVING_STEPS.map((step) => (
        <button
          key={step}
          type="button"
          aria-pressed={item.portion === step}
          onClick={() => onPortion(step)}
          className={`min-h-10 min-w-12 rounded-full px-3 text-sm ${item.portion === step ? 'bg-coral font-bold text-white' : 'bg-white'}`}
        >
          {step === 0.5 ? '½' : step}人前
        </button>
      ))}
    </div>
  )
}
