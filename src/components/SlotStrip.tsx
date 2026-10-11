import { useState } from 'react'
import { itemTotals, type Catalog, type MenuTotals } from '../domain/nutrition'
import { slotBalance, type EnergyLevel } from '../domain/slotBalance'
import type { Targets } from '../domain/targets'
import { SLOTS, type DayMenu, type MenuItem, type Slot } from '../domain/types'
import { menuItemImage } from './illustration'
import { itemName, portionLabel } from './itemName'
import { SLOT_LABEL } from './labels'
import { SlotIcon } from './Mascot'

const BAR_COLOR: Record<EnergyLevel, string> = { empty: 'bg-coral', low: 'bg-coral', ok: 'bg-ok', high: 'bg-alert' }
const slotTitle = (slot: Slot) => `${SLOT_LABEL[slot]}${slot === 'other' ? '' : 'ごはん'}`

// 区分のカロリー。目安を真ん中の線にして、目安の2倍までを描く
function SlotKcalBar({ kcal, target, level, className = '' }: { kcal: number; target: number; level: EnergyLevel; className?: string }) {
  return (
    <div className={`relative h-1.5 rounded-full bg-ink/10 ${className}`} role="img" aria-label={`${Math.round(kcal)} kcal、目安 ${target} kcal`}>
      <div className={`h-full rounded-full transition-all duration-500 ${BAR_COLOR[level]}`} style={{ width: `${Math.min(kcal / (target * 2), 1) * 100}%` }} />
      <div className="absolute -inset-y-0.5 left-1/2 w-0.5 rounded-full bg-ink/40" aria-hidden />
    </div>
  )
}

function ItemThumb({ item, catalog, className }: { item: MenuItem; catalog: Catalog; className: string }) {
  const src = menuItemImage(item, catalog)
  if (src) return <img src={src} alt="" className={className} />
  return (
    <span aria-hidden className={`grid place-items-center rounded-full bg-cream text-sm ${className}`}>
      {item.kind === 'supplement' ? '💊' : '🍽'}
    </span>
  )
}

function AddButton({ slot, onAdd, className = '' }: { slot: Slot; onAdd: (slot: Slot) => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => onAdd(slot)}
      className={`min-h-11 rounded-full border-2 border-dashed border-coral px-4 text-sm font-bold text-coral hover:bg-coral/10 ${className}`}
    >
      ＋ 料理をえらぶ
    </button>
  )
}

type Props = {
  menu: DayMenu
  totals: MenuTotals
  targets: Targets
  catalog: Catalog
  onAdd: (slot: Slot) => void
  onRemove: (slot: Slot, uid: string) => void
  // 献立の項目をタップしたら、その場で編集画面を開く
  onEdit: (slot: Slot, uid: string) => void
}

