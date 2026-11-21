// 漢字とかなで書き方がゆれる食べものの言葉を、ひらがなにそろえる読み（「鶏胸肉」「とりむね肉」「鶏むね肉」を同じ言葉として読む）。
// さがす言葉と、名前・よみの両方を同じ決まりで直すので、読みが辞書のとおりでなくてもよい（牛乳・牛丼の「牛」は「ぎゅう」にそろえる、など）。
// 入れるのは、ふだん漢字でもかなでも書く言葉だけ。読みがほかの食べものと重なるもの（酒と鮭、桃ともも肉、柿と牡蠣）は入れない。
// 長い言葉を先に当てる（「豆腐」は「とうふ」。「豆」だけなら「まめ」）
const READINGS: Record<string, string> = {
  // 肉・卵・乳
  鶏: 'とり',
  鳥: 'とり',
  胸: 'むね',
  肉: 'にく',
  豚: 'ぶた',
  牛: 'ぎゅう',
  卵: 'たまご',
  玉子: 'たまご',
  牛乳: 'ぎゅうにゅう',
  // 魚・貝
  鮭: 'さけ',
  鯖: 'さば',
  鯵: 'あじ',
  鰯: 'いわし',
  鮪: 'まぐろ',
  鰹: 'かつお',
  鱈: 'たら',
  鰤: 'ぶり',
  鰻: 'うなぎ',
  蛸: 'たこ',
  蟹: 'かに',
  海老: 'えび',
  烏賊: 'いか',
  // 豆・大豆の食品
  豆腐: 'とうふ',
  納豆: 'なっとう',
  豆乳: 'とうにゅう',
  大豆: 'だいず',
  枝豆: 'えだまめ',
  小豆: 'あずき',
  豆: 'まめ',
  味噌: 'みそ',
  醤油: 'しょうゆ',
  // 野菜・いも・きのこ・海そう
  人参: 'にんじん',
  大根: 'だいこん',
  玉ねぎ: 'たまねぎ',
  玉葱: 'たまねぎ',
  葱: 'ねぎ',
  白菜: 'はくさい',
  茄子: 'なす',
  胡瓜: 'きゅうり',
  南瓜: 'かぼちゃ',
  蓮根: 'れんこん',
  牛蒡: 'ごぼう',
  筍: 'たけのこ',
  竹の子: 'たけのこ',
  生姜: 'しょうが',
  大蒜: 'にんにく',
  胡麻: 'ごま',
  ほうれん草: 'ほうれんそう',
  法蓮草: 'ほうれんそう',
  小松菜: 'こまつな',
  薩摩芋: 'さつまいも',
  里芋: 'さといも',
  山芋: 'やまいも',
  長芋: 'ながいも',
  芋: 'いも',
  椎茸: 'しいたけ',
  舞茸: 'まいたけ',
  松茸: 'まつたけ',
  茸: 'きのこ',
  若布: 'わかめ',
  昆布: 'こんぶ',
  海苔: 'のり',
  蒟蒻: 'こんにゃく',
  // 果物
  林檎: 'りんご',
  苺: 'いちご',
  蜜柑: 'みかん',
  葡萄: 'ぶどう',
  檸檬: 'れもん',
  西瓜: 'すいか',
  // 主食・めん
  ご飯: 'ごはん',
  御飯: 'ごはん',
  米: 'こめ',
  麦: 'むぎ',
  餅: 'もち',
  麺: 'めん',
  蕎麦: 'そば',
  饂飩: 'うどん',
  素麺: 'そうめん',
  丼: 'どん',
  寿司: 'すし',
  鮨: 'すし',
  // 料理のことば
  唐揚げ: 'からあげ',
  から揚げ: 'からあげ',
  天ぷら: 'てんぷら',
  天麩羅: 'てんぷら',
  刺身: 'さしみ',
  刺し身: 'さしみ',
  竹輪: 'ちくわ',
  蒲鉾: 'かまぼこ',
  茶: 'ちゃ',
}
const READING_WORDS = new RegExp(
  Object.keys(READINGS)
    .sort((a, b) => b.length - a.length)
    .join('|'),
  'g',
)

// 検索用の正規化：全角半角を揃え、カタカナをひらがなに、英字を小文字にする（漢字はそのまま）
export function normalizeForSearch(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/\s+/g, '')
}

// 正規化した言葉の、書き方がゆれる漢字の言葉をひらがなにそろえる
const foldReading = (normalized: string): string => normalized.replace(READING_WORDS, (w) => READINGS[w])

// 検索用の正規化に加えて、書き方がゆれる漢字の言葉をひらがなにそろえる（「鶏胸肉」も「とりむね肉」も「とりむねにく」）
export const normalizeReading = (s: string): string => foldReading(normalizeForSearch(s))

