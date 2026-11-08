// 理想の献立：朝・昼・晩・その他で自然な組み合わせになり、1日の栄養の目安（PFC・カロリー・食塩・栄養素）に近い1日の食事。
// 献立は1人前（女性30〜49歳・ふつうの1日の目安 約2,000kcal）で組み、呼び出すときにプロフィールの目安に合わせて量を調整する。
//
// 量の調整（adjustIdealMenu）
//   1. おかず・汁物は、1日の目安と献立を組んだ目安（2,000kcal）の比の平方根の割合で控えめに増減する（0.8〜1.15人前）。
//      食塩の目安は女性6.5g・男性7.5gと、カロリーほどには違わないので、おかずを増やしすぎない
//   2. ごはん・パン・麺・丼で、朝・昼・晩それぞれの目安カロリー（1日の目安 × プロフィールの配分）に合わせる
//      （食事バランスガイドと同じく、エネルギーの調整は主食の量で行う。おかずのビタミン・ミネラルを減らしすぎないように）
//   3. 果物・牛乳・ヨーグルト・納豆・卵など1個・1杯で数えるものはそのまま（ごはんだけでは足りないときに、2個・2杯までふやす）
//   4. それでもPFCが目標の範囲を外れる・食塩や飽和脂肪酸が目安をこえるときは、0.1人前ずつ動かして直す
//   配分が0%の区分（朝食をとらない設定など）は空にして、その分をほかの区分に回す
//
// 市販品（コンビニ・メーカーの商品）も入れられる。量は献立に書いた1個・1パック（1杯）のままにして、
// ごはんだけでは1日のカロリーやPFCが合わないとき（たくさん食べる人など）だけ、おにぎり・パンを1個ふやす・へらす、
// フルグラ・冷凍ギョーザなどグラムで数える商品を刻みずつ増減する（サラダなどほかの商品は献立の量のまま）。
// ごはんのない区分（コンビニのお昼、フルグラの朝など）は、その区分が目安から2割外れないように
// それらや果物・牛乳を1個・1杯ずつ動かし、そのぶんほかの区分のごはんを配り直す
import { nutrientChecks, type NutrientCheck } from './nutrientChecks'
import { menuTotals, pfcRatio, type Catalog, type MenuTotals } from './nutrition'
import { SLOT_ENERGY_TOLERANCE } from './slotBalance'
import type { Targets } from './targets'
import { SLOTS, type DayMenu, type Dish, type MenuItem, type Product, type Slot } from './types'

// [料理のid, 人前]。人前を省くと1人前。
// 市販品は "product:<商品のjan>"。量は1個・1食で表示の商品は個数、100g・100mL当たりの商品はグラム（mL）で、
// 省くと1個（グラムの商品は表示の1食分、なければ100g）。
// グラムの商品は3つめに増減の刻み（ギョーザ1個のグラムなど）を書ける。省くと献立のグラムずつ
export type IdealMenuItem = string | [string, number] | [string, number, number]

const PRODUCT_PREFIX = 'product:'
export const idealProductJan = (x: IdealMenuItem): string | null => {
  const id = typeof x === 'string' ? x : x[0]
  return id.startsWith(PRODUCT_PREFIX) ? id.slice(PRODUCT_PREFIX.length) : null
}

export type IdealMenu = {
  id: string
  name: string
  // 献立のようす（一覧に出すひとこと）
  lead: string
  // 栄養のポイント
  point: string
  slots: Record<Slot, IdealMenuItem[]>
}

