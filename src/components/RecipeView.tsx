import { extraTexts, materialLines, recipeLines } from '../domain/recipe'
import type { DishRecipe, DishSource, Food, Ingredient } from '../domain/types'

const CARD = 'rounded-2xl bg-white px-4 py-3'
const PILL = 'rounded-full bg-white px-3 py-1 text-xs font-bold'

// 料理の編集画面の「つくり方」。材料の分量は、「材料と量」で変えたあとの材料と、何人分つくるか（servings）から出す。
// 栄養の計算の人前とは別（自分の分だけ数えて、家族の分まで作ることがあるため）
export function RecipeView({
  recipe,
  source,
  ingredients,
  servings,
  foods,
}: {
  recipe?: DishRecipe
  source?: DishSource
  // 1人前あたり（材料と量で変えたあとのもの）
  ingredients: Ingredient[]
  servings: number
  foods: Map<string, Food>
}) {
  // 作り方がなく出典だけある料理（郷土料理）は、元のページへ案内する。材料と量は「材料と量」で見られる
  if (!recipe) {
    if (!source) return null
    return (
      <div className="-mx-1 flex-1 space-y-2 overflow-y-auto px-1 pb-1">
        {source.region && (
          <div className="flex flex-wrap gap-1.5">
            <span className={PILL}>{source.region}の郷土料理</span>
          </div>
        )}
        <div className={`${CARD} py-4 text-center`}>
          <p className="text-sm leading-relaxed">
            この料理の作り方は、
            <br />
            {/* 「見られま／す」のように折れないよう、かたまりごとに折り返す */}
            <span className="inline-block">{source.label}の</span>
            <span className="inline-block">ページで見られます。</span>
          </p>
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex min-h-11 items-center rounded-full bg-coral px-6 text-base font-bold text-ink-strong hover:bg-coral-dark"
          >
            作り方を見る
            <span aria-hidden className="ml-1">
              ↗
            </span>
            <span className="sr-only">（新しいタブでひらきます）</span>
          </a>
          <p className="mt-3 text-xs leading-relaxed text-ink-soft">元のページは数人分の分量です。モグシルで1人前に直した材料と量は、「材料と量」で見られます。</p>
        </div>
      </div>
    )
  }
  const lines = recipe.materials ? materialLines(recipe.materials, servings) : recipeLines(ingredients, servings, foods)
  const extras = extraTexts(recipe.extras ?? [], servings)
  return (
    <div className="-mx-1 flex-1 space-y-2 overflow-y-auto px-1 pb-1">
      <div className="flex flex-wrap gap-1.5">
        <span className={PILL}>調理 約{recipe.minutes}分</span>
      </div>

      <section className={CARD} aria-label="材料">
        <h3 className="mb-1 text-sm font-bold">材料（{servings}人分）</h3>
        <ul className="text-sm">
          {lines.map((l) => (
            <li key={l.key} className="flex justify-between gap-3 border-b border-dashed border-ink/10 py-1.5 last:border-b-0">
              <span>{l.name}</span>
              <span className="shrink-0 text-right tabular-nums">{l.amount}</span>
            </li>
          ))}
        </ul>
        {extras.length > 0 && <p className="mt-2 text-xs text-ink-soft">ほかに使うもの：{extras.join('、')}</p>}
        {recipe.note && <p className="mt-2 text-xs text-ink-soft">{recipe.note}</p>}
      </section>

      <section className={CARD} aria-label="つくり方">
        <h3 className="mb-2 text-sm font-bold">つくり方</h3>
        <ol className="space-y-2.5 text-sm leading-relaxed">
          {recipe.steps.map((s, i) => (
            <li key={i} className="flex gap-2.5">
              <span aria-hidden className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-coral text-xs font-bold text-ink-strong">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </section>

      {!recipe.materials && (
        <p className="px-1 text-xs text-ink-soft">
          分量は、栄養の計算に使っている1人前の材料から出しています（ゆでた野菜などは、ゆでる前の重さに直しています）。「材料と量」で材料を変えると、ここの分量も変わります。
        </p>
      )}
    </div>
  )
}
