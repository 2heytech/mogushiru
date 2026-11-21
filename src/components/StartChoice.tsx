import type { ReactNode } from 'react'
import { ENERGY_TOLERANCE } from '../domain/daySummary'
import type { ResultPreview } from '../domain/resultPreview'
import { POPULAR_LINKS, READING_LINKS, VIEW_META, VIEW_PATH } from '../routes'
import { CustomizeIcon } from './CustomizeIcon'
import { concernText, energyDiffText } from './daySummaryText'
import { inAppLink } from './inAppLink'
import { PFC_COLOR, PFC_LABEL } from './labels'
import { BowlMogu } from './Mascot'
import { UiIcon, type UiIconName } from './UiIcon'

// 入口のボタン（絵・名前と説明・矢印の横長の行）。主ボタンは1つだけ色をぬり、ほかは白い行にして、どれを押せばよいかが一目で分かるようにする。
// 説明は、スマホでは1行に収まる長さにする（結果の例と2つの入口までを、最初の画面に収めるため）
const ENTRY_BASE =
  'group flex w-full items-center gap-3 rounded-[var(--radius-card)] text-left transition hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-coral/40 focus-visible:outline-none active:translate-y-0'
const ENTRY_PRIMARY = `${ENTRY_BASE} min-h-16 bg-coral px-3 py-2.5 text-ink-strong shadow-md hover:bg-coral-dark/90 hover:shadow-lg sm:min-h-[4.5rem] sm:px-4 sm:py-3`
const ENTRY_SECONDARY = `${ENTRY_BASE} min-h-14 border border-coral/50 bg-white px-3 py-2 shadow-sm hover:bg-coral/5`

