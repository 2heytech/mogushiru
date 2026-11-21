import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { energyDiffText, moguMessage, stepText } from '../components/daySummaryText'
import { computeAlerts, type Alert } from './alerts'
import { missingMealSlots } from './dayProgress'
import { daySummary, ENERGY_TOLERANCE, type DaySummaryInput, type Step } from './daySummary'
import { dayFoods, emptyMealFoods, type DayFoods, type MealFoods } from './foodBalance'
import { nutrientChecks, type NutrientCheck } from './nutrientChecks'
import { emptyTotals, menuTotals, type Catalog, type MenuTotals } from './nutrition'
import { pfcGaps } from './pfcGap'
import { computeTargets, DEFAULT_PROFILE } from './targets'
import type { DayMenu, Dish, Food, MenuItem } from './types'

const targets = computeTargets(DEFAULT_PROFILE)

// PFCの割合（%）とカロリーから、1日の合計をつくる（朝25・昼35・晩30・その他10%に分ける）
function totalsOf(kcal: number, p = 16.5, f = 25, c = 58.5): MenuTotals {
  const part = (share: number) => {
    const t = emptyTotals()
    Object.assign(t.values, { energyKcal: kcal * share, protein: (kcal * share * p) / 400, fat: (kcal * share * f) / 900, carb: (kcal * share * c) / 400 })
    return t
  }
  return { day: part(1), bySlot: { breakfast: part(0.25), lunch: part(0.35), dinner: part(0.3), other: part(0.1) }, supplement: emptyTotals() }
}

// 主食・主菜・副菜の数と野菜・果物の量から、食べものの数え方の結果をつくる
const meal = (staple: number, main: number, side: number, vegetableG = 0, fruitG = 0): MealFoods => ({
  ...emptyMealFoods(),
  servings: { staple, main, side, milk: 0, fruit: 0 },
  vegetableG,
  fruitG,
  groups: new Set(['vegetable']),
})
const foodsOf = (bySlot: Partial<Record<'breakfast' | 'lunch' | 'dinner', MealFoods>>, vegetableG: number, fruitG: number): DayFoods => {
  const slots = { breakfast: bySlot.breakfast ?? meal(1, 1, 1), lunch: bySlot.lunch ?? meal(1, 1, 1), dinner: bySlot.dinner ?? meal(1, 1, 1), other: emptyMealFoods() }
  const full = (m: MealFoods) => m.servings.staple >= 1 && m.servings.main >= 1 && m.servings.side >= 1
  return {
    bySlot: slots,
    day: meal(3, 3, 3, vegetableG, fruitG),
    balancedSlots: (['breakfast', 'lunch', 'dinner'] as const).filter((s) => full(slots[s])),
  }
}

const summaryOf = (totals: MenuTotals, more: Partial<DaySummaryInput> = {}) =>
  daySummary({ totals, targets, foods: null, alerts: computeAlerts(totals, targets), gaps: pfcGaps(totals.day.values, targets), checks: [], missing: [], ...more })

const saltOver: Alert = { key: 'salt', level: 'over', amount: 9, limit: 6.5, limitKind: 'target', unit: 'g', topSlot: 'lunch' }
const saltNear: Alert = { ...saltOver, level: 'warn', amount: 6 }
const lowCheck = (key: NutrientCheck['key'], percent: number, partial = false) => ({ key, status: 'low', percent, partial }) as NutrientCheck

