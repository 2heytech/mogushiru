// 1日の結果のまとめ。「目安の範囲内のもの」「気になる点」「次に試すこと」に分ける。
// 総評（「いいバランス！」）と個別の指摘（「野菜あと170g」）が食いちがって見えないように、
// マスコットの表情とひとことも、ここで分けた結果から決める
import type { Alert } from './alerts'
import { BALANCED_MEALS_GOAL, FRUIT_GOAL_G, MEAL_SLOTS, VEGETABLE_GOAL_G, type DayFoods, type MealFoods } from './foodBalance'
import type { MascotMood } from './mascotMood'
import { WANT_NUTRIENTS, type NutrientCheck } from './nutrientChecks'
import type { MenuTotals } from './nutrition'
import type { PfcGap } from './pfcGap'
import type { PfcKey } from './slotBalance'
import type { CheckedNutrient, Range, Targets } from './targets'
import type { Slot } from './types'

// カロリーは目安の±10%まで「範囲内」（まとめのゲージの帯と同じ）
export const ENERGY_TOLERANCE = 0.1
// 野菜・果物は目安の9割から「範囲内」（「あと10g」のような小さな差を、気になる点にしない）
export const AMOUNT_TOLERANCE = 0.1
// 気になる点に出す、足りない栄養素の数（割合の低い順）
const NUTRIENT_CONCERNS = 2
// 次に試すことは、多くても3つ
const MAX_STEPS = 3

export type SummaryState = 'empty' | 'partial' | 'full'

// 目安の範囲内のもの
export type OkKey = 'energy' | 'pfc' | 'salt' | 'vegetable' | 'fruit' | 'mealBalance' | 'nutrients'

export type Concern =
  // 上限・目安をこえている（食塩・飽和脂肪酸・アルコール・カフェイン・耐容上限量・カロリー）
  | { kind: 'over'; alert: Alert }
  // カロリーが目安の±10%の外（マイナスは足りない）。+15%をこえたら over のほうに出る
  | { kind: 'energy'; diff: number }
  | { kind: 'pfc'; key: PfcKey; gap: number; ratio: number; range: Range }
  | { kind: 'vegetable' | 'fruit'; rest: number }
  | { kind: 'mealBalance'; count: number }
  | { kind: 'nutrient'; key: CheckedNutrient; percent: number }

export type FoodPart = 'staple' | 'main' | 'side'
export type ReduceWhat = 'energy' | 'salt' | 'satFat' | 'alcohol' | 'caffeine' | 'supplement' | 'protein' | 'fat' | 'carb'

export type Step =
  // まだ入っていない食事を入れる
  | { kind: 'addMeal'; slot: Slot }
  // 主食・主菜・副菜を1品足す
  | { kind: 'addDish'; slot: Slot; part: FoodPart; why: 'energy' | 'protein' | 'carb' | 'vegetable' | 'mealBalance' }
  | { kind: 'addFruit' }
  // へらす・入れかえる（料理は自分で選ぶ）
  | { kind: 'reduce'; what: ReduceWhat; nutrient?: CheckedNutrient }
  // 減塩の調味料への置きかえの案を見る
  | { kind: 'swapSalt' }
  // その栄養素の多い食品を調べる
  | { kind: 'ranking'; key: CheckedNutrient }

export type DaySummary = {
  state: SummaryState
  // まだ入っていない食事（state が partial のとき）
  missing: Slot[]
  ok: OkKey[]
  // 範囲内だが、上限・目安の8割をこえているもの
  near: Alert[]
  concerns: Concern[]
  steps: Step[]
  mood: MascotMood
}

export type DaySummaryInput = {
  totals: MenuTotals
  targets: Targets
  foods: DayFoods | null
  alerts: Alert[]
  gaps: PfcGap[] | null
  checks: NutrientCheck[]
  // 朝・昼・晩のうち、まだ料理が入っていない区分（「1日ぶんとして計算する」を選んだら空にして渡す）
  missing: Slot[]
  // 減塩の置きかえの案があるか
  hasSaltSwap?: boolean
}

