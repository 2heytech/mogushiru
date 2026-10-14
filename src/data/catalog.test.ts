import { describe, expect, it } from 'vitest'
import type { Product } from '../domain/types'
import { mergeProducts, withMyData, withNullNutrients } from './catalog'

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
  it('トップバリュの商品は JAN の部分で同じ商品とみなし、古い JAN も同じ商品を指す', () => {
    const tv = { jan: 'topvalu-4549414093889', name: '公式', basis: '100g' } as Product
    const off = { jan: '4549414093889', name: 'Open Food Facts', basis: '100g' } as Product
    const m = mergeProducts([tv], [off])
    expect(m.get('4549414093889')).toBe(tv)
    expect(new Set(m.values()).size).toBe(1)
  })
  it('表示の単位がちがうときは古い商品をそのまま残す', () => {
    const tv = { jan: 'topvalu-4549414093889', basis: 'serving' } as Product
    const off = { jan: '4549414093889', basis: '100g' } as Product
    expect(mergeProducts([tv], [off]).get('4549414093889')).toBe(off)
  })
})

describe('省いた栄養素を補う', () => {
  it('書かれていない栄養素は null にする', () => {
    const p = withNullNutrients({ jan: 'x', nutrients: { energyKcal: 100, protein: 1, fat: 2, carb: 3, salt: 0.1 } } as unknown as Product)
    expect(p.nutrients.energyKcal).toBe(100)
    expect(p.nutrients.calcium).toBeNull()
    expect(Object.keys(p.nutrients)).toHaveLength(Object.keys(withNullNutrients({ jan: 'y', nutrients: {} } as unknown as Product).nutrients).length)
  })
})
