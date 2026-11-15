import { useSyncExternalStore } from 'react'

// 画面の幅などの条件（CSS のメディアクエリ）に、いま合っているか。
// 見た目だけのちがいは CSS のクラス（md: lg: など）で書く。こちらは、幅によって出す部品そのものを変えるときに使う
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false,
  )
}
