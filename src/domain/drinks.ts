import type { Catalog } from './nutrition'
import type { Dish, DrinkSize, MenuItem, Product, Slot } from './types'

// 飲み物は「何杯（何本）」で数える。1杯の量（缶・コップ・中ジョッキなど）もえらべる。
// 量は MenuItem.portion（料理は人前、市販品は mL）のままにして、杯数と1杯の量（MenuItem.cup）はそこから出す

// 1杯の量。表示は「label＋杯数＋unit」（「ロング缶2本」「中ジョッキ2杯」「2合」）
const CUP: DrinkSize = { label: 'カップ', ml: 150, unit: '杯' }
const GLASS: DrinkSize = { label: 'コップ', ml: 200, unit: '杯' }
const MUG: DrinkSize = { label: 'マグカップ', ml: 250, unit: '杯' }
const CAN: DrinkSize = { label: '缶', ml: 350, unit: '本' }
const PET: DrinkSize = { label: 'ペットボトル', ml: 500, unit: '本' }
const LONG_CAN: DrinkSize = { label: 'ロング缶', ml: 500, unit: '本' }
// 中ジョッキの量はお店によってちがう（350〜500mL ほど）ので、およその量にする
const JUG: DrinkSize = { label: '中ジョッキ', ml: 400, unit: '杯', approx: true }
const MEDIUM_BOTTLE: DrinkSize = { label: '中瓶', ml: 500, unit: '本' }
const WINE_GLASS: DrinkSize = { label: 'グラス', ml: 120, unit: '杯' }
const GO: DrinkSize = { label: '', ml: 180, unit: '合' }
const SINGLE: DrinkSize = { label: 'シングル', ml: 30, unit: '杯' }
const DOUBLE: DrinkSize = { label: 'ダブル', ml: 60, unit: '杯' }
const YUNOMI: DrinkSize = { label: '湯のみ', ml: 150, unit: '杯' }

// 1杯の量のえらびかた
const SOFT = [CUP, GLASS, MUG, CAN, PET]
const BEER = [CAN, LONG_CAN, JUG, MEDIUM_BOTTLE]
const CHUHAI = [CAN, LONG_CAN]
// 市販のお酒：缶や瓶で飲むもの（ビール・チューハイなど）と、グラスや合で飲むもの（日本酒・ワイン・焼酎・ウイスキーなど）
const CANNED = [CAN, LONG_CAN, JUG, MEDIUM_BOTTLE]
const LIQUOR = [SINGLE, DOUBLE, WINE_GLASS, GO]

// 料理の飲み物。base は料理の1人前の量（材料の量とほぼ同じ mL）、short は量を外した名前
type DishDrink = { base: DrinkSize; sizes?: DrinkSize[]; short?: string }
const DISH_DRINKS: Record<string, DishDrink> = {
  milk: { base: GLASS, sizes: SOFT },
  'orange-juice': { base: GLASS, sizes: SOFT },
  cola: { base: CAN, sizes: SOFT, short: 'コーラ' },
  'drink-hojicha': { base: GLASS, sizes: SOFT },
  'drink-amazake': { base: GLASS, sizes: SOFT },
  'drink-green-tea': { base: YUNOMI, sizes: SOFT },
  'drink-barley-tea': { base: GLASS, sizes: SOFT },
  'drink-oolong': { base: GLASS, sizes: SOFT },
  'drink-black-tea': { base: CUP, sizes: SOFT },
  'drink-coffee': { base: CUP, sizes: SOFT },
  'drink-cafe-au-lait': { base: GLASS, sizes: SOFT },
  'drink-cocoa': { base: { ...CUP, ml: 160 }, sizes: SOFT },
  'drink-soy-milk': { base: GLASS, sizes: SOFT },
  'drink-drink-yogurt': { base: GLASS, sizes: SOFT },
  'drink-lactic': { base: { label: '', ml: 65, unit: '本' }, short: '乳酸菌飲料（小）' },
  'drink-vegetable-juice': { base: GLASS, sizes: SOFT },
  'drink-tomato-juice': { base: GLASS, sizes: SOFT },
  'drink-apple-juice': { base: GLASS, sizes: SOFT },
  'drink-sports-drink': { base: PET, sizes: SOFT, short: 'スポーツドリンク' },
  beer: { base: CAN, sizes: BEER, short: 'ビール' },
  'alcohol-happoshu': { base: CAN, sizes: BEER, short: '発泡酒' },
  chuhai: { base: CAN, sizes: CHUHAI, short: '缶チューハイ' },
  sake: { base: GO, short: '日本酒' },
  'red-wine': { base: WINE_GLASS, short: '赤ワイン' },
  'alcohol-white-wine': { base: WINE_GLASS, short: '白ワイン' },
  'alcohol-shochu': { base: { label: 'ロック', ml: 60, unit: '杯' }, short: '焼酎' },
  'alcohol-umeshu': { base: { label: 'ロック', ml: 60, unit: '杯' }, short: '梅酒' },
  'alcohol-shaoxing': { base: { label: 'グラス', ml: 60, unit: '杯' }, short: '紹興酒' },
}

