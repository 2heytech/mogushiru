import { useEffect, useRef } from 'react'

// ダイアログを Esc キーとブラウザ・スマホの「戻る」で閉じる。重なっているときはいちばん上だけ閉じる。
// 戻るで閉じられるよう、ダイアログが開いているあいだは履歴を1つ足しておき、ボタンで閉じたら戻しておく

const stack: (() => void)[] = []
// 足した履歴がいま表示中か
let pushed = false
// 閉じたあとに履歴を戻す予約（開発時の StrictMode の付け外しや、閉じてすぐ別のダイアログを開くときは取り消す）
let pendingBack: ReturnType<typeof setTimeout> | null = null
let listening = false

function ensurePushed() {
  if (pendingBack !== null) {
    clearTimeout(pendingBack)
    pendingBack = null
  }
  if (!pushed) {
    try {
      history.pushState(history.state, '')
      pushed = true
    } catch {
      // 埋め込み表示などで履歴を足せないときは、Esc と閉じるボタンだけで閉じる
    }
  }
}

function releaseLater() {
  if (!pushed || pendingBack !== null) return
  pendingBack = setTimeout(() => {
    pendingBack = null
    if (stack.length === 0 && pushed) {
      pushed = false
      history.back()
    }
  }, 0)
}

function listen() {
  if (listening) return
  listening = true
  window.addEventListener('popstate', () => {
    // 足した履歴から戻ったときだけ閉じる（ほかの画面の移動は関係ない）
    if (!pushed) return
    pushed = false
    stack.at(-1)?.()
  })
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.isComposing || stack.length === 0) return
    e.preventDefault()
    stack.at(-1)!()
  })
}

export function useDismiss(onClose: () => void) {
  const latest = useRef(onClose)
  useEffect(() => {
    latest.current = onClose
  })
  useEffect(() => {
    const close = () => latest.current()
    listen()
    stack.push(close)
    ensurePushed()
    return () => {
      stack.splice(stack.lastIndexOf(close), 1)
      if (stack.length > 0) ensurePushed()
      else releaseLater()
    }
  }, [])
}
