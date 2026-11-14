import { BowlMogu } from './Mascot'
import { BuildModeOptions, type BuildMode } from './MenuBuilder'
import { UiIcon } from './UiIcon'

const OTHER =
  'flex min-h-11 items-center gap-1.5 rounded-full bg-white pr-4 pl-2 text-sm shadow-sm transition hover:bg-coral/5 focus-visible:ring-4 focus-visible:ring-coral/40 focus-visible:outline-none'

// 1日の食事が空のとき、ほかの表示の代わりに出す最初の画面。
// まず「何がわかるアプリか」をひとことで伝え、献立をつくるバランスのとり方（1日でバランス／毎食バランス）をえらんでもらう。
// 自分で1品ずつえらぶ・保存した食事を呼び出す（保存したものがあるとき）は「ほかの入れ方」として小さく。
// どちらも選ぶ前に結果を見てみたい人のために、献立の例を1つそのまま入れるボタン（sampleName があるとき）も置く
export function StartChoice({
  savedCount,
  sampleName,
  onBuild,
  onPickSelf,
  onOpenSaved,
  onTrySample,
}: {
  savedCount: number
  // 「献立の例で試す」で入れる献立の名前（入れられないときは undefined でボタンを出さない）
  sampleName?: string
  onBuild: (mode: BuildMode) => void
  onPickSelf: () => void
  onOpenSaved: () => void
  onTrySample?: () => void
}) {
  return (
    <section aria-labelledby="start-title" className="rounded-[var(--radius-card)] bg-[#fff1df] px-4 py-6 shadow-sm sm:px-8 sm:py-8">
      <div className="mb-5 flex flex-col items-center text-center">
        <BowlMogu slot="breakfast" mood="happy" className="h-16 w-16 sm:h-20 sm:w-20" label="モグ" />
        <h2 id="start-title" className="mt-2 text-xl leading-snug font-bold text-balance sm:text-2xl">
          {/* 折り返すときは「、」のあとで */}
          <span className="inline-block">料理を選ぶだけで、</span>
          <span className="inline-block">1日の栄養バランスがわかる</span>
        </h2>
        <p className="mt-1.5 max-w-xl text-sm text-balance text-ink-soft">カロリーやPFCバランス、ビタミン・ミネラルが、1日の目安に足りているかを見られます。</p>
      </div>
      <div className="mx-auto max-w-4xl">
        <div className="mb-3 flex flex-col items-center gap-1.5 text-center">
          <p className="rounded-full bg-coral px-3 py-0.5 text-xs font-bold tracking-wider text-ink-strong">まずはここから</p>
          <h3 id="start-choice-title" className="text-lg font-bold text-balance">
            <span className="inline-block">献立をつくろう。</span>
            <span className="inline-block">バランスのとり方は？</span>
          </h3>
        </div>
        <BuildModeOptions onChoose={onBuild} opensDialog />

        <div className="mt-6 flex flex-col items-center gap-2 text-center">
          <p className="text-sm text-ink-soft">ほかの入れ方</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={onPickSelf} aria-haspopup="dialog" className={OTHER}>
              <UiIcon name="pick" className="h-7 w-7 shrink-0" />
              自分で1品ずつえらぶ
            </button>
            {savedCount > 0 && (
              <button type="button" onClick={onOpenSaved} aria-haspopup="dialog" className={OTHER}>
                <UiIcon name="load" className="h-7 w-7 shrink-0" />
                保存した食事を呼び出す
                <span className="rounded-full bg-cream px-1.5 text-xs tabular-nums text-ink-soft">{savedCount}</span>
              </button>
            )}
          </div>
        </div>
        {sampleName && onTrySample && (
          <p className="mt-4 text-center text-xs text-pretty text-ink-soft">
            <span className="inline-block">どんな結果が出るか、先に見てみたいときは</span>
            <button
              type="button"
              onClick={onTrySample}
              className="mx-1 min-h-9 rounded-full px-1 font-bold text-coral-ink underline decoration-coral/50 underline-offset-4 hover:decoration-coral"
            >
              献立の例で試す
            </button>
            <span className="inline-block">（「{sampleName}」の1日分が入ります）</span>
          </p>
        )}
        <p className="mt-4 text-center text-xs text-pretty text-ink-soft">登録はいりません。入れた内容は、このブラウザにのみ保存されます。</p>
      </div>
    </section>
  )
}
