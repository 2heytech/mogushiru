import { dishImage } from '../components/illustration'
import { DISH_CATEGORY_LABEL } from '../components/labels'
import type { Catalog } from '../domain/nutrition'
import { DEFAULT_SERVINGS, extraTexts, materialLines, recipeLines, type RecipeLine } from '../domain/recipe'
import type { Dish, DishCategory, DishRecipe } from '../domain/types'
import { DISHES_INDEX_PATH, dishAppPath, dishPagePath, SITE_NAME, SITE_URL } from '../routes'
import { OPERATOR_NAME } from '../site'
import type { OgCard } from './ogCard'
import { BUTTON, BUTTON_SUB, CARD, LINK, StaticLayout } from './StaticLayout'

// 料理の作り方のページ（/dishes/ と /dishes/<料理id>/）。作り方のある料理だけ。
// 材料と手順はアプリの「つくり方」と同じ（2人分）。栄養は1人前。アプリでは人数や材料を変えられる

// 一覧のページで並べる順
const CATEGORY_ORDER: DishCategory[] = ['main', 'side', 'soup', 'staple', 'bowl', 'noodle', 'bread', 'snack']

const SERVINGS = DEFAULT_SERVINGS

// 同じカテゴリのほかの料理へのリンクの数
const RELATED_MAX = 12

export type DishPageData = {
  dish: Dish
  recipe: DishRecipe
  path: string
  category: string
  lines: RecipeLine[]
  extras: string[]
  kcal: number
  values: { label: string; value: string }[]
}

// 成分表にない成分（null）は「—」
const g1 = (v: number | null) => (v == null ? '—' : (Math.round(v * 10) / 10).toFixed(1))

export function dishPageData(dish: Dish, catalog: Catalog): DishPageData | null {
  const recipe = dish.recipe
  if (!recipe || dish.source) return null
  const lines = recipe.materials ? materialLines(recipe.materials, SERVINGS) : recipeLines(dish.ingredients, SERVINGS, catalog.foods, recipe.names)
  const n = dish.nutrients
  return {
    dish,
    recipe,
    path: dishPagePath(dish.id),
    category: DISH_CATEGORY_LABEL[dish.category],
    lines,
    extras: recipe.extras ? extraTexts(recipe.extras, SERVINGS) : [],
    kcal: Math.round(n.energyKcal ?? 0),
    values: [
      { label: 'エネルギー', value: `${Math.round(n.energyKcal ?? 0)} kcal` },
      { label: 'たんぱく質', value: `${g1(n.protein)} g` },
      { label: '脂質', value: `${g1(n.fat)} g` },
      { label: '炭水化物', value: `${g1(n.carb)} g` },
      { label: '食物繊維', value: `${g1(n.fiber)} g` },
      { label: '食塩相当量', value: `${g1(n.salt)} g` },
    ],
  }
}

export function dishPagesFor(catalog: Catalog): DishPageData[] {
  const rank = (d: DishPageData) => CATEGORY_ORDER.indexOf(d.dish.category)
  return [...catalog.dishes.values()]
    .flatMap((d) => dishPageData(d, catalog) ?? [])
    .filter((d) => rank(d) >= 0)
    .sort((a, b) => rank(a) - rank(b))
}

// 料理の名前にない言い方で検索されやすいので「作り方」「レシピ」の両方を入れる
export const dishPageTitle = (d: DishPageData) => `${d.dish.name}の作り方・レシピ（${SERVINGS}人分）｜1人前${d.kcal}kcalと栄養｜${SITE_NAME}`

export function dishPageDescription(d: DishPageData): string {
  const names = d.lines
    .slice(0, 4)
    .map((l) => l.name)
    .join('・')
  const n = d.dish.nutrients
  return `${d.dish.name}の作り方（${SERVINGS}人分・約${d.recipe.minutes}分）。材料は${names}など。1人前${d.kcal}kcal、たんぱく質${g1(n.protein)}g、食塩${g1(n.salt)}g。材料と量を変えて栄養を計算することもできます。`
}

export function dishOgCard(d: DishPageData): { card: OgCard; alt: string } {
  return {
    card: {
      // 共有の画像の見出しは24字まで
      title: `${d.dish.name}の作り方`.length <= 24 ? `${d.dish.name}の作り方` : d.dish.name,
      sub: `${SERVINGS}人分の材料と手順｜1人前 ${d.kcal} kcal・たんぱく質 ${g1(d.dish.nutrients.protein)} g`,
      chips: d.lines.slice(0, 5).map((l) => l.name),
      icons: [dishImage(d.dish)],
    },
    alt: `${d.dish.name}の作り方。1人前${d.kcal}kcal、たんぱく質${g1(d.dish.nutrients.protein)}g`,
  }
}

