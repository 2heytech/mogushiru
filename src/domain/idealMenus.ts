// 理想の献立：朝・昼・晩・その他で自然な組み合わせになり、1日の栄養の目安（PFC・カロリー・食塩・栄養素）に近い1日の食事。
// 献立は1人前（女性30〜49歳・ふつうの1日の目安 約2,000kcal）で組み、呼び出すときにプロフィールの目安に合わせて量を調整する。
//
// 量の調整（adjustIdealMenu）
//   1. おかず・汁物は、1日の目安と献立を組んだ目安（2,000kcal）の比の平方根の割合で控えめに増減する（0.8〜1.15人前）。
//      食塩の目安は女性6.5g・男性7.5gと、カロリーほどには違わないので、おかずを増やしすぎない
//   2. ごはん・パン・麺・丼で、朝・昼・晩それぞれの目安カロリー（1日の目安 × プロフィールの配分）に合わせる
//      （食事バランスガイドと同じく、エネルギーの調整は主食の量で行う。おかずのビタミン・ミネラルを減らしすぎないように）
//   3. 果物・牛乳・ヨーグルト・納豆・卵など1個・1杯で数えるものはそのまま
//   4. それでもPFCが目標の範囲を外れる・食塩や飽和脂肪酸が目安をこえるときは、0.1人前ずつ動かして直す
//   配分が0%の区分（朝食をとらない設定など）は空にして、その分をほかの区分に回す
import { nutrientChecks, type NutrientCheck } from './nutrientChecks'
import { menuTotals, pfcRatio, type Catalog, type MenuTotals } from './nutrition'
import type { Targets } from './targets'
import { SLOTS, type DayMenu, type Dish, type Slot } from './types'

// [料理のid, 人前]。人前を省くと1人前
export type IdealMenuItem = string | [string, number]

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
]

const itemId = (x: IdealMenuItem) => (typeof x === 'string' ? x : x[0])
const itemPortion = (x: IdealMenuItem) => (typeof x === 'string' ? 1 : x[1])

// 量の調整のしかた。staple は主食（ごはん・パン・麺・丼）、dish はおかず・汁物、fixed は1個・1杯で数えるもの
export type PortionRole = 'staple' | 'dish' | 'fixed'

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
const BOUNDS: Record<PortionRole, [number, number]> = { staple: [0.5, 3], dish: [0.7, 1.5], fixed: [1, 1] }
// 白いごはん・麦ごはん・玄米ごはんは丼に大盛りくらい（3人前）まで増やせる（たくさん食べる人は塩分の少ないごはんで補う）。
// パン・おにぎり・麺・丼などは1.5人前まで（パンや麺は塩を含み、たくさん食べる人で食塩がふえすぎるため）。
// 足りない分は、ほかの区分のごはんで補う
const PLAIN_RICE = new Set(['rice', 'mugi-rice', 'genmai-rice', 'zakkoku-rice'])
export const stapleBounds = (dish: Dish): [number, number] => [0.5, PLAIN_RICE.has(dish.id) ? 3 : 1.5]
const boundsOf = (l: Line): [number, number] => (l.role === 'staple' ? stapleBounds(l.dish) : BOUNDS[l.role])
// 献立を組んだときの1日の目安（女性30〜49歳・ふつう 2,040kcal に近い値）
export const IDEAL_REFERENCE_KCAL = 2000
// 最初に割り振るときのおかずの範囲（ここをこえる分は主食で合わせる）
const DISH_FIRST: [number, number] = [0.8, 1.15]

const clamp = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, v))
const round1 = (v: number) => Math.round(v * 10) / 10

type Line = { slot: Slot; dish: Dish; base: number; portion: number; role: PortionRole }

const toMenu = (lines: Line[]): DayMenu => {
  const menu: DayMenu = { breakfast: [], lunch: [], dinner: [], other: [] }
  lines.forEach((l, i) => menu[l.slot].push({ uid: `ideal-${i}`, kind: 'dish', refId: l.dish.id, portion: l.portion }))
  return menu
}

