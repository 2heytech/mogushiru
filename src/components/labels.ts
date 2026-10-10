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

// 市販品カテゴリ（products.json の categories のキー）の表示用
export const PRODUCT_CATEGORY_EMOJI: Record<string, string> = {
  onigiri: '🍙',
  bento: '🍱',
  sandwich: '🥪',
  noodle: '🍜',
  bread: '🥐',
  side: '🍢',
  dairy: '🧀',
  snack: '🍪',
  dessert: '🍮',
  drink: '🧃',
  alcohol: '🍺',
  seasoning: '🧂',
  ingredient: '🥕',
  other: '🛒',
}

// 絞り込みで後ろに回すカテゴリ（献立づくりで選ぶことが少ないもの）
export const PRODUCT_CATEGORY_LAST = ['seasoning', 'ingredient', 'other']
