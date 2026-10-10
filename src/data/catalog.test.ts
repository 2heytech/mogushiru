import { describe, expect, it } from 'vitest'
import type { Product } from '../domain/types'
import { withMyData } from './catalog'

describe('お気に入りを足したカタログ', () => {
  it('登録した市販品を市販品に加え、元のカタログは変えない', () => {
    const base = { dishes: new Map(), foods: new Map(), products: new Map([['490', { jan: '490' } as Product]]) }
    const mine = { jan: 'my-1', name: 'バー' } as Product
    const c = withMyData(base, [], [mine])
    expect([...c.products.keys()]).toEqual(['490', 'my-1'])
    expect(base.products.size).toBe(1)
  })
})
