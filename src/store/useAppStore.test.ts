import { beforeEach, describe, expect, it } from 'vitest'
import { emptyMenu, MY_PRODUCT_PREFIX, useAppStore } from './useAppStore'
import { isSupplement, SUPPLEMENT_CATEGORY, supplementNutrients } from '../domain/supplement'

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

describe('1日の食事の保存・呼び出し・リセット', () => {
  beforeEach(() => useAppStore.setState({ menu: emptyMenu(), savedMenus: [] }))

  it('名前を付けて保存し、呼び出すと今の内容を置き換える', () => {
    useAppStore.getState().addItem('breakfast', { kind: 'dish', refId: 'd1', portion: 1 })
    useAppStore.getState().saveMenu('平日')
    useAppStore.getState().clearMenu()
    useAppStore.getState().addItem('dinner', { kind: 'dish', refId: 'd2', portion: 1 })
    useAppStore.getState().loadMenu(useAppStore.getState().savedMenus[0].id)
    const s = useAppStore.getState()
    expect(s.menu.breakfast.map((i) => i.refId)).toEqual(['d1'])
    expect(s.menu.dinner).toEqual([])
  })

  it('同じ名前で保存すると上書きし、別の名前なら増える', () => {
    useAppStore.getState().addItem('lunch', { kind: 'dish', refId: 'd1', portion: 1 })
    useAppStore.getState().saveMenu('平日')
    const id = useAppStore.getState().savedMenus[0].id
    useAppStore.getState().addItem('lunch', { kind: 'dish', refId: 'd2', portion: 1 })
    useAppStore.getState().saveMenu('平日')
    useAppStore.getState().saveMenu('休日')
    const { savedMenus } = useAppStore.getState()
    expect(savedMenus.map((m) => m.name)).toEqual(['平日', '休日'])
    expect(savedMenus[0].id).toBe(id)
    expect(savedMenus[0].menu.lunch.map((i) => i.refId)).toEqual(['d1', 'd2'])
  })

  it('保存したあとで今の内容を変えても、保存した内容は変わらない', () => {
    useAppStore.getState().addItem('lunch', { kind: 'dish', refId: 'd1', portion: 1 })
    useAppStore.getState().saveMenu('平日')
    useAppStore.getState().updatePortion('lunch', useAppStore.getState().menu.lunch[0].uid, 2)
    expect(useAppStore.getState().savedMenus[0].menu.lunch[0].portion).toBe(1)
  })

  it('呼び出すときに prepare で項目を外せる', () => {
    useAppStore.getState().addItem('lunch', { kind: 'dish', refId: 'd1', portion: 1 })
    useAppStore.getState().addItem('lunch', { kind: 'dish', refId: 'gone', portion: 1 })
    useAppStore.getState().saveMenu('平日')
    useAppStore.getState().loadMenu(useAppStore.getState().savedMenus[0].id, (m) => ({ ...m, lunch: m.lunch.filter((i) => i.refId !== 'gone') }))
    expect(useAppStore.getState().menu.lunch.map((i) => i.refId)).toEqual(['d1'])
  })

  it('削除とリセット', () => {
    useAppStore.getState().addItem('other', { kind: 'dish', refId: 'd1', portion: 1 })
    useAppStore.getState().saveMenu('平日')
    useAppStore.getState().deleteMenu(useAppStore.getState().savedMenus[0].id)
    expect(useAppStore.getState().savedMenus).toEqual([])
    useAppStore.getState().clearMenu()
    expect(useAppStore.getState().menu).toEqual(emptyMenu())
  })
})

describe('料理を選ぶ画面での追加と取り消し', () => {
  it('追加した項目の uid で、その項目だけを外せる', () => {
    useAppStore.setState({ menu: emptyMenu() })
    const { addItem, removeItem } = useAppStore.getState()
    const a = addItem('breakfast', { kind: 'food', refId: '01026', portion: 60 })
    addItem('breakfast', { kind: 'food', refId: '07013', portion: 15 })
    removeItem('breakfast', a)
    expect(useAppStore.getState().menu.breakfast.map((i) => i.refId)).toEqual(['07013'])
  })
})

describe('サプリ', () => {
  beforeEach(() => useAppStore.setState({ menu: emptyMenu(), myDishes: [], myProducts: [], favoriteProductIds: [], savedMenus: [] }))

  it('登録したサプリはサプリとして保存され、お気に入りの市販品には入らない', () => {
    const p = useAppStore.getState().saveMyProduct({
      name: 'ビタミンC',
      brand: '',
      basis: 'serving',
      servingLabel: '2粒',
      nutrients: supplementNutrients({ vitaminC: 500 }),
      category: SUPPLEMENT_CATEGORY,
    })
    expect(isSupplement(p)).toBe(true)
    expect(p.servingLabel).toBe('2粒')
    expect(useAppStore.getState().myProducts).toHaveLength(1)
    expect(useAppStore.getState().favoriteProductIds).toEqual([])
  })

  it('サプリを消すと、1日の食事と保存した1日の食事からも外れる', () => {
    const p = useAppStore.getState().saveMyProduct({ name: '鉄', brand: '', basis: 'serving', nutrients: supplementNutrients({ iron: 10 }), category: SUPPLEMENT_CATEGORY })
    useAppStore.getState().addItem('other', { kind: 'supplement', refId: p.jan, portion: 1 })
    useAppStore.getState().saveMenu('サプリあり')
    useAppStore.getState().deleteMyProduct(p.jan)
    expect(useAppStore.getState().menu.other).toEqual([])
    expect(useAppStore.getState().savedMenus[0].menu.other).toEqual([])
  })
})
