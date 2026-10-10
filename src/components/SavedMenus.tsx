import { useState, type ReactNode } from 'react'
import { knownItemsOnly, menuTotals, type Catalog } from '../domain/nutrition'
import { SLOTS, type DayMenu } from '../domain/types'
import type { SavedMenu } from '../store/useAppStore'
import { confirmDialog } from './confirm'
import { UiIcon } from './UiIcon'

const itemCount = (menu: DayMenu) => SLOTS.reduce((n, s) => n + menu[s].length, 0)

const BUTTON = 'flex min-h-10 items-center gap-1.5 rounded-full bg-white pl-2 pr-3.5 text-sm shadow-sm disabled:opacity-40'

// 1日の食事の上に並べる「保存」「呼び出し」「リセット」
export function MenuActions({
  menu,
  savedCount,
  onOpenSave,
  onOpenLoad,
  onReset,
}: {
  menu: DayMenu
  savedCount: number
  onOpenSave: () => void
  onOpenLoad: () => void
  onReset: () => void
}) {
  const empty = itemCount(menu) === 0
  return (
    <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
      <button type="button" onClick={onOpenSave} disabled={empty} aria-haspopup="dialog" className={BUTTON}>
        <UiIcon name="save" className="h-6 w-6 shrink-0" />保存
      </button>
      <button type="button" onClick={onOpenLoad} disabled={savedCount === 0} aria-haspopup="dialog" className={BUTTON}>
        <UiIcon name="load" className="h-6 w-6 shrink-0" />呼び出し
        {savedCount > 0 && <span className="rounded-full bg-cream px-1.5 text-xs tabular-nums text-ink-soft">{savedCount}</span>}
      </button>
      <button
        type="button"
        disabled={empty}
        onClick={async () => {
          if (await confirmDialog('朝・昼・晩・その他の料理をすべて外して、空にしますか？', { okLabel: 'リセットする', danger: true })) onReset()
        }}
        className={BUTTON}
      >
        <UiIcon name="reset" className="h-6 w-6 shrink-0" />リセット
      </button>
    </div>
  )
}

const dateLabel = (iso: string) => {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-20 flex items-end bg-ink/30 md:items-center md:justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-[var(--radius-card)] bg-cream p-5 shadow-xl md:max-w-md md:rounded-[var(--radius-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-bold">{title}</h2>
        {children}
        <button type="button" onClick={onClose} className="mt-5 min-h-11 w-full rounded-full bg-white">
          閉じる
        </button>
      </div>
    </div>
  )
}

// 1日の食事に名前を付けて取っておく（日付つきの記録ではなく、よく使う組み合わせのセット）
export function SaveMenuDialog({ saved, onSave, onClose }: { saved: SavedMenu[]; onSave: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState(() => {
    for (let n = saved.length + 1; ; n++) if (!saved.some((m) => m.name === `1日の食事 ${n}`)) return `1日の食事 ${n}`
  })
  const trimmed = name.trim()
  const overwrite = saved.some((m) => m.name === trimmed)
  // form の submit は埋め込み表示（allow-forms のない sandbox）で止められるため、ボタンと Enter キーで保存する
  const save = async () => {
    if (!trimmed) return
    if (overwrite && !(await confirmDialog(`「${trimmed}」を、いまの内容で上書きしますか？`, { okLabel: '上書きする' }))) return
    onSave(trimmed)
  }
  return (
    <Sheet title="1日の食事を保存" onClose={onClose}>
      <p className="mb-4 text-xs text-ink-soft">よく食べる組み合わせに名前を付けて取っておけます。この端末のブラウザにだけ保存されます。</p>
      <label className="text-sm">
        名前
        <input
          className="mt-1 min-h-11 w-full rounded-2xl border-2 border-white bg-white px-4 text-base outline-none focus:border-coral"
          value={name}
          maxLength={30}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && save()}
          enterKeyHint="done"
        />
      </label>
      {saved.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs text-ink-soft">保存したものと同じ名前にすると上書きします</p>
          <div className="flex flex-wrap gap-1.5">
            {saved.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setName(m.name)}
                className={`min-h-8 rounded-full px-3 text-xs ${m.name === trimmed ? 'bg-coral/20 font-bold' : 'bg-white'}`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <button type="button" onClick={save} disabled={!trimmed} className="mt-4 min-h-11 w-full rounded-full bg-coral font-bold text-white disabled:opacity-50">
        {overwrite ? '上書き保存' : '保存'}
      </button>
    </Sheet>
  )
}

// 保存した1日の食事を呼び出す・削除する
export function LoadMenuDialog({
  menu,
  saved,
  catalog,
  onLoad,
  onDelete,
  onClose,
}: {
  menu: DayMenu
  saved: SavedMenu[]
  catalog: Catalog
  onLoad: (m: SavedMenu) => void
  onDelete: (m: SavedMenu) => void
  onClose: () => void
}) {
  const empty = itemCount(menu) === 0
  const summary = (m: SavedMenu) => {
    const known = knownItemsOnly(m.menu, catalog)
    return { count: itemCount(known), kcal: Math.round(menuTotals(known, catalog).day.values.energyKcal) }
  }
  return (
    <Sheet title="1日の食事を呼び出し" onClose={onClose}>
      <p className="mb-4 text-xs text-ink-soft">呼び出すと、いまの1日の食事と置き換わります。</p>
      {saved.length === 0 ? (
        <p className="rounded-2xl bg-white/60 px-4 py-3 text-sm text-ink-soft">まだありません</p>
      ) : (
        <ul className="space-y-2">
          {saved.map((m) => {
            const { count, kcal } = summary(m)
            return (
              <li key={m.id} className="flex items-center gap-2 rounded-2xl bg-white p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{m.name}</p>
                  <p className="text-xs tabular-nums text-ink-soft">
                    {count}品・{kcal.toLocaleString()} kcal・{dateLabel(m.savedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!empty && !(await confirmDialog(`いまの1日の食事を「${m.name}」に置き換えますか？`, { okLabel: '呼び出す' }))) return
                    onLoad(m)
                  }}
                  className="min-h-10 shrink-0 rounded-full bg-coral px-3.5 text-sm font-bold text-white"
                >
                  呼び出す
                </button>
                <button
                  type="button"
                  aria-label={`「${m.name}」を削除`}
                  onClick={async () => {
                    if (await confirmDialog(`「${m.name}」を削除しますか？`, { okLabel: '削除する', danger: true })) onDelete(m)
                  }}
                  className="grid min-h-10 min-w-10 shrink-0 place-items-center rounded-full bg-cream text-ink-soft"
                >
                  🗑
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Sheet>
  )
}
