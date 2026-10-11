// 文部科学省「日本食品標準成分表（八訂）増補2023年」Excel の読み取り（純粋関数）
// Excel には成分識別子（ENERC_KCAL など）の行があるので、列は見出しの位置ではなく識別子で特定する。
import { NUTRIENT_KEYS, type NutrientKey, type Nutrients } from '../../src/domain/types'

// アプリの栄養素 → 成分識別子の候補（先に見つかったものを使う）
// 脂肪酸（飽和脂肪酸）は本表ではなく脂肪酸成分表にあるため、ここでは対象外
export const COMPONENT_IDS: Partial<Record<NutrientKey, string[]>> = {
  energyKcal: ['ENERC_KCAL'],
  protein: ['PROT-'],
  fat: ['FAT-'],
  carb: ['CHOCDF-'],
  fiber: ['FIB-', 'FIBTG'],
  salt: ['NACL_EQ'],
  alcohol: ['ALC'],
  calcium: ['CA'],
  iron: ['FE'],
  potassium: ['K'],
  magnesium: ['MG'],
  zinc: ['ZN'],
  vitaminA: ['VITA_RAE'],
  retinol: ['RETOL'],
  vitaminD: ['VITD'],
  vitaminE: ['TOCPHA'],
  vitaminB1: ['THIA'],
  vitaminB2: ['RIBF'],
  niacin: ['NE'],
  vitaminB6: ['VITB6A'],
  folate: ['FOL'],
  vitaminC: ['VITC'],
}

// Excel のセル値を文字列にする。食品名は書式つき文字列（richText）、計算セルは result を持つ
export function cellText(input: unknown): string {
  if (input === null || input === undefined) return ''
  if (typeof input === 'object') {
    const o = input as { richText?: { text: string }[]; result?: unknown; text?: unknown }
    if (Array.isArray(o.richText)) return o.richText.map((t) => t.text).join('')
    if ('result' in o) return cellText(o.result)
    if (typeof o.text === 'string') return o.text
  }
  return String(input)
}

// 食品群（食品番号の上2桁）
export const FOOD_GROUPS: Record<string, string> = {
  '01': '穀類', '02': 'いも及びでん粉類', '03': '砂糖及び甘味類', '04': '豆類', '05': '種実類',
  '06': '野菜類', '07': '果実類', '08': 'きのこ類', '09': '藻類', '10': '魚介類', '11': '肉類',
  '12': '卵類', '13': '乳類', '14': '油脂類', '15': '菓子類', '16': 'し好飲料類',
  '17': '調味料及び香辛料類', '18': '調理済み流通食品類',
}

export type ParsedCell = { value: number | null; trace: boolean; estimated: boolean; raw: string }

// 成分値の表記：数値、Tr（微量）、(数値)・(Tr)（推定値）、-（未測定）、*（未算出）、空欄、末尾の†（注記）
export function parseCell(input: unknown): ParsedCell {
  const raw = cellText(input).trim()
  // 値に付く注記記号（† など）は数値の読み取りから外す。原表記は raw に残る
  let s = raw.replace(/[†‡＊]+$/u, '').trim()
  let estimated = false
  if (/^\(.*\)$/.test(s)) {
    estimated = true
    s = s.slice(1, -1).trim()
  }
  if (s === 'Tr') return { value: 0, trace: true, estimated, raw }
  if (s === '' || s === '-' || s === '*') return { value: null, trace: false, estimated, raw }
  const num = Number(s)
  if (Number.isNaN(num)) return { value: null, trace: false, estimated, raw }
  return { value: num, trace: false, estimated, raw }
}

export type ColumnMap = {
  headerRow: number // 成分識別子の行（0始まり）
  foodId: number
  name: number
  group: number
  nutrients: Partial<Record<NutrientKey, number>>
  remarks?: number // 備考の列（カフェインはここに載る）
}

// rows: シートを二次元配列にしたもの。anchor は成分識別子の行を見つける目印（本表は ENERC_KCAL、脂肪酸成分表は FASAT）
export function findColumns(
  rows: unknown[][],
  anchor = 'ENERC_KCAL',
  componentIds: Partial<Record<NutrientKey, string[]>> = COMPONENT_IDS,
): ColumnMap {
  const headerRow = rows.findIndex((r) => r.some((c) => cellText(c).trim() === anchor))
  if (headerRow < 0) throw new Error(`成分識別子（${anchor}）の行が見つかりません`)
  const ids = rows[headerRow].map((c) => cellText(c).trim())
  const nutrients: Partial<Record<NutrientKey, number>> = {}
  for (const [key, candidates] of Object.entries(componentIds) as [NutrientKey, string[]][]) {
    for (const id of candidates) {
      const idx = ids.indexOf(id)
      if (idx >= 0) {
        nutrients[key] = idx
        break
      }
    }
  }
  // 食品番号・食品名・食品群は見出しの文字で探す（識別子行より上の行も含める）
  const findLabel = (label: string): number => {
    for (let r = 0; r <= headerRow; r++) {
      const idx = rows[r].findIndex((c) => cellText(c).replace(/\s/g, '') === label)
      if (idx >= 0) return idx
    }
    throw new Error(`見出し「${label}」が見つかりません`)
  }
  let remarks: number | undefined
  for (let r = 0; r <= headerRow && remarks === undefined; r++) {
    const idx = rows[r].findIndex((c) => cellText(c).replace(/\s/g, '') === '備考')
    if (idx >= 0) remarks = idx
  }
  return { headerRow, foodId: findLabel('食品番号'), name: findLabel('食品名'), group: findLabel('食品群'), nutrients, remarks }
}

