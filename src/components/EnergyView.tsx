import { useState, type PointerEvent, type ReactNode } from 'react'
import { SIM_PERIODS, bmi, simulateWeight, type Expenditure } from '../domain/energy'
import type { MenuTotals } from '../domain/nutrition'
import type { Targets } from '../domain/targets'
import type { Profile, Slot } from '../domain/types'
import { SLOT_LABEL } from './labels'

const kcal = (v: number) => Math.round(v).toLocaleString()

// 使うカロリーの内訳（同じ色の濃淡。下ほど薄い＝いつも使っている分）
const PARTS: { key: 'bmr' | 'daily' | 'exercise'; label: string; color: string }[] = [
  { key: 'bmr', label: '基礎代謝', color: '#b4e3cd' },
  { key: 'daily', label: 'ふだんの生活', color: '#6cc4a1' },
  { key: 'exercise', label: '運動', color: '#3a9a78' },
]

const slotNames = (slots: Slot[]) => slots.map((s) => SLOT_LABEL[s]).join('・')

// ほぼつり合っているとみなす差（kcal/日）
const BALANCED = 50

// 朝・昼・晩のうちまだ入っていない区分（missing）があるあいだは、合計を1日ぶんとして扱わない。
// asFullDay は、ユーザーが「この内容を1日ぶんとして計算する」をえらんだとき
type DayProgress = { missing: Slot[]; asFullDay: boolean }

// 食べるカロリー（えらんだ1日の食事）と使うカロリー（基礎代謝＋ふだんの生活＋運動）をくらべる
export function EnergyBalanceView({
  totals,
  energy,
  targets,
  profile,
  missing,
  asFullDay,
  onEditExercise,
}: {
  totals: MenuTotals
  energy: Expenditure
  targets: Targets
  profile: Profile
  onEditExercise?: () => void
} & DayProgress) {
  const intake = totals.day.values.energyKcal
  const diff = intake - energy.total
  const max = Math.max(intake, energy.total) * 1.08
  const w = (v: number) => `${(v / max) * 100}%`
  // 入力の途中：食べるカロリーはまだ1日ぶんではないので、ふえる・へるの結論は出さない
  const partial = intake > 0 && missing.length > 0 && !asFullDay
  const hasExercise = (profile.exercises ?? []).length > 0
  const goal = profile.goal ?? 'keep'
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold">食べる・使うカロリー</h2>
        {onEditExercise && (
          <button type="button" onClick={onEditExercise} className="min-h-9 shrink-0 rounded-full bg-white px-3.5 text-xs font-bold shadow-sm">
            {hasExercise ? '運動を変える' : '運動を入れる'}
          </button>
        )}
      </div>

      <div className="space-y-2 rounded-2xl bg-white/70 p-3">
        <BarRow label="食べる" value={intake} sub={partial ? '入力済みの合計' : 'えらんだ1日の食事'}>
          <div className="h-full rounded-r-md bg-coral transition-all duration-500" style={{ width: w(intake) }} />
        </BarRow>
        <BarRow label="使う" value={energy.total} sub="1日の目安">
          <div className="flex h-full gap-[2px] transition-all duration-500" style={{ width: w(energy.total) }}>
            {PARTS.map((p, i) =>
              energy[p.key] > 0 ? (
                <div
                  key={p.key}
                  className={i === PARTS.length - 1 || (p.key === 'daily' && energy.exercise === 0) ? 'rounded-r-md' : ''}
                  style={{ background: p.color, flexGrow: energy[p.key], flexBasis: 0 }}
                  title={`${p.label} ${kcal(energy[p.key])} kcal`}
                />
              ) : null,
            )}
          </div>
        </BarRow>
        <ul className="flex flex-wrap gap-x-3 gap-y-0.5 pl-14 text-[12px] text-ink-soft" aria-label="使うカロリーの内訳">
          {PARTS.map((p) => (
            <li key={p.key} className="flex items-center gap-1 whitespace-nowrap">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} aria-hidden />
              {p.label} <span className="tabular-nums">{kcal(energy[p.key])}</span>
            </li>
          ))}
        </ul>
      </div>

      {intake === 0 ? (
        <p className="text-sm text-ink-soft">料理をえらぶと、食べるカロリーとくらべます</p>
      ) : partial ? (
        <p role="note" className="rounded-2xl bg-white px-4 py-2 text-sm shadow-sm">
          <strong>{slotNames(missing)}がまだ入っていません</strong>
          <span className="block text-xs text-ink-soft">1日ぶんがそろうと、体重がふえるペースか、へるペースかを出します</span>
        </p>
      ) : (
        <p className="rounded-2xl bg-white px-4 py-2 text-sm shadow-sm">
          {Math.abs(diff) < BALANCED ? (
            <>
              <strong>ほぼつり合っています</strong>
              <span className="block text-xs text-ink-soft">体重はほとんど変わらないペースです</span>
            </>
          ) : (
            <>
              1日あたり <strong className="text-lg tabular-nums">{kcal(Math.abs(diff))} kcal</strong> {diff > 0 ? '食べるほうが多い' : '使うほうが多い'}
              <span className="block text-xs text-ink-soft">{diff > 0 ? '体重がふえていくペースです' : '体重がへっていくペースです'}</span>
            </>
          )}
        </p>
      )}

      <div className="space-y-1 text-[12px] leading-relaxed text-ink-soft">
        {intake > 0 && missing.length > 0 && asFullDay && <p>{slotNames(missing)}は空のまま、いま入っている分を1日ぶんとして計算しています。</p>}
        {energy.usedReferenceWeight && <p>体重が未入力のため、使うカロリーは年齢・性別の標準的な体重で計算しています。</p>}
        {goal !== 'keep' && (
          <p>
            まとめの「1日の目安」（{targets.energyKcal.toLocaleString()} kcal）は、体重の目標「{goal === 'lose' ? '減らしたい' : '増やしたい'}」に合わせて、使うカロリーより
            {goal === 'lose' ? '少なめ' : '多め'}にしています。
          </p>
        )}
        <p>使うカロリーは、基礎代謝（年齢・性別・体重から）×ふだんの活動量に、入れた運動の分を足した目安です。</p>
      </div>
    </div>
  )
}