function Entry({ icon, title, desc, onClick, opensDialog = false, primary = false }: { icon: UiIconName; title: string; desc: ReactNode; onClick: () => void; opensDialog?: boolean; primary?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-haspopup={opensDialog ? 'dialog' : undefined} className={primary ? ENTRY_PRIMARY : ENTRY_SECONDARY}>
      <UiIcon name={icon} className={`shrink-0 ${primary ? 'h-11 w-11 rounded-xl bg-white/85 p-0.5 sm:h-12 sm:w-12' : 'h-9 w-9'}`} />
      <span className="min-w-0 flex-1">
        <span className={`block leading-snug font-bold ${primary ? 'text-lg' : 'text-base'}`}>{title}</span>
        <span className={`mt-0.5 block text-xs leading-snug text-pretty ${primary ? 'text-ink-strong' : 'text-ink-soft'}`}>{desc}</span>
      </span>
      {/* 幅のせまいスマホでは、矢印の丸をはぶいて字の幅をとる */}
      <span
        aria-hidden="true"
        className={`grid shrink-0 place-items-center rounded-full transition group-hover:translate-x-0.5 max-[359px]:hidden ${primary ? 'h-8 w-8 bg-white text-coral-ink' : 'h-7 w-7 bg-coral/20 text-coral-ink'}`}
      >
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
// 1日の食事の画面では、入口を1つ選んだあとでも、ほかの入口を選びなおせるように最初の画面へもどす
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

// 最初の画面に出す「結果の例」：献立の例を1つ入れたときの、カロリー・PFCバランス・気になる点（結果の画面のまとめと同じ計算。
// domain/resultPreview.ts）。何も押さなくても、どんな結果が見られるかが分かる。カードのどこを押しても、その献立を入れた結果の画面がひらく。
// データを読み込んでいるあいだは、同じ中身を見えない形で置いて高さをとっておく（読み終えたときに、下の入口が動かないように）。
// スマホでは、下の入口まで最初の画面に収まるように高さをつめる：見出しは1行、カロリーの「目安の範囲内（＋60 kcal）」の行は印（◎・少なめ・多め）にする
const EXAMPLE_BOX = 'relative flex min-w-0 flex-col gap-1.5 rounded-[var(--radius-card)] bg-white p-3 shadow-sm ring-1 ring-coral/25 sm:gap-2 sm:p-4'

// 目安の範囲内（◎）か、外れているか（少なめ・多め）の印。gap は、範囲からのずれ（0 は範囲内、マイナスは足りない）
function RangeMark({ gap }: { gap: number }) {
  return (
    <span className={`text-2xs font-bold ${gap === 0 ? 'text-ok-ink' : 'text-alert-ink'}`}>
      {gap === 0 ? (
        <>
          ◎<span className="sr-only">（目安の範囲内）</span>
        </>
      ) : gap < 0 ? (
        '少なめ'
      ) : (
        '多め'
      )}
    </span>
  )
}

// 読み込んでいるあいだ、高さをとっておくための仮の中身（画面には見せない）
const pendingPreview = (name: string): ResultPreview => ({
  name,
  count: 14,
  kcal: 2000,
  targetKcal: 2000,
  gaps: (['p', 'f', 'c'] as const).map((key) => ({ key, ratio: 0, range: { lo: 0, hi: 0 }, gap: 0, grams: 0, kcal: 0 })),
  summary: { state: 'full', missing: [], ok: [], near: [], concerns: [{ kind: 'vegetable', rest: 100 }], steps: [], mood: 'happy' },
})

export function ResultExample({
  preview: loaded,
  loading = false,
  name = '',
  onOpen,
}: {
  preview?: ResultPreview
  // データを読み込んでいるあいだ（preview がまだない）
  loading?: boolean
  // 献立の例の名前（読み込んでいるあいだの高さをそろえるのに使う）
  name?: string
  onOpen?: () => void
}) {
  // 読み込めなかったとき（loading でない）は、枠ごと出さない
  if (!loaded && !loading) return null
  const pending = !loaded
  const preview = loaded ?? pendingPreview(name)
  const { kcal, targetKcal, gaps, summary } = preview
  const max = targetKcal * 1.5
  const within = Math.abs(kcal - targetKcal) <= targetKcal * ENERGY_TOLERANCE
  const barColor = kcal > targetKcal * (1 + ENERGY_TOLERANCE) ? 'bg-alert' : within ? 'bg-ok' : 'bg-coral'
  const [first, ...rest] = summary.concerns
  return (
    <section aria-labelledby="start-example-title" aria-busy={pending || undefined} className={`${EXAMPLE_BOX} transition hover:shadow-md`}>
      {pending && (
        <p role="status" className="absolute inset-0 z-10 grid place-items-center text-sm text-ink-soft">
          結果の例を計算しています…
        </p>
      )}
      <h2 id="start-example-title" className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm leading-snug font-bold">
        <span className="shrink-0 rounded-full bg-coral/20 px-2 py-0.5 text-xs font-bold text-coral-ink">結果の例</span>
        <span className={pending ? 'invisible' : ''}>
          {preview.name}（{preview.count}品）<span className="max-sm:hidden">の1日なら</span>
        </span>
      </h2>
      {/* 読み込んでいるあいだは、見えない形で置く（読み上げもしない） */}
      <div className={`flex flex-1 flex-col gap-1.5 sm:gap-2 ${pending ? 'invisible' : ''}`} aria-hidden={pending || undefined}>
        <div>
          <p className="flex items-baseline justify-between gap-2">
            <span className="flex items-baseline gap-1.5 text-xs whitespace-nowrap text-ink-soft">
              カロリー
              <span className="sm:hidden">
                <RangeMark gap={within ? 0 : kcal - targetKcal} />
              </span>
            </span>
            <span className="whitespace-nowrap">
              <strong className="text-xl tabular-nums">{Math.round(kcal).toLocaleString()}</strong>
              <span className="text-xs text-ink-soft tabular-nums"> / {targetKcal.toLocaleString()} kcal</span>
            </span>
          </p>
          <div className="relative mt-0.5 h-3 overflow-hidden rounded-full bg-cream">
            <div className="absolute inset-y-0 bg-ok/25" style={{ left: `${((1 - ENERGY_TOLERANCE) / 1.5) * 100}%`, width: `${((2 * ENERGY_TOLERANCE) / 1.5) * 100}%` }} />
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(kcal / max, 1) * 100}%` }} />
          </div>
          <p className={`mt-0.5 hidden text-xs sm:block ${within ? 'font-bold text-ok-ink' : 'text-ink-soft'}`}>{energyDiffText(kcal, targetKcal, ENERGY_TOLERANCE)}</p>
        </div>
        {gaps && (
          <ul aria-label="PFCバランス" className="grid grid-cols-3 gap-1.5">
            {gaps.map((g) => (
              <li key={g.key} className="min-w-0 rounded-xl bg-cream px-1.5 py-1 text-center">
                <span className="flex items-center justify-center gap-1 text-2xs whitespace-nowrap text-ink-soft">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PFC_COLOR[g.key] }} aria-hidden />
                  {PFC_LABEL[g.key]}
                </span>
                <span className="flex items-baseline justify-center gap-1 whitespace-nowrap">
                  <strong className="text-sm leading-tight tabular-nums">{Math.round(g.ratio)}%</strong>
                  <RangeMark gap={g.gap} />
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="flex items-center gap-1.5 text-xs leading-snug">
          <span className={`grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full text-2xs leading-none font-bold ${first ? 'bg-caution/50 text-ink-strong' : 'bg-ok/30 text-ok-ink'}`} aria-hidden>
            {first ? '!' : '✓'}
          </span>
          <span className="min-w-0 truncate">
            {first ? (
              <>
                {/* 幅のせまいスマホでは、中身（「野菜は目安まであと170g」）が切れないように、見出しの字をはぶく */}
                <strong className="max-[359px]:sr-only">気になる点</strong> {concernText(first)}
                {rest.length > 0 && `　ほか${rest.length}件`}
              </>
            ) : (
              'カロリーもバランスも、目安の範囲内'
            )}
          </span>
        </p>
        {onOpen && (
          // カードのどこを押してもひらく（after で、押せるところをカードいっぱいに広げる）
          <button
            type="button"
            onClick={onOpen}
            className="mt-auto flex min-h-8 items-center justify-end gap-0.5 rounded-full text-sm font-bold text-coral-ink after:absolute after:inset-0 after:rounded-[var(--radius-card)] focus-visible:outline-none focus-visible:after:ring-4 focus-visible:after:ring-coral/40"
          >
            この例で結果の画面を見る
            {CHEVRON_RIGHT}
          </button>
        )}
      </div>
    </section>
  )
}

// 「栄養バランス」をひらいたとき、ほかの表示の代わりに出す最初の画面（1日の食事が空のとき。料理が入っていても、「最初の画面にもどる」やロゴからもどれる）。
// まず「何がわかるアプリか」をひとことで伝え（この画面の見出し h1。検索エンジンにも、ページの題として読まれる）、
// 結果の例を先に見せてから（何も押さなくても、結果の画面のイメージが見える）、入口を選んでもらう。色をぬった主ボタンは1つだけ：
//   献立の例から選ぶ（主ボタン）… 栄養バランスの整った献立（1日分まとめて／1食ずつ）から選ぶ窓へ
//   自分の食事で試す … 朝・昼・晩に、食べた料理を入れていく画面へ
//   結果の例の「この例で結果の画面を見る」… 献立の例を1つそのまま入れて、結果の画面を見る（もとの「サンプルで結果を見る」）
// 「1日でバランス／毎食バランス」のちがいは、献立の例から選ぶ窓の中で選ぶ（ここでは聞かない）。
// その下に小さく、ほかの入口：保存した食事を呼び出す（保存したものがあるとき）・料理をアレンジ。
// いちばん下に、何が計算できるかの説明と、読みもののページ（コンビニ昼ごはん・たんぱく質ランキングなど）への直リンク。
// 料理が入っているとき（current）は、いちばん上に「いまの1日の食事にもどる」を出す。入口は新しく始める入口なので、
// いまの料理を置き換える前に確かめるのは、呼ぶ側（App.tsx）とそれぞれの窓の役目。
// この画面は、料理・食材のデータを読み終える前から出す（データを待つのは結果の例だけ。読み込み中に画面の下が動かないように）
export function StartChoice({
  savedCount,
  preview,
  previewLoading = false,
  previewName,
  current,
  onResume,
  onPickSelf,
  onBuild,
  onOpenSaved,
  onArrange,
  onTrySample,
}: {
  savedCount: number
  // 結果の例（献立の例を入れたときの結果）。データを読み込んでいるあいだは previewLoading、読み込めなかったときはどちらもなし
  preview?: ResultPreview
  previewLoading?: boolean
  // 結果の例に使う献立の名前（読み込んでいるあいだの枠の高さをそろえるため）
  previewName?: string
  // いまの1日の食事に入っている料理の数とカロリー（空のときは undefined。カロリーは、データを読み終えるまでは出さない）
  current?: { count: number; kcal?: number }
  onResume: () => void
  onPickSelf: () => void
  onBuild: () => void
  onOpenSaved: () => void
  // 「料理をアレンジ」の画面へ
  onArrange: () => void
  onTrySample?: () => void
}) {
  return (
    // スマホでは、結果の例と2つの入口までが最初の画面に収まるように：モグは見出しの横に小さく、説明の文ははぶく
    <section aria-labelledby="start-title" className="rounded-[var(--radius-card)] bg-[#fff1df] px-4 pt-3 pb-4 shadow-sm sm:px-8 sm:py-8">
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
                {current.count}品{current.kcal !== undefined && `・${Math.round(current.kcal).toLocaleString()} kcal`}
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
        {/* スマホ：結果の例 → 入口。広い画面：左に結果の例、右に入口 */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:items-start md:gap-5">
          <ResultExample preview={preview} loading={previewLoading} name={previewName} onOpen={onTrySample} />
          <div className={`min-w-0 ${preview || previewLoading ? '' : 'md:col-span-2 md:mx-auto md:w-full md:max-w-md'}`}>
            <h2 id="start-choice-title" className="mb-1.5 text-center text-base font-bold text-balance sm:mb-2 md:text-left">
              {current ? '新しく始めるなら' : 'なにから始める？'}
            </h2>
            <ul aria-labelledby="start-choice-title" className="grid gap-2">
              <li>
                <Entry
                  primary
                  icon="build"
                  title="献立の例から選ぶ"
                  desc={
                    <>
                      <span className="max-sm:hidden">バランスの整った献立を、</span>1日分か1食ずつ選ぶ
                    </>
                  }
                  onClick={onBuild}
                  opensDialog
                />
              </li>
              <li>
                <Entry
                  icon="pick"
                  title="自分の食事で試す"
                  desc={
                    <>
                      食べた料理を<span className="max-sm:hidden">、朝・昼・晩に</span>入れていく
                    </>
                  }
                  onClick={onPickSelf}
                />
              </li>
            </ul>

            {/* ほかの入口。上の入口より小さく並べる（幅がせまいときは2行に） */}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 md:justify-start">
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
          </div>
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
