import type { ReactNode } from 'react'
import { LogoMogu } from '../components/Mascot'
import { SiteFooter } from '../components/SiteFooter'
import { READING_LINKS, VIEW_PATH } from '../routes'

// ビルドのときに書き出す読みもののページ（食品成分ランキング・献立の例・料理のカロリー・栄養）の枠。
// アプリのプログラムは読まない軽いページなので、検索から来た人にもすぐ出る。アプリへは、上のメニューとボタンで入る

export type Crumb = { name: string; path?: string }

export const BUTTON = 'inline-flex min-h-11 items-center justify-center rounded-full bg-coral px-5 text-sm font-bold text-ink-strong shadow-sm hover:bg-coral-dark'
export const BUTTON_SUB = 'inline-flex min-h-11 items-center justify-center rounded-full border-2 border-coral bg-white px-5 text-sm font-bold text-coral-ink'
export const LINK = 'font-bold text-coral-ink underline decoration-coral/60 underline-offset-2 hover:decoration-coral-ink'
export const CARD = 'rounded-[var(--radius-card)] bg-white p-4 shadow-sm sm:p-5'

// 棒の長さ。サイトの設定（_headers の Content-Security-Policy）で HTML の style 属性は使えないので、5%きざみのクラスにする
// （Tailwind がクラスを作れるよう、名前はここにそのまま書いておく）
const BAR_WIDTHS = ['w-[5%]', 'w-[10%]', 'w-[15%]', 'w-[20%]', 'w-[25%]', 'w-[30%]', 'w-[35%]', 'w-[40%]', 'w-[45%]', 'w-[50%]', 'w-[55%]', 'w-[60%]', 'w-[65%]', 'w-[70%]', 'w-[75%]', 'w-[80%]', 'w-[85%]', 'w-[90%]', 'w-[95%]', 'w-[100%]']
export const barWidth = (ratio: number) => BAR_WIDTHS[Math.min(Math.max(Math.round(ratio * 20), 1), 20) - 1]

// 読みもののページがどの一覧の中にあるか（上のメニューで、いまの場所を示す）。foods は、食品のページ（/foods/natto/ など）
export type Section = (typeof READING_LINKS)[number]['key'] | 'foods'

// 追従するボタン（ページを読み進めても、下に出たままの小さなボタン）。行き先は、ページの中身に合わせる
// （料理のページなら「この料理を1日の食事に入れる」）。指定がなければ「栄養バランスを計算する」
export type Cta = { href: string; label: string }
export const CALC_LABEL = '栄養バランスを計算する'
const DEFAULT_CTA: Cta = { href: VIEW_PATH.menu, label: CALC_LABEL }

const NAV_LINK = 'inline-flex min-h-11 items-center font-bold whitespace-nowrap underline-offset-4 hover:underline'
const NAV_HERE = 'text-coral-ink underline decoration-coral decoration-2'

// 上のメニュー：栄養バランスを計算（ボタン）・食品を調べる・ランキング・献立の例・料理のカロリー・栄養。
// どの読みもののページからも、アプリの画面とほかの読みものへ1回で行ける。「ランキング」は読みものの一覧（/nutrients/）へ
// （並べ替える道具の /ranking/ へは、成分のページの「くらべ方や種類を変えて並べ替える」と、一覧から入る）
function SiteNav({ section }: { section?: Section }) {
  return (
    <nav aria-label="サイトのメニュー" className="order-3 w-full lg:order-2 lg:ml-auto lg:w-auto">
      <ul className="flex flex-wrap items-center gap-x-2 text-xs min-[380px]:gap-x-3 min-[400px]:gap-x-4 sm:gap-x-5 sm:text-sm">
        <li>
          <a href={VIEW_PATH.foods} aria-current={section === 'foods' ? 'true' : undefined} className={`${NAV_LINK} ${section === 'foods' ? NAV_HERE : 'text-ink'}`}>
            食品を調べる
          </a>
        </li>
        {READING_LINKS.map((l) => (
          <li key={l.key}>
            <a href={l.path} aria-current={l.key === section ? 'true' : undefined} className={`${NAV_LINK} ${l.key === section ? NAV_HERE : 'text-ink'}`}>
              {/* 幅のせまいスマホでは、4つが1行に並ぶように「料理の栄養」まで縮める */}
              {l.key === 'dishes' ? (
                <>
                  料理の<span className="max-sm:hidden">カロリー・</span>栄養
                </>
              ) : (
                l.short
              )}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// cta：追従するボタン。null なら出さない（短いページ）
export function StaticLayout({ crumbs, section, cta = DEFAULT_CTA, children }: { crumbs: Crumb[]; section?: Section; cta?: Cta | null; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16">
      {/* 追従するボタンの動く範囲を、上のメニューから本文の終わりまでにする（フッターには重ねない） */}
      <div className={`relative ${cta ? 'pb-16' : ''}`}>
        <header className="flex flex-wrap items-center justify-between gap-x-4 pt-2.5 pb-1 sm:pt-4 lg:pb-3">
          <a href="/" className="order-1 flex shrink-0 items-center gap-1 min-[360px]:gap-1.5" aria-label="モグシル（はじめのページ）">
            <LogoMogu className="h-10 w-10 sm:h-12 sm:w-12" />
            <span className="font-logo text-2xl leading-none tracking-wide text-ink sm:text-[28px]">モグシル</span>
          </a>
          <SiteNav section={section} />
          {/* 幅のせまいスマホでも、ロゴと1行に並ぶように短くする（「栄養を計算」→「栄養を計算する」→「栄養バランスを計算」→「栄養バランスを計算する」） */}
          <a href={VIEW_PATH.menu} aria-label={CALC_LABEL} className={`${BUTTON} order-2 px-3 whitespace-nowrap max-[359px]:text-xs min-[360px]:px-4 lg:order-3`}>
            栄養<span className="max-[374px]:hidden">バランス</span>を計算<span className="max-[359px]:hidden min-[375px]:max-[419px]:hidden">する</span>
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
        {/* 追従するボタン。プログラムは使わず、CSS だけで動かす：動く範囲（下の div）を、開いてすぐの画面の下から始めるので、
            開いたときには出ず（上のメニューのボタンと重ならない）、少し読み進めると画面の下に出て、本文の終わりまでついてくる */}
        {cta && (
          <div className="pointer-events-none absolute inset-x-0 top-[100vh] bottom-0 flex flex-col justify-end">
            <p className="sticky bottom-3 flex justify-center">
              <a href={cta.href} className={`${BUTTON} pointer-events-auto min-h-12 px-6 shadow-lg ring-2 ring-white/80`}>
                {cta.label}
              </a>
            </p>
          </div>
        )}
      </div>
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
    <StaticLayout crumbs={[{ name: 'モグシル', path: '/' }, { name: 'ページが見つかりません' }]} cta={null}>
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
