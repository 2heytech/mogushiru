import type { Ingredient } from './types'

// 入れ替え候補は「いまの食材＋alternatives」。入れ替えたら元の食材を候補側へ回す
export function swapIngredient(ing: Ingredient, foodId: string): Ingredient {
  const options = [ing.foodId, ...(ing.alternatives ?? [])]
  if (!options.includes(foodId)) return ing
  return { ...ing, foodId, alternatives: options.filter((id) => id !== foodId) }
}

// 人前は 0.1 人前きざみ。献立に 5 人前より多く入っていればそこまで動かせる
export const PORTION_MIN = 0.1
export const PORTION_MAX = 5
export const PORTION_STEP = 0.1

// 小数第1位で丸める（0.1 を足し引きしたときの 0.30000000000000004 などを消す）
export const round1 = (x: number) => Math.round(x * 10) / 10

export const clampPortion = (p: number) => Math.max(PORTION_MIN, round1(p))

// 材料の量のきざみ。整数の量は 1g、小数のある量（4.5g など）は 0.1g
export const gramStep = (grams: number) => (Number.isInteger(round1(grams)) ? 1 : 0.1)

export const formatPortion = (p: number) => `${round1(p)}人前`

const formatGrams = (g: number) => `${round1(g)}g`

// 食品名の（ゆで）（濃口）などを省いた短い名前
export const shortFoodName = (name: string) => name.replace(/[（(][^）)]*[）)]/g, '').trim() || name

const NAME_CHANGES_MAX = 3

// 保存するときの名前の初期値。「肉じゃが（1.5人前・じゃがいも+20g）」のように、人前と変えた材料を短く入れる
export function customDishName(title: string, portion: number, original: Ingredient[], current: Ingredient[], foodName: (id: string) => string): string {
  const name = (id: string) => shortFoodName(foodName(id))
  const grams = (xs: Ingredient[]) => {
    const m = new Map<string, number>()
    for (const x of xs) m.set(x.foodId, (m.get(x.foodId) ?? 0) + x.grams)
    return m
  }
  const before = grams(original)
  const after = grams(current.filter((x) => x.grams > 0))
  const changes: string[] = []
  const removed = [...before.keys()].filter((id) => !after.has(id))
  const added = [...after.keys()].filter((id) => !before.has(id))
  // 入れ替え：増えた食材の候補に、なくなった食材が入っているもの
  for (const ing of current) {
    if (!added.includes(ing.foodId)) continue
    const from = removed.find((id) => ing.alternatives?.includes(id))
    if (!from) continue
    changes.push(`${name(from)}→${name(ing.foodId)}`)
    removed.splice(removed.indexOf(from), 1)
    added.splice(added.indexOf(ing.foodId), 1)
  }
  for (const [id, g] of before) {
    const now = after.get(id)
    if (now === undefined) continue
    const diff = round1(now - g)
    if (diff !== 0) changes.push(`${name(id)}${diff > 0 ? '+' : '−'}${formatGrams(Math.abs(diff))}`)
  }
  for (const id of removed) changes.push(`${name(id)}なし`)
  for (const id of added) changes.push(`${name(id)}追加`)

  const parts = round1(portion) === 1 ? [] : [formatPortion(portion)]
  parts.push(...changes.slice(0, NAME_CHANGES_MAX))
  if (changes.length > NAME_CHANGES_MAX) parts.push('ほか')
  return parts.length ? `${title}（${parts.join('・')}）` : title
}
