import { normalizeForSearch, normalizeReading, normalizeWithMap, splitRanker } from './search'

// 「食品を調べる」の名前でさがすときの、言葉の読み方と一致の度合い。
// 料理を選ぶ画面の検索（search.ts の rankAcross）より広くさがす：
// - 空白で区切った言葉は、すべてに一致するものをさがす（「カレー レトルト」）
// - ふだんの言い方（しゃけ・シーチキン・お米 など）は、データの名前に読みかえてさがす
// - 画面に出る名前の一致を、読みがなや成分表の名前だけの一致より先にする

// 別の呼び名（入れた言葉 → いっしょにさがす言葉）。
// 食材の読み（foods.json の kana）にも別名は入っているが、料理・市販品にも効かせたいもの、成分表の名前とちがう言い方を足す
const SYNONYMS: Record<string, string[]> = {
  しゃけ: ['鮭'],
  シーチキン: ['ツナ缶', 'ツナマヨ'],
  オリーブオイル: ['オリーブ油'],
  ごまオイル: ['ごま油'],
  ポテチ: ['ポテトチップス'],
  米: ['ごはん'],
  お米: ['ごはん'],
  こめ: ['ごはん'],
  白ごはん: ['ごはん'],
  玉子: ['卵'],
  玉子焼き: ['卵焼き'],
  挽肉: ['ひき肉'],
  挽き肉: ['ひき肉'],
  ミンチ: ['ひき肉'],
  ウィンナー: ['ウインナー'],
  アボガド: ['アボカド'],
  スパゲティ: ['スパゲッティ'],
  スパゲティー: ['スパゲッティ'],
  スパゲッティー: ['スパゲッティ'],
  パスタ: ['スパゲッティ'],
  おむすび: ['おにぎり'],
  珈琲: ['コーヒー'],
  カップ麺: ['カップラーメン', 'カップヌードル'],
  カップめん: ['カップラーメン', 'カップヌードル'],
  味噌汁: ['みそ汁'],
  お味噌汁: ['みそ汁'],
  おみそ汁: ['みそ汁'],
  豚汁: ['とん汁'],
  唐揚げ: ['から揚げ'],
  からあげ: ['から揚げ'],
}

const SYNONYM_MAP = new Map(Object.entries(SYNONYMS).map(([word, others]) => [normalizeForSearch(word), others]))

// 別の呼び名（入れた言葉は入れない）
export const synonymsOf = (word: string): string[] => SYNONYM_MAP.get(normalizeForSearch(word)) ?? []

// plain：書いたままの字でくらべる。reading：漢字の言葉をひらがなにそろえてくらべる（「鶏胸肉」「とりむね肉」で「鶏むね肉」）
type Rank = ReturnType<typeof splitRanker>

export type LookupQuery = {
  // 空白で区切った言葉ごとの、入れた言葉と別の呼び名（どれかに一致すればよい）。言葉はすべてに一致するものをさがす
  tokens: Rank[][]
  // 短い言葉をカタカナ・漢字で入れたとき、その字のまま（null なら確かめない）。下の「弱い一致」を見分けるのに使う
  strict: string | null
}

// 一致の度合い（小さいほど良い）：
// 0 語と完全一致 / 1 語の先頭が一致 / 2 画面に出る名前の途中に含まれる / 3 読みがな・成分表の名前の途中にだけ含まれる
export const RANK_PREFIX = 1
export const RANK_READING_ONLY = 3

// weak：短い言葉をカタカナ・漢字で入れたのに、画面に出る名前にはその字が入っていない一致。
// 「ツナ」で小松菜（こまつな）、「ツナ」でもつ鍋（もつなべ）のように、読みがなの途中にたまたま入っているだけのことが多いので、
// ほかに先頭からの一致があれば出さない（lookupCards.ts の searchLookup）
export type LookupMatch = { rank: number; weak: boolean }

const SEPARATOR = /[\s　、,，]+/
// カタカナ・漢字
const KATAKANA_OR_KANJI = /[ァ-ヺ㐀-鿿々]/
const STRICT_LENGTH = 2

// 字の種類（ひらがな・カタカナ）は変えずに、全角半角・大文字小文字・空白だけをそろえる
const sameScript = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\s+/g, '')

function tokenRankers(word: string): Rank[] {
  return [word, ...synonymsOf(word)].map((w) => splitRanker(w))
}

