import type { CheckedNutrient, NutrientTarget, Targets, UpperScope } from './targets'
import type { NutrientTotals, Slot } from './types'

// 表示する順番。上限に気をつけたいもの → しっかりとりたいもの → 基準がないもの
export const LIMIT_NUTRIENTS = ['salt', 'satFat', 'alcohol', 'caffeine', 'retinol'] as const satisfies CheckedNutrient[]
export const WANT_NUTRIENTS = [
  'fiber',
  'potassium',
  'calcium',
  'iron',
  'magnesium',
  'zinc',
  'vitaminA',
  'vitaminD',
  'vitaminE',
  'vitaminB1',
  'vitaminB2',
  'niacin',
  'vitaminB6',
  'folate',
  'vitaminC',
  'n3Fat',
  'n6Fat',
] as const satisfies CheckedNutrient[]
export const INFO_NUTRIENTS = ['monoUnsatFat', 'polyUnsatFat'] as const satisfies CheckedNutrient[]
// 区分に分けず、区分のカードでも1日の値と比べるもの
export const DAILY_ONLY: CheckedNutrient[] = ['alcohol', 'caffeine']
export const CHECKED_NUTRIENTS: CheckedNutrient[] = [...LIMIT_NUTRIENTS, ...WANT_NUTRIENTS, ...INFO_NUTRIENTS]

// ok: 目安を満たす・上限より十分少ない／near: とりたい量の8割以上、または上限の8割こえ／
// low: とりたい量の8割未満／over: 上限（耐容上限量を含む）こえ／info: 比べる基準がない・判定しない
export type CheckStatus = 'ok' | 'near' | 'low' | 'over' | 'info'

export type NutrientCheck = {
  key: CheckedNutrient
  amount: number
  target: NutrientTarget
  // 比べる量（区分のときは1日の目安を区分の割合で配分した量）。基準がなければ null
  goal: number | null
  // 耐容上限量（1日の値。区分でもこの値と比べる）
  upper: number | null
  // 耐容上限量と比べる量。upperScope が 'supplement' ならサプリの分だけ
  upperScope: UpperScope
  upperAmount: number
  status: CheckStatus
  // 目安に対する割合（％）。上限のある栄養素は上限に対する割合。基準がなければ null
  percent: number | null
  // 未収録の食品があり、実際より少なく出ている可能性がある
  partial: boolean
}

// 上限の 80% を超えたら「上限ちかい」、とりたい量の 80% 以上なら「あと少し」（アプリ独自）
const NEAR = 0.8

export function judge(
  amount: number,
  target: NutrientTarget,
  goal: number | null,
  upper: number | null,
  judgeLow: boolean,
  upperAmount = amount,
): CheckStatus {
  if (target.kind === 'none' || goal === null) return 'info'
  if (target.kind === 'max') {
    if (target.overAtLimit ? amount >= goal : amount > goal) return 'over'
    return amount > goal * NEAR ? 'near' : 'ok'
  }
  if (upper !== null && upperAmount > upper) return 'over'
  if (!judgeLow) return 'info'
  if (amount >= goal) return 'ok'
  return amount >= goal * NEAR ? 'near' : 'low'
}

// slot を渡すと区分の目安（1日の目安 × 区分の割合）と比べる。
// アルコール・カフェインは1日の量の目安なので、区分に分けず1日の値のまま比べる。
// 耐容上限量も1日の値のまま比べる（1食でこえれば1日でもこえる）。
// その他（間食・飲み物）は少なくても問題にしないので、とりたい栄養素の不足は判定しない。
// supplement はサプリの分だけの合計。サプリ分だけにかかる耐容上限量（マグネシウムなど）はこれと比べ、
// 渡さなければその上限は判定しない（区分カード）
export function nutrientChecks(totals: NutrientTotals, targets: Targets, slot?: Slot, supplement?: NutrientTotals): NutrientCheck[] {
  return CHECKED_NUTRIENTS.map((key) => {
    const target = targets.nutrients[key]
    const daily = DAILY_ONLY.includes(key) || (target.kind === 'max' && target.basis === '耐容上限量')
    const share = slot && !daily ? targets.slotShare[slot] : 1
    const goal = target.kind === 'none' ? null : target.value * share
    const scope = upperScopeOf(target)
    const upper = target.kind === 'min' && target.upper !== undefined && (scope === 'all' || supplement) ? target.upper : null
    const amount = totals.values[key]
    const upperAmount = scope === 'supplement' ? (supplement?.values[key] ?? 0) : amount
    return {
      key,
      amount,
      target,
      goal,
      upper,
      upperScope: scope,
      upperAmount,
      status: judge(amount, target, goal, upper, slot !== 'other', upperAmount),
      percent: goal ? (amount / goal) * 100 : null,
      partial: totals.missing.has(key),
    }
  })
}

export type CheckSummary = Record<Exclude<CheckStatus, 'info'>, number>

export function summarizeChecks(checks: NutrientCheck[]): CheckSummary {
  const s: CheckSummary = { ok: 0, near: 0, low: 0, over: 0 }
  for (const c of checks) if (c.status !== 'info') s[c.status]++
  return s
}

// 畳んだ状態で見せる「気になる栄養素」。こえているもの → 割合の低い不足の順に limit 件
export function notableChecks(checks: NutrientCheck[], limit: number): NutrientCheck[] {
  const over = checks.filter((c) => c.status === 'over').sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0))
  const low = checks.filter((c) => c.status === 'low').sort((a, b) => (a.percent ?? 0) - (b.percent ?? 0))
  return [...over, ...low].slice(0, limit)
}

// 耐容上限量が何にかかるか。'supplement' はサプリなど通常の食品以外からとる分だけ
export function upperScopeOf(target: NutrientTarget): UpperScope {
  return target.kind === 'min' ? (target.upperScope ?? 'all') : 'all'
}

// 耐容上限量（とりすぎで健康障害のおそれが出る量）。とりたい栄養素の upper と、上限だけがあるもの（レチノール）
export function tolerableUpper(target: NutrientTarget): number | null {
  if (target.kind === 'min') return target.upper ?? null
  if (target.kind === 'max' && target.basis === '耐容上限量') return target.value
  return null
}
