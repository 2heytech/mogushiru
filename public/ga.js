// Google アナリティクス（GA4）を読みこむ、小さなプログラム。測定 ID があるとき、全部のページが読む（入れているのは src/analytics.ts）。
// - 測定 ID（data-ga-id）と、送ってよいドメイン（data-ga-host）は、このプログラムを読む script の印でもらう
// - 公開サイトのドメインで開いたときだけ動く（手元や、PR ごとのプレビューで開いても、Google には何も送らない）
// - 表示を遅らせないよう、ページを読みおわって、ブラウザの手が空いてから（遅くとも3秒後に）Google のプログラム（gtag.js）を読む。
//   それまでに起きたことは dataLayer にためてあり、読みこんだときにまとめて送られる
// - 送るページのアドレスは、# のうしろを落とす（アプリを開くリンクの #menu=… など。選んだものは送らない）
// - 広告のための機能は使わない（Google シグナル・広告のパーソナライズをオフ、広告用の保存を「許可しない」）
// - EU（欧州経済領域）・英国・スイスからの訪問では、Cookie を使わない（同意を聞く表示を出していないので、解析用の保存を「許可しない」にする。
//   どこからの訪問かは、Google のプログラムが見分ける）
// このプログラムが動かなくても、サイトはそのまま使える
;(function () {
  var NO_COOKIE_REGIONS = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH']
  var me = document.currentScript
  var id = me && me.getAttribute('data-ga-id')
  var host = me && me.getAttribute('data-ga-host')
  if (!id || !host || location.hostname !== host) return

  window.dataLayer = window.dataLayer || []
  // Google のプログラムは、配列ではなく arguments のまま受け取る
  function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag = gtag

  gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' })
  gtag('consent', 'default', { analytics_storage: 'denied', region: NO_COOKIE_REGIONS })
  gtag('js', new Date())
  gtag('set', { page_location: location.origin + location.pathname + location.search })
  gtag('config', id, { allow_google_signals: false, allow_ad_personalization_signals: false })

  function load() {
    var s = document.createElement('script')
    s.async = true
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id)
    document.head.appendChild(s)
  }
  function later() {
    if ('requestIdleCallback' in window) window.requestIdleCallback(load, { timeout: 3000 })
    else setTimeout(load, 300)
  }
  if (document.readyState === 'complete') later()
  else window.addEventListener('load', later, { once: true })
})()