export const IDEAL_MENUS: IdealMenu[] = [
  {
    id: 'washoku',
    name: '和食の定番',
    lead: '納豆と玄米の朝、サーモン丼の昼、銀だらの西京焼きの晩',
    point: '魚と大豆でたんぱく質。玄米・枝豆・煮豆で食物繊維',
    slots: {
      breakfast: ['genmai-rice', 'ready-natto', 'yasai-tomato', 'misoshiru-spinach'],
      lunch: ['don-salmon', 'yasai-edamame', 'fruit-persimmon'],
      dinner: ['rice', 'gindara-saikyoyaki', 'ready-atsuage', 'nimame'],
      other: ['sweets-yogurt-sweet', 'banana'],
    },
  },
  {
    id: 'bread',
    name: 'パンの朝ごはん',
    lead: 'ジャムトーストと目玉焼きの朝、ロコモコの昼、あじフライの晩',
    point: 'ヨーグルト・牛乳・冷奴でカルシウム。卵とあじでビタミンD',
    slots: {
      breakfast: ['bread-jam-toast', 'fried-egg', 'yasai-broccoli', 'sweets-yogurt-sweet', 'banana'],
      lunch: ['loco-moco', 'yasai-tomato', 'fruit-persimmon'],
      dinner: ['rice', 'ready-aji-fry', 'hiyayakko', 'nimame'],
      other: ['milk', 'apple'],
    },
  },
  {
    id: 'sashimi',
    name: 'お刺身の晩ごはん',
    lead: '卵焼きの朝、ヒレカツ定食の昼、たいのお刺身の晩',
    point: 'ヒレカツの豚肉でビタミンB1。小松菜と厚揚げでカルシウムと鉄',
    slots: {
      breakfast: ['rice', 'dashimaki', 'ohitashi-komatsuna'],
      lunch: ['genmai-rice', 'ready-hire-katsu', 'yasai-kabocha-ni', 'yasai-tomato'],
      dinner: ['rice', 'sashimi-tai', 'ready-atsuage', 'onyasai'],
      other: ['sweets-yogurt-sweet', 'fruit-orange'],
    },
  },
  {
    id: 'chuka',
    name: '中華の晩ごはん',
    lead: 'スクランブルエッグの朝、鉄火丼の昼、麻婆豆腐の晩',
    point: 'まぐろと豆腐でたんぱく質。ナッツでビタミンE、青菜でビタミンC',
    slots: {
      breakfast: ['genmai-rice', 'scrambled-egg', 'ohitashi', 'yasai-tomato'],
      lunch: ['don-tekka', 'yasai-broccoli', 'banana'],
      dinner: ['rice', 'mapo-tofu', 'ohitashi-chingensai'],
      other: ['sweets-yogurt-sweet', 'sweets-mixed-nuts'],
    },
  },
  {
    id: 'nabe',
    name: '鍋の晩ごはん',
    lead: '紅ざけの朝、ぶりの照り焼きの昼、水炊きの晩',
    point: '紅ざけとぶりでビタミンDとn-3系脂肪酸。鍋で野菜がたっぷり',
    slots: {
      breakfast: ['genmai-rice', 'shioyaki-beniza', 'ohitashi-komatsuna'],
      lunch: ['rice', 'teriyaki-buri', 'yasai-broccoli', 'mikan'],
      dinner: ['mugi-rice', 'mizutaki', 'yasai-kabocha-ni'],
      other: ['sweets-yogurt-sweet', 'fruit-kiwi'],
    },
  },
  // ここから市販品を使う献立。コンビニの商品は毎月のデータ更新でなくなることがあるので、テストで確かめる
  {
    id: 'konbini',
    name: 'コンビニでお昼',
    lead: '納豆ごはんの朝、セブン-イレブンのおにぎりとサラダの昼、さばの塩焼きの晩',
    point: 'お昼はおにぎり2個とサラダに、ヨーグルトとキウイを足す。朝と晩の料理で魚・大豆・青菜をとる',
    slots: {
      breakfast: ['rice', 'ready-natto', 'yasai-tomato'],
      lunch: ['product:seven-040313', 'product:seven-040302', 'product:seven-105215', 'sweets-yogurt-sweet', 'fruit-kiwi'],
      dinner: ['rice', 'grilled-mackerel', 'ohitashi-komatsuna', 'nimame'],
      other: ['sweets-mixed-nuts'],
    },
  },
  {
    id: 'frugra-gyoza',
    name: 'フルグラと冷凍ギョーザ',
    lead: 'フルグラと牛乳の朝、鶏の照り焼きの昼、冷凍ギョーザの晩',
    point: '朝はフルグラで手軽に食物繊維。ギョーザは塩分ひかえめのものに、野菜と豆腐を添える',
    slots: {
      breakfast: [['product:maker-calbee-frugra', 50, 10], 'milk', 'banana'],
      lunch: ['genmai-rice', 'teriyaki-chicken', 'ohitashi-komatsuna', 'yasai-tomato'],
      // 12個入り（276g）の半分の6個。1個23g
      dinner: ['rice', ['product:4901001567775', 138, 23], 'namul', 'hiyayakko'],
      other: ['sweets-yogurt-sweet', 'fruit-kiwi'],
    },
  },
]

