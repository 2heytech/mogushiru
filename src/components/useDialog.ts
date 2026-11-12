import { useEffect, useRef, useState, type RefObject } from 'react'
import { useDismiss } from './useDismiss'

// ダイアログの共通の動き。Esc・戻るで閉じる（useDismiss）のに加えて、キーボードだけで使えるようにする：
// ・ひらいたらフォーカスをダイアログの中に移す
// ・Tab / Shift+Tab はダイアログの中だけを回る（うしろの画面に出ていかない）
// ・閉じたら、ひらいたボタンにフォーカスを戻す
// 返す ref を role="dialog" の要素（tabIndex={-1}）に付ける。ひらいたボタンが消えたときの戻り先として、main にも tabIndex={-1} を付けておく。重なっているときは、いちばん上のダイアログだけがフォーカスを持つ

const TABBABLE = 'a[href], button, input, select, textarea, summary, [tabindex]'

// Tab で止まる要素（見えていて、使えるもの）を並び順で返す
function tabbables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (el) =>
      el.tabIndex >= 0 &&
      !(el as HTMLButtonElement).disabled &&
      !(el instanceof HTMLInputElement && el.type === 'hidden') &&
      !el.closest('[inert]') &&
      el.getClientRects().length > 0,
  )
}

const dialogs: HTMLElement[] = []
let listening = false

function listen() {
  if (listening) return
  listening = true
  document.addEventListener('keydown', (e) => {
    const top = dialogs.at(-1)
    if (e.key !== 'Tab' || !top) return
    const items = tabbables(top)
    if (items.length === 0) {
      e.preventDefault()
      top.focus()
      return
    }
    const active = document.activeElement
    const inside = active !== top && top.contains(active)
    // 端まで来たら反対の端へ。フォーカスが中にないとき（ひらいた直後など）は最初か最後へ
    if (e.shiftKey ? !inside || active === items[0] : !inside || active === items.at(-1)) {
      e.preventDefault()
      ;(e.shiftKey ? items.at(-1)! : items[0]).focus()
    }
  })
  // Tab 以外（スマホのキーボードの「次へ」など）でうしろの画面にフォーカスが出たときも、中に戻す
  document.addEventListener('focusin', (e) => {
    const top = dialogs.at(-1)
    if (!top || !(e.target instanceof Node) || top.contains(e.target)) return
    ;(tabbables(top)[0] ?? top).focus()
  })
}

export function useDialog<T extends HTMLElement = HTMLDivElement>(onClose: () => void): RefObject<T | null> {
  useDismiss(onClose)
  const ref = useRef<T>(null)
  // ひらく前にフォーカスがあったところ（ひらいたボタン）。autoFocus で中に移る前の、最初の描画のうちに覚える
  const [opener] = useState(() => (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null))
  useEffect(() => {
    const el = ref.current
    if (!el) return
    listen()
    dialogs.push(el)
    // 中の要素（autoFocus のボタンなど）にもうフォーカスがあれば、そのままにする
    if (!el.contains(document.activeElement)) el.focus({ preventScroll: true })
    return () => {
      dialogs.splice(dialogs.lastIndexOf(el), 1)
      if (!opener || opener === document.body) return
      // ひらいたボタンが画面に残っていれば戻す。最初の画面のボタンのように消えたときは、ページの先頭に戻らないよう本文（main）へ
      if (opener.isConnected) opener.focus({ preventScroll: true })
      else if (dialogs.length === 0) document.querySelector<HTMLElement>('main')?.focus({ preventScroll: true })
    }
  }, [opener])
  return ref
}
