import { useEffect, useRef, useState, type ReactNode } from 'react'
import { pfcRatio, type MenuTotals } from '../domain/nutrition'
import type { Targets } from '../domain/targets'
import type { MenuSource } from '../store/useAppStore'
import type { MenuActionsLayout } from './SavedMenus'

// 呼び出した献立の名前。手を加えたら「〇〇をもとに変更」
function SourceChip({ source }: { source: MenuSource }) {
  return (
    <span className="max-w-full truncate rounded-full bg-white px-3 py-0.5 text-xs font-bold shadow-sm md:text-sm" title={source.name}>
      {source.edited ? `「${source.name}」をもとに変更` : source.name}
    </span>
  )
}

function Kcal({ kcal, target, className = '' }: { kcal: number; target: number; className?: string }) {
  return (
    <span className={`font-bold whitespace-nowrap tabular-nums ${className}`}>
      {Math.round(kcal).toLocaleString()}
      <span className="text-xs font-normal text-ink-soft">
        <span className="hidden sm:inline"> / {target.toLocaleString()}</span> kcal
      </span>
    </span>
  )
}

// 1日の食事のかたまり。見出し（献立名・合計kcal）と「献立を呼び出す」「保存」「リセット」を、朝・昼・晩・その他と一緒に置く。
// スマホはボタンを画面の下に固定、PCは見出しの右に置き、見出しが画面の外に出たら上にうすいバーを出す
export function DayMenuPanel({
  source,
  totals,
  targets,
  actions,
  children,
}: {
  source: MenuSource | null
  totals: MenuTotals
  targets: Targets
  actions: (layout: MenuActionsLayout) => ReactNode
  children: ReactNode
}) {
  const headerRef = useRef<HTMLDivElement>(null)
  const [scrolledPast, setScrolledPast] = useState(false)
  useEffect(() => {
    const el = headerRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setScrolledPast(!e.isIntersecting && e.boundingClientRect.top < 0))
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const kcal = totals.day.values.energyKcal
  const ratio = pfcRatio(totals.day.values)
  return (
    <>
      <section aria-labelledby="day-menu-title" className="rounded-[var(--radius-card)] bg-[#fff1df] p-3 shadow-sm md:p-4">
        <div ref={headerRef} className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 id="day-menu-title" className="text-lg font-bold md:text-xl">
            1日の食事
          </h2>
          {source && <SourceChip source={source} />}
          <Kcal kcal={kcal} target={targets.energyKcal} className="ml-auto text-lg md:ml-0 md:text-xl" />
          <div className="hidden md:ml-auto md:block">{actions('row')}</div>
        </div>
        {children}
      </section>

      {/* スマホ：いつも画面の下に */}
      <div
        role="toolbar"
        aria-label="1日の食事の操作"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-ink/10 bg-white/95 px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(91,70,54,0.1)] backdrop-blur md:hidden"
      >
        {actions('bar')}
      </div>

      {/* PC：見出しが見えなくなったら上に */}
      <div
        role="toolbar"
        aria-label="1日の食事の操作"
        aria-hidden={!scrolledPast}
        inert={!scrolledPast}
        className={`fixed inset-x-0 top-0 z-10 hidden border-b border-ink/10 bg-white/95 shadow-[0_4px_12px_rgba(91,70,54,0.1)] backdrop-blur transition md:block ${
          scrolledPast ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
          <span className="font-bold">1日の食事</span>
          {source && <SourceChip source={source} />}
          <Kcal kcal={kcal} target={targets.energyKcal} className="text-lg" />
          {ratio && (
            <span className="hidden gap-1.5 text-xs tabular-nums lg:flex" aria-label={`PFCバランス たんぱく質${Math.round(ratio.p)}%・脂質${Math.round(ratio.f)}%・炭水化物${Math.round(ratio.c)}%`}>
              <span className="rounded-full bg-protein/20 px-2 py-0.5">P {Math.round(ratio.p)}%</span>
              <span className="rounded-full bg-fat/25 px-2 py-0.5">F {Math.round(ratio.f)}%</span>
              <span className="rounded-full bg-carb/25 px-2 py-0.5">C {Math.round(ratio.c)}%</span>
            </span>
          )}
          <div className="ml-auto">{actions('row')}</div>
        </div>
      </div>
    </>
  )
}
