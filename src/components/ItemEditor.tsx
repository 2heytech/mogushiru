import type { Catalog } from '../domain/nutrition'
import { itemTotals } from '../domain/nutrition'
import type { MenuItem } from '../domain/types'
import { itemName } from './itemName'
import { PortionEditor } from './PortionEditor'

// 市販品・食材の編集（量・お気に入り）。料理は材料まで変えられる Customizer で開く
export function ItemEditor({
  item,
  catalog,
  favorite,
  onPortion,
  onToggleFavorite,
  onEditProduct,
  onRemove,
  onClose,
}: {
  item: MenuItem
  catalog: Catalog
  favorite: boolean
  onPortion: (portion: number) => void
  onToggleFavorite?: () => void
  // 登録した市販品のとき、栄養成分を直す
  onEditProduct?: () => void
  onRemove: () => void
  onClose: () => void
}) {
  const v = itemTotals(item, catalog).values
  const name = itemName(item, catalog)
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-ink/30 md:items-center md:justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${name}を編集`}
        className="w-full rounded-t-[var(--radius-card)] bg-cream p-4 shadow-xl md:max-w-md md:rounded-[var(--radius-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{name}</h2>
          <button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-white" aria-label="閉じる">
            ×
          </button>
        </header>
        <div className="space-y-3">
          <PortionEditor item={item} catalog={catalog} onPortion={onPortion} />
          <p className="rounded-2xl bg-white px-3 py-2 text-sm tabular-nums">
            <strong>{Math.round(v.energyKcal)} kcal</strong>
            <span className="ml-2 text-xs text-ink-soft">
              P {v.protein.toFixed(1)} ・ F {v.fat.toFixed(1)} ・ C {v.carb.toFixed(1)} ・ 食塩 {v.salt.toFixed(1)}g
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {onToggleFavorite && (
              <button type="button" aria-pressed={favorite} onClick={onToggleFavorite} className="min-h-11 rounded-full bg-white px-4 text-sm font-bold">
                {favorite ? '★ お気に入り' : '☆ お気に入りに追加'}
              </button>
            )}
            {onEditProduct && (
              <button type="button" onClick={onEditProduct} className="min-h-11 rounded-full bg-white px-4 text-sm">
                栄養成分を直す
              </button>
            )}
            <button type="button" onClick={onRemove} className="min-h-11 rounded-full bg-white px-4 text-sm text-alert">
              献立から外す
            </button>
            <button type="button" onClick={onClose} className="min-h-11 flex-1 rounded-full bg-coral px-4 text-sm font-bold text-white">
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
