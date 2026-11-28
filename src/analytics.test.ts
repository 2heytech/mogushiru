import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GA_SCRIPT, gaEnabled, gaMeasurementId, gaScriptTag, trackPageView, withGa } from './analytics'
import { GA_MEASUREMENT_ID } from './site'

// Google アナリティクス（GA4）の入れ方：ページに入れる1行（src/analytics.ts）と、それが読むプログラム（public/ga.js）。
// ここでは、Google のプログラム（gtag.js）を読まずに確かめられるところ（入れる条件・渡す設定・順番）を確かめる。
// 実際に Google へ送られる中身（アドレス・Cookie）は、PR のときにブラウザで、送信を受け止めて確かめる

// テスト用の測定 ID（架空。形だけ合わせてある）
const TEST_ID = 'G-TEST123456'

const source = readFileSync(new URL('../public/ga.js', import.meta.url), 'utf8')

type Command = unknown[]
type Fake = {
  window: { dataLayer?: IArguments[]; gtag?: (...args: unknown[]) => void; requestIdleCallback?: (run: () => void, options: { timeout: number }) => void; addEventListener: (type: string, run: () => void, options?: unknown) => void }
  commands: () => Command[]
  // 足された script（Google のプログラム）の src
  loaded: string[]
  // ページを読みおわった（load）・ブラウザの手が空いた・setTimeout の時間がたった
  fireLoad: () => void
  fireIdle: () => void
  fireTimers: () => void
  idleOptions: { timeout: number }[]
  timerDelays: number[]
}

// ブラウザと同じ「ふつうのスクリプト」として、作りものの window・document・location で動かす
function run({ id = TEST_ID as string | null, host = 'mogushiru.app' as string | null, hostname = 'mogushiru.app', href = 'https://mogushiru.app/', readyState = 'loading', idle = true } = {}): Fake {
  const url = new URL(href)
  const onLoad: (() => void)[] = []
  const onIdle: (() => void)[] = []
  const timers: (() => void)[] = []
  const fake: Fake = {
    window: {
      addEventListener: (type, fn) => {
        if (type === 'load') onLoad.push(fn)
      },
    },
    commands: () => (fake.window.dataLayer ?? []).map((args) => Array.from(args)),
    loaded: [],
    fireLoad: () => onLoad.splice(0).forEach((fn) => fn()),
    fireIdle: () => onIdle.splice(0).forEach((fn) => fn()),
    fireTimers: () => timers.splice(0).forEach((fn) => fn()),
    idleOptions: [],
    timerDelays: [],
  }
  if (idle) {
    fake.window.requestIdleCallback = (fn, options) => {
      onIdle.push(fn)
      fake.idleOptions.push(options)
    }
  }
  const attrs: Record<string, string | null> = { 'data-ga-id': id, 'data-ga-host': host }
  const document = {
    currentScript: { getAttribute: (name: string) => attrs[name] ?? null },
    readyState,
    createElement: () => ({ async: false, src: '' }),
    head: { appendChild: (el: { src: string }) => fake.loaded.push(el.src) },
  }
  const location = { hostname, origin: url.origin, pathname: url.pathname, search: url.search, hash: url.hash }
  const setTimeout = (fn: () => void, ms: number) => {
    timers.push(fn)
    fake.timerDelays.push(ms)
  }
  new Function('window', 'document', 'location', 'setTimeout', source)(fake.window, document, location, setTimeout)
  return fake
}

describe('測定 ID（src/site.ts の GA_MEASUREMENT_ID）', () => {
  it('「G-」で始まる形だけを使う。空・形がちがうときは、使わない', () => {
    expect(gaMeasurementId(TEST_ID)).toBe(TEST_ID)
    expect(gaEnabled(TEST_ID)).toBe(true)
    for (const bad of ['', 'UA-12345-1', 'GTM-ABC1234', 'g-test123456', 'G-TEST 123', 'G-TEST"><script>', ' G-TEST123456']) {
      expect(gaMeasurementId(bad), bad).toBeNull()
      expect(gaEnabled(bad), bad).toBe(false)
    }
  })

  it('いまの設定は、空か、使える形（形のちがう値を入れたままにしない）', () => {
    if (GA_MEASUREMENT_ID !== '') expect(gaMeasurementId()).toBe(GA_MEASUREMENT_ID)
  })
})

