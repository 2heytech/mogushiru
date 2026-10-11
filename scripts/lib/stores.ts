// コンビニ各社の公式サイトに載っている商品の栄養成分表示を読み取る
// 取り込むのは商品名・内容量・価格・栄養成分の数値と出典URLだけ。写真や説明文は使わない
import { NUTRIENT_KEYS, type Nutrients, type Product } from '../../src/domain/types'

export type StoreId = 'seven' | 'famima' | 'lawson'

export const STORES = {
  seven: { name: 'セブン-イレブン' as const, site: 'https://www.sej.co.jp/' },
  famima: { name: 'ファミリーマート' as const, site: 'https://www.family.co.jp/' },
  lawson: { name: 'ローソン' as const, site: 'https://www.lawson.co.jp/' },
} satisfies Record<StoreId, { name: string; site: string }>

// 各社の商品カテゴリ（URLの名前）→ アプリのカテゴリ。null は商品名から判定する
export const SEVEN_CATEGORIES: Record<string, string | null> = {
  onigiri: 'onigiri',
  sushi: 'bento',
  bento: 'bento',
  sandwich: 'sandwich',
  bread: 'bread',
  donut: 'dessert',
  pasta: 'noodle',
  men: 'noodle',
  gratin: 'side',
  salad: 'side',
  dailydish: 'side',
  hotsnack: 'side',
  oden: 'side',
  chukaman: 'side',
  sweets: 'dessert',
  ice_cream: 'dessert',
  frozen_foods: 'side',
  sevencafe: 'drink',
  // セブンプレミアム（お店のブランドの加工食品・お菓子・飲み物など）
  '7premium/bread': 'bread',
  '7premium/confectionery': 'snack',
  '7premium/daily_dish': 'side',
  '7premium/dairy': 'dairy',
  '7premium/drink': 'drink',
  '7premium/alcohol': 'alcohol',
  '7premium/fresh': 'ingredient',
  '7premium/frozen_foods': 'side',
  '7premium/process': null,
  '7premium/sweets_ice_cream': 'dessert',
}

export const LAWSON_CATEGORIES: Record<string, string | null> = {
  rice: 'onigiri',
  sushi: 'bento',
  bento: 'bento',
  chilledbento: 'bento',
  machikadochubo: 'bento',
  sandwich: 'sandwich',
  bakery: 'bread',
  noodle: 'noodle',
  pasta: 'noodle',
  gratin: 'side',
  salad: 'side',
  soup: 'side',
  fry: 'side',
  konamono: 'side',
  oden: 'side',
  chukaman: 'side',
  chilled: 'side',
  dessert: 'dessert',
  gateau: 'dessert',
  kenkosnack: 'snack',
  coffee: 'drink',
  liquor: 'alcohol',
  gentei: null,
  select: null,
  'select/icecreem': 'dessert',
  'select/osozai': 'side',
}

export const FAMIMA_PAGES: Record<string, string> = {
  goods010: 'onigiri',
  goods020: 'bento',
  goods030: 'bento',
  goods040: 'sandwich',
  goods060: 'noodle',
  goods070: 'noodle',
  goods080: 'side',
  goods090: 'side',
  goods100: 'side',
  friedfoods: 'side',
  chukaman: 'side',
  oden: 'side',
  cafe: 'drink',
}

// 1包装（1食）当たりの栄養成分表示
export type Label = {
  energyKcal: number
  protein: number
  fat: number
  carb: number
  salt: number
  fiber?: number
}

export type StoreItem = {
  store: StoreId
  code: string // 各社の商品番号
  name: string
  category: string // アプリのカテゴリ
  url: string
  label: Label
  per?: string // 表示の単位（「1包装当たり」など。書かれていれば）
  priceYen?: number // 税込の価格（書かれていれば）
  fetchedAt: string
}

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t\r\n]+/g, ' ')
    .trim()

// 全角数字・記号を半角に
const half = (s: string) => s.replace(/[０-９．，～]/g, (c) => ({ '．': '.', '，': ',', '～': '〜' })[c] ?? String.fromCharCode(c.charCodeAt(0) - 0xfee0))

// 「16.2g」「1.2〜1.5g」「Tr」などを数にする。幅があるときは真ん中、Tr（微量）は 0
export function parseAmount(raw: string): number | null {
  const s = half(raw).replace(/,/g, '').trim()
  if (/^(tr|微量)/i.test(s)) return 0
  const range = s.match(/(\d+(?:\.\d+)?)\s*[〜~-]\s*(\d+(?:\.\d+)?)/)
  if (range) return Math.round(((Number(range[1]) + Number(range[2])) / 2) * 100) / 100
  const m = s.match(/\d+(?:\.\d+)?/)
  return m ? Number(m[0]) : null
}

