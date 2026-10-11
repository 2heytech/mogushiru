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
        // 保存：まるっこいフロッピーディスク
        <>
          <path d="M11 13 a4 4 0 0 1 4 -4 h16 l6 6 v20 a4 4 0 0 1 -4 4 h-18 a4 4 0 0 1 -4 -4 z" fill="#7ab8e8" {...s} />
          <rect x="17" y="9" width="12" height="9" rx="1.5" fill="#fff" {...s} strokeWidth={1.8} />
          <rect x="24.5" y="11" width="2.5" height="5" rx="1" fill={INK} />
          <rect x="16" y="25" width="16" height="11" rx="2.5" fill="#fff" {...s} strokeWidth={1.8} />
          <path d="M19.5 29.5 h9 M19.5 32.5 h6" fill="none" stroke="#c9b8a6" strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
      {name === 'load' && (
        // 呼び出し：ひらいたフォルダから紙が出てくる
        <>
          <path d="M8 15 a3 3 0 0 1 3 -3 h8 l3 3 h15 a3 3 0 0 1 3 3 v18 a3 3 0 0 1 -3 3 h-26 a3 3 0 0 1 -3 -3 z" fill="#f2b84b" {...s} />
          <rect x="15" y="9" width="18" height="17" rx="2" fill="#fff" {...s} strokeWidth={1.8} />
          <path d="M19 14 h10 M19 17.5 h7" fill="none" stroke="#c9b8a6" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M8 22 h32 l-3 15 a3 3 0 0 1 -3 2.5 h-21 a3 3 0 0 1 -3 -2.5 z" fill="#ffc94d" {...s} />
        </>
      )}
      {name === 'reset' && (
        // リセット：くるっと回ってはじめから
        <>
          <path d="M35.5 28 A12.5 12.5 0 1 1 33 15.5" fill="none" {...s} stroke="#ff8a65" strokeWidth={4.5} />
          <path d="M33.5 7.5 L34.5 16.5 L25.5 17" fill="none" {...s} stroke="#ff8a65" strokeWidth={4.5} />
          <circle cx="24" cy="25" r="3.2" fill="#ff8a65" />
        </>
      )}
    </svg>
  )
}
