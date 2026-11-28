// アクセス解析の Google アナリティクス（GA4）。Cloudflare Web Analytics（Cloudflare が配るときに差しこむ）と並べて使う。
// - 測定 ID は src/site.ts の GA_MEASUREMENT_ID。空・形がちがうときは、何も読まず、何も送らない
// - ページに入れるのは、このサイトの小さなプログラム public/ga.js を読む1行だけ（サイトの設定＝CSP で、HTML の中に直接書いたプログラムは動かないため）。
//   ga.js が、公開サイトのドメインで開いたときだけ、ページを読みおわったあとに Google のプログラム（gtag.js）を読む
// - 送るのは、ページを開いたこと（アプリでは画面を切りかえたことも）と、Google アナリティクスが自動で数えるもの（読み進めた・外のサイトへのリンクを押した）。
//   入力した内容（年齢・体重・食事など）は送らない。アドレスの # のうしろも送らない
// - 広告のための機能（Google シグナル・広告のパーソナライズ）は使わない
import { SITE_URL } from './routes'
import { GA_MEASUREMENT_ID } from './site'

// Google アナリティクスを読みこむプログラム（public/ga.js）
export const GA_SCRIPT = '/ga.js'

const GA_ID_SHAPE = /^G-[A-Z0-9]{6,14}$/

// 使える測定 ID（空・形がちがうときは null）
export const gaMeasurementId = (id: string = GA_MEASUREMENT_ID): string | null => (GA_ID_SHAPE.test(id) ? id : null)

// Google アナリティクスを使っているか（「このサイトについて」の文を出すかどうかも、これで決める）
export const gaEnabled = (id: string = GA_MEASUREMENT_ID): boolean => gaMeasurementId(id) !== null

// ページの head に入れる1行。送ってよいドメイン（公開サイト）もここで渡す：手元・PR ごとのプレビューで開いても、Google には送らない
export function gaScriptTag(id: string = GA_MEASUREMENT_ID): string {
  const valid = gaMeasurementId(id)
  return valid ? `<script src="${GA_SCRIPT}" data-ga-id="${valid}" data-ga-host="${new URL(SITE_URL).hostname}" defer></script>` : ''
}

// 書き出した HTML（アプリの画面・読みもののページ・404）の head の終わりに、上の1行を入れる。測定 ID がなければ、そのまま返す
export function withGa(html: string, id: string = GA_MEASUREMENT_ID): string {
  const tag = gaScriptTag(id)
  if (!tag) return html
  if (!html.includes('</head>')) throw new Error('HTML に </head> が見つかりません（Google アナリティクスの1行を入れる場所です）')
  return html.replace('</head>', () => `  ${tag}\n  </head>`)
}

// ---- アプリの中（ブラウザ）で使う ----

type Gtag = (...args: unknown[]) => void

// アプリの中で画面を切りかえた（栄養バランス → 食品を調べる など）ときに、ページを開いたこととして送る。
// ページを読みこんだときの1回目は、ga.js が送る。Google アナリティクスの管理画面では、拡張計測機能の
// 「ブラウザの履歴イベントに基づくページの変更」をオフにしておく（オンだと、窓をひらくたび・同じ移動で2回、数えられる）。
// ga.js が動いていない（測定 ID がない・公開サイトでない）ときは、何もしない。送れなくても、画面の動きには関わらせない
export function trackPageView(path: string, title: string): void {
  try {
    // window と書かないのは、このファイルを、ページを書き出すとき（Node）にも読むため
    const page = globalThis as unknown as { gtag?: Gtag; location: { origin: string } }
    if (typeof page.gtag !== 'function') return
    page.gtag('set', { page_location: page.location.origin + path, page_title: title })
    page.gtag('event', 'page_view')
  } catch {
    // 送れなくても何もしない
  }
}
