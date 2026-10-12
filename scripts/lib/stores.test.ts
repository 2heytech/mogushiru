import { describe, expect, it } from 'vitest'
import {
  isAmbiguousItem,
  isAmbiguousSevenItem,
  labelBasis,
  parseAmount,
  parseFamimaSafety,
  parseLabelText,
  parseLawsonDetail,
  parsePrice,
  parseSevenItem,
  parseTopvaluDetail,
  specAmount,
  toStoreProduct,
} from './stores'

describe('parseAmount', () => {
  it('数・全角・幅・微量を読む', () => {
    expect(parseAmount('16.2g')).toBe(16.2)
    expect(parseAmount('１．５０g')).toBe(1.5)
    expect(parseAmount('1.2〜1.6g')).toBe(1.4)
    expect(parseAmount('Tr')).toBe(0)
    expect(parseAmount('-')).toBeNull()
  })
})

describe('parseLabelText', () => {
  it('セブン-イレブンの1行の表示を読む', () => {
    expect(parseLabelText('熱量：556kcal、たんぱく質：16.2g、脂質：20.4g、炭水化物：78.5g（糖質：75.2g、食物繊維：3.3g）、食塩相当量：3.6g')).toEqual({
      energyKcal: 556,
      protein: 16.2,
      fat: 20.4,
      carb: 78.5,
      salt: 3.6,
      fiber: 3.3,
    })
  })
  it('必須の5項目がそろわなければ null', () => {
    expect(parseLabelText('熱量：556kcal、たんぱく質：16.2g')).toBeNull()
  })
})

describe('parsePrice', () => {
  it('税込の価格を取る', () => {
    expect(parsePrice('<p>398円（税込429.84円）</p>')).toBe(430)
    expect(parsePrice('<dd><span>297</span><span>円(税込)</span></dd>')).toBe(297)
    expect(parsePrice('本体価格 298円（税込価格 321.84円）')).toBe(322)
  })
})

describe('parseSevenItem', () => {
  const html = `<div class="item_ttl">
      <h1>おむすび＆おかず　焼鮭</h1></div>
    <div class="item_price"><p>398円（税込429.84円）</p></div>
    <tr><th>栄養成分</th>
      <td>熱量：556kcal、たんぱく質：16.2g、脂質：20.4g、炭水化物：78.5g（糖質：75.2g、食物繊維：3.3g）、食塩相当量：3.6g</td></tr>`
  it('商品名・価格・栄養成分を読む', () => {
    const item = parseSevenItem(html, '040114')
    expect(item?.name).toBe('おむすび＆おかず　焼鮭')
    expect(item?.priceYen).toBe(430)
    expect(item?.label.energyKcal).toBe(556)
    expect(item?.url).toBe('https://www.sej.co.jp/products/a/item/040114/')
  })
})

describe('parseLawsonDetail', () => {
  const html = `<h2 class="ttl">プレミアムおにぎり　焼さけハラミ</h2>
    <dl class="price"><dt>ローソン標準価格</dt><dd><span>297</span><span>円(税込)</span></dd></dl>
    <div class="nutritionFacts_table"><div class="table ac_box">
      <h3>栄養成分<span>【1包装当たり】</span></h3>
      <div id="nutritionFacts_table_in" class="ac_wrap"><div class="ac_in"><ul class="tbody">
        <li><dl><dt>熱量</dt><dd>204kcal</dd></dl></li>
        <li><dl><dt>たんぱく質</dt><dd>6.6g</dd></dl></li>
        <li><dl><dt>脂質</dt><dd>3.3g</dd></dl></li>
        <li><dl><dt>炭水化物</dt><dd>37.5g</dd></dl><ul>
          <li><dl><dt>糖質</dt><dd>36.6g</dd></dl></li>
          <li><dl><dt>食物繊維</dt><dd>0.9g</dd></dl></li></ul></li>
        <li><dl><dt>食塩相当量</dt><dd>1.50g</dd></dl></li>
      </ul></div></div>
    </div></div>`
  it('商品名・表示単位・栄養成分を読む', () => {
    const item = parseLawsonDetail(html, '1507092_1996')
    expect(item).toMatchObject({
      name: 'プレミアムおにぎり　焼さけハラミ',
      per: '1包装当たり',
      priceYen: 297,
      label: { energyKcal: 204, protein: 6.6, fat: 3.3, carb: 37.5, salt: 1.5, fiber: 0.9 },
    })
  })
})

