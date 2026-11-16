import { useDeferredValue, useMemo, useRef, useState } from 'react'
import { itemTotals, type Catalog } from '../domain/nutrition'
import { LOOKUP_KIND_LABEL, lookupIndex, searchLookup, type LookupItem, type LookupKind } from './lookupCards'
import type { Card } from './pickerCards'
import { useMediaQuery } from './useMediaQuery'

// 「食品を調べる」の「名前でさがす」：名前を入れると、食材・料理・市販品の候補がカロリーとたんぱく質・脂質・炭水化物つきで出る。
// 押すと、その食品の栄養素の一覧（FoodDetailDialog）がひらく

// 「すべて」で種類ごとに出す数（せまい画面／広い画面）と、1つの種類だけを見るときに1回で出す数
const PREVIEW_NARROW = 3
const PREVIEW_WIDE = 5
const PAGE = 30

// 広い画面で、さがす欄の横に出す例（押すとその言葉でさがす）
const EXAMPLES = ['卵', '納豆', 'バナナ', '鶏むね肉', 'カレーライス']

// スマホの幅か（キーボードが画面の下半分をかくす幅）
const narrowScreen = () => typeof window.matchMedia === 'function' && window.matchMedia('(width < 48rem)').matches

const PILL = 'rounded-full px-1.5 py-px text-2xs whitespace-nowrap text-ink tabular-nums'

