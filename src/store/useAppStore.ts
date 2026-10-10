import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DEFAULT_PROFILE } from '../domain/targets'
import type { DayMenu, Ingredient, MenuItem, MyDish, Product, Profile, Slot } from '../domain/types'

export const emptyMenu = (): DayMenu => ({ breakfast: [], lunch: [], dinner: [], other: [] })

export type SavedMenu = { id: string; name: string; menu: DayMenu; savedAt: string }

// 栄養成分表示から登録する市販品。入力のない成分は未収録（null）
export type MyProductInput = Pick<Product, 'name' | 'brand' | 'basis' | 'servingGrams' | 'nutrients'>

export const MY_PRODUCT_PREFIX = 'my-'

// 献立から、消したお気に入りを参照している項目を外す
const without = (menu: DayMenu, kind: MenuItem['kind'], refId: string): DayMenu =>
  Object.fromEntries(Object.entries(menu).map(([slot, items]) => [slot, items.filter((i) => !(i.kind === kind && i.refId === refId))])) as DayMenu

type State = {
  profile: Profile
  profileSet: boolean
  menu: DayMenu
  myDishes: MyDish[]
  // お気に入り：登録した市販品と、星を付けた既存の市販品
  myProducts: Product[]
  favoriteProductIds: string[]
  savedMenus: SavedMenu[]
  setProfile: (p: Profile) => void
  addItem: (slot: Slot, item: Omit<MenuItem, 'uid'>) => void
  updatePortion: (slot: Slot, uid: string, portion: number) => void
  // 献立の料理をアレンジした材料で置き換える（null で元のレシピに戻す）
  customizeItem: (slot: Slot, uid: string, ingredients: Ingredient[] | null) => void
  // 献立の料理をお気に入りの料理に置き換える
  replaceWithMyDish: (slot: Slot, uid: string, myDishId: string) => void
  removeItem: (slot: Slot, uid: string) => void
  moveItem: (from: Slot, to: Slot, uid: string) => void
  clearMenu: () => void
  saveMyDish: (d: Omit<MyDish, 'id' | 'createdAt'>) => MyDish
  updateMyDish: (id: string, patch: Partial<Pick<MyDish, 'name' | 'ingredients'>>) => void
  deleteMyDish: (id: string) => void
  saveMyProduct: (p: MyProductInput) => Product
  updateMyProduct: (jan: string, p: MyProductInput) => void
  deleteMyProduct: (jan: string) => void
  toggleFavoriteProduct: (jan: string) => void
  saveMenu: (name: string) => void
  // 呼び出すと今の1日の食事を置き換える。prepare でなくなった料理を外すなどしてから入れる
  loadMenu: (id: string, prepare?: (menu: DayMenu) => DayMenu) => void
  deleteMenu: (id: string) => void
}

const uid = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)

// 保存形式のバージョン。形が変わったら上げて migrate を書く
const SCHEMA_VERSION = 1

// localStorage が使えない環境（プライベートブラウズ等）でも画面は動くようにする
const safeStorage = createJSONStorage(() => {
  try {
    const k = '__mogushiru_probe__'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return localStorage
  } catch {
    const mem = new Map<string, string>()
    return {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    }
  }
})

