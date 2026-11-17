import type { ReactNode } from 'react'
import { VIEW_PATH } from '../routes'
import { inAppLink } from './inAppLink'

// 上のタブ「食品を調べる」の中の2つの画面（名前でさがす／成分の多い順のランキング）の切り替え。
// 1つの画面に両方を並べると見にくいので、画面を分けて、ここで行き来する（URL も /foods/ と /ranking/ に分ける）

type FoodView = 'foods' | 'ranking'

const ICON = { viewBox: '0 0 24 24', className: 'h-4.5 w-4.5 shrink-0', fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

const TABS: { view: FoodView; label: string; icon: ReactNode }[] = [
  {
    view: 'foods',
    label: '名前でさがす',
    icon: (
      <svg {...ICON}>
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
      </svg>
    ),
  },
  {
    view: 'ranking',
    label: '成分ランキング',
    icon: (
      <svg {...ICON}>
        <path d="M5 20v-7M12 20V5M19 20v-10" />
      </svg>
    ),
  },
]

export function FoodSectionTabs({ view, onChange }: { view: FoodView; onChange: (view: FoodView) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <h2 className="text-xl font-bold">食品を調べる</h2>
      <nav aria-label="食品の調べ方" className="grid w-full grid-cols-2 gap-0.5 rounded-full bg-white p-1 shadow-sm sm:w-auto">
        {TABS.map((t) => {
          const active = t.view === view
          return (
            <a
              key={t.view}
              href={VIEW_PATH[t.view]}
              aria-current={active ? 'page' : undefined}
              onClick={(e) => inAppLink(e, () => onChange(t.view))}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 text-sm whitespace-nowrap transition lg:min-h-10 ${
                active ? 'bg-coral font-bold text-ink-strong' : 'font-bold text-ink-soft hover:bg-coral/10'
              }`}
            >
              {t.icon}
              {t.label}
            </a>
          )
        })}
      </nav>
    </div>
  )
}