// PFC・カロリー・食塩・飽和脂肪酸の外れ具合（0 なら全部おさまっている）。直すときの目安
function violation(lines: Line[], catalog: Catalog, targets: Targets, slotTargets: Partial<Record<Slot, number>>): number {
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
      const dish = catalog.dishes.get(itemId(x))
      if (!dish) continue
      const base = itemPortion(x)
      lines.push({ slot, dish, base, portion: base, role: portionRole(dish) })
    }
  }
  const kcalOf = (l: Line, portion = l.portion) => l.dish.nutrients.energyKcal! * portion

  // 1. おかず・汁物
  const g = clamp(Math.sqrt(targets.energyKcal / IDEAL_REFERENCE_KCAL), DISH_FIRST)
  for (const l of lines) if (l.role === 'dish') l.portion = round1(clamp(l.base * g, BOUNDS.dish))

  // 2. 主食のある区分で、残りのカロリーを配分どおりに分けて主食で合わせる（主食のない区分はそのまま）。
  //    パンなどが上限で足りない分は、まだ増やせる区分に配分の割合で回す
  const flexible = SLOTS.filter((s) => lines.some((l) => l.slot === s && l.role === 'staple'))
  const restKcal = lines.filter((l) => !flexible.includes(l.slot)).reduce((a, l) => a + kcalOf(l), 0)
  const shareSum = flexible.reduce((a, s) => a + share[s], 0)
  const slotTargets: Partial<Record<Slot, number>> = {}
  for (const slot of flexible) slotTargets[slot] = ((targets.energyKcal - restKcal) * share[slot]) / shareSum
  const goals = { ...slotTargets }
  const fill = (slot: Slot) => {
    const inSlot = lines.filter((l) => l.slot === slot)
    const staples = inSlot.filter((l) => l.role === 'staple')
    const others = inSlot.filter((l) => l.role !== 'staple').reduce((a, l) => a + kcalOf(l), 0)
    const h = (goals[slot]! - others) / staples.reduce((a, l) => a + kcalOf(l, l.base), 0)
    for (const l of staples) l.portion = round1(clamp(l.base * h, boundsOf(l)))
    return inSlot.reduce((a, l) => a + kcalOf(l), 0)
  }
  let open = [...flexible]
  for (let round = 0; round < 3 && open.length > 0; round++) {
    let left = 0
    for (const slot of open) left += goals[slot]! - fill(slot)
    const stuck = (slot: Slot) =>
      lines.filter((l) => l.slot === slot && l.role === 'staple').every((l) => l.portion === boundsOf(l)[left > 0 ? 1 : 0])
    open = open.filter((s) => !stuck(s))
    if (Math.abs(left) < 30 || open.length === 0) break
    const openShare = open.reduce((a, s) => a + share[s], 0)
    for (const slot of open) goals[slot]! += (left * share[slot]) / openShare
  }

  // 目安から外れていれば 0.1人前ずつ直す（いちばんよくなる1手を選ぶのをくり返す）。
  // 同じ区分の主食（おにぎり2個など）はいっしょに動かして、片方だけ大盛りにならないようにする
  const groups: Line[][] = []
  for (const l of lines) {
    if (l.role === 'fixed') continue
    const same = l.role === 'staple' ? groups.find((g) => g[0].role === 'staple' && g[0].slot === l.slot) : undefined
    if (same) same.push(l)
    else groups.push([l])
  }
  let score = repair ? violation(lines, catalog, targets, goals) : 0
  let repairs = 0
  for (let step = 0; step < 60 && score > 0; step++) {
    let best: { group: Line[]; d: number; score: number } | null = null
    for (const group of groups) {
      for (const d of [-0.1, 0.1]) {
        const next = group.map((l) => round1(l.portion + d))
        if (next.some((p, i) => p < boundsOf(group[i])[0] || p > boundsOf(group[i])[1])) continue
        const prev = group.map((l) => l.portion)
        group.forEach((l, i) => (l.portion = next[i]))
        // 元の量からのずれが小さいほうを少しだけ好む（同じくらいよくなるなら、自然な量のほうを選ぶ）
        const s = violation(lines, catalog, targets, goals) + group.reduce((a, l) => a + Math.abs(l.portion - l.base), 0) * 1e-3
        group.forEach((l, i) => (l.portion = prev[i]))
        if (s < score && (!best || s < best.score)) best = { group, d, score: s }
      }
    }
    if (!best) break
    for (const l of best.group) l.portion = round1(l.portion + best.d)
    score = violation(lines, catalog, targets, goals)
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