// カフェインは成分値の列がなく、備考に「カフェイン： 0.06 g」の形で載る（可食部100g当たりの g）。mg に直して返す。
// 載っていなければ null
export function caffeineFromRemarks(remarks: string): ParsedCell | null {
  const m = remarks.match(/カフェイン[：:]\s*(Tr|[\d.]+)\s*(g)?/)
  if (!m) return null
  if (m[1] === 'Tr') return { value: 0, trace: true, estimated: false, raw: m[0] }
  return { value: Math.round(Number(m[1]) * 1000 * 10) / 10, trace: false, estimated: false, raw: m[0] }
}

// 備考にカフェインの記載がないが、カフェインを含むはずの食品（コーラ・コーヒー飲料など）。0 でなく未収録にする
export const CAFFEINE_UNKNOWN_IDS = ['16053', '16047', '13007', '04054', '15180']

export type MextFood = {
  id: string
  name: string
  group: string
  per100g: Nutrients
  traceFlags: NutrientKey[]
  estimatedFlags: NutrientKey[]
  raw: Record<string, string> // 原表記
}

export function rowToFood(row: unknown[], cols: ColumnMap): MextFood | null {
  const idRaw = cellText(row[cols.foodId]).trim()
  if (!/^\d{1,5}$/.test(idRaw)) return null
  const per100g = {} as Nutrients
  const traceFlags: NutrientKey[] = []
  const estimatedFlags: NutrientKey[] = []
  const raw: Record<string, string> = {}
  for (const key of NUTRIENT_KEYS) {
    const idx = cols.nutrients[key]
    if (idx === undefined) {
      per100g[key] = null
      continue
    }
    const cell = parseCell(row[idx])
    per100g[key] = cell.value
    // アルコールは含まない食品も「-」で載っている（飲料・調味料・菓子など一部の食品だけに数値がある）。
    // そのため「-」を 0 として扱い、欠損表示が全料理に出るのを避ける
    if (key === 'alcohol' && cell.raw === '-') per100g[key] = 0
    raw[key] = cell.raw
    if (cell.trace) traceFlags.push(key)
    if (cell.estimated) estimatedFlags.push(key)
  }
  const id = idRaw.padStart(5, '0')
  if (cols.remarks !== undefined) {
    const caffeine = caffeineFromRemarks(cellText(row[cols.remarks]))
    // 記載のない食品はほとんどがカフェインを含まないので 0。含むはずの食品だけ未収録にする
    per100g.caffeine = caffeine ? caffeine.value : CAFFEINE_UNKNOWN_IDS.includes(id) ? null : 0
    if (caffeine) raw.caffeine = caffeine.raw
    if (caffeine?.trace) traceFlags.push('caffeine')
  }
  return {
    id,
    name: cellText(row[cols.name]).trim(),
    group: cellText(row[cols.group]).trim(),
    per100g,
    traceFlags,
    estimatedFlags,
    raw,
  }
}

// 脂肪酸成分表（第1表 可食部100g当たり）から読む脂肪酸（g）と成分識別子
export const FATTY_ACID_IDS = {
  satFat: ['FASAT'],
  monoUnsatFat: ['FAMS'],
  polyUnsatFat: ['FAPU'],
  n3Fat: ['FAPUN3'],
  n6Fat: ['FAPUN6'],
} satisfies Partial<Record<NutrientKey, string[]>>
export type FattyAcidKey = keyof typeof FATTY_ACID_IDS
const FATTY_ACID_KEYS = Object.keys(FATTY_ACID_IDS) as FattyAcidKey[]

// 脂肪酸成分表の値を食品番号ごとに読む
export function readFattyAcids(rows: unknown[][]): Map<string, Record<FattyAcidKey, ParsedCell>> {
  const cols = findColumns(rows, 'FASAT', FATTY_ACID_IDS)
  const missing = FATTY_ACID_KEYS.filter((k) => cols.nutrients[k] === undefined)
  if (missing.length) throw new Error(`脂肪酸成分表に列がありません: ${missing.join(', ')}`)
  const out = new Map<string, Record<FattyAcidKey, ParsedCell>>()
  for (const row of rows.slice(cols.headerRow + 1)) {
    const id = cellText(row[cols.foodId]).trim()
    if (!/^\d{1,5}$/.test(id)) continue
    const cells = {} as Record<FattyAcidKey, ParsedCell>
    for (const k of FATTY_ACID_KEYS) cells[k] = parseCell(row[cols.nutrients[k]!])
    out.set(id.padStart(5, '0'), cells)
  }
  return out
}

// 本表の食品に脂肪酸を足す。脂肪酸成分表にない食品は、脂質が 0・Tr なら 0、それ以外は欠損のまま
export function applyFattyAcids(food: MextFood, fattyAcids: Map<string, Record<FattyAcidKey, ParsedCell>>): MextFood {
  const cells = fattyAcids.get(food.id)
  const per100g = { ...food.per100g }
  const traceFlags = [...food.traceFlags]
  const estimatedFlags = [...food.estimatedFlags]
  for (const k of FATTY_ACID_KEYS) {
    const cell = cells?.[k]
    if (cell) {
      per100g[k] = cell.value
      if (cell.trace) traceFlags.push(k)
      if (cell.estimated) estimatedFlags.push(k)
    } else if (per100g.fat === 0) {
      per100g[k] = 0
      if (traceFlags.includes('fat')) traceFlags.push(k)
    }
  }
  return { ...food, per100g, traceFlags, estimatedFlags }
}
