import { useState } from 'react'
import type { Catalog, MenuTotals } from '../domain/nutrition'
import { SLOTS, type DayMenu, type MenuItem, type Slot } from '../domain/types'
import type { Targets } from '../domain/targets'
import { SLOT_LABEL } from './labels'
import { SlotBalanceView } from './SlotBalanceView'

const SLOT_ICON: Record<Slot, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', other: '🍪' }

const SERVING_STEPS = [0.5, 1, 1.5, 2]

// 人前で数えるもの（料理・マイ料理・1食基準の市販品）と、グラムで数えるもの
function usesGrams(item: MenuItem, catalog: Catalog): boolean {
  if (item.kind === 'food') return true
  if (item.kind === 'product') return catalog.products.get(item.refId)?.basis !== 'serving'
  return false
}

function portionLabel(item: MenuItem, catalog: Catalog): string {
  if (usesGrams(item, catalog)) {
    const ml = item.kind === 'product' && catalog.products.get(item.refId)?.basis === '100ml'
    return `${Math.round(item.portion)}${ml ? 'mL' : 'g'}`
  }
  return item.portion === 1 ? '' : `×${item.portion}`
}

function PortionEditor({ item, catalog, onPortion }: { item: MenuItem; catalog: Catalog; onPortion: (p: number) => void }) {
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
          className="min-h-10 w-24 rounded-full bg-cream px-3 text-base"
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
          className={`min-h-10 min-w-12 rounded-full px-3 text-sm ${item.portion === step ? 'bg-coral font-bold text-white' : 'bg-cream'}`}
        >
          {step === 0.5 ? '½' : step}人前
        </button>
      ))}
    </div>
  )
}

function itemName(item: MenuItem, catalog: Catalog): string {
  switch (item.kind) {
    case 'dish': {
      const name = catalog.dishes.get(item.refId)?.name ?? '（不明な料理）'
      return item.customIngredients ? `${name}（アレンジ）` : name
    }
    case 'myDish':
      return catalog.myDishes.get(item.refId)?.name ?? '（削除されたマイ料理）'
    case 'product':
      return catalog.products.get(item.refId)?.name ?? '（不明な市販品）'
    case 'food':
      return catalog.foods.get(item.refId)?.displayName ?? '（不明な食材）'
  }
}

export function SlotBoard({
  menu,
  totals,
  targets,
  catalog,
  onAdd,
  onRemove,
  onPortion,
  onCustomize,
}: {
  menu: DayMenu
  totals: MenuTotals
  targets: Targets
  catalog: Catalog
  onAdd: (slot: Slot) => void
  onRemove: (slot: Slot, uid: string) => void
  onPortion: (slot: Slot, uid: string, portion: number) => void
  onCustomize: (slot: Slot, uid: string) => void
}) {
  const [editing, setEditing] = useState<string | null>(null)
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {SLOTS.map((slot) => (
        <section key={slot} className="rounded-[var(--radius-card)] bg-white p-4 shadow-sm">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">
              {SLOT_ICON[slot]} {SLOT_LABEL[slot]}
              {slot !== 'other' && 'ごはん'}
            </h2>
            <span className="text-sm text-ink-soft tabular-nums">{Math.round(totals.bySlot[slot].values.energyKcal)} kcal</span>
          </header>
          <ul className="flex flex-wrap gap-2">
            {menu[slot].map((item) => (
              <li key={item.uid} className="flex items-center gap-1 rounded-full bg-cream py-1 pr-1 pl-3 text-sm">
                <button
                  type="button"
                  onClick={() => setEditing(editing === item.uid ? null : item.uid)}
                  aria-expanded={editing === item.uid}
                  className="min-h-7"
                >
                  {itemName(item, catalog)}
                  <span className="ml-1 text-ink-soft">{portionLabel(item, catalog)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(slot, item.uid)}
                  className="grid h-7 w-7 place-items-center rounded-full text-ink-soft hover:bg-white"
                  aria-label={`${itemName(item, catalog)}を外す`}
                >
                  ×
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => onAdd(slot)}
                className="min-h-11 rounded-full border-2 border-dashed border-coral px-4 text-sm font-bold text-coral hover:bg-coral/10"
              >
                ＋ 料理をえらぶ
              </button>
            </li>
          </ul>
          <SlotBalanceView totals={totals.bySlot[slot]} slot={slot} targets={targets} />
          {menu[slot].some((i) => i.uid === editing) && (
            <div className="mt-3 rounded-2xl border-2 border-cream p-3">
              {menu[slot]
                .filter((i) => i.uid === editing)
                .map((i) => (
                  <div key={i.uid} className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold">{itemName(i, catalog)}</span>
                    <PortionEditor item={i} catalog={catalog} onPortion={(p) => onPortion(slot, i.uid, p)} />
                    {(i.kind === 'dish' || i.kind === 'myDish') && (
                      <button
                        type="button"
                        onClick={() => onCustomize(slot, i.uid)}
                        className="min-h-10 rounded-full bg-ok/20 px-4 text-sm font-bold"
                      >
                        🥄 材料をアレンジ
                      </button>
                    )}
                  </div>
                ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
