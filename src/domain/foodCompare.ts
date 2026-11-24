// 食材を並べてくらべる（「食品を調べる」の「くらべる」）。
// ・近い食材をさがす（鹿肉なら牛肉・豚肉・鶏肉、鮭ならほかの魚、木綿豆腐なら納豆や豆乳）
// ・選んだ食材の成分を、同じ量（100g・1回の量）で表にする
import { MORE_NAMED_FOOD_IDS, NAMED_FOOD_IDS, NUTRIENT_GROUPS, RANKING_NUTRIENTS } from './ranking'
import { servingFor, servingText } from './serving'
import type { Food, NutrientKey } from './types'

// ---- 成分表の名前から読みとる、食材の性質 ----

// 調理や加工の状態（同じ状態どうしでくらべるため）
export type FoodState = 'raw' | 'boiled' | 'grilled' | 'fried' | 'dried' | 'canned' | 'pickled'
// 肉・魚の「ふつうの身」ではない形
export type FoodForm = 'organ' | 'processed' | 'minced'

export type FoodTraits = {
  // 何の食材か。肉・魚は動物や魚の種類（うし・しか・さけ・ます類）、そのほかは食品と区分（だいず［豆腐・油揚げ類］・こむぎ［パン類］）
  species: string
  // ＜畜肉類＞＜魚類＞ などの大きな分け方（ないものは null）
  cls: string | null
  state: FoodState | null
  form: FoodForm | null
}

const ANIMAL_GROUPS = new Set(['10', '11'])
// 先頭の語がこれのときは、何の食材か分からないので、前の（〜類）と合わせる
const GENERIC_HEAD = new Set(['漬物', '加工品', '缶詰'])

// 語 → 状態（上から順に、どれかの語が当たったもの。「缶詰 油漬」は缶詰、「開き干し 焼き」は焼き）
const STATE_WORDS: [FoodState, RegExp][] = [
  ['canned', /缶詰|びん詰/],
  ['pickled', /漬$|漬物|塩蔵|つくだ煮|梅干し/],
  ['fried', /^(油いため|ソテー|フライ|天ぷら|から揚げ|とんかつ|素揚げ)$|フライドポテト/],
  ['grilled', /^(焼き|焼|いり|かば焼|白焼き|つけ焼き)$/],
  ['boiled', /^(ゆで|水煮|蒸し|めし|電子レンジ調理)$/],
  ['dried', /^(乾|素干し|煮干し|干し|乾燥)$|開き干し|生干し/],
  ['raw', /^生$/],
]

// 内臓・皮など（肉）と、卵・白子・内臓（魚）
const ORGAN_WORDS = /^(肝臓|心臓|舌|じん臓|胃|第一胃|第二胃|第三胃|第四胃|小腸|大腸|直腸|子宮|尾|腱|横隔膜|豚足|軟骨|すなぎも|皮|頭部|内臓|きも|たらこ|すじこ|イクラ|かずのこ|しらこ|からしめんたいこ|卵巣|精巣)$|なんこつ/
const PROCESSED_TAGS = /ハム類|ベーコン類|ソーセージ類|加工品|その他|缶詰/

const tagOf = (token: string, open: string, close: string): string | null => (token.startsWith(open) && token.endsWith(close) ? token.slice(1, -1) : null)

export function foodTraits(food: Pick<Food, 'name' | 'group'>): FoodTraits {
  const tokens = food.name.split(/[\s　]+/).filter(Boolean)
  let cls: string | null = null
  let mid: string | null = null
  const brackets: string[] = []
  const words: string[] = []
  for (const t of tokens) {
    const c = tagOf(t, '＜', '＞')
    const m = tagOf(t, '（', '）')
    const b = tagOf(t, '［', '］')
    if (c !== null) cls = c
    else if (m !== null && words.length === 0) mid ??= m
    else if (b !== null) brackets.push(b)
    else words.push(t)
  }
  const head = words[0] ?? mid ?? food.name
  let species: string
  if (food.group === '10') species = mid ?? head
  else if (food.group === '11') species = head
  else species = `${GENERIC_HEAD.has(head) && mid ? `${mid} ` : ''}${head}${brackets[0] ? `［${brackets[0]}］` : ''}`

  const rest = words.slice(1)
  const state = STATE_WORDS.find(([, re]) => rest.some((w) => re.test(w)))?.[0] ?? null

  let form: FoodForm | null = null
  if (ANIMAL_GROUPS.has(food.group)) {
    const tags = brackets.join(' ')
    if (/副生物/.test(tags) || ((food.group === '10' || /副品目/.test(tags)) && rest.some((w) => ORGAN_WORDS.test(w)))) form = 'organ'
    else if (/ひき肉|二次品目/.test(tags) || rest.includes('ひき肉')) form = 'minced'
    else if (PROCESSED_TAGS.test(tags) || rest.some((w) => PROCESSED_TAGS.test(w)) || cls === '水産練り製品') form = 'processed'
  }
  return { species, cls, state, form }
}

