import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Catalog } from '../domain/nutrition'
import { RANKING_NUTRIENTS, type PriceTable } from '../domain/ranking'
import { computeTargets, DEFAULT_PROFILE } from '../domain/targets'
import { NUTRIENT_KEYS, type Dish, type Food, type NutrientKey, type Nutrients } from '../domain/types'
import { RAKUTEN_SHELF_KEYS, shopSection } from '../pages/rakuten'
import { AD_NOTICE, RakutenShelf } from './RakutenShelf'
import { RankingView } from './RankingView'

// アプリの「成分ランキング」の画面（/ranking/）の、「楽天市場でさがす」の欄（広告）。中身は、成分ごとの読みもののページと同じ（pages/rakuten.ts）

// テスト用の架空の食品（値は実データではない）
const per100g = (value: number) => Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, value])) as Nutrients
const food = (id: string, name: string, value: number): Food => ({ id, name, displayName: name, kana: name, group: '11', per100g: per100g(value) })
// 画面ははじめ「よく使う食品だけ」を並べるので、上の食品を材料にした架空の料理を1つ置く（料理の材料は、よく使う食品に入る）
const dish = { id: 'test-dish', name: 'テストの料理', ingredients: [{ foodId: '99001', grams: 100 }, { foodId: '99002', grams: 100 }] } as Dish
const catalog: Catalog = {
  dishes: new Map([[dish.id, dish]]),
  myDishes: new Map(),
  products: new Map(),
  foods: new Map([food('99001', 'テストの食品あ', 20), food('99002', 'テストの食品い', 10)].map((f) => [f.id, f])),
}
const prices: PriceTable = new Map()
const targets = computeTargets(DEFAULT_PROFILE)

const view = (nutrient: NutrientKey) => renderToStaticMarkup(<RankingView catalog={catalog} targets={targets} prices={prices} initialNutrient={nutrient} onOpenFood={() => {}} />)
const text = (html: string) => html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, '')
// 欄（section）の中身
const shelfOf = (html: string) => {
  const start = html.indexOf('<section aria-labelledby="shop"')
  return start < 0 ? '' : html.slice(start, html.indexOf('</section>', start))
}

const ALL_KEYS = RANKING_NUTRIENTS.map((n) => n.key)
const NO_SHELF = ALL_KEYS.filter((k) => !RAKUTEN_SHELF_KEYS.includes(k))

