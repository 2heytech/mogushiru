import { useEffect, useMemo, useRef, useState } from 'react'
import type { Catalog } from '../domain/nutrition'
import { FOOD_PORTION, isPopular, NOT_POPULAR, popularRank } from '../domain/popular'
import { rankAcross, rankAndFilter } from '../domain/search'
import type { DishCategory, MenuItem, Slot } from '../domain/types'
import { MY_PRODUCT_PREFIX } from '../store/useAppStore'
import { dishImage, menuItemImage } from './illustration'
import { DISH_CATEGORY_LABEL, FOOD_GROUP_EMOJI, PRODUCT_CATEGORY_EMOJI, PRODUCT_CATEGORY_LAST, SLOT_LABEL } from './labels'

type Kind = 'dish' | 'product' | 'food' | 'myDish'
type Tab = 'all' | Kind

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'dish', label: '料理' },
  { id: 'product', label: '市販品' },
  { id: 'food', label: '食材' },
  { id: 'myDish', label: 'お気に入り' },
]

// 横断検索での種類の並び（料理を優先。市販品は数が多いので食材の後）
const KIND_ORDER: Kind[] = ['myDish', 'dish', 'food', 'product']

const KIND_BADGE: Record<Kind, { label: string; className: string }> = {
  dish: { label: '料理', className: 'bg-coral text-white' },
  myDish: { label: 'お気に入り', className: 'bg-coral-dark text-white' },
  product: { label: '市販品', className: 'bg-fat/70 text-ink' },
  food: { label: '食材', className: 'bg-carb/70 text-ink' },
}

type Card = { key: string; kind: Kind; name: string; sub: string; kcal: number | null; image?: string; emoji?: string; item: Omit<MenuItem, 'uid'> }
type Entry = { card: Card; fields: (string | undefined)[] }

const MAX_CARDS = 60

// 料理の絞り込みの「郷土料理」（農水省「うちの郷土料理」をもとにした料理）
const KYODO = 'kyodo'

const PLACEHOLDER: Record<Tab, string> = {
  all: '料理・市販品・食材をさがす',
  dish: '料理をさがす',
  product: '商品名・メーカーでさがす',
  food: '食材名で検索（例：たまご）',
  myDish: 'お気に入りをさがす',
}

type Filter = { catalog: Catalog; slot: Slot; query: string; category: string; showAlcohol: boolean; favorites: Set<string> }

