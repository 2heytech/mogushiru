import { itemTotals, type Catalog, type MenuTotals } from '../domain/nutrition'
import { slotBalance, type EnergyLevel } from '../domain/slotBalance'
import type { Targets } from '../domain/targets'
import { SLOTS, type DayMenu, type MenuItem, type Slot } from '../domain/types'
import { canStepDown, drinkAmount, drinkAmountLabel, drinkCount, drinkCup, drinkSpec, nextCount, prevCount } from '../domain/drinks'
import { menuItemImage } from './illustration'
import { drinkItemName, portionLabel } from './itemName'
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
      className={`min-h-11 rounded-full border-2 border-dashed border-coral px-4 text-sm font-bold text-coral-ink hover:bg-coral/10 ${className}`}
    >
      ＋ 料理を選ぶ
    </button>
  )
}

type Props = {
  menu: DayMenu
  totals: MenuTotals
  targets: Targets
  catalog: Catalog
  // スマホで、料理の一覧をひらいている食事（下のバーの「料理を追加」もこの食事に足すので、親で持つ）
  open: Slot | null
  onOpenChange: (slot: Slot | null) => void
  onAdd: (slot: Slot) => void
  onRemove: (slot: Slot, uid: string) => void
  // 飲み物の杯数を＋−で変える
  onDrink: (slot: Slot, item: MenuItem, amount: Pick<MenuItem, 'portion' | 'cup'>) => void
  // 献立の項目をタップしたら、その場で編集画面を開く
  onEdit: (slot: Slot, uid: string) => void
}

