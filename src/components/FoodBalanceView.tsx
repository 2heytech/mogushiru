import {
  BALANCED_MEALS_GOAL,
  FRUIT_GOAL_G,
  MEAL_SLOTS,
  SV_BASE,
  VARIETY_GOAL,
  VARIETY_GROUPS,
  VEGETABLE_GOAL_G,
  type DayFoods,
  type MealFoods,
  type VarietyGroup,
} from '../domain/foodBalance'
import type { Targets } from '../domain/targets'
import type { Slot } from '../domain/types'
import { SLOT_LABEL } from './labels'

const MEAL_PART_LABEL = { staple: '主食', main: '主菜', side: '副菜' } as const
type BasicPart = keyof typeof MEAL_PART_LABEL
const BASIC_PARTS: BasicPart[] = ['staple', 'main', 'side']
// 足りないときに勧める料理の例
const PART_EXAMPLE: Record<BasicPart, string> = {
  staple: 'ごはん・パン・めん',
  main: '魚・肉・卵・大豆の料理',
  side: '野菜・きのこ・海藻の小鉢',
}

// 10食品群の表示（合言葉「さあにぎやかにいただく」の順）
const VARIETY_LABEL: Record<VarietyGroup, string> = {
  fish: '魚',
  oil: '油',
  meat: '肉',
  milk: '牛乳',
  vegetable: '野菜',
  seaweed: '海藻',
  potato: 'いも',
  egg: '卵',
  soy: '大豆',
  fruit: '果物',
}

// 主食・主菜・副菜・野菜・果物・10食品群：料理の材料から数える、食べものの単位のバランス
export function FoodBalanceView({ foods, targets }: { foods: DayFoods; targets: Targets }) {
  // 配分を0%にしている区分（朝食をとらない設定など）は数えない
  const slots: Slot[] = MEAL_SLOTS.filter((s) => targets.slotShare[s] > 0)
  const balanced = foods.balancedSlots.filter((s) => slots.includes(s))
  const hint = missingHint(slots, foods)
  const d = foods.day
  return (
    <div className="space-y-5">
      <h2 className="hidden font-bold lg:block">食べもののバランス</h2>

      {/* 広い画面では、主食・主菜・副菜と野菜・果物を横に並べる */}
      <div className="space-y-5 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
        <section aria-labelledby="food-meal-title" className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
            <h3 id="food-meal-title" className="font-bold">
              主食・主菜・副菜
            </h3>
            <span className="text-sm text-ink-soft tabular-nums">
              そろった食事 <strong className="text-lg text-ink">{balanced.length}</strong> 回（目安 1日{BALANCED_MEALS_GOAL}回以上）
            </span>
          </div>
          <ul className="space-y-1.5">
            {slots.map((slot) => (
              <MealRow key={slot} slot={slot} meal={foods.bySlot[slot]} />
            ))}
          </ul>
          {hint && <p className="rounded-xl bg-white px-3 py-2 text-sm">{hint}</p>}
        </section>

        <section aria-labelledby="food-amount-title" className="space-y-2">
          <h3 id="food-amount-title" className="font-bold">
            野菜と果物
          </h3>
          <AmountBar label="野菜" value={d.vegetableG} goal={VEGETABLE_GOAL_G} unitHint={`小鉢ひとつ ${SV_BASE.side.amount}g くらい`} />
          <AmountBar label="果物" value={d.fruitG} goal={FRUIT_GOAL_G} unitHint="みかん1個・りんご半分で 約100g" />
        </section>
      </div>

      <section aria-labelledby="food-variety-title" className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <h3 id="food-variety-title" className="font-bold">
            食べた食品の種類
          </h3>
          <span className="text-sm text-ink-soft tabular-nums">
            <strong className="text-lg text-ink">{d.groups.size}</strong> / 10（目安 1日{VARIETY_GOAL}つ以上）
          </span>
        </div>
        <ul className="grid grid-cols-5 gap-1.5" aria-label="10の食品群">
          {VARIETY_GROUPS.map((g) => {
            const ate = d.groups.has(g)
            return (
              <li
                key={g}
                className={`grid min-h-10 place-items-center rounded-xl text-sm ${ate ? 'bg-ok/25 font-bold text-ok-ink' : 'border border-dashed border-ink/20 bg-white/60 text-ink-soft'}`}
              >
                {VARIETY_LABEL[g]}
                <span className="sr-only">{ate ? '（食べた）' : '（まだ）'}</span>
              </li>
            )
          })}
        </ul>
        <p className="text-xs text-ink-soft">合言葉は「さあにぎやかにいただく」。少しでも料理に入っていれば1つと数えます。</p>
      </section>

      {d.uncounted > 0 && <p className="text-xs text-ink-soft">市販品（{d.uncounted}品）は材料がわからないので、ここでは数えていません。</p>}
      <p className="text-2xs text-ink-soft">目安：厚生労働省「健康日本21（第三次）」、農林水産省「食事バランスガイド」、東京都健康長寿医療センター研究所の食品摂取の多様性スコア</p>
    </div>
  )
}