describe('ページに入れる1行', () => {
  const HTML = '<!doctype html>\n<html lang="ja">\n  <head>\n    <title>モグシル</title>\n  </head>\n  <body>\n    <div id="root"></div>\n  </body>\n</html>'

  it('このサイトの ga.js を読む1行だけ。測定 ID と、送ってよいドメイン（公開サイト）を印で渡す', () => {
    expect(GA_SCRIPT).toBe('/ga.js')
    expect(gaScriptTag(TEST_ID)).toBe(`<script src="/ga.js" data-ga-id="${TEST_ID}" data-ga-host="mogushiru.app" defer></script>`)
  })

  it('head の終わりに1回だけ入れる。HTML の中に直接書いたプログラム・Google のプログラムを読む行は、入れない', () => {
    const out = withGa(HTML, TEST_ID)
    expect(out.match(/<script[^>]*>/g)).toEqual([`<script src="/ga.js" data-ga-id="${TEST_ID}" data-ga-host="mogushiru.app" defer>`])
    expect(out.indexOf('<script')).toBeLessThan(out.indexOf('</head>'))
    expect(out.indexOf('<title>')).toBeLessThan(out.indexOf('<script'))
    expect(out).not.toContain('googletagmanager')
    expect(out.replace(/\s*<script[^>]*><\/script>\n/, '\n')).toBe(HTML)
  })

  it('測定 ID がない・形がちがうときは、何も入れない', () => {
    expect(gaScriptTag('')).toBe('')
    expect(withGa(HTML, '')).toBe(HTML)
    expect(withGa(HTML, 'UA-12345-1')).toBe(HTML)
  })

  it('入れる場所（</head>）がない HTML は、だまって通さない', () => {
    expect(() => withGa('<html></html>', TEST_ID)).toThrow()
    expect(withGa('<html></html>', '')).toBe('<html></html>')
  })
})

