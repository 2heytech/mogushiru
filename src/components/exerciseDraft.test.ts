import { describe, expect, it } from 'vitest'
import { fromDraft, toDraft, type ExerciseDraft } from './exerciseDraft'

const draft = (patch: Partial<ExerciseDraft>): ExerciseDraft => ({ key: 'k', type: 'walk', unit: 'minutes', amount: '30', perWeek: 3, mets: '', ...patch })

describe('運動の入力', () => {
  it('時間で入れた運動をそのまま保存する', () => {
    expect(fromDraft(draft({}))).toEqual({ type: 'walk', minutes: 30, perWeek: 3 })
  })

  it('歩数で入れたら歩数を残し、時間は1,000歩＝10分で持つ', () => {
    expect(fromDraft(draft({ unit: 'steps', amount: '4000' }))).toEqual({ type: 'walk', minutes: 40, steps: 4000, perWeek: 3 })
  })

  it('歩数で入れられない種類は時間として扱う', () => {
    expect(fromDraft(draft({ type: 'jog', unit: 'steps', amount: '30' }))).toEqual({ type: 'jog', minutes: 30, perWeek: 3 })
  })

  it('空・範囲外・知らない種類は保存しない', () => {
    expect(fromDraft(draft({ amount: '' }))).toBeNull()
    expect(fromDraft(draft({ amount: '0' }))).toBeNull()
    expect(fromDraft(draft({ amount: '601' }))).toBeNull()
    expect(fromDraft(draft({ unit: 'steps', amount: '50' }))).toBeNull()
    expect(fromDraft(draft({ type: 'nope' }))).toBeNull()
  })

  it('「そのほか」はメッツも入れる（1より大きい値）', () => {
    expect(fromDraft(draft({ type: 'custom', mets: '5.5' }))).toEqual({ type: 'custom', minutes: 30, perWeek: 3, mets: 5.5 })
    expect(fromDraft(draft({ type: 'custom', mets: '1' }))).toBeNull()
  })

  it('保存した運動を入力欄に戻せる', () => {
    expect(fromDraft(toDraft({ type: 'walk-brisk', minutes: 50, steps: 5000, perWeek: 5 }))).toEqual({ type: 'walk-brisk', minutes: 50, steps: 5000, perWeek: 5 })
    expect(fromDraft(toDraft({ type: 'custom', minutes: 20, perWeek: 2, mets: 3.3 }))).toEqual({ type: 'custom', minutes: 20, perWeek: 2, mets: 3.3 })
  })
})