// 「熱量：556kcal、たんぱく質：16.2g、脂質：20.4g、炭水化物：78.5g（糖質：75.2g、食物繊維：3.3g）、食塩相当量：3.6g」の形
export function parseLabelText(text: string): Label | null {
  const t = half(decode(text))
  const pick = (re: RegExp) => {
    const m = t.match(re)
    return m ? parseAmount(m[1]) : null
  }
  const value = '([0-9.,]+(?:\\s*[〜~-]\\s*[0-9.]+)?|Tr|微量)'
  const label = {
    energyKcal: pick(new RegExp(`(?:熱量|エネルギー)[:：\\s]*${value}`)),
    protein: pick(new RegExp(`たんぱく質[:：\\s]*${value}`)),
    fat: pick(new RegExp(`脂質[:：\\s]*${value}`)),
    carb: pick(new RegExp(`炭水化物[:：\\s]*${value}`)),
    salt: pick(new RegExp(`食塩相当量[:：\\s]*${value}`)),
    fiber: pick(new RegExp(`食物繊維[:：\\s]*${value}`)),
  }
  return completeLabel(label)
}

function completeLabel(l: Partial<Record<keyof Label, number | null>>): Label | null {
  const { energyKcal, protein, fat, carb, salt, fiber } = l
  if (energyKcal == null || protein == null || fat == null || carb == null || salt == null) return null
  return { energyKcal, protein, fat, carb, salt, ...(fiber != null ? { fiber } : {}) }
}

