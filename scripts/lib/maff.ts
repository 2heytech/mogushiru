// 農林水産省「うちの郷土料理」のレシピページ → 材料表（純粋関数）
// 出典: 農林水産省ウェブサイト「うちの郷土料理」（公共データ利用規約 第1.0版）
// 写真・作り方の文章は使わない。料理名・材料と分量・人数・都道府県だけを取り出す
// （レシピ提供元には個人名が含まれるため取り出さない。出典は各ページのURLで示す）

export const MAFF_BASE = 'https://www.maff.go.jp/j/keikaku/syokubunka/k_ryouri/search_menu/menu/'

export type MaffRecipe = {
  id: string // ページのファイル名（例: misonikomiudon_aichi）
  pref: string
  name: string
  kana: string
  servings: string // 「2人分」「12個分」「作りやすい分量」など、ページの表記のまま
  ingredients: [string, string][] // [材料名, 分量]。見出し行（【たれ】など）は分量が空
  url: string
}

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&hellip;/g, '…')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .trim()

export function parseMaffPage(html: string, id: string): MaffRecipe | null {
  const pref = html.match(/<span class="pref">([^<]+)<\/span>/)
  const name = html.match(/<span class="name">([^<]+)<\/span>/)
  const serv = html.match(/<h2[^>]*>材料（([^<]*)）<\/h2>/)
  if (!pref || !name || !serv || serv.index === undefined) return null
  const full = decode(name[1])
  const m = full.match(/^(.*?)（(.*)）$/)
  const start = serv.index + serv[0].length
  const end = html.indexOf('作り方', start)
  const block = html.slice(start, end < 0 ? undefined : end)
  const ingredients: [string, string][] = []
  for (const [, li] of block.matchAll(/<ul class="list">([\s\S]*?)<\/ul>/g)) {
    const cells = [...li.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((c) => decode(c[1]))
    if (cells.length) ingredients.push([cells[0], cells[1] ?? ''])
  }
  return {
    id,
    pref: decode(pref[1]),
    name: m ? m[1] : full,
    kana: m ? m[2] : '',
    servings: decode(serv[1]),
    ingredients,
    url: `${MAFF_BASE}${id}.html`,
  }
}

// 全角数字・分数を半角に
export function normalizeText(s: string): string {
  return s
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[／⁄]/g, '/')
    .replace(/[．]/g, '.')
    .replace(/[〜～~]/g, '～')
    .replace(/(\d),(\d{3})/g, '$1$2')
    .replace(/ｇ/g, 'g')
    .replace(/㏄/g, 'cc')
    .replace(/[ℓℓ]/g, 'L')
    .replace(/ｍｌ/gi, 'ml')
    .replace(/(\d)[・ ](\d+\/\d+)/g, '$1と$2')
    .replace(/½/g, '1/2')
    .replace(/¼/g, '1/4')
    .replace(/\s+/g, ' ')
    .trim()
}

export type Quantity = { value: number; unit: string }

// 数値（1、1.5、1/2、1と1/2、5～6）を読む。範囲は平均
const NUM = String.raw`(\d+(?:\.\d+)?(?:と\d+/\d+)?(?:/\d+)?)`
const toNumber = (s: string) => {
  const [whole, frac] = s.includes('と') ? s.split('と') : s.includes('/') ? ['0', s] : [s, '']
  const f = frac ? Number(frac.split('/')[0]) / Number(frac.split('/')[1]) : 0
  return Number(whole) + f
}

const UNITS = ['升', '大さじ', '小さじ', 'カップ', 'kg', 'g', 'ml', 'mL', 'cc', 'リットル', 'L', '合', '個', '本', '枚', '丁', '尾', '匹', '切れ', '切', '玉', 'かけ', '片', '束', '把', '袋', '房', '株', '缶', '杯', '粒', '節', 'cm', '膳', 'パック', '箱']

