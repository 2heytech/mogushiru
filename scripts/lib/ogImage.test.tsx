import { describe, expect, it } from 'vitest'
import { OG_HEIGHT, OG_WIDTH, renderOgPng } from './ogImage'

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
})