function MealRow({ slot, meal }: { slot: Slot; meal: MealFoods }) {
  const empty = BASIC_PARTS.every((p) => meal.servings[p] === 0) && meal.uncounted === 0 && meal.groups.size === 0
  const ok = BASIC_PARTS.every((p) => meal.servings[p] >= 1)
  return (
    <li className="flex items-center gap-2">
      <span className="w-6 shrink-0 font-bold">{SLOT_LABEL[slot]}</span>
      {empty ? (
        <span className="text-sm text-ink-soft">まだ料理がありません</span>
      ) : (
        <>
          <span className="flex gap-1">
            {BASIC_PARTS.map((p) => {
              const n = meal.servings[p]
              return (
                <span
                  key={p}
                  className={`rounded-full px-2.5 py-0.5 text-sm whitespace-nowrap ${n >= 1 ? 'bg-ok/25 font-bold text-ok-ink' : 'border border-dashed border-ink/20 bg-white/60 text-ink-soft'}`}
                >
                  {MEAL_PART_LABEL[p]}
                  <span className="sr-only">{n >= 1 ? `あり（${n}つ）` : 'なし'}</span>
                </span>
              )
            })}
          </span>
          {ok && <span className="text-sm font-bold whitespace-nowrap text-ok-ink">そろった！</span>}
        </>
      )}
    </li>
  )
}

// 料理が入っている食事で、いちばん先に足りないもの（市販品だけの食事は、材料がわからないので言わない）
function missingHint(slots: Slot[], foods: DayFoods): string | null {
  for (const slot of slots) {
    const m = foods.bySlot[slot]
    const hasCounted = BASIC_PARTS.some((p) => m.servings[p] > 0) || m.groups.size > 0
    if (!hasCounted) continue
    const lacking = BASIC_PARTS.filter((p) => m.servings[p] < 1)
    if (lacking.length === 0 || lacking.length === BASIC_PARTS.length) continue
    const what = lacking.map((p) => MEAL_PART_LABEL[p]).join('と')
    return `${SLOT_LABEL[slot]}は${what}を足すとそろうよ（${lacking.map((p) => PART_EXAMPLE[p]).join('、')}など）`
  }
  return null
}

function AmountBar({ label, value, goal, unitHint }: { label: string; value: number; goal: number; unitHint: string }) {
  const max = goal * 1.5
  const pct = Math.min(value / max, 1) * 100
  const goalPct = (goal / max) * 100
  const reached = value >= goal
  const rest = Math.max(0, Math.round(goal - value))
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="text-sm text-ink-soft">{label}</span>
        <span className="tabular-nums">
          <strong className="text-lg">{Math.round(value)}</strong>
          <span className="text-sm text-ink-soft"> / {goal} g</span>
        </span>
      </div>
      <div className="relative h-3 rounded-full bg-white" role="img" aria-label={`${label} ${Math.round(value)}g、目標 ${goal}g`}>
        <div className={`h-full rounded-full transition-all duration-500 ${reached ? 'bg-ok' : 'bg-coral'}`} style={{ width: `${pct}%` }} />
        <div className="absolute -inset-y-0.5 w-0.5 rounded-full bg-ink/40" style={{ left: `${goalPct}%` }} aria-hidden />
      </div>
      <p className="mt-1 text-xs text-ink-soft">{reached ? '目標に届いています' : `あと ${rest}g（${unitHint}）`}</p>
    </div>
  )
}
