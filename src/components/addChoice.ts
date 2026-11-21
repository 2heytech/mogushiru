import { itemTotals, type Catalog } from '../domain/nutrition'
import { servingFor } from '../domain/serving'
import type { LookupItem } from './lookupCards'

// 読みもののページの「1日の食事に入れる」から来たとき（/#add=<料理id>・/#add=food.<食品番号>）に、
// 入れるものと、どの食事に入れるかを聞く窓に出す文を作る。料理は1人前、食品（食材）は1回の量。
// もうない料理・食品は null（窓を出さない）
export type AddChoice = { lead: string; item: LookupItem }

export function addChoice(target: { kind: 'dish' | 'food'; id: string }, catalog: Catalog): AddChoice | null {
  if (target.kind === 'dish') {
    const d = catalog.dishes.get(target.id)
    if (!d) return null
    return {
      lead: `「${d.name}」（1人前 ${Math.round(d.nutrients.energyKcal ?? 0)} kcal）を、1日の食事に入れます。量や材料は、入れたあとで変えられます。`,
      item: { kind: 'dish', refId: d.id, portion: 1 },
    }
  }
  const f = catalog.foods.get(target.id)
  if (!f) return null
  const serving = servingFor(f)
  const item: LookupItem = { kind: 'food', refId: f.id, portion: serving.grams }
  const kcal = Math.round(itemTotals({ uid: '', ...item }, catalog).values.energyKcal)
  // 「納豆」1パック（45g・83 kcal）。呼び名が重さそのもの（100g）の食品は「100g（93 kcal）」
  const amount = serving.label === `${serving.grams}g` ? `${serving.label}（${kcal} kcal）` : `${serving.label}（${serving.grams}g・${kcal} kcal）`
  return { lead: `「${f.displayName}」${amount}を、1日の食事に入れます。量は、入れたあとで変えられます。`, item }
}
