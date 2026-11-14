// 料理の材料の置きかえの案：減塩の調味料（食塩を減らす）と、主食の全粒穀物（食物繊維を足す）。
// 成分表にある食品どうしで置きかえ、今日の1日の食事でどれだけ変わるかを出す。
//
// 出典
// - 減塩：日本高血圧学会「高血圧管理・治療ガイドライン2025」（食塩6g/日未満）
// - カリウム入りの減塩塩：WHO「Use of lower-sodium salt substitutes」（2025年）。腎機能が低い人などは除く
// - 全粒穀物と食物繊維：WHO「Carbohydrate intake for adults and children」（2023年）、Reynolds ら Lancet 2019
//
// 成分表（八訂）では玄米ごはんの食物繊維（1.4g/100g）が白ごはん（1.5g）より少ない（測り方が変わったため）ので、
// ごはんは押麦を3割まぜた麦ごはんを勧める
import type { Catalog } from './nutrition'
import { SLOTS, type DayMenu, type Food, type Ingredient, type MenuItem, type Slot } from './types'

export type SwapKind = 'salt' | 'fiber'

type SwapRule = {
  kind: SwapKind
  from: readonly string[]
  to: string
  fromLabel: string
  toLabel: string
  // 置きかえる割合（0〜1）。なければ全部置きかえる
  mix?: number
  caution?: string
}

const SALT_SUBSTITUTE_CAUTION = 'カリウムの多い塩です。腎臓の病気などでカリウムを控えるよう言われている人は使わないでください。'

export const SWAP_RULES: readonly SwapRule[] = [
  { kind: 'salt', from: ['17007'], to: '17086', fromLabel: 'こいくちしょうゆ', toLabel: '減塩しょうゆ' },
  { kind: 'salt', from: ['17008'], to: '17139', fromLabel: 'うすくちしょうゆ', toLabel: '低塩のうすくちしょうゆ' },
  { kind: 'salt', from: ['17045', '17046'], to: '17119', fromLabel: 'みそ', toLabel: '減塩みそ' },
  { kind: 'salt', from: ['17012'], to: '17146', fromLabel: '食塩', toLabel: '減塩タイプの食塩', caution: SALT_SUBSTITUTE_CAUTION },
  { kind: 'fiber', from: ['01088'], to: '01170', mix: 0.3, fromLabel: '白ごはん', toLabel: '麦ごはん（押麦3割）' },
  { kind: 'fiber', from: ['01026'], to: '01032', fromLabel: '食パン', toLabel: 'ライ麦パン' },
]

// これより小さい変化は勧めない（表示の桁で0.2g・0.5gくらい）
export const MIN_GAIN: Record<SwapKind, number> = { salt: 0.15, fiber: 0.45 }

export type SwapIdea = {
  kind: SwapKind
  slot: Slot
  uid: string
  itemName: string
  fromLabel: string
  toLabel: string
  // 1日の食事で変わる量。salt は減る食塩（g）、fiber は増える食物繊維（g）
  gain: number
  // 増えるカリウム（mg）
  potassiumGain: number
  caution?: string
  // 置きかえたあとの材料（1人前）
  ingredients: Ingredient[]
}

// 置きかえられる献立の1品の材料（1人前）と名前。材料を変えられない市販品・食品そのもの・サプリは null
function editable(item: MenuItem, catalog: Catalog): { name: string; ingredients: Ingredient[] } | null {
  if (item.kind === 'dish') {
    const d = catalog.dishes.get(item.refId)
    return d ? { name: d.name, ingredients: item.customIngredients ?? d.ingredients } : null
  }
  if (item.kind === 'myDish') {
    const m = catalog.myDishes.get(item.refId)
    return m ? { name: m.name, ingredients: item.customIngredients ?? m.ingredients } : null
  }
  return null
}

// 材料に置きかえを当てる。同じ食品が2つになったら1つにまとめる
export function applySwap(ingredients: Ingredient[], rule: SwapRule): Ingredient[] {
  const out: Ingredient[] = []
  const add = (ing: Ingredient) => {
    const same = out.find((o) => o.foodId === ing.foodId)
    if (same) same.grams += ing.grams
    else out.push({ ...ing })
  }
  for (const ing of ingredients) {
    if (!rule.from.includes(ing.foodId)) {
      add(ing)
      continue
    }
    if (rule.mix === undefined) {
      add({ ...ing, foodId: rule.to })
    } else {
      add({ ...ing, grams: ing.grams * (1 - rule.mix) })
      add({ foodId: rule.to, grams: ing.grams * rule.mix })
    }
  }
  return out.map((i) => ({ ...i, grams: Math.round(i.grams * 10) / 10 }))
}

function amountOf(ings: Ingredient[], foods: Map<string, Food>, key: 'salt' | 'fiber' | 'potassium'): number {
  let sum = 0
  for (const i of ings) sum += ((foods.get(i.foodId)?.per100g[key] ?? 0) * i.grams) / 100
  return sum
}

// 1日の食事で置きかえられる材料。kind ごとに、変わる量の多い順
export function swapIdeas(menu: DayMenu, catalog: Catalog): SwapIdea[] {
  const ideas: SwapIdea[] = []
  for (const slot of SLOTS) {
    for (const item of menu[slot] ?? []) {
      const e = editable(item, catalog)
      if (!e) continue
      for (const rule of SWAP_RULES) {
        if (!e.ingredients.some((i) => rule.from.includes(i.foodId))) continue
        // まぜる置きかえ（麦ごはん）は、もうまぜてあれば勧めない
        if (rule.mix !== undefined && e.ingredients.some((i) => i.foodId === rule.to)) continue
        if (!catalog.foods.has(rule.to)) continue
        const next = applySwap(e.ingredients, rule)
        const key = rule.kind === 'salt' ? 'salt' : 'fiber'
        const before = amountOf(e.ingredients, catalog.foods, key)
        const after = amountOf(next, catalog.foods, key)
        const gain = (rule.kind === 'salt' ? before - after : after - before) * item.portion
        if (gain < MIN_GAIN[rule.kind]) continue
        const potassiumGain = (amountOf(next, catalog.foods, 'potassium') - amountOf(e.ingredients, catalog.foods, 'potassium')) * item.portion
        ideas.push({
          kind: rule.kind,
          slot,
          uid: item.uid,
          itemName: e.name,
          fromLabel: rule.fromLabel,
          toLabel: rule.toLabel,
          gain,
          potassiumGain,
          caution: rule.caution,
          ingredients: next,
        })
      }
    }
  }
  return ideas.sort((a, b) => b.gain - a.gain)
}
