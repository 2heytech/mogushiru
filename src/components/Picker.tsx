import { useEffect, useMemo, useRef, useState } from 'react'
import { itemTotals, type Catalog } from '../domain/nutrition'
import {
  canStepDown,
  drinkAmount,
  drinkAmountLabel,
  drinkCount,
  drinkCup,
  drinkSpec,
  findDrinkItem,
  formatCount,
  nextCount,
  pickCup,
  prevCount,
  type DrinkSpec,
  type RecentDrink,
} from '../domain/drinks'
import type { DishCategory, DrinkSize, MenuItem, Slot } from '../domain/types'
import { MY_PRODUCT_PREFIX } from '../store/useAppStore'
import { DISH_CATEGORY_LABEL, PRODUCT_CATEGORY_LAST, PRODUCT_STORES, SLOT_LABEL, STORE_FILTER_PREFIX } from './labels'
import { buildCards, cardSegments, drinkStripCards, KYODO, productStore, type Card, type Kind, type Tab } from './pickerCards'
import { UiIcon } from './UiIcon'
import { useDialog } from './useDialog'

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'dish', label: '料理' },
  { id: 'product', label: '市販品' },
  { id: 'food', label: '食材' },
  { id: 'myDish', label: 'お気に入り' },
  { id: 'supplement', label: 'サプリ' },
]

const KIND_BADGE: Record<Kind, { label: string; className: string }> = {
  dish: { label: '料理', className: 'bg-coral text-ink-strong' },
  myDish: { label: 'お気に入り', className: 'bg-coral-dark text-ink-strong' },
  product: { label: '市販品', className: 'bg-fat/70 text-ink' },
  food: { label: '食材', className: 'bg-carb/70 text-ink' },
  supplement: { label: 'サプリ', className: 'bg-protein/70 text-ink' },
}

const MAX_CARDS = 60
// リストにないものを自分で登録するボタン（点線の枠）
const REGISTER_BUTTON = 'min-h-10 w-full shrink-0 rounded-full border-2 border-dashed border-coral/60 px-4 text-sm font-bold text-coral-ink hover:bg-coral/10'

const PLACEHOLDER: Record<Tab, string> = {
  all: '料理・市販品・食材をさがす',
  dish: '料理をさがす',
  product: '商品名・メーカーでさがす',
  food: '食材名で検索（例：たまご）',
  myDish: 'お気に入りをさがす',
  supplement: '登録したサプリをさがす',
}


// 飲み物のカードの、いまの杯数（この区分に入っていなければ count は 0）
type DrinkState = { spec: DrinkSpec; item?: MenuItem; cup: DrinkSize; count: number }

// −ボタン（飲み物を1杯へらす。1杯のときは外す）
const MINUS_BUTTON = 'grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ink/15 bg-white text-lg leading-none font-bold text-ink shadow-sm hover:bg-cream'

