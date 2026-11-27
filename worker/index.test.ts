import { describe, expect, it } from 'vitest'
import worker, { REDIRECT_HEADERS, type Env } from './index'

// 静的なファイルの代わり：ある料理のページだけ 200、ほかは 404。アプリの画面は 200
const env: Env = {
  ASSETS: {
    fetch: async (request) => {
      const { pathname } = new URL(request.url)
      if (pathname.startsWith('/dishes/')) return new Response(null, { status: pathname === '/dishes/nikujaga/' ? 200 : 404 })
      return new Response(`asset:${pathname}`, { status: 200 })
    },
  },
}
const get = (url: string, method = 'GET') => worker.fetch(new Request(url, { method }), env)

describe('以前の ? つきの URL を、読みもののページへ 301 で送る', () => {
  it('/ranking/?n=<成分> は、同じ名前の /nutrients/<成分>/ へ', async () => {
    const res = await get('https://mogushiru.app/ranking/?n=caffeine')
    expect(res.status).toBe(301)
    expect(res.headers.get('Location')).toBe('https://mogushiru.app/nutrients/caffeine/')
    expect((await get('https://mogushiru.app/ranking?n=vitamin-c', 'HEAD')).headers.get('Location')).toBe('https://mogushiru.app/nutrients/vitamin-c/')
  })

  it('/customize/?dish=<料理> は、作り方のページがあるときだけ /dishes/<料理>/ へ', async () => {
    const res = await get('https://mogushiru.app/customize/?dish=nikujaga')
    expect(res.status).toBe(301)
    expect(res.headers.get('Location')).toBe('https://mogushiru.app/dishes/nikujaga/')
    // ページのない料理は、アプリの画面のまま
    const none = await get('https://mogushiru.app/customize/?dish=no-such-dish')
    expect(none.status).toBe(200)
    expect(await none.text()).toBe('asset:/customize/')
  })

  it('指定のない URL・知らない成分・# の指定は、そのままアプリの画面を返す', async () => {
    for (const url of ['https://mogushiru.app/ranking/', 'https://mogushiru.app/ranking/?n=unknown', 'https://mogushiru.app/ranking/?utm_source=x', 'https://mogushiru.app/customize/']) {
      const res = await get(url)
      expect(res.status, url).toBe(200)
      expect(await res.text(), url).toMatch(/^asset:\/(ranking|customize)\/$/)
    }
  })

  it('読むだけでないリクエスト（POST など）は送らない', async () => {
    expect((await get('https://mogushiru.app/ranking/?n=iron', 'POST')).status).toBe(200)
  })

  it('301 の答えにも、https で開かせる設定（HSTS）と nosniff を付ける（public/_headers は、ここで作る答えには付かない）', async () => {
    for (const url of ['https://mogushiru.app/ranking/?n=iron', 'https://mogushiru.app/customize/?dish=nikujaga']) {
      const res = await get(url)
      expect(res.status, url).toBe(301)
      expect(res.headers.get('Strict-Transport-Security'), url).toBe(REDIRECT_HEADERS['Strict-Transport-Security'])
      expect(res.headers.get('X-Content-Type-Options'), url).toBe('nosniff')
    }
  })
})