describe('1日の結果のまとめ', () => {
  it('何も入っていないときは、何も言わない', () => {
    const s = summaryOf(totalsOf(0))
    expect(s).toMatchObject({ state: 'empty', ok: [], concerns: [], steps: [], mood: 'okay' })
    expect(moguMessage(s)).toBe('料理を選んで、1日の食事をつくってみよう！')
  })

  it('カロリーもPFCも範囲内なら、範囲内に入れて、気になる点は出さない', () => {
    const s = summaryOf(totalsOf(targets.energyKcal + 60))
    expect(s.state).toBe('full')
    expect(s.ok).toEqual(['energy', 'pfc', 'salt'])
    expect(s.concerns).toEqual([])
    expect(s.steps).toEqual([])
    expect(s.mood).toBe('happy')
    expect(moguMessage(s)).toBe('ぜんぶ目安の範囲内！このままいこう')
  })

  it('カロリーは目安の±10%まで範囲内。外れたら、足りないときは足す・多いときはへらすを勧める', () => {
    expect(summaryOf(totalsOf(targets.energyKcal * 0.91)).ok).toContain('energy')
    const low = summaryOf(totalsOf(targets.energyKcal * 0.8))
    expect(low.ok).not.toContain('energy')
    expect(low.concerns).toEqual([{ kind: 'energy', diff: expect.closeTo(-targets.energyKcal * 0.2, 5) }])
    expect(low.steps).toEqual([{ kind: 'addDish', slot: expect.any(String), part: 'staple', why: 'energy' }])
    const high = summaryOf(totalsOf(targets.energyKcal * 1.13))
    expect(high.concerns.map((c) => c.kind)).toEqual(['energy'])
    expect(high.steps).toEqual([{ kind: 'reduce', what: 'energy' }])
  })

  it('目安を大きくこえたカロリーは、とりすぎの1つだけにする（同じことを2回言わない）', () => {
    const s = summaryOf(totalsOf(targets.energyKcal * 1.3))
    expect(s.concerns.map((c) => c.kind)).toEqual(['over'])
    expect(s.steps).toEqual([{ kind: 'reduce', what: 'energy' }])
    expect(s.mood).toBe('alert')
    expect(moguMessage(s)).toBe('カロリーが目安をこえてるよ！')
  })

  it('PFCが外れていたら、どれがどちらに外れているかと、直し方を出す', () => {
    const s = summaryOf(totalsOf(targets.energyKcal, 10, 45, 45))
    expect(s.ok).not.toContain('pfc')
    expect(s.concerns.filter((c) => c.kind === 'pfc').map((c) => c.kind === 'pfc' && [c.key, Math.sign(c.gap)])).toEqual([
      ['p', -1],
      ['f', 1],
      ['c', -1],
    ])
    expect(s.steps).toEqual([
      { kind: 'addDish', slot: expect.any(String), part: 'main', why: 'protein' },
      { kind: 'reduce', what: 'fat' },
      { kind: 'addDish', slot: expect.any(String), part: 'staple', why: 'carb' },
    ])
  })

  it('総評と個別の指摘が食いちがわない：気になる点があるのに「ぜんぶ範囲内」と言わない', () => {
    const s = summaryOf(totalsOf(targets.energyKcal), { foods: foodsOf({}, 180, 200) })
    expect(s.ok).toEqual(['energy', 'pfc', 'salt', 'mealBalance', 'fruit'])
    expect(s.concerns).toEqual([{ kind: 'vegetable', rest: 170 }])
    expect(s.steps).toEqual([{ kind: 'addDish', slot: 'dinner', part: 'side', why: 'vegetable' }])
    expect(s.mood).toBe('okay')
    expect(moguMessage(s)).toBe('カロリーとPFCはいい感じ。気になる点が1つあるよ')
    expect(stepText(s.steps[0])).toEqual({ text: '野菜の副菜を1品追加する', button: '晩に追加' })
  })

  it('野菜・果物は目安の9割から範囲内', () => {
    const s = summaryOf(totalsOf(targets.energyKcal), { foods: foodsOf({}, 320, 180) })
    expect(s.ok).toEqual(expect.arrayContaining(['vegetable', 'fruit']))
    expect(summaryOf(totalsOf(targets.energyKcal), { foods: foodsOf({}, 350, 100) }).steps).toEqual([{ kind: 'addFruit' }])
  })

  it('主食・主菜・副菜がそろった食事が少ないときは、欠けている食事に足すのを勧める', () => {
    const s = summaryOf(totalsOf(targets.energyKcal), { foods: foodsOf({ breakfast: meal(1, 0, 0), lunch: meal(1, 1, 0) }, 350, 200) })
    expect(s.concerns).toEqual([{ kind: 'mealBalance', count: 1 }])
    expect(s.steps).toEqual([{ kind: 'addDish', slot: 'breakfast', part: 'side', why: 'mealBalance' }])
  })

  it('上限・目安をこえたものは気になる点のいちばん上、8割をこえたものは「範囲内だが上限に近い」', () => {
    const over = summaryOf(totalsOf(targets.energyKcal), { alerts: [saltOver], hasSaltSwap: true })
    expect(over.concerns[0]).toEqual({ kind: 'over', alert: saltOver })
    expect(over.ok).not.toContain('salt')
    expect(over.steps).toEqual([{ kind: 'swapSalt' }, { kind: 'reduce', what: 'salt' }])
    expect(over.mood).toBe('alert')
    const near = summaryOf(totalsOf(targets.energyKcal), { alerts: [saltNear] })
    expect(near.near).toEqual([saltNear])
    expect(near.ok).not.toContain('salt')
    expect(near.concerns).toEqual([])
    expect(near.mood).toBe('happy')
  })

  it('脂質が多い・飽和脂肪酸が多いは、勧めることを1つにまとめる', () => {
    const satFat: Alert = { key: 'satFat', level: 'over', amount: 20, limit: 15, limitKind: 'target', unit: 'g', topSlot: 'dinner' }
    const s = summaryOf(totalsOf(targets.energyKcal, 15, 40, 45), { alerts: [satFat] })
    expect(s.steps.filter((x) => x.kind === 'reduce')).toEqual([{ kind: 'reduce', what: 'satFat' }])
  })

  it('足りない栄養素は、割合の低い順に2つまで。成分が未収録の食品を含むものは言わない', () => {
    const checks = [lowCheck('calcium', 60), lowCheck('iron', 40), lowCheck('vitaminC', 70), lowCheck('fiber', 10, true)]
    const s = summaryOf(totalsOf(targets.energyKcal), { checks })
    expect(s.concerns).toEqual([
      { kind: 'nutrient', key: 'iron', percent: 40 },
      { kind: 'nutrient', key: 'calcium', percent: 60 },
    ])
    expect(s.steps).toEqual([{ kind: 'ranking', key: 'iron' }])
    expect(s.ok).not.toContain('nutrients')
  })

  it('次に試すことは3つまで', () => {
    const s = summaryOf(totalsOf(targets.energyKcal * 0.8, 10, 40, 50), { foods: foodsOf({}, 100, 0), checks: [lowCheck('iron', 40)] })
    expect(s.concerns.length).toBeGreaterThan(3)
    expect(s.steps).toHaveLength(3)
    expect(s.mood).toBe('worried')
  })

  it('入力の途中（まだ入っていない食事がある）は、足りないと決めつけず、入れていない食事を入れるのを勧める', () => {
    const s = summaryOf(totalsOf(500, 10, 40, 50), { missing: ['lunch', 'dinner'] })
    expect(s).toMatchObject({ state: 'partial', missing: ['lunch', 'dinner'], ok: [], concerns: [], mood: 'okay' })
    expect(s.steps).toEqual([
      { kind: 'addMeal', slot: 'lunch' },
      { kind: 'addMeal', slot: 'dinner' },
    ])
    expect(moguMessage(s)).toBe('昼・晩も入れると、1日のバランスがわかるよ')
    // とりすぎだけは途中でも知らせる
    const over = summaryOf(totalsOf(500), { missing: ['dinner'], alerts: [saltOver] })
    expect(over.concerns).toEqual([{ kind: 'over', alert: saltOver }])
    expect(over.mood).toBe('alert')
    expect(over.steps[0]).toEqual({ kind: 'addMeal', slot: 'dinner' })
  })
})

