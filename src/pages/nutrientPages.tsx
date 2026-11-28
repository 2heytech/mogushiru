import { Fragment, type ReactNode } from 'react'
import { foodImage } from '../components/illustration'
import { AD_NOTICE, AdMark, RakutenShelf, SHELF_ID } from '../components/RakutenShelf'
import type { Catalog } from '../domain/nutrition'
import {
  dailyReference,
  familiarFoodIds,
  FOOD_GROUP_LABEL,
  formatAmount as fmt,
  NUTRIENT_GROUPS,
  RANKING_NUTRIENTS,
  rankFoods,
  type PriceTable,
  type RankingMetric,
  type RankingNutrient,
  type RankingRow,
} from '../domain/ranking'
import { SERVING_NOTE } from '../domain/serving'
import { computeTargets, DEFAULT_PROFILE, type Targets } from '../domain/targets'
import type { Food, NutrientKey, Sex } from '../domain/types'
import { foodPagePath, nutrientPagePath, NUTRIENTS_INDEX_PATH, rankingAppPath, SITE_NAME, VIEW_PATH } from '../routes'
import type { DishPageData } from './dishPages'
import { NUTRIENT_COPY, type NutrientCopy } from './nutrientCopy'
import type { OgCard } from './ogCard'
import { rakutenApi, shopSection, type RakutenApi, type ShopSection } from './rakuten'
import { barWidth, BUTTON, BUTTON_SUB, CALC_LABEL, CARD, LINK, StaticLayout } from './StaticLayout'

// 成分ごとのランキングのページ（/nutrients/<slug>/）と、その一覧（/nutrients/）。
// アプリの「ランキングを並べ替え」と同じ計算（よく使う食品だけ・1回の量はアプリの目安）で並べる

// 一覧のページの見出し。「食品成分ランキング」でさがす人の受け皿にする（パンくず・上のメニュー・フッターも同じ呼び名。routes.ts の READING_LINKS）
export const NUTRIENTS_INDEX_HEADING = '食品成分ランキング'

export const LIST_SIZE = 20
const SUB_LIST_SIZE = 10
// 食品の種類ごとの一覧：種類は6つまで、それぞれ上位5つ
const GROUP_MAX = 6
const GROUP_LIST_SIZE = 5
// この成分が多い料理の数
const DISH_LIST_SIZE = 10

// 1日の目安の表に出す年齢。食事摂取基準の区分の中ほどの年齢で計算する
const AGE_BANDS = [
  { label: '18〜29歳', age: 25 },
  { label: '30〜49歳', age: 35 },
  { label: '50〜64歳', age: 57 },
  { label: '65〜74歳', age: 70 },
] as const
const SEXES: { key: Sex; label: string }[] = [
  { key: 'female', label: '女性' },
  { key: 'male', label: '男性' },
]

export type NutrientPageData = {
  key: NutrientKey
  info: RankingNutrient
  copy: NutrientCopy
  path: string
  familiarCount: number
  // 並べる順。最初の一覧（lead）がページの主役で、ページのタイトル・説明文・共有の画像にも使う
  lists: { metric: RankingMetric; rows: RankingRow[] }[]
  // 100gあたりで1位の食品が、1回の量では何位か
  densest?: { food: Food; servingRank: number; servingGrams: number }
  // 身近な食品の「1回分の値段と、そこに入っている量」（100円あたりの一覧を先に出すページだけ）
  priceExamples: RankingRow[]
  // 食品の種類（野菜・果物・魚介など）ごとの上位。1回の量でくらべる
  groups: { group: string; rows: RankingRow[] }[]
  // この成分が多い料理（作り方のページがある料理。量は1人前）
  dishes: { id: string; name: string; path: string; category: string; amount: number }[]
  dishTotal: number
  // 楽天市場でさがす欄（広告）。その成分をおぎなうのに使われる商品の種類（プロテイン・サプリメントなど。rakuten.ts）。出さないページは null
  shop: ShopSection | null
  // 商品の例を、楽天市場商品検索 API で出すのに要る値（rakuten.ts）。なければ、前もって選んだ商品の画像か、文字のリンクだけ
  shopApi: RakutenApi | null
}

// いちばん上に出す一覧。たんぱく質は「安くとれる食品」をさがす人が多いので、100円あたりを先に出す。ほかの成分は1回の量から
const LEAD_METRIC: Partial<Record<NutrientKey, RankingMetric>> = { protein: 'per100yen' }
// 100円あたりの一覧の前に、文で値段を出す身近な食品（卵・納豆・木綿豆腐・牛乳の食品番号）
const PRICE_EXAMPLE_FOODS = ['12004', '04046', '04032', '13003']

const DEFAULT_TARGETS = computeTargets(DEFAULT_PROFILE)

