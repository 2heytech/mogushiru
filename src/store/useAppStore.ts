import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DEFAULT_PROFILE } from '../domain/targets'
import { isSupplement } from '../domain/supplement'
import { withSlot } from '../domain/customize'
import { clampServings, DEFAULT_SERVINGS } from '../domain/recipe'
import type { DayMenu, Ingredient, MenuItem, MyDish, Product, Profile, Slot } from '../domain/types'

export const emptyMenu = (): DayMenu => ({ breakfast: [], lunch: [], dinner: [], other: [] })

export type SavedMenu = { id: string; name: string; menu: DayMenu; savedAt: string }

// 栄養成分表示から登録する市販品。入力のない成分は未収録（null）。
// category を 'supplement' にするとサプリメント（お気に入りでなく、サプリの一覧に入る）
export type MyProductInput = Pick<Product, 'name' | 'brand' | 'basis' | 'servingGrams' | 'servingLabel' | 'nutrients'> & { category?: string }

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
  // いまの1日の食事をどの献立から呼び出したか（理想の献立・保存した食事）。手を加えたら edited
  menuSource: MenuSource | null
  // 作り方を何人分で見るか。栄養の計算の人前とは別（自分の分だけ数えて、家族の分まで作ることがあるため）。料理をまたいで覚えておく
  recipeServings: number
  setRecipeServings: (n: number) => void
  setProfile: (p: Profile) => void
  // 追加した項目の uid を返す（料理を選ぶ画面で、もう一度押したら外すため）
  addItem: (slot: Slot, item: Omit<MenuItem, 'uid'>) => string
  updatePortion: (slot: Slot, uid: string, portion: number) => void
  // 献立の料理をアレンジした材料で置き換える（null で元のレシピに戻す）
  customizeItem: (slot: Slot, uid: string, ingredients: Ingredient[] | null) => void
  // 献立の料理をお気に入りの料理に置き換える（portion を渡せば人前も変える）
  replaceWithMyDish: (slot: Slot, uid: string, myDishId: string, portion?: number) => void
  removeItem: (slot: Slot, uid: string) => void
  moveItem: (from: Slot, to: Slot, uid: string) => void
  clearMenu: () => void
  // 1日の食事から、なくなった料理・市販品などを外す（prepare が同じ menu を返せば何もしない）
  pruneMenu: (prepare: (menu: DayMenu) => DayMenu) => void
  saveMyDish: (d: Omit<MyDish, 'id' | 'createdAt' | 'updatedAt'>) => MyDish
  updateMyDish: (id: string, patch: Partial<Pick<MyDish, 'name' | 'ingredients' | 'portion' | 'slots'>>) => void
  deleteMyDish: (id: string) => void
  saveMyProduct: (p: MyProductInput) => Product
  updateMyProduct: (jan: string, p: MyProductInput) => void
  deleteMyProduct: (jan: string) => void
  toggleFavoriteProduct: (jan: string) => void
  saveMenu: (name: string) => void
  // 呼び出すと今の1日の食事を置き換える。prepare でなくなった料理を外すなどしてから入れる
  loadMenu: (id: string, prepare?: (menu: DayMenu) => DayMenu) => void
  // 理想の献立など、外から作った1日の食事で置き換える（項目の uid は付け直す）。name を渡すと呼び出した献立として覚える
  replaceMenu: (menu: DayMenu, name?: string) => void
  // 1つの区分だけ置き換える（理想の献立から1食だけ呼び出すときなど。uid は付け直す）
  replaceSlot: (slot: Slot, items: MenuItem[]) => void
  deleteMenu: (id: string) => void
}

export type MenuSource = { name: string; edited: boolean }

// 呼び出した献立に手を加えたら「変更あり」にする
const touched = (s: { menuSource: MenuSource | null }) => (s.menuSource && !s.menuSource.edited ? { menuSource: { ...s.menuSource, edited: true } } : {})

