import { foodImage } from '../components/illustration'
import { DEFAULT_PROFILE_LABEL, nutrientInfo } from '../components/labels'
import { detailGroups, type DetailGroup, type DetailRow } from '../domain/foodDetail'
import { itemTotals, pfcRatio, type Catalog } from '../domain/nutrition'
import { FOOD_GROUP_LABEL, RANKING_NUTRIENTS } from '../domain/ranking'
import { SERVING_NOTE, servingFor, servingText, type Serving } from '../domain/serving'
import { computeTargets, DEFAULT_PROFILE } from '../domain/targets'
import type { Food, NutrientKey } from '../domain/types'
import { FOOD_PAGE_IDS, foodAddPath, foodAppPath, foodPagePath, nutrientPagePath, NUTRIENTS_INDEX_PATH, SITE_NAME, VIEW_PATH } from '../routes'
import type { DishPageData } from './dishPages'
import { NUTRIENT_COPY } from './nutrientCopy'
import type { OgCard } from './ogCard'
import { barWidth, BUTTON, BUTTON_SUB, CARD, LINK, StaticLayout } from './StaticLayout'

// 食品のページ（/foods/<slug>/）。定番の食品（routes.ts の FOOD_PAGE_IDS）について、その食品だけの値を、1食分と100gで出す。
// 「納豆 カロリー」「鶏むね肉 100g たんぱく質」のようにさがす人に、はじめの1文で答える。
// 値は、アプリの「食品を調べる」でその食品をひらいたときと同じ計算（domain/foodDetail.ts）。アプリでは量を変えたり、1日の食事に入れたりできる

// 食品ごとに決めること。
// focus：タイトルと見出しで、カロリーと並べる成分（その食品でよくさがされるもの）
// note：成分表のどの状態の値か（生・加熱・何が入っていないか）。数字は書かない（数字は下の「くらべる」の表に、データから出す）
// related：状態や種類のちがう近い食品（成分表の食品番号）。100gあたりでくらべる表に出す。label は、ふだんの呼び名のない食品の呼び名
type FoodCopy = { focus: NutrientKey; note: string; related: { id: string; label?: string }[] }

const FOOD_COPY: Record<string, FoodCopy> = {
  '01088': {
    focus: 'carb',
    note: '炊いたあとのごはん（精白米）の重さで計算しています。炊く前の米の重さではありません。',
    related: [{ id: '01085' }, { id: '01083', label: '米（炊く前の精白米）' }],
  },
  '01026': {
    focus: 'carb',
    note: '角形の食パンそのままの値です。バターやジャムなどは入っていません。',
    related: [{ id: '01174' }, { id: '01175' }],
  },
  '12004': {
    focus: 'protein',
    note: '殻をのぞいた、生の全卵（卵黄と卵白）の値です。',
    related: [{ id: '12005' }, { id: '12021' }],
  },
  '04046': {
    focus: 'protein',
    note: '納豆だけの値です。添付のたれ・からしは入っていません。',
    related: [{ id: '04047', label: 'ひきわり納豆' }],
  },
  '13003': {
    focus: 'calcium',
    note: 'ふつうの牛乳（成分表の「普通牛乳」）の値です。コップ1杯は200gで計算しています。',
    related: [{ id: '13005', label: '低脂肪の加工乳' }],
  },
  '13025': {
    focus: 'calcium',
    note: '砂糖の入っていないプレーンヨーグルト（全脂無糖）の値です。',
    related: [{ id: '13026' }, { id: '13053', label: 'ヨーグルト（低脂肪・無糖）' }, { id: '13027' }],
  },
  '07107': {
    focus: 'carb',
    note: '皮をのぞいた、生のバナナの値です。',
    related: [],
  },
  '11220': {
    focus: 'protein',
    note: '皮をのぞいた、生のむね肉（若どり）の重さで計算しています。焼くと水分がぬけて軽くなるので、同じ100gでくらべると、カロリーもたんぱく質も多くなります。',
    related: [{ id: '11219' }, { id: '11288', label: '鶏むね肉（皮なし・焼き）' }],
  },
  '10134': {
    focus: 'protein',
    note: '生のしろさけの値です。塩ざけは食塩が多く、別の値になります。',
    related: [{ id: '10136' }, { id: '10139' }],
  },
  '04032': {
    focus: 'protein',
    note: '木綿豆腐の値です。絹ごし豆腐は水分が多いぶん、同じ重さでくらべるとカロリーもたんぱく質も少なめです。',
    related: [{ id: '04033' }],
  },
  '06263': {
    focus: 'vitaminC',
    note: '生のブロッコリー（つぼみの部分）の重さで計算しています。ゆでると、ビタミンCはお湯にとけて少なくなります。',
    related: [{ id: '06264' }, { id: '06395', label: 'ブロッコリー（電子レンジ）' }],
  },
  '02006': {
    focus: 'carb',
    note: '皮をむいた、生のさつまいもの重さで計算しています。焼きいもは水分がぬけるぶん、同じ100gでくらべるとカロリーが高くなります。',
    related: [{ id: '02008' }, { id: '02007', label: 'さつまいも（蒸し）' }],
  },
}

