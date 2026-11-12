import { describe, expect, it } from 'vitest'
import { IDEAL_MENUS } from './domain/idealMenus'
import { RANKING_NUTRIENTS } from './domain/ranking'
import { menusFor } from './pages/menuPages'
import { legacyRedirect, MENU_PAGES, NUTRIENT_SLUG, nutrientFromSlug, nutrientPagePath, rankingAppPath, VIEW_PATH, viewFromLocation } from './routes'

describe('画面の URL', () => {
  it('パスから画面を決める（最後の / はあってもなくてもよい）', () => {
    expect(viewFromLocation('/')).toBe('menu')
    expect(viewFromLocation('/ranking/')).toBe('ranking')
    expect(viewFromLocation('/ranking')).toBe('ranking')
    expect(viewFromLocation('/customize/')).toBe('customize')
    expect(viewFromLocation('/about/')).toBe('about')
    expect(viewFromLocation('/nutrients/iron/')).toBe('menu')
  })

  it('古い # のリンク（/#ranking など）も開け、アドレス欄を新しい URL に直す', () => {
    expect(viewFromLocation('/', '#ranking')).toBe('ranking')
    expect(viewFromLocation('/', '#about')).toBe('about')
    expect(legacyRedirect('/', '#customize')).toBe(VIEW_PATH.customize)
    expect(legacyRedirect('/', '')).toBeNull()
    expect(legacyRedirect('/ranking/', '#about')).toBeNull()
  })
})

describe('成分ごとのランキングの URL', () => {
  it('ランキングのすべての成分に、重ならない URL がある', () => {
    for (const n of RANKING_NUTRIENTS) expect(NUTRIENT_SLUG[n.key], n.label).toMatch(/^[a-z0-9-]+$/)
    const slugs = Object.values(NUTRIENT_SLUG)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(slugs).toHaveLength(RANKING_NUTRIENTS.length)
  })

  it('URL の名前から成分に戻せる', () => {
    expect(nutrientFromSlug('iron')).toBe('iron')
    expect(nutrientFromSlug('vitamin-c')).toBe('vitaminC')
    expect(nutrientFromSlug('nope')).toBeNull()
    expect(nutrientFromSlug(null)).toBeNull()
    expect(nutrientPagePath('iron')).toBe('/nutrients/iron/')
    expect(rankingAppPath('iron')).toBe('/ranking/?n=iron')
  })
})

describe('献立の例のページ', () => {
  it('理想の献立はどれも、ちょうど1つのページに入る', () => {
    for (const m of IDEAL_MENUS) {
      const pages = MENU_PAGES.filter((p) => menusFor(p).includes(m))
      expect(pages.map((p) => p.slug), m.name).toHaveLength(1)
    }
  })
})