// 食品の種類ごとの上位。「野菜で多いのは？」「果物では？」とさがす人のための一覧。
// その種類で3番めに多い食品の量を「その種類の多さ」として、多い種類から並べる（1品だけ飛びぬけて多い種類が上に来ないように）。
// いちばん多い種類の2割に届かない種類は出さない。2種類に満たないとき（カフェインは飲み物だけ）は、この一覧を出さない
function groupLists(serving: RankingRow[]): NutrientPageData['groups'] {
  const byGroup = new Map<string, RankingRow[]>()
  for (const r of serving) {
    const rows = byGroup.get(r.food.group)
    if (rows) rows.push(r)
    else byGroup.set(r.food.group, [r])
  }
  const scored = [...byGroup]
    .filter(([, rows]) => rows.length >= 3)
    .map(([group, rows]) => ({ group, rows: rows.slice(0, GROUP_LIST_SIZE), score: rows[2].value }))
    .sort((a, b) => b.score - a.score || a.group.localeCompare(b.group))
  const best = scored[0]?.score ?? 0
  const out = scored.filter((g) => g.score >= best * 0.2).slice(0, GROUP_MAX)
  return out.length >= 2 ? out.map(({ group, rows }) => ({ group, rows })) : []
}

// この成分が多い料理（1人前）。5品に満たないときは出さない
function dishList(key: NutrientKey, dishPages: DishPageData[]): NutrientPageData['dishes'] {
  const rows = dishPages
    .flatMap((d) => {
      const amount = d.dish.nutrients[key]
      return amount !== null && amount > 0 ? [{ id: d.dish.id, name: d.dish.name, path: d.path, category: d.category, amount }] : []
    })
    .sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id))
  return rows.length >= 5 ? rows.slice(0, DISH_LIST_SIZE) : []
}

// ページに使う計算をまとめてする（ページの文と、ページの説明文の両方で使う）
export function nutrientPageData(key: NutrientKey, catalog: Pick<Catalog, 'foods' | 'dishes'>, prices: PriceTable, dishPages: DishPageData[] = []): NutrientPageData | null {
  const info = RANKING_NUTRIENTS.find((n) => n.key === key)
  const copy = NUTRIENT_COPY[key]
  const path = nutrientPagePath(key)
  if (!info || !copy || !path) return null
  const familiar = familiarFoodIds(catalog)
  const foods = [...catalog.foods.values()].filter((f) => familiar.has(f.id))
  const rank = (metric: RankingMetric) => rankFoods(foods, { nutrient: key, metric, prices })
  const serving = rank('serving')
  const per100g = rank('per100g')
  // カロリーあたり・価格あたりは「とりたい成分」だけ（食塩やカフェインを安くたくさん、は意味がないので）
  const wanted = !info.caution && key !== 'energyKcal'
  const perYen = wanted && prices.size > 0 ? rank('per100yen') : []
  const lead = perYen.length > 0 && LEAD_METRIC[key] === 'per100yen' ? 'per100yen' : 'serving'
  const lists: NutrientPageData['lists'] = [
    { metric: 'serving', rows: serving.slice(0, LIST_SIZE) },
    { metric: 'per100g', rows: per100g.slice(0, LIST_SIZE) },
  ]
  if (wanted) lists.push({ metric: 'per100kcal', rows: rank('per100kcal').slice(0, SUB_LIST_SIZE) })
  if (perYen.length > 0) {
    if (lead === 'per100yen') lists.unshift({ metric: 'per100yen', rows: perYen.slice(0, LIST_SIZE) })
    else lists.push({ metric: 'per100yen', rows: perYen.slice(0, SUB_LIST_SIZE) })
  }
  const top = per100g[0]
  const shop = shopSection(key)
  const servingRank = top ? serving.findIndex((r) => r.food.id === top.food.id) + 1 : 0
  return {
    key,
    info,
    copy,
    path,
    familiarCount: foods.length,
    lists: lists.filter((l) => l.rows.length > 0),
    densest: top && servingRank > 1 ? { food: top.food, servingRank, servingGrams: top.serving.grams } : undefined,
    priceExamples: lead === 'per100yen' ? PRICE_EXAMPLE_FOODS.flatMap((id) => perYen.find((r) => r.food.id === id) ?? []) : [],
    groups: groupLists(serving),
    dishes: dishList(key, dishPages),
    dishTotal: dishPages.length,
    // 欄を出す成分は rakuten.ts の表で決める（脂質・炭水化物や、とりすぎに気をつけたい成分のページには出さない）
    shop,
    shopApi: shop ? rakutenApi() : null,
  }
}

