// 検索用の正規化：全角半角を揃え、カタカナをひらがなに、英字を小文字にする
export function normalizeForSearch(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/\s+/g, '')
}

export function matches(query: string, ...fields: (string | undefined)[]): boolean {
  const q = normalizeForSearch(query)
  if (!q) return true
  return fields.some((f) => f !== undefined && normalizeForSearch(f).includes(q))
}