const itemId = (x: IdealMenuItem) => (typeof x === 'string' ? x : x[0])
const itemPortion = (x: IdealMenuItem) => (typeof x === 'string' ? undefined : x[1])
const itemStep = (x: IdealMenuItem) => (typeof x === 'string' ? undefined : x[2])

// 献立に使う市販品が、いまのデータにすべてあるか（コンビニの商品は入れ替わるので、なくなったら献立ごと出さない）
export const idealMenuAvailable = (menu: IdealMenu, catalog: Catalog): boolean =>
  SLOTS.every((slot) =>
    menu.slots[slot].every((x) => {
      const jan = idealProductJan(x)
      return jan ? catalog.products.has(jan) : catalog.dishes.has(itemId(x))
    }),
  )

export const idealMenuHasProducts = (menu: IdealMenu): boolean => SLOTS.some((slot) => menu.slots[slot].some((x) => idealProductJan(x) !== null))

// 量の調整のしかた。staple は主食（ごはん・パン・麺・丼）、dish はおかず・汁物、fixed は1個・1杯で数えるもの、
// count は市販品（おにぎりは1個ずつ、グラムの商品は刻みずつ増減する）。fixed の料理も、直す段階では1個ずつ2個までふやせる
export type PortionRole = 'staple' | 'dish' | 'fixed' | 'count'

// 1個・1パックで数えるおかず
const FIXED_DISHES = new Set(['ready-natto', 'boiled-egg', 'fried-egg', 'yasai-umeboshi'])

export function portionRole(dish: Dish): PortionRole {
  if (FIXED_DISHES.has(dish.id)) return 'fixed'
  switch (dish.category) {
    case 'staple':
    case 'bread':
    case 'noodle':
    case 'bowl':
      return 'staple'
    case 'main':
    case 'side':
    case 'soup':
      return 'dish'
    default:
      return 'fixed'
  }
}

// 人前の範囲。主食は小盛り〜大盛り、おかずは少し控えめ〜少し多め
const BOUNDS: Record<Exclude<PortionRole, 'count'>, [number, number]> = { staple: [0.5, 3], dish: [0.7, 1.5], fixed: [1, 1] }
// 白いごはん・麦ごはん・玄米ごはんは丼に大盛りくらい（3人前）まで増やせる（たくさん食べる人は塩分の少ないごはんで補う）。
// パン・おにぎり・麺・丼などは1.5人前まで（パンや麺は塩を含み、たくさん食べる人で食塩がふえすぎるため）。
// 足りない分は、ほかの区分のごはんで補う
const PLAIN_RICE = new Set(['rice', 'mugi-rice', 'genmai-rice', 'zakkoku-rice'])
export const stapleBounds = (dish: Dish): [number, number] => [0.5, PLAIN_RICE.has(dish.id) ? 3 : 1.5]
// 市販品の量の範囲。おにぎり・食パンなど個数で数える主食は1個ふやす・へらす（1個は残す）。
// サラダなどほかの1個・1食の商品は献立の量のまま（2個買うことはあまりないので）。
// グラムの商品は献立のグラムの2倍まで。刻み（step）があれば、刻み2つ分へらし・4つ分ふやすまで（ギョーザ6個なら4〜10個）
const COUNTED_STAPLES = new Set(['onigiri', 'bread'])
export function productBounds(product: Product, base: number, step = base): [number, number] {
  if (product.basis !== 'serving') return step >= base ? [base, base * 2] : [Math.max(step, base - 2 * step), base + 4 * step]
  return COUNTED_STAPLES.has(product.category) ? [Math.max(1, base - 1), base + 1] : [base, base]
}
const boundsOf = (l: Line): [number, number] =>
  l.role === 'staple'
    ? stapleBounds(l.dish!)
    : l.role === 'count'
      ? l.product
        ? productBounds(l.product, l.base, stepOf(l))
        : [l.base, l.base + 1]
      : BOUNDS[l.role]

// 1日の食事の項目の量の調整のしかた（テスト・表示用）
export function menuItemRole(item: MenuItem, catalog: Catalog): PortionRole {
  if (item.kind === 'product') return 'count'
  return portionRole(catalog.dishes.get(item.refId)!)
}
// 献立を組んだときの1日の目安（女性30〜49歳・ふつう 2,040kcal に近い値）
export const IDEAL_REFERENCE_KCAL = 2000
// 最初に割り振るときのおかずの範囲（ここをこえる分は主食で合わせる）
const DISH_FIRST: [number, number] = [0.8, 1.15]