describe('まとめの言葉', () => {
  it('カロリーの差：範囲内なら「目安の範囲内（＋60 kcal）」', () => {
    expect(energyDiffText(0, 2000, ENERGY_TOLERANCE)).toBe('料理を選ぶと計算されます')
    expect(energyDiffText(2060, 2000, ENERGY_TOLERANCE)).toBe('目安の範囲内（＋60 kcal）')
    expect(energyDiffText(1950, 2000, ENERGY_TOLERANCE)).toBe('目安の範囲内（−50 kcal）')
    expect(energyDiffText(2000, 2000, ENERGY_TOLERANCE)).toBe('目安の範囲内')
    expect(energyDiffText(1500, 2000, ENERGY_TOLERANCE)).toBe('目安まであと 500 kcal')
    expect(energyDiffText(2400, 2000, ENERGY_TOLERANCE)).toBe('目安より 400 kcal 多い')
  })

  it('次に試すことの言葉と、押すところの名前', () => {
    const text = (s: Step) => stepText(s)
    expect(text({ kind: 'addMeal', slot: 'lunch' })).toEqual({ text: '昼ごはんを入れる', button: '昼に追加' })
    expect(text({ kind: 'addFruit' }).button).toBe('果物を選ぶ')
    expect(text({ kind: 'swapSalt' }).button).toBe('置きかえの案')
    expect(text({ kind: 'ranking', key: 'iron' })).toEqual({ text: '鉄の多い食品を足す', button: 'ランキングを見る' })
    // 料理は自分で選ぶものは、ボタンを出さない
    expect(text({ kind: 'reduce', what: 'salt' }).button).toBeUndefined()
    expect(text({ kind: 'reduce', what: 'supplement', nutrient: 'vitaminA' }).text).toBe('ビタミンAのサプリの量を見直す')
  })
})

