import { BowlMogu } from './Mascot'
import { UiIcon, type UiIconName } from './UiIcon'

const OPTION =
  'group flex min-h-24 w-full items-center gap-3 rounded-[var(--radius-card)] border-2 border-coral bg-white p-4 text-left shadow-md transition hover:-translate-y-0.5 hover:bg-coral/5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-coral/40 active:translate-y-0'

// 1日の食事が空のとき、ほかの表示の代わりに出す最初の画面。
// まず「何がわかるアプリか」をひとことで伝え、献立をまとめて呼び出す（理想の献立・保存した食事）か、自分で1品ずつえらぶかを選んでもらう。
// どちらも選ぶ前に結果を見てみたい人のために、献立の例を1つそのまま入れるボタン（sampleName があるとき）も置く
export function StartChoice({
  savedCount,
  sampleName,
  onLoad,
  onPickSelf,
  onTrySample,
}: {
  savedCount: number
  // 「献立の例で試す」で入れる献立の名前（入れられないときは undefined でボタンを出さない）
  sampleName?: string
  onLoad: () => void
  onPickSelf: () => void
  onTrySample?: () => void
}) {
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
    <section aria-labelledby="start-title" className="rounded-[var(--radius-card)] bg-[#fff1df] px-4 py-6 shadow-sm sm:px-8 sm:py-8">
      <div className="mb-5 flex flex-col items-center text-center">
        <BowlMogu slot="breakfast" mood="happy" className="h-16 w-16 sm:h-20 sm:w-20" label="モグ" />
        <h2 id="start-title" className="mt-2 text-xl leading-snug font-bold text-balance sm:text-2xl">
          {/* 折り返すときは「、」のあとで */}
          <span className="inline-block">料理を選ぶだけで、</span>
          <span className="inline-block">1日の栄養バランスがわかる</span>
        </h2>
        <p className="mt-1.5 max-w-xl text-sm text-pretty text-ink-soft">カロリーやPFCバランス、ビタミン・ミネラルが、1日の目安に足りているかを見られます。</p>
      </div>
      <div className="mx-auto max-w-4xl">
        <div className="mb-3 flex flex-col items-center gap-1.5 text-center sm:flex-row sm:justify-center sm:gap-2.5">
          <p className="rounded-full bg-coral px-3 py-0.5 text-xs font-bold tracking-wider text-ink-strong">まずはここから</p>
          <h3 id="start-choice-title" className="text-lg font-bold">
            今日の食事、どうやって入れる？
          </h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
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
        {sampleName && onTrySample && (
          <div className="mt-5 flex flex-col items-center gap-1.5 text-center">
            <p className="text-sm text-ink-soft">どんな結果が出るか、先に見てみたいときは</p>
            <button
              type="button"
              onClick={onTrySample}
              className="min-h-11 rounded-full bg-white px-6 text-sm font-bold shadow-sm transition hover:bg-coral/5 focus-visible:ring-4 focus-visible:ring-coral/40 focus-visible:outline-none"
            >
              献立の例で試す
            </button>
            <p className="text-xs text-pretty text-ink-soft">「{sampleName}」の1日分が入ります。あとから自由に変えられます。</p>
          </div>
        )}
        <p className="mt-5 text-center text-xs text-pretty text-ink-soft">登録はいりません。入れた内容は、このブラウザにのみ保存されます。</p>
      </div>
    </section>
  )
}
