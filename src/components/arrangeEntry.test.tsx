import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { menuTotals, type Catalog } from '../domain/nutrition'
import { computeTargets } from '../domain/targets'
import { NUTRIENT_KEYS, type DayMenu, type Dish, type Nutrients, type Product } from '../domain/types'
import { SlotStrip } from './SlotStrip'
import { ArrangeLink, BackRow, StartChoice } from './StartChoice'

// 「料理をアレンジ」は上のメニューに出さないので、栄養バランスの中の入口がなくならないことを確かめる

const noop = () => {}

describe('「料理をアレンジ」の入口（栄養バランスの中）', () => {
  it('入口は /customize/ へのリンク（URL は前のまま）', () => {
    const html = renderToStaticMarkup(<ArrangeLink onClick={noop} />)
    expect(html).toContain('href="/customize/"')
    expect(html).toContain('料理をアレンジ')
  })

  it('最初の画面：保存した食事がなくても、入口の下に出す', () => {
    const start = (savedCount: number) =>
      renderToStaticMarkup(<StartChoice savedCount={savedCount} previewLoading onResume={noop} onPickSelf={noop} onBuild={noop} onOpenSaved={noop} onArrange={noop} onTrySample={noop} />)
    expect(start(0)).toContain('href="/customize/"')
    expect(start(0)).not.toContain('保存した食事を呼び出す')
    expect(start(2)).toContain('href="/customize/"')
    expect(start(2)).toContain('保存した食事を呼び出す')
    // 入口（献立の例から選ぶ・自分の食事で試す）のあとに置く
    expect(start(0).indexOf('自分の食事で試す')).toBeGreaterThan(0)
    expect(start(0).indexOf('自分の食事で試す')).toBeLessThan(start(0).indexOf('href="/customize/"'))
  })

  it('1日の食事の上の行：左にもどり口、右に入口。せまい幅用の短い名前も持つ', () => {
    const html = renderToStaticMarkup(
      <BackRow label="最初の画面にもどる" shortLabel="最初の画面へ" onClick={noop}>
        <ArrangeLink onClick={noop} />
      </BackRow>,
    )
    expect(html).toContain('最初の画面にもどる')
    expect(html).toContain('最初の画面へ')
    expect(html.indexOf('最初の画面にもどる')).toBeLessThan(html.indexOf('href="/customize/"'))
  })
})

// テスト用の架空の料理・商品（値は実データではない）
const n = (over: Partial<Nutrients> = {}): Nutrients => ({ ...(Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, 0])) as Nutrients), ...over })
const dish = (id: string, name: string, over: Partial<Dish> = {}): Dish =>
  ({ id, name, kana: name, category: 'main', suggestedSlots: ['dinner'], illustration: '', ingredients: [], nutrients: n({ energyKcal: 300 }), ...over }) as Dish
const product: Product = {
  jan: 'test-1',
  name: 'テストのおにぎり',
  brand: 'テスト食品',
  category: 'staple',
  basis: 'serving',
  nutrients: n({ energyKcal: 180 }),
  source: { name: 'テスト食品', url: 'https://example.com/p', fetchedAt: '2026-11-01' },
}
const catalog: Catalog = {
  foods: new Map(),
  dishes: new Map([dish('d-nikujaga', '肉じゃが')].map((d) => [d.id, d])),
  products: new Map([[product.jan, product]]),
  myDishes: new Map([['m1', { id: 'm1', baseDishId: 'd-nikujaga', name: '肉じゃが（豚肉）', ingredients: [], createdAt: '2026-11-18' }]]),
}

describe('1日の食事の料理の行', () => {
  const menu: DayMenu = {
    breakfast: [{ uid: 'a', kind: 'product', refId: 'test-1', portion: 1 }],
    lunch: [],
    dinner: [
      { uid: 'b', kind: 'dish', refId: 'd-nikujaga', portion: 1 },
      { uid: 'c', kind: 'myDish', refId: 'm1', portion: 1 },
    ],
    other: [],
  }
  const html = renderToStaticMarkup(
    <SlotStrip
      menu={menu}
      totals={menuTotals(menu, catalog)}
      targets={computeTargets({ sex: 'female', age: 35, activity: 'normal' })}
      catalog={catalog}
      open={null}
      onOpenChange={noop}
      onAdd={noop}
      onRemove={noop}
      onDrink={noop}
      onEdit={noop}
    />,
  )
  // 広い画面の一覧（スマホの一覧は、食事をひらいたときだけ出る）から、名前の入った行のボタンを取り出す
  const row = (name: string) => html.split('<li').find((li) => li.includes(`${name}<`)) ?? ''

  it('材料まで変えられる料理（料理・お気に入りの料理）に「アレンジ」と出す', () => {
    expect(row('肉じゃが')).toContain('アレンジ')
    expect(row('肉じゃが（豚肉）')).toContain('アレンジ')
  })

  it('量だけ変える市販品には出さない', () => {
    expect(row('テストのおにぎり')).not.toBe('')
    expect(row('テストのおにぎり')).not.toContain('アレンジ')
  })
})
