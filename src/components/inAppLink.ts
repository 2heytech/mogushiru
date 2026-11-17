import type { MouseEvent } from 'react'

// 画面へのリンクは <a href> にしておき（検索エンジンがたどれる・新しいタブでも開ける）、ふつうのクリックはページを読み直さずに切り替える
export function inAppLink(e: MouseEvent<HTMLAnchorElement>, go: () => void) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  go()
}
