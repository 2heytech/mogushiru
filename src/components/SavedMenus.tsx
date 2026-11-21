import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { MealSlot } from '../domain/idealMeals'
import { knownItemsOnly, menuTotals, type Catalog, type MenuTotals } from '../domain/nutrition'
import type { Targets } from '../domain/targets'
import { SLOTS, type DayMenu, type MenuItem, type Slot } from '../domain/types'
import { READING_LINKS } from '../routes'
import type { SavedMenu } from '../store/useAppStore'
import { confirmDialog } from './confirm'
import { CustomizeIcon } from './CustomizeIcon'
import { IdealMealList } from './IdealMeals'
import { SLOT_LABEL } from './labels'
import { SlotIcon } from './Mascot'
import { defaultMenuName } from './menuName'
import { UiIcon } from './UiIcon'
import { useDialog } from './useDialog'

const itemCount = (menu: DayMenu) => SLOTS.reduce((n, s) => n + menu[s].length, 0)

// いちばん目立つボタン（スマホの下のバーの「料理を追加」）
const PRIMARY = 'flex items-center justify-center gap-1.5 rounded-full bg-coral font-bold text-ink-strong shadow-sm transition hover:bg-coral-dark/90'
const SECONDARY = 'flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-white pr-4 pl-2.5 text-sm shadow-sm transition hover:bg-cream disabled:opacity-40'
// スマホの下のバーの「保存」「メニュー」。アイコンの下に名前
const BAR_SMALL = 'flex min-h-13 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl bg-cream text-2xs whitespace-nowrap transition disabled:opacity-40'
// 窓の中に並べる、絵・名前・ひとことの行
const SHEET_ROW = 'flex min-h-14 w-full items-center gap-3 rounded-2xl bg-white px-3 py-2 text-left shadow-sm transition hover:bg-coral/5 disabled:opacity-50 disabled:shadow-none'

export type MenuActionsLayout = 'row' | 'bar'

const slotTitle = (slot: Slot) => `${SLOT_LABEL[slot]}${slot === 'other' ? '' : 'ごはん'}`

// 1日の食事の操作。
// row＝見出しやPCの上のバーに横並び：「献立の例から選ぶ」「保存」「呼び出す」「リセット」（料理を足すのは、朝・昼・晩それぞれの「＋ 料理を選ぶ」）
// bar＝スマホの下に固定のバー：料理を足したり直したりしている間は「料理を追加」をいちばん目立たせ、
//   献立全体の選びなおし・保存した食事の呼び出し・料理をアレンジ・リセット・最初の画面にもどるは「メニュー」の中に置く（3.8・3.14）
export function MenuActions({
  menu,
  totals,
  layout,
  savedCount,
  openSlot,
  onAdd,
  onOpenBuild,
  onOpenSave,
  onOpenSaved,
  onArrange,
  onBackToStart,
  onReset,
}: {
  menu: DayMenu
  totals: MenuTotals
  layout: MenuActionsLayout
  savedCount: number
  // スマホで、料理の一覧をひらいている食事（「料理を追加」はこの食事に足す。なければ、どの食事かを聞く）
  openSlot: Slot | null
  onAdd: (slot: Slot) => void
  onOpenBuild: () => void
  onOpenSave: () => void
  onOpenSaved: () => void
  // 「料理をアレンジ」の画面へ
  onArrange: () => void
  // 最初の画面（3つの入口）へ。料理は外さない
  onBackToStart: () => void
  onReset: () => void
}) {
  const [sheet, setSheet] = useState<'slot' | 'more' | null>(null)
  const empty = itemCount(menu) === 0
  const reset = async () => {
    if (await confirmDialog('朝・昼・晩・その他の料理をすべて外して、空にしますか？', { okLabel: 'リセットする', danger: true })) onReset()
  }
  const savedTitle = savedCount === 0 ? '保存した食事はまだありません' : undefined
  const count = savedCount > 0 && <span className="rounded-full bg-white px-1.5 text-xs font-normal tabular-nums text-ink-soft">{savedCount}</span>
  if (layout === 'bar')
    return (
      <>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => (openSlot ? onAdd(openSlot) : setSheet('slot'))}
            aria-haspopup="dialog"
            className={`${PRIMARY} min-h-13 min-w-0 flex-1 px-3 text-base whitespace-nowrap`}
          >
            <span aria-hidden className="text-xl leading-none">
              ＋
            </span>
            {/* 幅のせまいスマホでは「その他に料理を追加」がボタンに入らないので、「その他に追加」にする */}
            {openSlot ? (
              <span>
                {SLOT_LABEL[openSlot]}に<span className="max-[359px]:hidden">料理を</span>追加
              </span>
            ) : (
              '料理を追加'
            )}
          </button>
          <button type="button" onClick={onOpenSave} disabled={empty} aria-haspopup="dialog" className={BAR_SMALL}>
            <UiIcon name="save" className="h-6 w-6 shrink-0" />
            保存
          </button>
          <button type="button" onClick={() => setSheet('more')} aria-haspopup="dialog" aria-label="ほかの操作（献立の例から選ぶ・呼び出す・料理をアレンジ・リセット・最初の画面にもどる）" className={BAR_SMALL}>
            <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-ink-soft" fill="currentColor" aria-hidden>
              <circle cx="5" cy="12" r="2.2" />
              <circle cx="12" cy="12" r="2.2" />
              <circle cx="19" cy="12" r="2.2" />
            </svg>
            メニュー
          </button>
        </div>
        {/* 下のバーはぼかし（backdrop-blur）つきで、中に置いた窓はバーの中に閉じこめられるので、body に出す */}
        {sheet === 'slot' &&
          createPortal(
            <SlotChoiceSheet
              menu={menu}
              totals={totals}
              onPick={(slot) => {
                setSheet(null)
                onAdd(slot)
              }}
              onClose={() => setSheet(null)}
            />,
            document.body,
          )}
        {sheet === 'more' &&
          createPortal(
          <Sheet title="ほかの操作" onClose={() => setSheet(null)}>
            <ul className="mt-1 space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setSheet(null)
                    onOpenBuild()
                  }}
                  className={SHEET_ROW}
                >
                  <UiIcon name="build" className="h-9 w-9 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{empty ? '献立の例から選ぶ' : '献立の例から選びなおす'}</span>
                    <span className="block text-xs text-ink-soft">バランスの整った献立を、1日分か1食ずつ選ぶ</span>
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  disabled={savedCount === 0}
                  onClick={() => {
                    setSheet(null)
                    onOpenSaved()
                  }}
                  className={SHEET_ROW}
                >
                  <UiIcon name="load" className="h-9 w-9 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">保存した食事を呼び出す</span>
                    <span className="block text-xs text-ink-soft">{savedCount === 0 ? '保存した食事はまだありません' : `${savedCount}件あります`}</span>
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setSheet(null)
                    onArrange()
                  }}
                  className={SHEET_ROW}
                >
                  <CustomizeIcon className="h-9 w-9 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">料理をアレンジ</span>
                    <span className="block text-xs text-ink-soft">材料や量を変えて、お気に入りに保存</span>
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  disabled={empty}
                  onClick={() => {
                    setSheet(null)
                    void reset()
                  }}
                  className={SHEET_ROW}
                >
                  <UiIcon name="reset" className="h-9 w-9 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">リセット</span>
                    <span className="block text-xs text-ink-soft">朝・昼・晩・その他の料理をすべて外す</span>
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setSheet(null)
                    onBackToStart()
                  }}
                  className={SHEET_ROW}
                >
                  <UiIcon name="start" className="h-9 w-9 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">最初の画面にもどる</span>
                    <span className="block text-xs text-ink-soft">{empty ? '始め方を選びなおす' : '入れた料理は、そのまま残ります'}</span>
                  </span>
                </button>
              </li>
            </ul>
            {/* 読みもののページ（食品成分ランキング・献立の例・料理のカロリー・栄養）への入口。入れた料理は、そのまま残る */}
            <nav aria-label="読みもの" className="mt-4">
              <p className="px-1 text-xs font-bold text-ink-soft">読みもの</p>
              <ul className="mt-1.5 flex flex-wrap gap-2">
                {READING_LINKS.map((l) => (
                  <li key={l.key}>
                    <a href={l.path} className="inline-flex min-h-11 items-center rounded-full bg-white px-4 text-sm font-bold text-coral-ink shadow-sm transition hover:bg-coral/5">
                      {l.name}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </Sheet>,
            document.body,
          )}
      </>
    )
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={onOpenBuild} aria-haspopup="dialog" className={`${SECONDARY} font-bold text-coral-ink ring-1 ring-coral/60`}>
        <UiIcon name="build" className="h-6 w-6 shrink-0" />
        献立の例から選ぶ
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

