import type { MascotMood } from '../domain/mascotMood'
import type { PfcKey } from '../domain/slotBalance'
import type { CheckedNutrient } from '../domain/targets'
import { SUPPLEMENT_KEYS } from '../domain/supplement'
import type { DishCategory, NutrientKey, Slot } from '../domain/types'

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
  my: '⭐',
  supplement: '💊',
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

export const MOOD_LABEL: Record<MascotMood, string> = { happy: 'ごきげん', okay: 'ふつう', worried: 'こまり顔', alert: 'あせり顔' }

// 食品成分表の食品群（foods.json の group）の表示用
export const FOOD_GROUP_EMOJI: Record<string, string> = {
  '01': '🌾',
  '02': '🥔',
  '03': '🍯',
  '04': '🫘',
  '05': '🌰',
  '06': '🥕',
  '07': '🍎',
  '08': '🍄',
  '09': '🌿',
  '10': '🐟',
  '11': '🍖',
  '12': '🥚',
  '13': '🥛',
  '14': '🧈',
  '15': '🍪',
  '16': '🍵',
  '17': '🧂',
  '18': '🍳',
}

// PFC以外の栄養素の表示名・単位・小数の桁数
export const NUTRIENT_INFO: Record<CheckedNutrient, { label: string; unit: string; digits: number }> = {
  salt: { label: '食塩', unit: 'g', digits: 1 },
  satFat: { label: '飽和脂肪酸', unit: 'g', digits: 1 },
  alcohol: { label: 'アルコール', unit: 'g', digits: 0 },
  fiber: { label: '食物繊維', unit: 'g', digits: 1 },
  potassium: { label: 'カリウム', unit: 'mg', digits: 0 },
  calcium: { label: 'カルシウム', unit: 'mg', digits: 0 },
  iron: { label: '鉄', unit: 'mg', digits: 1 },
  magnesium: { label: 'マグネシウム', unit: 'mg', digits: 0 },
  zinc: { label: '亜鉛', unit: 'mg', digits: 1 },
  vitaminA: { label: 'ビタミンA', unit: 'µg', digits: 0 },
  retinol: { label: 'ビタミンA（レチノール）', unit: 'µg', digits: 0 },
  vitaminD: { label: 'ビタミンD', unit: 'µg', digits: 1 },
  vitaminE: { label: 'ビタミンE', unit: 'mg', digits: 1 },
  vitaminB1: { label: 'ビタミンB1', unit: 'mg', digits: 2 },
  vitaminB2: { label: 'ビタミンB2', unit: 'mg', digits: 2 },
  niacin: { label: 'ナイアシン', unit: 'mgNE', digits: 1 },
  vitaminB6: { label: 'ビタミンB6', unit: 'mg', digits: 2 },
  folate: { label: '葉酸', unit: 'µg', digits: 0 },
  vitaminC: { label: 'ビタミンC', unit: 'mg', digits: 0 },
  caffeine: { label: 'カフェイン', unit: 'mg', digits: 0 },
  n3Fat: { label: 'n-3系脂肪酸', unit: 'g', digits: 1 },
  n6Fat: { label: 'n-6系脂肪酸', unit: 'g', digits: 1 },
  monoUnsatFat: { label: '一価不飽和脂肪酸', unit: 'g', digits: 1 },
  polyUnsatFat: { label: '多価不飽和脂肪酸', unit: 'g', digits: 1 },
}

export const PFC_LABEL: Record<PfcKey, string> = { p: 'たんぱく質', f: '脂質', c: '炭水化物' }
export const PFC_COLOR: Record<PfcKey, string> = { p: 'var(--color-protein)', f: 'var(--color-fat)', c: 'var(--color-carb)' }

const BASIC_NUTRIENT_INFO: Record<Exclude<NutrientKey, CheckedNutrient>, { label: string; unit: string; digits: number }> = {
  energyKcal: { label: 'エネルギー', unit: 'kcal', digits: 0 },
  protein: { label: 'たんぱく質', unit: 'g', digits: 1 },
  fat: { label: '脂質', unit: 'g', digits: 1 },
  carb: { label: '炭水化物', unit: 'g', digits: 1 },
}

// すべての栄養素の表示名・単位
export const nutrientInfo = (k: NutrientKey) => (k in NUTRIENT_INFO ? NUTRIENT_INFO[k as CheckedNutrient] : BASIC_NUTRIENT_INFO[k as keyof typeof BASIC_NUTRIENT_INFO])

// かっこ書きを外した短い名前（「ビタミンA（レチノール）」→「ビタミンA」）
export const shortNutrientLabel = (k: NutrientKey) => nutrientInfo(k).label.replace(/（.*）$/, '')

// サプリに入っている成分を「ビタミンC 1000mg」の形で並べる
export const supplementLines = (v: Record<NutrientKey, number>): string[] =>
  SUPPLEMENT_KEYS.filter((k) => v[k] > 0).map((k) => `${shortNutrientLabel(k)} ${Number(v[k].toPrecision(3))}${nutrientInfo(k).unit}`)
