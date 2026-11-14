import { useState, type ReactNode } from 'react'
import type { MealSlot } from '../domain/idealMeals'
import { knownItemsOnly, menuTotals, type Catalog } from '../domain/nutrition'
import type { Targets } from '../domain/targets'
import { SLOTS, type DayMenu, type MenuItem } from '../domain/types'
import type { SavedMenu } from '../store/useAppStore'
import { confirmDialog } from './confirm'
import { IdealMealList } from './IdealMeals'
import { SLOT_LABEL } from './labels'
import { defaultMenuName } from './menuName'
import { UiIcon } from './UiIcon'
import { useDialog } from './useDialog'

const itemCount = (menu: DayMenu) => SLOTS.reduce((n, s) => n + menu[s].length, 0)

// 「献立をつくる」だけ色をつけて、いちばん先に目に入るようにする
const PRIMARY = 'flex items-center justify-center gap-1.5 rounded-full bg-coral font-bold text-ink-strong shadow-sm transition hover:bg-coral-dark/90'
const SECONDARY = 'flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-white pr-4 pl-2.5 text-sm shadow-sm transition hover:bg-cream disabled:opacity-40'
// スマホの下のバーの「保存」「呼び出す」「リセット」。アイコンの下に名前
const BAR_SMALL = 'flex min-h-13 min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl bg-cream text-2xs whitespace-nowrap transition disabled:opacity-40'

export type MenuActionsLayout = 'row' | 'bar'

// 1日の食事の「献立をつくる」「保存」「呼び出す」「リセット」。
// 献立をつくる（理想の献立から1日分・1食ずつ）と、保存した食事を呼び出すのは入口を分ける。
// row＝見出しやPCの上のバーに横並び、bar＝スマホの下に固定のバー（献立をつくるを広く、ほかはアイコンの下に名前）
export function MenuActions({
  menu,
  layout,
  savedCount,
  onOpenBuild,
  onOpenSave,
  onOpenSaved,
  onReset,
}: {
  menu: DayMenu
  layout: MenuActionsLayout
  savedCount: number
  onOpenBuild: () => void
  onOpenSave: () => void
  onOpenSaved: () => void
  onReset: () => void
}) {
  const empty = itemCount(menu) === 0
  const reset = async () => {
    if (await confirmDialog('朝・昼・晩・その他の料理をすべて外して、空にしますか？', { okLabel: 'リセットする', danger: true })) onReset()
  }
  const savedTitle = savedCount === 0 ? '保存した食事はまだありません' : undefined
  const count = savedCount > 0 && <span className="rounded-full bg-white px-1.5 text-xs font-normal tabular-nums text-ink-soft">{savedCount}</span>
  if (layout === 'bar')
    return (
      <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-1.5">
        <button type="button" onClick={onOpenBuild} aria-haspopup="dialog" className={`${PRIMARY} min-h-13 px-3 text-base whitespace-nowrap`}>
          <UiIcon name="build" className="h-6 w-6 shrink-0" />
          献立をつくる
        </button>
        <button type="button" onClick={onOpenSave} disabled={empty} aria-haspopup="dialog" className={BAR_SMALL}>
          <UiIcon name="save" className="h-6 w-6 shrink-0" />
          保存
        </button>
        <button
          type="button"
          onClick={onOpenSaved}
          disabled={savedCount === 0}
          title={savedTitle}
          aria-haspopup="dialog"
          aria-label={`保存した食事を呼び出す${savedCount > 0 ? `（${savedCount}件）` : ''}`}
          className={`${BAR_SMALL} relative`}
        >
          <UiIcon name="load" className="h-6 w-6 shrink-0" />
          呼び出す
          {savedCount > 0 && (
            <span className="absolute top-1 right-1 min-w-5 rounded-full bg-white px-1 text-2xs leading-5 tabular-nums text-ink-soft shadow-sm" aria-hidden>
              {savedCount}
            </span>
          )}
        </button>
        <button type="button" onClick={reset} disabled={empty} className={`${BAR_SMALL} text-ink-soft`}>
          <UiIcon name="reset" className="h-6 w-6 shrink-0" />
          リセット
        </button>
      </div>
    )
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={onOpenBuild} aria-haspopup="dialog" className={`${PRIMARY} min-h-11 pr-4 pl-2.5`}>
        <UiIcon name="build" className="h-6 w-6 shrink-0" />
        献立をつくる
      </button>
      <button type="button" onClick={onOpenSave} disabled={empty} aria-haspopup="dialog" className={SECONDARY}>
        <UiIcon name="save" className="h-6 w-6 shrink-0" />
        保存
      </button>
      <button
        type="button"
        onClick={onOpenSaved}
        disabled={savedCount === 0}
        title={savedTitle}
        aria-haspopup="dialog"
        aria-label={`保存した食事を呼び出す${savedCount > 0 ? `（${savedCount}件）` : ''}`}
        className={SECONDARY}
      >
        <UiIcon name="load" className="h-6 w-6 shrink-0" />
        呼び出す
        {count}
      </button>
      <button type="button" onClick={reset} disabled={empty} className={`${SECONDARY} text-ink-soft`}>
        <UiIcon name="reset" className="h-6 w-6 shrink-0" />
        リセット
      </button>
    </div>
  )
}

