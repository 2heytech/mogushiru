import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ブラウザの履歴とアドレス欄のまねごと（URL・戻る・popstate だけ）
function fakeBrowser(start: string) {
  const entries: { state: unknown; url: string }[] = [{ state: { screen: 'start' }, url: start }]
  let index = 0
  const listeners: Record<string, (() => void)[]> = {}
  const history = {
    get state() {
      return entries[index].state
    },
    pushState(state: unknown, _title: string, url?: string) {
      entries.splice(index + 1, entries.length, { state, url: url ?? entries[index].url })
      index++
    },
    replaceState(state: unknown, _title: string, url?: string) {
      entries[index] = { state, url: url ?? entries[index].url }
    },
    back() {
      index--
      for (const fn of listeners.popstate ?? []) fn()
    },
  }
  const window = {
    history,
    addEventListener: (type: string, fn: () => void) => void (listeners[type] ??= []).push(fn),
    get location() {
      const url = new URL(entries[index].url, 'https://example.test')
      return { pathname: url.pathname, search: url.search, hash: url.hash }
    },
  }
  return { history, window, document: { title: '食品を調べる' }, url: () => entries[index].url, urls: () => entries.map((e) => e.url), at: () => index }
}

describe('食品の窓をひらいているあいだのアドレス', () => {
  let browser: ReturnType<typeof fakeBrowser>
  let dismiss: typeof import('./useDismiss')
  let address: typeof import('./dialogAddress')
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.resetModules()
    browser = fakeBrowser('/foods/')
    vi.stubGlobal('history', browser.history)
    vi.stubGlobal('window', browser.window)
    vi.stubGlobal('document', browser.document)
    dismiss = await import('./useDismiss')
    address = await import('./dialogAddress')
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('ひらくと、その食品のページのアドレスとタブの名前になる（元の画面の履歴は、そのまま下に残る）', () => {
    dismiss.openDismissable(() => {})
    address.showAddress('/foods/natto/', '納豆のカロリーと栄養｜モグシル')
    expect(browser.urls()).toEqual(['/foods/', '/foods/natto/'])
    expect(browser.url()).toBe('/foods/natto/')
    expect(browser.document.title).toBe('納豆のカロリーと栄養｜モグシル')
  })

  it('ボタンで閉じると、元のアドレスとタブの名前にもどる（「進む」でもどっても、窓のないまま食品のアドレスにならない）', () => {
    const closed = dismiss.openDismissable(() => {})
    const restore = address.showAddress('/foods/natto/', '納豆のカロリーと栄養｜モグシル')
    // 閉じるときは、ひらいたときと同じ順（窓の履歴 → アドレス）で片づける
    closed()
    restore()
    vi.runAllTimers()
    expect(browser.at()).toBe(0)
    expect(browser.url()).toBe('/foods/')
    expect(browser.urls()).toEqual(['/foods/', '/foods/'])
    expect(browser.document.title).toBe('食品を調べる')
  })

  it('「戻る」で閉じたときは、もう元のアドレスなので、書きかえない', () => {
    let restore = () => {}
    const closed = dismiss.openDismissable(() => {
      closed()
      restore()
    })
    restore = address.showAddress('/foods/natto/')
    browser.history.back()
    vi.runAllTimers()
    expect(browser.at()).toBe(0)
    expect(browser.url()).toBe('/foods/')
    // 進んだ先には食品のアドレスが残る（そこへ進んだら、App.tsx が読みこみ直して食品のページを出す）
    expect(browser.urls()).toEqual(['/foods/', '/foods/natto/'])
  })

  it('成分ランキングからひらいたときは、閉じると成分ランキングのアドレスにもどる', () => {
    browser = fakeBrowser('/ranking/')
    vi.stubGlobal('history', browser.history)
    vi.stubGlobal('window', browser.window)
    const closed = dismiss.openDismissable(() => {})
    const restore = address.showAddress('/foods/tofu/')
    expect(browser.url()).toBe('/foods/tofu/')
    closed()
    restore()
    vi.runAllTimers()
    expect(browser.url()).toBe('/ranking/')
  })
})
