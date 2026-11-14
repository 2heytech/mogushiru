import { beforeEach, describe, expect, it } from 'vitest'
import { emptyMenu, MY_PRODUCT_PREFIX, recentMyDishes, useAppStore } from './useAppStore'
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

describe('カスタマイズした料理', () => {
  beforeEach(() => useAppStore.setState({ menu: emptyMenu(), myDishes: [] }))

  it('人前を一緒に保存し、置き換えた献立の項目も同じ人前になる', () => {
    const s = useAppStore.getState()
    const uid = s.addItem('dinner', { kind: 'dish', refId: 'd1', portion: 1 })
    const my = s.saveMyDish({ baseDishId: 'd1', name: '肉じゃが（1.5人前）', ingredients: [], portion: 1.5 })
    s.replaceWithMyDish('dinner', uid, my.id, 1.5)
    expect(useAppStore.getState().menu.dinner[0]).toEqual({ uid, kind: 'myDish', refId: my.id, portion: 1.5 })
    expect(my.portion).toBe(1.5)
  })

  it('最後に保存したものから並ぶ', () => {
    const dishes = [
      { id: 'a', baseDishId: null, name: 'A', ingredients: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-03T00:00:00Z' },
      { id: 'b', baseDishId: null, name: 'B', ingredients: [], createdAt: '2026-01-02T00:00:00Z' },
      { id: 'c', baseDishId: null, name: 'C', ingredients: [], createdAt: '2026-01-04T00:00:00Z' },
    ]
    expect(recentMyDishes(dishes).map((d) => d.id)).toEqual(['c', 'a', 'b'])
  })
})

describe('カスタマイズした料理の区分', () => {
  beforeEach(() => useAppStore.setState({ menu: emptyMenu(), myDishes: [] }))

  it('別の区分に入れたら、その区分でも上に出す', () => {
    const s = useAppStore.getState()
    const my = s.saveMyDish({ baseDishId: 'd1', name: 'うす味', ingredients: [], slots: ['dinner'] })
    s.addItem('breakfast', { kind: 'myDish', refId: my.id, portion: 1 })
    expect(useAppStore.getState().myDishes[0].slots).toEqual(['breakfast', 'dinner'])
  })
})

describe('なくなった料理・市販品を1日の食事から外す', () => {
  beforeEach(() => {
    useAppStore.setState({ menu: emptyMenu() })
    useAppStore.getState().addItem('lunch', { kind: 'product', refId: 'gone', portion: 1 })
    useAppStore.getState().addItem('lunch', { kind: 'dish', refId: 'd1', portion: 1 })
  })

  it('prepare が返した1日の食事に置き換える', () => {
    useAppStore.getState().pruneMenu((m) => ({ ...m, lunch: m.lunch.filter((i) => i.refId !== 'gone') }))
    expect(useAppStore.getState().menu.lunch.map((i) => i.refId)).toEqual(['d1'])
  })

  it('prepare が同じ1日の食事を返したら書き換えない', () => {
    const before = useAppStore.getState().menu
    useAppStore.getState().pruneMenu((m) => m)
    expect(useAppStore.getState().menu).toBe(before)
  })
})

const dish = { kind: 'dish' as const, refId: 'test-dish', portion: 1 }

describe('呼び出した献立の名前（menuSource）', () => {
  beforeEach(() => useAppStore.setState({ menu: emptyMenu(), menuSource: null, savedMenus: [] }))

  it('理想の献立を呼び出すと名前を覚え、料理を足したり外したりすると「変更あり」になる', () => {
    const s = useAppStore.getState()
    s.replaceMenu({ ...emptyMenu(), breakfast: [{ ...dish, uid: 'x' }] }, 'テストの献立')
    expect(useAppStore.getState().menuSource).toEqual({ name: 'テストの献立', edited: false })
    s.addItem('lunch', dish)
    expect(useAppStore.getState().menuSource).toEqual({ name: 'テストの献立', edited: true })
  })

  it('保存すると、その名前で「変更なし」に戻り、呼び出すと保存した名前になる', () => {
    const s = useAppStore.getState()
    s.addItem('dinner', dish)
    expect(useAppStore.getState().menuSource).toBeNull()
    s.saveMenu('11月11日の食事')
    expect(useAppStore.getState().menuSource).toEqual({ name: '11月11日の食事', edited: false })
    s.clearMenu()
    expect(useAppStore.getState().menuSource).toBeNull()
    s.loadMenu(useAppStore.getState().savedMenus[0].id)
    expect(useAppStore.getState().menuSource).toEqual({ name: '11月11日の食事', edited: false })
  })

  it('名前なしで置き換えたときは、呼び出した献立の名前を出さない', () => {
    useAppStore.getState().replaceMenu({ ...emptyMenu(), other: [{ ...dish, uid: 'y' }] })
    expect(useAppStore.getState().menuSource).toBeNull()
  })
})

describe('作り方の人数', () => {
  it('はじめは2人分。1〜10人分の整数におさめて覚える（栄養の人前とは別）', () => {
    expect(useAppStore.getInitialState().recipeServings).toBe(2)
    useAppStore.getState().setRecipeServings(4)
    expect(useAppStore.getState().recipeServings).toBe(4)
    useAppStore.getState().setRecipeServings(0)
    expect(useAppStore.getState().recipeServings).toBe(1)
    useAppStore.getState().setRecipeServings(12)
    expect(useAppStore.getState().recipeServings).toBe(10)
  })
})

describe('飲み物の杯数', () => {
  const long = { label: 'ロング缶', ml: 500, unit: '本' }
  beforeEach(() => {
    useAppStore.setState({ menu: emptyMenu(), recentDrinks: [] })
    useAppStore.getState().addItem('dinner', { kind: 'dish', refId: 'beer', portion: 1 })
  })
  const item = () => useAppStore.getState().menu.dinner[0]

  it('杯数と1杯の量を変え、1人前の量にもどしたら cup を外す', () => {
    useAppStore.getState().updateDrink('dinner', item().uid, { portion: 2.857, cup: long })
    expect(item()).toMatchObject({ portion: 2.857, cup: long })
    useAppStore.getState().updateDrink('dinner', item().uid, { portion: 2, cup: undefined })
    expect(item().portion).toBe(2)
    expect(item()).not.toHaveProperty('cup')
  })

  it('最近の飲み物を覚える', () => {
    useAppStore.getState().rememberDrink('dish:beer', long)
    useAppStore.getState().rememberDrink('dish:drink-green-tea')
    expect(useAppStore.getState().recentDrinks).toEqual([{ key: 'dish:drink-green-tea' }, { key: 'dish:beer', cup: long }])
  })
})
