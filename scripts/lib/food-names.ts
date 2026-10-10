// 成分表の食品名 → 表示名・検索語（純粋関数）
// 原表の食品名は「＜大分類＞ （中分類） 食品 ［区分］ 部位 調理法」のように分類語を重ねた形なので、
// 表示用に分類の記号を外し、よく使う呼び方（ごはん・鶏肉など）を検索語として足す。

export type Synonym = { match: string; add: string[]; group?: string }
export type FoodNames = { synonyms: Synonym[]; displayNames: { id: string; name: string }[] }

// 全角空白などを半角空白1つに揃える
export const squashSpaces = (s: string) => s.replace(/[\s　]+/g, ' ').trim()

// 機械的な表示名：＜＞の大分類は外し、（）の中分類は続く語に含まれていれば外す。［］は記号だけ外す。
// 「ロースハム ロースハム」のような同じ語の連続は1つにする。
export function makeDisplayName(name: string): string {
  const tokens = squashSpaces(name).split(' ')
  const out: string[] = []
  tokens.forEach((t, i) => {
    if (/^＜.*＞$/.test(t)) return
    const paren = t.match(/^（(.*)）$/)
    if (paren && i < tokens.length - 1) {
      const word = paren[1].replace(/類$/, '')
      if (tokens.slice(i + 1).some((r) => r.includes(word))) return
      out.push(word)
      return
    }
    const bracket = t.match(/^［(.*)］$/)
    if (bracket) {
      // ［パン類］のような分類名は外し、［水稲めし］のような区分は残す
      if (!/類$/.test(bracket[1])) out.push(bracket[1])
      return
    }
    if (out[out.length - 1] !== t) out.push(t)
  })
  return out.join(' ')
}

// 食品名に当てはまる同義語を集める（重複は除く）
export function synonymTerms(name: string, group: string, synonyms: Synonym[]): string[] {
  const n = squashSpaces(name)
  const terms = synonyms.filter((s) => (!s.group || s.group === group) && n.includes(s.match)).flatMap((s) => s.add)
  return [...new Set(terms)]
}

// カタカナ → ひらがな
export const toHiragana = (s: string) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
