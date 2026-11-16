import type { Catalog } from '../domain/nutrition'
import { mealFirstRank } from '../domain/popular'
import { representativeProducts } from '../domain/productGroups'
import { familiarFoodIds, NAMED_FOOD_IDS } from '../domain/ranking'
import { normalizeForSearch, ranker } from '../domain/search'
import { servingFor } from '../domain/serving'
import { isSupplement } from '../domain/supplement'
import type { Food, MenuItem, Product } from '../domain/types'
import { MY_PRODUCT_PREFIX, recentMyDishes } from '../store/useAppStore'
import { foodImage } from './illustration'
import { dishCard, myDishCard, productCard, type Card } from './pickerCards'

// 「食品を調べる」の「名前でさがす」：食材・料理・市販品を名前でさがして、その栄養素を見る。
// 料理をえらぶ画面（pickerCards.ts）とちがって、どの食事に入れるかは決めずにさがすので、並びは区分によらない

export type LookupKind = 'food' | 'dish' | 'product'
export const LOOKUP_KINDS: LookupKind[] = ['food', 'dish', 'product']
export const LOOKUP_KIND_LABEL: Record<LookupKind, string> = { food: '食材', dish: '料理', product: '市販品' }

export type LookupSection = { kind: LookupKind; cards: Card[] }

// 栄養素を見る食品と量（1日の食事の項目と同じ形。量は MenuItem.portion と同じ決まり）
export type LookupItem = Omit<MenuItem, 'uid'>

// 画面に出せるか（データの更新でなくなった市販品などは出さない）
export function lookupItemExists(item: LookupItem, catalog: Catalog): boolean {
  if (item.kind === 'food') return catalog.foods.has(item.refId)
  if (item.kind === 'dish') return catalog.dishes.has(item.refId)
  if (item.kind === 'myDish') return catalog.myDishes.has(item.refId)
  return catalog.products.has(item.refId)
}

// 一致の度合い（search.ts の matchRank）：0 語と完全一致 / 1 語の先頭が一致 / 2 語の途中に含まれる
type Rank = (...fields: (string | undefined)[]) => number | null
const PREFIX = 1

type Hit = { card: Card; rank: number }

// 候補のかたまり。検索語に一致したものを、元の並びのまま返す。
// カードは一致したものだけ作る（食材は全部で2,538、市販品は2万近くあるので、さがす前に全部は作らない）
type LookupGroup = (rank: Rank) => Hit[]

// 種類ごとの候補を、先に並べるかたまりから順に持つ（食材なら、ふだんの呼び名のあるもの → 料理に使うもの → そのほか）
export type LookupIndex = Record<LookupKind, LookupGroup[]>

function group<T>(items: T[], fields: (x: T) => (string | undefined)[], card: (x: T) => Card): LookupGroup {
  const entries = items.map((x) => ({ x, fields: fields(x) }))
  return (rank) =>
    entries.flatMap((e) => {
      const r = rank(...e.fields)
      return r === null ? [] : [{ card: card(e.x), rank: r }]
    })
}

// 市販品は、箱売りや地域ちがいの同じ商品を1つにまとめる（料理をえらぶ画面と同じ。一致したものの中でまとめる）
function productGroup(items: Product[]): LookupGroup {
  return (rank) => {
    const matched = items.filter((p) => rank(p.name, p.brand) !== null)
    return representativeProducts(matched).map((p) => ({ card: productCard(p), rank: rank(p.name, p.brand)! }))
  }
}

// 食材は、ランキングと同じ「1回に食べる量」で出す
export function foodCard(f: Food): Card {
  const serving = servingFor(f)
  return {
    key: `food:${f.id}`,
    kind: 'food',
    name: f.displayName,
    sub: `${serving.label}（${serving.grams}g）`,
    kcal: f.per100g.energyKcal === null ? null : (f.per100g.energyKcal * serving.grams) / 100,
    image: foodImage(f),
    item: { kind: 'food', refId: f.id, portion: serving.grams },
  }
}