export function Picker({
  slot,
  items,
  recentDrinks,
  catalog,
  productCategories,
  storesLoaded = true,
  showAlcohol,
  favoriteProductIds,
  onToggleFavorite,
  onRegisterProduct,
  onRegisterSupplement,
  onOpenIdeal,
  onPick,
  onUnpick,
  onDrink,
  onRememberDrink,
  onClose,
}: {
  slot: Slot
  // いまこの区分に入っているもの（飲み物の杯数を出すため）
  items: MenuItem[]
  // 最近入れた飲み物（「飲み物」の列で先に出し、前と同じ1杯の量で入れる）
  recentDrinks: RecentDrink[]
  catalog: Catalog
  productCategories: Record<string, string>
  // コンビニ・メーカーの商品を読み終えたか（読み込み中はそう出す）
  storesLoaded?: boolean
  showAlcohol: boolean
  favoriteProductIds: string[]
  onToggleFavorite: (jan: string) => void
  // データにない市販品を栄養成分表示から登録する
  onRegisterProduct: () => void
  // サプリをラベルの値から登録する
  onRegisterSupplement: () => void
  // 理想の献立から、この区分の1食だけを呼び出す画面をひらく（朝・昼・晩だけ。その他にはない）
  onOpenIdeal?: () => void
  // 追加して、献立に入った項目の uid を返す
  onPick: (item: Omit<MenuItem, 'uid'>) => string
  // この画面で追加したものを外す（もう一度押したとき）
  onUnpick: (uid: string) => void
  // 飲み物の杯数・1杯の量を変える
  onDrink: (uid: string, amount: Pick<MenuItem, 'portion' | 'cup'>) => void
  // 入れた飲み物を「最近の飲み物」として覚える
  onRememberDrink: (key: string, cup?: DrinkSize) => void
  onClose: () => void
}) {
  const dialogRef = useDialog(onClose)
  const [tab, setTab] = useState<Tab>('all')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const favorites = useMemo(() => new Set(favoriteProductIds), [favoriteProductIds])
  const cards = useMemo(
    () => buildCards(tab, { catalog, slot, query, category, showAlcohol, favorites }),
    [tab, catalog, slot, query, category, showAlcohol, favorites],
  )
  // 検索中は、種類ごとの件数をタブに出す
  const counts = useMemo(() => {
    if (!query) return null
    const filter = { catalog, slot, query, category: 'all', showAlcohol, favorites }
    // 「すべて」タブでは一覧と同じものなので作り直さない（「すべて」には絞り込みがなく category はいつも 'all'）
    const all = tab === 'all' ? cards : buildCards('all', filter)
    const n: Record<Tab, number> = { all: all.length, dish: 0, product: 0, food: 0, myDish: 0, supplement: 0 }
    for (const c of all) n[c.kind]++
    n.myDish = buildCards('myDish', filter).length
    n.dish = buildCards('dish', filter).length
    return n
  }, [tab, cards, catalog, slot, query, showAlcohol, favorites])
  // コンビニ各社の商品があれば、お店ごとの絞り込みを出す
  const hasStore = useMemo(() => new Set([...catalog.products.values()].map(productStore)), [catalog])
  const hasKyodo = useMemo(() => [...catalog.dishes.values()].some((d) => d.source), [catalog])
  const dishCategories = (Object.keys(DISH_CATEGORY_LABEL) as DishCategory[]).filter((c) => showAlcohol || c !== 'alcohol')
  const productCategoryIds = Object.keys(productCategories)
    .filter((c) => showAlcohol || c !== 'alcohol')
    .sort((a, b) => Number(PRODUCT_CATEGORY_LAST.includes(a)) - Number(PRODUCT_CATEGORY_LAST.includes(b)))
  const chips: { id: string; label: string }[] =
    tab === 'dish'
      ? [...dishCategories.map((c) => ({ id: c, label: DISH_CATEGORY_LABEL[c] })), ...(hasKyodo ? [{ id: KYODO, label: '郷土料理' }] : [])]
      : tab === 'product'
        ? [
            ...PRODUCT_STORES.filter((st) => hasStore.has(st.id)).map((st) => ({ id: `${STORE_FILTER_PREFIX}${st.id}`, label: st.label })),
            ...productCategoryIds.map((c) => ({ id: c, label: productCategories[c] })),
          ]
        : []
  // 種類や絞り込みを切り替えたら一覧の先頭から見せる（画面の大きさは中身によらず一定）
  const listRef = useRef<HTMLDivElement>(null)
  const chipsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 })
    // 「ほかの飲み物」から来たときなど、えらんだ絞り込みが見えるように
    chipsRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [tab, category])
  // 選んでも画面は閉じず、続けて選べる。もう一度押すと選択を外す。
  // 選んだカードに印を、下の帯に最後の操作と選んだ数を出す
  const [added, setAdded] = useState<Record<string, string>>({})
  const [lastAction, setLastAction] = useState<string | null>(null)
  const totalAdded = Object.keys(added).length
  // 飲み物は、押すたびに1杯ずつふやす（同じ飲み物がこの区分にあれば、その杯数を）。−で1杯へらし、1杯のときは外す
  const drinkState = (c: Card): DrinkState | null => {
    const spec = drinkSpec(c.item, catalog)
    if (!spec) return null
    const mine = added[c.key] ? items.find((i) => i.uid === added[c.key]) : undefined
    const remembered = recentDrinks.find((d) => d.key === c.key)?.cup
    const item = mine ?? findDrinkItem(items, c.item, remembered)
    return item ? { spec, item, cup: drinkCup(item, spec), count: drinkCount(item, spec) } : { spec, cup: pickCup(spec, remembered), count: 0 }
  }
  // 入れた飲み物はいまの量の、入れていなければ1杯のカロリー
  const drinkKcal = (c: Card, d: DrinkState) => itemTotals(d.item ?? { uid: '', ...c.item, ...drinkAmount(d.spec, 1, d.cup) }, catalog).values.energyKcal
  const drinkPlus = (c: Card, d: DrinkState) => {
    const name = d.spec.short ?? c.name
    const amount = drinkAmount(d.spec, d.item ? nextCount(d.count) : 1, d.cup)
    const label = drinkAmountLabel(d.cup, d.item ? nextCount(d.count) : 1)
    if (d.item) {
      onDrink(d.item.uid, amount)
      setAdded((a) => ({ ...a, [c.key]: d.item!.uid }))
      setLastAction(`「${name}」${label}`)
    } else {
      const { cup, ...rest } = amount
      const newUid = onPick({ ...c.item, ...rest, ...(cup ? { cup } : {}) })
      setAdded((a) => ({ ...a, [c.key]: newUid }))
      setLastAction(`「${name}」${label}を追加`)
    }
    onRememberDrink(c.key, amount.cup)
  }
  const drinkMinus = (c: Card, d: DrinkState) => {
    if (!d.item) return
    const name = d.spec.short ?? c.name
    if (canStepDown(d.count)) {
      onDrink(d.item.uid, drinkAmount(d.spec, prevCount(d.count), d.cup))
      setLastAction(`「${name}」${drinkAmountLabel(d.cup, prevCount(d.count))}`)
      return
    }
    onUnpick(d.item.uid)
    setAdded((a) => {
      const rest = { ...a }
      delete rest[c.key]
      return rest
    })
    setLastAction(`「${name}」を外しました`)
  }
  const pick = (c: Card) => {
    const d = drinkState(c)
    if (d) return drinkPlus(c, d)
    const uid = added[c.key]
    if (uid) {
      onUnpick(uid)
      setAdded((a) => {
        const rest = { ...a }
        delete rest[c.key]
        return rest
      })
      setLastAction(`「${c.name}」を外しました`)
    } else {
      const newUid = onPick(c.item)
      setAdded((a) => ({ ...a, [c.key]: newUid }))
      setLastAction(`「${c.name}」を追加`)
    }
  }
  const segments = useMemo(() => cardSegments(cards.slice(0, MAX_CARDS), tab, Boolean(query)), [cards, tab, query])
  // 「すべて」の上に出す飲み物の列（最近入れたもの → この区分の定番）。押すたびに並びが変わらないよう、ひらいたときの順で
  const [stripRecent] = useState(recentDrinks)
  const drinkStrip = useMemo(() => drinkStripCards({ catalog, slot, showAlcohol }, stripRecent), [catalog, slot, showAlcohol, stripRecent])
  const switchTab = (t: Tab) => {
    setTab(t)
    setCategory('all')
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end bg-ink/30 md:items-center md:justify-center" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`${SLOT_LABEL[slot]}に追加する料理をえらぶ`}
        className="outline-none flex h-[85dvh] w-full flex-col rounded-t-[var(--radius-card)] bg-cream p-4 shadow-xl md:h-[min(85dvh,760px)] md:max-w-3xl md:rounded-[var(--radius-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex shrink-0 items-center gap-2">
          <h2 className="mr-auto text-lg font-bold whitespace-nowrap">{SLOT_LABEL[slot]}に追加</h2>
          {/* 1品ずつえらぶかわりに、理想の献立のこの1食をまとめて入れる */}
          {onOpenIdeal && (
            <button
              type="button"
              onClick={onOpenIdeal}
              aria-haspopup="dialog"
              className="flex min-h-10 min-w-0 items-center gap-1 rounded-full border border-coral bg-white pr-3 pl-3 text-xs font-bold whitespace-nowrap text-coral-ink shadow-sm transition hover:bg-coral/10 min-[360px]:pl-2"
            >
              <UiIcon name="load" className="hidden h-6 w-6 shrink-0 min-[360px]:block" />
              理想の献立からえらぶ
            </button>
          )}
          <button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-white" aria-label="閉じる">
            ×
          </button>
        </div>
        <div className="mb-3 flex shrink-0 gap-0.5 rounded-full bg-white p-1 sm:gap-1" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => switchTab(t.id)}
              className={`min-h-10 flex-1 rounded-full px-0.5 text-xs leading-tight whitespace-nowrap sm:px-1 sm:text-sm ${tab === t.id ? 'bg-coral font-bold text-ink-strong' : 'text-ink-soft'}`}
            >
              {t.label}
              {counts && (
                <span className={`block text-2xs leading-tight ${tab === t.id ? 'text-ink-strong' : counts[t.id] === 0 ? 'text-ink-soft/60' : ''}`}>
                  {counts[t.id] > 999 ? '999+' : counts[t.id]}件
                </span>
              )}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={PLACEHOLDER[tab]}
          className="mb-3 min-h-11 w-full shrink-0 rounded-full border-2 border-white bg-white px-4 text-base outline-none focus:border-coral"
        />
        {chips.length > 0 && (
          <div ref={chipsRef} className="mb-3 flex shrink-0 gap-2 overflow-x-auto pb-1">
            {[{ id: 'all', label: tab === 'product' ? 'おすすめ' : 'すべて' }, ...chips].map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={category === c.id}
                onClick={() => setCategory(c.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-sm ${category === c.id ? 'bg-ink text-white' : 'bg-white'}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
        {(tab === 'myDish' || tab === 'product') && (
          <button type="button" onClick={onRegisterProduct} className={`mb-3 ${REGISTER_BUTTON}`}>
            ＋ リストにない市販品を登録する
          </button>
        )}
        {tab === 'supplement' && (
          <button type="button" onClick={onRegisterSupplement} className={`mb-3 ${REGISTER_BUTTON}`}>
            ＋ サプリを登録する
          </button>
        )}
        {!storesLoaded && (tab === 'product' || tab === 'myDish' || (tab === 'all' && query)) && (
          <p className="mb-2 shrink-0 text-xs text-ink-soft" role="status">
            コンビニ・メーカーの商品を読み込み中…
          </p>
        )}
        <div ref={listRef} className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {cards.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-soft">
              {tab === 'food' && !query
                ? '食材名を入力してください'
                : tab === 'myDish' && !query
                  ? 'まだお気に入りはありません。料理の材料をアレンジして保存するか、市販品に☆を付けると、ここに並びます'
                  : tab === 'supplement' && !query
                    ? 'まだサプリはありません。ふだん飲んでいるサプリを、ラベルの成分表示を見て登録すると、ここに並びます'
                    : '見つかりませんでした'}
            </p>
          ) : (
            <>
              {tab === 'all' && !query && drinkStrip.length > 0 && (
                <section aria-labelledby="picker-drinks" className="mb-4">
                  <div className="mb-1 flex items-baseline gap-2">
                    <h3 id="picker-drinks" className="shrink-0 text-sm font-bold">
                      飲み物
                    </h3>
                    <p className="mr-auto min-w-0 truncate text-xs text-ink-soft">押すたびに＋1杯</p>
                    <button
                      type="button"
                      onClick={() => {
                        setTab('dish')
                        setCategory('drink')
                      }}
                      className="shrink-0 text-xs font-bold whitespace-nowrap text-coral-ink underline underline-offset-2"
                    >
                      ほかの飲み物
                    </button>
                  </div>
                  <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pt-1 pb-2">
                    {drinkStrip.map((c) => {
                      const d = drinkState(c)!
                      const name = d.spec.short ?? c.name
                      return (
                        <li key={c.key} className="relative w-24 shrink-0">
                          <button
                            type="button"
                            onClick={() => drinkPlus(c, d)}
                            aria-label={d.count > 0 ? `${name}を1${d.cup.unit}ふやす（いま${drinkAmountLabel(d.cup, d.count)}）` : `${name}を${drinkAmountLabel(d.cup, 1)}追加`}
                            className={`flex h-full w-full flex-col items-center rounded-2xl bg-white px-1.5 pt-2 pb-1.5 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${d.count > 0 ? 'ring-2 ring-ok' : ''}`}
                          >
                            {c.image ? (
                              <img src={c.image} alt="" className="h-12 w-12 object-contain" loading="lazy" />
                            ) : (
                              <span className="grid h-12 w-12 place-items-center rounded-full bg-cream text-2xl" aria-hidden>
                                🥤
                              </span>
                            )}
                            <span className="mt-1 line-clamp-2 text-xs leading-snug font-bold">{name}</span>
                            <span className={`mt-auto pt-0.5 text-2xs tabular-nums ${d.count > 0 ? 'font-bold text-ok-ink' : 'text-ink-soft'}`}>
                              {d.count > 0 ? drinkAmountLabel(d.cup, d.count) : `＋${drinkAmountLabel(d.cup, 1)}`}
                            </span>
                          </button>
                          {d.count > 0 && (
                            <button type="button" onClick={() => drinkMinus(c, d)} aria-label={`${name}を1${d.cup.unit}へらす`} className={`absolute -top-1 -left-1 ${MINUS_BUTTON}`}>
                              −
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}
              {tab === 'all' && !query && <p className="mb-2 text-xs text-ink-soft">料理・市販品・食材をまとめてさがせます</p>}
              {segments.map((seg, si) =>
                seg.row ? (
                  // 市販品・食材は絵が種類ごとの共通なので、名前を全部読める1行ずつの並びに
                  <ul key={si} className="mb-3 grid grid-cols-1 gap-1.5 md:grid-cols-2">
                    {seg.cards.map((c) => {
                      const star = c.kind === 'product' && !c.item.refId.startsWith(MY_PRODUCT_PREFIX)
                      const d = drinkState(c)
                      const on = d ? d.count > 0 : Boolean(added[c.key])
                      return (
                        <li key={c.key} className={`flex items-center rounded-2xl bg-white shadow-sm ${on ? 'ring-2 ring-ok' : ''}`}>
                          <button
                            type="button"
                            onClick={() => pick(c)}
                            aria-pressed={d ? undefined : on}
                            aria-label={d && d.count > 0 ? `${c.name}を1${d.cup.unit}ふやす（いま${drinkAmountLabel(d.cup, d.count)}）` : undefined}
                            className="flex min-h-14 min-w-0 flex-1 items-center gap-2.5 py-1.5 pr-1 pl-2.5 text-left"
                          >
                            {c.image ? (
                              <img src={c.image} alt="" className="h-10 w-10 shrink-0 object-contain" loading="lazy" />
                            ) : (
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream text-lg" aria-hidden>
                                🍽️
                              </span>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-2 text-sm leading-snug font-bold">{c.name}</span>
                              <span className="mt-0.5 block truncate text-xs text-ink-soft">
                                {tab === 'all' && query && <span className={`mr-1.5 rounded-full px-1.5 py-px text-2xs font-bold ${KIND_BADGE[c.kind].className}`}>{KIND_BADGE[c.kind].label}</span>}
                                {c.sub}
                              </span>
                            </span>
                            {d && d.count > 0 ? (
                              <span className="shrink-0 rounded-full bg-ok/25 px-2 py-0.5 text-2xs font-bold whitespace-nowrap text-ok-ink tabular-nums">
                                ✓ {formatCount(d.count)}
                                {d.cup.unit}
                              </span>
                            ) : added[c.key] ? (
                              <span className="shrink-0 rounded-full bg-ok/25 px-2 py-0.5 text-2xs font-bold whitespace-nowrap text-ok-ink">✓ 追加</span>
                            ) : (
                              c.kcal !== null && (
                                <span className="shrink-0 text-right text-sm font-bold whitespace-nowrap tabular-nums">
                                  {Math.round(c.kcal)}
                                  <span className="ml-0.5 text-2xs font-normal text-ink-soft">kcal</span>
                                </span>
                              )
                            )}
                          </button>
                          {d && d.count > 0 && (
                            <button type="button" onClick={() => drinkMinus(c, d)} aria-label={`${c.name}を1${d.cup.unit}へらす`} className={`ml-1 ${MINUS_BUTTON}`}>
                              −
                            </button>
                          )}
                          {star ? (
                            <button
                              type="button"
                              aria-pressed={favorites.has(c.item.refId)}
                              aria-label={`${c.name}をお気に入り${favorites.has(c.item.refId) ? 'から外す' : 'に追加'}`}
                              onClick={() => onToggleFavorite(c.item.refId)}
                              className={`grid h-11 w-10 shrink-0 place-items-center rounded-full text-lg ${favorites.has(c.item.refId) ? 'text-fat' : 'text-ink-soft/50 hover:text-fat'}`}
                            >
                              {favorites.has(c.item.refId) ? '★' : '☆'}
                            </button>
                          ) : (
                            <span className="w-2.5 shrink-0" />
                          )}
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <ul key={si} className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {seg.cards.map((c) => {
                      const d = drinkState(c)
                      const on = d ? d.count > 0 : Boolean(added[c.key])
                      return (
                        <li key={c.key} className="relative">
                          <button
                            type="button"
                            onClick={() => pick(c)}
                            aria-pressed={d ? undefined : on}
                            aria-label={d && d.count > 0 ? `${c.name}を1${d.cup.unit}ふやす（いま${drinkAmountLabel(d.cup, d.count)}）` : undefined}
                            className={`group relative flex h-full w-full flex-col items-center rounded-2xl bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${on ? 'ring-2 ring-ok' : ''}`}
                          >
                            {/* 飲み物を入れたら、左上は−ボタンにする */}
                            {tab === 'all' && query && !(d && d.count > 0) && (
                              <span className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-2xs font-bold ${KIND_BADGE[c.kind].className}`}>
                                {KIND_BADGE[c.kind].label}
                              </span>
                            )}
                            {on && (
                              <span className="absolute top-2 right-2 rounded-full bg-ok px-2 py-0.5 text-2xs font-bold text-ink-strong tabular-nums">
                                {d ? `✓ ${formatCount(d.count)}${d.cup.unit}` : '✓ 追加'}
                              </span>
                            )}
                            {c.image ? (
                              <img src={c.image} alt="" className="mb-2 h-20 w-20 object-contain transition-transform group-hover:scale-110 group-hover:-rotate-3" loading="lazy" />
                            ) : (
                              <span className="mb-2 grid h-20 w-20 place-items-center rounded-full bg-cream text-3xl" aria-hidden>
                                🍽️
                              </span>
                            )}
                            <span className="line-clamp-2 text-sm font-bold">{d?.spec.short ?? c.name}</span>
                            {d ? (
                              // 飲み物は量（入れたらいまの量）とそのカロリー
                              <span className={`mt-1 text-xs tabular-nums ${d.count > 0 ? 'font-bold text-ok-ink' : 'text-ink-soft'}`}>
                                {drinkAmountLabel(d.cup, d.count || 1)}
                                {' ・ '}
                                <span className="inline-block">{Math.round(drinkKcal(c, d))}kcal</span>
                              </span>
                            ) : (
                              <span className="mt-1 text-xs text-ink-soft">
                                {c.sub}
                                {c.kcal !== null && (
                                  <>
                                    {' ・ '}
                                    <span className="inline-block">{Math.round(c.kcal)}kcal</span>
                                  </>
                                )}
                              </span>
                            )}
                          </button>
                          {d && d.count > 0 && (
                            <button type="button" onClick={() => drinkMinus(c, d)} aria-label={`${c.name}を1${d.cup.unit}へらす`} className={`absolute top-1.5 left-1.5 ${MINUS_BUTTON}`}>
                              −
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                ),
              )}
            </>
          )}
          {cards.length > MAX_CARDS && <p className="py-3 text-center text-xs text-ink-soft">ほか {cards.length - MAX_CARDS} 件。検索でしぼりこめます</p>}
          {/* まとめてさがしたときは、結果を先に見せて、登録はそのあとに置く */}
          {tab === 'all' && query && (
            <button type="button" onClick={onRegisterProduct} className={`mt-3 mb-1 ${REGISTER_BUTTON}`}>
              ＋ リストにない市販品を登録する
            </button>
          )}
        </div>
        <footer className="mt-3 flex shrink-0 items-center gap-3">
          <p className="line-clamp-2 min-w-0 flex-1 text-sm leading-snug text-ink-soft" aria-live="polite">
            {lastAction ? (
              `${lastAction}（${totalAdded}品）`
            ) : (
              <>
                <span className="inline-block">タップで追加、</span>
                <span className="inline-block">もう一度で取り消し</span>
              </>
            )}
          </p>
          <button type="button" onClick={onClose} className="min-h-11 shrink-0 rounded-full bg-coral px-6 text-sm font-bold text-ink-strong hover:bg-coral-dark">
            {totalAdded > 0 ? 'できた' : '閉じる'}
          </button>
        </footer>
      </div>
    </div>
  )
}