// 何も入っていなければ null
export function parseLookupQuery(query: string): LookupQuery | null {
  const words = query.split(SEPARATOR).filter((w) => normalizeForSearch(w))
  if (words.length === 0) return null
  const only = words.length === 1 ? sameScript(words[0]) : null
  return {
    tokens: words.map(tokenRankers),
    strict: only !== null && [...only].length <= STRICT_LENGTH && KATAKANA_OR_KANJI.test(only) ? only : null,
  }
}

// 2つの言葉の両方に一致するものをさがす（1つの言葉で見つからないときに、言葉を2つに分けてさがす用）
export function andQuery(a: string, b: string): LookupQuery {
  return { tokens: [tokenRankers(a), tokenRankers(b)], strict: null }
}

function rankOne(rank: Rank, visible: string[], readings: string[]): number | null {
  const v = rank.plain(...visible)
  // 読みがな・別名と、ひらがなにそろえた名前。語と同じ・語の先頭からなら、名前の一致と同じに扱う（「鶏胸肉」で「鶏むね肉」）。
  // 途中に入っているだけなら「読みがなの途中だけ」（「うどん」で牛丼＝ぎゅうどん を、名前の一致にしない）
  const r = Math.min(rank.plain(...readings) ?? RANK_READING_ONLY, rank.reading(...visible, ...readings) ?? RANK_READING_ONLY)
  const strong = Math.min(v ?? RANK_READING_ONLY, r)
  if (strong <= RANK_PREFIX) return strong
  if (v !== null) return 2
  return r < RANK_READING_ONLY ? RANK_READING_ONLY : null
}

// visible：画面に出る名前。readings：読みがな・別名・成分表の名前（画面には出ない）
export function matchLookup(q: LookupQuery, visible: string[], readings: string[]): LookupMatch | null {
  let worst = 0
  for (const alternatives of q.tokens) {
    let best: number | null = null
    for (const rank of alternatives) {
      const r = rankOne(rank, visible, readings)
      if (r !== null && (best === null || r < best)) best = r
      if (best === 0) break
    }
    if (best === null) return null
    if (best > worst) worst = best
  }
  const strict = q.strict
  const weak = strict !== null && worst > RANK_PREFIX && !visible.some((s) => sameScript(s).includes(strict))
  return { rank: worst, weak }
}

// 1つの言葉で何も見つからないときに試す、言葉の分け方（「さば缶」→「さば」と「缶」）。
// 後ろを短く切るものから。どちらも2文字以上になる分け方を先にためす
const SPLIT_MIN_LENGTH = 3
const SPLIT_MAX_TRIES = 6

export function splitCandidates(query: string): [string, string][] {
  const words = query.split(SEPARATOR).filter((w) => normalizeForSearch(w))
  if (words.length !== 1) return []
  const chars = [...sameScript(words[0])]
  if (chars.length < SPLIT_MIN_LENGTH) return []
  const splits: [string, string][] = []
  for (let i = chars.length - 1; i >= 1; i--) splits.push([chars.slice(0, i).join(''), chars.slice(i).join('')])
  const long = (s: string) => [...s].length >= 2
  return [...splits.filter(([a, b]) => long(a) && long(b)), ...splits.filter(([a, b]) => !(long(a) && long(b)))].slice(0, SPLIT_MAX_TRIES)
}

// ---- 候補の名前の中の、検索語と同じところ（太く見せる） ----

// さがしている言葉（区切って正規化したもの）
export function lookupWords(query: string): string[] {
  return query.split(SEPARATOR).map(normalizeReading).filter(Boolean)
}

// name の中で words のどれかと同じところを [はじめ, おわり) の並びで返す（ひらがな・カタカナ、全角・半角、大文字・小文字のちがいは同じとみなす）。
// 読みがなや別の呼び名で一致したところは、名前の中にないので返さない
export function highlightRanges(name: string, words: string[]): [number, number][] {
  const { text, start, end } = normalizeWithMap(name)
  const ranges: [number, number][] = []
  for (const w of words) {
    if (!w) continue
    for (let from = text.indexOf(w); from !== -1; from = text.indexOf(w, from + w.length)) ranges.push([start[from], end[from + w.length - 1]])
  }
  // 重なり・となり合わせをまとめる
  ranges.sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const r of ranges) {
    const last = merged.at(-1)
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else merged.push([r[0], r[1]])
  }
  return merged
}
