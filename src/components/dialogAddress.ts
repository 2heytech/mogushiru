import { useEffect } from 'react'

// 窓をひらいているあいだ、アドレス欄とタブの名前を、その中身のページのもの（/foods/natto/ など）にする。
// そのアドレスを貼ったり、読みこみ直したりすると、同じ中身のページ（読みもののページ）がひらく。
// 窓のために足した履歴（useDismiss）の URL を書きかえるので、「戻る」やボタンで閉じると、元の URL の履歴にもどる

// 返す関数は、窓を閉じたときに呼ぶ（フックの中身。テストから直接よべるように分けてある）
export function showAddress(path: string, title?: string): () => void {
  const before = window.location.pathname + window.location.search + window.location.hash
  const titleBefore = document.title
  try {
    window.history.replaceState(window.history.state, '', path)
  } catch {
    // 埋め込み表示などでアドレスを書きかえられないときは、そのまま
    return () => {}
  }
  if (title) document.title = title
  return () => {
    document.title = titleBefore
    // ボタンで閉じたときは、まだ窓の履歴にいるので、アドレスを元にもどしておく（このあと useDismiss が履歴を1つ戻す。
    // 「進む」でここへ来ても、窓のないままその食品のアドレスにならないように）。「戻る」で閉じたときは、もう元のアドレス
    if (window.location.pathname === path) window.history.replaceState(window.history.state, '', before)
  }
}

// useDialog のあとに呼ぶ（窓の履歴を足したあとで、その URL を書きかえるので）。path が null なら何もしない
export function useDialogAddress(path: string | null, title?: string) {
  useEffect(() => (path ? showAddress(path, title) : undefined), [path, title])
}
