import type { ReactNode } from 'react'
import { LogoMogu } from '../components/Mascot'
import { SiteFooter } from '../components/SiteFooter'

// ビルドのときに書き出す読みもののページ（成分ランキング・献立の例）の枠。
// アプリのプログラムは読まない軽いページなので、検索から来た人にもすぐ出る。アプリへはボタンで入る

export type Crumb = { name: string; path?: string }

export const BUTTON = 'inline-flex min-h-11 items-center justify-center rounded-full bg-coral px-5 text-sm font-bold text-ink-strong shadow-sm hover:bg-coral-dark'
export const BUTTON_SUB = 'inline-flex min-h-11 items-center justify-center rounded-full border-2 border-coral bg-white px-5 text-sm font-bold text-coral-ink'
export const LINK = 'font-bold text-coral-ink underline decoration-coral/60 underline-offset-2 hover:decoration-coral-ink'
export const CARD = 'rounded-[var(--radius-card)] bg-white p-4 shadow-sm sm:p-5'

export function StaticLayout({ crumbs, children }: { crumbs: Crumb[]; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16">
      <header className="flex items-center justify-between gap-3 py-2.5 sm:py-4">
        <a href="/" className="flex shrink-0 items-center gap-1.5" aria-label="モグシル（アプリのはじめのページ）">
          <LogoMogu className="h-10 w-10 sm:h-12 sm:w-12" />
          <span className="font-logo text-2xl leading-none tracking-wide text-ink sm:text-[28px]">モグシル</span>
        </a>
        <a href="/" className={BUTTON}>
          アプリをひらく
        </a>
      </header>
      <nav aria-label="現在地" className="mb-3 text-xs text-ink-soft">
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          {crumbs.map((c, i) => (
            <li key={c.name} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden>›</span>}
              {c.path ? (
                <a href={c.path} className="underline decoration-ink-soft/40 underline-offset-2">
                  {c.name}
                </a>
              ) : (
                <span aria-current="page">{c.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <main>{children}</main>
      <SiteFooter />
    </div>
  )
}

// アプリの画面（/ /ranking/ など）の HTML に最初から入れておく字。アプリが動きだすと置きかわる。
// 検索エンジンや、プログラムを動かさないで読むサービスにも、何のページか分かるようにする
export function AppFallback({ heading, description, links }: { heading: string; description: string; links?: { name: string; path: string }[] }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <header className="flex items-center gap-1.5 py-2.5 sm:py-4">
        <LogoMogu className="h-10 w-10 sm:h-12 sm:w-12" />
        <span className="font-logo text-2xl leading-none tracking-wide text-ink sm:text-[28px]">モグシル</span>
      </header>
      <main className="py-6">
        <h1 className="text-xl font-bold">{heading}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{description}</p>
        {/* アプリが動きだすまでの画面。下のリンクは画面の外に置き、読み込みのあいだにちらつかないようにする */}
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
          <p className="text-ink-soft">読み込み中…</p>
          <noscript>
            <p className="text-sm">このアプリは JavaScript を使います。ブラウザの設定で JavaScript をオンにしてください。</p>
          </noscript>
        </div>
        {links && links.length > 0 && (
          <ul className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs">
            {links.map((l) => (
              <li key={l.path}>
                <a href={l.path} className={LINK}>
                  {l.name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <StaticLayout crumbs={[{ name: 'モグシル', path: '/' }, { name: 'ページが見つかりません' }]}>
      <div className={`${CARD} text-center`}>
        <h1 className="text-xl font-bold">ページが見つかりません</h1>
        <p className="mt-2 text-sm leading-relaxed">アドレスがまちがっているか、ページが移動した可能性があります。</p>
        <p className="mt-4">
          <a href="/" className={BUTTON}>
            モグシルのはじめのページへ
          </a>
        </p>
      </div>
    </StaticLayout>
  )
}
