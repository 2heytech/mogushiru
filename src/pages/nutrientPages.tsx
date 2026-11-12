import { foodImage } from '../components/illustration'
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
import { computeTargets, DEFAULT_PROFILE, type Targets } from '../domain/targets'
import type { Food, NutrientKey, Sex } from '../domain/types'
import { nutrientPagePath, NUTRIENTS_INDEX_PATH, rankingAppPath } from '../routes'
import { NUTRIENT_COPY, type NutrientCopy } from './nutrientCopy'
import { BUTTON, BUTTON_SUB, CARD, LINK, StaticLayout } from './StaticLayout'

// 成分ごとのランキングのページ（/nutrients/<slug>/）と、その一覧（/nutrients/）。
// アプリの「食品成分ランキング」と同じ計算（よく使う食品だけ・1回の量はアプリの目安）で並べる

export const LIST_SIZE = 20
const SUB_LIST_SIZE = 10

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
  lists: { metric: RankingMetric; rows: RankingRow[] }[]
  // 100gあたりで1位の食品が、1回の量では何位か
  densest?: { food: Food; servingRank: number; servingGrams: number }
}

const DEFAULT_TARGETS = computeTargets(DEFAULT_PROFILE)

// ページに使う計算をまとめてする（ページの文と、ページの説明文の両方で使う）
export function nutrientPageData(key: NutrientKey, catalog: Pick<Catalog, 'foods' | 'dishes'>, prices: PriceTable): NutrientPageData | null {
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
  const lists: NutrientPageData['lists'] = [
    { metric: 'serving', rows: serving.slice(0, LIST_SIZE) },
    { metric: 'per100g', rows: per100g.slice(0, LIST_SIZE) },
  ]
  if (wanted) lists.push({ metric: 'per100kcal', rows: rank('per100kcal').slice(0, SUB_LIST_SIZE) })
  if (wanted && prices.size > 0) lists.push({ metric: 'per100yen', rows: rank('per100yen').slice(0, SUB_LIST_SIZE) })
  const top = per100g[0]
  const servingRank = top ? serving.findIndex((r) => r.food.id === top.food.id) + 1 : 0
  return {
    key,
    info,
    copy,
    path,
    familiarCount: foods.length,
    lists: lists.filter((l) => l.rows.length > 0),
    densest: top && servingRank > 1 ? { food: top.food, servingRank, servingGrams: top.serving.grams } : undefined,
  }
}

const LIST_TITLE: Record<RankingMetric, (name: string, caution: boolean) => string> = {
  serving: (n) => `ふだん1回に食べる量で${n}が多い食品`,
  per100g: (n) => `100gあたりで${n}が多い食品`,
  per100kcal: (n) => `カロリーのわりに${n}が多い食品（100kcalあたり）`,
  per100yen: (n) => `値段のわりに${n}が多い食品（100円あたり）`,
}
const LIST_HINT: Record<RankingMetric, string> = {
  serving: '1回の量はモグシルの目安です（例：ごはん150g、焼きのり3g、しょうゆ6g）。乾物や調味料のように一度にたくさん食べないものは下がります。',
  per100g: '日本食品標準成分表の100gあたりの値です。乾物や調味料のように、ふだん少ししか使わないものも上に来ます。',
  per100kcal: 'カロリーをとりすぎずにとれる食品が上に来ます（100gあたり10kcal未満の食品は除きます）。',
  per100yen: '店頭価格（全国の市の2025年平均）で、100円分に含まれる量でくらべます。価格が分かる食品だけです（調味料は除きます）。',
}
const SUFFIX: Record<RankingMetric, string> = { serving: '/1回', per100g: '/100g', per100kcal: '/100kcal', per100yen: '/100円' }

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
      <section aria-labelledby="reference" className={CARD}>
        <h2 id="reference" className="text-lg font-bold">
          1日の目安
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
    <section aria-labelledby="reference" className={CARD}>
      <h2 id="reference" className="text-lg font-bold">
        {key === 'caffeine' ? '1日の上限の目安' : '1日の目安'}
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
            <li>年齢・性別・身長・体重・ふだんの運動を入れると、アプリで自分の目安を計算できます。</li>
          </>
        )}
      </ul>
    </section>
  )
}

