import { dishImage } from '../components/illustration'
import { DEFAULT_PROFILE_LABEL, DISH_CATEGORY_LABEL, nutrientInfo } from '../components/labels'
import { detailGroups, type DetailGroup, type DetailRow } from '../domain/foodDetail'
import { itemTotals, pfcRatio, type Catalog } from '../domain/nutrition'
import { dailyReference, formatAmount, RANKING_NUTRIENTS } from '../domain/ranking'
import { DEFAULT_SERVINGS, extraTexts, materialLines, recipeLines, type RecipeLine } from '../domain/recipe'
import { computeTargets, DEFAULT_PROFILE } from '../domain/targets'
import type { Dish, DishCategory, DishRecipe, NutrientKey } from '../domain/types'
import { DISHES_INDEX_PATH, dishAppPath, dishPagePath, NUTRIENTS_INDEX_PATH, nutrientPagePath, READING_LINKS, SITE_NAME, SITE_URL } from '../routes'
import { OPERATOR_NAME, OPERATOR_URL } from '../site'
import { dishCuisine } from './dishCuisine'
import { NUTRIENT_COPY } from './nutrientCopy'
import type { OgCard } from './ogCard'
import { barWidth, BUTTON, BUTTON_SUB, CARD, LINK, StaticLayout } from './StaticLayout'

// 料理のカロリー・栄養と作り方のページ（/dishes/ と /dishes/<料理id>/）。作り方のある料理だけ。
// 主役は1人前の栄養（26成分と、1日の目安に対する割合）。その下に、材料と手順（アプリの「つくり方」と同じ、2人分）。
// アプリでは人数や材料を変えられる

// 一覧・パンくず・フッターでの呼び名（「料理のカロリー・栄養」。routes.ts の READING_LINKS で決める）
export const DISHES_INDEX_NAME = READING_LINKS.find((l) => l.key === 'dishes')!.name
// 一覧のページの見出し
export const DISHES_INDEX_HEADING = `${DISHES_INDEX_NAME}と作り方`

// 一覧のページで並べる順
const CATEGORY_ORDER: DishCategory[] = ['main', 'side', 'soup', 'staple', 'bowl', 'noodle', 'bread', 'snack']

const SERVINGS = DEFAULT_SERVINGS

// 同じカテゴリのほかの料理へのリンクの数
const RELATED_MAX = 12

// キーワードにする「おもな材料」の数
const KEYWORD_INGREDIENTS = 3

// 成分表の食品群のうち、砂糖・油・酒やみりん・調味料。「おもな材料」には入れない
const SEASONING_GROUPS = new Set(['03', '14', '16', '17'])

// 「◯分以内」のキーワードにする時間。これより長い料理には付けない
const TIME_STEPS = [5, 10, 15, 20, 30]

export type DishPageData = {
  dish: Dish
  recipe: DishRecipe
  path: string
  category: string
  // 和食・中華料理など（dishCuisine.ts）
  cuisine?: string
  // おもな材料・かかる時間・栄養の特徴。どれもページに出ている中身から作る
  keywords: string[]
  lines: RecipeLine[]
  extras: string[]
  kcal: number
  values: { label: string; value: string }[]
  // 26の成分（1人前）と、1日の目安・上限に対する割合。アプリの「食品を調べる」と同じ計算（domain/foodDetail.ts）
  groups: DetailGroup[]
  // エネルギーの内訳（PFCバランス。％）
  pfc: { p: number; f: number; c: number } | null
  // この料理に多い栄養素（1人前で、1日の目安に対する割合の大きい順）。成分ごとのランキングのページへリンクする
  rich: { key: NutrientKey; name: string; path: string; amount: string; percent: number }[]
}

// 「この料理に多い栄養素」でくらべる成分：たんぱく質・食物繊維と、ミネラル・ビタミン（とりたい成分で、1日の目安があるもの）
const RICH_KEYS: NutrientKey[] = ['protein', 'fiber', 'calcium', 'iron', 'potassium', 'magnesium', 'zinc', 'vitaminA', 'vitaminD', 'vitaminE', 'vitaminB1', 'vitaminB2', 'niacin', 'vitaminB6', 'folate', 'vitaminC']
// 出すのは3つまで。1人前で1日の目安の2割に届かない成分は出さない
const RICH_MAX = 3
const RICH_MIN_PERCENT = 20
const DEFAULT_TARGETS = computeTargets(DEFAULT_PROFILE)

