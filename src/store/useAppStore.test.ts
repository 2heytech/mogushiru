import { beforeEach, describe, expect, it } from 'vitest'
import { emptyMenu, MY_PRODUCT_PREFIX, useAppStore } from './useAppStore'

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

describe('お気に入り', () => {
  const input = {
    name: 'いつものバー',
    brand: '',
    basis: 'serving' as const,
    nutrients: { energyKcal: 200, protein: 15, fat: 8, carb: 20, salt: 0.3 } as never,
  }
  beforeEach(() => useAppStore.setState({ menu: emptyMenu(), myDishes: [], myProducts: [], favoriteProductIds: [], savedMenus: [] }))

  it('登録した市販品は my- で始まり、お気に入りに入る', () => {
    const p = useAppStore.getState().saveMyProduct(input)
    expect(p.jan.startsWith(MY_PRODUCT_PREFIX)).toBe(true)
    expect(p.source.name).toBe('ユーザー登録')
    expect(useAppStore.getState().favoriteProductIds).toEqual([p.jan])
  })

  it('既存の市販品の星を付け外しできる', () => {
    useAppStore.getState().toggleFavoriteProduct('4900000000001')
    expect(useAppStore.getState().favoriteProductIds).toEqual(['4900000000001'])
    useAppStore.getState().toggleFavoriteProduct('4900000000001')
    expect(useAppStore.getState().favoriteProductIds).toEqual([])
  })

  it('登録した市販品を消すと、献立と保存した献立からも外れる', () => {
    const p = useAppStore.getState().saveMyProduct(input)
    useAppStore.getState().addItem('lunch', { kind: 'product', refId: p.jan, portion: 1 })
    useAppStore.getState().addItem('lunch', { kind: 'dish', refId: 'd1', portion: 1 })
    useAppStore.getState().saveMenu('いつもの')
    useAppStore.getState().deleteMyProduct(p.jan)
    const s = useAppStore.getState()
    expect(s.myProducts).toEqual([])
    expect(s.favoriteProductIds).toEqual([])
    expect(s.menu.lunch.map((i) => i.refId)).toEqual(['d1'])
    expect(s.savedMenus[0].menu.lunch.map((i) => i.refId)).toEqual(['d1'])
  })

  it('お気に入りの料理を消すと、献立からも外れる', () => {
    const my = useAppStore.getState().saveMyDish({ baseDishId: 'd1', name: '減塩', ingredients: custom })
    useAppStore.getState().addItem('dinner', { kind: 'myDish', refId: my.id, portion: 1 })
    useAppStore.getState().deleteMyDish(my.id)
    expect(useAppStore.getState().menu.dinner).toEqual([])
  })
})
