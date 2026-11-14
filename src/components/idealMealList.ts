// 理想の献立の1食ずつの一覧（IdealMeals.tsx・MenuBuilder.tsx）で使う決まりごと
import type { IdealMeal, MealSlot } from '../domain/idealMeals'
import { BREAKFAST_STYLES, DINNER_MAINS, LUNCH_STYLES, idealMealLeads } from '../domain/idealMenuFacets'
import { BREAKFAST_LABEL, DINNER_LABEL, LUNCH_LABEL } from './labels'

// 一度に出す数。1食ごとに献立の量の調整を計算するので、見える分だけ計算する
export const PAGE = 12

// その区分の好みでしぼる言葉（理想の献立の一覧の朝・昼・晩と同じ分け方）
export const STYLES: Record<MealSlot, { label: string; options: { key: string; label: string }[] }> = {
  breakfast: { label: '主食', options: BREAKFAST_STYLES.map((key) => ({ key, label: BREAKFAST_LABEL[key] })) },
  lunch: { label: '種類', options: LUNCH_STYLES.map((key) => ({ key, label: LUNCH_LABEL[key] })) },
  dinner: { label: '主菜', options: DINNER_MAINS.map((key) => ({ key, label: DINNER_LABEL[key] })) },
}

// 1食の名前。献立のひとこと（「〇〇の朝、〇〇の昼、〇〇の晩」）のその1食の部分（「納豆と玄米」）。
// 一覧ではこのまま見出しにして、確認の言葉では「納豆と玄米の朝ごはん」の形にする
export const mealName = ({ menu, slot }: IdealMeal) => idealMealLeads(menu)?.[slot] ?? menu.name