function richNutrients(dish: Dish): DishPageData['rich'] {
  return RICH_KEYS.flatMap((key) => {
    const amount = dish.nutrients[key]
    const ref = dailyReference(key, DEFAULT_TARGETS)
    const copy = NUTRIENT_COPY[key]
    const path = nutrientPagePath(key)
    const unit = RANKING_NUTRIENTS.find((n) => n.key === key)?.unit
    if (amount === null || !ref || ref.kind !== 'target' || !copy || !path || !unit) return []
    const percent = Math.round((amount / ref.value) * 100)
    return percent >= RICH_MIN_PERCENT ? [{ key, name: copy.name, path, amount: `${formatAmount(amount)} ${unit}`, percent }] : []
  })
    .sort((a, b) => b.percent - a.percent)
    .slice(0, RICH_MAX)
}

// 成分表にない成分（null）は「—」
const g1 = (v: number | null) => (v == null ? '—' : (Math.round(v * 10) / 10).toFixed(1))

// 「えび（ブラックタイガー）」→「えび」
const plainName = (name: string) => name.replace(/（[^）]*）/g, '')

// 調味料などをのぞいた、はじめのほうの材料。食品番号（先頭2けたが食品群）で見分ける
function mainIngredients(recipe: DishRecipe, lines: RecipeLine[]): string[] {
  const foodIds = recipe.materials ? recipe.materials.map((m) => m.foodId ?? '') : lines.map((l) => l.key)
  const names = lines.filter((_, i) => !SEASONING_GROUPS.has(foodIds[i].slice(0, 2))).map((l) => plainName(l.name))
  return [...new Set(names)].slice(0, KEYWORD_INGREDIENTS)
}

function dishKeywords(dish: Dish, recipe: DishRecipe, lines: RecipeLine[]): string[] {
  const n = dish.nutrients
  const time = TIME_STEPS.find((m) => recipe.minutes <= m)
  return [
    ...mainIngredients(recipe, lines),
    ...(time ? [`${time}分以内`] : []),
    ...(n.protein != null && n.protein >= 20 ? ['たんぱく質20g以上'] : []),
    ...(n.energyKcal != null && Math.round(n.energyKcal) <= 200 ? ['200kcal以下'] : []),
  ]
}

export function dishPageData(dish: Dish, catalog: Catalog): DishPageData | null {
  const recipe = dish.recipe
  if (!recipe || dish.source) return null
  const lines = recipe.materials ? materialLines(recipe.materials, SERVINGS) : recipeLines(dish.ingredients, SERVINGS, catalog.foods, recipe.names)
  const n = dish.nutrients
  const totals = itemTotals({ uid: '', kind: 'dish', refId: dish.id, portion: 1 }, catalog)
  const ratio = pfcRatio(totals.values)
  return {
    dish,
    recipe,
    path: dishPagePath(dish.id),
    category: DISH_CATEGORY_LABEL[dish.category],
    cuisine: dishCuisine(dish.id),
    keywords: dishKeywords(dish, recipe, lines),
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
    // 載せるのは成分ランキングと同じ26成分。みりん・酒のアルコール（加熱でとぶ分を引いていない量）は、ここには出さない
    groups: detailGroups(totals, DEFAULT_TARGETS, 'sum').map((g) => ({ ...g, rows: g.rows.filter((r) => r.key !== 'alcohol') })),
    pfc: ratio && { p: Math.round(ratio.p), f: Math.round(ratio.f), c: Math.round(ratio.c) },
    rich: richNutrients(dish),
  }
}

export function dishPagesFor(catalog: Catalog): DishPageData[] {
  const rank = (d: DishPageData) => CATEGORY_ORDER.indexOf(d.dish.category)
  return [...catalog.dishes.values()]
    .flatMap((d) => dishPageData(d, catalog) ?? [])
    .filter((d) => rank(d) >= 0)
    .sort((a, b) => rank(a) - rank(b))
}

