import { andQuery, matchLookup, parseLookupQuery, RANK_PREFIX, splitCandidates, type LookupQuery } from '../domain/lookupQuery'
import type { Catalog } from '../domain/nutrition'
import { mealFirstRank } from '../domain/popular'
import { representativeProducts } from '../domain/productGroups'
import { familiarFoodIds, FOOD_GROUP_LABEL, NAMED_FOOD_IDS } from '../domain/ranking'
import { servingFor } from '../domain/serving'
import { isSupplement } from '../domain/supplement'
import type { Dish, DishCategory, Food, MenuItem, Product } from '../domain/types'
import { MY_PRODUCT_PREFIX, recentMyDishes } from '../store/useAppStore'
import { categoryImage, foodImage } from './illustration'
import { DISH_CATEGORY_LABEL, PRODUCT_STORES } from './labels'
import { dishCard, myDishCard, productCard, productStore, type Card } from './pickerCards'

// 「食品を調べる」の「名前でさがす」：食材・料理・市販品を名前や種類でさがして、その栄養素を見る。
// 料理を選ぶ画面（pickerCards.ts）とちがって、どの食事に入れるかは決めずにさがすので、並びは区分によらない

export type LookupKind = 'food' | 'dish' | 'product'
export const LOOKUP_KINDS: LookupKind[] = ['food', 'dish', 'product']
export const LOOKUP_KIND_LABEL: Record<LookupKind, string> = { food: '食材', dish: '料理', product: '市販品' }

// 候補と、その種類の中の分け方（食材は食品群、料理は主食・主菜など、市販品は店・メーカー）
export type LookupHit = { card: Card; facet: string }
export type LookupSection = { kind: LookupKind; hits: LookupHit[] }
// split：入れた言葉そのままでは見つからず、2つの言葉に分けてさがしたとき、その2つ
export type LookupResult = { sections: LookupSection[]; split: [string, string] | null }

// 栄養素を見る食品と量（1日の食事の項目と同じ形。量は MenuItem.portion と同じ決まり）
export type LookupItem = Omit<MenuItem, 'uid'>

// 画面に出せるか（データの更新でなくなった市販品などは出さない）
export function lookupItemExists(item: Pick<LookupItem, 'kind' | 'refId'>, catalog: Catalog): boolean {
  if (item.kind === 'food') return catalog.foods.has(item.refId)
  if (item.kind === 'dish') return catalog.dishes.has(item.refId)
  if (item.kind === 'myDish') return catalog.myDishes.has(item.refId)
  return catalog.products.has(item.refId)
}

// ---- 種類の中の分け方 ----

const FACET_MY = 'my'
const FACET_OTHER = 'other'

// 食材：食品群。よく調べるものから（成分表の番号順ではなく）
const FOOD_FACETS = ['01', '11', '10', '12', '13', '04', '06', '07', '02', '08', '09', '05', '15', '16', '17', '14', '03', '18']
const DISH_FACETS: DishCategory[] = ['staple', 'main', 'side', 'soup', 'noodle', 'bowl', 'bread', 'snack', 'drink', 'alcohol']
// 市販品：コンビニ → スーパー → メーカー
const PRODUCT_FACETS = ['seven', 'famima', 'lawson', 'topvalu', 'maker']
const STORE_LABEL: Record<string, string> = Object.fromEntries(PRODUCT_STORES.map((s) => [s.id, s.label]))

export type LookupFacet = { id: string; label: string; image?: string }

// 種類ごとの分け方の一覧（並び順つき）。home：さがす前の「種類からさがす」に出すもの（お気に入り・そのほかは出さない）
export function lookupFacets(kind: LookupKind, { showAlcohol, home = false }: { showAlcohol: boolean; home?: boolean }): LookupFacet[] {
  if (kind === 'food') return FOOD_FACETS.map((id) => ({ id, label: FOOD_GROUP_LABEL[id], image: `/illustrations/food-group/${id}.svg` }))
  if (kind === 'dish') {
    const facets: LookupFacet[] = DISH_FACETS.filter((c) => showAlcohol || c !== 'alcohol').map((id) => ({ id, label: DISH_CATEGORY_LABEL[id], image: categoryImage(id) }))
    return home ? facets : [{ id: FACET_MY, label: 'お気に入り' }, ...facets]
  }
  const stores: LookupFacet[] = PRODUCT_FACETS.map((id) => ({ id, label: STORE_LABEL[id] ?? id }))
  return home ? stores : [{ id: FACET_MY, label: '登録した商品' }, ...stores, { id: FACET_OTHER, label: 'そのほか' }]
}