function BarRow({ label, value, sub, children }: { label: string; value: number; sub: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-sm font-bold whitespace-nowrap">{label}</span>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-baseline justify-between gap-2 text-[12px] text-ink-soft">
          <span>{sub}</span>
          <span>
            <strong className="text-base text-ink tabular-nums">{kcal(value)}</strong> kcal
          </span>
        </div>
        <div className="h-4 overflow-hidden rounded-r-md bg-ink/5">{children}</div>
      </div>
    </div>
  )
}

const fmtKg = (v: number) => v.toFixed(1)
const signedKg = (v: number) => (Math.abs(v) < 0.05 ? '±0.0' : `${v > 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`)

// えらんだ1日の食事と運動を毎日続けたときの体重（1・3・6か月後と1年後）。
// 入力の途中（朝だけ入れた、など）や体重が未入力のうちは、数字を出さずに何がそろえば計算するかを見せる
export function WeightSimView({
  totals,
  energy,
  profile,
  missing,
  asFullDay,
  onTreatAsFullDay,
  onEditProfile,
}: {
  totals: MenuTotals
  energy: Expenditure
  profile: Profile
  onTreatAsFullDay?: () => void
  onEditProfile?: () => void
} & DayProgress) {
  const intake = totals.day.values.energyKcal
  const mealsReady = intake > 0 && (missing.length === 0 || asFullDay)
  const weightReady = !energy.usedReferenceWeight
  if (!mealsReady || !weightReady) {
    return (
      <div className="space-y-3">
        <div>
          <h2 className="font-bold">このまま続けたときの体重</h2>
          <p className="text-xs text-ink-soft">次の2つがそろうと、毎日続けたときの体重の変化を計算します</p>
        </div>
        <ul className="space-y-2">
          <NeedRow done={mealsReady} label="1日ぶんの食事">
            {mealsReady ? (
              missing.length > 0 ? (
                `${slotNames(missing)}は空のまま計算します`
              ) : (
                '入っています'
              )
            ) : intake === 0 ? (
              'まだ料理が入っていません'
            ) : (
              <>
                {slotNames(missing)}がまだ入っていません
                {onTreatAsFullDay && (
                  <button type="button" onClick={onTreatAsFullDay} className="mt-1.5 block min-h-9 rounded-full bg-white px-3.5 text-xs font-bold text-ink shadow-sm">
                    この内容を1日ぶんとして計算する
                  </button>
                )}
              </>
            )}
          </NeedRow>
          <NeedRow done={weightReady} label="いまの体重">
            {weightReady ? (
              `${fmtKg(energy.weightKg)}kg`
            ) : (
              <>
                まだ入っていません
                {onEditProfile && (
                  <button type="button" onClick={onEditProfile} className="mt-1.5 block min-h-9 rounded-full bg-white px-3.5 text-xs font-bold text-ink shadow-sm">
                    体重を入れる
                  </button>
                )}
              </>
            )}
          </NeedRow>
        </ul>
      </div>
    )
  }
  const sim = simulateWeight(intake, profile)
  const height = profile.heightCm
  const year = sim.at(365)
  const yearBmi = height ? bmi(year, height) : null
  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-bold">このまま続けたときの体重</h2>
        <p className="text-xs text-ink-soft">えらんだ1日の食事と運動を、毎日続けた場合の目安です</p>
      </div>
      {missing.length > 0 && (
        <p role="note" className="rounded-2xl bg-caution/20 px-3 py-2 text-sm">
          <strong>{slotNames(missing)}は入っていません。</strong>
          <span className="block text-xs">下の数字は、いま入っている分だけを1日の食事として計算しています。</span>
        </p>
      )}
      {intake < energy.bmr && (
        <p role="note" className="rounded-2xl bg-caution/20 px-3 py-2 text-sm">
          <strong>食べるカロリーが、基礎代謝（{kcal(energy.bmr)} kcal）より少なくなっています。</strong>
          <span className="block text-xs">食事がすべて入っているか、たしかめてください。この量を毎日続ける計算は、実際とは大きくずれます。</span>
        </p>
      )}
      <WeightChart sim={sim} />
      <ul className="grid grid-cols-4 gap-1.5">
        {SIM_PERIODS.map((p) => {
          const kg = sim.at(p.days)
          const change = kg - sim.start
          return (
            <li key={p.days} className="rounded-2xl bg-white px-1 py-2 text-center shadow-sm">
              <p className="text-[12px] text-ink-soft">{p.label}</p>
              <p className="leading-tight font-bold">
                <span className="text-lg">{signedKg(change)}</span>
                <span className="text-xs">kg</span>
              </p>
              <p className="text-[12px] text-ink-soft tabular-nums">{fmtKg(kg)}kg</p>
              {height && <p className="text-[12px] text-ink-soft tabular-nums">BMI {bmi(kg, height).toFixed(1)}</p>}
            </li>
          )
        })}
      </ul>
      <div className="space-y-1 text-[12px] leading-relaxed text-ink-soft">
        {Math.abs(sim.settle - sim.start) >= 0.5 && <p>体重が変わると使うカロリーも変わるので、変化はだんだんゆるやかになり、{fmtKg(sim.settle)}kgくらいに落ち着いていきます。</p>}
        {yearBmi !== null && yearBmi < 18.5 && <p className="font-bold text-alert-ink">1年後はBMIが18.5を下回ります。やせすぎに気をつけてください。</p>}
        {yearBmi !== null && yearBmi >= 25 && bmi(sim.start, height!) < 25 && <p className="font-bold text-alert-ink">1年後はBMIが25をこえます。</p>}
        <p>体脂肪1kg＝約7,000kcalとして計算しています。体の水分などでも体重は変わるので、実際とは同じになりません。</p>
      </div>
    </div>
  )
}

