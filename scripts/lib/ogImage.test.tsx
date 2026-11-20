import { describe, expect, it } from 'vitest'
import { OG_HEIGHT, OG_WIDTH, recipeImageSvg, renderOgPng, renderRecipePng } from './ogImage'

// 画像を作るしくみ（書体の読みこみ・絵の埋めこみ）がこわれていないかを、1枚作ってたしかめる
describe('共有の画像', () => {
  it('1200×630 の PNG ができる', async () => {
    const png = await renderOgPng({
      title: '鉄分が多い食品ランキング',
      sub: 'ふだん1回に食べる量でくらべる',
      rows: [{ name: '豚レバー（生）', value: '10.4 mg/1回', ratio: 1, image: '/illustrations/food-group/11.svg' }],
      chips: ['たんぱく質'],
      icons: ['/illustrations/category/main.svg'],
    })
    // PNG の先頭の印と、IHDR にある幅・高さ
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(png.readUInt32BE(16)).toBe(OG_WIDTH)
    expect(png.readUInt32BE(20)).toBe(OG_HEIGHT)
    expect(png.length).toBeGreaterThan(10_000)
  })

  it('料理のページの画像は、絵を右に大きく置く形でも作れる（見出しが長くても）', async () => {
    const png = await renderOgPng({
      title: '温野菜（ブロッコリー・にんじん）のカロリー・栄養',
      badge: '1人前 63 kcal',
      sub: 'たんぱく質 2.4 g・脂質 4.1 g・食塩 0.5 g',
      chips: ['26成分', '2人分の作り方'],
      hero: '/illustrations/category/side.svg',
    })
    expect(png.readUInt32BE(16)).toBe(OG_WIDTH)
    expect(png.readUInt32BE(20)).toBe(OG_HEIGHT)
  })
})

// レシピ用の画像（検索エンジン向け）。料理の絵を、まんなかに大きく置く
describe('レシピ用の画像', () => {
  it('たのんだ大きさの PNG ができる（1:1・4:3・16:9）', async () => {
    for (const [width, height] of [
      [1200, 1200],
      [1200, 900],
      [1200, 675],
    ]) {
      const png = await renderRecipePng('/illustrations/category/main.svg', width, height)
      expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      expect(png.readUInt32BE(16)).toBe(width)
      expect(png.readUInt32BE(20)).toBe(height)
      expect(png.length).toBeGreaterThan(5_000)
    }
  })

  it('絵は、短い辺の8割ほどの大きさで、まんなかに置く（どの形でも切れない）', () => {
    const svg = recipeImageSvg('/illustrations/category/main.svg', 1200, 675)
    const art = /<svg x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 128 128">/.exec(svg)!
    const [x, y, w, h] = art.slice(1).map(Number)
    expect(w).toBe(h)
    expect(w).toBeGreaterThan(675 * 0.75)
    expect(Math.abs(x + w / 2 - 600)).toBeLessThanOrEqual(1)
    expect(Math.abs(y + h / 2 - 337.5)).toBeLessThanOrEqual(1)
    expect(y).toBeGreaterThan(0)
    expect(y + h).toBeLessThan(675)
  })
})