// 検索エンジン向けのレシピのデータ（schema.org の Recipe）
export function dishRecipeJsonLd(d: DishPageData, imagePath: string): Record<string, unknown> {
  const n = d.dish.nutrients
  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: d.dish.name,
    image: [`${SITE_URL}${imagePath}`],
    description: dishPageDescription(d),
    author: { '@type': 'Organization', name: OPERATOR_NAME },
    recipeCategory: d.category,
    recipeYield: `${SERVINGS}人分`,
    totalTime: `PT${d.recipe.minutes}M`,
    recipeIngredient: [...d.lines.map((l) => `${l.name} ${l.amount}`), ...d.extras],
    recipeInstructions: d.recipe.steps.map((text) => ({ '@type': 'HowToStep', text })),
    nutrition: {
      '@type': 'NutritionInformation',
      servingSize: '1人前',
      calories: `${d.kcal} kcal`,
      // 成分表にない成分は書かない
      ...Object.fromEntries(
        (
          [
            ['proteinContent', n.protein],
            ['fatContent', n.fat],
            ['carbohydrateContent', n.carb],
            ['fiberContent', n.fiber],
          ] as const
        ).flatMap(([k, v]) => (v == null ? [] : [[k, `${g1(v)} g`]])),
      ),
    },
  }
}

function Lines({ d }: { d: DishPageData }) {
  return (
    <ul className="divide-y divide-ink/5 text-sm">
      {d.lines.map((l) => (
        <li key={l.key} className="flex items-baseline justify-between gap-3 py-1.5">
          <span>{l.name}</span>
          <span className="shrink-0 text-right tabular-nums">{l.amount}</span>
        </li>
      ))}
    </ul>
  )
}