describe('parseFamimaSafety', () => {
  const row = (name: string) => `<p class="name">${name}</p>
    <table class="item_nutritional_info"><tbody>
      <tr><th class="tit_nut">熱量<br>（kcal）</th><th class="tit_nut">たんぱく質<br>（g）</th><th class="tit_nut">脂質<br>（g）</th>
        <th class="tit_nut">炭水化物<br>（g）</th><th class="tit_nut">食塩相当量<br>（g）</th></tr>
      <tr><td class="con_nut">170.00</td><td class="con_nut">4.10</td><td class="con_nut">1.60</td><td class="con_nut">35.10</td><td class="con_nut">1.20</td></tr>
    </tbody></table>`
  it('一覧の商品ごとに栄養成分を読む。商品ページのない品はカテゴリページを出典にする', () => {
    const page = 'https://www.family.co.jp/goods/safety/goods010.html'
    const items = parseFamimaSafety(row('<a href="https://www.family.co.jp/goods/omusubi/0410151.html">手巻　紅しゃけ</a>') + row('ブレンドS　軽め'), page)
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ code: '0410151', name: '手巻　紅しゃけ', url: 'https://www.family.co.jp/goods/omusubi/0410151.html' })
    expect(items[0].label).toEqual({ energyKcal: 170, protein: 4.1, fat: 1.6, carb: 35.1, salt: 1.2 })
    expect(items[1]).toMatchObject({ code: 'n-ブレンドS　軽め', url: page })
  })
})

describe('toStoreProduct', () => {
  it('1食分の市販品にし、出典URLと取得日を持たせる', () => {
    const p = toStoreProduct({
      store: 'lawson',
      code: '1507092_1996',
      name: 'プレミアムおにぎり　焼さけハラミ',
      category: 'onigiri',
      url: 'https://www.lawson.co.jp/recommend/original/detail/1507092_1996.html',
      label: { energyKcal: 204, protein: 6.6, fat: 3.3, carb: 37.5, salt: 1.5 },
      fetchedAt: '2026-10-11',
    })
    expect(p).toMatchObject({ jan: 'lawson-1507092_1996', brand: 'ローソン', basis: 'serving', category: 'onigiri' })
    expect(p.nutrients).toMatchObject({ energyKcal: 204, salt: 1.5, alcohol: 0, fiber: null, calcium: null })
    expect(p.source).toEqual({ name: 'ローソン', url: 'https://www.lawson.co.jp/recommend/original/detail/1507092_1996.html', fetchedAt: '2026-10-11' })
  })
})

describe('labelBasis', () => {
  it('量当たりの表示と1回分の表示を見分ける', () => {
    expect(labelBasis('100g当たり')).toEqual({ grams: 100, unit: 'g' })
    expect(labelBasis('15g当たり')).toEqual({ grams: 15, unit: 'g' })
    expect(labelBasis('100ml当たり')).toEqual({ grams: 100, unit: 'ml' })
    expect(labelBasis('1個当たり')).toEqual({ label: '1個' })
    expect(labelBasis('1袋(40g)当たり')).toEqual({ grams: 40, unit: 'g', serving: 40 })
    expect(labelBasis('1本（240ml）当たり')).toEqual({ grams: 240, unit: 'ml', serving: 240 })
    expect(labelBasis('1食(5個入)当たり')).toEqual({ label: '1食(5個入)' })
    expect(labelBasis('可食部100g当たり')).toEqual({ grams: 100, unit: 'g' })
    expect(labelBasis('大さじ1杯(15ml)当たり')).toEqual({ grams: 15, unit: 'ml', serving: 15 })
    expect(labelBasis('鶏卵1個(可食部44g)当たり')).toEqual({ grams: 44, unit: 'g', serving: 44 })
    expect(labelBasis('1食(めん60g)当たり')).toEqual({ label: '1食(めん60g)' })
    expect(labelBasis('1枚(60g:平均値)当たり')).toEqual({ grams: 60, unit: 'g', serving: 60 })
    expect(labelBasis('1個(標準13.5g)当たり')).toEqual({ grams: 13.5, unit: 'g', serving: 13.5 })
    expect(labelBasis('1包装当たり')).toEqual({})
    expect(labelBasis(undefined)).toEqual({})
  })
  it('15g当たりの表示は100g当たりに直す', () => {
    const p = toStoreProduct({
      store: 'lawson', code: 'x', name: 'ふりかけ', category: 'seasoning', url: 'https://example.com', per: '15g当たり', fetchedAt: '2026-10-11',
      label: { energyKcal: 60, protein: 3, fat: 1.5, carb: 9, salt: 1.2 },
    })
    expect(p.basis).toBe('100g')
    expect(p.nutrients.energyKcal).toBe(400)
    expect(p.nutrients.salt).toBe(8)
  })
})