export function lookupFacetLabel(kind: LookupKind, facet: string): string {
  return lookupFacets(kind, { showAlcohol: true }).find((f) => f.id === facet)?.label ?? facet
}

// ---- 候補 ----

type Found = LookupHit & { rank: number; weak: boolean }

// 候補のかたまり。カードは、一致したもの・その分け方のものだけ作る（食材は全部で2,538、市販品は2万近くあるので、さがす前に全部は作らない）
type LookupGroup = {
  // 検索語に一致したものを、元の並びのまま返す
  find: (q: LookupQuery) => Found[]
  // その分け方のものを、元の並びのまま返す
  all: (facet: string) => LookupHit[]
}

// 種類ごとの候補を、先に並べるかたまりから順に持つ（食材なら、ふだんの呼び名のあるもの → 料理に使うもの → そのほか）
export type LookupIndex = {
  groups: Record<LookupKind, LookupGroup[]>
  // さがす前に出す「定番の食品」
  staples: Card[]
}

// かっこ・中黒で区切った語でもさがせるようにする（「ごはん（白米）」を「ごはん」「白米」でも。語と完全一致・先頭一致になる）
const BRACKETS = /[（）()［］[\]＜＞<>・]/g
const withParts = (name: string): string[] => {
  const parts = name.replace(BRACKETS, ' ')
  return parts === name ? [name] : [name, parts]
}

function group<T>(
  items: T[],
  // visible：画面に出る名前。readings：読みがな・別名・成分表の名前
  fields: (x: T) => { visible: (string | undefined)[]; readings?: (string | undefined)[] },
  facet: (x: T) => string,
  card: (x: T) => Card,
  // 一致したものの中で、同じものを1つにまとめる（市販品）
  dedupe?: (items: T[]) => T[],
): LookupGroup {
  const text = (list: (string | undefined)[] = []) => list.filter((s): s is string => Boolean(s))
  const entries = items.map((x) => {
    const f = fields(x)
    return { x, visible: text(f.visible).flatMap(withParts), readings: text(f.readings), facet: facet(x) }
  })
  const kept = <E extends { x: T }>(list: E[]): E[] => {
    if (!dedupe) return list
    const keep = new Set(dedupe(list.map((e) => e.x)))
    return list.filter((e) => keep.has(e.x))
  }
  return {
    find: (q) =>
      kept(
        entries.flatMap((e) => {
          const m = matchLookup(q, e.visible, e.readings)
          return m ? [{ x: e.x, facet: e.facet, ...m }] : []
        }),
      ).map(({ x, ...rest }) => ({ card: card(x), ...rest })),
    all: (facet) => kept(entries.filter((e) => e.facet === facet)).map((e) => ({ card: card(e.x), facet: e.facet })),
  }
}

// 食材は、ランキングと同じ「1回に食べる量」で出す。
// 同じ名前の料理（「納豆（1パック）」＝納豆45g＋しょうゆ3g）と見分けられるように、その食材だけの値であることを書く
export function foodCard(f: Food): Card {
  const serving = servingFor(f)
  return {
    key: `food:${f.id}`,
    kind: 'food',
    name: f.displayName,
    sub: `食材のみ・${serving.label}（${serving.grams}g）`,
    kcal: f.per100g.energyKcal === null ? null : (f.per100g.energyKcal * serving.grams) / 100,
    image: foodImage(f),
    item: { kind: 'food', refId: f.id, portion: serving.grams },
  }
}

// 材料が少ない料理（3つまで）は、何がどれだけ入っているかを書く（「納豆45g＋しょうゆ（濃口）3g」）。
// 食材そのものと名前が同じでも、調味料などが足してある分だけ値がちがうことが分かるように。材料の多い料理は、料理の種類のまま
const FEW_INGREDIENTS = 3
const gramsText = (g: number) => `${Number.isInteger(g) ? g : g.toFixed(1)}g`

