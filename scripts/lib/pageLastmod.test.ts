import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildSitePages, sitemapXml } from '../../src/pages/sitePages'
import { formatLastmodTable, LASTMOD_FILE, lastmodDates, pageFingerprint, staleLastmod, todayInJapan, updateLastmod, type LastmodPage, type LastmodTable } from './pageLastmod'
import { loadSiteInputs } from './siteInputs'

const page = (path: string, main: string, more: Partial<LastmodPage> = {}): LastmodPage => ({
  path,
  title: `${path} のタイトル`,
  description: '説明',
  body: `<div class="wrap"><header><a href="/">モグシル</a></header><main>${main}</main><footer>フッター</footer></div>`,
  ...more,
})

describe('ページの中身の指紋', () => {
  const base = page('/a/', '<h1 class="text-2xl">肉じゃが</h1><a href="/customize/#dish=nikujaga">開く</a>')

  it('本文の字・リンク先・タイトル・説明文が変わると、指紋が変わる', () => {
    const fp = pageFingerprint(base)
    expect(fp).toMatch(/^[0-9a-f]{16}$/)
    expect(pageFingerprint(page('/a/', '<h1 class="text-2xl">肉じゃが（2人分）</h1><a href="/customize/#dish=nikujaga">開く</a>'))).not.toBe(fp)
    expect(pageFingerprint(page('/a/', '<h1 class="text-2xl">肉じゃが</h1><a href="/customize/?dish=nikujaga">開く</a>'))).not.toBe(fp)
    expect(pageFingerprint({ ...base, title: '別のタイトル' })).not.toBe(fp)
    expect(pageFingerprint({ ...base, description: '別の説明' })).not.toBe(fp)
  })

  it('見た目だけの指定（class）と、どのページにもあるところ（ロゴ・フッター）が変わっても、指紋は同じ', () => {
    const fp = pageFingerprint(base)
    expect(pageFingerprint(page('/a/', '<h1 class="text-3xl font-bold">肉じゃが</h1><a href="/customize/#dish=nikujaga">開く</a>'))).toBe(fp)
    expect(pageFingerprint({ ...base, body: base.body.replace('フッター', '運営者のサイトへ').replace('class="wrap"', 'class="wrap wide"') })).toBe(fp)
  })
})

describe('サイトマップの更新日の表', () => {
  const a = page('/a/', '<p>a</p>')
  const b = page('/b/', '<p>b</p>')
  const table: LastmodTable = { '/a/': { hash: pageFingerprint(a), lastmod: '2026-11-12' }, '/b/': { hash: pageFingerprint(b), lastmod: '2026-11-13' } }

  it('中身が変わったページと新しいページだけ、日付を今日にする', () => {
    const b2 = page('/b/', '<p>b を直した</p>')
    const c = page('/c/', '<p>c</p>')
    const next = updateLastmod([c, b2, a], table, '2026-11-18')
    expect(next['/a/']).toEqual(table['/a/'])
    expect(next['/b/']).toEqual({ hash: pageFingerprint(b2), lastmod: '2026-11-18' })
    expect(next['/c/'].lastmod).toBe('2026-11-18')
    // パスの順に並べる（差分を見やすく）
    expect(Object.keys(next)).toEqual(['/a/', '/b/', '/c/'])
  })

  it('なくなったページと、検索に出さないページ（404）は表に入れない', () => {
    const next = updateLastmod([a, page('/404.html', '<p>ない</p>', { noindex: true })], table, '2026-11-18')
    expect(Object.keys(next)).toEqual(['/a/'])
  })

  it('表と合っていないページを見つける', () => {
    expect(staleLastmod([a, b], table)).toEqual({ changed: [], removed: [] })
    expect(staleLastmod([a, page('/b/', '<p>直した</p>'), page('/c/', '<p>c</p>')], table).changed).toEqual(['/b/', '/c/'])
    expect(staleLastmod([a], table).removed).toEqual(['/b/'])
  })

  it('サイトマップには表の日付を書く。表と合っていないページだけ、ビルドした日にする', () => {
    const b2 = page('/b/', '<p>直した</p>')
    expect(lastmodDates([a, b2], table, '2026-11-20')).toEqual({ '/a/': '2026-11-12', '/b/': '2026-11-20' })
  })

  it('1ページ1行で書き出し、読みもどせる', () => {
    const text = formatLastmodTable(table)
    expect(JSON.parse(text)).toEqual(table)
    expect(text.trim().split('\n')).toHaveLength(Object.keys(table).length + 2)
  })

  it('今日の日付は日本時間', () => {
    expect(todayInJapan(new Date('2026-11-17T15:30:00Z'))).toBe('2026-11-18')
    expect(todayInJapan(new Date('2026-11-17T14:59:00Z'))).toBe('2026-11-17')
  })
})

describe('data/sitemap-lastmod.json', () => {
  const pages = buildSitePages(loadSiteInputs())
  const table = JSON.parse(readFileSync(LASTMOD_FILE, 'utf8')) as LastmodTable

  // ページの中身を変えたのに表を直していないと、ここで落ちる。直し方：npm run sitemap:lastmod を動かして、変わった data/sitemap-lastmod.json をコミットする
  it('いまのページと合っている（落ちたら npm run sitemap:lastmod）', () => {
    const { changed, removed } = staleLastmod(pages, table)
    const hint = 'ページの中身が変わっています。npm run sitemap:lastmod を動かして、data/sitemap-lastmod.json をコミットしてください'
    expect(changed, hint).toEqual([])
    expect(removed, hint).toEqual([])
  })

  it('どのページにも、今日までの日付がある', () => {
    const today = todayInJapan()
    for (const [path, e] of Object.entries(table)) {
      expect(e.lastmod, path).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(e.lastmod <= today, `${path} の日付が先の日になっています`).toBe(true)
    }
  })

  it('サイトマップに、ページごとの更新日が入る', () => {
    const xml = sitemapXml(pages, lastmodDates(pages, table, todayInJapan()))
    expect(xml.match(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g)).toHaveLength(Object.keys(table).length)
    expect(xml).toContain(`<loc>https://mogushiru.app/dishes/</loc>\n    <lastmod>${table['/dishes/'].lastmod}</lastmod>`)
  })
})
