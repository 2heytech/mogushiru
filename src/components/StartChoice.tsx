import { BowlMogu } from './Mascot'
import { UiIcon, type UiIconName } from './UiIcon'

const OPTION =
  'group flex min-h-24 w-full items-center gap-3 rounded-[var(--radius-card)] border-2 border-coral bg-white p-4 text-left shadow-md transition hover:-translate-y-0.5 hover:bg-coral/5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-coral/40 active:translate-y-0'

// 1日の食事が空のとき、ほかの表示の代わりに出す「どうやって入れる？」。
// 献立をまとめて呼び出す（理想の献立・保存した食事）か、自分で1品ずつえらぶかを、まず選んでもらう
export function StartChoice({ savedCount, onLoad, onPickSelf }: { savedCount: number; onLoad: () => void; onPickSelf: () => void }) {
  const options: { icon: UiIconName; label: string; note: string; onClick: () => void }[] = [
    {
      icon: 'load',
      label: '献立を呼び出す',
      note: savedCount > 0 ? '理想の献立や保存した食事から、1日分をまとめて入れる' : '理想の献立から、1日分をまとめて入れる',
      onClick: onLoad,
    },
    { icon: 'pick', label: '自分でえらぶ', note: '朝・昼・晩・その他に、1品ずつ入れる', onClick: onPickSelf },
  ]
  return (
    <section aria-labelledby="start-choice-title" className="rounded-[var(--radius-card)] bg-[#fff1df] px-4 py-6 shadow-sm sm:px-8 sm:py-8">
      <div className="mb-5 flex flex-col items-center text-center">
        <BowlMogu slot="breakfast" mood="happy" className="h-20 w-20" label="モグ" />
        <p className="mt-2 rounded-full bg-coral px-3 py-0.5 text-xs font-bold tracking-wider text-ink-strong">まずはここから</p>
        <h2 id="start-choice-title" className="mt-2 text-xl font-bold">
          今日の食事、どうやって入れる？
        </h2>
        <p className="mt-1 text-sm text-balance text-ink-soft">選ぶと、朝・昼・晩の食事と栄養バランスが出てきます</p>
      </div>
      <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2">
        {options.map((o) => (
          <button key={o.label} type="button" onClick={o.onClick} aria-haspopup="dialog" className={OPTION}>
            <UiIcon name={o.icon} className="h-12 w-12 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold">{o.label}</span>
              <span className="mt-0.5 block text-xs leading-snug text-pretty text-ink-soft">{o.note}</span>
            </span>
            <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-coral text-ink-strong transition group-hover:translate-x-0.5">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