// 1日の食事の4区分を横一列に並べる。
// スマホは絵のつぶと kcal だけの小さなカードにして、押すとその区分の料理が下にひらく。
// 広い画面では料理名まで出す。
export function SlotStrip(props: Props) {
  const { menu, totals, targets, catalog, onAdd } = props
  const [open, setOpen] = useState<Slot | null>(null)
  return (
    <section aria-label="1日の食事">
      {/* スマホ */}
      <div className="md:hidden">
        <div className="grid grid-cols-4 gap-1.5">
          {SLOTS.map((slot) => {
            const items = menu[slot]
            const b = slotBalance(totals.bySlot[slot], slot, targets)
            const active = open === slot
            return (
              <button
                key={slot}
                type="button"
                aria-expanded={active}
                aria-controls="slot-strip-detail"
                onClick={() => (items.length === 0 ? onAdd(slot) : setOpen(active ? null : slot))}
                className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl border-2 bg-white px-1 pt-2 pb-2.5 shadow-sm transition ${
                  active ? 'border-coral' : 'border-transparent'
                }`}
              >
                <SlotIcon slot={slot} className="h-9 w-9" />
                <span className="text-xs font-bold">{SLOT_LABEL[slot]}</span>
                <span className="flex h-6 items-center justify-center -space-x-1.5">
                  {items.length === 0 ? (
                    <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-dashed border-coral text-sm leading-none text-coral" aria-hidden>
                      ＋
                    </span>
                  ) : (
                    <>
                      {items.slice(0, 3).map((item) => (
                        <ItemThumb key={item.uid} item={item} catalog={catalog} className="h-6 w-6 rounded-full bg-white ring-2 ring-white" />
                      ))}
                      {items.length > 3 && <span className="pl-2.5 text-[10px] text-ink-soft">+{items.length - 3}</span>}
                    </>
                  )}
                </span>
                <span className="text-[11px] text-ink-soft tabular-nums">{Math.round(b.kcal)} kcal</span>
                <SlotKcalBar kcal={b.kcal} target={b.targetKcal} level={b.energy} className="w-[85%]" />
                <span className="sr-only">{items.length === 0 ? '料理をえらぶ' : `${items.length}品。押すと料理が見られます`}</span>
              </button>
            )
          })}
        </div>
        {open && (
          <div id="slot-strip-detail" className="mt-2 rounded-[var(--radius-card)] bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 font-bold">
                <SlotIcon slot={open} className="h-7 w-7" />
                {slotTitle(open)}
              </h2>
              <button type="button" onClick={() => setOpen(null)} className="grid h-9 w-9 place-items-center rounded-full text-ink-soft" aria-label="とじる">
                ×
              </button>
            </div>
            <SlotItems {...props} slot={open} />
            <AddButton slot={open} onAdd={onAdd} className="mt-2 w-full" />
          </div>
        )}
      </div>

      {/* 広い画面 */}
      <div className="hidden gap-3 md:grid md:grid-cols-4">
        {SLOTS.map((slot) => {
          const b = slotBalance(totals.bySlot[slot], slot, targets)
          return (
            <div key={slot} className="flex min-w-0 flex-col gap-2 rounded-[var(--radius-card)] bg-white p-3 shadow-sm">
              <header className="flex items-center justify-between gap-1">
                <h2 className="flex min-w-0 items-center gap-1.5 font-bold">
                  <SlotIcon slot={slot} className="h-9 w-9 shrink-0" />
                  <span className="truncate">{slotTitle(slot)}</span>
                </h2>
                <span className="shrink-0 text-xs text-ink-soft tabular-nums">{Math.round(b.kcal)} kcal</span>
              </header>
              <SlotKcalBar kcal={b.kcal} target={b.targetKcal} level={b.energy} />
              <SlotItems {...props} slot={slot} />
              <AddButton slot={slot} onAdd={onAdd} className="mt-auto w-full px-2" />
            </div>
          )
        })}
      </div>
    </section>
  )
}

// 区分に入っている料理の一覧。名前を押すと編集、×で外す
function SlotItems({ menu, catalog, onEdit, onRemove, slot }: Props & { slot: Slot }) {
  const items = menu[slot]
  if (items.length === 0) return <p className="py-1 text-center text-xs text-ink-soft">まだ料理がありません</p>
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.uid} className="flex items-center gap-1 rounded-xl bg-cream/70 pr-0.5">
          <button
            type="button"
            onClick={() => onEdit(slot, item.uid)}
            aria-haspopup="dialog"
            className="flex min-h-10 min-w-0 flex-1 items-center gap-1.5 py-1 pl-1 text-left text-sm"
          >
            <ItemThumb item={item} catalog={catalog} className="h-7 w-7 shrink-0" />
            <span className="min-w-0 flex-1 leading-snug">
              {itemName(item, catalog)}
              <span className="block text-[11px] text-ink-soft tabular-nums">
                {portionLabel(item, catalog)}
                {portionLabel(item, catalog) && '・'}
                {Math.round(itemTotals(item, catalog).values.energyKcal)} kcal
              </span>
            </span>
            <span aria-hidden className="text-xs text-coral">
              ✎
            </span>
          </button>
          <button
            type="button"
            onClick={() => onRemove(slot, item.uid)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-white"
            aria-label={`${itemName(item, catalog)}を外す`}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  )
}
