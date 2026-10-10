// タブ・ボタンのアイコン。朝・昼・晩・その他の図柄（SlotIcon）と同じく、角丸の淡い色の台に茶色の線で描く
const INK = '#5b4636'
const CHEEK = '#ffa99a'

export type UiIconName = 'menu' | 'ranking' | 'profile' | 'save' | 'load' | 'reset'

const TILE_BG: Record<UiIconName, string> = {
  menu: '#ffe6bf',
  ranking: '#fff1c4',
  profile: '#dcf1e2',
  save: '#dceafb',
  load: '#dceafb',
  reset: '#ffe1ea',
}

// 保存・呼び出しで共通の「保存容器」（ふた付きの箱）
function Box() {
  const s = { stroke: INK, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
  return (
    <>
      <rect x="11" y="26" width="26" height="14" rx="4" fill="#fff" {...s} />
      <rect x="9" y="21" width="30" height="6" rx="3" fill="#7ab8e8" {...s} />
      <circle cx="18" cy="33.5" r="1.4" fill={CHEEK} />
      <circle cx="30" cy="33.5" r="1.4" fill={CHEEK} />
      <path d="M22 33 q2 2 4 0" fill="none" {...s} strokeWidth={1.8} />
    </>
  )
}

export function UiIcon({ name, className }: { name: UiIconName; className?: string }) {
  const s = { stroke: INK, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect width="48" height="48" rx="14" fill={TILE_BG[name]} />
      {name === 'menu' && (
        // お弁当箱：ごはん（梅干し）・おかず・野菜
        <>
          <rect x="7" y="13" width="34" height="24" rx="5" fill="#ff8a65" {...s} />
          <rect x="11" y="17" width="15" height="16" rx="3" fill="#fff" {...s} strokeWidth={1.8} />
          <circle cx="18.5" cy="25" r="2.6" fill="#e85d6a" />
          <rect x="28" y="17" width="9" height="7" rx="2.5" fill="#ffc94d" {...s} strokeWidth={1.8} />
          <rect x="28" y="26" width="9" height="7" rx="2.5" fill="#7cc98a" {...s} strokeWidth={1.8} />
        </>
      )}
      {name === 'ranking' && (
        // 王冠。宝石はPFCの3色
        <>
          <path d="M9 34 L8 15 L17 23 L24 11 L31 23 L40 15 L39 34 Z" fill="#ffc94d" {...s} />
          <rect x="9" y="33" width="30" height="5" rx="2.5" fill="#f2b84b" {...s} />
          <circle cx="16" cy="28" r="2.4" fill="#f47c7c" />
          <circle cx="24" cy="27" r="2.4" fill="#ffffff" stroke={INK} strokeWidth="1.4" />
          <circle cx="32" cy="28" r="2.4" fill="#7cc98a" />
        </>
      )}
      {name === 'profile' && (
        // 人の顔と肩
        <>
          <path d="M11 41 C11 31 17 28 24 28 C31 28 37 31 37 41 Z" fill="#7cc98a" {...s} />
          <circle cx="24" cy="19" r="9" fill="#ffe8d6" {...s} />
          <path d="M15.5 17 C16 11 20 9.5 24 9.5 C29 9.5 32.5 12 32.5 17 C29 15 26 13.5 23 13.5 C20 14.5 18 16 15.5 17 Z" fill={INK} />
          <circle cx="20.5" cy="20" r="1.3" fill={INK} />
          <circle cx="27.5" cy="20" r="1.3" fill={INK} />
          <circle cx="18" cy="23" r="1.6" fill={CHEEK} />
          <circle cx="30" cy="23" r="1.6" fill={CHEEK} />
        </>
      )}
      {name === 'save' && (
        // 容器にしまう（下向き矢印）
        <>
          <Box />
          <path d="M24 6 v11 M19.5 12.5 L24 17 L28.5 12.5" fill="none" {...s} stroke="#ff8a65" strokeWidth={2.8} />
        </>
      )}
      {name === 'load' && (
        // 容器から取り出す（上向き矢印）
        <>
          <Box />
          <path d="M24 17 v-11 M19.5 10.5 L24 6 L28.5 10.5" fill="none" {...s} stroke="#ff8a65" strokeWidth={2.8} />
        </>
      )}
      {name === 'reset' && (
        // くるっと回ってやり直し。中心は空っぽのお皿
        <>
          <path d="M37 22 A13.5 13.5 0 1 1 31 12.5" fill="none" {...s} stroke="#ff8a65" strokeWidth={3} />
          <path d="M30 6.5 L32 13 L25.5 14.5" fill="none" {...s} stroke="#ff8a65" strokeWidth={3} />
          <ellipse cx="24" cy="25" rx="7.5" ry="5" fill="#fff" {...s} strokeWidth={1.8} />
          <ellipse cx="24" cy="25" rx="3.5" ry="2" fill="none" stroke={INK} strokeWidth="1.2" opacity="0.5" />
        </>
      )}
    </svg>
  )
}