// ---- 近い食材 ----

// 成分の近さ（100gあたり）。小さいほど近い。カロリーとたんぱく質・脂質・炭水化物に、野菜どうしなどで差の出る成分を少し足す
const MACRO: [NutrientKey, number][] = [
  ['energyKcal', 100],
  ['protein', 8],
  ['fat', 8],
  ['carb', 15],
]
const MICRO: [NutrientKey, number][] = [
  ['fiber', 2],
  ['calcium', 50],
  ['iron', 1],
  ['vitaminA', 100],
  ['vitaminC', 20],
]
const MICRO_WEIGHT = 0.25

function profileDistance(a: Food, b: Food): number {
  let d = 0
  for (const [k, scale] of MACRO) d += Math.abs((a.per100g[k] ?? 0) - (b.per100g[k] ?? 0)) / scale
  for (const [k, scale] of MICRO) d += MICRO_WEIGHT * Math.abs(Math.log1p((a.per100g[k] ?? 0) / scale) - Math.log1p((b.per100g[k] ?? 0) / scale))
  return d
}

// 呼び名のない食材（成分表のままの名前）・ふだんあまり買わない食材は、後ろへ
const UNNAMED_PENALTY = 3
const RARE_PENALTY = 2
const STATE_PENALTY = 1.5
const FORM_PENALTY = 3
const CLASS_PENALTY = 0.5
// よく使う食材の中でも、先に並べてあるもの（data/food-names.json の順。よく食べるものから）を少しだけ先にする
const ORDER_PENALTY = 0.4
const ORDER_SPAN = 60
const NAMED_ORDER = new Map([...NAMED_FOOD_IDS].map((id, i) => [id, i] as const))

function nearness(self: Food, selfTraits: FoodTraits, other: Food, otherTraits: FoodTraits, orderInGroup: Map<string, number>): number {
  let d = profileDistance(self, other)
  const order = orderInGroup.get(other.id)
  if (order !== undefined) d += (ORDER_PENALTY * Math.min(order, ORDER_SPAN)) / ORDER_SPAN
  else d += MORE_NAMED_FOOD_IDS.has(other.id) ? RARE_PENALTY : UNNAMED_PENALTY
  if (selfTraits.state && otherTraits.state !== selfTraits.state) d += STATE_PENALTY
  if (otherTraits.form !== selfTraits.form) d += FORM_PENALTY
  if (otherTraits.cls !== selfTraits.cls) d += CLASS_PENALTY
  return d
}

export type NearFoods = {
  // ほかの種類の、近い食材（鹿肉なら牛・豚・鶏。種類ごとに、いちばん近い1つ）。近い順
  others: Food[]
  // 同じ食材の、部位や状態のちがうもの（牛もも肉なら牛ばら肉・牛ひき肉）。近い順
  same: Food[]
}

export const NEAR_OTHERS_MAX = 8
export const NEAR_SAME_MAX = 6

// 同じ食品群の中から、近い食材をさがす
export function nearFoods(food: Food, foods: Iterable<Food>): NearFoods {
  const traits = foodTraits(food)
  // カロリーが測られていない食材は、くらべる相手にすすめない
  const group = [...foods].filter((f) => f.group === food.group && f.id !== food.id && f.per100g.energyKcal !== null)
  // 同じ食品群の、よく使う食材の中での並び順
  const orderInGroup = new Map(
    group
      .filter((f) => NAMED_ORDER.has(f.id))
      .sort((a, b) => NAMED_ORDER.get(a.id)! - NAMED_ORDER.get(b.id)!)
      .map((f, i) => [f.id, i] as const),
  )
  const bySpecies = new Map<string, { food: Food; d: number }>()
  const same: { food: Food; d: number }[] = []
  for (const other of group) {
    const t = foodTraits(other)
    const d = nearness(food, traits, other, t, orderInGroup)
    if (t.species === traits.species) same.push({ food: other, d })
    else {
      const best = bySpecies.get(t.species)
      if (!best || d < best.d) bySpecies.set(t.species, { food: other, d })
    }
  }
  const byDistance = (a: { d: number }, b: { d: number }) => a.d - b.d
  // 同じ食材の部位・状態ちがいは、呼び名のあるもの（牛ばら肉・牛サーロイン）を、成分表のままの名前のものより先に出す
  const named = (f: Food) => Number(!(NAMED_FOOD_IDS.has(f.id) || MORE_NAMED_FOOD_IDS.has(f.id)))
  return {
    others: [...bySpecies.values()]
      .sort(byDistance)
      .slice(0, NEAR_OTHERS_MAX)
      .map((x) => x.food),
    same: same
      .sort((a, b) => named(a.food) - named(b.food) || byDistance(a, b))
      .slice(0, NEAR_SAME_MAX)
      .map((x) => x.food),
  }
}

