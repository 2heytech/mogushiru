import type { DishCategory, Slot } from '../domain/types'

export const SLOT_LABEL: Record<Slot, string> = { breakfast: '朝', lunch: '昼', dinner: '晩', other: 'その他' }

export const DISH_CATEGORY_LABEL: Record<DishCategory, string> = {
  staple: '主食',
  main: '主菜',
  side: '副菜',
  soup: '汁物',
  noodle: '麺',
  bowl: '丼',
  bread: 'パン',
  snack: 'おやつ',
  drink: '飲み物',
  alcohol: 'お酒',
}