export const useAppStore = create<State>()(
  persist(
    (set, get) => ({
      profile: DEFAULT_PROFILE,
      profileSet: false,
      menu: emptyMenu(),
      myDishes: [],
      myProducts: [],
      favoriteProductIds: [],
      savedMenus: [],
      setProfile: (profile) => set({ profile, profileSet: true }),
      addItem: (slot, item) =>
        set((s) => ({ menu: { ...s.menu, [slot]: [...s.menu[slot], { ...item, uid: uid() }] } })),
      updatePortion: (slot, id, portion) =>
        set((s) => ({ menu: { ...s.menu, [slot]: s.menu[slot].map((i) => (i.uid === id ? { ...i, portion } : i)) } })),
      customizeItem: (slot, id, ingredients) =>
        set((s) => ({
          menu: {
            ...s.menu,
            [slot]: s.menu[slot].map((i) => {
              if (i.uid !== id) return i
              const { customIngredients: _, ...rest } = i
              return ingredients ? { ...rest, customIngredients: ingredients } : rest
            }),
          },
        })),
      replaceWithMyDish: (slot, id, myDishId) =>
        set((s) => ({
          menu: {
            ...s.menu,
            [slot]: s.menu[slot].map((i) => (i.uid === id ? { uid: i.uid, kind: 'myDish', refId: myDishId, portion: i.portion } : i)),
          },
        })),
      removeItem: (slot, id) => set((s) => ({ menu: { ...s.menu, [slot]: s.menu[slot].filter((i) => i.uid !== id) } })),
      moveItem: (from, to, id) =>
        set((s) => {
          const item = s.menu[from].find((i) => i.uid === id)
          if (!item || from === to) return s
          return { menu: { ...s.menu, [from]: s.menu[from].filter((i) => i.uid !== id), [to]: [...s.menu[to], item] } }
        }),
      clearMenu: () => set({ menu: emptyMenu() }),
      saveMyDish: (d) => {
        const dish: MyDish = { ...d, id: uid(), createdAt: new Date().toISOString() }
        set((s) => ({ myDishes: [...s.myDishes, dish] }))
        return dish
      },
      updateMyDish: (id, patch) => set((s) => ({ myDishes: s.myDishes.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      deleteMyDish: (id) =>
        set((s) => ({
          myDishes: s.myDishes.filter((d) => d.id !== id),
          menu: without(s.menu, 'myDish', id),
          savedMenus: s.savedMenus.map((m) => ({ ...m, menu: without(m.menu, 'myDish', id) })),
        })),
      saveMyProduct: (input) => {
        const now = new Date().toISOString()
        const product: Product = { ...input, jan: `${MY_PRODUCT_PREFIX}${uid()}`, category: 'my', source: { name: 'ユーザー登録', fetchedAt: now } }
        set((s) => ({ myProducts: [...s.myProducts, product], favoriteProductIds: [...s.favoriteProductIds, product.jan] }))
        return product
      },
      updateMyProduct: (jan, input) => set((s) => ({ myProducts: s.myProducts.map((p) => (p.jan === jan ? { ...p, ...input } : p)) })),
      deleteMyProduct: (jan) =>
        set((s) => ({
          myProducts: s.myProducts.filter((p) => p.jan !== jan),
          favoriteProductIds: s.favoriteProductIds.filter((id) => id !== jan),
          menu: without(s.menu, 'product', jan),
          savedMenus: s.savedMenus.map((m) => ({ ...m, menu: without(m.menu, 'product', jan) })),
        })),
      toggleFavoriteProduct: (jan) =>
        set((s) => ({
          favoriteProductIds: s.favoriteProductIds.includes(jan) ? s.favoriteProductIds.filter((id) => id !== jan) : [...s.favoriteProductIds, jan],
        })),
      // 同じ名前があれば上書きする（呼び出して直して、同じ名前で取っておけるように）
      saveMenu: (name) =>
        set((s) => {
          const saved = { name, menu: structuredClone(s.menu), savedAt: new Date().toISOString() }
          const same = s.savedMenus.find((m) => m.name === name)
          return {
            savedMenus: same ? s.savedMenus.map((m) => (m.id === same.id ? { ...m, ...saved } : m)) : [...s.savedMenus, { id: uid(), ...saved }],
          }
        }),
      loadMenu: (id, prepare = (menu) => menu) => {
        const m = get().savedMenus.find((x) => x.id === id)
        if (m) set({ menu: prepare(structuredClone(m.menu)) })
      },
      deleteMenu: (id) => set((s) => ({ savedMenus: s.savedMenus.filter((m) => m.id !== id) })),
    }),
    {
      name: 'mogushiru',
      version: SCHEMA_VERSION,
      storage: safeStorage,
      partialize: ({ profile, profileSet, menu, myDishes, myProducts, favoriteProductIds, savedMenus }) => ({
        profile,
        profileSet,
        menu,
        myDishes,
        myProducts,
        favoriteProductIds,
        savedMenus,
      }),
    },
  ),
)
