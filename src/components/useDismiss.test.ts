import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ブラウザの履歴のまねごと（state・戻る・popstate だけ）
function fakeBrowser() {
  const entries: unknown[] = [{ screen: 'start' }]
  let index = 0
  const listeners: Record<string, (() => void)[]> = {}
  const history = {
    get state() {
      return entries[index]
    },
    pushState(state: unknown) {
      entries.splice(index + 1, entries.length, state)
      index++
    },
    replaceState(state: unknown) {
      entries[index] = state
    },
    back() {
      index--
      for (const fn of listeners.popstate ?? []) fn()
    },
  }
  const window = { addEventListener: (type: string, fn: () => void) => void (listeners[type] ??= []).push(fn) }
  return { history, window, entries, at: () => index }
}

describe('ダイアログの履歴と、画面の移動の履歴', () => {
  let browser: ReturnType<typeof fakeBrowser>
  let mod: typeof import('./useDismiss')
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.resetModules()
    browser = fakeBrowser()
    vi.stubGlobal('history', browser.history)
    vi.stubGlobal('window', browser.window)
    mod = await import('./useDismiss')
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('ダイアログがなければ、ふつうに履歴を足す', () => {
    mod.pushHistory({ screen: 'day' }, '/')
    expect(browser.entries).toEqual([{ screen: 'start' }, { screen: 'day' }])
    expect(browser.at()).toBe(1)
  })

  it('ダイアログをボタンで閉じたら、足した履歴を戻す', () => {
    const closed = mod.openDismissable(() => {})
    expect(browser.at()).toBe(1)
    closed()
    vi.runAllTimers()
    expect(browser.at()).toBe(0)
  })

  it('確認のダイアログを閉じてすぐに移動しても、移動が取り消されない（戻るで1つ前の画面）', () => {
    const closed = mod.openDismissable(() => {})
    closed()
    mod.pushHistory({ screen: 'day' }, '/')
    vi.runAllTimers()
    expect(browser.entries).toEqual([{ screen: 'start' }, { screen: 'day' }])
    expect(browser.at()).toBe(1)
  })

  it('ダイアログをひらいたまま移動して、あとで閉じても、移動先に残る', () => {
    const closed = mod.openDismissable(() => {})
    mod.pushHistory({ screen: 'day' }, '/')
    // 移動先の上に、ダイアログ用の履歴が足し直されている
    expect(browser.entries).toEqual([{ screen: 'start' }, { screen: 'day' }, { screen: 'day' }])
    closed()
    vi.runAllTimers()
    expect(browser.at()).toBe(1)
    expect(browser.history.state).toEqual({ screen: 'day' })
  })

  it('ダイアログをひらいたまま移動したあと、ブラウザの戻るではダイアログだけが閉じる', () => {
    const close = vi.fn()
    const closed = mod.openDismissable(close)
    mod.pushHistory({ screen: 'day' }, '/')
    browser.history.back()
    expect(close).toHaveBeenCalledTimes(1)
    closed()
    vi.runAllTimers()
    expect(browser.at()).toBe(1)
    expect(browser.history.state).toEqual({ screen: 'day' })
  })
})
