import { describe, expect, it } from 'vitest'
import { applyFattyAcids, caffeineFromRemarks, cellText, findColumns, parseCell, readFattyAcids, rowToFood } from './mext'

describe('成分値の表記', () => {
  it.each([
    ['12.3', 12.3, false, false],
    [5, 5, false, false],
    ['Tr', 0, true, false],
    ['(Tr)', 0, true, true],
    ['(1.5)', 1.5, false, true],
    ['-', null, false, false],
    ['*', null, false, false],
    ['', null, false, false],
    [undefined, null, false, false],
    ['14.0†', 14, false, false],
  ])('%s', (input, value, trace, estimated) => {
    const c = parseCell(input)
    expect(c.value).toBe(value)
    expect(c.trace).toBe(trace)
    expect(c.estimated).toBe(estimated)
  })
})

describe('セル値の文字列化', () => {
  it('書式つき文字列・計算セルを文字列にする', () => {
    expect(cellText({ richText: [{ text: 'こめ　' }, { text: '精白米' }] })).toBe('こめ　精白米')
    expect(cellText({ formula: 'A1', result: 12 })).toBe('12')
    expect(cellText(null)).toBe('')
  })
})

describe('Excel の列の特定と行の変換', () => {
  // 実ファイルの構造を模した最小の表（値は架空）
  const rows: unknown[][] = [
    ['食品群', '食品番号', '索引番号', '食品名', 'エネルギー', 'たんぱく質', '脂質', '炭水化物', '食塩相当量'],
    [null, null, null, null, 'ENERC_KCAL', 'PROT-', 'FAT-', 'CHOCDF-', 'NACL_EQ'],
    ['01', '1088', '1', { richText: [{ text: 'こめ　［水稲めし］　精白米' }] }, 156, '(2.5)', 'Tr', 37.1, '-'],
    ['', '', '', '（注記行）', '', '', '', '', ''],
  ]

  it('成分識別子で列を見つける', () => {
    const cols = findColumns(rows)
    expect(cols.headerRow).toBe(1)
    expect(cols.foodId).toBe(1)
    expect(cols.nutrients.energyKcal).toBe(4)
    expect(cols.nutrients.salt).toBe(8)
    expect(cols.nutrients.alcohol).toBeUndefined()
  })

  it('食品番号を5桁に揃え、表記を変換する', () => {
    const cols = findColumns(rows)
    const f = rowToFood(rows[2], cols)!
    expect(f.id).toBe('01088')
    expect(f.name).toBe('こめ　［水稲めし］　精白米')
    expect(f.per100g.energyKcal).toBe(156)
    expect(f.per100g.protein).toBe(2.5)
    expect(f.per100g.fat).toBe(0)
    expect(f.per100g.salt).toBeNull()
    expect(f.per100g.alcohol).toBeNull()
    expect(f.traceFlags).toEqual(['fat'])
    expect(f.estimatedFlags).toEqual(['protein'])
    expect(rowToFood(rows[3], cols)).toBeNull()
  })

  it('アルコールの「-」は 0、他の成分の「-」は欠損', () => {
    const r = [
      ['食品群', '食品番号', '食品名', 'エネルギー', 'アルコール', '食塩相当量'],
      [null, null, null, 'ENERC_KCAL', 'ALC', 'NACL_EQ'],
      ['06', '6001', 'ほうれんそう', 18, '-', '-'],
    ]
    const f = rowToFood(r[2], findColumns(r))!
    expect(f.per100g.alcohol).toBe(0)
    expect(f.per100g.salt).toBeNull()
  })
})

describe('脂肪酸成分表の飽和脂肪酸', () => {
  // 値は架空
  const rows: unknown[][] = [
    ['食品群', '食品番号', '索引番号', '食品名', '脂質', '飽和脂肪酸', '一価不飽和脂肪酸', '多価不飽和脂肪酸', 'n-3系', 'n-6系'],
    [null, null, null, '成分識別子', 'FAT-', 'FASAT', 'FAMS', 'FAPU', 'FAPUN3', 'FAPUN6'],
    ['01', '01001', '1', 'テスト穀物', '6.0', '1.18', '2.0', '2.5', '0.1', '2.4'],
    ['01', '01002', '2', 'テスト穀物2', '1.3', '(0.22)', '0.3', 'Tr', 'Tr', 'Tr'],
  ]
  const base = (id: string, fat: number | null, traceFat = false) => {
    const cols = findColumns([
      ['食品群', '食品番号', '食品名', 'エネルギー', '脂質'],
      [null, null, null, 'ENERC_KCAL', 'FAT-'],
    ])
    return rowToFood(['01', id, 'x', 100, traceFat ? 'Tr' : fat === null ? '-' : fat], cols)!
  }

  it('食品番号ごとに読み、推定値の印を引き継ぐ', () => {
    const sat = readFattyAcids(rows)
    expect(sat.get('01001')?.satFat.value).toBe(1.18)
    expect(sat.get('01001')?.n6Fat.value).toBe(2.4)
    const f = applyFattyAcids(base('01002', 1.3), sat)
    expect(f.per100g.satFat).toBe(0.22)
    expect(f.per100g.monoUnsatFat).toBe(0.3)
    expect(f.per100g.n3Fat).toBe(0)
    expect(f.estimatedFlags).toContain('satFat')
    expect(f.traceFlags).toContain('polyUnsatFat')
  })

  it('脂肪酸成分表にない食品は、脂質が 0・Tr なら 0、それ以外は欠損', () => {
    const sat = readFattyAcids(rows)
    expect(applyFattyAcids(base('03003', 0), sat).per100g.satFat).toBe(0)
    expect(applyFattyAcids(base('03003', 0), sat).per100g.n3Fat).toBe(0)
    const tr = applyFattyAcids(base('03004', 0, true), sat)
    expect(tr.per100g.satFat).toBe(0)
    expect(tr.traceFlags).toContain('satFat')
    expect(applyFattyAcids(base('06001', 0.5), sat).per100g.satFat).toBeNull()
    expect(applyFattyAcids(base('06002', null), sat).per100g.satFat).toBeNull()
  })
})

describe('備考のカフェイン', () => {
  it('g/100g を mg に直して読む', () => {
    expect(caffeineFromRemarks('浸出法： コーヒー粉末 10 g/熱湯150 mL カフェイン： 0.06 g、タンニン： 0.25 g')).toMatchObject({ value: 60, trace: false })
    expect(caffeineFromRemarks('テオブロミン： 0.5 g、カフェイン： 0.1g、ポリフェノール： 1.4 g')).toMatchObject({ value: 100 })
    expect(caffeineFromRemarks('カフェイン： Tr、ポリフェノール： 0.4 g')).toMatchObject({ value: 0, trace: true })
    expect(caffeineFromRemarks('別名： 純ココア')).toBeNull()
  })
})