export type DrinkSpec = {
  // 1人前（料理）・1食分（市販品）の量。cup がない項目はこの量で1杯
  base: DrinkSize
  // えらべる1杯の量（1つ以下なら、えらばせない）
  sizes: DrinkSize[]
  // portion の数え方：'serving' は人前・1食分の倍率（料理・1食基準の市販品）、'ml' は mL（100mL基準の市販品）
  per: 'serving' | 'ml'
  // 量を外した名前（料理だけ）
  short?: string
}

// base を、同じ量か同じ呼び名のものと置きかえて、量の順に並べる
function withBase(sizes: DrinkSize[], base: DrinkSize): DrinkSize[] {
  if (sizes.length === 0) return []
  const rest = sizes.filter((s) => s.ml !== base.ml && (s.label !== base.label || !s.label))
  return [...rest, base].sort((a, b) => a.ml - b.ml)
}

const DRINK_CATEGORIES = new Set(['drink', 'alcohol'])

export function isDrinkDish(dish: Dish): boolean {
  return dish.category === 'drink' || dish.category === 'alcohol'
}

function dishSpec(dish: Dish): DrinkSpec | null {
  if (!isDrinkDish(dish)) return null
  const known = DISH_DRINKS[dish.id]
  if (known) return { base: known.base, sizes: withBase(known.sizes ?? [], known.base), per: 'serving', short: known.short }
  // 表にない飲み物は、材料の量を1杯にして杯数だけ数える
  const ml = Math.round(dish.ingredients.reduce((s, i) => s + i.grams, 0))
  return { base: { label: '', ml, unit: '杯' }, sizes: [], per: 'serving' }
}

const CANNED_NAME = /ビール|beer|発泡|チューハイ|サワー|ハイボール|highball|ほろよい|ストロング|搾り|ラガー|エール|ipa|ドライ|缶/i

function productSpec(p: Product): DrinkSpec | null {
  const liquid = p.basis === '100ml' && (DRINK_CATEGORIES.has(p.category) || p.category === 'dairy')
  if (p.basis === 'serving') {
    if (!DRINK_CATEGORIES.has(p.category)) return null
    return { base: { label: '', ml: p.servingGrams ?? 0, unit: '杯' }, sizes: [], per: 'serving' }
  }
  const s = p.servingGrams
  if (liquid) {
    const alcohol = p.category === 'alcohol'
    // 缶・瓶のお酒か（1本の量が缶くらいか、名前で見分ける）
    const canned = alcohol && ((s !== undefined && s >= 250 && s <= 600) || CANNED_NAME.test(p.name))
    // 1本の量が分かればそれを1杯に。分からなければ、ふつうの飲み物はコップ、お酒は缶かグラス
    const base: DrinkSize = s ? { label: '', ml: s, unit: alcohol || s >= 250 ? '本' : '杯' } : canned ? CAN : alcohol ? WINE_GLASS : GLASS
    return { base, sizes: withBase(canned ? CANNED : alcohol ? LIQUOR : SOFT, base), per: 'ml' }
  }
  // 100g 基準の飲み物（缶コーヒーなど）は、1本の量が分かるものだけ本数で数える（粉やスティックはグラムのまま）
  if (p.basis === '100g' && DRINK_CATEGORIES.has(p.category) && s && s >= 100) {
    return { base: { label: '', ml: s, unit: '本' }, sizes: [], per: 'ml' }
  }
  return null
}

// 飲み物として杯数で数える項目なら、その数え方。飲み物でなければ null
export function drinkSpec(item: Pick<MenuItem, 'kind' | 'refId'>, catalog: Catalog): DrinkSpec | null {
  switch (item.kind) {
    case 'dish': {
      const dish = catalog.dishes.get(item.refId)
      return dish ? dishSpec(dish) : null
    }
    case 'myDish': {
      // 飲み物をアレンジして保存したもの（カフェオレの牛乳を多めに、など）は、もとの飲み物と同じに数える
      const my = catalog.myDishes.get(item.refId)
      const base = my?.baseDishId ? catalog.dishes.get(my.baseDishId) : undefined
      const spec = base ? dishSpec(base) : null
      return spec && { ...spec, short: undefined }
    }
    case 'product': {
      const p = catalog.products.get(item.refId)
      return p ? productSpec(p) : null
    }
    default:
      return null
  }
}

const sameSize = (a: DrinkSize, b: DrinkSize) => a.ml === b.ml && a.label === b.label && a.unit === b.unit