describe('成分ランキングの画面の「楽天市場でさがす」の欄（広告）', () => {
  it('欄のある成分を選んでいるときは、その成分の欄を出す（種類の名前のリンクと、商品の画像は、成分のページと同じ）', () => {
    expect(RAKUTEN_SHELF_KEYS).toHaveLength(18)
    for (const key of RAKUTEN_SHELF_KEYS) {
      const shop = shopSection(key)!
      const shelf = shelfOf(view(key))
      expect(text(shelf), key).toContain(`${shop.title}を楽天市場でさがす広告`)
      const links = [...shelf.matchAll(/<a href="([^"]+)"[^>]*>/g)].map((m) => m[1].replace(/&amp;/g, '&'))
      // 種類の名前のリンク（楽天市場の検索結果）
      expect(links.filter((h) => h.includes('/hgc/')), key).toEqual(shop.picks.map((s) => s.href))
      // 商品の例（画像）
      expect(links.filter((h) => h.includes('/ichiba/')), key).toEqual(shop.picks.flatMap((s) => s.items.map((it) => it.href)))
      expect(shelf.match(/<img /g) ?? [], key).toHaveLength(shop.picks.length * 3)
      expect(shelf, key).toContain('loading="lazy"')
    }
  })

  it('楽天へのリンクは、どれも新しいタブでひらき、広告のリンクだと伝える', () => {
    for (const key of RAKUTEN_SHELF_KEYS) {
      const shelf = shelfOf(view(key))
      const rakuten = [...shelf.matchAll(/<a [^>]*>/g)].map((m) => m[0]).filter((a) => a.includes('rakuten.co.jp'))
      expect(rakuten.length, key).toBeGreaterThan(0)
      for (const a of rakuten) {
        expect(a, key).toContain('target="_blank"')
        expect(a, key).toContain('rel="sponsored nofollow noopener"')
        expect(a, key).toContain('広告・新しいタブでひらく')
      }
    }
  })

  it('画面のはじめに、広告があることと、欄へ送るボタンを出す。欄は、ランキングの一覧の下', () => {
    for (const key of RAKUTEN_SHELF_KEYS) {
      const html = view(key)
      const shop = shopSection(key)!
      const notice = html.indexOf(AD_NOTICE)
      const list = html.indexOf('<ol')
      const shelf = html.indexOf('<section aria-labelledby="shop"')
      expect(notice, key).toBeGreaterThan(html.indexOf('</h1>'))
      expect(notice, key).toBeLessThan(list)
      expect(list, key).toBeLessThan(shelf)
      // 一覧の下の、出典の文より後ろ
      expect(html.indexOf('日本食品標準成分表（八訂）増補2023年」をもとに計算しています。'), key).toBeLessThan(shelf)
      // 送るボタン（「#」のリンクにしない：アプリは「#」を、成分を選ぶリンクなどに使う）
      expect(html, key).toMatch(new RegExp(`<button type="button"[^>]*>${shop.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}を楽天市場でさがす<span aria-hidden="true"> ↓</span></button>`))
      expect(html, key).not.toContain('href="#shop"')
    }
  })

  it('欄のない成分（カロリー・脂質・炭水化物・とりすぎに気をつけたい成分など）を選んでいるときは、欄も、広告の知らせも出さない', () => {
    expect(NO_SHELF.sort()).toEqual(['caffeine', 'carb', 'energyKcal', 'fat', 'monoUnsatFat', 'n6Fat', 'salt', 'satFat'])
    for (const key of NO_SHELF) {
      const html = view(key)
      expect(html, key).not.toContain('rakuten')
      expect(html, key).not.toContain('楽天')
      expect(html, key).not.toContain('広告')
    }
  })

  it('使う前の注意と、広告であること・商品の選び方の説明を、欄の中に書く。ランキングの順位は広告と関係がないことも書く', () => {
    const protein = text(shelfOf(view('protein')))
    expect(protein).toContain('食事でとりきれないたんぱく質をおぎなうのに使われる商品を、種類ごとに楽天市場でさがせます。')
    expect(protein).toContain('使う前に')
    expect(protein).toContain('商品に書いてある1日の目安の量を守ってください。')
    expect(protein).toContain('腎臓の病気などで、たんぱく質の量を決められている人は、医師の指示にしたがってください。')
    expect(protein).toContain('楽天アフィリエイトのリンクです。リンクから楽天市場で買い物をすると、モグシルの運営者に紹介料が入ります。ランキングの順位と数値は、広告とは関係なく、食品成分表の値で決めています。')
    expect(protein).toContain('（おすすめの順ではありません。医薬品は選んでいません）')
    expect(shelfOf(view('protein'))).toContain('<a href="/about/#about-ads"')
    // カリウムは飲み物の欄なので、サプリメントの注意は出さない
    const potassium = text(shelfOf(view('potassium')))
    expect(potassium).toContain('ふだんの食事にカリウムを足しやすい飲み物を、種類ごとに楽天市場でさがせます。')
    expect(potassium).not.toContain('サプリメント')
  })

  it('楽天のプログラムは読みこまない。API で商品を出すための印（data-shop…）も付けない', () => {
    for (const key of RAKUTEN_SHELF_KEYS) {
      const html = view(key)
      expect(html, key).not.toContain('<script')
      expect(html, key).not.toContain('data-shop')
      expect(html, key).not.toContain('<template')
    }
  })
})

describe('「楽天市場でさがす」の欄（RakutenShelf）の出し方', () => {
  it('画像を出さない出し方（pictures=false）では、種類の名前のリンクだけにする', () => {
    const shop = shopSection('calcium')!
    const html = renderToStaticMarkup(<RakutenShelf shop={shop} name="カルシウム" pictures={false} />)
    expect(html).not.toContain('<img')
    expect(html).not.toContain('/ichiba/')
    expect((html.match(/\/hgc\//g) ?? []).length).toBe(shop.picks.length)
    expect(text(html)).toContain('種類の名前を押すと、楽天市場の検索結果を新しいタブでひらきます。')
    expect(text(html)).not.toContain('商品の例は、')
  })
})
