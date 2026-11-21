import { describe, expect, it, vi } from 'vitest'
import type { Product } from '../domain/types'
import { catalogState, fetchWithRetry, STORES_DATA_NAME, withMyData } from './catalog'
import { mergeProducts, withNullNutrients } from './products'

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

describe('読み終えたデータから、画面にわたす形を作る', () => {
  const other = { jan: '490', name: 'ほかの市販品', basis: '100g' } as Product
  const store = { jan: 'seven-1', name: 'お店の商品', basis: 'serving' } as Product
  const main = (failed: string[] = []) => ({
    catalog: { dishes: new Map(), foods: new Map(), products: mergeProducts([], [other]) },
    others: [other],
    productCategories: {},
    failed,
  })

  it('料理・食材を読み終えるまでは、読み込み中', () => {
    expect(catalogState(null, null)).toEqual({ status: 'loading' })
    // コンビニ・メーカーの商品だけ先に届いても、まだ出さない
    expect(catalogState(null, [store])).toEqual({ status: 'loading' })
  })

  it('コンビニ・メーカーの商品をまだ読んでいないときは、そのほかの市販品だけ（読み込めなかった扱いにしない）', () => {
    const s = catalogState(main(), null)
    expect(s).toMatchObject({ status: 'ready', failed: [], storesLoaded: false })
    expect(s.status === 'ready' && [...s.catalog.products.keys()]).toEqual(['490'])
  })

  it('読み終えたら、コンビニ・メーカーの商品を先にして足す', () => {
    const s = catalogState(main(), [store])
    expect(s).toMatchObject({ status: 'ready', failed: [], storesLoaded: true })
    expect(s.status === 'ready' && [...s.catalog.products.keys()]).toEqual(['seven-1', '490'])
  })

  it('読み込めなかったデータは、名前を failed に入れる（空のまま画面は出す）', () => {
    const s = catalogState(main(['料理']), 'failed')
    expect(s).toMatchObject({ status: 'ready', failed: ['料理', STORES_DATA_NAME], storesLoaded: true })
    expect(s.status === 'ready' && [...s.catalog.products.keys()]).toEqual(['490'])
  })
})

describe('読み込みに失敗したら、もう1回だけ試す', () => {
  it('2回目で読めたら、その値を返す', async () => {
    const read = vi.fn<() => Promise<string | null>>().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce('ok')
    expect(await fetchWithRetry(read, 2, 0)).toBe('ok')
    expect(read).toHaveBeenCalledTimes(2)
  })

  it('1回目で読めたら、くり返さない', async () => {
    const read = vi.fn<() => Promise<string | null>>().mockResolvedValue('ok')
    expect(await fetchWithRetry(read, 2, 0)).toBe('ok')
    expect(read).toHaveBeenCalledTimes(1)
  })

  it('どちらもだめなら null（エラーを投げない。サーバーがエラーを返したときも同じ）', async () => {
    const read = vi.fn<() => Promise<string | null>>().mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('offline'))
    expect(await fetchWithRetry(read, 2, 0)).toBeNull()
    expect(read).toHaveBeenCalledTimes(2)
  })
})