const clamp = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, v))
const round1 = (v: number) => Math.round(v * 10) / 10
// 量の刻み。市販品は1個・1パック（グラムで数えるものは献立に書いた刻み、なければ献立のグラム）、ほかは0.1人前
const stepOf = (l: Line) => (l.role !== 'count' ? 0.1 : !l.product || l.product.basis === 'serving' ? 1 : (l.step ?? l.base))
// 献立の量からのずれ（刻みの数）。同じくらいよくなるなら、ずれの小さい（自然な量の）ほうを選ぶのに使う
const drift = (ls: Line[]) => ls.reduce((a, l) => a + Math.abs(l.portion - l.base) / (l.role === 'count' ? stepOf(l) : 1), 0) * 1e-3
const roundFor = (l: Line, v: number) => (l.role === 'count' ? round1(Math.round(v / stepOf(l)) * stepOf(l)) : round1(v))

// dish か product のどちらか。kcal は portion 1 当たり（グラムで数える市販品は1g当たり）。step はグラムの商品の刻み
type Line = { slot: Slot; dish?: Dish; product?: Product; kcal: number; base: number; portion: number; role: PortionRole; step?: number }

const toMenu = (lines: Line[]): DayMenu => {
  const menu: DayMenu = { breakfast: [], lunch: [], dinner: [], other: [] }
  lines.forEach((l, i) =>
    menu[l.slot].push(
      l.dish
        ? { uid: `ideal-${i}`, kind: 'dish', refId: l.dish.id, portion: l.portion }
        : { uid: `ideal-${i}`, kind: 'product', refId: l.product!.jan, portion: l.portion },
    ),
  )
  return menu
}

function toLine(slot: Slot, x: IdealMenuItem, catalog: Catalog): Line | null {
  const jan = idealProductJan(x)
  if (jan) {
    const product = catalog.products.get(jan)
    if (!product) return null
    const perGram = product.basis !== 'serving'
    const base = itemPortion(x) ?? (perGram ? (product.servingGrams ?? 100) : 1)
    const kcal = (product.nutrients.energyKcal ?? 0) / (perGram ? 100 : 1)
    return { slot, product, kcal, base, portion: base, role: 'count', step: perGram ? itemStep(x) : undefined }
  }
  const dish = catalog.dishes.get(itemId(x))
  if (!dish) return null
  const base = itemPortion(x) ?? 1
  // 1個・1杯で数える料理（果物・牛乳など）は、市販品と同じく1個ずつ動かす
  const role = portionRole(dish)
  return { slot, dish, kcal: dish.nutrients.energyKcal ?? 0, base, portion: base, role: role === 'fixed' ? 'count' : role }
}

const saltOf = (lines: Line[], catalog: Catalog) => menuTotals(toMenu(lines), catalog).day.values.salt

// PFC・カロリー・食塩・飽和脂肪酸の外れ具合（0 なら全部おさまっている）。直すときの目安。
// slotTargets はごはんで合わせる区分の目安、fixedTargets はごはんのない朝・昼・晩の目安
function violation(
  lines: Line[],
  catalog: Catalog,
  targets: Targets,
  slotTargets: Partial<Record<Slot, number>>,
  fixedTargets: Partial<Record<Slot, number>>,
): number {
  const t = menuTotals(toMenu(lines), catalog)
  const v = t.day.values
  let score = 0
  // 1日のカロリーは目安の ±3% まで
  const dayErr = Math.abs(v.energyKcal - targets.energyKcal) / targets.energyKcal
  score += Math.max(0, dayErr - 0.03) ** 2 * 1e4
  // 朝・昼・晩は区分の目安の ±15% まで（「ちょうどいい」は ±20%）
  for (const slot of ['breakfast', 'lunch', 'dinner'] as const) {
    const goal = slotTargets[slot]
    if (!goal) continue
    const err = Math.abs(t.bySlot[slot].values.energyKcal - goal) / goal
    score += Math.max(0, err - 0.15) ** 2 * 1e3
  }
  // ごはんのない区分は、画面で「少なめ」「多め」と出ない ±19% まで
  for (const slot of ['breakfast', 'lunch', 'dinner'] as const) {
    const goal = fixedTargets[slot]
    if (!goal) continue
    const err = Math.abs(t.bySlot[slot].values.energyKcal - goal) / goal
    score += Math.max(0, err - SLOT_ENERGY_TOLERANCE + 0.01) ** 2 * 1e3
  }
  // PFCは目標の範囲の内側 0.5% ポイントまで
  const ratio = pfcRatio(v)
  if (ratio) {
    for (const key of ['p', 'f', 'c'] as const) {
      const r = targets.pfcRatio[key]
      const out = Math.max(0, r.lo + 0.5 - ratio[key], ratio[key] - (r.hi - 0.5))
      score += out ** 2 * 10
    }
  }
  score += Math.max(0, v.salt - (targets.saltMax - 0.1)) ** 2 * 100
  score += Math.max(0, v.satFat - targets.satFatMaxG * 0.98) ** 2 * 10
  return score
}