// ひらがなにそろえた字と、その字が元の文字列のどこから来たか（start[i] 以上 end[i] 未満）。名前の中の、検索語と同じところを太く見せるのに使う。
// 漢字の言葉をひらがなにそろえたところは、どの字も元の言葉ぜんたいを指す（「たま」で「卵」の1字を太くする）
export function normalizeWithMap(s: string): { text: string; start: number[]; end: number[] } {
  // 1文字ずつ直して、直したあとの位置から元の位置をたどれるようにする
  let base = ''
  const at: number[] = []
  for (let i = 0; i < s.length; i++) {
    for (const c of normalizeForSearch(s[i])) {
      base += c
      at.push(i)
    }
  }
  let text = ''
  const start: number[] = []
  const end: number[] = []
  let from = 0
  const copy = (to: number) => {
    for (let k = from; k < to; k++) {
      text += base[k]
      start.push(at[k])
      end.push(at[k] + 1)
    }
  }
  for (const m of base.matchAll(READING_WORDS)) {
    copy(m.index)
    const last = m.index + m[0].length
    for (const c of READINGS[m[0]]) {
      text += c
      start.push(at[m.index])
      end.push(at[last - 1] + 1)
    }
    from = last
  }
  copy(base.length)
  return { text, start, end }
}

// 検索語の区切り（よみ・同義語は「/」や空白で複数並べる）
const SPLIT = /[/\s　]+/

// 名前・よみを区切って正規化した語。市販品は2万件近くあり、1文字打つたびに全件を正規化すると
// スマホで1秒近くかかるので、同じ文字列は一度だけ正規化して覚えておく
const WORDS = new Map<string, string[]>()
// 漢字の言葉をひらがなにそろえた語（そろえても変わらない名前・よみは null。上の語と同じなので、もう一度は調べない）
const READING_WORDS_OF = new Map<string, string[] | null>()
const WORDS_LIMIT = 200_000

function normalizedWords(field: string): string[] {
  let words = WORDS.get(field)
  if (!words) {
    words = field.split(SPLIT).map(normalizeForSearch).filter(Boolean)
    if (WORDS.size >= WORDS_LIMIT) WORDS.clear()
    WORDS.set(field, words)
  }
  return words
}

function readingWords(field: string): string[] | null {
  let words = READING_WORDS_OF.get(field)
  if (words === undefined) {
    const plain = normalizedWords(field)
    const folded = plain.map(foldReading)
    words = folded.some((w, i) => w !== plain[i]) ? folded : null
    if (READING_WORDS_OF.size >= WORDS_LIMIT) READING_WORDS_OF.clear()
    READING_WORDS_OF.set(field, words)
  }
  return words
}

// 検索に使う名前・よみを、手が空いたときに少しずつ正規化しておく（最初の1文字目で待たせないように）。
// 戻り値を呼ぶと途中でやめる
export function warmUpSearch(fields: (string | undefined)[], chunk = 3000): () => void {
  let i = 0
  let stopped = false
  const g = globalThis as { requestIdleCallback?: (f: () => void) => unknown }
  const later = (f: () => void) => (g.requestIdleCallback ? g.requestIdleCallback(f) : setTimeout(f, 0))
  const step = () => {
    if (stopped) return
    for (const end = Math.min(i + chunk, fields.length); i < end; i++) {
      const field = fields[i]
      if (field) readingWords(field)
    }
    if (i < fields.length) later(step)
  }
  later(step)
  return () => {
    stopped = true
  }
}

// 一致の度合い（小さいほど良い）。0: 語と完全一致 / 1: 語の先頭が一致 / 2: 語の途中に含まれる
const wordRank = (q: string, w: string): number | null => (w === q ? 0 : w.startsWith(q) ? 1 : w.includes(q) ? 2 : null)

// 正規化した検索語：plain はそのまま、reading は漢字の言葉をひらがなにそろえたもの（changed：そろえて変わったか）
type Query = { plain: string; reading: string; changed: boolean }

function toQuery(query: string): Query | null {
  const plain = normalizeForSearch(query)
  if (!plain) return null
  const reading = foldReading(plain)
  return { plain, reading, changed: reading !== plain }
}

// 書いたままの字でくらべる
function plainRank(q: string, fields: (string | undefined)[]): number | null {
  let best: number | null = null
  for (const field of fields) {
    if (!field) continue
    for (const w of normalizedWords(field)) {
      const rank = wordRank(q, w)
      if (rank !== null && (best === null || rank < best)) best = rank
      if (best === 0) return 0
    }
  }
  return best
}

