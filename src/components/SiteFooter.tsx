import type { MouseEvent } from 'react'
import { DISHES_INDEX_PATH, MENUS_INDEX_PATH, NUTRIENTS_INDEX_PATH, VIEW_PATH } from '../routes'
import { OperatorLink } from './OperatorLink'

const LINK = 'font-bold text-coral-ink underline decoration-coral/60 underline-offset-2'

// サイトの下の欄。アプリの画面と、ビルドで書き出す読みもののページ（成分ランキング・献立の例）の両方で使う。
// onAbout があれば「このサイトについて」はページを読み直さずに開く（アプリの中）
export function SiteFooter({ onAbout }: { onAbout?: () => void }) {
  const openAbout = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!onAbout || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    // 下のフッターから開くので、ページの上から見せる
    e.preventDefault()
    onAbout()
  }
  return (
    <footer className="mt-12 space-y-1 text-xs leading-relaxed text-ink-soft">
      {/* 値が目安であることは、いつも見せる。計算のしかたと出典は、読みたい人がひらく */}
      <p>表示される値は目安です。医療・栄養指導の代わりにはなりません。</p>
      <details className="group">
        <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1 font-bold text-coral-ink [&::-webkit-details-marker]:hidden">
          計算方法と出典
          <span aria-hidden className="transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="space-y-1 pb-2">
          <p>
            計算方法：料理の栄養は、材料ごとに食品成分表の値をかけて合計しています（市販品は各社の栄養成分表示）。1日の目安は、「栄養の目安を設定」で入れた年齢・性別・体格・活動量から、食事摂取基準をもとに計算しています。
          </p>
          <p>
            データ：文部科学省「日本食品標準成分表（八訂）増補2023年」、農林水産省「うちの郷土料理」、厚生労働省「日本人の食事摂取基準（2025年版）」、各社公式サイトの栄養成分表示、Open Food Facts（ODbL）ほか。出典のくわしい一覧は「このサイトについて」にあります。
          </p>
        </div>
      </details>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <a href={NUTRIENTS_INDEX_PATH} className={LINK}>
          成分が多い食品ランキング
        </a>
        <a href={MENUS_INDEX_PATH} className={LINK}>
          栄養バランスの整う献立の例
        </a>
        <a href={DISHES_INDEX_PATH} className={LINK}>
          料理の作り方
        </a>
      </p>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <a href={VIEW_PATH.about} onClick={openAbout} className={LINK}>
          このサイトについて（出典・プライバシー・お問い合わせ）
        </a>
        <span>
          運営：
          <OperatorLink className={LINK} />
        </span>
      </p>
    </footer>
  )
}
