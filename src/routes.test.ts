import { describe, expect, it } from 'vitest'
import { IDEAL_MENUS } from './domain/idealMenus'
import { RANKING_NUTRIENTS } from './domain/ranking'
import { menusFor } from './pages/menuPages'
import {
  ABOUT_PATH,
  addTargetFromParam,
  appLinkParam,
  dishAddPath,
  dishAppPath,
  dishTabFromParam,
  FOOD_PAGE_IDS,
  FOOD_SLUG,
  foodAddPath,
  foodAppPath,
  foodIdFromPath,
  foodPagePath,
  hasAppLinkHash,
  idealMenuAppPath,
  legacyPageRedirect,
  legacyQueryRedirect,
  legacyRedirect,
  MENU_PAGES,
  menuScreenFromState,
  menuScreenState,
  NUTRIENT_SLUG,
  nutrientFromSlug,
  nutrientPagePath,
  rankingAppPath,
  VIEW_FEATURE,
  VIEW_PATH,
  viewFromLocation,
  withoutAppLinkParam,
} from './routes'

describe('画面の URL', () => {
  it('パスから画面を決める（最後の / はあってもなくてもよい）', () => {
    expect(viewFromLocation('/')).toBe('menu')
    expect(viewFromLocation('/ranking/')).toBe('ranking')
    expect(viewFromLocation('/foods/')).toBe('foods')
    expect(viewFromLocation('/foods')).toBe('foods')
    expect(viewFromLocation('/ranking')).toBe('ranking')
    expect(viewFromLocation('/customize/')).toBe('customize')
    // 「このサイトについて」は読みもののページ（アプリの画面ではない）
    expect(ABOUT_PATH).toBe('/about/')
    expect(Object.values(VIEW_PATH)).not.toContain(ABOUT_PATH)
    expect(viewFromLocation('/nutrients/iron/')).toBe('menu')
  })

  it('上のメニューは3つ。「料理をアレンジ」は栄養バランスの中の画面で、URL は前のまま', () => {
    expect([VIEW_FEATURE.menu, VIEW_FEATURE.foods, VIEW_FEATURE.ranking]).toEqual(['menu', 'foods', 'ranking'])
    // 食品を調べる（名前でさがす）と成分ランキングは、別のメニュー
    expect(VIEW_FEATURE.ranking).not.toBe(VIEW_FEATURE.foods)
    expect(VIEW_FEATURE.customize).toBe('menu')
    expect(VIEW_PATH.customize).toBe('/customize/')
    expect(VIEW_PATH.ranking).toBe('/ranking/')
    expect(VIEW_PATH.foods).toBe('/foods/')
  })

  it('古い # のリンク（/#ranking など）も開け、アドレス欄を新しい URL に直す', () => {
    expect(viewFromLocation('/', '#ranking')).toBe('ranking')
    expect(legacyRedirect('/', '#customize')).toBe(VIEW_PATH.customize)
    expect(legacyRedirect('/', '')).toBeNull()
    expect(legacyRedirect('/ranking/', '#customize')).toBeNull()
    // 古い /#about は、読みもののページ（/about/）へページごと移る
    expect(legacyPageRedirect('/', '#about')).toBe('/about/')
    expect(legacyPageRedirect('/', '#ranking')).toBeNull()
    expect(legacyPageRedirect('/ranking/', '#about')).toBeNull()
    expect(legacyRedirect('/', '#about')).toBeNull()
  })

  it('以前の ? つきの URL は、同じ中身の読みもののページへ送る（/ranking/?n= → /nutrients/…、/customize/?dish= → /dishes/…）', () => {
    expect(legacyQueryRedirect('/ranking/', '?n=caffeine')).toEqual({ path: '/nutrients/caffeine/', kind: 'nutrient' })
    expect(legacyQueryRedirect('/ranking', '?n=vitamin-c&x=1')).toEqual({ path: '/nutrients/vitamin-c/', kind: 'nutrient' })
    // 成分のページの「くらべ方や種類を変えて見る」（/ranking/#n=<名前>）と同じ名前で、26成分すべてが送れる
    for (const [key, slug] of Object.entries(NUTRIENT_SLUG)) expect(legacyQueryRedirect('/ranking/', `?n=${slug}`)?.path, key).toBe(`/nutrients/${slug}/`)
    expect(legacyQueryRedirect('/customize/', '?dish=nikujaga')).toEqual({ path: '/dishes/nikujaga/', kind: 'dish' })
    // 指定がない・知らない成分・おかしな id・ほかの画面は送らない
    expect(legacyQueryRedirect('/ranking/', '')).toBeNull()
    expect(legacyQueryRedirect('/ranking/', '?n=unknown')).toBeNull()
    expect(legacyQueryRedirect('/customize/', '?dish=../about')).toBeNull()
    expect(legacyQueryRedirect('/customize/', '?dish=')).toBeNull()
    expect(legacyQueryRedirect('/', '?n=iron')).toBeNull()
    expect(legacyQueryRedirect('/foods/', '?dish=nikujaga')).toBeNull()
  })

  it('最初の画面か1日の食事かを、履歴の印から読む（印がなければ null）', () => {
    expect(menuScreenFromState(menuScreenState('start'))).toBe('start')
    expect(menuScreenFromState(menuScreenState('day'))).toBe('day')
    expect(menuScreenFromState(null)).toBeNull()
    expect(menuScreenFromState(undefined)).toBeNull()
    expect(menuScreenFromState('day')).toBeNull()
    expect(menuScreenFromState({ screen: 'ranking' })).toBeNull()
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
  })
})

