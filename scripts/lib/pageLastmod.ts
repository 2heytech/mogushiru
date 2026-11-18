import { createHash } from 'node:crypto'

// サイトマップの「更新日」（lastmod）を、ページの中身が実際に変わった日にするためのしくみ。
// - ページごとに、中身の指紋（hash）と、その中身になった日（lastmod）を data/sitemap-lastmod.json に持つ
// - 中身を変えたら npm run sitemap:lastmod で、変わったページだけ日付を今日にする（指紋が同じページの日付は動かさない）
// - ビルド（scripts/prerender.tsx）はこの表の日付を sitemap.xml に書く。ビルドした日は使わない
//   （毎回ぜんぶのページが「今日更新」になると、検索エンジンが日付をあてにしなくなる）
// - 表が古いままだとテスト（pageLastmod.test.ts）が落ちるので、直し忘れたまま公開されることはない

// 表のファイル（リポジトリの上からのパス）
export const LASTMOD_FILE = 'data/sitemap-lastmod.json'

export type LastmodEntry = { hash: string; lastmod: string }
export type LastmodTable = Record<string, LastmodEntry>

// sitePages.tsx の SitePage のうち、ここで使うところ
export type LastmodPage = { path: string; title: string; description: string; body: string; noindex?: boolean }

// ページの中身の指紋。見るのは、タイトル・説明文・本文（main の中）。
// どのページにも同じものが入るところ（上のロゴ・フッター）と、見た目だけの指定（class）は見ない。
// そこを直しただけで全ページが「更新」になるのを防ぐ
export function pageFingerprint(page: LastmodPage): string {
  const main = /<main[\s>][\s\S]*<\/main>/.exec(page.body)?.[0] ?? page.body
  const content = main.replace(/\sclass="[^"]*"/g, '')
  return createHash('sha256').update([page.title, page.description, content].join('\n')).digest('hex').slice(0, 16)
}

const listed = (pages: LastmodPage[]) => pages.filter((p) => !p.noindex)

// いまのページに合わせて表を作り直す。中身が変わったページ・新しいページだけ、日付を today にする。なくなったページは表から消す
export function updateLastmod(pages: LastmodPage[], table: LastmodTable, today: string): LastmodTable {
  const out: LastmodTable = {}
  for (const page of [...listed(pages)].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))) {
    const hash = pageFingerprint(page)
    const old = table[page.path]
    out[page.path] = old?.hash === hash ? old : { hash, lastmod: today }
  }
  return out
}

// 表と合っていないページ（中身が変わった・表にない）と、表に残っているがもうないページ
export function staleLastmod(pages: LastmodPage[], table: LastmodTable): { changed: string[]; removed: string[] } {
  const current = listed(pages)
  const paths = new Set(current.map((p) => p.path))
  return {
    changed: current.filter((p) => table[p.path]?.hash !== pageFingerprint(p)).map((p) => p.path),
    removed: Object.keys(table).filter((path) => !paths.has(path)),
  }
}

// sitemap.xml に書く日付（ページのパス → 日付）。表と合っていないページは fallback の日（ビルドした日）にする
export function lastmodDates(pages: LastmodPage[], table: LastmodTable, fallback: string): Record<string, string> {
  return Object.fromEntries(listed(pages).map((p) => [p.path, table[p.path]?.hash === pageFingerprint(p) ? table[p.path].lastmod : fallback]))
}

// 1ページ1行で書き出す（どのページの日付が変わったかを、差分で見やすくする）
export function formatLastmodTable(table: LastmodTable): string {
  const lines = Object.entries(table).map(([path, e]) => `  ${JSON.stringify(path)}: { "hash": ${JSON.stringify(e.hash)}, "lastmod": ${JSON.stringify(e.lastmod)} }`)
  return `{\n${lines.join(',\n')}\n}\n`
}

// 日本時間の今日（YYYY-MM-DD）
export const todayInJapan = (now = new Date()): string => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(now)
