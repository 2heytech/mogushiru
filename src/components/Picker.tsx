import { useMemo, useState } from 'react'
import type { Catalog } from '../domain/nutrition'
import { rankAcross, rankAndFilter } from '../domain/search'
import type { DishCategory, MenuItem, Slot } from '../domain/types'
import { dishImage, menuItemImage } from './illustration'
import { DISH_CATEGORY_LABEL, FOOD_GROUP_EMOJI, PRODUCT_CATEGORY_EMOJI, PRODUCT_CATEGORY_LAST, SLOT_LABEL } from './labels'

type Kind = 'dish' | 'product' | 'food' | 'myDish'
type Tab = 'all' | Kind

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'dish', label: '料理' },
  { id: 'product', label: '市販品' },
  { id: 'food', label: '食材' },
  { id: 'myDish', label: 'マイ料理' },
]

// 横断検索での種類の並び（料理を優先。市販品は数が多いので食材の後）
const KIND_ORDER: Kind[] = ['myDish', 'dish', 'food', 'product']

const KIND_BADGE: Record<Kind, { label: string; className: string }> = {
  dish: { label: '料理', className: 'bg-coral text-white' },
  myDish: { label: 'マイ料理', className: 'bg-coral-dark text-white' },
  product: { label: '市販品', className: 'bg-fat/70 text-ink' },
  food: { label: '食材', className: 'bg-carb/70 text-ink' },
}

type Card = { key: string; kind: Kind; name: string; sub: string; kcal: number | null; image?: string; emoji?: string; item: Omit<MenuItem, 'uid'> }
type Entry = { card: Card; fields: (string | undefined)[] }

const MAX_CARDS = 60

const PLACEHOLDER: Record<Tab, string> = {
  all: '料理・市販品・食材をさがす',
  dish: '料理をさがす',
  product: '商品名・メーカーでさがす',
  food: '食材名で検索（例：たまご）',
  myDish: 'マイ料理をさがす',
}

type Filter = { catalog: Catalog; slot: Slot; query: string; category: string; showAlcohol: boolean }

// 種類ごとの候補（検索前）。並びは検索語が空のときの表示順
function entries(kind: Kind, { catalog, slot, query, category, showAlcohol }: Filter): Entry[] {
  switch (kind) {
    case 'dish':
      return [...catalog.dishes.values()]
        .filter((d) => showAlcohol || d.category !== 'alcohol')
        .filter((d) => category === 'all' || d.category === category)
        // 選んでいる区分に合う料理を先に（検索中は一致の度合いが優先）
        .sort((a, b) => Number(b.suggestedSlots.includes(slot)) - Number(a.suggestedSlots.includes(slot)))
        .map((d) => ({
          fields: [d.name, d.kana],
          card: {
            key: `dish:${d.id}`,
            kind,
            name: d.name,
            sub: DISH_CATEGORY_LABEL[d.category],
            kcal: d.nutrients.energyKcal,
            image: dishImage(d),
            item: { kind: 'dish', refId: d.id, portion: 1 },
          },
        }))
    case 'product':
      return [...catalog.products.values()]
        .filter((p) => showAlcohol || p.category !== 'alcohol')
        .filter((p) => (category === 'all' ? Boolean(query) || !PRODUCT_CATEGORY_LAST.includes(p.category) : p.category === category))
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
      // 食材は数が多いので、検索したときだけ出す
      if (!query) return []
      return [...catalog.foods.values()].map((f) => ({
        fields: [f.displayName, f.kana, f.name],
        card: {
          key: `food:${f.id}`,
          kind,
          name: f.displayName,
          sub: '100g',
          kcal: f.per100g.energyKcal,
          emoji: FOOD_GROUP_EMOJI[f.group],
          item: { kind: 'food', refId: f.id, portion: 100 },
        },
      }))
    case 'myDish':
      return [...catalog.myDishes.values()].map((d) => {
        const item = { kind: 'myDish', refId: d.id, portion: 1 } as const
        return {
          fields: [d.name],
          card: { key: `myDish:${d.id}`, kind, name: d.name, sub: 'マイ料理', kcal: null, image: menuItemImage({ uid: '', ...item }, catalog), item },
        }
      })
  }
}