// 「どの食事に追加しますか？」と、朝・昼・晩・その他から選ぶ窓（いま入っている品数とカロリーつき）。
// スマホの下のバーの「料理を追加」と、「料理をアレンジ」の画面でお気に入りの料理を1日の食事に足すときに使う
export function SlotChoiceSheet({
  title = 'どの食事に追加しますか？',
  lead,
  menu,
  totals,
  onPick,
  onClose,
}: {
  title?: string
  // 何を足すのかのひとこと（足すものが決まっているとき）
  lead?: string
  menu: DayMenu
  totals: MenuTotals
  onPick: (slot: Slot) => void
  onClose: () => void
}) {
  return (
    <Sheet title={title} onClose={onClose}>
      {lead && <p className="mb-2 text-sm text-pretty">{lead}</p>}
      <ul className="mt-1 space-y-2">
        {SLOTS.map((slot) => (
          <li key={slot}>
            <button type="button" onClick={() => onPick(slot)} className={SHEET_ROW}>
              <SlotIcon slot={slot} className="h-9 w-9 shrink-0" />
              <span className="min-w-0 flex-1 font-bold">{slotTitle(slot)}</span>
              <span className="shrink-0 text-xs text-ink-soft tabular-nums">
                {menu[slot].length === 0 ? 'まだありません' : `${menu[slot].length}品・${Math.round(totals.bySlot[slot].values.energyKcal)} kcal`}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
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
                className={`min-h-11 rounded-full px-3 text-xs ${m.name === trimmed ? 'bg-coral/20 font-bold' : 'bg-white'}`}
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

// 保存した1日の食事を呼び出す（削除もできる）。献立の例から献立をつくるのは「献立をつくる」（MenuBuilder.tsx）
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
                  className="min-h-11 shrink-0 rounded-full bg-coral px-3.5 text-sm font-bold text-ink-strong"
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

// 献立の例から、朝・昼・晩のどれか1食だけを呼び出す（「朝に追加」などの料理を選ぶ画面からひらく）
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
    <Sheet title={`${label}ごはんの献立の例`} onClose={onClose} wide tall>
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