const dateLabel = (iso: string) => {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

// tall：中身の数によらず、いつも同じ高さにする（しぼりこむたびに窓の大きさが変わらないように。下に重なっている窓もかくれる）
export function Sheet({ title, onClose, wide = false, tall = false, children }: { title: string; onClose: () => void; wide?: boolean; tall?: boolean; children: ReactNode }) {
  const dialogRef = useDialog(onClose)
  return (
    <div className="fixed inset-0 z-20 flex items-end bg-ink/30 md:items-center md:justify-center" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`outline-none w-full overflow-y-auto rounded-t-[var(--radius-card)] bg-cream px-5 pb-5 shadow-xl md:rounded-[var(--radius-card)] ${tall ? 'h-[90dvh]' : 'max-h-[90vh]'} ${wide ? 'md:max-w-4xl lg:max-w-5xl' : 'md:max-w-md'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 見出しと×は、長い一覧をスクロールしても上に残す */}
        <div className="sticky top-0 z-10 -mx-5 mb-1 flex items-center justify-between bg-cream px-5 pt-3 pb-1">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-white" aria-label="閉じる">
            ×
          </button>
        </div>
        {children}
        {!wide && (
          <button type="button" onClick={onClose} className="mt-5 min-h-11 w-full rounded-full bg-white">
            閉じる
          </button>
        )}
      </div>
    </div>
  )
}

// 1日の食事に名前を付けて取っておく（日付つきの記録ではなく、よく使う組み合わせのセット）
export function SaveMenuDialog({ saved, onSave, onClose }: { saved: SavedMenu[]; onSave: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState(() => defaultMenuName(saved.map((m) => m.name), new Date()))
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
      <button type="button" onClick={save} disabled={!trimmed} className="mt-4 min-h-11 w-full rounded-full bg-coral font-bold text-ink-strong disabled:opacity-50">
        {overwrite ? '上書き保存' : '保存'}
      </button>
    </Sheet>
  )
}

// 保存した1日の食事を呼び出す（削除もできる）。理想の献立から献立をつくるのは「献立をつくる」（MenuBuilder.tsx）
export function SavedMenusDialog({
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
  const confirmReplace = async (name: string) => empty || (await confirmDialog(`いまの1日の食事を「${name}」に置き換えますか？`, { okLabel: '呼び出す' }))
  const summary = (m: SavedMenu) => {
    const known = knownItemsOnly(m.menu, catalog)
    return { count: itemCount(known), kcal: Math.round(menuTotals(known, catalog).day.values.energyKcal) }
  }
  return (
    <Sheet title="保存した食事を呼び出す" onClose={onClose}>
      {saved.length === 0 ? (
        <p className="rounded-2xl bg-white/60 px-4 py-3 text-sm text-ink-soft">まだありません。1日の食事を「保存」すると、ここから呼び出せます。</p>
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
                    if (await confirmReplace(m.name)) onLoad(m)
                  }}
                  className="min-h-10 shrink-0 rounded-full bg-coral px-3.5 text-sm font-bold text-ink-strong"
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

// 理想の献立から、朝・昼・晩のどれか1食だけを呼び出す（「朝に追加」などの料理をえらぶ画面からひらく）
export function IdealMealDialog({
  slot,
  menu,
  catalog,
  targets,
  storesLoaded,
  onLoad,
  onClose,
}: {
  slot: MealSlot
  menu: DayMenu
  catalog: Catalog
  targets: Targets
  storesLoaded: boolean
  onLoad: (items: MenuItem[]) => void
  onClose: () => void
}) {
  const label = SLOT_LABEL[slot]
  return (
    <Sheet title={`${label}ごはんの理想の献立`} onClose={onClose} wide tall>
      <IdealMealList
        slot={slot}
        catalog={catalog}
        targets={targets}
        storesLoaded={storesLoaded}
        onLoad={async (title, items) => {
          if (menu[slot].length === 0 || (await confirmDialog(`いまの${label}の食事を「${title}」に置き換えますか？`, { okLabel: '置き換える' }))) onLoad(items)
        }}
      />
    </Sheet>
  )
}