// 種類ごとの候補（検索前）。並びは検索語が空のときの表示順
function entries(kind: Kind, { catalog, slot, query, category, showAlcohol, favorites }: Filter): Entry[] {
  switch (kind) {
    case 'dish':
      return [...catalog.dishes.values()]
        .filter((d) => showAlcohol || d.category !== 'alcohol')
        .filter((d) => category === 'all' || (category === KYODO ? Boolean(d.source) : d.category === category))
        // その区分でよく食べられる料理 → 区分に合う料理 → その他 の順。郷土料理は数が多いので基本の料理の後に
        // （検索中は一致の度合いが優先で、同じ度合いならこの順）
        .sort(
          (a, b) =>
            popularRank(slot, `dish:${a.id}`) - popularRank(slot, `dish:${b.id}`) ||
            Number(b.suggestedSlots.includes(slot)) - Number(a.suggestedSlots.includes(slot)) ||
            Number(Boolean(a.source)) - Number(Boolean(b.source)),
        )
        .map((d) => ({
          fields: [d.name, d.kana],
          card: {
            key: `dish:${d.id}`,
            kind,
            name: d.name,
            sub: [DISH_CATEGORY_LABEL[d.category], d.source?.region].filter(Boolean).join('・'),
            kcal: d.nutrients.energyKcal,
            image: dishImage(d),
            item: { kind: 'dish', refId: d.id, portion: 1 },
          },
        }))
    case 'product':
      return [...catalog.products.values()]
        .filter((p) => showAlcohol || p.category !== 'alcohol')
        .filter((p) =>
          category === 'favorite'
            ? favorites.has(p.jan)
            : category === 'all'
              ? Boolean(query) || !PRODUCT_CATEGORY_LAST.includes(p.category)
              : p.category === category,
        )
        .map((p) => {
          // 1食量が分かれば1食分、分からなければ100g(mL)で追加する
          const grams = p.servingGrams ?? 100
          const per = p.basis === 'serving' ? 1 : grams / 100
          return {
            fields: [p.name, p.brand],
            card: {
              key: `product:${p.jan}`,
              kind,
              name: p.name,
              sub: [p.brand, p.basis === 'serving' ? '1食' : `${grams}${p.basis === '100ml' ? 'mL' : 'g'}`].filter(Boolean).join('・'),
              kcal: p.nutrients.energyKcal === null ? null : p.nutrients.energyKcal * per,
              emoji: PRODUCT_CATEGORY_EMOJI[p.category],
              item: { kind: 'product', refId: p.jan, portion: p.basis === 'serving' ? 1 : grams },
            },
          }
        })
    case 'food':
      // 食材は数が多いので、検索前はその区分でよく食べられるものだけ出す。
      // 検索中は、どれかの区分でよく食べられる食材を同じ一致度の中で前に
      return [...catalog.foods.values()]
        .filter((f) => query || popularRank(slot, `food:${f.id}`) < NOT_POPULAR)
        .sort((a, b) => (query ? Number(isPopular(`food:${b.id}`)) - Number(isPopular(`food:${a.id}`)) : popularRank(slot, `food:${a.id}`) - popularRank(slot, `food:${b.id}`)))
        .map((f) => {
          const portion = FOOD_PORTION[f.id]
          const grams = portion?.grams ?? 100
          return {
            fields: [f.displayName, f.kana, f.name],
            card: {
              key: `food:${f.id}`,
              kind,
              name: f.displayName,
              sub: portion ? `${portion.label}（${grams}g）` : '100g',
              kcal: f.per100g.energyKcal === null ? null : (f.per100g.energyKcal * grams) / 100,
              emoji: portion?.emoji ?? FOOD_GROUP_EMOJI[f.group],
              item: { kind: 'food', refId: f.id, portion: grams },
            },
          }
        })
    case 'myDish':
      return [...catalog.myDishes.values()].map((d) => {
        const item = { kind: 'myDish', refId: d.id, portion: 1 } as const
        return {
          fields: [d.name],
          card: { key: `myDish:${d.id}`, kind, name: d.name, sub: 'アレンジした料理', kcal: null, image: menuItemImage({ uid: '', ...item }, catalog), item },
        }
      })
  }
}

// お気に入りタブ：アレンジして保存した料理と、お気に入りの市販品（登録したものを含む）
function favoriteEntries(filter: Filter): Entry[] {
  return [...entries('myDish', filter), ...entries('product', { ...filter, category: 'favorite' })]
}

function buildCards(tab: Tab, filter: Filter): Card[] {
  if (tab === 'myDish') return rankAndFilter(favoriteEntries(filter), filter.query, (e) => e.fields).map((e) => e.card)
  if (tab === 'all') {
    // 検索前は料理（お気に入りの料理を含む）と、その区分でよく食べられる食材を、よく食べられる順に並べる。
    // 検索したら市販品・食材もまとめて出す
    const kinds: Kind[] = filter.query ? KIND_ORDER : ['myDish', 'dish', 'food']
    const groups = kinds.map((k) => ({ items: entries(k, { ...filter, category: 'all' }), fields: (e: Entry) => e.fields }))
    const ranked = rankAcross(groups, filter.query)
    if (!filter.query) ranked.sort((a, b) => popularRank(filter.slot, a.card.key) - popularRank(filter.slot, b.card.key))
    return ranked.map((e) => e.card)
  }
  return rankAndFilter(entries(tab, filter), filter.query, (e) => e.fields).map((e) => e.card)
}

