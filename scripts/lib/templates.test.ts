import { describe, expect, it } from 'vitest'
import { expandTemplate, isTemplate, type TemplateInput } from './templates'

const t: TemplateInput = {
  template: 'grilled',
  name: '{name}の塩焼き',
  kana: '{kana}のしおやき',
  category: 'main',
  suggestedSlots: ['dinner'],
  ingredients: [
    { foodId: '{food}', grams: '{grams}', role: '魚' },
    { foodId: '17012', grams: 0.8 },
  ],
  variants: [
    { id: 'a', name: 'あ', kana: 'あ', food: '10001', grams: 70, alternatives: ['10002'] },
    { id: 'b', name: 'い', kana: 'い', food: '10003', grams: 80, extra: [{ foodId: '06001', grams: 20 }], suggestedSlots: ['lunch'] },
  ],
}

describe('料理の型の展開', () => {
  it('型の名前・材料に食材を当てはめる', () => {
    const { recipes, errors } = expandTemplate(t)
    expect(errors).toEqual([])
    expect(recipes.map((r) => r.id)).toEqual(['grilled-a', 'grilled-b'])
    expect(recipes[0]).toMatchObject({ name: 'あの塩焼き', kana: 'あのしおやき', suggestedSlots: ['dinner'] })
    expect(recipes[0].ingredients).toEqual([
      { foodId: '10001', grams: 70, role: '魚', alternatives: ['10002'] },
      { foodId: '17012', grams: 0.8 },
    ])
    expect(recipes[1].ingredients.at(-1)).toEqual({ foodId: '06001', grams: 20 })
    expect(recipes[1].suggestedSlots).toEqual(['lunch'])
  })

  it('食材や量が抜けているとエラー', () => {
    const { errors } = expandTemplate({ ...t, variants: [{ id: 'c', name: 'う', kana: 'う' }] })
    expect(errors).toHaveLength(2)
  })

  it('型かどうかを見分ける', () => {
    expect(isTemplate(t)).toBe(true)
  })
})