export function dishIngredientsText(d: Dish, catalog: Pick<Catalog, 'foods'>): string | null {
  if (d.ingredients.length === 0 || d.ingredients.length > FEW_INGREDIENTS) return null
  const parts = d.ingredients.map((i) => {
    const food = catalog.foods.get(i.foodId)
    return food ? `${food.displayName}${gramsText(i.grams)}` : null
  })
  return parts.every((p): p is string => p !== null) ? parts.join('＋') : null
}

export function lookupDishCard(d: Dish, catalog: Pick<Catalog, 'foods'>): Card {
  const card = dishCard(d)
  const ingredients = dishIngredientsText(d, catalog)
  return ingredients ? { ...card, sub: [ingredients, card.sub].filter(Boolean).join('・') } : card
}

// さがす前に出す「定番の食品」（成分表の食品番号）：ごはん・食パン・卵・納豆・牛乳・ヨーグルト・バナナ・鶏むね肉・鮭・木綿豆腐・ブロッコリー・さつまいも
export const STAPLE_FOOD_IDS = ['01088', '01026', '12004', '04046', '13003', '13025', '07107', '11220', '10134', '04032', '06263', '02006']

// 最近見た食品などの「種類と番号」から、カードを作る（なくなったもの・サプリは null）
export function lookupCard(item: Pick<LookupItem, 'kind' | 'refId'>, catalog: Catalog): Card | null {
  if (item.kind === 'food') {
    const f = catalog.foods.get(item.refId)
    return f ? foodCard(f) : null
  }
  if (item.kind === 'dish') {
    const d = catalog.dishes.get(item.refId)
    return d ? lookupDishCard(d, catalog) : null
  }
  if (item.kind === 'myDish') {
    const d = catalog.myDishes.get(item.refId)
    return d ? myDishCard(d, catalog) : null
  }
  const p = catalog.products.get(item.refId)
  return p && !isSupplement(p) ? productCard(p) : null
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

  // 市販品：自分で登録したもの → コンビニ・メーカーの商品。同じ商品が古いJANでも入っていることがあるので1回だけ。
  // 箱売りや地域ちがいの同じ商品は1つにまとめる（料理を選ぶ画面と同じ。一致したものの中でまとめる）
  const products = [...new Set(catalog.products.values())].filter((p) => !isSupplement(p) && drinkable(p.category))
  const mine = (p: Product) => p.jan.startsWith(MY_PRODUCT_PREFIX)
  const productGroup = (items: Product[]) =>
    group(
      items,
      (p) => ({ visible: [p.name, p.brand] }),
      (p) => (mine(p) ? FACET_MY : (productStore(p) ?? FACET_OTHER)),
      productCard,
      representativeProducts,
    )

  return {
    groups: {
      food: foods.map((items) =>
        group(
          items,
          (f) => ({ visible: [f.displayName], readings: [f.kana, f.name] }),
          (f) => f.group,
          foodCard,
        ),
      ),
      dish: [
        group(
          myDishes,
          (d) => ({ visible: [d.name] }),
          () => FACET_MY,
          (d) => myDishCard(d, catalog),
        ),
        group(
          dishes,
          (d) => ({ visible: [d.name], readings: [d.kana] }),
          (d) => d.category,
          (d) => lookupDishCard(d, catalog),
        ),
      ],
      product: [productGroup(products.filter(mine)), productGroup(products.filter((p) => !mine(p)))],
    },
    staples: STAPLE_FOOD_IDS.flatMap((id) => {
      const f = catalog.foods.get(id)
      return f ? [foodCard(f)] : []
    }),
  }
}

type Ranked = LookupSection & { best: number }

function run(index: LookupIndex, q: LookupQuery): Ranked[] {
  return LOOKUP_KINDS.map((kind) => {
    const found = index.groups[kind].map((g) => g.find(q))
    // 短い言葉をカタカナ・漢字で入れたとき：先頭からの一致があれば、読みがなの途中にたまたま入っているだけのものは出さない
    const hasStrong = found.some((list) => list.some((h) => h.rank <= RANK_PREFIX))
    const hits: LookupHit[] = []
    let best = Infinity
    for (const list of found) {
      // 並べ替えは安定なので、同じ度合いなら元の並びのまま
      const sorted = (hasStrong ? list.filter((h) => !h.weak) : list).sort((a, b) => a.rank - b.rank)
      for (const { card, facet } of sorted) hits.push({ card, facet })
      if (sorted.length > 0) best = Math.min(best, sorted[0].rank)
    }
    return { kind, hits, best }
  }).filter((s) => s.hits.length > 0)
}

