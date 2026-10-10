import { beforeEach, describe, expect, it } from 'vitest'
import { emptyMenu, useAppStore } from './useAppStore'

const custom = [{ foodId: '00001', grams: 80 }]

describe('料理のアレンジ', () => {
  beforeEach(() => {
    useAppStore.setState({ menu: emptyMenu(), myDishes: [] })
    useAppStore.getState().addItem('dinner', { kind: 'dish', refId: 'd1', portion: 1.5 })
  })
  const item = () => useAppStore.getState().menu.dinner[0]

  it('献立の料理にアレンジを反映し、null で元に戻す', () => {
    useAppStore.getState().customizeItem('dinner', item().uid, custom)
    expect(item().customIngredients).toEqual(custom)
    useAppStore.getState().customizeItem('dinner', item().uid, null)
    expect(item()).not.toHaveProperty('customIngredients')
    expect(item().portion).toBe(1.5)
  })

  it('マイ料理に保存すると、献立の料理がマイ料理に置き換わる（量はそのまま）', () => {
    const { uid } = item()
    const my = useAppStore.getState().saveMyDish({ baseDishId: 'd1', name: '減塩', ingredients: custom })
    useAppStore.getState().replaceWithMyDish('dinner', uid, my.id)
    expect(item()).toEqual({ uid, kind: 'myDish', refId: my.id, portion: 1.5 })
  })

  it('マイ料理を上書きする', () => {
    const my = useAppStore.getState().saveMyDish({ baseDishId: 'd1', name: '減塩', ingredients: custom })
    useAppStore.getState().updateMyDish(my.id, { name: 'うす味', ingredients: [] })
    expect(useAppStore.getState().myDishes[0]).toMatchObject({ id: my.id, name: 'うす味', ingredients: [], baseDishId: 'd1' })
  })
})