const REDUCE_FOR: Partial<Record<Alert['key'], ReduceWhat>> = { energy: 'energy', salt: 'salt', satFat: 'satFat', alcohol: 'alcohol', caffeine: 'caffeine' }

// 料理の材料から数えられたものがあるか（市販品だけの食事は、材料がわからないので食べものの単位では言わない）
const counted = (m: MealFoods) => m.groups.size > 0 || m.servings.staple > 0 || m.servings.main > 0 || m.servings.side > 0

// その区分が食べる食事か（配分が0%の区分は勧めない）
const mealSlots = (targets: Targets): Slot[] => MEAL_SLOTS.filter((s) => targets.slotShare[s] > 0)

// 主食・主菜・副菜のうち part がいちばん少ない食事（同じなら後ろの食事。晩に足すほうが取り入れやすい）
function slotLacking(part: FoodPart, foods: DayFoods | null, targets: Targets): Slot {
  const slots = mealSlots(targets)
  if (slots.length === 0) return 'dinner'
  if (!foods) return slots[slots.length - 1]
  return slots.reduce((best, s) => (foods.bySlot[s].servings[part] <= foods.bySlot[best].servings[part] ? s : best), slots[0])
}

// カロリーが区分の目安にいちばん届いていない食事
function slotLowEnergy(totals: MenuTotals, targets: Targets): Slot {
  const slots = mealSlots(targets)
  if (slots.length === 0) return 'dinner'
  const room = (s: Slot) => targets.energyKcal * targets.slotShare[s] - totals.bySlot[s].values.energyKcal
  return slots.reduce((best, s) => (room(s) > room(best) ? s : best), slots[0])
}

// 脂質が多い・飽和脂肪酸が多いは、どちらも「脂の多い料理を入れかえる」なので1つにまとめる
const reduceGroup = (what: ReduceWhat) => (what === 'satFat' ? 'fat' : what)

// 同じことを2回言わない（同じ種類の料理を足す、同じものをへらす）
const sameStep = (a: Step, b: Step) =>
  a.kind === 'addDish' && b.kind === 'addDish'
    ? a.part === b.part
    : a.kind === 'reduce' && b.kind === 'reduce'
      ? reduceGroup(a.what) === reduceGroup(b.what)
      : a.kind === 'addMeal' && b.kind === 'addMeal'
        ? a.slot === b.slot
        : a.kind === b.kind