export function DishPage({ data: d, related }: { data: DishPageData; related: DishPageData[] }) {
  const { dish, recipe } = d
  return (
    <StaticLayout crumbs={[{ name: SITE_NAME, path: '/' }, { name: '料理の作り方', path: DISHES_INDEX_PATH }, { name: dish.name }]}>
      <article className="space-y-4">
        <header className={`${CARD} flex flex-col gap-4 sm:flex-row sm:items-center`}>
          <img src={dishImage(dish)} alt="" width={112} height={112} className="h-24 w-24 shrink-0 self-center sm:h-28 sm:w-28" />
          <div className="space-y-2">
            <p className="text-xs font-bold text-coral-ink">{d.category}の作り方</p>
            <h1 className="text-2xl leading-snug font-bold">{dish.name}の作り方</h1>
            <p className="text-sm leading-relaxed">
              {SERVINGS}人分・調理 約{recipe.minutes}分。1人前 {d.kcal} kcal、たんぱく質 {g1(dish.nutrients.protein)} g、食塩 {g1(dish.nutrients.salt)} g。
            </p>
            <p>
              <a href={dishAppPath(dish.id)} className={BUTTON}>
                人数や材料を変えて見る
              </a>
            </p>
          </div>
        </header>

        <section className={CARD} aria-labelledby="ingredients">
          <h2 id="ingredients" className="mb-2 text-lg font-bold">
            材料（{SERVINGS}人分）
          </h2>
          <Lines d={d} />
          {d.extras.length > 0 && <p className="mt-2 text-sm">ほかに使うもの：{d.extras.join('・')}</p>}
          {recipe.note && <p className="mt-2 text-xs leading-relaxed text-ink-soft">{recipe.note}</p>}
          {!recipe.materials && (
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">分量は、栄養の計算に使っている1人前の材料から出しています（ゆでた野菜などは、ゆでる前の重さに直しています）。</p>
          )}
        </section>

        <section className={CARD} aria-labelledby="steps">
          <h2 id="steps" className="mb-3 text-lg font-bold">
            つくり方
          </h2>
          <ol className="space-y-3">
            {recipe.steps.map((s, i) => (
              <li key={`${i}-${s}`} className="flex gap-3 text-sm leading-relaxed">
                <span aria-hidden className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-coral text-xs font-bold text-ink-strong">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className={CARD} aria-labelledby="nutrition">
          <h2 id="nutrition" className="mb-2 text-lg font-bold">
            1人前の栄養
          </h2>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {d.values.map((v) => (
              <div key={v.label} className="rounded-xl bg-cream px-3 py-2">
                <dt className="text-xs text-ink-soft">{v.label}</dt>
                <dd className="text-base font-bold tabular-nums">{v.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-ink-soft">日本食品標準成分表（八訂）増補2023年の値から計算した目安です。ビタミン・ミネラルなど26の成分は、モグシルで見られます。</p>
          <p className="mt-3 flex flex-wrap gap-2">
            <a href={dishAppPath(dish.id)} className={BUTTON_SUB}>
              材料と量を変えて栄養を計算する
            </a>
          </p>
        </section>

        {related.length > 0 && (
          <nav className={CARD} aria-labelledby="related">
            <h2 id="related" className="mb-2 text-base font-bold">
              ほかの{d.category}の作り方
            </h2>
            <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
              {related.map((r) => (
                <li key={r.dish.id}>
                  <a href={r.path} className={LINK}>
                    {r.dish.name}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm">
              <a href={DISHES_INDEX_PATH} className={LINK}>
                料理の作り方の一覧へ
              </a>
            </p>
          </nav>
        )}
      </article>
    </StaticLayout>
  )
}

// 同じカテゴリの料理を、一覧の前後から取る（どのページからも、なるべくちがう料理へリンクが向くように）
export function relatedDishes(d: DishPageData, all: DishPageData[], max = RELATED_MAX): DishPageData[] {
  const same = all.filter((x) => x.dish.category === d.dish.category)
  const i = same.findIndex((x) => x.dish.id === d.dish.id)
  const out: DishPageData[] = []
  for (let k = 1; out.length < max && k < same.length; k++) out.push(same[(i + k) % same.length])
  return out
}

export function DishesIndexPage({ pages }: { pages: DishPageData[] }) {
  const groups = CATEGORY_ORDER.map((c) => ({ category: c, items: pages.filter((p) => p.dish.category === c) })).filter((g) => g.items.length > 0)
  return (
    <StaticLayout crumbs={[{ name: SITE_NAME, path: '/' }, { name: '料理の作り方' }]}>
      <div className="space-y-4">
        <header className={CARD}>
          <h1 className="text-2xl leading-snug font-bold">料理の作り方とカロリー・栄養（{pages.length}品）</h1>
          <p className="mt-2 text-sm leading-relaxed">
            ふだんの料理の作り方を、{SERVINGS}人分の材料と手順、1人前のカロリー・たんぱく質・食塩つきでまとめました。モグシルでは、人数や材料を変えて栄養を計算できます。
          </p>
          <p className="mt-3 flex flex-wrap gap-2 text-xs">
            {groups.map((g) => (
              <a key={g.category} href={`#${g.category}`} className="rounded-full bg-cream px-3 py-1.5 font-bold text-coral-ink">
                {DISH_CATEGORY_LABEL[g.category]}（{g.items.length}）
              </a>
            ))}
          </p>
        </header>
        {groups.map((g) => (
          <section key={g.category} id={g.category} className={CARD} aria-labelledby={`h-${g.category}`}>
            <h2 id={`h-${g.category}`} className="mb-2 text-lg font-bold">
              {DISH_CATEGORY_LABEL[g.category]}
            </h2>
            <ul className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((p) => (
                <li key={p.dish.id} className="flex items-center gap-2 py-1">
                  <img src={dishImage(p.dish)} alt="" width={36} height={36} className="h-9 w-9 shrink-0" loading="lazy" />
                  <a href={p.path} className={LINK}>
                    {p.dish.name}
                  </a>
                  <span className="ml-auto shrink-0 text-xs text-ink-soft tabular-nums">{p.kcal} kcal</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </StaticLayout>
  )
}

export function dishesIndexOgCard(pages: DishPageData[]): { card: OgCard; alt: string } {
  const pick = ['nikujaga', 'karaage', 'saba-misoni', 'miso-soup', 'curry-rice', 'gyoza']
  const icons = pick.flatMap((id) => pages.find((p) => p.dish.id === id) ?? []).map((p) => dishImage(p.dish))
  return {
    card: { title: '料理の作り方とカロリー・栄養', sub: `${pages.length}品の材料と手順、1人前の栄養つき`, icons },
    alt: `料理の作り方とカロリー・栄養。肉じゃが・唐揚げ・さばの味噌煮など${pages.length}品`,
  }
}
