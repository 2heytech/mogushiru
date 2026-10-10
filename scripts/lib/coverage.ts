// 代表的な料理のチェックリストと料理データの照合（純粋関数）
// 郷土料理（source のある料理）は地域版なので、基本の料理として数えない
import type { Dish } from '../../src/domain/types'

export type CoverageItem = { group: string; names: string[] }

export function parseChecklist(text: string): CoverageItem[] {
  let group = ''
  const items: CoverageItem[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const heading = line.match(/^【(.+)】$/)
    if (heading) group = heading[1]
    else items.push({ group, names: line.split('|').map((s) => s.trim()) })
  }
  return items
}

// 表記ゆれ（全角半角・カタカナ／ひらがな・括弧・中点）をそろえる
const norm = (s: string) =>
  s
    .normalize('NFKC')
    .replace(/[（）()\s・]/g, '')
    .replace(/[ァ-ン]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))

export function findMissing(items: CoverageItem[], dishes: Pick<Dish, 'name' | 'kana' | 'source'>[]): CoverageItem[] {
  const hay = dishes.filter((d) => !d.source).flatMap((d) => [norm(d.name), ...d.kana.split(/\s+/).map(norm)])
  return items.filter((it) => !it.names.map(norm).some((n) => hay.some((h) => h.includes(n))))
}