// 検索結果では最初の「｜」より後ろが落ちやすいので、料理名・カロリーを前に置く。「作り方」でさがす人にも分かるよう、後ろに入れる。
// 見出し（h1）は「〈料理名〉のカロリー・栄養と作り方」
export const dishPageTitle = (d: DishPageData) => `${d.dish.name}のカロリー・栄養（1人前${d.kcal}kcal）と作り方｜${SITE_NAME}`

// 載せる成分の数（26）。ページの文と説明文で同じ数を使う
const NUTRIENT_COUNT = RANKING_NUTRIENTS.length

export function dishPageDescription(d: DishPageData): string {
  const n = d.dish.nutrients
  return `${d.dish.name}は1人前${d.kcal}kcal、たんぱく質${g1(n.protein)}g、脂質${g1(n.fat)}g、食塩${g1(n.salt)}g。ビタミン・ミネラルなど${NUTRIENT_COUNT}成分と、${SERVINGS}人分の作り方（約${d.recipe.minutes}分）も載せています。`
}

export function dishOgCard(d: DishPageData): { card: OgCard; alt: string } {
  const n = d.dish.nutrients
  return {
    card: {
      // 見出しは「〈料理名〉のカロリー・栄養（1人前◯kcal）」。画像では、カロリーを札にして目立たせる
      title: `${d.dish.name}のカロリー・栄養`,
      badge: `1人前 ${d.kcal} kcal`,
      sub: `たんぱく質 ${g1(n.protein)} g・脂質 ${g1(n.fat)} g・食塩 ${g1(n.salt)} g`,
      chips: [`${NUTRIENT_COUNT}成分`, `${SERVINGS}人分の作り方`],
      hero: dishImage(d.dish),
    },
    alt: `${d.dish.name}のカロリー・栄養。1人前${d.kcal}kcal、たんぱく質${g1(n.protein)}g、脂質${g1(n.fat)}g、食塩${g1(n.salt)}g`,
  }
}

// レシピ用の画像（検索エンジン向け）。料理の絵を大きく置いた画像を、3つの形（1:1・4:3・16:9）で作る。写真は使わない
export type RecipeImage = { path: string; width: number; height: number; illustration: string }
const RECIPE_IMAGE_SIZES = [
  { name: '1x1', width: 1200, height: 1200 },
  { name: '4x3', width: 1200, height: 900 },
  { name: '16x9', width: 1200, height: 675 },
]
export const dishRecipeImages = (d: DishPageData): RecipeImage[] =>
  RECIPE_IMAGE_SIZES.map((s) => ({ path: `/recipe-images/${d.dish.id}-${s.name}.png`, width: s.width, height: s.height, illustration: dishImage(d.dish) }))

// 手順の場所（ページの中のリンク先）と、手順の短い名前（はじめの1文）
export const stepAnchor = (index: number) => `step-${index + 1}`
const stepName = (text: string) => text.split('。')[0]

// 検索エンジン向けのレシピのデータ（schema.org の Recipe）。
// 動画・評価・手順ごとの写真は、ページにないので書かない。
// 画像は、料理の絵を大きく置いた3つの形（1:1・4:3・16:9）。公開した日・直した日は、ページを書き出すときに足す（sitePages.tsx の renderDocument）
export function dishRecipeJsonLd(d: DishPageData): Record<string, unknown> {
  const n = d.dish.nutrients
  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: d.dish.name,
    url: `${SITE_URL}${d.path}`,
    inLanguage: 'ja',
    image: dishRecipeImages(d).map((i) => `${SITE_URL}${i.path}`),
    description: dishPageDescription(d),
    author: { '@type': 'Organization', name: OPERATOR_NAME, url: OPERATOR_URL },
    recipeCategory: d.category,
    ...(d.cuisine ? { recipeCuisine: d.cuisine } : {}),
    keywords: d.keywords.join(', '),
    recipeYield: `${SERVINGS}人分`,
    totalTime: `PT${d.recipe.minutes}M`,
    recipeIngredient: [...d.lines.map((l) => `${l.name} ${l.amount}`), ...d.extras],
    recipeInstructions: d.recipe.steps.map((text, i) => ({ '@type': 'HowToStep', name: stepName(text), text, url: `${SITE_URL}${d.path}#${stepAnchor(i)}` })),
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
            ['saturatedFatContent', n.satFat],
            ['carbohydrateContent', n.carb],
            ['fiberContent', n.fiber],
          ] as const
        ).flatMap(([k, v]) => (v == null ? [] : [[k, `${g1(v)} g`]])),
      ),
    },
  }
}

