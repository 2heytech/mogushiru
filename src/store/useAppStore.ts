import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DEFAULT_PROFILE } from '../domain/targets'
import type { DayMenu, MenuItem, MyDish, Profile, Slot } from '../domain/types'

export const emptyMenu = (): DayMenu => ({ breakfast: [], lunch: [], dinner: [], other: [] })

export type SavedMenu = { id: string; name: string; menu: DayMenu; savedAt: string }

type State = {
  profile: Profile
  profileSet: boolean
  menu: DayMenu
  myDishes: MyDish[]
  savedMenus: SavedMenu[]
  setProfile: (p: Profile) => void
  addItem: (slot: Slot, item: Omit<MenuItem, 'uid'>) => void
  updatePortion: (slot: Slot, uid: string, portion: number) => void
  removeItem: (slot: Slot, uid: string) => void
  moveItem: (from: Slot, to: Slot, uid: string) => void
  clearMenu: () => void
  saveMyDish: (d: Omit<MyDish, 'id' | 'createdAt'>) => MyDish
  deleteMyDish: (id: string) => void
  saveMenu: (name: string) => void
  loadMenu: (id: string) => void
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
      savedMenus: [],
      setProfile: (profile) => set({ profile, profileSet: true }),
      addItem: (slot, item) =>
        set((s) => ({ menu: { ...s.menu, [slot]: [...s.menu[slot], { ...item, uid: uid() }] } })),
      updatePortion: (slot, id, portion) =>
        set((s) => ({ menu: { ...s.menu, [slot]: s.menu[slot].map((i) => (i.uid === id ? { ...i, portion } : i)) } })),
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
      deleteMyDish: (id) => set((s) => ({ myDishes: s.myDishes.filter((d) => d.id !== id) })),
      saveMenu: (name) =>
        set((s) => ({
          savedMenus: [...s.savedMenus, { id: uid(), name, menu: structuredClone(s.menu), savedAt: new Date().toISOString() }],
        })),
      loadMenu: (id) => {
        const m = get().savedMenus.find((x) => x.id === id)
        if (m) set({ menu: structuredClone(m.menu) })
      },
      deleteMenu: (id) => set((s) => ({ savedMenus: s.savedMenus.filter((m) => m.id !== id) })),
    }),
    {
      name: 'mogushiru',
      version: SCHEMA_VERSION,
      storage: safeStorage,
      partialize: ({ profile, profileSet, menu, myDishes, savedMenus }) => ({ profile, profileSet, menu, myDishes, savedMenus }),
    },
  ),
)