// 税込価格。「398円（税込429.84円）」は税込の方、「297円(税込)」はその数
export function parsePrice(text: string): number | undefined {
  const t = half(decode(text)).replace(/,/g, '')
  const inc = t.match(/税込\s*([0-9.]+)\s*円/) ?? t.match(/([0-9.]+)\s*円\s*[(（]\s*税込/)
  return inc ? Math.round(Number(inc[1])) : undefined
}

// ---- セブン-イレブン ----

// 商品ページ https://www.sej.co.jp/products/a/item/040114/
export function parseSevenItem(html: string, code: string): Omit<StoreItem, 'category' | 'fetchedAt'> | null {
  const name = html.match(/<div class="item_ttl">\s*<h1>([\s\S]*?)<\/h1>/)?.[1]
  const nutrition = html.match(/<th>栄養成分<\/th>\s*<td>([\s\S]*?)<\/td>/)?.[1]
  if (!name || !nutrition) return null
  const label = parseLabelText(nutrition)
  if (!label) return null
  const price = html.match(/<div class="item_price">([\s\S]*?)<\/div>/)?.[1]
  const priceYen = price ? parsePrice(price) : undefined
  return {
    store: 'seven',
    code,
    name: decode(name),
    url: `https://www.sej.co.jp/products/a/item/${code}/`,
    label,
    ...(priceYen ? { priceYen } : {}),
  }
}

// 一覧ページに並ぶ商品番号
export const sevenItemCodes = (html: string): string[] => [...new Set([...html.matchAll(/\/products\/a\/item\/(\d+)\//g)].map((m) => m[1]))]

// ---- ローソン ----

// 商品ページ https://www.lawson.co.jp/recommend/original/detail/1507092_1996.html
export function parseLawsonDetail(html: string, code: string): Omit<StoreItem, 'category' | 'fetchedAt'> | null {
  const name = html.match(/<h2 class="ttl">([\s\S]*?)<\/h2>/)?.[1]
  const table = html.match(/<div class="nutritionFacts_table">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/)?.[1]
  if (!name || !table) return null
  const pairs: Record<string, string> = {}
  for (const m of table.matchAll(/<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g)) {
    const k = decode(m[1])
    if (!(k in pairs)) pairs[k] = decode(m[2])
  }
  const get = (...keys: string[]) => {
    for (const k of keys) if (pairs[k] !== undefined) return parseAmount(pairs[k])
    return null
  }
  const label = completeLabel({
    energyKcal: get('熱量', 'エネルギー'),
    protein: get('たんぱく質'),
    fat: get('脂質'),
    carb: get('炭水化物'),
    salt: get('食塩相当量'),
    fiber: get('食物繊維'),
  })
  if (!label) return null
  const per = table.match(/<h3>栄養成分<span>【([^】]+)】<\/span>/)?.[1]
  const price = html.match(/<dl class="price">([\s\S]*?)<\/dl>/)?.[1]
  const priceYen = price ? parsePrice(price) : undefined
  return {
    store: 'lawson',
    code,
    name: decode(name),
    url: `https://www.lawson.co.jp/recommend/original/detail/${code}.html`,
    label,
    ...(per ? { per: decode(per) } : {}),
    ...(priceYen ? { priceYen } : {}),
  }
}

export const lawsonDetailCodes = (html: string): string[] =>
  [...new Set([...html.matchAll(/\/recommend\/original\/detail\/([0-9_]+)\.html/g)].map((m) => m[1]))]

// ---- ファミリーマート ----

// 「アレルゲン、栄養成分…」のカテゴリページ https://www.family.co.jp/goods/safety/goods010.html
// 1ページに商品名と栄養成分（熱量・たんぱく質・脂質・炭水化物・食塩相当量）の表が並ぶ
export function parseFamimaSafety(html: string, pageUrl: string): Omit<StoreItem, 'category' | 'fetchedAt'>[] {
  const items: Omit<StoreItem, 'category' | 'fetchedAt'>[] = []
  const blocks = html.split(/<p class="name">/).slice(1)
  for (const b of blocks) {
    const nameHtml = b.match(/^([\s\S]*?)<\/p>/)?.[1] ?? ''
    const href = nameHtml.match(/href="(https:\/\/www\.family\.co\.jp\/goods\/[^"]+?\/(\d+)\.html)"/)
    const table = b.match(/<table class="item_nutritional_info">([\s\S]*?)<\/table>/)?.[1]
    if (!table) continue
    const heads = [...table.matchAll(/<th class="tit_nut">([\s\S]*?)<\/th>/g)].map((m) => decode(m[1]))
    const vals = [...table.matchAll(/<td class="con_nut">([\s\S]*?)<\/td>/g)].map((m) => decode(m[1]))
    const get = (k: string) => {
      const i = heads.findIndex((h) => h.startsWith(k))
      return i >= 0 && vals[i] !== undefined ? parseAmount(vals[i]) : null
    }
    const label = completeLabel({ energyKcal: get('熱量'), protein: get('たんぱく質'), fat: get('脂質'), carb: get('炭水化物'), salt: get('食塩相当量') })
    const name = decode(nameHtml)
    if (!label || !name) continue
    // 商品ページのない品（コーヒーのサイズ違いなど）は、名前から番号を作り、出典はカテゴリページにする
    items.push({
      store: 'famima',
      code: href ? href[2] : `n-${name}`,
      name,
      url: href ? href[1] : pageUrl,
      label,
    })
  }
  return items
}

// ---- アプリの市販品にする ----

// セブンプレミアムなどお店のブランドの加工品。サイトの表示に「1袋当たり」「100g当たり」などの単位が書かれておらず、
// 商品によって1個・1食・100g(mL)当たりがまちまちなので取り込まない（例：ビール350mLが100mL当たり、卵10個が2個当たり）
const SEVEN_PRIVATE_BRAND = /^\s*(7\s*P|7\s*プレミアム|セブンプレミアム|7\s*ザ\s*・?\s*プライス)/i
export const isAmbiguousSevenItem = (item: Pick<StoreItem, 'store' | 'name'>): boolean =>
  item.store === 'seven' && SEVEN_PRIVATE_BRAND.test(item.name.normalize('NFKC'))

// 表示の単位。「100g当たり」「15g当たり」は量当たり、それ以外（1包装・1個・1本…）は1回分
export function labelBasis(per: string | undefined): { grams: number; unit: 'g' | 'ml' } | { label?: string } {
  const t = (per ?? '').normalize('NFKC')
  const amount = t.match(/^(\d+(?:\.\d+)?)\s*(g|ml)当たり$/i)
  if (amount) return { grams: Number(amount[1]), unit: amount[2].toLowerCase() as 'g' | 'ml' }
  const label = t.replace(/当たり$/, '')
  return label && !/^1(包装|食)$/.test(label) ? { label } : {}
}

// 1回分の表示は basis: 'serving'。100g・15g当たりなどの表示は100g(mL)当たりに直す
export function toStoreProduct(item: StoreItem): Product {
  const basis = labelBasis(item.per)
  const factor = 'grams' in basis ? 100 / basis.grams : 1
  const scale = (v: number | undefined) => (v === undefined ? null : Number((v * factor).toPrecision(4)))
  const nutrients = {} as Nutrients
  for (const k of NUTRIENT_KEYS) nutrients[k] = null
  Object.assign(nutrients, {
    energyKcal: scale(item.label.energyKcal),
    protein: scale(item.label.protein),
    fat: scale(item.label.fat),
    carb: scale(item.label.carb),
    salt: scale(item.label.salt),
    fiber: scale(item.label.fiber),
    // お酒以外は 0（市販品の取り込みと同じ扱い）
    alcohol: item.category === 'alcohol' ? null : 0,
  })
  return {
    jan: `${item.store}-${item.code}`,
    name: item.name,
    brand: STORES[item.store].name,
    category: item.category,
    ...('grams' in basis ? { basis: basis.unit === 'ml' ? ('100ml' as const) : ('100g' as const) } : { basis: 'serving' as const, ...(basis.label ? { servingLabel: basis.label } : {}) }),
    nutrients,
    source: { name: STORES[item.store].name, url: item.url, fetchedAt: item.fetchedAt },
  }
}