// 分量の文字列 → 数値と単位。「大さじ3」「1/2本」「200g」「5～6本」「2丁（600g）」など
// 括弧の中にグラム表記があれば、そちらを優先する
export function parseQuantity(raw: string): Quantity | null {
  const s = normalizeText(raw)
  const gramsInParen = s.match(new RegExp(String.raw`[（(]\s*(?:約)?${NUM}\s*(g|kg)\s*[)）]`))
  if (gramsInParen) return { value: toNumber(gramsInParen[1]) * (gramsInParen[2] === 'kg' ? 1000 : 1), unit: 'g' }
  const trimmed = s.replace(/[（(].*$/, '').replace(/^(約|各|正味|乾燥|生)+/, '')
  const unitAlt = UNITS.map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  // 単位が前（大さじ1）。「大3」「小1」のように数だけなら大さじ・小さじ、「大2尾」なら大きさ
  const spoonOnly = new RegExp(String.raw`^(大|小)\s*${NUM}(?:\s*～\s*${NUM})?(?:杯)?$`).test(trimmed)
  const head = spoonOnly ? trimmed : trimmed.replace(/^(大|中|小)(?=\d)/, '')
  let m = head.match(new RegExp(String.raw`^(大さじ|小さじ|カップ|大|小)\s*${NUM}(?:\s*～\s*${NUM})?`))
  if (m) {
    const unit = m[1] === '大' ? '大さじ' : m[1] === '小' ? '小さじ' : m[1]
    const v = m[3] ? (toNumber(m[2]) + toNumber(m[3])) / 2 : toNumber(m[2])
    return { value: v, unit }
  }
  // 単位が後ろ（200g、1/2本、5～6本）
  m = head.match(new RegExp(String.raw`^${NUM}(?:\s*～\s*${NUM})?\s*(${unitAlt})`))
  if (m) {
    const v = m[2] ? (toNumber(m[1]) + toNumber(m[2])) / 2 : toNumber(m[1])
    let unit = m[3]
    let value = v
    if (unit === 'kg') [unit, value] = ['g', v * 1000]
    if (unit === 'cc' || unit === 'mL') unit = 'ml'
    if (unit === 'リットル' || unit === 'L') [unit, value] = ['ml', v * 1000]
    if (unit === '切') unit = '切れ'
    if (unit === '升') [unit, value] = ['合', v * 10]
    return { value, unit }
  }
  if (/^(半分|半丁|半身)/.test(head)) return { value: 0.5, unit: head.replace(/^半/, '').replace(/^分$/, '個') || '個' }
  if (/^(少々|少量|ひとつまみ|1つまみ|ひとつまみ)/.test(head)) return { value: 1, unit: '少々' }
  m = head.match(new RegExp(String.raw`^${NUM}$`))
  if (m) return { value: toNumber(m[1]), unit: '個' }
  return null
}

// 「4人分」「4～5人分」→ 人数。それ以外（個分・作りやすい分量）は null
export function parsePeople(servings: string): number | null {
  const s = normalizeText(servings)
  const m = s.match(new RegExp(String.raw`^(?:約)?${NUM}(?:\s*～\s*${NUM})?\s*人(?:分|前)`))
  if (!m) return null
  return m[2] ? (toNumber(m[1]) + toNumber(m[2])) / 2 : toNumber(m[1])
}

// 「12個分」「24本分」→ 数と単位
export function parsePieces(servings: string): { count: number; unit: string } | null {
  const s = normalizeText(servings)
  const m = s.match(new RegExp(String.raw`^(?:約)?${NUM}(?:\s*～\s*${NUM})?\s*(個|本|枚|切れ|切|串|皿|杯|食)分`))
  if (!m) return null
  return { count: m[2] ? (toNumber(m[1]) + toNumber(m[2])) / 2 : toNumber(m[1]), unit: m[3] }
}

// 材料名の正規化：見出し【A】・括弧書き・記号を外す
export function normalizeName(raw: string): string {
  return normalizeText(raw)
    .replace(/【[^】]*】/g, '')
    .replace(/[（(][^）)]*[)）]/g, '')
    .replace(/^[・\s※*＊●○◎◆◇■□▲△]+/, '')
    .replace(/^[A-Za-zＡ-Ｚａ-ｚ][\s:：]/, '')
    .replace(/\s+/g, '')
    .trim()
}
