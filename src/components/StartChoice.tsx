import { BowlMogu } from './Mascot'
import { UiIcon, type UiIconName } from './UiIcon'

// スマホは横長の行（絵・名前と説明・矢印）をたてに3つ、広い画面はたて長のカードを横に3つ
const ENTRY =
  'group flex h-full w-full items-center gap-3 rounded-[var(--radius-card)] border-2 border-coral bg-white px-3 py-2.5 text-left shadow-md transition hover:-translate-y-0.5 hover:bg-coral/5 hover:shadow-lg focus-visible:ring-4 focus-visible:ring-coral/40 focus-visible:outline-none active:translate-y-0 sm:flex-col sm:items-start sm:gap-2 sm:p-4'

function Entry({ icon, title, desc, onClick, opensDialog = false }: { icon: UiIconName; title: string; desc: string; onClick: () => void; opensDialog?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-haspopup={opensDialog ? 'dialog' : undefined} className={ENTRY}>
      <UiIcon name={icon} className="h-11 w-11 shrink-0 sm:h-12 sm:w-12" />
      <span className="min-w-0 flex-1">
        <span className="block text-base leading-snug font-bold sm:text-lg">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-pretty text-ink-soft">{desc}</span>
      </span>
      {/* 幅のせまいスマホでは、矢印の丸をはぶいて字の幅をとる */}
      <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-coral text-ink-strong transition group-hover:translate-x-0.5 max-[359px]:hidden sm:self-end">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </button>
  )
}

const CHEVRON_LEFT = (
  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 5l-7 7 7 7" />
  </svg>
)

// 1日の食事の画面のいちばん上に置く、最初の画面へのもどり口。入口を1つえらんだあとでも、ほかの入口をえらびなおせるように。
// 入れた料理は外さない（最初の画面の「いまの1日の食事にもどる」で、そのままもどれる）。
// 文字のまわりを広く押せるようにして（44px）、上のタブ・下の「1日の食事」とのあいだはつめる
export function BackToStart({ onClick }: { onClick: () => void }) {
  return (
    <div className="-mt-3 -mb-1 flex">
      <button
        type="button"
        onClick={onClick}
        className="-ml-1.5 flex min-h-11 items-center gap-0.5 rounded-full pr-3 pl-1.5 text-sm font-bold text-ink-soft transition hover:text-ink focus-visible:ring-4 focus-visible:ring-coral/40 focus-visible:outline-none"
      >
        {CHEVRON_LEFT}
        最初の画面にもどる
      </button>
    </div>
  )
}