function LookupRow({ card, catalog, onOpen }: { card: Card; catalog: Catalog; onOpen: (item: LookupItem) => void }) {
  const totals = itemTotals({ uid: '', ...card.item }, catalog)
  const v = totals.values
  const pfc = [
    { short: 'P', label: 'たんぱく質', key: 'protein', className: 'bg-protein/20' },
    { short: 'F', label: '脂質', key: 'fat', className: 'bg-fat/25' },
    { short: 'C', label: '炭水化物', key: 'carb', className: 'bg-carb/25' },
  ] as const
  return (
    <li>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => onOpen(card.item)}
        className="flex min-h-16 w-full items-center gap-2.5 rounded-2xl bg-white py-2 pr-2.5 pl-2.5 text-left shadow-sm transition hover:bg-coral/5"
      >
        {card.image ? (
          <img src={card.image} alt="" className="h-10 w-10 shrink-0 object-contain" loading="lazy" />
        ) : (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream text-lg" aria-hidden>
            🍽️
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="line-clamp-2 text-sm leading-snug font-bold">{card.name}</span>
            {card.kcal !== null && (
              <span className="shrink-0 text-sm font-bold whitespace-nowrap tabular-nums">
                {Math.round(card.kcal)}
                <span className="ml-0.5 text-2xs font-normal text-ink-soft">kcal</span>
              </span>
            )}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-ink-soft">
            <span className="max-w-full truncate">{card.sub}</span>
            {pfc.map(
              (n) =>
                !totals.missing.has(n.key) && (
                  <span key={n.key} className={`${PILL} ${n.className}`}>
                    <span className="sr-only">{n.label}</span>
                    <span aria-hidden>{n.short}</span> {v[n.key].toFixed(1)}g
                  </span>
                ),
            )}
          </span>
        </span>
        <span aria-hidden className="shrink-0 font-bold text-coral-ink">
          ›
        </span>
      </button>
    </li>
  )
}

export function FoodLookup({
  catalog,
  storesLoaded,
  showAlcohol,
  onOpen,
}: {
  catalog: Catalog
  // コンビニ・メーカーの商品を読み終えたか（読み込み中はそう出す）
  storesLoaded: boolean
  showAlcohol: boolean
  onOpen: (item: LookupItem) => void
}) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<LookupKind | 'all'>('all')
  const [limit, setLimit] = useState(PAGE)
  // 打っている途中の字はすぐ欄に出し、候補は手が空いたときに作る
  const deferred = useDeferredValue(query)
  const index = useMemo(() => lookupIndex({ catalog, showAlcohol }), [catalog, showAlcohol])
  const sections = useMemo(() => searchLookup(index, deferred), [index, deferred])
  const wide = useMediaQuery('(width >= 64rem)')
  const preview = wide ? PREVIEW_WIDE : PREVIEW_NARROW
  const searching = deferred.trim() !== ''
  const total = sections.reduce((n, s) => n + s.cards.length, 0)
  // 1つの種類にしか見つからなければ、はじめからその種類を広く出す。えらんでいた種類に候補がなくなったら「すべて」に戻す
  const active: LookupKind | 'all' = sections.length === 1 ? sections[0].kind : sections.some((s) => s.kind === kind) ? kind : 'all'
  const shown = active === 'all' ? null : sections.find((s) => s.kind === active)!

  const search = (q: string) => {
    setQuery(q)
    setLimit(PAGE)
    // さがし直すときは、種類のしぼりこみを外す
    if (!q.trim()) setKind('all')
  }
  // スマホでは、キーボードが出ても候補が見えるように、さがす欄を画面の上へ寄せる
  const boxRef = useRef<HTMLDivElement>(null)
  const bringToTop = () => {
    if (!narrowScreen()) return
    // 動きを減らす設定のときは、すっと動かさずにその場で寄せる
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    requestAnimationFrame(() => boxRef.current?.scrollIntoView?.({ block: 'start', behavior }))
  }
  const pick = (k: LookupKind | 'all') => {
    setKind(k)
    setLimit(PAGE)
  }
  const loadingNote = !storesLoaded && (
    <p className="text-xs text-ink-soft" role="status">
      コンビニ・メーカーの商品を読み込み中…
    </p>
  )

  return (
    <section aria-label="名前でさがす" className="space-y-2.5">
      <p className="hidden text-sm text-ink-soft sm:block">食材・料理・市販品の名前を入れると、カロリーと栄養素がすぐ見られます。</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div ref={boxRef} className="relative w-full scroll-mt-2 lg:max-w-md">
          <svg viewBox="0 0 24 24" aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-ink-soft" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => search(e.target.value)}
            onFocus={bringToTop}
            onKeyDown={(e) => {
              // かな漢字変換の確定の Enter は除く
              if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
              // スマホでは、キーボードをとじて候補を見せる。広い画面では、いちばん上の候補をひらく
              if (narrowScreen()) {
                e.currentTarget.blur()
                return
              }
              const first = (shown ?? sections[0])?.cards[0]
              if (first && query === deferred) onOpen(first.item)
            }}
            placeholder="食品名でさがす（例：納豆）"
            aria-label="食品・料理・市販品の名前でさがして、栄養素を見る"
            enterKeyHint="search"
            className="min-h-12 w-full rounded-full border-2 border-white bg-white pr-4 pl-11 text-base shadow-sm outline-none focus:border-coral"
          />
        </div>
        {!searching && (
          <p className="hidden min-w-0 flex-1 flex-wrap items-center gap-1.5 text-xs text-ink-soft sm:flex">
            <span>例：</span>
            {EXAMPLES.map((word) => (
              <button key={word} type="button" onClick={() => search(word)} className="min-h-8 rounded-full bg-white px-3 text-xs text-ink shadow-sm hover:bg-coral/10">
                {word}
              </button>
            ))}
          </p>
        )}
      </div>

      {searching && (
        <div className="space-y-2.5">
          {/* 読み上げには、候補の数だけを伝える */}
          <p className="sr-only" role="status">
            {total === 0 ? '見つかりませんでした' : sections.map((s) => `${LOOKUP_KIND_LABEL[s.kind]}${s.cards.length}件`).join('、')}
          </p>
          {total === 0 ? (
            <div className="rounded-2xl bg-white/70 px-4 py-5 text-center text-sm text-ink-soft">
              <p>「{deferred.trim()}」は見つかりませんでした。ひらがなや、別の呼び名でもためしてみてください。</p>
              {loadingNote && <div className="mt-1">{loadingNote}</div>}
            </div>
          ) : (
            <>
              {sections.length > 1 && (
                // 料理をえらぶ画面の種類の切り替えと同じ形（スマホは1行に収める）
                <div className="flex gap-0.5 rounded-full bg-white p-1 shadow-sm lg:w-fit" role="group" aria-label="種類でしぼる">
                  {[{ kind: 'all' as const, label: 'すべて', count: total }, ...sections.map((s) => ({ kind: s.kind, label: LOOKUP_KIND_LABEL[s.kind], count: s.cards.length }))].map((c) => (
                    <button
                      key={c.kind}
                      type="button"
                      aria-pressed={active === c.kind}
                      onClick={() => pick(c.kind)}
                      className={`min-h-11 flex-1 rounded-full px-1 text-xs leading-tight whitespace-nowrap lg:min-h-9 lg:flex-none lg:px-4 ${active === c.kind ? 'bg-coral font-bold text-ink-strong' : 'text-ink-soft'}`}
                    >
                      {c.label}
                      <span className="block text-2xs leading-tight tabular-nums lg:ml-1.5 lg:inline">{c.count > 999 ? '999+' : c.count}件</span>
                    </button>
                  ))}
                </div>
              )}
              {shown ? (
                <div className="space-y-2">
                  {sections.length === 1 && (
                    <h3 className="text-sm font-bold">
                      {LOOKUP_KIND_LABEL[shown.kind]}
                      <span className="ml-1.5 text-xs font-normal text-ink-soft tabular-nums">{shown.cards.length.toLocaleString()}件</span>
                    </h3>
                  )}
                  <ul className="grid grid-cols-1 gap-1.5 md:grid-cols-2 lg:grid-cols-3">
                    {shown.cards.slice(0, limit).map((c) => (
                      <LookupRow key={c.key} card={c} catalog={catalog} onOpen={onOpen} />
                    ))}
                  </ul>
                  {shown.cards.length > limit && (
                    <button type="button" onClick={() => setLimit(limit + PAGE)} className="min-h-11 w-full rounded-full bg-white text-sm font-bold shadow-sm">
                      もっと見る（あと {(shown.cards.length - limit).toLocaleString()} 件）
                    </button>
                  )}
                </div>
              ) : (
                // 種類ごとに上から数件ずつ。広い画面は横に並べる
                <div className="space-y-3 lg:grid lg:auto-cols-fr lg:grid-flow-col lg:items-start lg:gap-4 lg:space-y-0">
                  {sections.map((s) => (
                    <div key={s.kind} className="min-w-0 space-y-1.5">
                      <h3 className="text-sm font-bold">
                        {LOOKUP_KIND_LABEL[s.kind]}
                        <span className="ml-1.5 text-xs font-normal text-ink-soft tabular-nums">{s.cards.length.toLocaleString()}件</span>
                      </h3>
                      <ul className="grid grid-cols-1 gap-1.5">
                        {s.cards.slice(0, preview).map((c) => (
                          <LookupRow key={c.key} card={c} catalog={catalog} onOpen={onOpen} />
                        ))}
                      </ul>
                      {s.cards.length > preview && (
                        <button type="button" onClick={() => pick(s.kind)} className="min-h-11 w-full rounded-full text-sm font-bold text-coral-ink underline decoration-coral/60 underline-offset-2 hover:bg-white lg:min-h-9">
                          {LOOKUP_KIND_LABEL[s.kind]}をすべて見る（{s.cards.length.toLocaleString()}件）
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {loadingNote}
            </>
          )}
        </div>
      )}
    </section>
  )
}
