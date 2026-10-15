import { EXERCISE_TYPE, STEPS_PER_MINUTE } from '../domain/energy'
import type { Exercise } from '../domain/types'

// 入力中の運動。数字は文字列のまま持ち、保存のときに直す
export type ExerciseDraft = { key: string; type: string; unit: 'minutes' | 'steps'; amount: string; perWeek: number; mets: string }

export const EXERCISE_LIMIT = { minutes: { min: 1, max: 600 }, steps: { min: 100, max: 50000 }, mets: { min: 1.1, max: 20 } }

export const numOrUndef = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) ? undefined : Number(s))
export const within = (v: number | undefined, { min, max }: { min: number; max: number }) => v !== undefined && v >= min && v <= max
let seq = 0
export const newDraftKey = () => `ex-${Date.now()}-${seq++}`

export const toDraft = (e: Exercise): ExerciseDraft => ({
  key: newDraftKey(),
  type: EXERCISE_TYPE.has(e.type) ? e.type : 'custom',
  unit: e.steps !== undefined ? 'steps' : 'minutes',
  amount: String(e.steps ?? e.minutes),
  perWeek: e.perWeek,
  mets: String(e.mets ?? EXERCISE_TYPE.get(e.type)?.mets ?? ''),
})

// 正しく入っていなければ null
export function fromDraft(d: ExerciseDraft): Exercise | null {
  const amount = numOrUndef(d.amount)
  const t = EXERCISE_TYPE.get(d.type)
  if (!t) return null
  const steps = d.unit === 'steps' && t.steps
  if (!within(amount, steps ? EXERCISE_LIMIT.steps : EXERCISE_LIMIT.minutes)) return null
  const e: Exercise = steps ? { type: d.type, minutes: amount! / STEPS_PER_MINUTE, steps: amount!, perWeek: d.perWeek } : { type: d.type, minutes: amount!, perWeek: d.perWeek }
  if (d.type === 'custom') {
    const mets = numOrUndef(d.mets)
    if (!within(mets, EXERCISE_LIMIT.mets)) return null
    e.mets = mets
  }
  return e
}