// 載せる成分の数（26）
const NUTRIENT_COUNT = RANKING_NUTRIENTS.length
const DEFAULT_TARGETS = computeTargets(DEFAULT_PROFILE)
// 「1食分で多くとれる栄養素」：1食分で、1日の目安の15%以上のものを3つまで
const RICH_KEYS: NutrientKey[] = ['protein', 'fiber', 'calcium', 'iron', 'potassium', 'magnesium', 'zinc', 'vitaminA', 'vitaminD', 'vitaminE', 'vitaminB1', 'vitaminB2', 'niacin', 'vitaminB6', 'folate', 'vitaminC']
const RICH_MAX = 3
const RICH_MIN_PERCENT = 15
// 「この食品を使う料理」に出す数
const DISH_MAX = 8

export type FoodAmount = { grams: number; text: string; kcal: number }

export type FoodPageData = {
  food: Food
  path: string
  copy: FoodCopy
  serving: Serving
  // タイトル・見出し・はじめの文で先に答える量。ふだんの単位（1パック・1個・茶わん1杯）のある食品は1食分、ない食品（「1食分」としか言えない肉・魚など）は100g
  lead: FoodAmount
  // もう一方の量（lead が1食分なら100g、100gなら1食分）
  other: FoodAmount
  focus: { key: NutrientKey; label: string; unit: string }
  // 1食分の成分（26成分）と、1日の目安・上限に対する割合。アプリの「食品を調べる」と同じ計算
  groups: DetailGroup[]
  // 100gの成分
  per100: Map<NutrientKey, DetailRow>
  // 1食分のエネルギーの内訳（PFCバランス。％）
  pfc: { p: number; f: number; c: number } | null
  rich: { key: NutrientKey; name: string; path: string; amount: string; percent: number }[]
  // 状態や種類のちがう近い食品（100gあたり）。先頭は、この食品
  related: { id: string; name: string; kcal: string; focus: string; self: boolean }[]
  // この食品を材料に使う料理（料理のページがあるもの。その食品の量の多い順）
  dishes: { id: string; name: string; path: string; grams: number; kcal: number }[]
  // 成分表での名前（「だいず ［納豆類］ 糸引き納豆」）
  official: string
}