// 一覧のページ（/dishes/）に入れる、料理のページの並び（schema.org の ItemList）
export function dishesItemListJsonLd(pages: DishPageData[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: DISHES_INDEX_HEADING,
    numberOfItems: pages.length,
    itemListElement: pages.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.dish.name, url: `${SITE_URL}${p.path}` })),
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

// 成分の量（けた数はアプリと同じ）と、割合（10% 未満は小数1けたまで）
const amountText = (r: DetailRow) => {
  const { digits } = nutrientInfo(r.key)
  return r.amount!.toLocaleString('ja-JP', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}
const percentText = (p: number) => (p >= 10 ? Math.round(p).toLocaleString('ja-JP') : String(Number(p.toFixed(1))))
// 表では「食塩」を、成分表示と同じ「食塩相当量」と書く
const rowLabel = (r: DetailRow) => (r.key === 'salt' ? '食塩相当量' : r.label)

// 1人前の成分の表（26成分）。右の列は、1日の目安（とりたい成分）か上限（とりすぎに気をつけたい成分）に対する割合
function NutrientTable({ d }: { d: DishPageData }) {
  const rows = d.groups.flatMap((g) => g.rows)
  const partial = rows.some((r) => r.partial)
  const names = (list: DetailRow[]) => list.map(rowLabel).join('・')
  const upper = rows.filter((r) => r.kind === 'max')
  const noRef = rows.filter((r) => r.kind === null)
  return (
    <>
      <table className="w-full table-fixed text-sm">
        <caption className="sr-only">
          {d.dish.name} 1人前の栄養成分（{NUTRIENT_COUNT}成分）と、1日の目安に対する割合
        </caption>
        <thead>
          <tr className="text-xs text-ink-soft">
            <th scope="col" className="py-1.5 text-left font-normal sm:w-44">
              成分
            </th>
            <th scope="col" className="w-[4.75rem] py-1.5 text-right font-normal sm:w-28">
              1人前の量
            </th>
            <th scope="col" className="w-[5.5rem] py-1.5 text-right font-normal min-[380px]:w-32 sm:w-auto">
              1日の目安に<span className="inline-block">対する割合</span>
            </th>
          </tr>
        </thead>
        {d.groups.map((g) => (
          <tbody key={g.label}>
            <tr>
              <th scope="rowgroup" colSpan={3} className="pt-3 pb-1 text-left text-xs font-bold text-coral-ink">
                {g.label}
              </th>
            </tr>
            {g.rows.map((r) => {
              const over = r.kind === 'max' && r.percent !== null && r.percent >= 100
              return (
                <tr key={r.key} className="border-t border-ink/5">
                  <th scope="row" className="py-1.5 pr-1 text-left leading-snug font-normal">
                    {rowLabel(r)}
                    {r.partial && <span className="text-ink-soft">※</span>}
                  </th>
                  <td className="py-1.5 text-right whitespace-nowrap tabular-nums">
                    <strong>{amountText(r)}</strong>
                    <span className="text-xs text-ink-soft"> {r.unit}</span>
                  </td>
                  <td className="py-1.5 pl-2 sm:pl-4">
                    {r.percent === null ? (
                      <span className="block text-right text-xs text-ink-soft">—</span>
                    ) : (
                      <span className="flex items-center justify-end gap-2">
                        <span className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10 min-[380px]:block" aria-hidden>
                          {r.percent >= 2.5 && <span className={`block h-full rounded-full ${over ? 'bg-alert' : r.kind === 'max' ? 'bg-caution' : 'bg-ok'} ${barWidth(r.percent / 100)}`} />}
                        </span>
                        <span className="shrink-0 text-right text-xs whitespace-nowrap text-ink-soft tabular-nums min-[380px]:w-[4.75rem] sm:w-[5.25rem]">
                          {r.kind === 'max' ? '上限' : '目安'}の{percentText(r.percent)}%
                        </span>
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        ))}
      </table>
      <p className="mt-3 text-xs leading-relaxed text-ink-soft">
        割合は、{DEFAULT_PROFILE_LABEL}（ふだんの活動量がふつうの人）の1日の目安に対するものです。目安は厚生労働省「日本人の食事摂取基準（2025年版）」の推奨量・目安量・目標量です。
        {upper.length > 0 && `${names(upper)}は、この量までにしたい上限に対する割合です。`}
        {noRef.length > 0 && `${names(noRef)}は、1日の量の目安がないので「—」としています。`}
        {partial && '「※」は、材料の一部に成分表の値がなく、分かる分だけを足した量です。'}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
        量は、文部科学省「日本食品標準成分表（八訂）増補2023年」の値を、材料ごとにかけて合計した目安です。作り方や材料の大きさで変わります。
      </p>
    </>
  )
}

// ページの中の場所へとぶリンク（栄養・材料・つくり方）
const JUMP = 'inline-flex min-h-9 items-center rounded-full bg-cream px-3 text-xs font-bold text-coral-ink'

export function DishPage({ data: d, related }: { data: DishPageData; related: DishPageData[] }) {
  const { dish, recipe } = d
  const n = dish.nutrients
  return (
    <StaticLayout crumbs={[{ name: SITE_NAME, path: '/' }, { name: DISHES_INDEX_NAME, path: DISHES_INDEX_PATH }, { name: dish.name }]}>
      <article className="space-y-4">
        <header className={`${CARD} flex flex-col gap-4 sm:flex-row sm:items-center`}>
          <img src={dishImage(dish)} alt="" width={144} height={144} className="h-28 w-28 shrink-0 self-center sm:h-36 sm:w-36" />
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-bold text-coral-ink">{`${d.cuisine ? `${d.cuisine}・` : ''}${d.category}`}</p>
            <h1 className="text-2xl leading-snug font-bold">
              {dish.name}の<span className="inline-block">カロリー・栄養と</span>
              <span className="inline-block">作り方</span>
            </h1>
            <p className="text-sm leading-relaxed">
              {dish.name}は、1人前 <strong>{d.kcal} kcal</strong>、たんぱく質 {g1(n.protein)} g、脂質 {g1(n.fat)} g、炭水化物 {g1(n.carb)} g、食塩相当量 {g1(n.salt)} g です。ビタミン・ミネラルなど{NUTRIENT_COUNT}成分の量と、
              {SERVINGS}人分の作り方（約{recipe.minutes}分）をまとめました。
            </p>
            <p className="flex flex-wrap gap-2">
              <a href="#nutrition" className={JUMP}>
                1人前の栄養
              </a>
              <a href="#ingredients" className={JUMP}>
                材料（{SERVINGS}人分）
              </a>
              <a href="#steps" className={JUMP}>
                つくり方
              </a>
            </p>
          </div>
        </header>

        <section className={CARD} aria-labelledby="nutrition">
          <h2 id="nutrition" className="mb-2 scroll-mt-4 text-lg font-bold">
            {dish.name} 1人前の栄養
          </h2>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {d.values.map((v) => (
              <div key={v.label} className="rounded-xl bg-cream px-3 py-2">
                <dt className="text-xs text-ink-soft">{v.label}</dt>
                <dd className="text-base font-bold tabular-nums">{v.value}</dd>
              </div>
            ))}
          </dl>
          {d.pfc && (
            <p className="mt-2 text-sm leading-relaxed">
              エネルギーの内訳（PFCバランス）は、たんぱく質 {d.pfc.p}%・脂質 {d.pfc.f}%・炭水化物 {d.pfc.c}% です。
            </p>
          )}
          {d.rich.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-bold">この料理に多い栄養素</h3>
              <ul className="mt-1 divide-y divide-ink/5 text-sm">
                {d.rich.map((r) => (
                  <li key={r.key} className="flex min-h-11 flex-wrap items-center justify-between gap-x-3">
                    <a href={r.path} className={`${LINK} shrink-0`}>
                      {r.name}
                    </a>
                    <span className="ml-auto text-right tabular-nums">
                      {r.amount}
                      <span className="text-xs text-ink-soft">（目安の{r.percent}%）</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">名前から、その栄養素が多い食べ物のランキングを見られます。</p>
            </div>
          )}
          <h3 className="mt-5 text-sm font-bold">
            {NUTRIENT_COUNT}成分の量と、<span className="inline-block">1日の目安に対する割合</span>
          </h3>
          <NutrientTable d={d} />
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <a href={dishAppPath(dish.id)} className={BUTTON}>
              材料と量を変えて栄養を計算する
            </a>
            <a href={NUTRIENTS_INDEX_PATH} className={`${LINK} text-sm`}>
              成分ごとの、多い食べ物のランキングを見る
            </a>
          </p>
        </section>

        <section className={CARD} aria-labelledby="ingredients">
          <h2 id="ingredients" className="mb-2 scroll-mt-4 text-lg font-bold">
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
          <h2 id="steps" className="mb-3 scroll-mt-4 text-lg font-bold">
            つくり方
          </h2>
          <ol className="space-y-3">
            {recipe.steps.map((s, i) => (
              <li key={`${i}-${s}`} id={stepAnchor(i)} className="flex scroll-mt-4 gap-3 text-sm leading-relaxed">
                <span aria-hidden className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-coral text-xs font-bold text-ink-strong">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4">
            <a href={dishAppPath(dish.id)} className={BUTTON_SUB}>
              人数や材料を変えて見る
            </a>
          </p>
        </section>

        {related.length > 0 && (
          <nav className={CARD} aria-labelledby="related">
            <h2 id="related" className="mb-2 text-base font-bold">
              ほかの{d.category}のカロリー・栄養
            </h2>
            <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
              {related.map((r) => (
                <li key={r.dish.id}>
                  <a href={r.path} className={LINK}>
                    {r.dish.name}
                  </a>
                  <span className="ml-1 text-xs text-ink-soft tabular-nums">{r.kcal} kcal</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm">
              <a href={DISHES_INDEX_PATH} className={LINK}>
                {DISHES_INDEX_NAME}の一覧へ
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

export const dishesIndexTitle = (pages: DishPageData[]) => `${DISHES_INDEX_HEADING}（${pages.length}品）｜${SITE_NAME}`
export const dishesIndexDescription = (pages: DishPageData[]) =>
  `肉じゃが・唐揚げ・さばの味噌煮・豚汁など、ふだんの料理${pages.length}品の1人前のカロリーと、たんぱく質・食塩・ビタミン・ミネラルなど26成分をまとめました。${SERVINGS}人分の材料と作り方も載せています。`

export function DishesIndexPage({ pages }: { pages: DishPageData[] }) {
  const groups = CATEGORY_ORDER.map((c) => ({ category: c, items: pages.filter((p) => p.dish.category === c) })).filter((g) => g.items.length > 0)
  return (
    <StaticLayout crumbs={[{ name: SITE_NAME, path: '/' }, { name: DISHES_INDEX_NAME }]}>
      <div className="space-y-4">
        <header className={CARD}>
          <h1 className="text-2xl leading-snug font-bold">
            {DISHES_INDEX_NAME}と<span className="inline-block">作り方（{pages.length}品）</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed">
            ふだんの料理{pages.length}品の、1人前のカロリーと栄養（たんぱく質・食塩・ビタミン・ミネラルなど26成分）をまとめました。{SERVINGS}人分の材料と作り方も載せています。モグシルでは、人数や材料を変えて栄養を計算できます。
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
    card: { title: DISHES_INDEX_HEADING, sub: `${pages.length}品の1人前のカロリーと26成分、材料と手順つき`, icons },
    alt: `${DISHES_INDEX_HEADING}。肉じゃが・唐揚げ・さばの味噌煮など${pages.length}品`,
  }
}
