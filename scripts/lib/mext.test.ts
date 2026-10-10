import { describe, expect, it } from 'vitest'
import { cellText, findColumns, parseCell, rowToFood } from './mext'

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