// 体重の変化を計算するのに要るもの（そろったら ✓）
function NeedRow({ done, label, children }: { done: boolean; label: string; children: ReactNode }) {
  return (
    <li className="flex gap-2.5 rounded-2xl bg-white/70 px-3 py-2.5">
      <span
        aria-hidden
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[12px] leading-none font-bold ${done ? 'bg-ok text-ink-strong' : 'border-2 border-ink/25'}`}
      >
        {done && '✓'}
      </span>
      <div className="min-w-0 text-sm">
        <p className="font-bold">
          {label}
          <span className="sr-only">{done ? '（そろっています）' : '（まだです）'}</span>
        </p>
        <div className="text-xs text-ink-soft">{children}</div>
      </div>
    </li>
  )
}

// 体重の折れ線。横軸は0〜12か月、印は1・3・6か月後と1年後
const W = 320
const H = 150
const PAD = { l: 38, r: 12, t: 10, b: 24 }
// 目盛りの字と線の色（--color-ink-soft と同じ）
const AXIS = '#75604e'
// m か月後の日数（1・3・6・12 か月で SIM_PERIODS の日数とそろう）
const monthDays = (m: number) => Math.round((m * 365) / 12)

function niceStep(span: number) {
  for (const s of [0.5, 1, 2, 5, 10]) if (span / s <= 4) return s
  return 20
}

function WeightChart({ sim }: { sim: ReturnType<typeof simulateWeight> }) {
  const [hover, setHover] = useState<number | null>(null)
  const at = sim.at
  const start = sim.start
  const months = Array.from({ length: 13 }, (_, m) => m)
  const values = months.map((m) => at(monthDays(m)))
  const lo0 = Math.min(...values)
  const hi0 = Math.max(...values)
  // 変化が小さくても上下に2kgは見せる
  const mid = (lo0 + hi0) / 2
  const half = Math.max((hi0 - lo0) / 2, 1) * 1.15
  const step = niceStep(half * 2)
  const lo = Math.floor((mid - half) / step) * step
  const hi = Math.ceil((mid + half) / step) * step
  const x = (day: number) => PAD.l + (day / 365) * (W - PAD.l - PAD.r)
  const y = (kg: number) => PAD.t + ((hi - kg) / (hi - lo)) * (H - PAD.t - PAD.b)
  const ticks: number[] = []
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 10) / 10)
  // 線はなめらかに見えるよう細かく取る
  const path = Array.from({ length: 74 }, (_, i) => (i * 365) / 73)
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${x(d).toFixed(1)},${y(at(d)).toFixed(1)}`)
    .join(' ')
  const marks = SIM_PERIODS.map((p) => ({ ...p, kg: at(p.days) }))
  const tickLabel = (t: number) => (t % 1 === 0 ? String(t) : t.toFixed(1))
  const fmt = (kg: number) => `${fmtKg(kg)}kg`
  // 1か月は「いま」と近くて重なるので、印だけにして文字は出さない
  const xLabels = [
    { day: 0, label: 'いま' },
    ...SIM_PERIODS.filter((p) => p.days > 31).map((p) => ({ day: p.days, label: p.label.replace('後', '') })),
  ]

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    const m = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * 12)
    setHover(Math.min(12, Math.max(0, m)))
  }
  const hoverDay = hover === null ? null : monthDays(hover)
  const hoverKg = hoverDay === null ? null : at(hoverDay)

  return (
    <div className="relative rounded-2xl bg-white/70 p-2">
      <p className="px-1 text-[12px] text-ink-soft">体重（kg）</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-pan-y select-none"
        role="img"
        aria-label={`体重の変化：${marks.map((m) => `${m.label} ${fmt(m.kg)}`).join('、')}`}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#5b4636" strokeOpacity={0.1} strokeWidth={1} />
            <text x={PAD.l - 5} y={y(t)} dy="0.35em" textAnchor="end" fontSize={12} fill={AXIS} className="tabular-nums">
              {tickLabel(t)}
            </text>
          </g>
        ))}
        {/* いまの体重 */}
        <line x1={PAD.l} x2={W - PAD.r} y1={y(start)} y2={y(start)} stroke={AXIS} strokeOpacity={0.45} strokeWidth={1} strokeDasharray="3 3" />
        {xLabels.map((l) => (
          <text key={l.day} x={x(l.day)} y={H - 6} textAnchor={l.day === 0 ? 'start' : l.day === 365 ? 'end' : 'middle'} fontSize={12} fill={AXIS}>
            {l.label}
          </text>
        ))}
        <path d={path} fill="none" stroke="#e8704b" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hoverDay !== null && hoverKg !== null && (
          <line x1={x(hoverDay)} x2={x(hoverDay)} y1={PAD.t} y2={H - PAD.b} stroke="#5b4636" strokeOpacity={0.3} strokeWidth={1} />
        )}
        {marks.map((m) => (
          <circle key={m.days} cx={x(m.days)} cy={y(m.kg)} r={4} fill="#e8704b" stroke="#fff" strokeWidth={2} />
        ))}
        {hoverDay !== null && hoverKg !== null && <circle cx={x(hoverDay)} cy={y(hoverKg)} r={5} fill="#fff" stroke="#e8704b" strokeWidth={2} />}
      </svg>
      {hover !== null && hoverKg !== null && (
        <div
          className="pointer-events-none absolute top-1 rounded-lg bg-ink px-2 py-1 text-[12px] whitespace-nowrap text-white shadow"
          style={{ left: `${(x(monthDays(hover)) / W) * 100}%`, transform: `translateX(${hover > 8 ? '-100%' : hover < 3 ? '0' : '-50%'})` }}
        >
          {hover === 0 ? 'いま' : hover === 12 ? '1年後' : `${hover}か月後`} {fmt(hoverKg)}（{signedKg(hoverKg - start)}kg）
        </div>
      )}
    </div>
  )
}