// 成分の量（けた数はアプリと同じ）。値のない成分（成分表で未測定）は「—」
const amountOf = (key: NutrientKey, value: number | null): string => {
  if (value === null) return '—'
  const { digits } = nutrientInfo(key)
  return value.toLocaleString('ja-JP', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}
const percentText = (p: number) => (p >= 10 ? Math.round(p).toLocaleString('ja-JP') : String(Number(p.toFixed(1))))
// 表では「食塩」を、成分表示と同じ「食塩相当量」と書く
const rowLabel = (r: DetailRow) => (r.key === 'salt' ? '食塩相当量' : r.label)
const gramsText = (g: number) => `${g}g`
// かっこの中に書くときの量：「1パック45g」（かっこを重ねない）
const sizeText = (s: Serving) => (s.label === gramsText(s.grams) ? s.label : `${s.label}${s.grams}g`)

function groupsFor(food: Food, grams: number, catalog: Pick<Catalog, 'foods'>): DetailGroup[] {
  const totals = itemTotals({ uid: '', kind: 'food', refId: food.id, portion: grams }, { foods: catalog.foods, dishes: new Map(), products: new Map(), myDishes: new Map() })
  // 食材にアルコールの行は出さない（料理のページと同じ26成分にそろえる）
  return detailGroups(totals, DEFAULT_TARGETS, 'blank').map((g) => ({ ...g, rows: g.rows.filter((r) => r.key !== 'alcohol') }))
}

const rowsByKey = (groups: DetailGroup[]) => new Map(groups.flatMap((g) => g.rows).map((r) => [r.key, r] as const))

export function foodPageData(foodId: string, catalog: Pick<Catalog, 'foods'>, dishPages: DishPageData[] = []): FoodPageData | null {
  const food = catalog.foods.get(foodId)
  const copy = FOOD_COPY[foodId]
  const path = foodPagePath(foodId)
  const info = copy && RANKING_NUTRIENTS.find((n) => n.key === copy.focus)
  if (!food || !copy || !path || !info) return null
  const serving = servingFor(food)
  const groups = groupsFor(food, serving.grams, catalog)
  const servingRows = rowsByKey(groups)
  const per100 = rowsByKey(groupsFor(food, 100, catalog))
  const kcalOf = (rows: Map<NutrientKey, DetailRow>) => Math.round(rows.get('energyKcal')?.amount ?? 0)
  const servingAmount: FoodAmount = { grams: serving.grams, text: servingText(serving), kcal: kcalOf(servingRows) }
  const hundred: FoodAmount = { grams: 100, text: '100g', kcal: kcalOf(per100) }
  // ふだんの単位のない食品（「1食分」）は、100gを先に答える。1食分がちょうど100gの食品は、1食分だけ
  const leadWith100 = serving.label === '1食分' && serving.grams !== 100
  const ratio = pfcRatio(Object.fromEntries([...servingRows].map(([k, r]) => [k, r.amount ?? 0])) as Record<NutrientKey, number>)
  const per100g = (f: Food, key: NutrientKey) => amountOf(key, f.per100g[key])
  return {
    food,
    path,
    copy,
    serving,
    lead: leadWith100 ? hundred : servingAmount,
    other: leadWith100 ? servingAmount : hundred,
    focus: { key: copy.focus, label: info.label, unit: info.unit },
    groups,
    per100,
    pfc: ratio && { p: Math.round(ratio.p), f: Math.round(ratio.f), c: Math.round(ratio.c) },
    rich: RICH_KEYS.flatMap((key) => {
      const row = servingRows.get(key)
      const name = NUTRIENT_COPY[key]?.name
      const to = nutrientPagePath(key)
      if (!row || row.amount === null || row.percent === null || row.kind !== 'target' || !name || !to) return []
      const percent = Math.round(row.percent)
      return percent >= RICH_MIN_PERCENT ? [{ key, name, path: to, amount: `${amountOf(key, row.amount)} ${row.unit}`, percent }] : []
    })
      .sort((a, b) => b.percent - a.percent)
      .slice(0, RICH_MAX),
    related:
      copy.related.length === 0
        ? []
        : [{ id: food.id, label: undefined }, ...copy.related].flatMap(({ id, label }) => {
            const f = catalog.foods.get(id)
            return f ? [{ id, name: label ?? f.displayName, kcal: per100g(f, 'energyKcal'), focus: per100g(f, copy.focus), self: id === food.id }] : []
          }),
    dishes: dishPages
      .flatMap((d) => {
        const grams = d.dish.ingredients.filter((i) => i.foodId === foodId).reduce((sum, i) => sum + i.grams, 0)
        return grams > 0 ? [{ id: d.dish.id, name: d.dish.name, path: d.path, grams, kcal: d.kcal }] : []
      })
      .sort((a, b) => b.grams - a.grams || a.id.localeCompare(b.id))
      .slice(0, DISH_MAX),
    official: food.name.replace(/[　 ]+/g, ' ').trim(),
  }
}

// 並び順は、アプリの「定番の食品」と同じ（routes.ts の FOOD_PAGE_IDS の順）
export const foodPagesFor = (catalog: Pick<Catalog, 'foods'>, dishPages: DishPageData[] = []): FoodPageData[] =>
  FOOD_PAGE_IDS.flatMap((id) => foodPageData(id, catalog, dishPages) ?? [])

const focusAmount = (d: FoodPageData, a: FoodAmount) => {
  const row = a.grams === 100 ? d.per100.get(d.focus.key) : rowsByKey(d.groups).get(d.focus.key)
  return `${d.focus.label}${amountOf(d.focus.key, row?.amount ?? null)}${d.focus.unit}`
}

// 見出し：「納豆1パック（45g）のカロリーとたんぱく質」「鶏むね肉（皮なし）100gのカロリーとたんぱく質」
export const foodPageHeading = (d: FoodPageData) => `${d.food.displayName}${d.lead.text}のカロリーと${d.focus.label}`
export const foodPageTitle = (d: FoodPageData) => `${foodPageHeading(d)}｜${SITE_NAME}`

// はじめの文：「納豆のみなら、1パック（45g）で83kcal、たんぱく質7.4gです。」
export const foodLeadText = (d: FoodPageData) => `${d.food.displayName}のみなら、${d.lead.text}で${d.lead.kcal}kcal、${focusAmount(d, d.lead)}です。`
const foodOtherText = (d: FoodPageData) => (d.other.grams === d.lead.grams ? '' : `${d.other.grams === 100 ? '100gあたり' : d.other.text}では${d.other.kcal}kcal、${focusAmount(d, d.other)}です。`)

export function foodPageDescription(d: FoodPageData): string {
  return `${foodLeadText(d)}${foodOtherText(d)}ビタミン・ミネラルなど${NUTRIENT_COUNT}成分の量と、1日の目安に対する割合をまとめました。食べた量での計算や、1日の食事に入れて栄養バランスを見ることもできます。`
}

// 共有の画像。数字は、タイトルで先に答える量（1食分か100g）のもの
export function foodOgCard(d: FoodPageData): { card: OgCard; alt: string } {
  const rows = d.lead.grams === 100 ? d.per100 : rowsByKey(d.groups)
  const g = (key: NutrientKey) => amountOf(key, rows.get(key)?.amount ?? null)
  return {
    card: {
      title: `${d.food.displayName}のカロリーと${d.focus.label}`,
      badge: `${d.lead.text} ${d.lead.kcal} kcal`,
      sub: `たんぱく質 ${g('protein')} g・脂質 ${g('fat')} g・炭水化物 ${g('carb')} g`,
      chips: [`${NUTRIENT_COUNT}成分`, d.serving.grams === 100 ? '1日の目安に対する割合' : '1食分と100g'],
      hero: foodImage(d.food),
    },
    alt: `${d.food.displayName}のカロリーと${d.focus.label}。${d.lead.text}で${d.lead.kcal}kcal、たんぱく質${g('protein')}g、脂質${g('fat')}g、炭水化物${g('carb')}g`,
  }
}

// パンくずでの、アプリの「食品を調べる」の呼び名（上のメニューと同じ）
export const FOODS_CRUMB = '食品を調べる'

// アプリへのボタン
const CALC_LABEL = '食べた量で計算する'
const ADD_LABEL = 'この食品を1日の食事に入れる'

const JUMP = 'inline-flex min-h-9 items-center rounded-full bg-cream px-3 text-xs font-bold text-coral-ink'

// 1食分と100gの成分の表（26成分）。右の列は、1食分で、1日の目安（とりたい成分）か上限（とりすぎに気をつけたい成分）に対する割合
function NutrientTable({ d }: { d: FoodPageData }) {
  const rows = d.groups.flatMap((g) => g.rows)
  const names = (list: DetailRow[]) => list.map(rowLabel).join('・')
  const upper = rows.filter((r) => r.kind === 'max')
  const noRef = rows.filter((r) => r.kind === null)
  const blank = rows.some((r) => r.amount === null)
  const serving = servingText(d.serving)
  const same = d.serving.grams === 100
  return (
    <>
      <table className="w-full table-fixed text-sm">
        <caption className="sr-only">
          {d.food.displayName}の栄養成分（{NUTRIENT_COUNT}成分）。{same ? serving : `${serving}と100g`}の量と、1日の目安に対する割合
        </caption>
        <thead>
          <tr className="align-bottom text-xs text-ink-soft">
            <th scope="col" className="py-1.5 text-left font-normal sm:w-44">
              成分
            </th>
            <th scope="col" className="w-[4.25rem] py-1.5 text-right leading-tight font-normal sm:w-28">
              {d.serving.label}
              {d.serving.label !== gramsText(d.serving.grams) && <span className="block">（{gramsText(d.serving.grams)}）</span>}
            </th>
            {!same && (
              <th scope="col" className="w-[3.75rem] py-1.5 text-right font-normal sm:w-24">
                100g
              </th>
            )}
            <th scope="col" className="w-[5.25rem] py-1.5 text-right leading-tight font-normal sm:w-auto">
              1日の目安に<span className="inline-block">対する割合</span>
            </th>
          </tr>
        </thead>
        {d.groups.map((g) => (
          <tbody key={g.label}>
            <tr>
              <th scope="rowgroup" colSpan={same ? 3 : 4} className="pt-3 pb-1 text-left text-xs font-bold text-coral-ink">
                {g.label}
              </th>
            </tr>
            {g.rows.map((r) => {
              const over = r.kind === 'max' && r.percent !== null && r.percent >= 100
              return (
                <tr key={r.key} className="border-t border-ink/5">
                  <th scope="row" className="py-1.5 pr-1 text-left leading-snug font-normal">
                    {rowLabel(r)}
                    <span className="text-xs text-ink-soft"> {r.unit}</span>
                  </th>
                  <td className="py-1.5 text-right whitespace-nowrap tabular-nums">
                    <strong>{amountOf(r.key, r.amount)}</strong>
                  </td>
                  {!same && <td className="py-1.5 text-right whitespace-nowrap tabular-nums">{amountOf(r.key, d.per100.get(r.key)?.amount ?? null)}</td>}
                  <td className="py-1.5 pl-2 sm:pl-4">
                    {r.percent === null ? (
                      <span className="block text-right text-xs text-ink-soft">—</span>
                    ) : (
                      <span className="flex items-center justify-end gap-2">
                        <span className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10 sm:block" aria-hidden>
                          {r.percent >= 2.5 && <span className={`block h-full rounded-full ${over ? 'bg-alert' : r.kind === 'max' ? 'bg-caution' : 'bg-ok'} ${barWidth(r.percent / 100)}`} />}
                        </span>
                        <span className="shrink-0 text-right text-xs whitespace-nowrap text-ink-soft tabular-nums sm:w-[5.25rem]">
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
        割合は、{serving}を食べたときの、{DEFAULT_PROFILE_LABEL}（ふだんの活動量がふつうの人）の1日の目安に対するものです。目安は厚生労働省「日本人の食事摂取基準（2025年版）」の推奨量・目安量・目標量です。
        {upper.length > 0 && `${names(upper)}は、この量までにしたい上限に対する割合です。`}
        {noRef.length > 0 && `${names(noRef)}は、1日の量の目安がないので「—」としています。`}
        {blank && '量の「—」は、成分表に値のない成分です（0 ではありません）。'}
      </p>
    </>
  )
}

export function FoodPage({ data: d, others }: { data: FoodPageData; others: FoodPageData[] }) {
  const { food } = d
  const rows = rowsByKey(d.groups)
  const tiles: { key: NutrientKey; label: string }[] = [
    { key: 'energyKcal', label: 'エネルギー' },
    { key: 'protein', label: 'たんぱく質' },
    { key: 'fat', label: '脂質' },
    { key: 'carb', label: '炭水化物' },
    { key: 'fiber', label: '食物繊維' },
    { key: 'salt', label: '食塩相当量' },
  ]
  const same = d.serving.grams === 100
  const serving = servingText(d.serving)
  return (
    <StaticLayout section="foods" cta={{ href: foodAddPath(food.id), label: ADD_LABEL }} crumbs={[{ name: SITE_NAME, path: '/' }, { name: FOODS_CRUMB, path: VIEW_PATH.foods }, { name: food.displayName }]}>
      <article className="space-y-4">
        <header className={`${CARD} flex flex-col gap-4 sm:flex-row sm:items-center`}>
          <img src={foodImage(food)} alt="" width={144} height={144} className="h-28 w-28 shrink-0 self-center sm:h-36 sm:w-36" />
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-bold text-coral-ink">食材・{FOOD_GROUP_LABEL[food.group]}</p>
            <h1 className="text-2xl leading-snug font-bold">
              {food.displayName}
              <span className="inline-block">{d.lead.text}の</span>
              <span className="inline-block">カロリーと{d.focus.label}</span>
            </h1>
            <p className="text-sm leading-relaxed">
              <strong>{foodLeadText(d)}</strong>
              {foodOtherText(d)}ビタミン・ミネラルなど{NUTRIENT_COUNT}成分の量と、1日の目安に対する割合をまとめました。
            </p>
            <p className="flex flex-wrap gap-2">
              <a href={foodAppPath(food.id)} className={BUTTON}>
                {CALC_LABEL}
              </a>
              <a href={foodAddPath(food.id)} className={BUTTON_SUB}>
                {ADD_LABEL}
              </a>
            </p>
            <p className="flex flex-wrap gap-2">
              <a href="#nutrition" className={JUMP}>
                {same ? `${serving}の栄養` : '1食分と100gの栄養'}
              </a>
              <a href="#about-values" className={JUMP}>
                この値について
              </a>
              {d.dishes.length > 0 && (
                <a href="#dishes" className={JUMP}>
                  使う料理
                </a>
              )}
            </p>
          </div>
        </header>

        <section className={CARD} aria-labelledby="nutrition">
          <h2 id="nutrition" className="mb-2 scroll-mt-4 text-lg font-bold">
            {food.displayName}の栄養<span className="inline-block">（{same ? sizeText(d.serving) : `${sizeText(d.serving)}・100g`}）</span>
          </h2>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {tiles.map((t) => {
              const unit = rows.get(t.key)?.unit ?? ''
              return (
                <div key={t.key} className="rounded-xl bg-cream px-3 py-2">
                  <dt className="text-xs text-ink-soft">{t.label}</dt>
                  <dd className="text-base font-bold tabular-nums">
                    {amountOf(t.key, rows.get(t.key)?.amount ?? null)} {unit}
                    {!same && (
                      <span className="block text-xs font-normal text-ink-soft">
                        100gで {amountOf(t.key, d.per100.get(t.key)?.amount ?? null)} {unit}
                      </span>
                    )}
                  </dd>
                </div>
              )
            })}
          </dl>
          {!same && <p className="mt-2 text-xs leading-relaxed text-ink-soft">大きい字は{serving}、小さい字は100gの量です。</p>}
          {d.pfc && (
            <p className="mt-2 text-sm leading-relaxed">
              エネルギーの内訳（PFCバランス）は、たんぱく質 {d.pfc.p}%・脂質 {d.pfc.f}%・炭水化物 {d.pfc.c}% です。
            </p>
          )}
          {d.rich.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-bold">
                {serving}で<span className="inline-block">多くとれる栄養素</span>
              </h3>
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
            <a href={foodAppPath(food.id)} className={BUTTON_SUB}>
              {CALC_LABEL}
            </a>
            <a href={NUTRIENTS_INDEX_PATH} className={`${LINK} text-sm`}>
              成分ごとの、多い食べ物のランキングを見る
            </a>
          </p>
        </section>

        <section className={CARD} aria-labelledby="about-values">
          <h2 id="about-values" className="mb-2 scroll-mt-4 text-lg font-bold">
            この値について
          </h2>
          <div className="space-y-2 text-sm leading-relaxed">
            <p>{d.copy.note}</p>
            <p>
              出典は、文部科学省「日本食品標準成分表（八訂）増補2023年」の「{d.official}」（食品番号 {food.id}）です。品種や季節、作り方で変わるので、目安として見てください。
            </p>
            {!same && <p className="text-xs text-ink-soft">{SERVING_NOTE}</p>}
          </div>
          {d.related.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-bold">
                状態や種類でくらべる<span className="inline-block">（100gあたり）</span>
              </h3>
              <table className="mt-1 w-full text-sm">
                <caption className="sr-only">
                  {food.displayName}と、状態や種類のちがう食品の、100gあたりのカロリーと{d.focus.label}
                </caption>
                <thead>
                  <tr className="text-xs text-ink-soft">
                    <th scope="col" className="py-1.5 text-left font-normal">
                      食品
                    </th>
                    <th scope="col" className="py-1.5 pl-2 text-right font-normal whitespace-nowrap">
                      カロリー
                    </th>
                    <th scope="col" className="py-1.5 pl-2 text-right font-normal whitespace-nowrap">
                      {d.focus.label}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {d.related.map((r) => (
                    <tr key={r.id} className="border-t border-ink/5">
                      <th scope="row" className={`py-1.5 pr-1 text-left leading-snug ${r.self ? 'font-bold' : 'font-normal'}`}>
                        {r.name}
                        {r.self && <span className="inline-block text-xs font-normal text-ink-soft">（このページ）</span>}
                      </th>
                      <td className="py-1.5 pl-2 text-right whitespace-nowrap tabular-nums">
                        {r.kcal}
                        <span className="text-xs text-ink-soft"> kcal</span>
                      </td>
                      <td className="py-1.5 pl-2 text-right whitespace-nowrap tabular-nums">
                        {r.focus}
                        <span className="text-xs text-ink-soft"> {d.focus.unit}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                ほかの食品も、<a href={VIEW_PATH.foods} className={LINK}>
                  食品を調べる
                </a>
                から名前でさがして、同じように見られます。
              </p>
            </>
          )}
        </section>

        {d.dishes.length > 0 && (
          <section className={CARD} aria-labelledby="dishes">
            <h2 id="dishes" className="mb-2 scroll-mt-4 text-lg font-bold">
              {food.displayName}を使う料理
            </h2>
            <ul className="divide-y divide-ink/5 text-sm">
              {d.dishes.map((dish) => (
                <li key={dish.id} className="flex min-h-11 flex-wrap items-center justify-between gap-x-3">
                  <a href={dish.path} className={LINK}>
                    {dish.name}
                  </a>
                  <span className="ml-auto text-right text-xs text-ink-soft tabular-nums">
                    1人前 {dish.kcal} kcal・{food.displayName} {gramsText(Number(dish.grams.toFixed(1)))}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">料理の名前から、1人前のカロリー・栄養と作り方を見られます。</p>
          </section>
        )}

        {others.length > 0 && (
          <nav className={CARD} aria-labelledby="other-foods">
            <h2 id="other-foods" className="mb-2 text-base font-bold">
              ほかの定番の食品
            </h2>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {others.map((o) => (
                <li key={o.food.id}>
                  <a href={o.path} className={`${LINK} inline-flex min-h-11 items-center`}>
                    {o.food.displayName}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </article>
    </StaticLayout>
  )
}
