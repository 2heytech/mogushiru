import type { Catalog, MenuTotals } from '../domain/nutrition'
import { SLOTS, type DayMenu, type MenuItem, type Slot } from '../domain/types'
import { SLOT_LABEL } from './labels'

const SLOT_ICON: Record<Slot, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', other: '🍪' }

function itemName(item: MenuItem, catalog: Catalog): string {
  switch (item.kind) {
    case 'dish':
      return catalog.dishes.get(item.refId)?.name ?? '（不明な料理）'
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
  catalog,
  onAdd,
  onRemove,
}: {
  menu: DayMenu
  totals: MenuTotals
  catalog: Catalog
  onAdd: (slot: Slot) => void
  onRemove: (slot: Slot, uid: string) => void
}) {
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
                {itemName(item, catalog)}
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
        </section>
      ))}
    </div>
  )
}