describe('読みもののページから、アプリを指定つきで開くリンク', () => {
  it('指定は # のうしろに書く（? で書くと、検索エンジンが別のページとして読みに来る）', () => {
    expect(rankingAppPath('iron')).toBe('/ranking/#n=iron')
    expect(idealMenuAppPath('washoku-1')).toBe('/#menu=washoku-1')
    expect(dishAppPath('nikujaga')).toBe('/customize/#dish=nikujaga')
    expect(dishAppPath('nikujaga', 'recipe')).toBe('/customize/#dish=nikujaga&tab=recipe')
    expect(dishAddPath('nikujaga')).toBe('/#add=nikujaga')
    for (const path of [rankingAppPath('iron'), idealMenuAppPath('washoku-1'), dishAppPath('nikujaga'), dishAppPath('nikujaga', 'recipe'), dishAddPath('nikujaga')]) expect(path).not.toContain('?')
  })

  it('料理をアレンジの画面は、指定がなければ「材料と量」をひらく（「つくり方」は tab=recipe のときだけ）', () => {
    expect(dishTabFromParam(appLinkParam('tab', '', '#dish=nikujaga'))).toBe('edit')
    expect(dishTabFromParam(appLinkParam('tab', '', '#dish=nikujaga&tab=recipe'))).toBe('recipe')
    expect(dishTabFromParam('edit')).toBe('edit')
    expect(dishTabFromParam('どれでもない')).toBe('edit')
    expect(dishTabFromParam(undefined)).toBe('edit')
  })

  it('# のうしろの指定を読む。以前の ? のリンクも読める', () => {
    expect(appLinkParam('n', '', '#n=iron')).toBe('iron')
    expect(appLinkParam('n', '?n=iron', '')).toBe('iron')
    expect(appLinkParam('menu', '', '#menu=kyodo-mie')).toBe('kyodo-mie')
    expect(appLinkParam('dish', '?dish=nikujaga', '#dish=oden')).toBe('oden')
    expect(appLinkParam('n', '', '')).toBeNull()
    expect(appLinkParam('n', '', '#ranking')).toBeNull()
  })

  it('# のうしろに指定があるかが分かる（古い # のリンクや、ページの中の場所は指定ではない）', () => {
    expect(hasAppLinkHash('#menu=washoku')).toBe(true)
    expect(hasAppLinkHash('#n=iron')).toBe(true)
    expect(hasAppLinkHash('#dish=oden')).toBe(true)
    expect(hasAppLinkHash('#dish=oden&tab=recipe')).toBe(true)
    expect(hasAppLinkHash('#add=oden')).toBe(true)
    expect(hasAppLinkHash('#ranking')).toBe(false)
    expect(hasAppLinkHash('')).toBe(false)
  })

  it('読み終えた指定を、アドレス欄から消す', () => {
    expect(withoutAppLinkParam('n', '', '#n=iron')).toBe('')
    expect(withoutAppLinkParam('n', '?n=iron', '')).toBe('')
    expect(withoutAppLinkParam('n', '?n=iron&x=1', '')).toBe('?x=1')
    expect(withoutAppLinkParam('menu', '?menu=a', '#menu=b')).toBe('')
    // ほかの指定や、古い # のリンクは残す
    expect(withoutAppLinkParam('n', '', '#n=iron&dish=oden')).toBe('#dish=oden')
    expect(withoutAppLinkParam('n', '?n=iron', '#ranking')).toBe('#ranking')
    // 指定がなければ、何もしない
    expect(withoutAppLinkParam('n', '', '')).toBeNull()
    expect(withoutAppLinkParam('n', '?x=1', '#ranking')).toBeNull()
  })
})