// はじめに並べる相手（3つまで）：ほかの種類の近い食材。足りなければ、同じ食材の部位・状態ちがいで埋める
export const COMPARE_START = 3
export function startPartners(near: NearFoods, max = COMPARE_START): Food[] {
  return [...near.others, ...near.same].slice(0, max)
}

// ---- くらべる表 ----

// 一度に並べられる数（スマホの幅で、ゆったり読めるのは4つ。5つめを足すと、列がせまくなる）
export const COMPARE_MAX = 5

export type CompareBasis = 'per100g' | 'serving'
export const COMPARE_BASIS_LABEL: Record<CompareBasis, string> = { per100g: '100gあたり', serving: '1回の量で' }

export type CompareCell = {
  // null = 成分表で測られていない（0 とは区別する）
  amount: number | null
  // その行でいちばん多い値に対する割合（0〜1）。棒の長さに使う
  share: number
  // その行でいちばん多い（ほかより多いものがあるときだけ。みんな同じ・みんな0なら付けない）
  top: boolean
}

export type CompareRow = { key: NutrientKey; label: string; unit: string; caution: boolean; cells: CompareCell[] }
export type CompareGroup = { label: string; rows: CompareRow[] }
export type CompareColumn = { food: Food; grams: number; amountText: string }
export type CompareTable = { columns: CompareColumn[]; groups: CompareGroup[] }

export function compareTable(foods: Food[], basis: CompareBasis): CompareTable {
  const columns: CompareColumn[] = foods.map((food) => {
    if (basis === 'per100g') return { food, grams: 100, amountText: '100g' }
    const serving = servingFor(food)
    return { food, grams: serving.grams, amountText: servingText(serving) }
  })
  const groups = NUTRIENT_GROUPS.map((g) => ({
    label: g.label,
    rows: g.keys.map((key): CompareRow => {
      const info = RANKING_NUTRIENTS.find((n) => n.key === key)!
      const amounts = columns.map(({ food, grams }) => {
        const v = food.per100g[key]
        return v === null ? null : (v * grams) / 100
      })
      const known = amounts.filter((a): a is number => a !== null)
      const max = known.length > 0 ? Math.max(...known) : 0
      const min = known.length > 0 ? Math.min(...known) : 0
      return {
        key,
        label: info.label,
        unit: info.unit,
        caution: Boolean(info.caution),
        cells: amounts.map((amount) => ({
          amount,
          share: amount !== null && max > 0 ? amount / max : 0,
          top: amount !== null && max > 0 && amount === max && max > min && known.length > 1,
        })),
      }
    }),
  }))
  return { columns, groups }
}

// ---- ちがいの大きいところ（表の上に、ひとことで出す） ----

export type CompareNote = { key: NutrientKey; label: string; unit: string; self: number; other: number; more: boolean }

// 比べる成分（カロリーと、食材選びで気にすることの多いもの）と、「ちがう」と言う最小の差（100gあたり）
const NOTE_KEYS: [NutrientKey, number][] = [
  ['energyKcal', 20],
  ['protein', 2],
  ['fat', 2],
  ['carb', 3],
  ['fiber', 1],
  ['iron', 0.5],
  ['calcium', 30],
  ['zinc', 1],
  ['vitaminA', 50],
  ['vitaminD', 1],
  ['vitaminB1', 0.1],
  ['vitaminB2', 0.1],
  ['vitaminC', 10],
  ['folate', 30],
  ['salt', 0.5],
]
export const NOTE_MAX = 4

// 1つめの食材を、2つめとくらべたときに、ちがいの大きい成分（同じ量どうし）。倍率の大きい順に NOTE_MAX つまで
export function compareNotes(table: CompareTable): CompareNote[] {
  if (table.columns.length < 2) return []
  const scale = table.columns[0].grams / 100
  const rows = new Map(table.groups.flatMap((g) => g.rows).map((r) => [r.key, r] as const))
  return NOTE_KEYS.flatMap(([key, least]) => {
    const row = rows.get(key)
    const self = row?.cells[0].amount
    const other = row?.cells[1].amount
    if (!row || self == null || other == null || Math.abs(self - other) < least * scale) return []
    const [big, small] = self > other ? [self, other] : [other, self]
    // 片方がほとんど 0 のときも、倍率が大きくなりすぎないようにならす
    const ratio = (big + least * scale) / (small + least * scale)
    return [{ note: { key, label: row.label, unit: row.unit, self, other, more: self > other }, ratio }]
  })
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, NOTE_MAX)
    .map((x) => x.note)
}
