import type { Catalog, MenuTotals } from '../domain/nutrition'
import { SLOTS, type DayMenu, type Slot } from '../domain/types'
import { menuItemImage } from './illustration'
import { itemName, portionLabel } from './itemName'
import type { Targets } from '../domain/targets'
import { SLOT_LABEL } from './labels'
import { SlotBalanceView } from './SlotBalanceView'
import { computeAlerts } from '../domain/alerts'
import { SlotIcon } from './Mascot'

export function SlotBoard({
  menu,
  totals,
  targets,
  catalog,
  onAdd,
  onRemove,
  onEdit,
}: {
  menu: DayMenu
  totals: MenuTotals
  targets: Targets
  catalog: Catalog
  onAdd: (slot: Slot) => void
  onRemove: (slot: Slot, uid: string) => void
  // 献立の項目をタップしたら、その場で編集画面を開く
  onEdit: (slot: Slot, uid: string) => void
}) {
  const alerts = computeAlerts(totals, targets)
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {SLOTS.map((slot) => (
        <section key={slot} className="rounded-[var(--radius-card)] bg-white p-4 shadow-sm">
          <header className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2.5 text-lg font-bold">
              <SlotIcon slot={slot} className="h-10 w-10 shrink-0" />
              <span>
                {SLOT_LABEL[slot]}
                {slot !== 'other' && 'ごはん'}
              </span>
            </h2>
            <span className="text-sm text-ink-soft tabular-nums">{Math.round(totals.bySlot[slot].values.energyKcal)} kcal</span>
          </header>
          <ul className="flex flex-wrap gap-2">
            {menu[slot].map((item) => (
              <li key={item.uid} className="flex items-center gap-1 rounded-full bg-cream py-1 pr-1 pl-3 text-sm">
                <button
                  type="button"
                  onClick={() => onEdit(slot, item.uid)}
                  aria-haspopup="dialog"
                  className="flex min-h-7 items-center"
                >
                  {menuItemImage(item, catalog) && <img src={menuItemImage(item, catalog)} alt="" className="mr-1.5 -ml-2 h-7 w-7" />}
                  {itemName(item, catalog)}
                  <span className="ml-1 text-ink-soft">{portionLabel(item, catalog)}</span>
                  <span aria-hidden className="ml-1.5 text-xs text-coral">✎</span>
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
          <SlotBalanceView totals={totals.bySlot[slot]} slot={slot} targets={targets} alerts={alerts} />
        </section>
      ))}
    </div>
  )
}
