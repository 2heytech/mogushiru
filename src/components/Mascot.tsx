import type { Mood } from '../domain/alerts'

const MESSAGES: Record<Mood, string> = {
  happy: 'いいバランス！このままいこう',
  okay: 'いい感じ。もうひと工夫してみる？',
  worried: 'ちょっと偏ってるかも…',
}

// 仮のマスコット「モグ」（おにぎり）。正式なイラストに差し替える前提の簡易SVG
export function Mascot({ mood, message }: { mood: Mood; message?: string }) {
  const mouth =
    mood === 'happy' ? 'M26 40 Q32 47 38 40' : mood === 'okay' ? 'M27 42 L37 42' : 'M26 44 Q32 38 38 44'
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0 transition-transform hover:scale-105" role="img" aria-label={`モグ（${MESSAGES[mood]}）`}>
        <path d="M32 6c6 0 26 30 26 40a12 12 0 0 1-12 12H18A12 12 0 0 1 6 46C6 36 26 6 32 6z" fill="#fff" stroke="#5b4636" strokeWidth="2.5" />
        <rect x="18" y="46" width="28" height="12" rx="3" fill="#3d5a4a" />
        <circle cx="24" cy="33" r="2.5" fill="#5b4636" />
        <circle cx="40" cy="33" r="2.5" fill="#5b4636" />
        {mood === 'happy' && (
          <>
            <ellipse cx="20" cy="39" rx="3" ry="2" fill="#ffb3a7" />
            <ellipse cx="44" cy="39" rx="3" ry="2" fill="#ffb3a7" />
          </>
        )}
        <path d={mouth} fill="none" stroke="#5b4636" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <p className="rounded-2xl bg-white px-4 py-2 text-sm shadow-sm">{message ?? MESSAGES[mood]}</p>
    </div>
  )
}