// 前に飲んだときの1杯の量が、えらべる量のどれかならそれを、ちがえば1人前・1本の量を使う
export function pickCup(spec: DrinkSpec, cup?: DrinkSize): DrinkSize {
  return (cup && spec.sizes.find((s) => sameSize(s, cup))) || spec.base
}

// いまの1杯の量
export function drinkCup(item: Pick<MenuItem, 'cup'>, spec: DrinkSpec): DrinkSize {
  if (!item.cup || spec.sizes.length === 0) return spec.base
  return spec.sizes.find((s) => sameSize(s, item.cup!)) ?? item.cup
}

// 何杯か（小数もある）
export function drinkCount(item: Pick<MenuItem, 'portion' | 'cup'>, spec: DrinkSpec): number {
  const cup = drinkCup(item, spec)
  if (spec.per === 'ml') return cup.ml > 0 ? item.portion / cup.ml : item.portion
  return spec.base.ml > 0 ? (item.portion * spec.base.ml) / cup.ml : item.portion
}

// 杯数と1杯の量から、項目の量（portion）と cup を作る。cup は1人前の量のときは持たない
export function drinkAmount(spec: DrinkSpec, count: number, cup: DrinkSize = spec.base): Pick<MenuItem, 'portion' | 'cup'> {
  const sized = spec.sizes.length > 0 && !sameSize(cup, spec.base)
  const ml = sized ? cup.ml : spec.base.ml
  const portion = spec.per === 'ml' ? count * ml : spec.base.ml > 0 ? (count * ml) / spec.base.ml : count
  return { portion: Math.round(portion * 1000) / 1000, cup: sized ? cup : undefined }
}

// ＋1杯・−1杯。半端な杯数（料理の画面で 1.5人前にした、など）は、きりのいい数にそろえる。−は1杯より下にしない（外すのは×で）
const EPS = 1e-6
export const nextCount = (count: number) => Math.floor(count + EPS) + 1
export const prevCount = (count: number) => Math.max(1, Math.ceil(count - EPS) - 1)
// −で減らせるか（1杯より多いとき）
export const canStepDown = (count: number) => count > 1 + EPS

// 2 → "2"、1.4286 → "1.4"
export const formatCount = (count: number) => String(Math.round(count * 10) / 10)

// 「ロング缶2本」「中ジョッキ1杯」「2合」
export function drinkAmountLabel(cup: DrinkSize, count: number): string {
  return `${cup.label}${formatCount(count)}${cup.unit}`
}

// 1杯の量のボタンの字：「ロング缶 500mL」「中ジョッキ 約400mL」「1本 350mL」
export function drinkSizeLabel(cup: DrinkSize): string {
  return `${cup.label || `1${cup.unit}`} ${cup.approx ? '約' : ''}${cup.ml}mL`
}

// 区分ごとの定番の飲み物（料理をえらぶ画面の「飲み物」の列に、最近飲んだものの後に並べる）
export const STANDARD_DRINKS: Record<Slot, string[]> = {
  breakfast: ['dish:drink-coffee', 'dish:milk', 'dish:drink-green-tea', 'dish:drink-black-tea', 'dish:orange-juice', 'dish:drink-vegetable-juice', 'dish:drink-soy-milk'],
  lunch: ['dish:drink-green-tea', 'dish:drink-barley-tea', 'dish:drink-oolong', 'dish:drink-coffee', 'dish:drink-black-tea', 'dish:drink-cafe-au-lait'],
  dinner: ['dish:beer', 'dish:drink-green-tea', 'dish:highball', 'dish:sake', 'dish:chuhai', 'dish:red-wine', 'dish:drink-oolong', 'dish:drink-barley-tea'],
  other: ['dish:drink-coffee', 'dish:drink-black-tea', 'dish:drink-green-tea', 'dish:drink-cafe-au-lait', 'dish:drink-sports-drink', 'dish:cola', 'dish:beer'],
}

// 最近飲んだもの（料理をえらぶ画面で先に出し、前と同じ1杯の量で入れる）
export type RecentDrink = { key: string; cup?: DrinkSize }
export const RECENT_DRINKS_MAX = 12

export function rememberDrink(list: RecentDrink[], key: string, cup?: DrinkSize): RecentDrink[] {
  return [{ key, ...(cup ? { cup } : {}) }, ...list.filter((d) => d.key !== key)].slice(0, RECENT_DRINKS_MAX)
}

// 同じ飲み物の項目（アレンジしていないもの）。1杯の量が同じものを先に
export function findDrinkItem(items: MenuItem[], item: Pick<MenuItem, 'kind' | 'refId'>, cup?: DrinkSize): MenuItem | undefined {
  const same = items.filter((i) => i.kind === item.kind && i.refId === item.refId && !i.customIngredients)
  return same.find((i) => (cup && i.cup ? sameSize(i.cup, cup) : !cup && !i.cup)) ?? same[0]
}
