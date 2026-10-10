import { useState } from 'react'
import { knownItemsOnly, menuTotals, type Catalog } from '../domain/nutrition'
import { SLOTS, type DayMenu } from '../domain/types'
import type { SavedMenu } from '../store/useAppStore'
import { confirmDialog } from './confirm'

const itemCount = (menu: DayMenu) => SLOTS.reduce((n, s) => n + menu[s].length, 0)

const BUTTON = 'flex min-h-10 items-center gap-1 rounded-full bg-white px-3.5 text-sm shadow-sm disabled:opacity-40'

// 1日の食事の上に並べる「保存・呼び出す・リセット」
export function MenuActions({ menu, savedCount, onOpenSaved, onReset }: { menu: DayMenu; savedCount: number; onOpenSaved: () => void; onReset: () => void }) {
  const empty = itemCount(menu) === 0
  return (
    <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
      <button type="button" onClick={onOpenSaved} aria-haspopup="dialog" className={BUTTON}>
        <span aria-hidden="true">💾</span>保存・呼び出し
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
        <span aria-hidden="true">🔄</span>リセット
      </button>
    </div>
  )
}

const dateLabel = (iso: string) => {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 1日の食事に名前を付けて取っておき、あとで呼び出す（日付つきの記録ではなく、よく使う組み合わせのセット）
export function SavedMenusDialog({
  menu,
  saved,
  catalog,
  onSave,
  onLoad,
  onDelete,
  onClose,
}: {
  menu: DayMenu
  saved: SavedMenu[]
  catalog: Catalog
  onSave: (name: string) => void
  onLoad: (m: SavedMenu) => void
  onDelete: (m: SavedMenu) => void
  onClose: () => void
}) {
  const [name, setName] = useState(() => {
    for (let n = saved.length + 1; ; n++) if (!saved.some((m) => m.name === `1日の食事 ${n}`)) return `1日の食事 ${n}`
  })
  const trimmed = name.trim()
  const empty = itemCount(menu) === 0
  const overwrite = saved.some((m) => m.name === trimmed)
  // form の submit は埋め込み表示（allow-forms のない sandbox）で止められるため、ボタンと Enter キーで保存する
  const save = async () => {
    if (!trimmed || empty) return
    if (overwrite && !(await confirmDialog(`「${trimmed}」を、いまの内容で上書きしますか？`, { okLabel: '上書きする' }))) return
    onSave(trimmed)
  }
  const summary = (m: SavedMenu) => {
    const known = knownItemsOnly(m.menu, catalog)
    return { count: itemCount(known), kcal: Math.round(menuTotals(known, catalog).day.values.energyKcal) }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end bg-ink/30 md:items-center md:justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="1日の食事の保存・呼び出し"
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-[var(--radius-card)] bg-cream p-5 shadow-xl md:max-w-md md:rounded-[var(--radius-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-bold">1日の食事の保存・呼び出し</h2>
        <p className="mb-4 text-xs text-ink-soft">よく食べる組み合わせに名前を付けて取っておけます。この端末のブラウザにだけ保存されます。</p>

        <div className="rounded-2xl bg-white p-3">
          <label className="text-sm">
            いまの1日の食事を保存
            <input
              className="mt-1 min-h-11 w-full rounded-2xl border-2 border-cream bg-white px-4 text-base outline-none focus:border-coral"
              value={name}
              maxLength={30}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && save()}
              enterKeyHint="done"
            />
          </label>
          <button type="button" onClick={save} disabled={!trimmed || empty} className="mt-2 min-h-11 w-full rounded-full bg-coral font-bold text-white disabled:opacity-50">
            {overwrite ? '上書き保存' : '保存'}
          </button>
          {empty && <p className="mt-1 text-xs text-ink-soft">料理を選ぶと保存できます</p>}
        </div>

        <h3 className="mt-5 mb-2 text-sm font-bold">保存した1日の食事</h3>
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

        <button type="button" onClick={onClose} className="mt-5 min-h-11 w-full rounded-full bg-white">
          閉じる
        </button>
      </div>
    </div>
  )
}
