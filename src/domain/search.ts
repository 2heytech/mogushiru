// 検索用の正規化：全角半角を揃え、カタカナをひらがなに、英字を小文字にする
export function normalizeForSearch(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/\s+/g, '')
}

// 検索語の区切り（よみ・同義語は「/」や空白で複数並べる）
const SPLIT = /[/\s　]+/

// 一致の度合い（小さいほど良い）。一致しなければ null
// 0: 語と完全一致 / 1: 語の先頭が一致 / 2: 語の途中に含まれる
export function matchRank(query: string, ...fields: (string | undefined)[]): number | null {
  const q = normalizeForSearch(query)
  if (!q) return 0
  let best: number | null = null
  for (const field of fields) {
    if (!field) continue
    for (const word of field.split(SPLIT)) {
      const w = normalizeForSearch(word)
      if (!w) continue
      const rank = w === q ? 0 : w.startsWith(q) ? 1 : w.includes(q) ? 2 : null
      if (rank !== null && (best === null || rank < best)) best = rank
    }
  }
  return best
}

export function matches(query: string, ...fields: (string | undefined)[]): boolean {
  return matchRank(query, ...fields) !== null
}

// 短い検索語（2文字以下）の途中一致は誤ヒットが多い（例：「つな」で「こまつな」）ので、
// 先頭一致が1件でもあれば途中一致は出さない
export const SHORT_QUERY_LENGTH = 2

export function rankAndFilter<T>(items: T[], query: string, fields: (item: T) => (string | undefined)[]): T[] {
  const q = normalizeForSearch(query)
  if (!q) return items
  const ranked = items
    .map((item, i) => ({ item, i, rank: matchRank(q, ...fields(item)) }))
    .filter((x): x is { item: T; i: number; rank: number } => x.rank !== null)
  const hasPrefix = ranked.some((x) => x.rank <= 1)
  return ranked
    .filter((x) => !(q.length <= SHORT_QUERY_LENGTH && hasPrefix && x.rank === 2))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((x) => x.item)
}