// 1日の食事の4区分を横一列に並べる。
// スマホは絵のつぶ・品数・kcal の小さなカードにして、押すとその区分の料理が下にひらく（下向きの矢印でひらけることを見せる）。
// ひらいた食事には「＋ 追加」を出す。広い画面では料理名まで出す。
export function SlotStrip(props: Props) {
  const { menu, totals, targets, catalog, onAdd, open, onOpenChange: setOpen } = props
  const empty = SLOTS.every((slot) => menu[slot].length === 0)
  return (
    <section aria-label="朝・昼・晩・その他">
      {/* まだ何も入っていないとき（「自分の食事で試す」で来たとき）は、どこを押すかをひとことで */}
      {empty && (
        <p className="mb-2 text-sm text-pretty">
          <span className="inline-block">朝・昼・晩の「＋」を押して、</span>
          <span className="inline-block">食べた料理を入れてみましょう。</span>
        </p>
      )}
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
                aria-expanded={items.length === 0 ? undefined : active}
                aria-controls={items.length === 0 ? undefined : 'slot-strip-detail'}
                aria-label={items.length === 0 ? `${slotTitle(slot)}に料理を追加` : `${slotTitle(slot)}、${items.length}品、${Math.round(b.kcal)} kcal。押すと料理が見られます`}
                onClick={() => (items.length === 0 ? onAdd(slot) : setOpen(active ? null : slot))}
                className={`flex min-w-0 flex-col items-center gap-0.5 rounded-2xl border-2 bg-white px-1 pt-2 pb-1 shadow-sm transition ${active ? 'border-coral' : 'border-transparent'}`}
              >
                <SlotIcon slot={slot} className="h-8 w-8" />
                <span className="text-xs font-bold">{SLOT_LABEL[slot]}</span>
                <span className="flex h-6 items-center justify-center -space-x-1.5">
                  {items.length === 0 ? (
                    <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-dashed border-coral text-sm leading-none text-coral-ink" aria-hidden>
                      ＋
                    </span>
                  ) : (
                    items.slice(0, 3).map((item) => <ItemThumb key={item.uid} item={item} catalog={catalog} className="h-6 w-6 rounded-full bg-white ring-2 ring-white" />)
                  )}
                </span>
                {/* 「5品」「536 kcal」。空の食事は「追加」 */}
                <span className={`text-2xs leading-tight tabular-nums ${items.length === 0 ? 'font-bold text-coral-ink' : ''}`}>{items.length === 0 ? '追加' : `${items.length}品`}</span>
                <span className="text-2xs leading-tight whitespace-nowrap text-ink-soft tabular-nums">{Math.round(b.kcal)} kcal</span>
                <SlotKcalBar kcal={b.kcal} target={b.targetKcal} level={b.energy} className="mt-0.5 w-[85%]" />
                {/* ひらけることを矢印で（空の食事は、押すとすぐ料理を選ぶ画面なので出さない） */}
                <svg viewBox="0 0 16 16" aria-hidden className={`h-4 w-4 text-coral-ink transition-transform ${items.length === 0 ? 'invisible' : active ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3.5 6l4.5 4.5L12.5 6" />
                </svg>
              </button>
            )
          })}
        </div>
        {open && (
          <div id="slot-strip-detail" className="mt-2 rounded-[var(--radius-card)] bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center gap-1.5">
              <h2 className="flex min-w-0 flex-1 items-center gap-1.5 font-bold">
                {/* 幅のせまいスマホでは、品数とカロリーが「＋ 追加」に重ならないよう、アイコンをかくして、入らないときは「・」で折り返す */}
                <SlotIcon slot={open} className="h-7 w-7 shrink-0 max-[359px]:hidden" />
                <span className="min-w-0">
                  <span className="inline-block">{slotTitle(open)}</span>
                  <span className="ml-1.5 text-xs font-normal text-ink-soft tabular-nums max-[359px]:ml-0 max-[359px]:block">
                    <span className="inline-block">{menu[open].length}品・</span>
                    <span className="inline-block">{Math.round(totals.bySlot[open].values.energyKcal)} kcal</span>
                  </span>
                </span>
              </h2>
              <button
                type="button"
                onClick={() => onAdd(open)}
                aria-haspopup="dialog"
                aria-label={`${slotTitle(open)}に料理を追加`}
                className="min-h-11 shrink-0 rounded-full border-2 border-coral px-3.5 text-sm font-bold whitespace-nowrap text-coral-ink hover:bg-coral/10 max-[359px]:px-2.5"
              >
                ＋ 追加
              </button>
              <button type="button" onClick={() => setOpen(null)} className="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-soft" aria-label="とじる">
                ×
              </button>
            </div>
            <SlotItems {...props} slot={open} />
          </div>
        )}
      </div>

      {/* 広い画面 */}
      {/* 広い画面は、右にまとめを置くので2列（朝・昼／晩・その他） */}
      <div className="hidden gap-3 md:grid md:grid-cols-2">
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

// lg〜xl（幅 1024〜1279px）は1日の食事の列がせまいので、ボタンの幅を少しつめる（「コップ1杯・」が1行に入るように）
const STEP_BUTTON =
  'grid h-11 w-11 shrink-0 place-items-center rounded-full text-base leading-none font-bold text-coral-ink hover:bg-white disabled:text-ink-soft/40 disabled:hover:bg-transparent lg:max-xl:w-9'

// 区分に入っている料理の一覧。名前を押すと量を変える窓、×で外す。飲み物は＋−で杯数を変えられる。
// 料理（材料まで変えられるもの）には、量とカロリーの横に「アレンジ」と書いた小さな札を付けて、押すと食べる量や材料を変えられることを見せる
// （「料理をアレンジ」を上のメニューから外したので、ここが入口になる。3.14）。市販品・食材は量だけなので、えんぴつの印だけ。
// 札を名前の右に置くと、スマホやPCの2列で名前が7〜8文字で折れるので、名前の下の行に置く。
// 幅のせまいスマホ（375px未満）では、飲み物の＋−を名前の下の行に下ろす（横に並べると、名前が5〜7文字ごとに折れる）
function SlotItems({ menu, catalog, onEdit, onRemove, onDrink, slot }: Props & { slot: Slot }) {
  const items = menu[slot]
  if (items.length === 0) return <p className="py-1 text-center text-xs text-ink-soft">まだ料理がありません</p>
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const drink = drinkSpec(item, catalog)
        const cup = drink && drinkCup(item, drink)
        const count = drink ? drinkCount(item, drink) : 0
        const name = drinkItemName(item, catalog, drink?.short)
        const amount = drink && cup ? drinkAmountLabel(cup, count) : portionLabel(item, catalog)
        // 材料まで変えられる料理か（料理・お気に入りの料理。飲み物は、まず杯数の窓がひらくので入れない）
        const arrangeable = !drink && (item.kind === 'dish' || item.kind === 'myDish')
        return (
          <li key={item.uid} className="flex items-center rounded-xl bg-cream/70 max-[374px]:flex-wrap">
            <button
              type="button"
              onClick={() => onEdit(slot, item.uid)}
              aria-haspopup="dialog"
              className="flex min-h-11 min-w-0 flex-1 items-center gap-1.5 py-1 pl-1 text-left text-sm"
            >
              <ItemThumb item={item} catalog={catalog} className="h-7 w-7 shrink-0" />
              <span className="min-w-0 flex-1 leading-snug">
                {name}
                <span className="flex flex-wrap items-center gap-x-2 text-2xs text-ink-soft tabular-nums">
                  <span>
                    {amount && <span className="inline-block whitespace-nowrap">{amount}・</span>}
                    <span className="inline-block">{Math.round(itemTotals(item, catalog).values.energyKcal)} kcal</span>
                  </span>
                  {arrangeable && (
                    <span className="rounded-full border border-coral/50 bg-white px-1.5 py-px leading-tight font-bold whitespace-nowrap text-coral-ink">
                      <span aria-hidden>✎ </span>
                      アレンジ
                    </span>
                  )}
                </span>
              </span>
              {!drink && !arrangeable && (
                <span aria-hidden className="text-xs text-coral-ink">
                  ✎
                </span>
              )}
            </button>
            {drink && cup && (
              <span className="flex shrink-0 max-[374px]:order-last max-[374px]:-mt-1.5 max-[374px]:w-full max-[374px]:justify-end">
                <button
                  type="button"
                  onClick={() => onDrink(slot, item, drinkAmount(drink, prevCount(count), cup))}
                  disabled={!canStepDown(count)}
                  className={STEP_BUTTON}
                  aria-label={`${name}を1${cup.unit}へらす`}
                >
                  −
                </button>
                <button type="button" onClick={() => onDrink(slot, item, drinkAmount(drink, nextCount(count), cup))} className={STEP_BUTTON} aria-label={`${name}を1${cup.unit}ふやす`}>
                  ＋
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => onRemove(slot, item.uid)}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-white lg:max-xl:w-9"
              aria-label={`${name}を外す`}
            >
              ×
            </button>
          </li>
        )
      })}
    </ul>
  )
}
