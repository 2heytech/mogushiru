// 「料理をカスタマイズ」のアイコン。UiIcon と同じく、角丸の淡い台に茶色の線で描く（キッチンスケールにトマト）
const INK = '#5b4636'

export function CustomizeIcon({ className }: { className?: string }) {
  const s = { stroke: INK, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect width="48" height="48" rx="14" fill="#ffe1d6" />
      <circle cx="24" cy="10.5" r="4.6" fill="#f47c7c" {...s} strokeWidth={1.8} />
      <path d="M22 6.2 q2 -2 4 0" fill="none" {...s} stroke="#5aa86a" strokeWidth={1.8} />
      <ellipse cx="24" cy="15.5" rx="13" ry="3" fill="#fff" {...s} />
      <rect x="21.5" y="18" width="5" height="3" fill="#fff" {...s} strokeWidth={1.8} />
      <rect x="9" y="21" width="30" height="20" rx="6" fill="#ff8a65" {...s} />
      <circle cx="24" cy="31" r="6.5" fill="#fff" {...s} strokeWidth={1.8} />
      <path d="M24 31 L27.5 27" fill="none" {...s} strokeWidth={1.8} />
      <path d="M19.5 29 h1.2 M27.3 29 h1.2 M24 25.8 v1.2" fill="none" {...s} strokeWidth={1.2} />
    </svg>
  )
}