// 「栄養バランス」をひらいたとき、ほかの表示の代わりに出す最初の画面（1日の食事が空のとき。料理が入っていても、「最初の画面にもどる」やロゴからもどれる）。
// まず「何がわかるアプリか」をひとことで伝え、やりたいことから入口をえらんでもらう：
//   献立案から選ぶ … 栄養バランスの整った献立（1日分まとめて／1食ずつ）からえらぶ窓へ（いちばん上）
//   自分の食事で試す … 朝・昼・晩に、食べた料理を入れていく画面へ
//   サンプルで結果を見る … 献立の例を1つそのまま入れて、結果の画面を先に見る（sampleName があるとき）
// 「1日でバランス／毎食バランス」のちがいは、献立案から選ぶ窓の中でえらぶ（ここでは聞かない）。
// 保存した食事を呼び出す（保存したものがあるとき）は、その下に小さく。
// 料理が入っているとき（current）は、いちばん上に「いまの1日の食事にもどる」を出す。3つの入口は新しく始める入口なので、
// いまの料理を置き換える前に確かめるのは、呼ぶ側（App.tsx）とそれぞれの窓の役目
export function StartChoice({
  savedCount,
  sampleName,
  current,
  onResume,
  onPickSelf,
  onBuild,
  onOpenSaved,
  onTrySample,
}: {
  savedCount: number
  // 「サンプルで結果を見る」で入れる献立の名前（入れられないときは undefined でボタンを出さない）
  sampleName?: string
  // いまの1日の食事に入っている料理の数とカロリー（空のときは undefined）
  current?: { count: number; kcal: number }
  onResume: () => void
  onPickSelf: () => void
  onBuild: () => void
  onOpenSaved: () => void
  onTrySample?: () => void
}) {
  return (
    // スマホでは、3つの入口までが最初の画面に収まるように：モグは見出しの横に小さく、説明の文ははぶく
    <section aria-labelledby="start-title" className="rounded-[var(--radius-card)] bg-[#fff1df] px-4 py-4 shadow-sm sm:px-8 sm:py-8">
      {current && (
        <div className="mx-auto mb-3 max-w-4xl sm:mb-5">
          <button
            type="button"
            onClick={onResume}
            className="flex min-h-11 w-full items-center gap-1.5 rounded-2xl bg-white py-1.5 pr-3 pl-2.5 text-left text-coral-ink shadow-sm transition hover:bg-coral/5 focus-visible:ring-4 focus-visible:ring-coral/40 focus-visible:outline-none sm:w-auto sm:pr-4"
          >
            {CHEVRON_LEFT}
            {/* 幅がせまくて1行に入らないときは、品数とカロリーを2行目に */}
            <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-bold">いまの1日の食事にもどる</span>
              <span className="text-xs text-ink-soft tabular-nums">
                {current.count}品・{Math.round(current.kcal).toLocaleString()} kcal
              </span>
            </span>
          </button>
        </div>
      )}
      <div className="mb-3 flex items-center justify-center gap-2.5 sm:mb-5 sm:flex-col sm:gap-0 sm:text-center">
        {/* 幅のせまいスマホでは、見出しが2行に収まるようにモグをはぶく（上のロゴにもいる） */}
        <BowlMogu slot="breakfast" mood="happy" className="h-12 w-12 shrink-0 max-[359px]:hidden sm:h-20 sm:w-20" label="モグ" />
        <h2 id="start-title" className="text-lg leading-snug font-bold sm:mt-2 sm:text-2xl sm:text-balance">
          {/* 折り返すときは「、」のあとで */}
          <span className="inline-block">料理を選ぶだけで、</span>
          <span className="inline-block">1日の栄養バランスがわかる</span>
        </h2>
        <p className="mt-1.5 hidden text-sm text-ink-soft sm:block">
          <span className="inline-block">カロリーやPFCバランス、ビタミン・ミネラルが、</span>
          <span className="inline-block">1日の目安に足りているかを見られます。</span>
        </p>
      </div>
      <div className="mx-auto max-w-4xl">
        <h3 id="start-choice-title" className="mb-2 text-center text-base font-bold text-balance sm:mb-3 sm:text-lg">
          {current ? '新しく始めるなら' : 'なにから始める？'}
        </h3>
        <ul aria-labelledby="start-choice-title" className="grid gap-2 sm:grid-cols-3 sm:gap-3">
          <li>
            <Entry icon="build" title="献立案から選ぶ" desc="バランスの整った献立を、1日分か1食ずつ選ぶ" onClick={onBuild} opensDialog />
          </li>
          <li>
            <Entry icon="pick" title="自分の食事で試す" desc="食べた料理を、朝・昼・晩に入れていく" onClick={onPickSelf} />
          </li>
          {sampleName && onTrySample && (
            <li>
              <Entry icon="sample" title="サンプルで結果を見る" desc="例の献立を入れて、結果の画面を先に見る" onClick={onTrySample} />
            </li>
          )}
        </ul>

        {savedCount > 0 && (
          <div className="mt-3 flex justify-center sm:mt-4">
            <button
              type="button"
              onClick={onOpenSaved}
              aria-haspopup="dialog"
              className="flex min-h-11 items-center gap-1.5 rounded-full bg-white pr-4 pl-2 text-sm shadow-sm transition hover:bg-coral/5 focus-visible:ring-4 focus-visible:ring-coral/40 focus-visible:outline-none"
            >
              <UiIcon name="load" className="h-7 w-7 shrink-0" />
              保存した食事を呼び出す
              <span className="rounded-full bg-cream px-1.5 text-xs tabular-nums text-ink-soft">{savedCount}</span>
            </button>
          </div>
        )}
        <p className="mt-3 text-center text-xs text-pretty text-ink-soft sm:mt-4">登録はいりません。入れた内容は、このブラウザにのみ保存されます。</p>
      </div>
    </section>
  )
}