const NO_RESULT: LookupResult = { sections: [], split: null }

// 名前でさがす。一致したものがある種類だけを返す。
// 種類の中の並びは、かたまりの順 → 一致の度合い（語と完全一致 → 語の先頭 → 名前の途中 → 読みがなの途中だけ）→ 元の並び。
// 料理を選ぶ画面の検索（search.ts の rankAcross）は、短い言葉で先頭が一致するものがあれば途中の一致を出さないが、
// ここでは出す（「肉」で鶏むね肉、「いも」でじゃがいも、「パン」で食パンが見つかるように）。
// そのかわり、ふだんの呼び名のある食材を、成分表の細かい分け方の食材（「いのしし 肉 脂身つき 生」など）より先に並べる。
// 何も見つからないときは、言葉を2つに分けて、両方に一致するものをさがす（「さば缶」→「さば」と「缶」）
export function searchLookup(index: LookupIndex, query: string): LookupResult {
  const q = parseLookupQuery(query)
  if (!q) return NO_RESULT
  let found = run(index, q)
  let split: LookupResult['split'] = null
  if (found.length === 0) {
    for (const [a, b] of splitCandidates(query)) {
      const again = run(index, andQuery(a, b))
      if (again.length === 0) continue
      found = again
      split = [a, b]
      break
    }
  }
  // 並びは 食材 → 料理 → 市販品。食材には途中の一致しかなく、料理には語の先頭からの一致があるときだけ、料理を先にする
  const food = found.find((s) => s.kind === 'food')
  const dish = found.find((s) => s.kind === 'dish')
  const dishFirst = Boolean(food && dish && dish.best <= RANK_PREFIX && food.best > RANK_PREFIX)
  const order: Record<LookupKind, number> = dishFirst ? { dish: 0, food: 1, product: 2 } : { food: 0, dish: 1, product: 2 }
  return { sections: found.sort((a, b) => order[a.kind] - order[b.kind]).map(({ kind, hits }) => ({ kind, hits })), split }
}

// 種類からさがす：その分け方のものを全部（食材の「野菜」、料理の「汁物」、市販品の「セブン-イレブン」など）
export function browseLookup(index: LookupIndex, kind: LookupKind, facet: string): LookupHit[] {
  return index.groups[kind].flatMap((g) => g.all(facet))
}

// ---- 画面の状態と並べかえ ----

export type LookupSort = 'default' | 'kcalAsc' | 'proteinDesc'
export const LOOKUP_SORT_LABEL: Record<LookupSort, string> = { default: 'おすすめ順', kcalAsc: 'カロリーが低い順', proteinDesc: 'たんぱく質が多い順' }

// さがしている言葉と、しぼりこみ（種類・その中の分け方）・並べかえ。ほかの画面へ行ってもどっても続きから見られるよう、App が持つ
export type LookupState = { query: string; kind: LookupKind | 'all'; facet: string | null; sort: LookupSort }
export const INITIAL_LOOKUP: LookupState = { query: '', kind: 'all', facet: null, sort: 'default' }

// 並べかえ。値のないもの（カロリーや、たんぱく質の表示がない商品）は後ろへ。同じ値なら元の並びのまま
export function sortHits(hits: LookupHit[], sort: LookupSort, protein: (card: Card) => number | null): LookupHit[] {
  if (sort === 'default') return hits
  const value = sort === 'kcalAsc' ? (h: LookupHit) => h.card.kcal : (h: LookupHit) => protein(h.card)
  const sign = sort === 'kcalAsc' ? 1 : -1
  return hits
    .map((hit) => ({ hit, v: value(hit) }))
    .sort((a, b) => (a.v === null ? (b.v === null ? 0 : 1) : b.v === null ? -1 : sign * (a.v - b.v)))
    .map((x) => x.hit)
}
