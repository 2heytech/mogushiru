/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FOOD_PORTION } from './popular'
import { SERVING_RULES, servingFor } from './serving'

// 配信用のJSON（public/data）を読む
type FoodRow = { id: string; name: string; group: string }
const foods = (JSON.parse(readFileSync(new URL('../../public/data/foods.json', import.meta.url), 'utf8')) as { foods: FoodRow[] }).foods
const byId = new Map(foods.map((f) => [f.id, f]))
const of = (id: string) => {
  const f = byId.get(id)
  if (!f) throw new Error(`食品 ${id} がデータにない`)
  return servingFor(f)
}

describe('1回に食べる量の目安（成分表の全食品）', () => {
  it('粉は「ゆでめん1玉」にしない（そば粉は大さじ1ほど）', () => {
    for (const f of foods.filter((f) => f.group === '01' && /そば粉|小麦粉|米粉$|米粉　|上新粉|白玉粉|ライ麦粉/.test(f.name) && !/パン|めん|ケーキ/.test(f.name))) {
      const s = servingFor(f)
      expect(s.grams, f.name).toBeLessThanOrEqual(30)
      expect(s.label, f.name).not.toMatch(/玉|ゆで/)
    }
    expect(of('01122')).toEqual({ grams: 10, label: '大さじ1ほど' }) // そば粉 全層粉
  })

  it('魚卵は「1切れ」にしない（イクラは大さじ1強）', () => {
    expect(of('10140')).toEqual({ grams: 20, label: '大さじ1強' }) // イクラ
    expect(of('10141').grams).toBe(20) // すじこ
    expect(of('10202').grams).toBe(25) // たらこ
    for (const f of foods.filter((f) => f.group === '10' && /イクラ|すじこ|たらこ|めんたいこ|かずのこ|うに|キャビア|からすみ/.test(f.name))) {
      expect(servingFor(f).grams, f.name).toBeLessThanOrEqual(25)
      expect(servingFor(f).label, f.name).not.toBe('1切れ')
    }
  })

  it('めんは、ゆで・生・乾で量とラベルを変える', () => {
    const noodles = foods.filter((f) => f.group === '01' && /［(うどん・そうめん類|中華めん類|マカロニ・スパゲッティ類)］|^そば　(そば|干しそば)　/.test(f.name))
    expect(noodles.length).toBeGreaterThan(20)
    for (const f of noodles) {
      const s = servingFor(f)
      const state = f.name.split('　').at(-1)
      if (state === 'ゆで') {
        expect(s.label, f.name).toMatch(/ゆで/)
        expect(s.grams, f.name).toBeGreaterThanOrEqual(200)
      }
      if (state === '乾') {
        expect(s.label, f.name).toMatch(/乾/)
        expect(s.grams, f.name).toBeLessThanOrEqual(100)
      }
      if (state === '生') expect(s.label, f.name).toMatch(/生/)
    }
  })

  it('ラベルに書いた状態（ゆで・生）は、食品名の状態と合う', () => {
    for (const f of foods) {
      const s = servingFor(f)
      if (/（ゆで）/.test(s.label)) expect(f.name, `${f.name} → ${s.label}`).toMatch(/ゆで/)
      if (/（生）/.test(s.label)) expect(f.name, `${f.name} → ${s.label}`).toMatch(/生|米粉めん/)
      if (/ゆで|水煮|油いため|焼き$/.test(f.name.split('　').at(-1) ?? '')) expect(s.label, `${f.name} → ${s.label}`).not.toMatch(/（乾）/)
    }
  })

  it('うすめて使う調味料は、うすめる前の1食分にする', () => {
    expect(of('17143').grams).toBeLessThanOrEqual(40) // ラーメンスープ 濃縮 みそ味
    expect(of('17030').grams).toBe(30) // めんつゆ 三倍濃縮
    expect(of('17029').grams).toBe(100) // めんつゆ ストレート
  })

  it('1回の量は、どの食品も 0.5g〜400g におさまる', () => {
    for (const f of foods) {
      const s = servingFor(f)
      expect(s.grams, f.name).toBeGreaterThanOrEqual(0.5)
      expect(s.grams, f.name).toBeLessThanOrEqual(400) // いちばん多いのは即席めんの調理後全体（スープ込み）
      expect(s.label.length, f.name).toBeGreaterThan(0)
    }
  })

  it('調味料・油・砂糖・香辛料は一度にたくさんにしない', () => {
    for (const f of foods.filter((f) => f.group === '14')) expect(servingFor(f).grams, f.name).toBeLessThanOrEqual(15)
    for (const f of foods.filter((f) => f.group === '17' && /＜香辛料類＞|（食塩類）|（しょうゆ類）/.test(f.name))) {
      expect(servingFor(f).grams, f.name).toBeLessThanOrEqual(6)
    }
    for (const f of foods.filter((f) => f.group === '03')) expect(servingFor(f).grams, f.name).toBeLessThanOrEqual(21)
  })

  it('食材を選ぶときの1回分（FOOD_PORTION）と同じ量にする', () => {
    for (const [id, portion] of Object.entries(FOOD_PORTION)) expect(of(id).grams, id).toBe(portion.grams)
  })

  it('食事バランスガイドの早見表にある主な量', () => {
    expect(of('01088').grams).toBe(150) // 水稲めし 精白米 うるち米
    expect(of('01026').grams).toBe(60) // 食パン
    expect(of('12004').grams).toBe(50) // 鶏卵 全卵 生
    expect(of('13003').grams).toBe(200) // 普通牛乳
    expect(of('04046').grams).toBe(45) // 糸引き納豆（1パック）
  })

  it('ルールはすべて、どれかの食品に当たる（使われないルールを残さない）', () => {
    const used = new Set<number>()
    for (const f of foods) {
      const terms = f.name.split(/[　 ]+/)
      const hit = (words: string[]) => words.some((w) => (w.startsWith('=') ? terms.includes(w.slice(1)) : f.name.includes(w)))
      const i = SERVING_RULES.rules.findIndex(
        (r) => (!r.group || r.group === f.group) && hit(r.match) && (!r.also || hit(r.also)) && !(r.unlessMatch && hit(r.unlessMatch)),
      )
      if (i >= 0) used.add(i)
    }
    const unused = SERVING_RULES.rules.filter((_, i) => !used.has(i)).map((r) => `${r.group ?? ''} ${r.match.join('/')}`)
    expect(unused).toEqual([])
  })
})