function RankingList({ data, metric, rows }: { data: NutrientPageData; metric: RankingMetric; rows: RankingRow[] }) {
  const { info, copy } = data
  const ref = dailyReference(data.key, DEFAULT_TARGETS)
  const top = rows[0]?.value ?? 1
  const id = `list-${metric}`
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h2 id={id} className="text-lg font-bold">
        {LIST_TITLE[metric](copy.name, Boolean(info.caution))}
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
                    {r.food.displayName}
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
                  {metric === 'per100yen' && r.yenPer100g !== undefined && <>・100gで約{Math.round(r.yenPer100g)}円</>}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

// 棒の長さ。サイトの設定（_headers の Content-Security-Policy）で HTML の style 属性は使えないので、5%きざみのクラスにする
// （Tailwind がクラスを作れるよう、名前はここにそのまま書いておく）
const BAR_WIDTHS = ['w-[5%]', 'w-[10%]', 'w-[15%]', 'w-[20%]', 'w-[25%]', 'w-[30%]', 'w-[35%]', 'w-[40%]', 'w-[45%]', 'w-[50%]', 'w-[55%]', 'w-[60%]', 'w-[65%]', 'w-[70%]', 'w-[75%]', 'w-[80%]', 'w-[85%]', 'w-[90%]', 'w-[95%]', 'w-[100%]']
const barWidth = (ratio: number) => BAR_WIDTHS[Math.min(Math.max(Math.round(ratio * 20), 1), 20) - 1]

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

export function nutrientPageDescription(data: NutrientPageData): string {
  const serving = data.lists.find((l) => l.metric === 'serving')?.rows ?? []
  const names = serving
    .slice(0, 3)
    .map((r) => r.food.displayName)
    .join('・')
  return `${data.copy.name}が多い食品を、ふだん1回に食べる量と100gあたりで並べました。1回の量の上位は${names}。年齢・性別ごとの1日の目安つき。日本食品標準成分表（八訂）増補2023年をもとに計算しています。`
}

export function NutrientPage({ data }: { data: NutrientPageData }) {
  const { key, info, copy, densest } = data
  const serving = data.lists.find((l) => l.metric === 'serving')?.rows ?? []
  const others = NUTRIENT_GROUPS.map((g) => ({ ...g, keys: g.keys.filter((k) => k !== key && NUTRIENT_COPY[k]) }))
  return (
    <StaticLayout crumbs={[{ name: 'モグシル', path: '/' }, { name: '成分が多い食品ランキング', path: NUTRIENTS_INDEX_PATH }, { name: copy.name }]}>
      <article className="space-y-6">
        <header>
          <h1 className="text-2xl leading-snug font-bold sm:text-3xl">{copy.heading}</h1>
          <p className="mt-2 text-sm leading-relaxed">
            {copy.about}
            よく使う食品 {data.familiarCount.toLocaleString()} 品を、ふだん1回に食べる量と100gあたりで並べました。
          </p>
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
        </header>

        <ReferenceTable data={data} />

        {data.lists.map((l) => (
          <RankingList key={l.metric} data={data} metric={l.metric} rows={l.rows} />
        ))}

        <section aria-labelledby="more" className={`${CARD} space-y-3 bg-white/80`}>
          <h2 id="more" className="text-lg font-bold">
            モグシルでもっとくわしく
          </h2>
          <p className="text-sm leading-relaxed">
            アプリでは、食品の種類（魚介類・野菜類など）でしぼったり、成分表のすべての食品からさがしたりできます。料理を選べば、1日の{info.label}が目安に足りているかも分かります。登録はいりません。
          </p>
          <div className="flex flex-wrap gap-2">
            <a href={rankingAppPath(key)} className={BUTTON}>
              くらべ方や種類を変えて見る
            </a>
            <a href="/" className={BUTTON_SUB}>
              料理を選んで1日の栄養をたしかめる
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
    <StaticLayout crumbs={[{ name: 'モグシル', path: '/' }, { name: '成分が多い食品ランキング' }]}>
      <article className="space-y-6">
        <header>
          <h1 className="text-2xl leading-snug font-bold sm:text-3xl">成分が多い食品ランキング</h1>
          <p className="mt-2 text-sm leading-relaxed">
            たんぱく質・食物繊維・鉄分・カルシウム・ビタミンなど{pages.length}の成分について、多く含む食品を、ふだん1回に食べる量と100gあたりで並べました。年齢・性別ごとの1日の目安もあわせて見られます。
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