describe('実際の料理で', () => {
  const read = <T,>(file: string) => JSON.parse(readFileSync(new URL(`../../public/data/${file}`, import.meta.url), 'utf8')) as T
  const catalog: Catalog = {
    dishes: new Map(read<{ dishes: Dish[] }>('dishes.json').dishes.map((d) => [d.id, d])),
    myDishes: new Map(),
    products: new Map(),
    foods: new Map(read<{ foods: Food[] }>('foods.json').foods.map((f) => [f.id, f])),
  }
  let n = 0
  const dish = (refId: string, portion = 1): MenuItem => ({ uid: `u${n++}`, kind: 'dish', refId, portion })
  const run = (menu: DayMenu) => {
    const totals = menuTotals(menu, catalog)
    return daySummary({
      totals,
      targets,
      foods: dayFoods(menu, catalog),
      alerts: computeAlerts(totals, targets),
      gaps: pfcGaps(totals.day.values, targets),
      checks: nutrientChecks(totals.day, targets, undefined, totals.supplement),
      missing: missingMealSlots(menu, targets),
    })
  }

  it('朝だけ入れたときは入力の途中', () => {
    const s = run({ breakfast: [dish('genmai-rice'), dish('ready-natto'), dish('misoshiru-spinach')], lunch: [], dinner: [], other: [] })
    expect(s.state).toBe('partial')
    expect(s.missing).toEqual(['lunch', 'dinner'])
    expect(s.steps.map((x) => x.kind)).toEqual(['addMeal', 'addMeal'])
  })

  it('朝・昼・晩を入れると、範囲内のもの・気になる点・次に試すことに分かれ、同じ項目が両方には出ない', () => {
    const s = run({
      breakfast: [dish('genmai-rice', 1.2), dish('ready-natto'), dish('misoshiru-spinach')],
      lunch: [dish('don-salmon', 1.2), dish('yasai-edamame')],
      dinner: [dish('rice', 0.9), dish('gindara-saikyoyaki'), dish('nimame')],
      other: [dish('banana')],
    })
    expect(s.state).toBe('full')
    const concerned = new Set(s.concerns.map((c) => (c.kind === 'over' ? c.alert.key : c.kind === 'nutrient' ? 'nutrients' : c.kind)))
    for (const k of s.ok) expect(concerned.has(k)).toBe(false)
    expect(s.ok.length + s.concerns.length).toBeGreaterThan(0)
    expect(s.steps.length).toBeLessThanOrEqual(3)
    if (s.concerns.length > 0) expect(moguMessage(s)).not.toContain('ぜんぶ')
  })
})