// さがす前に1回だけ作る（文字を打つたびに作り直さない）
export function lookupIndex({ catalog, showAlcohol }: { catalog: Catalog; showAlcohol: boolean }): LookupIndex {
  // 食材：ふだんの呼び名を付けたもの → 料理の材料に使っているもの → そのほか（成分表の細かい分け方）の順
  const familiar = familiarFoodIds(catalog)
  const foods: Food[][] = [[], [], []]
  for (const f of catalog.foods.values()) foods[NAMED_FOOD_IDS.has(f.id) ? 0 : familiar.has(f.id) ? 1 : 2].push(f)

  // 料理：お気に入り（アレンジして保存した料理）→ 朝・昼・晩の定番 → そのほか。郷土料理は数が多いので基本の料理の後に
  const drinkable = (category?: string) => showAlcohol || category !== 'alcohol'
  const myDishes = recentMyDishes([...catalog.myDishes.values()]).filter((d) => drinkable(d.baseDishId ? catalog.dishes.get(d.baseDishId)?.category : undefined))
  const dishes = [...catalog.dishes.values()]
    .filter((d) => drinkable(d.category))
    .sort((a, b) => mealFirstRank(`dish:${a.id}`) - mealFirstRank(`dish:${b.id}`) || Number(Boolean(a.source)) - Number(Boolean(b.source)))

  // 市販品：自分で登録したもの → コンビニ・メーカーの商品。同じ商品が古いJANでも入っていることがあるので1回だけ
  const products = [...new Set(catalog.products.values())].filter((p) => !isSupplement(p) && drinkable(p.category))
  const mine = (p: Product) => p.jan.startsWith(MY_PRODUCT_PREFIX)

  return {
    food: foods.map((items) => group(items, (f) => [f.displayName, f.kana, f.name], foodCard)),
    dish: [
      group(
        myDishes,
        (d) => [d.name],
        (d) => myDishCard(d, catalog),
      ),
      group(dishes, (d) => [d.name, d.kana], dishCard),
    ],
    product: [productGroup(products.filter(mine)), productGroup(products.filter((p) => !mine(p)))],
  }
}

// 名前でさがす。一致したものがある種類だけを返す。
// 種類の中の並びは、かたまりの順 → 一致の度合い（語と完全一致 → 語の先頭が一致 → 語の途中に含まれる）→ 元の並び。
// 料理をえらぶ画面の検索（search.ts の rankAcross）は、短い言葉で先頭が一致するものがあれば途中の一致を出さないが、
// ここでは出す（「肉」で鶏むね肉、「いも」でじゃがいも、「パン」で食パンが見つかるように）。
// そのかわり、ふだんの呼び名のある食材を、成分表の細かい分け方の食材（「いのしし 肉 脂身つき 生」など）より先に並べる
export function searchLookup(index: LookupIndex, query: string): LookupSection[] {
  if (!normalizeForSearch(query)) return []
  const rank = ranker(query)
  const found = LOOKUP_KINDS.map((kind) => {
    const cards: Card[] = []
    let best = Infinity
    for (const find of index[kind]) {
      // 並べ替えは安定なので、同じ度合いなら元の並びのまま
      const hits = find(rank).sort((a, b) => a.rank - b.rank)
      for (const h of hits) cards.push(h.card)
      if (hits.length > 0) best = Math.min(best, hits[0].rank)
    }
    return { kind, cards, best }
  }).filter((s) => s.cards.length > 0)
  // 並びは 食材 → 料理 → 市販品。食材には途中の一致しかなく、料理には語の先頭からの一致があるときだけ、料理を先にする
  const food = found.find((s) => s.kind === 'food')
  const dish = found.find((s) => s.kind === 'dish')
  const dishFirst = Boolean(food && dish && dish.best <= PREFIX && food.best > PREFIX)
  const order: Record<LookupKind, number> = dishFirst ? { dish: 0, food: 1, product: 2 } : { food: 0, dish: 1, product: 2 }
  return found.sort((a, b) => order[a.kind] - order[b.kind]).map(({ kind, cards }) => ({ kind, cards }))
}