// 1回分の値段（円）。価格は100gあたりなので、1回の量に直す
const servingYen = (r: RankingRow) => (r.yenPer100g === undefined ? null : Math.round((r.yenPer100g * r.serving.grams) / 100))

// 「卵（生）1個（50g）は約29円で6.10g」
function priceExampleText(r: RankingRow, unit: string): string {
  return `${r.food.displayName}${r.serving.label}（${r.serving.grams}g）は約${servingYen(r)}円で${fmt(r.servingAmount)}${unit}`
}

// rich は「ビタミンCが多い」「カロリーが高い」
const LIST_TITLE: Record<RankingMetric, (rich: string) => string> = {
  serving: (rich) => `ふだん1回に食べる量で${rich}食品`,
  per100g: (rich) => `100gあたりで${rich}食品`,
  per100kcal: (rich) => `カロリーのわりに${rich}食品（100kcalあたり）`,
  per100yen: (rich) => `値段のわりに${rich}食品（100円あたり）`,
}
const LIST_HINT: Record<RankingMetric, string> = {
  serving: `${SERVING_NOTE}乾物や調味料のように一度にたくさん食べないものは下がります。`,
  per100g: '日本食品標準成分表の100gあたりの値です。乾物や調味料のように、ふだん少ししか使わないものも上に来ます。',
  per100kcal: 'カロリーをとりすぎずにとれる食品が上に来ます（100gあたり10kcal未満の食品は除きます）。',
  per100yen: '総務省「小売物価統計調査」の2025年平均の店頭価格をもとにした概算で、100円分に含まれる量でくらべます。実際の値段は店や時期で変わります。価格が分かる食品だけです（調味料は除きます）。',
}
// ページのタイトル・説明文・目次で使う短い呼び方
const METRIC_SHORT: Record<RankingMetric, string> = { serving: '1回の量', per100g: '100gあたり', per100kcal: '100kcalあたり', per100yen: '100円あたり' }
const METRIC_LONG: Record<RankingMetric, string> = { serving: 'ふだん1回に食べる量', per100g: '100gあたり', per100kcal: '100kcalあたり', per100yen: '100円あたり' }
// 検索結果に出るタイトルで使う呼び方。「1回の量」は、さがす人の言葉に近い「1食分」と書く
const METRIC_TITLE: Record<RankingMetric, string> = { serving: '1食分', per100g: '100gあたり', per100kcal: '100kcalあたり', per100yen: '100円あたり' }
const SUFFIX: Record<RankingMetric, string> = { serving: '/1回', per100g: '/100g', per100kcal: '/100kcal', per100yen: '/100円' }

// 種類ごとの一覧の見出しに使う呼び方（「ビタミンCが多い野菜」「カルシウムが多い牛乳・乳製品」）
const GROUP_HEADING: Record<string, string> = {
  '01': '穀類（ごはん・パン・めん）',
  // 「〜が多いいも」と「い」が続くと読みにくいので、漢字で書く
  '02': '芋（いも類）',
  '03': '砂糖・甘味料',
  '04': '豆・大豆製品',
  '05': 'ナッツ・種実',
  '06': '野菜',
  '07': '果物',
  '08': 'きのこ',
  '09': '海藻',
  '10': '魚介',
  '11': '肉',
  '12': '卵',
  '13': '牛乳・乳製品',
  '14': '油',
  '15': 'お菓子・菓子パン',
  '16': '飲み物',
  '17': '調味料',
  '18': 'そうざい・調理済みの食品',
}

// 目安の値は小数1けたまで（7.00 mg ではなく 7 mg、10.5 mg）
const fmtRef = (v: number) => (v >= 100 ? Math.round(v).toLocaleString() : String(Math.round(v * 10) / 10))

// 1日の目安（年齢・性別ごとの表の1マス）
function referenceText(key: NutrientKey, t: Targets, unit: string): { main: string; upper?: string } | null {
  const range = (r: { lo: number; hi: number }) => `${Math.round(r.lo)}〜${Math.round(r.hi)} ${unit}`
  switch (key) {
    case 'energyKcal':
      return { main: `${Math.round(t.energyKcal).toLocaleString()} ${unit}` }
    case 'protein':
      return { main: range(t.pfcGrams.p) }
    case 'fat':
      return { main: range(t.pfcGrams.f) }
    case 'carb':
      return { main: range(t.pfcGrams.c) }
    case 'fiber':
      return { main: `${fmtRef(t.fiberMin)} ${unit} 以上` }
    case 'salt':
      return { main: `${fmtRef(t.saltMax)} ${unit} 未満` }
    case 'satFat':
      return { main: `${fmtRef(t.satFatMaxG)} ${unit} 以下` }
  }
  const n = (t.nutrients as Partial<Record<NutrientKey, Targets['nutrients'][keyof Targets['nutrients']]>>)[key]
  if (!n || n.kind === 'none') return null
  if (n.kind === 'max') return { main: `${fmtRef(n.value)} ${unit} ${n.overAtLimit ? '未満' : 'まで'}` }
  return { main: `${fmtRef(n.value)} ${unit}`, upper: n.upper !== undefined ? `上限 ${fmtRef(n.upper)} ${unit}` : undefined }
}

