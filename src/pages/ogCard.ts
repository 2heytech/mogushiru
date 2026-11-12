// SNS などに貼ったときに出る画像（ページごと）に入れる中身。絵にするのは scripts/lib/ogImage.tsx
export type OgCard = {
  title: string
  sub: string
  // ランキングの上位（3つまで）。image は public からのパス（/illustrations/…）
  rows?: { name: string; value: string; ratio: number; image: string }[]
  // とりすぎに気をつけたい成分は棒の色を変える
  caution?: boolean
  // 名前を並べる（成分の一覧など）
  chips?: string[]
  // 絵を並べる（献立の料理など）。public からのパス
  icons?: string[]
}
