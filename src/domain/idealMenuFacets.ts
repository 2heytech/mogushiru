// 理想の献立を、好みでえらびやすくするための分類とさがし方。
// 朝（ごはん・パン・シリアル）、昼（丼・定食・めんやパンなど）、晩の主菜（魚介・肉・とうふや卵など）は、
// 献立に入っている料理のカテゴリと材料の食品群から決める（献立ごとに手で印をつけない）
import { idealProductJan, type IdealMenu, type IdealMenuItem } from './idealMenus'
import type { Catalog } from './nutrition'
import { normalizeForSearch } from './search'
import type { Dish, DishCategory, MenuItem } from './types'

export const BREAKFAST_STYLES = ['rice', 'bread', 'cereal'] as const
export type BreakfastStyle = (typeof BREAKFAST_STYLES)[number]
export const LUNCH_STYLES = ['bowl', 'set', 'other'] as const
export type LunchStyle = (typeof LUNCH_STYLES)[number]
export const DINNER_MAINS = ['fish', 'meat', 'soy'] as const
export type DinnerMain = (typeof DINNER_MAINS)[number]

export type IdealFacets = { breakfast: BreakfastStyle; lunch: LunchStyle; dinner: DinnerMain }

const itemId = (x: IdealMenuItem) => (typeof x === 'string' ? x : x[0])
// 食品番号の先頭2けたが食品群（01 穀類、04 豆類、10 魚介類、11 肉類、12 卵類、17 調味料）
const foodGroup = (foodId: string) => foodId.slice(0, 2)

// 白いごはん・おかゆなど、穀類と調味料だけの主食。その食事の「顔」にはしない
const isPlainStaple = (dish: Dish) => dish.category === 'staple' && dish.ingredients.every((i) => ['01', '17'].includes(foodGroup(i.foodId)))

// 副菜・果物やおやつ・飲みものは、食事の顔にしない
const SUPPORTING: readonly DishCategory[] = ['side', 'snack', 'drink', 'alcohol']
const isFace = (dish: Dish | undefined) => !dish || (!isPlainStaple(dish) && !SUPPORTING.includes(dish.category))

// 1食の「顔」になる項目：献立に書いた順で、白いごはんと副菜・果物・飲みものをのぞいた最初のもの。なければ先頭。
// 一覧のカードで、その食事の絵に使う
export function mealFaceItem(items: MenuItem[], catalog: Catalog): MenuItem | undefined {
  return items.find((item) => item.kind !== 'dish' || isFace(catalog.dishes.get(item.refId))) ?? items[0]
}

// おにぎり・お茶漬けは、主菜と組み合わせても定食には数えない
const LIGHT_STAPLE = /^(onigiri|ochazuke)/

const proteinGrams = (dish: Dish) => {
  const g = { fish: 0, meat: 0, soy: 0 }
  for (const i of dish.ingredients) {
    const group = foodGroup(i.foodId)
    if (group === '10') g.fish += i.grams
    else if (group === '11') g.meat += i.grams
    else if (group === '04' || group === '12') g.soy += i.grams
  }
  return g
}

// 晩ごはんの主菜：主菜・汁物・丼・麺のうち、魚介・肉・大豆や卵を使った最初の料理で、いちばん多い材料。
// 同じ量なら魚介、肉、大豆・卵の順。そういう料理がなければ（市販品だけなど）「とうふ・卵など」に入れる
const DINNER_FACE: readonly DishCategory[] = ['main', 'soup', 'bowl', 'noodle']
function dinnerMain(dishes: Dish[]): DinnerMain {
  for (const dish of dishes) {
    if (!DINNER_FACE.includes(dish.category)) continue
    const g = proteinGrams(dish)
    const most = Math.max(g.fish, g.meat, g.soy)
    if (most > 0) return DINNER_MAINS.find((k) => g[k] === most)!
  }
  return 'soy'
}

export function idealMenuFacets(menu: IdealMenu, catalog: Catalog): IdealFacets {
  const dishes = (items: IdealMenuItem[]) => items.flatMap((x) => catalog.dishes.get(itemId(x)) ?? [])
  const breakfast = dishes(menu.slots.breakfast)
  const lunch = dishes(menu.slots.lunch)
  return {
    // 朝の市販品はシリアル（フルグラ・オートミールなど）だけ。テストで確かめている
    breakfast: menu.slots.breakfast.some((x) => idealProductJan(x) !== null) ? 'cereal' : breakfast.some((d) => d.category === 'bread') ? 'bread' : 'rice',
    lunch: lunch.some((d) => d.category === 'bowl')
      ? 'bowl'
      : lunch.some((d) => d.category === 'staple' && !LIGHT_STAPLE.test(d.id)) && lunch.some((d) => d.category === 'main')
        ? 'set'
        : 'other',
    dinner: dinnerMain(dishes(menu.slots.dinner)),
  }
}

// lead（「〇〇の朝、〇〇の昼、〇〇の晩」）を朝・昼・晩に分ける。この形でなければ null
export function idealMealLeads(menu: IdealMenu): { breakfast: string; lunch: string; dinner: string } | null {
  const m = /^(.+)の朝、(.+)の昼、(.+)の晩$/.exec(menu.lead)
  return m && { breakfast: m[1], lunch: m[2], dinner: m[3] }
}

// 検索用に正規化した語を改行でつなぐ（語をまたいで当たらないように）
const words = (...fields: string[]) => fields.map(normalizeForSearch).filter(Boolean).join('\n')

// 朝・昼・晩・その他に入っている料理と市販品の名前（足す一品はプロフィールで変わるので入れない）
function menuItemNames(menu: IdealMenu, catalog: Catalog): { name: string; words: string }[] {
  const out: { name: string; words: string }[] = []
  for (const items of Object.values(menu.slots)) {
    for (const x of items) {
      const jan = idealProductJan(x)
      if (jan) {
        const p = catalog.products.get(jan)
        if (p) out.push({ name: p.name, words: words(p.name, p.brand) })
      } else {
        const d = catalog.dishes.get(itemId(x))
        if (d) out.push({ name: d.name, words: words(d.name, d.kana) })
      }
    }
  }
  return out
}

// 入力を検索語に分ける（空白や読点で区切ると、すべてを含む献立にしぼる）
export const idealSearchTokens = (query: string): string[] => query.split(/[\s　、,，・]+/).map(normalizeForSearch).filter(Boolean)

export type IdealSearchIndex = { text: string; items: { name: string; words: string }[] }

// 献立1つ分の検索用の文字。名前・ようす・ジャンル・栄養のポイントと、入っている料理の名前とよみ
export function idealSearchIndex(menu: IdealMenu, catalog: Catalog): IdealSearchIndex {
  const items = menuItemNames(menu, catalog)
  return { text: [words(menu.name, menu.lead, menu.genre, menu.point), ...items.map((i) => i.words)].join('\n'), items }
}

export const matchesIdealSearch = (index: IdealSearchIndex, tokens: string[]): boolean => tokens.every((t) => index.text.includes(t))

// 検索語に当たった料理の名前（カードに「入っている料理」として出す）
export function matchedItemNames(index: IdealSearchIndex, tokens: string[], limit = 4): string[] {
  const names = index.items.filter((i) => tokens.some((t) => i.words.includes(t))).map((i) => i.name)
  return [...new Set(names)].slice(0, limit)
}