function referenceBasis(key: NutrientKey): string | null {
  switch (key) {
    case 'energyKcal':
      return '推定エネルギー必要量'
    case 'protein':
    case 'fat':
    case 'carb':
      return '目標量（エネルギーに対する割合を g に直した値）'
    case 'fiber':
    case 'salt':
    case 'satFat':
      return '目標量'
  }
  const n = (DEFAULT_TARGETS.nutrients as Partial<Record<NutrientKey, Targets['nutrients'][keyof Targets['nutrients']]>>)[key]
  if (!n || n.kind === 'none') return null
  return n.basis
}

function ReferenceTable({ data }: { data: NutrientPageData }) {
  const { key, info, copy } = data
  const basis = referenceBasis(key)
  if (!basis) {
    return (
      <section aria-labelledby="reference" className={`${CARD} scroll-mt-4`}>
        <h2 id="reference" className="text-lg font-bold">
          {copy.name}の1日の摂取量の目安
        </h2>
        <p className="mt-1 text-sm leading-relaxed">{copy.name}には、厚生労働省「日本人の食事摂取基準（2025年版）」に1日の目安の量がありません。</p>
      </section>
    )
  }
  const cells = AGE_BANDS.map((band) => ({
    band,
    bySex: SEXES.map((s) => referenceText(key, computeTargets({ sex: s.key, age: band.age, activity: 'normal' }), info.unit)),
  }))
  const supplementOnly = (DEFAULT_TARGETS.nutrients as Partial<Record<NutrientKey, { upperScope?: string }>>)[key]?.upperScope === 'supplement'
  return (
    <section aria-labelledby="reference" className={`${CARD} scroll-mt-4`}>
      <h2 id="reference" className="text-lg font-bold">
        {copy.name}の{key === 'caffeine' ? '1日の上限の目安' : '1日の摂取量の目安'}
        <span className="ml-2 text-sm font-normal text-ink-soft">（{basis}）</span>
      </h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[18rem] text-sm tabular-nums">
          <thead>
            <tr className="border-b border-ink/10 text-left text-xs text-ink-soft">
              <th scope="col" className="py-1.5 pr-3 font-normal">
                年齢
              </th>
              {SEXES.map((s) => (
                <th key={s.key} scope="col" className="py-1.5 pr-3 font-normal">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cells.map(({ band, bySex }) => (
              <tr key={band.label} className="border-b border-ink/5 last:border-0">
                <th scope="row" className="py-1.5 pr-3 text-left font-normal text-ink-soft">
                  {band.label}
                </th>
                {bySex.map((c, i) => (
                  <td key={SEXES[i].key} className="py-1.5 pr-3">
                    <span className="font-bold">{c?.main ?? '—'}</span>
                    {c?.upper && <span className="block text-xs text-ink-soft">{c.upper}</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-2 space-y-0.5 text-xs leading-relaxed text-ink-soft">
        {key === 'caffeine' ? (
          <li>農林水産省「カフェインの過剰摂取について」で紹介されている、欧州食品安全機関などの健康な大人の目安です。妊娠中の人や子どもは、これより少ない目安が示されています。</li>
        ) : (
          <>
            <li>
              厚生労働省「日本人の食事摂取基準（2025年版）」をもとに、モグシルで計算した値です。身体活動は「ふつう」、体重は年齢・性別ごとの参照体重です。
            </li>
            {key === 'iron' && <li>女性は、50歳未満を月経あり、50歳以上を月経なしとして計算しています。</li>}
            {supplementOnly && <li>上限は、サプリメントなど通常の食品以外からとる量にかかります。</li>}
            <li>
              <a href={VIEW_PATH.menu} className={LINK}>
                栄養バランスの計算
              </a>
              で年齢・性別・身長・体重・ふだんの運動を入れると、自分の目安で見られます。
            </li>
          </>
        )}
      </ul>
    </section>
  )
}

// ランキングに出す食品の名前。食品のページ（/foods/natto/ など。定番の食品だけ）があるものは、そこへのふつうのリンクにする
function FoodName({ food }: { food: Food }) {
  const to = foodPagePath(food.id)
  if (!to) return <>{food.displayName}</>
  return (
    <a href={to} className="underline decoration-coral/60 underline-offset-2 hover:decoration-coral-ink">
      {food.displayName}
    </a>
  )
}

function RankingList({ data, metric, rows }: { data: NutrientPageData; metric: RankingMetric; rows: RankingRow[] }) {
  const { info, copy } = data
  const ref = dailyReference(data.key, DEFAULT_TARGETS)
  const top = rows[0]?.value ?? 1
  const id = `list-${metric}`
  return (
    <section aria-labelledby={id} className="scroll-mt-4 space-y-2">
      <h2 id={id} className="text-lg font-bold">
        {LIST_TITLE[metric](copy.rich)}
      </h2>
      <p className="text-xs leading-relaxed text-ink-soft">
        {LIST_HINT[metric]}
        {metric === 'serving' && ref && `％は30〜49歳女性の${ref.kind === 'max' ? '1日の上限' : '1日の目安'}（${fmtRef(ref.value)}${info.unit}）に対する割合です。`}
      </p>
      <ol className="space-y-2">
        {rows.map((r, i) => {
          const pct = metric === 'serving' && ref ? (r.servingAmount / ref.value) * 100 : null
          return (
            <li key={r.food.id} className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 shadow-sm">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${i < 3 ? 'bg-coral text-ink-strong' : 'bg-cream text-ink-soft'}`}>{i + 1}</span>
              <img src={foodImage(r.food)} alt="" width={32} height={32} loading="lazy" className="hidden h-8 w-8 shrink-0 sm:block" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="min-w-0 font-bold leading-snug" title={r.food.name.replace(/　/g, ' ')}>
                    <FoodName food={r.food} />
                  </p>
                  <p className="shrink-0 text-sm tabular-nums">
                    <strong>{fmt(r.value)}</strong>
                    <span className="text-xs text-ink-soft">
                      {' '}
                      {info.unit}
                      {SUFFIX[metric]}
                    </span>
                  </p>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-cream">
                  <div className={`h-full rounded-full ${info.caution ? 'bg-caution' : 'bg-ok'} ${barWidth(r.value / top)}`} />
                </div>
                <p className="mt-1 text-xs text-ink-soft">
                  {FOOD_GROUP_LABEL[r.food.group]}・1回 {r.serving.grams}g「{r.serving.label}」
                  {metric !== 'serving' && (
                    <>
                      で {fmt(r.servingAmount)}
                      {info.unit}
                    </>
                  )}
                  {pct !== null && (
                    <>
                      ・{ref?.kind === 'max' ? '上限' : '目安'}の {pct >= 10 ? Math.round(pct) : pct.toFixed(1)}%
                    </>
                  )}
                  {metric === 'per100yen' && r.yenPer100g !== undefined && (
                    <>
                      ・約{servingYen(r)}円（100gで約{Math.round(r.yenPer100g)}円）
                    </>
                  )}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

// 上位の食品の種類（食品群）を多い順に3つ
function topGroups(rows: RankingRow[]): string {
  const count = new Map<string, number>()
  for (const r of rows) count.set(r.food.group, (count.get(r.food.group) ?? 0) + 1)
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([g, n]) => `${FOOD_GROUP_LABEL[g]}（${n}品）`)
    .join('・')
}

// 一覧の並べ方を、出す順に「・」でつなぐ（「100円あたり・ふだん1回に食べる量・100gあたり」）
const metricsText = (data: NutrientPageData, labels: Record<RankingMetric, string>, limit = 3) =>
  data.lists
    .slice(0, limit)
    .map((l) => labels[l.metric])
    .join('・')

// 検索結果に出るタイトル。はじめに「〜が多い食べ物ランキング」（さがす人の言葉。ページの見出しと同じ）、次に、ここならではのくらべ方。
// Google は最初の「｜」より後ろを落としたり途中で切ったりするので、30字前後に収める（サイトの名前は入れない。検索結果では別の行に出る）。
// くらべ方は「1食分」と、もう1つ：100円あたりの一覧を先に出すページ（たんぱく質）は「100円あたり」、ほかは「100gあたり」
export function nutrientPageTitle(data: NutrientPageData): string {
  const other = data.lists.find((l) => l.metric !== 'serving')?.metric ?? 'per100g'
  return `${data.copy.heading}｜${METRIC_TITLE.serving}・${METRIC_TITLE[other]}で比較`
}

// 検索結果に出る説明文。はじめの60字ほどしか出ないことも多いので、上位3つの名前と量を先に書く
export function nutrientPageDescription(data: NutrientPageData): string {
  const { copy, info } = data
  const what = copy.heading.replace(/ランキング$/, '')
  if (data.priceExamples.length > 0) {
    const examples = data.priceExamples
      .slice(0, 2)
      .map((r) => priceExampleText(r, info.unit))
      .join('、')
    return `${what}を、${metricsText(data, METRIC_LONG)}でくらべたランキング。${examples}。価格は小売物価統計調査の2025年平均をもとにした概算です。年齢・性別ごとの1日の摂取量の目安つき。`
  }
  const serving = data.lists.find((l) => l.metric === 'serving')?.rows ?? []
  const top = serving
    .slice(0, 3)
    .map((r, i) => `${i + 1}位 ${r.food.displayName} ${fmt(r.value)}${info.unit}`)
    .join('、')
  const groups = data.groups
    .slice(0, 3)
    .map((g) => FOOD_GROUP_LABEL[g.group])
    .join('・')
  return `${copy.heading}。ふだん1回に食べる量では、${top}。100gあたりの順位${groups && `、${groups}など種類べつの上位`}、年齢・性別ごとの1日の摂取量の目安も、日本食品標準成分表の値で見られます。`
}

// SNS などに貼ったときの画像：最初の一覧の上位3つ
export function nutrientOgCard(data: NutrientPageData): { card: OgCard; alt: string } {
  const lead = data.lists[0]
  const rows = lead.rows.slice(0, 3)
  const top = rows[0]?.value ?? 1
  const value = (r: RankingRow) => `${fmt(r.value)} ${data.info.unit}${SUFFIX[lead.metric]}`
  return {
    card: {
      title: data.copy.short,
      sub: `${METRIC_LONG[lead.metric]}でくらべる`,
      caution: Boolean(data.info.caution),
      rows: rows.map((r) => ({ name: r.food.displayName, value: value(r), ratio: r.value / top, image: foodImage(r.food) })),
    },
    alt: `${data.copy.short}（${METRIC_LONG[lead.metric]}）。${rows.map((r, i) => `${i + 1}位 ${r.food.displayName} ${value(r)}`).join('、')}`,
  }
}

// 食品の種類（野菜・果物・魚介など）ごとの上位
function GroupLists({ data }: { data: NutrientPageData }) {
  const { info, copy } = data
  return (
    <section aria-labelledby="by-group" className="scroll-mt-4 space-y-2">
      <h2 id="by-group" className="text-lg font-bold">
        食品の種類べつに見る、{copy.rich}食べ物
      </h2>
      <p className="text-xs leading-relaxed text-ink-soft">
        {data.groups.map((g) => FOOD_GROUP_LABEL[g.group]).join('・')}の種類ごとに、ふだん1回に食べる量で多い順の上位{GROUP_LIST_SIZE}品です。
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {data.groups.map((g) => (
          <div key={g.group} className="rounded-2xl bg-white px-4 py-3 shadow-sm">
            <h3 className="font-bold">
              {copy.rich}
              {GROUP_HEADING[g.group] ?? FOOD_GROUP_LABEL[g.group]}
            </h3>
            <ol className="mt-1 divide-y divide-ink/5 text-sm">
              {g.rows.map((r, i) => (
                <li key={r.food.id} className="flex items-baseline gap-2 py-1.5">
                  <span className="w-4 shrink-0 text-xs text-ink-soft tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1 leading-snug" title={r.food.name.replace(/　/g, ' ')}>
                    <FoodName food={r.food} />
                    <span className="block text-xs text-ink-soft">
                      {r.serving.label}（{r.serving.grams}g）
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    <strong>{fmt(r.value)}</strong>
                    <span className="text-xs text-ink-soft"> {info.unit}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  )
}

// この成分が多い料理。名前から、料理の作り方のページへ行ける
function DishList({ data }: { data: NutrientPageData }) {
  const { info, copy } = data
  return (
    <section aria-labelledby="dishes" className={`${CARD} scroll-mt-4`}>
      <h2 id="dishes" className="text-lg font-bold">
        {copy.rich}料理
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">
        ふだんの料理 {data.dishTotal} 品を、1人前の量でくらべた上位{data.dishes.length}品です。名前から、その料理のカロリー・栄養と作り方を見られます。
      </p>
      <ol className="mt-2 text-sm sm:columns-2 sm:gap-x-8">
        {data.dishes.map((d, i) => (
          <li key={d.id} className="flex min-h-11 break-inside-avoid items-center gap-2 border-b border-ink/5">
            <span className="w-5 shrink-0 text-xs text-ink-soft tabular-nums">{i + 1}</span>
            <span className="min-w-0 flex-1 leading-snug">
              <a href={d.path} className={LINK}>
                {d.name}
              </a>
              <span className="ml-1.5 text-xs text-ink-soft">{d.category}</span>
            </span>
            <span className="shrink-0 tabular-nums">
              <strong>{fmt(d.amount)}</strong>
              <span className="text-xs text-ink-soft"> {info.unit}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

// 目次での呼び名（欄は components/RakutenShelf.tsx）
const SHOP_LABEL = '楽天市場でさがす'

// 見出しを言葉のまとまりに分ける（「ビタミンCが多い」「食べ物・食品」「ランキング」）
function headingParts(copy: NutrientCopy): string[] {
  const tail = 'ランキング'
  if (!copy.heading.startsWith(copy.rich) || !copy.heading.endsWith(tail)) return [copy.heading]
  return [copy.rich, copy.heading.slice(copy.rich.length, -tail.length), tail].filter(Boolean)
}

export function NutrientPage({ data }: { data: NutrientPageData }) {
  const { key, info, copy, densest } = data
  const serving = data.lists.find((l) => l.metric === 'serving')?.rows ?? []
  const others = NUTRIENT_GROUPS.map((g) => ({ ...g, keys: g.keys.filter((k) => k !== key && NUTRIENT_COPY[k]) }))
  // ページの並び。さがしに来た人がまず見たいのはランキングなので、最初の一覧をいちばん上に置き、1日の目安の表はそのあとにする。
  // 種類べつの一覧は、同じ「1回の量」でくらべているので、1回の量の一覧のすぐあとに置く
  const sections: { id: string; label: string; node: ReactNode }[] = []
  data.lists.forEach((l, i) => {
    sections.push({ id: `list-${l.metric}`, label: METRIC_SHORT[l.metric], node: <RankingList data={data} metric={l.metric} rows={l.rows} /> })
    if (l.metric === 'serving' && data.groups.length > 0) sections.push({ id: 'by-group', label: '種類べつ', node: <GroupLists data={data} /> })
    // 楽天市場でさがす欄（広告）は、いちばん上の一覧（と種類べつ）のすぐあと、1日の目安の表の前に置く
    if (i === 0 && data.shop) sections.push({ id: SHELF_ID, label: SHOP_LABEL, node: <RakutenShelf shop={data.shop} name={copy.name} api={data.shopApi} /> })
    if (i === 0) sections.push({ id: 'reference', label: key === 'caffeine' ? '1日の上限の目安' : '1日の目安', node: <ReferenceTable data={data} /> })
  })
  if (data.dishes.length > 0) sections.push({ id: 'dishes', label: '料理', node: <DishList data={data} /> })
  return (
    <StaticLayout section="nutrients" crumbs={[{ name: SITE_NAME, path: '/' }, { name: NUTRIENTS_INDEX_HEADING, path: NUTRIENTS_INDEX_PATH }, { name: copy.name }]}>
      <article className="space-y-6">
        <header>
          {/* スマホで「ラ／ンキング」のように言葉の途中で折り返さないよう、言葉のまとまり（「ビタミンCが多い」「食べ物」「ランキング」）ごとに折り返す */}
          <h1 className="text-2xl leading-snug font-bold sm:text-3xl">
            {headingParts(copy).map((part) => (
              <span key={part} className="inline-block max-w-full">
                {part}
              </span>
            ))}
          </h1>
          {/* 広告のリンクがあるページは、開いてすぐ見えるところに、そのことを書く（ステルスマーケティングの規制） */}
          {data.shop && <p className="mt-1 text-xs text-ink-soft">{AD_NOTICE}</p>}
          <p className="mt-2 text-sm leading-relaxed">
            {copy.about}
            よく使う食品 {data.familiarCount.toLocaleString()} 品から、{copy.rich}
            {copy.things}を、{metricsText(data, METRIC_LONG)}でくらべて、多い順に並べました。「ふだん1回に食べる量」は、1食分の目安です。
          </p>
          {data.priceExamples.length > 0 && (
            <p className="mt-2 text-sm leading-relaxed">
              値段で見ると、{data.priceExamples.map((r) => priceExampleText(r, info.unit)).join('、')}
              です（価格は総務省「小売物価統計調査」の2025年平均をもとにした概算）。
            </p>
          )}
          {serving.length > 0 && (
            <p className="mt-2 text-sm leading-relaxed">
              1回に食べる量で多いのは、{serving
                .slice(0, 3)
                .map((r) => r.food.displayName)
                .join('、')}
              。上位{serving.length}品には{topGroups(serving)}が多く入っています。
              {densest && (
                <>
                  100gあたりで1位の{densest.food.displayName}は、1回の量（{densest.servingGrams}g）で見ると{densest.servingRank}位です。
                </>
              )}
            </p>
          )}
          <nav aria-label="このページの内容" className="mt-3">
            <ul className="flex flex-wrap gap-1.5">
              {sections.map((x) => (
                <li key={x.id}>
                  <a href={`#${x.id}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white px-3 text-sm shadow-sm hover:bg-cream">
                    {x.label}
                    {x.id === SHELF_ID && <AdMark />}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        {sections.map((x) => (
          <Fragment key={x.id}>{x.node}</Fragment>
        ))}

        <section aria-labelledby="more" className={`${CARD} space-y-3 bg-white/80`}>
          <h2 id="more" className="text-lg font-bold">
            モグシルでもっとくわしく
          </h2>
          <p className="text-sm leading-relaxed">
            「ランキングを並べ替え」では、食品の種類（魚介類・野菜類など）でしぼったり、成分表のすべての食品からさがしたりできます。「栄養バランスを計算」で料理を選べば、1日の{info.label}が目安に足りているかも分かります。登録はいりません。
          </p>
          <div className="flex flex-wrap gap-2">
            <a href={rankingAppPath(key)} className={BUTTON}>
              くらべ方や種類を変えて並べ替える
            </a>
            <a href={VIEW_PATH.menu} className={BUTTON_SUB}>
              {CALC_LABEL}
            </a>
          </div>
        </section>

        <section aria-labelledby="others" className="space-y-2">
          <h2 id="others" className="text-lg font-bold">
            ほかの成分のランキング
          </h2>
          {others.map((g) =>
            g.keys.length === 0 ? null : (
              <div key={g.label}>
                <p className="mb-1 text-xs text-ink-soft">{g.label}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {g.keys.map((k) => (
                    <li key={k}>
                      <a href={nutrientPagePath(k) ?? NUTRIENTS_INDEX_PATH} className="inline-flex min-h-9 items-center rounded-full bg-white px-3 text-sm shadow-sm hover:bg-cream">
                        {NUTRIENT_COPY[k]!.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )}
        </section>

        <p className="text-xs leading-relaxed text-ink-soft">
          値は文部科学省「日本食品標準成分表（八訂）増補2023年」をもとに計算しています。1日の目安は厚生労働省「日本人の食事摂取基準（2025年版）」をもとにしています。
          {data.lists.some((l) => l.metric === 'per100yen') && '価格は総務省「小売物価統計調査（動向編）」2025年平均をもとに、可食部100gあたりに直したものです。'}
          くわしくは
          <a href="/about/" className={LINK}>
            このサイトについて
          </a>
          をごらんください。
        </p>
      </article>
    </StaticLayout>
  )
}

// /nutrients/：26成分の一覧。それぞれ1回の量で多い食品の上位3つを添える
export function NutrientsIndexPage({ pages }: { pages: NutrientPageData[] }) {
  const byKey = new Map(pages.map((p) => [p.key, p]))
  return (
    <StaticLayout section="nutrients" crumbs={[{ name: SITE_NAME, path: '/' }, { name: NUTRIENTS_INDEX_HEADING }]}>
      <article className="space-y-6">
        <header>
          <h1 className="text-2xl leading-snug font-bold sm:text-3xl">
            <span className="inline-block">{NUTRIENTS_INDEX_HEADING}</span>
            <span className="inline-block text-lg font-bold text-ink-soft sm:text-xl">（成分別に多い食べ物・{pages.length}成分）</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed">
            食品成分ランキングです。たんぱく質・食物繊維・鉄分・カルシウム・ビタミンなど{pages.length}の成分について、多く含む食べ物・食材を、1食分（ふだん1回に食べる量）と100gあたりでくらべて、多い順に並べました。野菜・果物・魚介などの種類べつの上位、その成分が多い料理、年齢・性別ごとの1日の摂取量の目安もあわせて見られます。
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
            <a href={VIEW_PATH.ranking} className={BUTTON_SUB}>
              条件を変えて並べ替える
            </a>
            <span className="text-xs leading-relaxed text-ink-soft">成分・くらべ方（100kcalあたり・100円あたりなど）・食品の種類を選んで、成分表のすべての食品を並べ替えられます。</span>
          </p>
        </header>
        {NUTRIENT_GROUPS.map((g) => {
          const items = g.keys.flatMap((k) => byKey.get(k) ?? [])
          if (items.length === 0) return null
          return (
            <section key={g.label} aria-label={g.label} className="space-y-2">
              <h2 className="text-lg font-bold">{g.label}</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {items.map((p) => {
                  const top = p.lists.find((l) => l.metric === 'serving')?.rows.slice(0, 3) ?? []
                  return (
                    <li key={p.key}>
                      <a href={p.path} className="block h-full rounded-2xl bg-white px-4 py-3 shadow-sm hover:bg-white/70">
                        <span className="font-bold text-coral-ink">{p.copy.heading}</span>
                        {top.length > 0 && <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">1回の量で多い：{top.map((r) => r.food.displayName).join('・')}</span>}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
        <p className="text-xs leading-relaxed text-ink-soft">値は文部科学省「日本食品標準成分表（八訂）増補2023年」をもとに計算しています。</p>
      </article>
    </StaticLayout>
  )
}
