import { describe, expect, it } from 'vitest'
import type { Product } from '../domain/types'
import { mergeProducts, withMyData } from './catalog'

describe('お気に入りを足したカタログ', () => {
  it('登録した市販品を市販品に加え、元のカタログは変えない', () => {
    const base = { dishes: new Map(), foods: new Map(), products: new Map([['490', { jan: '490' } as Product]]) }
    const mine = { jan: 'my-1', name: 'バー' } as Product
    const c = withMyData(base, [], [mine])
    expect([...c.products.keys()]).toEqual(['490', 'my-1'])
    expect(base.products.size).toBe(1)
  })
})

describe('公式サイトの商品とほかの市販品をまとめる', () => {
  it('公式サイトの商品を先に並べ、同じJANは公式サイトの値を使う', () => {
    const official = [{ jan: 'seven-1', name: 'おにぎり' }, { jan: '490', name: '公式の値' }] as Product[]
    const others = [{ jan: '490', name: 'Open Food Facts の値' }, { jan: '491', name: 'ほか' }] as Product[]
    const m = mergeProducts(official, others)
    expect([...m.keys()]).toEqual(['seven-1', '490', '491'])
    expect(m.get('490')?.name).toBe('公式の値')
  })
})