// カスタマイズした料理を、最後に保存したものから順に
export const recentMyDishes = (dishes: MyDish[]): MyDish[] =>
  [...dishes].sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))

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
      menuSource: null,
      recipeServings: DEFAULT_SERVINGS,
      setRecipeServings: (n) => set({ recipeServings: clampServings(n) }),
      setProfile: (profile) => set({ profile, profileSet: true }),
      // カスタマイズした料理を別の区分にも入れたら、その区分でも上に出すようにする
      addItem: (slot, item) => {
        const id = uid()
        set((s) => ({
          ...touched(s),
          menu: { ...s.menu, [slot]: [...s.menu[slot], { ...item, uid: id }] },
          myDishes:
            item.kind === 'myDish'
              ? s.myDishes.map((d) => (d.id === item.refId && d.slots && !d.slots.includes(slot) ? { ...d, slots: withSlot(d.slots, slot) } : d))
              : s.myDishes,
        }))
        return id
      },
      updatePortion: (slot, id, portion) =>
        set((s) => ({ ...touched(s), menu: { ...s.menu, [slot]: s.menu[slot].map((i) => (i.uid === id ? { ...i, portion } : i)) } })),
      customizeItem: (slot, id, ingredients) =>
        set((s) => ({
          ...touched(s),
          menu: {
            ...s.menu,
            [slot]: s.menu[slot].map((i) => {
              if (i.uid !== id) return i
              const { customIngredients: _, ...rest } = i
              return ingredients ? { ...rest, customIngredients: ingredients } : rest
            }),
          },
        })),
      replaceWithMyDish: (slot, id, myDishId, portion) =>
        set((s) => ({
          ...touched(s),
          menu: {
            ...s.menu,
            [slot]: s.menu[slot].map((i) => (i.uid === id ? { uid: i.uid, kind: 'myDish', refId: myDishId, portion: portion ?? i.portion } : i)),
          },
        })),
      removeItem: (slot, id) => set((s) => ({ ...touched(s), menu: { ...s.menu, [slot]: s.menu[slot].filter((i) => i.uid !== id) } })),
      moveItem: (from, to, id) =>
        set((s) => {
          const item = s.menu[from].find((i) => i.uid === id)
          if (!item || from === to) return s
          return { ...touched(s), menu: { ...s.menu, [from]: s.menu[from].filter((i) => i.uid !== id), [to]: [...s.menu[to], item] } }
        }),
      clearMenu: () => set({ menu: emptyMenu(), menuSource: null }),
      pruneMenu: (prepare) =>
        set((s) => {
          const menu = prepare(s.menu)
          return menu === s.menu ? s : { menu }
        }),
      saveMyDish: (d) => {
        const now = new Date().toISOString()
        const dish: MyDish = { ...d, id: uid(), createdAt: now, updatedAt: now }
        set((s) => ({ myDishes: [...s.myDishes, dish] }))
        return dish
      },
      updateMyDish: (id, patch) =>
        set((s) => ({ myDishes: s.myDishes.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d)) })),
      deleteMyDish: (id) =>
        set((s) => ({
          myDishes: s.myDishes.filter((d) => d.id !== id),
          menu: without(s.menu, 'myDish', id),
          savedMenus: s.savedMenus.map((m) => ({ ...m, menu: without(m.menu, 'myDish', id) })),
        })),
      saveMyProduct: (input) => {
        const now = new Date().toISOString()
        const product: Product = { ...input, jan: `${MY_PRODUCT_PREFIX}${uid()}`, category: input.category ?? 'my', source: { name: 'ユーザー登録', fetchedAt: now } }
        set((s) => ({
          myProducts: [...s.myProducts, product],
          favoriteProductIds: isSupplement(product) ? s.favoriteProductIds : [...s.favoriteProductIds, product.jan],
        }))
        return product
      },
      updateMyProduct: (jan, input) => set((s) => ({ myProducts: s.myProducts.map((p) => (p.jan === jan ? { ...p, ...input } : p)) })),
      deleteMyProduct: (jan) =>
        set((s) => ({
          myProducts: s.myProducts.filter((p) => p.jan !== jan),
          favoriteProductIds: s.favoriteProductIds.filter((id) => id !== jan),
          menu: without(without(s.menu, 'product', jan), 'supplement', jan),
          savedMenus: s.savedMenus.map((m) => ({ ...m, menu: without(without(m.menu, 'product', jan), 'supplement', jan) })),
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
            menuSource: { name, edited: false },
          }
        }),
      loadMenu: (id, prepare = (menu) => menu) => {
        const m = get().savedMenus.find((x) => x.id === id)
        if (m) set({ menu: prepare(structuredClone(m.menu)), menuSource: { name: m.name, edited: false } })
      },
      replaceMenu: (menu, name) =>
        set({
          menu: Object.fromEntries(Object.entries(menu).map(([slot, items]) => [slot, items.map((i) => ({ ...i, uid: uid() }))])) as DayMenu,
          menuSource: name ? { name, edited: false } : null,
        }),
      replaceSlot: (slot, items) => set((s) => ({ ...touched(s), menu: { ...s.menu, [slot]: items.map((i) => ({ ...i, uid: uid() })) } })),
      deleteMenu: (id) => set((s) => ({ savedMenus: s.savedMenus.filter((m) => m.id !== id) })),
    }),
    {
      name: 'mogushiru',
      version: SCHEMA_VERSION,
      storage: safeStorage,
      partialize: ({ profile, profileSet, menu, menuSource, myDishes, myProducts, favoriteProductIds, savedMenus, recipeServings }) => ({
        profile,
        profileSet,
        menu,
        menuSource,
        myDishes,
        myProducts,
        favoriteProductIds,
        savedMenus,
        recipeServings,
      }),
    },
  ),
)
