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
  vitaminA: ['VITA_RAE'],
  vitaminD: ['VITD'],
  vitaminB1: ['THIA'],
  vitaminB2: ['RIBF'],
  vitaminC: ['VITC'],
}

export type ParsedCell = { value: number | null; trace: boolean; estimated: boolean; raw: string }

// 成分値の表記：数値、Tr（微量）、(数値)・(Tr)（推定値）、-（未測定）、*（未算出）、空欄
export function parseCell(input: unknown): ParsedCell {
  const raw = input === null || input === undefined ? '' : String(input).trim()
  let s = raw
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
}

// rows: シートを二次元配列にしたもの
export function findColumns(rows: unknown[][]): ColumnMap {
  const headerRow = rows.findIndex((r) => r.some((c) => String(c ?? '').trim() === 'ENERC_KCAL'))
  if (headerRow < 0) throw new Error('成分識別子（ENERC_KCAL）の行が見つかりません')
  const ids = rows[headerRow].map((c) => String(c ?? '').trim())
  const nutrients: Partial<Record<NutrientKey, number>> = {}
  for (const [key, candidates] of Object.entries(COMPONENT_IDS) as [NutrientKey, string[]][]) {
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
      const idx = rows[r].findIndex((c) => String(c ?? '').replace(/\s/g, '') === label)
      if (idx >= 0) return idx
    }
    throw new Error(`見出し「${label}」が見つかりません`)
  }
  return { headerRow, foodId: findLabel('食品番号'), name: findLabel('食品名'), group: findLabel('食品群'), nutrients }
}

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
  const idRaw = String(row[cols.foodId] ?? '').trim()
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
    raw[key] = cell.raw
    if (cell.trace) traceFlags.push(key)
    if (cell.estimated) estimatedFlags.push(key)
  }
  return {
    id: idRaw.padStart(5, '0'),
    name: String(row[cols.name] ?? '').trim(),
    group: String(row[cols.group] ?? '').trim(),
    per100g,
    traceFlags,
    estimatedFlags,
    raw,
  }
}
