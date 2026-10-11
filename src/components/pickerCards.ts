import type { Catalog } from '../domain/nutrition'
import { FOOD_PORTION, isPopular, NOT_POPULAR, popularRank } from '../domain/popular'
import { rankAcross, rankAndFilter } from '../domain/search'
import { isSupplement, SUPPLEMENT_MAIN_KEYS } from '../domain/supplement'
import { formatPortion, prioritizedIn } from '../domain/customize'
import type { Ingredient, MenuItem, Product, Slot } from '../domain/types'
import { recentMyDishes } from '../store/useAppStore'
import { dishImage, menuItemImage } from './illustration'
import { DISH_CATEGORY_LABEL, FOOD_GROUP_EMOJI, PRODUCT_CATEGORY_EMOJI, PRODUCT_CATEGORY_LAST, shortNutrientLabel } from './labels'

// 料理をえらぶ画面のカードを作る（種類ごとの候補と並び）
export type Kind = 'dish' | 'product' | 'food' | 'myDish' | 'supplement'
export type Tab = 'all' | Kind

// 横断検索での種類の並び（料理を優先。市販品は数が多いので食材の後）
const KIND_ORDER: Kind[] = ['myDish', 'dish', 'food', 'product', 'supplement']

export type Card = { key: string; kind: Kind; name: string; sub: string; kcal: number | null; image?: string; emoji?: string; item: Omit<MenuItem, 'uid'> }
export type Entry = { card: Card; fields: (string | undefined)[] }

// 料理の絞り込みの「郷土料理」（農水省「うちの郷土料理」をもとにした料理）
export const KYODO = 'kyodo'

export type Filter = { catalog: Catalog; slot: Slot; query: string; category: string; showAlcohol: boolean; favorites: Set<string> }

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
        .filter((p) => !isSupplement(p))
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
    case 'supplement':
      return [...catalog.products.values()].filter(isSupplement).map((p) => ({
        fields: [p.name, p.brand],
        card: {
          key: `supplement:${p.jan}`,
          kind,
          name: p.name,
          sub: supplementSub(p),
          kcal: null,
          emoji: '💊',
          item: { kind: 'supplement', refId: p.jan, portion: 1 },
        },
      }))
    case 'myDish':
      // カスタマイズした料理は、最後に保存したものから。保存したときの人前で追加する
      return recentMyDishes([...catalog.myDishes.values()]).map((d) => {
        const portion = d.portion ?? 1
        const item = { kind: 'myDish', refId: d.id, portion } as const
        return {
          fields: [d.name],
          card: {
            key: `myDish:${d.id}`,
            kind,
            name: d.name,
            sub: portion === 1 ? 'カスタマイズ' : `カスタマイズ・${formatPortion(portion)}`,
            kcal: myDishKcal(d.ingredients, catalog) * portion,
            image: menuItemImage({ uid: '', ...item }, catalog),
            item,
          },
        }
      })
  }
}

function myDishKcal(ingredients: Ingredient[], catalog: Catalog): number {
  return ingredients.reduce((sum, i) => sum + ((catalog.foods.get(i.foodId)?.per100g.energyKcal ?? 0) * i.grams) / 100, 0)
}

// サプリのカードの説明：1回分の量と、入っている主な成分
function supplementSub(p: Product): string {
  const has = SUPPLEMENT_MAIN_KEYS.filter((k) => (p.nutrients[k] ?? 0) > 0).map((k) => shortNutrientLabel(k))
  const parts = has.length > 3 ? [...has.slice(0, 3), 'など'] : has
  return [p.servingLabel, parts.join('・')].filter(Boolean).join('・')
}

// お気に入りタブ：アレンジして保存した料理と、お気に入りの市販品（登録したものを含む）
function favoriteEntries(filter: Filter): Entry[] {
  return [...entries('myDish', filter), ...entries('product', { ...filter, category: 'favorite' })]
}

// この区分で上に出すカスタマイズした料理か
const prioritized = (filter: Filter, card: Card) => {
  const my = card.kind === 'myDish' ? filter.catalog.myDishes.get(card.item.refId) : undefined
  return Boolean(my && prioritizedIn(my, filter.slot))
}

// カスタマイズした料理は、この区分で保存したものを定番より上に。ほかの区分のものは定番の後に
const pickRank = (filter: Filter, card: Card) =>
  card.kind === 'myDish' ? (prioritized(filter, card) ? -1 : NOT_POPULAR - 1) : popularRank(filter.slot, card.key)

// カスタマイズした料理を、この区分で上に出すもの → ほか の順に（それぞれの中は新しい順のまま）
const myDishesFirst = (filter: Filter, xs: Entry[]) => [...xs].sort((a, b) => Number(prioritized(filter, b.card)) - Number(prioritized(filter, a.card)))

export function buildCards(tab: Tab, filter: Filter): Card[] {
  if (tab === 'myDish') return rankAndFilter(myDishesFirst(filter, favoriteEntries(filter)), filter.query, (e) => e.fields).map((e) => e.card)
  if (tab === 'all') {
    // 検索前は料理（お気に入りの料理を含む）と、その区分でよく食べられる食材を、よく食べられる順に並べる。
    // 検索したら市販品・食材もまとめて出す
    const kinds: Kind[] = filter.query ? KIND_ORDER : ['myDish', 'dish', 'food']
    const groups = kinds.map((k) => ({ items: entries(k, { ...filter, category: 'all' }), fields: (e: Entry) => e.fields }))
    const ranked = rankAcross(groups, filter.query)
    // カスタマイズした料理は定番より上に（並べ替えは安定なので、その中は新しい順のまま）
    if (!filter.query) ranked.sort((a, b) => pickRank(filter, a.card) - pickRank(filter, b.card))
    return ranked.map((e) => e.card)
  }
  // 料理タブでも、この区分のカスタマイズした料理を先頭に、ほかの区分のものは最後に（絞り込みが「すべて」のとき）
  if (tab === 'dish' && filter.category === 'all') {
    const mine = entries('myDish', filter)
    const groups = [mine.filter((e) => prioritized(filter, e.card)), entries('dish', filter), mine.filter((e) => !prioritized(filter, e.card))]
    return rankAcross(groups.map((items) => ({ items, fields: (e: Entry) => e.fields })), filter.query).map((e) => e.card)
  }
  return rankAndFilter(entries(tab, filter), filter.query, (e) => e.fields).map((e) => e.card)
}
