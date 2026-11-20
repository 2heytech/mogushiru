import type { ReactNode } from 'react'
import { POPULAR_LINKS, READING_LINKS, VIEW_META, VIEW_PATH } from '../routes'
import { CustomizeIcon } from './CustomizeIcon'
import { inAppLink } from './inAppLink'
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

// 見出しのキャッチコピー（routes.ts の VIEW_META と同じ文。最初の HTML に入れる見出しとそろえる）。折り返してよい位置（「、」のあと）で分ける
const START_HEADING = VIEW_META.menu.heading.split(/(?<=、)/)

const CHEVRON_LEFT = (
  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 5l-7 7 7 7" />
  </svg>
)

const CHEVRON_RIGHT = (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 5l7 7-7 7" />
  </svg>
)

// 「料理をアレンジ」の画面（/customize/）への入口。上のメニューには出さず、栄養バランスの中（1日の食事の上の行・最初の画面）に置く。
// ほかの画面へのリンクなので <a href> にしておき、ふつうのクリックはページを読み直さずに切り替える
export function ArrangeLink({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  return (
    <a
      href={VIEW_PATH.customize}
      onClick={(e) => inAppLink(e, onClick)}
      className={`group flex min-h-11 shrink-0 items-center rounded-full focus-visible:ring-4 focus-visible:ring-coral/40 focus-visible:outline-none ${className}`}
    >
      <span className="flex min-h-9 items-center gap-1 rounded-full bg-white pr-2.5 pl-1.5 text-sm font-bold whitespace-nowrap text-coral-ink shadow-sm transition group-hover:bg-coral/5">
        {/* 幅のせまいスマホでは、となりのもどり口と1行に並ぶように絵をはぶく */}
        <CustomizeIcon className="h-6 w-6 shrink-0 max-[359px]:hidden" />
        <span className="max-[359px]:pl-1">料理をアレンジ</span>
        {CHEVRON_RIGHT}
      </span>
    </a>
  )
}

// 画面のいちばん上に置く行。左に、前の画面へのもどり口（「‹ 最初の画面にもどる」「‹ 1日の食事にもどる」）、右に、あれば別の入口（children）。
// 1日の食事の画面では、入口を1つえらんだあとでも、ほかの入口をえらびなおせるように最初の画面へもどす
// （入れた料理は外さない。最初の画面の「いまの1日の食事にもどる」で、そのままもどれる）。
// 文字のまわりを広く押せるようにして（44px）、上のタブ・下の「1日の食事」とのあいだはつめる。
// shortLabel：幅390px未満のスマホで、右の入口と1行に並ぶように短くした名前（「最初の画面へ」）
export function BackRow({
  label,
  shortLabel,
  onClick,
  className = '',
  children,
}: {
  label: string
  shortLabel?: string
  onClick: () => void
  className?: string
  children?: ReactNode
}) {
  return (
    <div className={`-mt-3 -mb-1 flex items-center justify-between gap-1 ${className}`}>
      <button
        type="button"
        onClick={onClick}
        className="-ml-1.5 flex min-h-11 min-w-0 items-center gap-0.5 rounded-full pr-2 pl-1.5 text-left text-sm leading-tight font-bold whitespace-nowrap text-ink-soft transition hover:text-ink focus-visible:ring-4 focus-visible:ring-coral/40 focus-visible:outline-none"
      >
        {CHEVRON_LEFT}
        {shortLabel ? (
          <>
            <span className="max-[389px]:hidden">{label}</span>
            <span className="min-[390px]:hidden">{shortLabel}</span>
          </>
        ) : (
          label
        )}
      </button>
      {children}
    </div>
  )
}

// 「栄養バランス」をひらいたとき、ほかの表示の代わりに出す最初の画面（1日の食事が空のとき。料理が入っていても、「最初の画面にもどる」やロゴからもどれる）。
// まず「何がわかるアプリか」をひとことで伝え（この画面の見出し h1。検索エンジンにも、ページの題として読まれる）、やりたいことから入口をえらんでもらう：
//   献立案から選ぶ … 栄養バランスの整った献立（1日分まとめて／1食ずつ）からえらぶ窓へ（いちばん上）
//   自分の食事で試す … 朝・昼・晩に、食べた料理を入れていく画面へ
//   サンプルで結果を見る … 献立の例を1つそのまま入れて、結果の画面を先に見る（sampleName があるとき）
// 「1日でバランス／毎食バランス」のちがいは、献立案から選ぶ窓の中でえらぶ（ここでは聞かない）。
// その下に小さく、ほかの入口：保存した食事を呼び出す（保存したものがあるとき）・料理をアレンジ。
// いちばん下に、何が計算できるかの説明と、読みもののページ（コンビニ昼ごはん・たんぱく質ランキングなど）への直リンク。
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
  onArrange,
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
  // 「料理をアレンジ」の画面へ
  onArrange: () => void
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
        <h1 id="start-title" className="text-lg leading-snug font-bold sm:mt-2 sm:text-2xl sm:text-balance">
          {/* 折り返すときは「、」のあとで */}
          {START_HEADING.map((part) => (
            <span key={part} className="inline-block">
              {part}
            </span>
          ))}
        </h1>
        <p className="mt-1.5 hidden text-sm text-ink-soft sm:block">
          <span className="inline-block">カロリーやPFCバランス、ビタミン・ミネラルが、</span>
          <span className="inline-block">1日の目安に足りているかを見られます。</span>
        </p>
      </div>
      <div className="mx-auto max-w-4xl">
        <h2 id="start-choice-title" className="mb-2 text-center text-base font-bold text-balance sm:mb-3 sm:text-lg">
          {current ? '新しく始めるなら' : 'なにから始める？'}
        </h2>
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

        {/* ほかの入口。3つの入口より小さく並べる（幅がせまいときは2行に） */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 sm:mt-3">
          {savedCount > 0 && (
            <button
              type="button"
              onClick={onOpenSaved}
              aria-haspopup="dialog"
              className="group flex min-h-11 items-center rounded-full focus-visible:ring-4 focus-visible:ring-coral/40 focus-visible:outline-none"
            >
              <span className="flex min-h-9 items-center gap-1 rounded-full bg-white pr-2.5 pl-1.5 text-sm whitespace-nowrap shadow-sm transition group-hover:bg-coral/5">
                <UiIcon name="load" className="h-6 w-6 shrink-0" />
                保存した食事を呼び出す
                <span className="rounded-full bg-cream px-1.5 text-xs tabular-nums text-ink-soft">{savedCount}</span>
              </span>
            </button>
          )}
          <ArrangeLink onClick={onArrange} />
        </div>
        <p className="mt-2 text-center text-xs text-pretty text-ink-soft sm:mt-3">登録はいりません。入れた内容は、このブラウザにのみ保存されます。</p>

        {/* 何が計算できるかの説明と、読みもののページへの直リンク（ふつうのリンク。検索エンジンもここから下のページへたどれる） */}
        <div className="mt-4 border-t border-coral/25 pt-3 sm:mt-6 sm:pt-4">
          <p className="text-xs leading-relaxed text-pretty text-ink-soft sm:text-center sm:text-sm">
            料理・食材・コンビニやメーカーの市販品を選ぶと、カロリー、PFCバランス（たんぱく質・脂質・炭水化物）、食塩、ビタミン・ミネラルなど26の成分を計算して、年齢・性別に合わせた1日の目安とくらべられます。
          </p>
          <nav aria-labelledby="start-links-title" className="mt-2 sm:mt-3">
            <h2 id="start-links-title" className="text-center text-xs font-bold text-ink-soft">
              計算ずみの例とランキング
            </h2>
            <ul className="mt-0.5 flex flex-wrap justify-center gap-x-1.5">
              {[...POPULAR_LINKS, ...READING_LINKS].map((l) => (
                <li key={l.path}>
                  <a href={l.path} className="group flex min-h-11 items-center rounded-full focus-visible:ring-4 focus-visible:ring-coral/40 focus-visible:outline-none">
                    <span className="flex min-h-9 items-center gap-0.5 rounded-full bg-white pr-2 pl-3 text-sm font-bold text-coral-ink shadow-sm transition group-hover:bg-coral/5">
                      {l.name}
                      {CHEVRON_RIGHT}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </section>
  )
}
