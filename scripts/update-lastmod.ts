// サイトマップの更新日の表（data/sitemap-lastmod.json）を、いまのページに合わせて直す（npm run sitemap:lastmod）。
// - 中身（タイトル・説明文・本文）が変わったページと、新しいページだけ、日付を今日（日本時間）にする
// - 中身が同じページの日付は動かさない。なくなったページは表から消す
// - アプリの画面（/ ・/foods/ など）は、最初の HTML に入る字しか見ていない。画面の中身を大きく変えたときは
//   --touch /customize/ のようにパスを書くと、そのページの日付を今日にする
// - --date 2026-11-18 で、今日の代わりにする日を決められる
// しくみは scripts/lib/pageLastmod.ts
import { readFileSync, writeFileSync } from 'node:fs'
import { buildSitePages } from '../src/pages/sitePages'
import { formatLastmodTable, LASTMOD_FILE, staleLastmod, todayInJapan, updateLastmod, type LastmodTable } from './lib/pageLastmod'
import { loadSiteInputs } from './lib/siteInputs'

const args = process.argv.slice(2)
const valuesOf = (flag: string): string[] => args.flatMap((a, i) => (a === flag ? (args[i + 1] ?? []) : a.startsWith(`${flag}=`) ? a.slice(flag.length + 1) : []))
const today = valuesOf('--date')[0] ?? todayInJapan()
if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error(`--date は 2026-11-18 の形で書いてください：${today}`)

const pages = buildSitePages(loadSiteInputs())
const before = JSON.parse(readFileSync(LASTMOD_FILE, 'utf8')) as LastmodTable
const { changed, removed } = staleLastmod(pages, before)
const after = updateLastmod(pages, before, today)

const touched = valuesOf('--touch')
for (const path of touched) {
  if (!after[path]) throw new Error(`--touch のページが見つかりません：${path}`)
  after[path] = { ...after[path], lastmod: today }
}

writeFileSync(LASTMOD_FILE, formatLastmodTable(after))

const sample = (paths: string[]) => (paths.length > 5 ? `${paths.slice(0, 5).join(' ')} ほか${paths.length - 5}件` : paths.join(' '))
console.log(`サイトマップの更新日：${Object.keys(after).length} ページ`)
console.log(changed.length > 0 ? `  日付を ${today} にしたページ ${changed.length} 件：${sample(changed)}` : '  中身が変わったページはありません')
if (touched.length > 0) console.log(`  指定で日付を ${today} にしたページ：${touched.join(' ')}`)
if (removed.length > 0) console.log(`  表から消したページ ${removed.length} 件：${sample(removed)}`)