function buildCards(tab: Tab, filter: Filter): Card[] {
  if (tab === 'all') {
    // 検索前は料理（マイ料理を含む）だけを並べ、検索したら市販品・食材もまとめて出す
    const kinds: Kind[] = filter.query ? KIND_ORDER : ['myDish', 'dish']
    const groups = kinds.map((k) => ({ items: entries(k, { ...filter, category: 'all' }), fields: (e: Entry) => e.fields }))
    return rankAcross(groups, filter.query).map((e) => e.card)
  }
  return rankAndFilter(entries(tab, filter), filter.query, (e) => e.fields).map((e) => e.card)
}

export function Picker({
  slot,
  catalog,
  productCategories,
  showAlcohol,
  onPick,
  onClose,
}: {
  slot: Slot
  catalog: Catalog
  productCategories: Record<string, string>
  showAlcohol: boolean
  onPick: (item: Omit<MenuItem, 'uid'>) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>('all')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const cards = useMemo(
    () => buildCards(tab, { catalog, slot, query, category, showAlcohol }),
    [tab, catalog, slot, query, category, showAlcohol],
  )
  // 検索中は、種類ごとの件数をタブに出す
  const counts = useMemo(() => {
    if (!query) return null
    const all = buildCards('all', { catalog, slot, query, category: 'all', showAlcohol })
    const n: Record<Tab, number> = { all: all.length, dish: 0, product: 0, food: 0, myDish: 0 }
    for (const c of all) n[c.kind]++
    return n
  }, [catalog, slot, query, showAlcohol])
  const dishCategories = (Object.keys(DISH_CATEGORY_LABEL) as DishCategory[]).filter((c) => showAlcohol || c !== 'alcohol')
  const productCategoryIds = Object.keys(productCategories)
    .filter((c) => showAlcohol || c !== 'alcohol')
    .sort((a, b) => Number(PRODUCT_CATEGORY_LAST.includes(a)) - Number(PRODUCT_CATEGORY_LAST.includes(b)))
  const chips: { id: string; label: string }[] =
    tab === 'dish'
      ? dishCategories.map((c) => ({ id: c, label: DISH_CATEGORY_LABEL[c] }))
      : tab === 'product'
        ? productCategoryIds.map((c) => ({ id: c, label: productCategories[c] }))
        : []
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
        className="flex max-h-[85vh] w-full flex-col rounded-t-[var(--radius-card)] bg-cream p-4 shadow-xl md:max-w-3xl md:rounded-[var(--radius-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex items-center justify-between">
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
        <div className="-mx-1 overflow-y-auto px-1">
          {cards.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-soft">
              {tab === 'food' && !query ? '食材名を入力してください' : tab === 'myDish' && !query ? 'まだマイ料理はありません' : '見つかりませんでした'}
            </p>
          ) : (
            <>
              {tab === 'all' && !query && <p className="mb-2 text-xs text-ink-soft">料理・市販品・食材をまとめてさがせます</p>}
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {cards.slice(0, MAX_CARDS).map((c) => (
                  <li key={c.key}>
                    <button
                      type="button"
                      onClick={() => onPick(c.item)}
                      className="group relative flex h-full w-full flex-col items-center rounded-2xl bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      {tab === 'all' && query && (
                        <span className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${KIND_BADGE[c.kind].className}`}>
                          {KIND_BADGE[c.kind].label}
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
                  </li>
                ))}
              </ul>
            </>
          )}
          {cards.length > MAX_CARDS && <p className="py-3 text-center text-xs text-ink-soft">ほか {cards.length - MAX_CARDS} 件。検索でしぼりこめます</p>}
        </div>
      </div>
    </div>
  )
}
