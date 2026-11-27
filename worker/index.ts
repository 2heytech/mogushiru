// Cloudflare Workers で、静的なファイルを返す前に動かす小さなプログラム（wrangler.jsonc の main）。
// 動くのは /ranking/ と /customize/ だけ（wrangler.jsonc の assets.run_worker_first）。ほかのページは、ここを通らずにそのまま配られる。
// やること：以前の ? つきの URL（/ranking/?n=iron・/customize/?dish=nikujaga）を、同じ中身の読みもののページへ 301 で送る。
// アプリを開くリンクを # に変える前の URL が検索エンジンに登録されて残っているので、読みもののページにまとめる（決まりは src/routes.ts）
import { legacyQueryRedirect } from '../src/routes'

// 静的なファイル（dist/）を返す口。wrangler.jsonc の assets.binding
export type Env = { ASSETS: { fetch: (request: Request) => Promise<Response> } }

// ここで作る答え（301）には、public/_headers の設定が付かない（付くのは、静的なファイルを返したときだけ）。
// 中身のない答えなので読みこみ先の決まり（CSP）などは要らないが、https で開かせる設定（HSTS）と nosniff は、ほかのページと同じものを付けておく
// （public/_headers と同じ値。src/pages/sitePages.test.tsx で、ずれていないかを確かめる）
export const REDIRECT_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
}

// 送り先は変わらないので、ブラウザや途中のキャッシュに1日おぼえさせてよい
const redirect = (to: URL) => new Response(null, { status: 301, headers: { ...REDIRECT_HEADERS, Location: to.toString(), 'Cache-Control': 'public, max-age=86400' } })

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'GET' || request.method === 'HEAD') {
      const url = new URL(request.url)
      const legacy = legacyQueryRedirect(url.pathname, url.search)
      if (legacy) {
        const to = new URL(legacy.path, url.origin)
        // 成分のページは決まった26だけ。料理は、作り方のページがあるときだけ送る（ないときは、これまでどおりアプリの画面を出す）
        if (legacy.kind === 'nutrient' || (await env.ASSETS.fetch(new Request(to, { method: 'HEAD' }))).status === 200) return redirect(to)
      }
    }
    return env.ASSETS.fetch(request)
  },
}