describe('Google アナリティクスを読みこむプログラム（public/ga.js）', () => {
  it('公開サイトのドメインで開いたときだけ動く（手元・PR ごとのプレビューでは、何もしない）', () => {
    for (const hostname of ['localhost', '127.0.0.1', 'mogushiru.2heytech.workers.dev', 'feature-x-mogushiru.2heytech.workers.dev', 'www.mogushiru.app', 'mogushiru.app.example.com']) {
      const fake = run({ hostname })
      fake.fireLoad()
      fake.fireIdle()
      expect(fake.window.dataLayer, hostname).toBeUndefined()
      expect(fake.window.gtag, hostname).toBeUndefined()
      expect(fake.loaded, hostname).toEqual([])
    }
    expect(run().window.gtag).toBeTypeOf('function')
  })

  it('測定 ID・ドメインの印がないときは、何もしない', () => {
    for (const fake of [run({ id: null }), run({ id: '' }), run({ host: null }), run({ host: '' })]) {
      fake.fireLoad()
      expect(fake.window.dataLayer).toBeUndefined()
      expect(fake.loaded).toEqual([])
    }
  })

  it('Google のプログラムに渡す設定：広告のための機能は使わない。アドレスは # のうしろを落とす', () => {
    const fake = run({ href: 'https://mogushiru.app/foods/?utm_source=x#compare=01088,01026' })
    const commands = fake.commands()
    expect(commands.map((c) => c.slice(0, 2).filter((x) => typeof x === 'string').join(' '))).toEqual(['consent default', 'consent default', 'js', 'set', `config ${TEST_ID}`])
    // 広告用の保存は、どこからの訪問でも「許可しない」。解析用（Cookie）は「許可する」
    expect(commands[0][2]).toEqual({ ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' })
    expect(commands[2][1]).toBeInstanceOf(Date)
    // 送るアドレス：パスと ? まで。# のうしろ（アプリを開くリンクの指定）は送らない
    expect(commands[3][1]).toEqual({ page_location: 'https://mogushiru.app/foods/?utm_source=x' })
    expect(commands[4][2]).toEqual({ allow_google_signals: false, allow_ad_personalization_signals: false })
    // Google のプログラムは、配列ではなく arguments のまま受け取る
    expect(Object.prototype.toString.call(fake.window.dataLayer![0])).toBe('[object Arguments]')
  })

  it('EU（欧州経済領域）・英国・スイスからの訪問では、解析用の保存（Cookie）も「許可しない」', () => {
    const regional = run().commands()[1][2] as { analytics_storage: string; region: string[] }
    expect(regional.analytics_storage).toBe('denied')
    const EU = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE']
    expect([...regional.region].sort()).toEqual([...EU, 'IS', 'LI', 'NO', 'GB', 'CH'].sort())
    expect(new Set(regional.region).size).toBe(32)
    for (const code of ['JP', 'US']) expect(regional.region).not.toContain(code)
  })

  it('Google のプログラム（gtag.js）は、ページを読みおわって、ブラウザの手が空いてから読む（遅くとも3秒後）', () => {
    const fake = run()
    expect(fake.loaded).toEqual([])
    fake.fireLoad()
    expect(fake.loaded).toEqual([])
    expect(fake.idleOptions).toEqual([{ timeout: 3000 }])
    fake.fireIdle()
    expect(fake.loaded).toEqual([`https://www.googletagmanager.com/gtag/js?id=${TEST_ID}`])
    // 読みおわったあとに動いたとき（あとから足された・キャッシュから出た）も、同じ
    const late = run({ readyState: 'complete' })
    expect(late.idleOptions).toEqual([{ timeout: 3000 }])
    late.fireIdle()
    expect(late.loaded).toHaveLength(1)
  })

  it('手が空いたことを知らせるしくみ（requestIdleCallback）がないブラウザでは、少し待ってから読む', () => {
    const fake = run({ idle: false })
    fake.fireLoad()
    expect(fake.loaded).toEqual([])
    expect(fake.timerDelays).toEqual([300])
    fake.fireTimers()
    expect(fake.loaded).toEqual([`https://www.googletagmanager.com/gtag/js?id=${TEST_ID}`])
  })

  it('読みこむ場所と送信先は、読みこんでよい場所の決まり（CSP）に入っている。広告のための場所は入れない', () => {
    const csp = /^\s+Content-Security-Policy: (.*)$/m.exec(readFileSync(new URL('../public/_headers', import.meta.url), 'utf8'))![1]
    const rule = (name: string) => csp.split(';').map((x) => x.trim().split(/\s+/)).find((x) => x[0] === name)!.slice(1)
    const fake = run()
    fake.fireLoad()
    fake.fireIdle()
    expect(rule('script-src')).toContain(new URL(fake.loaded[0]).origin)
    // Google が案内している、GA4 に要る場所（送信先は、地域ごとに region1.google-analytics.com などに分かれる）
    expect(rule('connect-src').filter((x) => /google/.test(x))).toEqual(['https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com'])
    expect(rule('img-src').filter((x) => /google/.test(x))).toEqual(['https://*.google-analytics.com', 'https://*.googletagmanager.com'])
    expect(rule('script-src').filter((x) => /google/.test(x))).toEqual(['https://www.googletagmanager.com'])
    // HTML の中に直接書いたプログラムは、動かさないまま
    expect(csp).not.toContain('unsafe-inline')
    expect(csp).not.toMatch(/doubleclick|googlesyndication|googleadservices/)
  })

  it('プログラムの中に、測定 ID を書かない（ページの印でもらう。別のサイトを作るとき、src/site.ts だけ直せばよい）', () => {
    expect(source).not.toMatch(/G-[A-Z0-9]{6,}/)
  })
})

describe('アプリの中で画面を切りかえたとき（trackPageView）', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('画面のパスと題名を、ページを開いたこととして送る（# や ? は付けない）', () => {
    const calls: unknown[][] = []
    vi.stubGlobal('gtag', (...args: unknown[]) => calls.push(args))
    vi.stubGlobal('location', { origin: 'https://mogushiru.app', pathname: '/', hash: '#menu=washoku' })
    trackPageView('/ranking/', 'ランキングを並べ替え')
    expect(calls).toEqual([
      ['set', { page_location: 'https://mogushiru.app/ranking/', page_title: 'ランキングを並べ替え' }],
      ['event', 'page_view'],
    ])
  })

  it('ga.js が動いていない（測定 ID がない・公開サイトでない）ときは、何もしない。送れなくても、止まらない', () => {
    vi.stubGlobal('location', { origin: 'http://localhost:5173' })
    expect(() => trackPageView('/foods/', '食品を調べる')).not.toThrow()
    vi.stubGlobal('gtag', () => {
      throw new Error('送れない')
    })
    expect(() => trackPageView('/foods/', '食品を調べる')).not.toThrow()
  })
})
