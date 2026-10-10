import { describe, expect, it } from 'vitest'
import { buildFoodPrices, parseKouriSheet, readRefuse, type KouriItem } from './prices'

describe('小売物価統計のシート', () => {
  it('見出しの銘柄・単位と、年平均価格の中央値を取り出す', () => {
    const rows: unknown[][] = [
      [null, null, '銘柄符号：', 1401],
      [null, null, '品目：', 'キャベツ'],
      [null, null, '銘柄：', ''],
      [null, null, '単位：', '1kg'],
      [null, '地域コード', '地域', '年平均', 1],
      ['01100', '01100', '札幌市', 300, 280],
      ['13100', '13100', '東京都区部', 200, 210],
      ['27100', '27100', '大阪市', 250, 240],
      ['99999', '99999', '某市', '-', '-'],
    ]
    expect(parseKouriSheet(rows)).toEqual({ code: '1401', item: 'キャベツ', spec: '', unit: '1kg', medianYen: 250, cities: 3 })
  })
  it('価格のないシートは null', () => {
    expect(parseKouriSheet([[null, '表題：', 'なにか']])).toBeNull()
  })
})

describe('食品ごとの価格', () => {
  const items: KouriItem[] = [
    { code: '1401', item: 'キャベツ', spec: '', unit: '1kg', medianYen: 300, cities: 80 },
    { code: '1001', item: 'うるち米', spec: '', unit: '1袋', medianYen: 4200, cities: 80 },
  ]
  const refuse = new Map([['06061', 15]])

  it('100gあたりに直し、皮・芯を含む品目は廃棄率で可食部の価格にする', () => {
    const [cabbage] = buildFoodPrices(items, [{ code: '1401', unit: '1kg', grams: 1000, foodIds: ['06061'], includesRefuse: true }], refuse)
    expect(cabbage.yenPer100g).toBeCloseTo(35.3, 1)
  })
  it('調理後の食品には重量変化で割る', () => {
    const [rice, cooked] = buildFoodPrices(
      items,
      [
        { code: '1001', unit: '1袋', grams: 5000, foodIds: ['01083'] },
        { code: '1001', unit: '1袋', grams: 5000, foodIds: ['01088'], cookedYield: 2.1 },
      ],
      refuse,
    )
    expect(rice.yenPer100g).toBe(84)
    expect(cooked.yenPer100g).toBe(40)
  })
  it('単位が変わっていたら止める', () => {
    expect(() => buildFoodPrices(items, [{ code: '1401', unit: '1個', grams: 1000, foodIds: ['06061'] }], refuse)).toThrow('単位')
  })
  it('同じ食品に2つの価格を当てたら止める', () => {
    const map = [
      { code: '1401', unit: '1kg', grams: 1000, foodIds: ['06061'] },
      { code: '1001', unit: '1袋', grams: 5000, foodIds: ['06061'] },
    ]
    expect(() => buildFoodPrices(items, map, refuse)).toThrow('2つ')
  })
})

describe('成分表の廃棄率', () => {
  it('REFUSE 列から食品番号ごとに読む', () => {
    const rows: unknown[][] = [
      ['食品群', '食品番号', '食品名', '廃棄率'],
      [null, null, '成分識別子', 'REFUSE'],
      ['06', '06061', 'キャベツ', 15],
      ['01', '01083', '精白米', 0],
    ]
    expect([...readRefuse(rows)]).toEqual([
      ['06061', 15],
      ['01083', 0],
    ])
  })
})