// 漢字の言葉をひらがなにそろえてくらべる（「鶏胸肉」「とりむね肉」で「鶏むね肉」）。
// 検索語も名前・よみも、そろえて変わらないものどうしは、書いたままの字でくらべたのと同じなので調べない
function readingRank(q: Query, fields: (string | undefined)[]): number | null {
  let best: number | null = null
  for (const field of fields) {
    if (!field) continue
    const words = readingWords(field) ?? (q.changed ? normalizedWords(field) : null)
    if (!words) continue
    for (const w of words) {
      const rank = wordRank(q.reading, w)
      if (rank !== null && (best === null || rank < best)) best = rank
      if (best === 0) return 0
    }
  }
  return best
}

// 書いたままの字で一致しなければ、漢字の言葉をひらがなにそろえてくらべる
const rankOf = (q: Query, fields: (string | undefined)[]): number | null => plainRank(q.plain, fields) ?? readingRank(q, fields)

// 一致の度合い（小さいほど良い）。一致しなければ null
// 0: 語と完全一致 / 1: 語の先頭が一致 / 2: 語の途中に含まれる
export function matchRank(query: string, ...fields: (string | undefined)[]): number | null {
  const q = toQuery(query)
  if (!q) return 0
  return rankOf(q, fields)
}

export function matches(query: string, ...fields: (string | undefined)[]): boolean {
  return matchRank(query, ...fields) !== null
}

// 同じ検索語でたくさんの候補を調べるとき用（検索語の正規化を1回だけにする）。空の検索語はすべて一致
export function matcher(query: string): (...fields: (string | undefined)[]) => boolean {
  const q = toQuery(query)
  return q ? (...fields) => rankOf(q, fields) !== null : () => true
}

// 同じ検索語でたくさんの候補の一致の度合いを調べるとき用（matchRank と同じ結果。検索語の正規化を1回だけにする）
export function ranker(query: string): (...fields: (string | undefined)[]) => number | null {
  const q = toQuery(query)
  return q ? (...fields) => rankOf(q, fields) : () => 0
}

// 書いたままの字でくらべる度合いと、ひらがなにそろえてくらべる度合いを、別べつに調べる（「食品を調べる」の検索。lookupQuery.ts）。
// 画面に出る名前に、その字のまま入っているかどうかで並びを変えるため
export function splitRanker(query: string): { plain: (...fields: (string | undefined)[]) => number | null; reading: (...fields: (string | undefined)[]) => number | null } {
  const q = toQuery(query)
  if (!q) return { plain: () => 0, reading: () => 0 }
  return { plain: (...fields) => plainRank(q.plain, fields), reading: (...fields) => readingRank(q, fields) }
}

// 短い検索語（2文字以下）の途中一致は誤ヒットが多い（例：「つな」で「こまつな」）ので、
// 先頭一致が1件でもあれば途中一致は出さない
export const SHORT_QUERY_LENGTH = 2

const tier = (rank: number) => (rank <= 1 ? 0 : 1)

type Ranked<T> = { item: T; group: number; i: number; rank: number }

// 一致したものだけを並べる。完全一致・先頭一致（よく一致）を途中一致より前に置き、
// その中ではグループの順 → 一致の度合い → 元の並び。
// 短い検索語では、どこかに先頭一致があれば途中一致を出さない
function rankGroups<T>(groups: { items: T[]; fields: (item: T) => (string | undefined)[] }[], q: Query): T[] {
  const ranked = groups.flatMap(({ items, fields }, group) =>
    items
      .map((item, i) => ({ item, group, i, rank: rankOf(q, fields(item)) }))
      .filter((x): x is Ranked<T> => x.rank !== null),
  )
  const hasPrefix = ranked.some((x) => x.rank <= 1)
  return ranked
    .filter((x) => !(q.plain.length <= SHORT_QUERY_LENGTH && hasPrefix && x.rank === 2))
    .sort((a, b) => tier(a.rank) - tier(b.rank) || a.group - b.group || a.rank - b.rank || a.i - b.i)
    .map((x) => x.item)
}

export function rankAndFilter<T>(items: T[], query: string, fields: (item: T) => (string | undefined)[]): T[] {
  const q = toQuery(query)
  if (!q) return items
  return rankGroups([{ items, fields }], q)
}

// 種類の違うものをまとめて検索する（料理・市販品・食材の横断検索）。
// よく一致したものの中では、先に渡したグループを前に並べる（完全一致の食材より先頭一致の料理が前）
export function rankAcross<T>(groups: { items: T[]; fields: (item: T) => (string | undefined)[] }[], query: string): T[] {
  const q = toQuery(query)
  if (!q) return groups.flatMap((g) => g.items)
  return rankGroups(groups, q)
}
