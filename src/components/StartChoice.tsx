import { BowlMogu } from './Mascot'
import { UiIcon, type UiIconName } from './UiIcon'

const OPTION =
  'flex min-h-16 items-center gap-3 rounded-2xl border-2 border-transparent bg-white p-3 text-left shadow-sm transition hover:border-coral/60 focus-visible:border-coral'

// 1日の食事が空のとき、いちばん上に出す「どうやって入れる？」。
// 献立をまとめて呼び出す（理想の献立・保存した食事）か、自分で1品ずつえらぶかを選んでもらう
export function StartChoice({ savedCount, onLoad, onPickSelf }: { savedCount: number; onLoad: () => void; onPickSelf: () => void }) {
  const options: { icon: UiIconName; label: string; note: string; onClick: () => void }[] = [
    {
      icon: 'load',
      label: '献立を呼び出す',
      note: savedCount > 0 ? '理想の献立や保存した食事から、1日分をまとめて入れる' : '理想の献立から、1日分をまとめて入れる',
      onClick: onLoad,
    },
    { icon: 'pick', label: '自分でえらぶ', note: '朝・昼・晩・その他に、料理を1品ずつ入れる', onClick: onPickSelf },
  ]
  return (
    <section aria-labelledby="start-choice-title" className="rounded-[var(--radius-card)] bg-[#fff1df] p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <BowlMogu slot="breakfast" mood="happy" className="h-12 w-12 shrink-0" label="モグ" />
        <h2 id="start-choice-title" className="rounded-2xl bg-white px-3.5 py-2 text-sm font-bold shadow-sm">
          今日の食事、どうやって入れる？
        </h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <button key={o.label} type="button" onClick={o.onClick} aria-haspopup="dialog" className={OPTION}>
            <UiIcon name={o.icon} className="h-10 w-10 shrink-0" />
            <span className="min-w-0">
              <span className="block font-bold">{o.label}</span>
              <span className="block text-xs leading-snug text-ink-soft">{o.note}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