// 理想の献立を、プロフィールの目安（targets）に合わせた量の1日の食事にする
export function adjustIdealMenu(menu: IdealMenu, catalog: Catalog, targets: Targets): DayMenu {
  return planIdealMenu(menu, catalog, targets).menu
}

// repairs は、配分どおりに割り振ったあと目安に収めるために動かした回数（0.1人前ずつ）
export function planIdealMenu(menu: IdealMenu, catalog: Catalog, targets: Targets, repair = true): { menu: DayMenu; repairs: number } {
  const share = targets.slotShare
  const lines: Line[] = []
  for (const slot of SLOTS) {
    if (share[slot] <= 0) continue
    for (const x of menu.slots[slot]) {
      const line = toLine(slot, x, catalog)
      if (line) lines.push(line)
    }
  }
  const kcalOf = (l: Line, portion = l.portion) => l.kcal * portion
  // 区分のカロリーに合わせるのは料理の主食だけ。市販品は、区分や1日のカロリー・PFCが合わないときに 3. 4. で1個・1パックずつ動かす
  // （コンビニのお昼などは、ふだん買う個数のままにしたいので）
  const adjustsKcal = (l: Line) => l.role === 'staple'

  // 1. おかず・汁物
  const g = clamp(Math.sqrt(targets.energyKcal / IDEAL_REFERENCE_KCAL), DISH_FIRST)
  for (const l of lines) if (l.role === 'dish') l.portion = round1(clamp(l.base * g, BOUNDS.dish))

  // 2. 主食のある区分で、残りのカロリーを配分どおりに分けて主食で合わせる（主食のない区分はそのまま）。
  //    パンなどが上限で足りない分は、まだ増やせる区分に配分の割合で回す
  const flexible = SLOTS.filter((s) => lines.some((l) => l.slot === s && adjustsKcal(l)))
  const shareSum = flexible.reduce((a, s) => a + share[s], 0)
  // 主食の量を決めなおし、ごはんで合わせる区分の目安を返す
  const distribute = () => {
    const restKcal = lines.filter((l) => !flexible.includes(l.slot)).reduce((a, l) => a + kcalOf(l), 0)
    const goals: Partial<Record<Slot, number>> = {}
    for (const slot of flexible) goals[slot] = ((targets.energyKcal - restKcal) * share[slot]) / shareSum
    const fill = (slot: Slot) => {
      const inSlot = lines.filter((l) => l.slot === slot)
      const staples = inSlot.filter(adjustsKcal)
      const others = inSlot.filter((l) => !adjustsKcal(l)).reduce((a, l) => a + kcalOf(l), 0)
      const h = (goals[slot]! - others) / staples.reduce((a, l) => a + kcalOf(l, l.base), 0)
      for (const l of staples) l.portion = roundFor(l, clamp(l.base * h, boundsOf(l)))
      return inSlot.reduce((a, l) => a + kcalOf(l), 0)
    }
    let open = [...flexible]
    for (let round = 0; round < 3 && open.length > 0; round++) {
      let left = 0
      for (const slot of open) left += goals[slot]! - fill(slot)
      const stuck = (slot: Slot) =>
        lines.filter((l) => l.slot === slot && adjustsKcal(l)).every((l) => l.portion === boundsOf(l)[left > 0 ? 1 : 0])
      open = open.filter((s) => !stuck(s))
      if (Math.abs(left) < 30 || open.length === 0) break
      const openShare = open.reduce((a, s) => a + share[s], 0)
      for (const slot of open) goals[slot]! += (left * share[slot]) / openShare
    }
    return goals
  }
  let goals = distribute()

  // 3. 主食のない朝・昼・晩（コンビニのお昼など）は、市販品や果物・牛乳を1個ずつ動かして区分の目安に近づける。
  //    動かすたびに 2. をやりなおして、ほかの区分のごはんで1日のカロリーを合わせる
  const fixedSlots = (['breakfast', 'lunch', 'dinner'] as const).filter((s) => !flexible.includes(s) && lines.some((l) => l.slot === s))
  const fixedTargets: Partial<Record<Slot, number>> = {}
  // 画面の区分の目安（slotBalance）と同じく10kcal単位に丸める
  for (const slot of fixedSlots) fixedTargets[slot] = Math.round((targets.energyKcal * share[slot]) / 10) * 10
  const evaluate = () => violation(lines, catalog, targets, goals, fixedTargets)
  const movable = lines.filter((l) => l.role === 'count' && fixedSlots.includes(l.slot as (typeof fixedSlots)[number]))
  let score = repair ? evaluate() : 0
  let repairs = 0
  for (let step = 0; step < 20 && score > 0 && movable.length > 0; step++) {
    let best: { line: Line; portion: number; score: number } | null = null
    for (const line of movable) {
      for (const sign of [-1, 1]) {
        const portion = roundFor(line, line.portion + sign * stepOf(line))
        const [lo, hi] = boundsOf(line)
        if (portion < lo || portion > hi) continue
        const saved = lines.map((l) => l.portion)
        line.portion = portion
        goals = distribute()
        // 食塩が目安ぎりぎりになる手はとらない（区分のカロリーより食塩を守る）
        const salty = sign > 0 && saltOf(lines, catalog) > targets.saltMax - 0.2
        const s = evaluate() + drift(movable)
        lines.forEach((l, i) => (l.portion = saved[i]))
        if (!salty && s < score && (!best || s < best.score)) best = { line, portion, score: s }
      }
    }
    goals = distribute()
    if (!best) break
    best.line.portion = best.portion
    goals = distribute()
    score = evaluate()
    repairs++
  }

  // 4. 目安から外れていれば 0.1人前ずつ直す（いちばんよくなる1手を選ぶのをくり返す）。
  // 同じ区分の主食（ごはんとおかゆなど）はいっしょに動かして、片方だけ大盛りにならないようにする。
  // 市販品（おにぎりなど）は1個ずつ別々に動かす
  const groups: Line[][] = []
  for (const l of lines) {
    if (l.role === 'fixed') continue
    const same = l.role === 'staple' ? groups.find((g) => g[0].role === 'staple' && g[0].slot === l.slot) : undefined
    if (same) same.push(l)
    else groups.push([l])
  }
  for (let step = 0; step < 60 && score > 0; step++) {
    let best: { group: Line[]; d: number; score: number } | null = null
    for (const group of groups) {
      for (const sign of [-1, 1]) {
        const d = sign * stepOf(group[0])
        const next = group.map((l) => roundFor(l, l.portion + d))
        if (next.some((p, i) => p < boundsOf(group[i])[0] || p > boundsOf(group[i])[1])) continue
        const prev = group.map((l) => l.portion)
        group.forEach((l, i) => (l.portion = next[i]))
        const s = evaluate() + drift(group)
        group.forEach((l, i) => (l.portion = prev[i]))
        if (s < score && (!best || s < best.score)) best = { group, d, score: s }
      }
    }
    if (!best) break
    for (const l of best.group) l.portion = roundFor(l, l.portion + best.d)
    score = evaluate()
    repairs++
  }
  return { menu: toMenu(lines), repairs }
}

export type IdealMenuSummary = {
  totals: MenuTotals
  checks: NutrientCheck[]
  kcal: number
  ratio: { p: number; f: number; c: number } | null
}

export function summarizeIdealMenu(menu: DayMenu, catalog: Catalog, targets: Targets): IdealMenuSummary {
  const totals = menuTotals(menu, catalog)
  return {
    totals,
    checks: nutrientChecks(totals.day, targets, undefined, totals.supplement),
    kcal: totals.day.values.energyKcal,
    ratio: pfcRatio(totals.day.values),
  }
}
