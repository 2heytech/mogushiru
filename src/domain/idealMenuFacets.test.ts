import { describe, expect, it } from 'vitest'
import {
  BREAKFAST_STYLES,
  DINNER_MAINS,
  LUNCH_STYLES,
  idealMealLeads,
  idealMenuFacets,
  idealSearchIndex,
  idealSearchTokens,
  matchedItemNames,
  matchesIdealSearch,
  mealFaceItem,
} from './idealMenuFacets'
import { IDEAL_MENUS, idealProductJan, isIdealExtra } from './idealMenus'
import { catalog, planned } from './idealMenus.testkit'
import type { Profile } from './types'

const F35: Profile = { sex: 'female', age: 35, activity: 'normal' }
const byName = (name: string) => {
  const m = IDEAL_MENUS.find((x) => x.name === name)
  if (!m) throw new Error(`献立がない: ${name}`)
  return m
}
const facets = (name: string) => idealMenuFacets(byName(name), catalog)
const search = (query: string) => {
  const tokens = idealSearchTokens(query)
  return IDEAL_MENUS.filter((m) => matchesIdealSearch(idealSearchIndex(m, catalog), tokens)).map((m) => m.name)
}

describe('理想の献立を好みでしぼる', { timeout: 30_000 }, () => {
  it('朝はごはん・パン・シリアル、昼は丼・定食・そのほか、晩は主菜の材料で分ける', () => {
    expect(facets('和食の定番')).toEqual({ breakfast: 'rice', lunch: 'bowl', dinner: 'fish' })
    expect(facets('パンの朝ごはん').breakfast).toBe('bread')
    expect(facets('フルグラと冷凍ギョーザ').breakfast).toBe('cereal')
    // ごはんと主菜の組み合わせは定食。ピザ・そば・おにぎり・お茶漬けは「めん・パンなど」
    expect(facets('お刺身の晩ごはん').lunch).toBe('set')
    expect(facets('イタリアンの1日').lunch).toBe('other')
    expect(facets('天ざるそばと焼き鳥').lunch).toBe('other')
    expect(facets('おにぎり弁当とめかじき').lunch).toBe('other')
    expect(facets('お茶漬けと鶏むね肉のソテー').lunch).toBe('other')
    // 晩：厚揚げが添えてあっても刺身が主菜。麻婆豆腐・湯豆腐は豆腐、リゾットの日は鶏肉、えびは魚介
    expect(facets('お刺身の晩ごはん').dinner).toBe('fish')
    expect(facets('中華の晩ごはん').dinner).toBe('soy')
    expect(facets('鉄火丼と湯豆腐').dinner).toBe('soy')
    expect(facets('イタリアンの1日').dinner).toBe('meat')
    expect(facets('鍋の晩ごはん').dinner).toBe('meat')
    expect(facets('酢豚定食とエビマヨ').dinner).toBe('fish')
  })

  it('どの分け方にも、えらべる献立がある', () => {
    const all = IDEAL_MENUS.map((m) => idealMenuFacets(m, catalog))
    for (const k of BREAKFAST_STYLES) expect(all.filter((f) => f.breakfast === k).length, k).toBeGreaterThanOrEqual(3)
    for (const k of LUNCH_STYLES) expect(all.filter((f) => f.lunch === k).length, k).toBeGreaterThanOrEqual(3)
    for (const k of DINNER_MAINS) expect(all.filter((f) => f.dinner === k).length, k).toBeGreaterThanOrEqual(3)
  })

  // 朝に市販品があれば「シリアル」に入れている。ほかの市販品（おにぎりなど）を朝に入れたら、分け方を見直す
  it('朝に使う市販品はシリアルだけ', () => {
    for (const m of IDEAL_MENUS)
      for (const x of m.slots.breakfast) {
        const jan = idealProductJan(x)
        if (jan) expect(catalog.products.get(jan)?.name, `${m.id} ${jan}`).toMatch(/グラノーラ|グラノラ|フルグラ|オートミール|ブラン|シリアル|フレーク/)
      }
  })

  it('ひとこと（lead）は「〇〇の朝、〇〇の昼、〇〇の晩」の形で、朝・昼・晩に分けられる', () => {
    for (const m of IDEAL_MENUS) expect(idealMealLeads(m), `${m.id} ${m.lead}`).not.toBeNull()
    expect(idealMealLeads(byName('和食の定番'))).toEqual({ breakfast: '納豆と玄米', lunch: 'サーモン丼', dinner: '銀だらの西京焼き' })
  })

  it('朝・昼・晩の絵は、白いごはんや副菜でなく、その食事の顔になる料理にする', () => {
    const plain = ['rice', 'genmai-rice', 'mugi-rice', 'zakkoku-rice', 'okayu']
    for (const m of IDEAL_MENUS) {
      const { menu } = planned(m, F35)
      for (const slot of ['breakfast', 'lunch', 'dinner'] as const) {
        const face = mealFaceItem(
          menu[slot].filter((item) => !isIdealExtra(item)),
          catalog,
        )
        expect(face, `${m.id} ${slot}`).toBeDefined()
        expect(plain, `${m.id} ${slot}`).not.toContain(face!.refId)
        if (face!.kind === 'dish') expect(['side', 'snack', 'drink'], `${m.id} ${slot}`).not.toContain(catalog.dishes.get(face!.refId)!.category)
      }
    }
    const { menu } = planned(byName('和食の定番'), F35)
    expect((['breakfast', 'lunch', 'dinner'] as const).map((slot) => mealFaceItem(menu[slot], catalog)?.refId)).toEqual(['ready-natto', 'don-salmon', 'gindara-saikyoyaki'])
  })

  it('料理の名前でさがせる（漢字でも、よみでも、カタカナでも）', () => {
    expect(search('刺身').length).toBeGreaterThanOrEqual(5)
    expect(search('さしみ')).toEqual(search('刺身'))
    expect(search('かつ')).toEqual(search('カツ'))
    expect(search('刺身')).toContain('お刺身の晩ごはん')
    expect(search('麻婆')).toContain('中華の晩ごはん')
    // 添えてある料理（朝の納豆など）でも見つかる
    expect(search('納豆')).toContain('和食の定番')
    expect(search('ないりょうり')).toEqual([])
    expect(search('').length).toBe(IDEAL_MENUS.length)
  })

  it('言葉を2つ入れると、両方が入っている献立にしぼる', () => {
    const both = search('刺身 カツ')
    expect(both.length).toBeGreaterThan(0)
    expect(both.length).toBeLessThan(search('刺身').length)
    for (const name of both) {
      expect(search('刺身')).toContain(name)
      expect(search('カツ')).toContain(name)
    }
    expect(search('刺身、カツ')).toEqual(both)
  })

  it('当たった料理の名前を返す', () => {
    const index = idealSearchIndex(byName('お刺身の晩ごはん'), catalog)
    expect(matchedItemNames(index, idealSearchTokens('刺身'))).toEqual(['たいの刺身'])
    expect(matchedItemNames(index, idealSearchTokens('刺身 カツ'))).toEqual(['ヒレカツ', 'たいの刺身'])
    // 献立の名前やひとことだけに当たったときは、料理の名前は返さない
    expect(matchedItemNames(idealSearchIndex(byName('鍋の晩ごはん'), catalog), idealSearchTokens('鍋'))).toEqual([])
  })
})