describe('isAmbiguousSevenItem', () => {
  it('表示の単位が書かれていないセブンプレミアムの加工品は除く', () => {
    expect(isAmbiguousSevenItem({ store: 'seven', name: '７プレミアム　ザ・ブリュー　３５０ｍｌ' })).toBe(true)
    expect(isAmbiguousSevenItem({ store: 'seven', name: '7P 鉄板焼きハンバーグ' })).toBe(true)
    expect(isAmbiguousSevenItem({ store: 'seven', name: '手巻おにぎり　ツナマヨネーズ' })).toBe(false)
    expect(isAmbiguousSevenItem({ store: 'lawson', name: '7プレミアム' })).toBe(false)
  })
})

describe('parseTopvaluDetail', () => {
  const html = `<h1 class="item-detail__name">焼肉用(北海道)</h1>
    <dl class="item-detail__specs">
      <dt class="item-detail__specs__field">規格：</dt>
      <dd class="item-detail__specs__value">200g</dd>
      <dt class="item-detail__specs__field">JAN：</dt>
      <dd class="item-detail__specs__value">4549414000000</dd>
    </dl>
    <div class="item-detail__specs item-detail__specs--price">
      <p class="item-detail__specs__strong">本体価格&nbsp;<span>298</span>円</p>
      <p class="item-detail__specs__strong">（税込価格&nbsp;<span>321.84</span>円）</p>
    </div>
    <div class="infoBox"><dl><dt>保存方法</dt><dd>要冷蔵</dd></dl><dl><dt>栄養成分</dt><dd>100g当たり エネルギー40kcal たんぱく質1.2g 脂質0.2g 炭水化物9.4g 糖質7.3g 食物繊維2.1g 食塩相当量0.01g この表示値は、目安です。</dd></dl></div>`
  it('商品名・規格・価格・表示の単位・栄養成分を読む', () => {
    expect(parseTopvaluDetail(html, '4549414000000')).toEqual({
      store: 'topvalu',
      code: '4549414000000',
      name: '焼肉用(北海道)',
      url: 'https://www.topvalu.net/items/detail/4549414000000/',
      label: { energyKcal: 40, protein: 1.2, fat: 0.2, carb: 9.4, salt: 0.01, fiber: 2.1 },
      per: '100g当たり',
      spec: '200g',
      priceYen: 322,
    })
  })
  it('調理前・調理後など表示が2つあるときは最初の表示を使う', () => {
    const two = html.replace(/100g当たり[^<]*/, '1食(めん80g)当たり エネルギー300kcal たんぱく質8g 脂質1g 炭水化物60g 食塩相当量5g 調理後 エネルギー320kcal たんぱく質9g 脂質2g 炭水化物61g 食塩相当量5.5g')
    expect(parseTopvaluDetail(two, '1')?.label).toEqual({ energyKcal: 300, protein: 8, fat: 1, carb: 60, salt: 5 })
  })
  it('内容量が食べきりの大きさなら1回分の量にする', () => {
    const item = parseTopvaluDetail(html, '4549414000000')!
    const p = toStoreProduct({ ...item, category: 'side', fetchedAt: '2026-10-12' })
    expect(p).toMatchObject({ jan: 'topvalu-4549414000000', brand: 'トップバリュ', basis: '100g', servingGrams: 200 })
    // 食材は1袋で何回分にもなるので内容量は使わない
    expect(toStoreProduct({ ...item, category: 'ingredient', fetchedAt: '2026-10-12' }).servingGrams).toBeUndefined()
  })
})

describe('specAmount', () => {
  it('1個分の量。大きな袋は使わない', () => {
    expect(specAmount('200g')).toBe(200)
    expect(specAmount('170g×4')).toBe(170)
    expect(specAmount('５００ｍｌ')).toBe(500)
    expect(specAmount('1000ml')).toBeUndefined()
    expect(specAmount('400g')).toBeUndefined()
    expect(specAmount('1パック')).toBeUndefined()
  })
})

describe('isAmbiguousItem', () => {
  it('表示の単位が書かれていないトップバリュの商品は除く', () => {
    expect(isAmbiguousItem({ store: 'topvalu', name: 'みそ', per: undefined })).toBe(true)
    expect(isAmbiguousItem({ store: 'topvalu', name: 'みそ', per: '当たり' })).toBe(true)
    expect(isAmbiguousItem({ store: 'topvalu', name: 'みそ', per: '100g当たり' })).toBe(false)
    expect(isAmbiguousItem({ store: 'seven', name: '7P ハンバーグ' })).toBe(true)
  })
})