export function daySummary({ totals, targets, foods, alerts, gaps, checks, missing, hasSaltSwap = false }: DaySummaryInput): DaySummary {
  const v = totals.day.values
  const hasAny = Object.values(v).some((x) => x > 0)
  if (!hasAny) return { state: 'empty', missing, ok: [], near: [], concerns: [], steps: [], mood: 'okay' }

  const overs = alerts.filter((a) => a.level === 'over')
  const near = alerts.filter((a) => a.level === 'warn')
  const concerns: Concern[] = overs.map((alert) => ({ kind: 'over', alert }))
  const steps: Step[] = []
  const push = (s: Step) => {
    if (!steps.some((x) => sameStep(x, s))) steps.push(s)
  }
  for (const a of overs) {
    if (a.key === 'salt' && hasSaltSwap) push({ kind: 'swapSalt' })
    const what = REDUCE_FOR[a.key]
    if (what) push({ kind: 'reduce', what })
    else if (a.key !== 'energy') push({ kind: 'reduce', what: 'supplement', nutrient: a.key })
  }

  // 入力の途中：足りない・かたよっていると決めつけない（とりすぎだけは途中でも知らせる）
  if (missing.length > 0 && v.energyKcal > 0) {
    const add: Step[] = missing.map((slot) => ({ kind: 'addMeal', slot }))
    return { state: 'partial', missing, ok: [], near, concerns, steps: [...add, ...steps].slice(0, MAX_STEPS), mood: overs.length > 0 ? 'alert' : 'okay' }
  }

  const ok: OkKey[] = []
  const isOver = (key: Alert['key']) => overs.some((a) => a.key === key)
  const isNear = (key: Alert['key']) => near.some((a) => a.key === key)

  // カロリー（サプリだけで 0kcal のときは言わない）
  if (v.energyKcal > 0) {
    const diff = v.energyKcal - targets.energyKcal
    if (Math.abs(diff) <= targets.energyKcal * ENERGY_TOLERANCE) ok.push('energy')
    else if (!isOver('energy')) {
      concerns.push({ kind: 'energy', diff })
      if (diff < 0) push({ kind: 'addDish', slot: slotLowEnergy(totals, targets), part: 'staple', why: 'energy' })
      else push({ kind: 'reduce', what: 'energy' })
    }
  }

  // PFCバランス
  if (gaps) {
    const off = gaps.filter((g) => g.gap !== 0)
    if (off.length === 0) ok.push('pfc')
    for (const g of off) {
      concerns.push({ kind: 'pfc', key: g.key, gap: g.gap, ratio: g.ratio, range: g.range })
      if (g.key === 'p' && g.gap < 0) push({ kind: 'addDish', slot: slotLacking('main', foods, targets), part: 'main', why: 'protein' })
      else if (g.key === 'c' && g.gap < 0) push({ kind: 'addDish', slot: slotLacking('staple', foods, targets), part: 'staple', why: 'carb' })
      else if (g.gap > 0) push({ kind: 'reduce', what: g.key === 'p' ? 'protein' : g.key === 'f' ? 'fat' : 'carb' })
    }
  }

  // 食塩（目安の8割をこえていれば near のほうに出る）
  if (v.energyKcal > 0 && !isOver('salt') && !isNear('salt')) ok.push('salt')

  // 野菜・果物、主食・主菜・副菜（料理の材料から数えられたときだけ）
  if (foods && counted(foods.day)) {
    const amount = (kind: 'vegetable' | 'fruit', value: number, goal: number) => {
      if (value >= goal * (1 - AMOUNT_TOLERANCE)) ok.push(kind)
      else {
        concerns.push({ kind, rest: Math.round(goal - value) })
        if (kind === 'vegetable') push({ kind: 'addDish', slot: slotLacking('side', foods, targets), part: 'side', why: 'vegetable' })
        else push({ kind: 'addFruit' })
      }
    }
    amount('vegetable', foods.day.vegetableG, VEGETABLE_GOAL_G)
    const slots = mealSlots(targets)
    const balanced = foods.balancedSlots.filter((s) => slots.includes(s)).length
    if (slots.length >= BALANCED_MEALS_GOAL) {
      if (balanced >= BALANCED_MEALS_GOAL) ok.push('mealBalance')
      else {
        concerns.push({ kind: 'mealBalance', count: balanced })
        // 料理が入っていて、どれかが欠けている最初の食事に足す
        for (const slot of slots) {
          const m = foods.bySlot[slot]
          if (!counted(m)) continue
          const lacking = (['side', 'main', 'staple'] as const).find((p) => m.servings[p] < 1)
          if (lacking) {
            push({ kind: 'addDish', slot, part: lacking, why: 'mealBalance' })
            break
          }
        }
      }
    }
    amount('fruit', foods.day.fruitG, FRUIT_GOAL_G)
  }

  // しっかりとりたい栄養素。目安の8割に届かないものを、割合の低い順に。
  // 成分が未収録の食品を含むもの（実際より少なく出ているかもしれない）は言わない
  const low = checks
    .filter((c) => (WANT_NUTRIENTS as readonly string[]).includes(c.key) && c.status === 'low' && !c.partial && c.percent !== null)
    .sort((a, b) => a.percent! - b.percent!)
  if (low.length === 0 && checks.some((c) => (WANT_NUTRIENTS as readonly string[]).includes(c.key) && c.status !== 'info')) ok.push('nutrients')
  for (const c of low.slice(0, NUTRIENT_CONCERNS)) concerns.push({ kind: 'nutrient', key: c.key, percent: c.percent! })
  if (low.length > 0) push({ kind: 'ranking', key: low[0].key })

  const mood: MascotMood = overs.length > 0 ? 'alert' : concerns.length === 0 ? 'happy' : concerns.length <= 2 ? 'okay' : 'worried'
  return { state: 'full', missing: [], ok, near, concerns, steps: steps.slice(0, MAX_STEPS), mood }
}
