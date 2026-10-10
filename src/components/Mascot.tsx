import type { DangoMoods, MascotMood } from '../domain/mascotMood'
import type { PfcKey } from '../domain/slotBalance'
import type { Slot } from '../domain/types'

// マスコット「モグ」。1日のまとめは「PFCだんごモグ」、朝・昼・晩・その他のカードは「ちゃわんモグ」
const INK = '#5b4636'
const line = { stroke: INK, strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

// 顔（中心0,0のローカル座標）
function Face({ mood, x, y, s = 1 }: { mood: MascotMood; x: number; y: number; s?: number }) {
  const cheeks = (opacity: number) => (
    <>
      <ellipse cx="-18" cy="7" rx="5" ry="3.2" fill="#ffa99a" opacity={opacity} />
      <ellipse cx="18" cy="7" rx="5" ry="3.2" fill="#ffa99a" opacity={opacity} />
    </>
  )
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {mood === 'happy' && (
        <>
          {cheeks(1)}
          <path d="M-15 1 q4.5 -7 9 0 M6 1 q4.5 -7 9 0" fill="none" {...line} />
          <path d="M-6.5 6 q6.5 10 13 0 z" fill="#e8735a" {...line} strokeWidth={2.5} />
        </>
      )}
      {mood === 'okay' && (
        <>
          {cheeks(0.6)}
          <circle cx="-10" cy="-1" r="3.2" fill={INK} />
          <circle cx="10" cy="-1" r="3.2" fill={INK} />
          <path d="M-4.5 7 q4.5 4 9 0" fill="none" {...line} strokeWidth={2.6} />
        </>
      )}
      {mood === 'worried' && (
        <>
          {cheeks(0.35)}
          <path d="M-16 -9 l8 3.5 M16 -9 l-8 3.5" fill="none" {...line} strokeWidth={2.4} />
          <circle cx="-10" cy="0" r="3.2" fill={INK} />
          <circle cx="10" cy="0" r="3.2" fill={INK} />
          <path d="M-7 10 q3.5 -4 7 0 q3.5 4 7 0" fill="none" {...line} strokeWidth={2.4} />
        </>
      )}
      {mood === 'alert' && (
        <>
          <circle cx="-10" cy="-1" r="5" fill="#fff" {...line} strokeWidth={2.4} />
          <circle cx="10" cy="-1" r="5" fill="#fff" {...line} strokeWidth={2.4} />
          <circle cx="-10" cy="0" r="2.2" fill={INK} />
          <circle cx="10" cy="0" r="2.2" fill={INK} />
          <ellipse cx="0" cy="10" rx="3" ry="3.8" fill={INK} />
          <path d="M22 -16 q6 8 0 10.5 q-6 -2.5 0 -10.5z" fill="#9ad0f2" stroke={INK} strokeWidth="1.6" />
        </>
      )}
    </g>
  )
}

const BALL: { key: PfcKey; cy: number; color: string }[] = [
  { key: 'p', cy: 28, color: '#f47c7c' },
  { key: 'f', cy: 61, color: '#ffc94d' },
  { key: 'c', cy: 94, color: '#7cc98a' },
]

// PFCだんごモグ：上からたんぱく質（いちご色）・脂質（たまご色）・炭水化物（わかば色）
export function DangoMogu({ moods, className, label }: { moods: DangoMoods; className?: string; label: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={label}>
      <rect x="57" y="4" width="6" height="112" rx="3" fill="#d9a86c" stroke={INK} strokeWidth="2.2" />
      {BALL.map((b) => (
        <g key={b.key}>
          <circle cx="60" cy={b.cy} r="18.5" fill={b.color} {...line} />
          <ellipse cx="51" cy={b.cy - 9} rx="4.5" ry="2.6" fill="#fff" opacity="0.65" transform={`rotate(-25 51 ${b.cy - 9})`} />
          <Face mood={moods[b.key]} x={60} y={b.cy + 2} s={0.6} />
        </g>
      ))}
    </svg>
  )
}

// 茶碗の色は、まとめ欄の「カロリーの配分」の帯と同じ区分の色
const BOWL_COLOR: Record<Slot, string> = { breakfast: '#ffd8a8', lunch: '#ffb07c', dinner: '#ff8a65', other: '#d9c2ad' }

function Steam({ mood }: { mood: MascotMood }) {
  const p = { fill: 'none', stroke: INK, strokeWidth: 2.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
  if (mood === 'happy') return <path d="M51 26 q-5 -4 0 -9 q5 -4 0 -9 M69 26 q-5 -4 0 -9 q5 -4 0 -9" {...p} />
  if (mood === 'worried') return <path d="M60 27 q2 -8 10 -8 q5 0 6 5" {...p} />
  if (mood === 'alert') return <path d="M60 27 l-4 -6 l6 -4 l-4 -7" {...p} />
  return <path d="M60 26 q-5 -4 0 -9 q5 -4 0 -9" {...p} />
}

// ちゃわんモグ：湯気の形でも気分を表す（ごきげんで2本、こまると垂れる、アラートでギザギザ）
export function BowlMogu({ mood, slot, className, label }: { mood: MascotMood; slot: Slot; className?: string; label: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={label}>
      <Steam mood={mood} />
      <rect x="44" y="102" width="32" height="10" rx="3" fill={BOWL_COLOR[slot]} stroke={INK} strokeWidth="2.6" />
      <path d="M22 68 C22 43 40 29 60 29 C80 29 98 43 98 68Z" fill="#fff" {...line} />
      <path d="M12 66 H108 C108 92 87 106 60 106 C33 106 12 92 12 66Z" fill={BOWL_COLOR[slot]} {...line} />
      {[
        [30, 82],
        [45, 86],
        [60, 87.5],
        [75, 86],
        [90, 82],
      ].map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r="3.6" fill="#fff" opacity="0.85" />
      ))}
      <Face mood={mood} x={60} y={51} />
    </svg>
  )
}