export function Picker({
  slot,
  catalog,
  productCategories,
  showAlcohol,
  favoriteProductIds,
  onToggleFavorite,
  onRegisterProduct,
  onPick,
  onClose,
}: {
  slot: Slot
  catalog: Catalog
  productCategories: Record<string, string>
  showAlcohol: boolean
  favoriteProductIds: string[]
  onToggleFavorite: (jan: string) => void
  // データにない市販品を栄養成分表示から登録する
  onRegisterProduct: () => void
  onPick: (item: Omit<MenuItem, 'uid'>) => void
  onClose: () => void
}) {
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
    const all = buildCards('all', filter)
    const n: Record<Tab, number> = { all: all.length, dish: 0, product: 0, food: 0, myDish: 0 }
    for (const c of all) n[c.kind]++
    n.myDish = buildCards('myDish', filter).length
    return n
  }, [catalog, slot, query, showAlcohol, favorites])
  const hasKyodo = useMemo(() => [...catalog.dishes.values()].some((d) => d.source), [catalog])
  const dishCategories = (Object.keys(DISH_CATEGORY_LABEL) as DishCategory[]).filter((c) => showAlcohol || c !== 'alcohol')
  const productCategoryIds = Object.keys(productCategories)
    .filter((c) => showAlcohol || c !== 'alcohol')
    .sort((a, b) => Number(PRODUCT_CATEGORY_LAST.includes(a)) - Number(PRODUCT_CATEGORY_LAST.includes(b)))
  const chips: { id: string; label: string }[] =
    tab === 'dish'
      ? [...dishCategories.map((c) => ({ id: c, label: DISH_CATEGORY_LABEL[c] })), ...(hasKyodo ? [{ id: KYODO, label: '郷土料理' }] : [])]
      : tab === 'product'
        ? productCategoryIds.map((c) => ({ id: c, label: productCategories[c] }))
        : []
  // 種類や絞り込みを切り替えたら一覧の先頭から見せる（画面の大きさは中身によらず一定）
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 })
  }, [tab, category])
  // 選んでも画面は閉じず、続けて選べる。追加した数をカードに、最後に追加したものを下の帯に出す
  const [added, setAdded] = useState<Record<string, number>>({})
  const [lastAdded, setLastAdded] = useState<string | null>(null)
  const totalAdded = Object.values(added).reduce((a, b) => a + b, 0)
  const pick = (c: Card) => {
    onPick(c.item)
    setAdded((a) => ({ ...a, [c.key]: (a[c.key] ?? 0) + 1 }))
    setLastAdded(c.name)
  }
  const switchTab = (t: Tab) => {
    setTab(t)
    setCategory('all')
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end bg-ink/30 md:items-center md:justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${SLOT_LABEL[slot]}に追加する料理をえらぶ`}
        className="flex h-[85dvh] w-full flex-col rounded-t-[var(--radius-card)] bg-cream p-4 shadow-xl md:h-[min(85dvh,760px)] md:max-w-3xl md:rounded-[var(--radius-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex shrink-0 items-center justify-between">
          <h2 className="text-lg font-bold">{SLOT_LABEL[slot]}に追加</h2>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full hover:bg-white" aria-label="閉じる">
            ×
          </button>
        </header>
        <div className="mb-3 flex shrink-0 gap-1 rounded-full bg-white p-1" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => switchTab(t.id)}
              className={`min-h-10 flex-1 rounded-full px-1 text-sm leading-tight whitespace-nowrap ${tab === t.id ? 'bg-coral font-bold text-white' : 'text-ink-soft'}`}
            >
              {t.label}
              {counts && (
                <span className={`block text-[10px] ${tab === t.id ? 'text-white/90' : counts[t.id] === 0 ? 'text-ink-soft/60' : ''}`}>
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
          <div className="mb-3 flex shrink-0 gap-2 overflow-x-auto pb-1">
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
        {(tab === 'myDish' || tab === 'product' || (query && tab === 'all')) && (
          <button
            type="button"
            onClick={onRegisterProduct}
            className="mb-3 min-h-10 w-full shrink-0 rounded-full border-2 border-dashed border-coral/60 px-4 text-sm font-bold text-coral hover:bg-coral/10"
          >
            ＋ リストにない市販品を登録する
          </button>
        )}
        <div ref={listRef} className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {cards.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-soft">
              {tab === 'food' && !query
                ? '食材名を入力してください'
                : tab === 'myDish' && !query
                  ? 'まだお気に入りはありません。料理の材料をアレンジして保存するか、市販品に☆を付けると、ここに並びます'
                  : '見つかりませんでした'}
            </p>
          ) : (
            <>
              {tab === 'all' && !query && <p className="mb-2 text-xs text-ink-soft">料理・市販品・食材をまとめてさがせます</p>}
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {cards.slice(0, MAX_CARDS).map((c) => (
                  <li key={c.key} className="relative">
                    <button
                      type="button"
                      onClick={() => pick(c)}
                      className="group relative flex h-full w-full flex-col items-center rounded-2xl bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      {tab === 'all' && query && (
                        <span className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${KIND_BADGE[c.kind].className}`}>
                          {KIND_BADGE[c.kind].label}
                        </span>
                      )}
                      {added[c.key] && (
                        <span className={`absolute right-2 rounded-full bg-ok px-2 py-0.5 text-[11px] font-bold text-white ${c.kind === 'product' ? 'top-11' : 'top-2'}`}>
                          ✓ {added[c.key] > 1 ? `${added[c.key]}つ` : '追加'}
                        </span>
                      )}
                      {c.image ? (
                        <img src={c.image} alt="" className="mb-2 h-20 w-20 object-contain transition-transform group-hover:scale-110 group-hover:-rotate-3" loading="lazy" />
                      ) : (
                        <span className="mb-2 grid h-20 w-20 place-items-center rounded-full bg-cream text-3xl" aria-hidden>
                          {c.emoji ?? '🍽️'}
                        </span>
                      )}
                      <span className="line-clamp-2 text-sm font-bold">{c.name}</span>
                      <span className="mt-1 text-xs text-ink-soft">
                        {c.sub}
                        {c.kcal !== null && ` ・ ${Math.round(c.kcal)}kcal`}
                      </span>
                    </button>
                    {c.kind === 'product' && !c.item.refId.startsWith(MY_PRODUCT_PREFIX) && (
                      <button
                        type="button"
                        aria-pressed={favorites.has(c.item.refId)}
                        aria-label={`${c.name}をお気に入り${favorites.has(c.item.refId) ? 'から外す' : 'に追加'}`}
                        onClick={() => onToggleFavorite(c.item.refId)}
                        className={`absolute top-1 right-1 grid h-9 w-9 place-items-center rounded-full text-lg ${favorites.has(c.item.refId) ? 'text-fat' : 'text-ink-soft/50 hover:text-fat'}`}
                      >
                        {favorites.has(c.item.refId) ? '★' : '☆'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
          {cards.length > MAX_CARDS && <p className="py-3 text-center text-xs text-ink-soft">ほか {cards.length - MAX_CARDS} 件。検索でしぼりこめます</p>}
        </div>
        <footer className="mt-3 flex shrink-0 items-center gap-3">
          <p className="min-w-0 flex-1 truncate text-sm text-ink-soft" aria-live="polite">
            {lastAdded ? `「${lastAdded}」を追加（${totalAdded}品）` : 'タップで追加。続けて選べます'}
          </p>
          <button type="button" onClick={onClose} className="min-h-11 shrink-0 rounded-full bg-coral px-6 text-sm font-bold text-white hover:bg-coral-dark">
            {totalAdded > 0 ? 'できた' : '閉じる'}
          </button>
        </footer>
      </div>
    </div>
  )
}