describe('食品のページの URL', () => {
  it('定番の12食品に、重ならない URL がある（/foods/natto/ など）。並びは「定番の食品」の順', () => {
    expect(FOOD_PAGE_IDS).toEqual(['01088', '01026', '12004', '04046', '13003', '13025', '07107', '11220', '10134', '04032', '06263', '02006'])
    const paths = FOOD_PAGE_IDS.map(foodPagePath)
    expect(new Set(paths).size).toBe(12)
    for (const path of paths) expect(path).toMatch(/^\/foods\/[a-z-]+\/$/)
    expect(foodPagePath('04046')).toBe('/foods/natto/')
    expect(foodPagePath('11220')).toBe('/foods/chicken-breast/')
    // ページのない食品
    expect(foodPagePath('04047')).toBeNull()
    expect(Object.keys(FOOD_SLUG).sort()).toEqual([...FOOD_PAGE_IDS].sort())
  })

  it('URL から食品番号に戻せる。アプリでは「食品を調べる」の画面（その食品の栄養素の窓をひらいているあいだのアドレス）', () => {
    for (const id of FOOD_PAGE_IDS) expect(foodIdFromPath(foodPagePath(id)!)).toBe(id)
    expect(foodIdFromPath('/foods/natto')).toBe('04046')
    expect(foodIdFromPath('/foods/')).toBeNull()
    expect(foodIdFromPath('/foods/nothing/')).toBeNull()
    expect(foodIdFromPath('/dishes/natto/')).toBeNull()
    expect(viewFromLocation('/foods/natto/')).toBe('foods')
    expect(viewFromLocation('/foods/nothing/')).toBe('menu')
  })

  it('アプリで食品の栄養素を見る・1日の食事に入れるリンクは、# のうしろに書く。入れるものが料理か食品かを見分けられる', () => {
    expect(foodAppPath('04046')).toBe('/foods/#food=04046')
    expect(foodAddPath('04046')).toBe('/#add=food.04046')
    expect(hasAppLinkHash('#food=04046')).toBe(true)
    expect(hasAppLinkHash('#add=food.04046')).toBe(true)
    expect(addTargetFromParam(appLinkParam('add', '', '#add=food.04046')!)).toEqual({ kind: 'food', id: '04046' })
    expect(addTargetFromParam(appLinkParam('add', '', '#add=nikujaga')!)).toEqual({ kind: 'dish', id: 'nikujaga' })
    // 料理の id には「.」が入らない（/customize/?dish= を送るときの決まりと同じ）
    expect(addTargetFromParam('food-salad')).toEqual({ kind: 'dish', id: 'food-salad' })
  })
})

describe('献立の例のページ', () => {
  it('献立の例はどれも、ちょうど1つのページに入る', () => {
    for (const m of IDEAL_MENUS) {
      const pages = MENU_PAGES.filter((p) => menusFor(p).includes(m))
      expect(pages.map((p) => p.slug), m.name).toHaveLength(1)
    }
  })
})
