import { Fragment, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { highlightRanges, lookupWords } from '../domain/lookupQuery'
import { itemTotals, type Catalog } from '../domain/nutrition'
import { foodPagePath } from '../routes'
import type { RecentLookup } from '../store/useAppStore'
import { inAppLink } from './inAppLink'
import {
  browseLookup,
  LOOKUP_KIND_LABEL,
  LOOKUP_KINDS,
  LOOKUP_SORT_LABEL,
  lookupCard,
  lookupFacetLabel,
  lookupFacets,
  lookupIndex,
  searchLookup,
  sortHits,
  type LookupFacet,
  type LookupHit,
  type LookupItem,
  type LookupKind,
  type LookupSort,
  type LookupState,
} from './lookupCards'
import { useLoadFailed } from './loadProblemContext'
import type { Card } from './pickerCards'
import { useMediaQuery } from './useMediaQuery'

// 「食品を調べる」の画面（名前でさがす）。成分の多い順に見る「成分ランキング」は、上のメニューの別の画面（RankingView.tsx）。
// さがす前：最近見た食品・定番の食品（押すとすぐ栄養素の一覧）と、種類からさがす入口（食材の野菜・肉、料理の主菜・汁物、市販品の店など）。
// 名前を入れると、食材・料理・市販品の候補がカロリーとたんぱく質・脂質・炭水化物つきで出る。種類・その中の分け方でしぼり、並べかえられる。
// 候補を押すと、その食品の栄養素の一覧（FoodDetailDialog）がひらく

// 「すべて」で種類ごとに出す数（せまい画面／広い画面）と、1つの種類だけを見るときに1回で出す数
const PREVIEW_NARROW = 3
const PREVIEW_WIDE = 5
const PAGE = 30

// スマホの幅か（キーボードが画面の下半分をかくす幅）
const narrowScreen = () => typeof window.matchMedia === 'function' && window.matchMedia('(width < 48rem)').matches

const PILL = 'rounded-full px-1.5 py-px text-2xs whitespace-nowrap text-ink tabular-nums'
const SECTION_TITLE = 'text-sm font-bold'
const CHIP = 'flex min-h-11 items-center gap-1.5 rounded-full bg-white pr-3.5 pl-2 text-sm shadow-sm transition hover:bg-coral/10 lg:min-h-10'
const CHIP_PLAIN = 'min-h-11 rounded-full bg-white px-3.5 text-sm shadow-sm transition hover:bg-coral/10 lg:min-h-10'

const PFC = [
  { short: 'P', label: 'たんぱく質', key: 'protein', className: 'bg-protein/20' },
  { short: 'F', label: '脂質', key: 'fat', className: 'bg-fat/25' },
  { short: 'C', label: '炭水化物', key: 'carb', className: 'bg-carb/25' },
] as const

// 名前の中の、さがしている言葉と同じところに色をつける
function Highlighted({ name, words }: { name: string; words: string[] }) {
  const ranges = highlightRanges(name, words)
  if (ranges.length === 0) return name
  const parts: ReactNode[] = []
  let from = 0
  for (const [start, end] of ranges) {
    if (start > from) parts.push(<Fragment key={`t${from}`}>{name.slice(from, start)}</Fragment>)
    parts.push(
      <mark key={`m${start}`} className="rounded-sm bg-fat/40 text-inherit">
        {name.slice(start, end)}
      </mark>,
    )
    from = end
  }
  if (from < name.length) parts.push(<Fragment key={`t${from}`}>{name.slice(from)}</Fragment>)
  return parts
}

function LookupRow({ card, catalog, words, onOpen }: { card: Card; catalog: Catalog; words: string[]; onOpen: (item: LookupItem) => void }) {
  const totals = itemTotals({ uid: '', ...card.item }, catalog)
  const v = totals.values
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
            <span className="line-clamp-2 text-sm leading-snug font-bold">
              <Highlighted name={card.name} words={words} />
            </span>
            {card.kcal !== null && (
              <span className="shrink-0 text-sm font-bold whitespace-nowrap tabular-nums">
                {Math.round(card.kcal)}
                <span className="ml-0.5 text-2xs font-normal text-ink-soft">kcal</span>
              </span>
            )}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-ink-soft">
            <span className="max-w-full truncate">{card.sub}</span>
            {/* P・F・C は、せまくて入らないときも3つまとめて次の行へ送る（1つだけ折り返さない） */}
            <span className="flex gap-1.5">
              {PFC.map(
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
        </span>
        <span aria-hidden className="shrink-0 font-bold text-coral-ink">
          ›
        </span>
      </button>
    </li>
  )
}

// 押すとすぐ栄養素の一覧がひらく、絵と名前だけの小さなボタン（最近見た食品・定番の食品）
// 食品のページ（/foods/natto/ など）のある食品は、そのページへのふつうのリンクにする（検索エンジンがたどれる・新しいタブでも開ける）。
// ふつうに押したときは、ページを読み直さずに栄養素の一覧をひらく（アドレスは、その食品のページのものになる）
function QuickChips({ cards, onOpen }: { cards: Card[]; onOpen: (item: LookupItem) => void }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {cards.map((c) => {
        const page = c.item.kind === 'food' ? foodPagePath(c.item.refId) : null
        const inner = (
          <>
            {c.image && <img src={c.image} alt="" className="h-7 w-7 shrink-0 object-contain" loading="lazy" />}
            <span className="truncate">{c.name}</span>
          </>
        )
        return (
          <li key={c.key} className="max-w-full">
            {page ? (
              <a href={page} aria-haspopup="dialog" onClick={(e) => inAppLink(e, () => onOpen(c.item))} className={`${CHIP} max-w-full`}>
                {inner}
              </a>
            ) : (
              <button type="button" aria-haspopup="dialog" onClick={() => onOpen(c.item)} className={`${CHIP} max-w-full`}>
                {inner}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

// 種類の中の分け方（食材の野菜・肉、料理の主菜・汁物、市販品の店）を横に並べる。スマホは横に送る
function FacetChips({ label, chips, active, onPick }: { label: string; chips: { id: string | null; label: string; count?: number }[]; active: string | null; onPick: (id: string | null) => void }) {
  // 選んでいるものが横にかくれていたら、見えるところへ送る（ページのたての位置は動かさない）
  const rowRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const row = rowRef.current
    const on = row?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!row || !on || typeof row.scrollTo !== 'function') return
    row.scrollTo({ left: on.offsetLeft - row.offsetLeft - (row.clientWidth - on.clientWidth) / 2 })
  }, [active])
  return (
    <div ref={rowRef} role="group" aria-label={label} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:thin] lg:mx-0 lg:flex-wrap lg:px-0">
      {chips.map((c) => (
        <button
          key={c.id ?? 'all'}
          type="button"
          aria-pressed={active === c.id}
          onClick={() => onPick(c.id)}
          className={`min-h-11 shrink-0 rounded-full px-3.5 text-sm whitespace-nowrap shadow-sm transition lg:min-h-9 ${active === c.id ? 'bg-coral font-bold text-ink-strong' : 'bg-white text-ink hover:bg-coral/10'}`}
        >
          {c.label}
          {c.count !== undefined && <span className="ml-1 text-2xs tabular-nums">{c.count.toLocaleString()}</span>}
        </button>
      ))}
    </div>
  )
}

// さがす前に出す「種類からさがす」。押すと、その種類の一覧になる（そのあと名前を入れると、その中でさがす）
function Categories({ showAlcohol, onPick }: { showAlcohol: boolean; onPick: (kind: LookupKind, facet: LookupFacet) => void }) {
  return (
    <section aria-label="種類からさがす" className="space-y-3 rounded-[var(--radius-card)] bg-white/60 p-3 sm:p-4">
      <h2 className={SECTION_TITLE}>種類からさがす</h2>
      {LOOKUP_KINDS.map((kind) => {
        const facets = lookupFacets(kind, { showAlcohol, home: true })
        return (
          <div key={kind} className="space-y-1.5">
            <h3 className="text-xs font-bold text-ink-soft">{LOOKUP_KIND_LABEL[kind]}</h3>
            {kind === 'food' ? (
              // 食材は数が多いので、絵つきの小さなタイルをつめて並べる
              <ul className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-9">
                {facets.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => onPick(kind, f)}
                      className="flex min-h-16 w-full flex-col items-center justify-center gap-0.5 rounded-2xl bg-white px-0.5 py-1.5 text-2xs leading-tight font-bold shadow-sm transition hover:bg-coral/10"
                    >
                      {f.image && <img src={f.image} alt="" className="h-8 w-8 object-contain" loading="lazy" />}
                      <span className="[word-break:keep-all]">{f.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {facets.map((f) => (
                  <li key={f.id}>
                    <button type="button" onClick={() => onPick(kind, f)} className={f.image ? CHIP : CHIP_PLAIN}>
                      {f.image && <img src={f.image} alt="" className="h-7 w-7 shrink-0 object-contain" loading="lazy" />}
                      {f.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </section>
  )
}

export function FoodLookup({
  catalog,
  storesLoaded,
  showAlcohol,
  state,
  onState,
  recent,
  onClearRecent,
  onOpen,
}: {
  catalog: Catalog
  // コンビニ・メーカーの商品を読み終えたか（読み込み中はそう出す）
  storesLoaded: boolean
  showAlcohol: boolean
  // さがしている言葉・しぼりこみ・並べかえ（ほかの画面へ行ってもどっても続きから見られるよう、親が持つ）
  state: LookupState
  onState: (state: LookupState) => void
  // 最近見た食品（新しい順）
  recent: RecentLookup[]
  onClearRecent: () => void
  onOpen: (item: LookupItem) => void
}) {
  const { query, kind, facet, sort } = state
  const loadFailed = useLoadFailed()
  const [limit, setLimit] = useState(PAGE)
  const set = (patch: Partial<LookupState>) => {
    onState({ ...state, ...patch })
    setLimit(PAGE)
  }
  // 打っている途中の字はすぐ欄に出し、候補は手が空いたときに作る
  const deferred = useDeferredValue(query)
  const index = useMemo(() => lookupIndex({ catalog, showAlcohol }), [catalog, showAlcohol])
  const result = useMemo(() => searchLookup(index, deferred), [index, deferred])
  const { sections } = result
  const wide = useMediaQuery('(width >= 64rem)')
  const preview = wide ? PREVIEW_WIDE : PREVIEW_NARROW
  const searching = deferred.trim() !== ''
  const total = sections.reduce((n, s) => n + s.hits.length, 0)
  // 種類の中の分け方までしぼっているか（野菜・主菜・セブン-イレブン など）
  const scoped = kind !== 'all' && facet !== null
  // さがす言葉を入れずに、種類の一覧を見ている
  const browsing = !searching && scoped
  // 1つの種類にしか見つからなければ、はじめからその種類を広く出す。選んでいた種類に候補がなくなったら「すべて」に戻す（しぼっているあいだは、その種類のまま）
  const active: LookupKind | 'all' = scoped ? kind : sections.length === 1 ? sections[0].kind : sections.some((s) => s.kind === kind) ? kind : 'all'

  // いま見ている種類の候補（「すべて」のときは null）と、その中の分け方ごとの数
  const kindHits = useMemo<LookupHit[] | null>(() => {
    if (active === 'all') return null
    if (!searching) return scoped ? browseLookup(index, active, facet) : null
    return sections.find((s) => s.kind === active)?.hits ?? []
  }, [active, searching, scoped, index, facet, sections])
  const facetCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const h of kindHits ?? []) counts.set(h.facet, (counts.get(h.facet) ?? 0) + 1)
    return counts
  }, [kindHits])
  const list = useMemo(() => {
    if (!kindHits) return null
    const inFacet = searching && facet !== null ? kindHits.filter((h) => h.facet === facet) : kindHits
    return sortHits(inFacet, sort, (card) => {
      const t = itemTotals({ uid: '', ...card.item }, catalog)
      return t.missing.has('protein') ? null : t.values.protein
    })
  }, [kindHits, searching, facet, sort, catalog])

  // 候補の名前の中で色をつける言葉（2つに分けてさがしたときは、その2つ）
  const words = useMemo(() => (result.split ? result.split.flatMap(lookupWords) : lookupWords(deferred)), [result.split, deferred])
  const recentCards = useMemo(() => recent.flatMap((r) => lookupCard(r, catalog) ?? []), [recent, catalog])

  // スマホでは、キーボードが出ても候補が見えるように、さがす欄を画面の上へ寄せる
  const boxRef = useRef<HTMLDivElement>(null)
  const bringToTop = () => {
    if (!narrowScreen()) return
    // 動きを減らす設定のときは、すっと動かさずにその場で寄せる
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    requestAnimationFrame(() => boxRef.current?.scrollIntoView?.({ block: 'start', behavior }))
  }
  // 種類のしぼりこみを外すのは、「すべて」を選んだときと、さがす前の画面にもどるとき（言葉を消しただけでは外さない）
  const pickKind = (k: LookupKind | 'all') => set({ kind: k, facet: null })
  const pickFacet = (k: LookupKind, f: string | null) => set({ kind: k, facet: f })
  // 「種類からさがす」は画面の下のほうにあるので、選んだら一覧のはじめ（さがす欄）が見えるところへ動かす
  const browse = (k: LookupKind, f: string, q = query) => {
    set({ query: q, kind: k, facet: f })
    requestAnimationFrame(() => boxRef.current?.scrollIntoView?.({ block: 'start' }))
  }
  const home = () => set({ query: '', kind: 'all', facet: null, sort: 'default' })
  const scopeLabel = scoped ? lookupFacetLabel(kind, facet) : null
  const loadingNote = !storesLoaded && (
    <p className="text-xs text-ink-soft" role="status">
      コンビニ・メーカーの商品を読み込み中…
    </p>
  )

  const facetChips = (k: LookupKind) => {
    const all = lookupFacets(k, { showAlcohol })
    // さがしているとき：候補のある分け方だけを、数つきで。種類の一覧を見ているとき：その種類の分け方をぜんぶ（数は出さない）
    if (searching) return [{ id: null, label: 'すべて', count: kindHits?.length ?? 0 }, ...all.filter((f) => facetCounts.has(f.id)).map((f) => ({ id: f.id, label: f.label, count: facetCounts.get(f.id) }))]
    return lookupFacets(k, { showAlcohol, home: true }).map((f) => ({ id: f.id, label: f.label }))
  }

  const rows = (hits: LookupHit[]) => hits.map((h) => <LookupRow key={h.card.key} card={h.card} catalog={catalog} words={words} onOpen={onOpen} />)

  // 1つの種類の一覧（さがした候補か、種類の一覧）：分け方のしぼりこみ・並べかえ・30件ずつ
  const kindList = active !== 'all' && list && (
    <div className="space-y-2">
      {(!searching || facetCounts.size > 1 || facet !== null) && <FacetChips label={`${LOOKUP_KIND_LABEL[active]}の種類でしぼる`} chips={facetChips(active)} active={facet} onPick={(f) => pickFacet(active, f)} />}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 className={SECTION_TITLE}>
          {LOOKUP_KIND_LABEL[active]}
          {scopeLabel && `：${scopeLabel}`}
          <span className="ml-1.5 text-xs font-normal text-ink-soft tabular-nums">{list.length.toLocaleString()}件</span>
        </h2>
        {list.length > 1 && (
          <label>
            <span className="sr-only">並べかえ</span>
            <select value={sort} onChange={(e) => set({ sort: e.target.value as LookupSort })} className="min-h-11 rounded-full bg-white px-3 text-sm text-ink shadow-sm lg:min-h-9">
              {(Object.keys(LOOKUP_SORT_LABEL) as LookupSort[]).map((s) => (
                <option key={s} value={s}>
                  {LOOKUP_SORT_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {list.length === 0 ? (
        <div className="rounded-2xl bg-white/70 px-4 py-5 text-center text-sm text-ink-soft">
          <p>
            {searching ? `「${deferred.trim()}」は、${scopeLabel ?? LOOKUP_KIND_LABEL[active]}の中には見つかりませんでした。` : `${scopeLabel ?? LOOKUP_KIND_LABEL[active]}は、まだありません。`}
          </p>
          {searching && total > 0 && (
            <button type="button" onClick={() => pickKind('all')} className="mt-2 min-h-11 rounded-full bg-white px-4 text-sm font-bold text-coral-ink shadow-sm">
              しぼりこみを外して見る（{total.toLocaleString()}件）
            </button>
          )}
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-1.5 md:grid-cols-2 lg:grid-cols-3">{rows(list.slice(0, limit))}</ul>
          {list.length > limit && (
            <button type="button" onClick={() => setLimit(limit + PAGE)} className="min-h-11 w-full rounded-full bg-white text-sm font-bold shadow-sm">
              もっと見る（あと {(list.length - limit).toLocaleString()} 件）
            </button>
          )}
        </>
      )}
    </div>
  )

  return (
    <section aria-labelledby="lookup-title" className="space-y-3">
      <h1 id="lookup-title" className="text-xl font-bold">
        食品を調べる
      </h1>
      <div ref={boxRef} className="relative w-full scroll-mt-2 lg:max-w-xl">
        <svg viewBox="0 0 24 24" aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-ink-soft" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => set({ query: e.target.value })}
          onFocus={bringToTop}
          onKeyDown={(e) => {
            // かな漢字変換の確定の Enter は除く
            if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
            // スマホでは、キーボードをとじて候補を見せる。広い画面では、いちばん上の候補をひらく
            if (narrowScreen()) {
              e.currentTarget.blur()
              return
            }
            const first = (list ?? sections[0]?.hits)?.[0]
            if (first && searching && query === deferred) onOpen(first.card.item)
          }}
          placeholder={scopeLabel ? `${scopeLabel}の中でさがす` : '食品名でさがす（例：納豆）'}
          aria-label="食品・料理・市販品の名前でさがして、栄養素を見る"
          enterKeyHint="search"
          className="min-h-12 w-full rounded-full border-2 border-white bg-white pr-4 pl-11 text-base shadow-sm outline-none focus:border-coral"
        />
      </div>

      {!searching && !browsing && (
        // さがす前：押すとすぐ見られる食品と、種類からさがす入口
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">食材・料理・市販品の名前を入れると、カロリーと栄養素がすぐ見られます。「カレー レトルト」のように、空白で区切ってもさがせます。</p>
          {recentCards.length > 0 && (
            <section aria-label="最近見た食品" className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className={SECTION_TITLE}>最近見た食品</h2>
                <button type="button" onClick={onClearRecent} className="min-h-11 px-2 text-xs text-ink-soft underline underline-offset-2 lg:min-h-8">
                  消す
                </button>
              </div>
              <QuickChips cards={recentCards} onOpen={onOpen} />
            </section>
          )}
          {index.staples.length > 0 && (
            <section aria-label="定番の食品" className="space-y-1.5">
              <h2 className={SECTION_TITLE}>
                定番の食品<span className="ml-1.5 text-xs font-normal text-ink-soft">押すと栄養素が見られます</span>
              </h2>
              <QuickChips cards={index.staples} onOpen={onOpen} />
            </section>
          )}
          <Categories showAlcohol={showAlcohol} onPick={(k, f) => browse(k, f.id)} />
        </div>
      )}

      {browsing && (
        <div className="space-y-2.5">
          <button type="button" onClick={home} className="flex min-h-11 items-center gap-1 text-sm font-bold text-coral-ink lg:min-h-8">
            <span aria-hidden>‹</span>種類の一覧にもどる
          </button>
          {kindList}
          {active === 'product' && loadingNote}
        </div>
      )}

      {searching && (
        <div className="space-y-2.5">
          {/* 読み上げには、候補の数だけを伝える */}
          <p className="sr-only" role="status">
            {total === 0 ? (loadFailed ? '読み込めなかったデータがあります' : '見つかりませんでした') : sections.map((s) => `${LOOKUP_KIND_LABEL[s.kind]}${s.hits.length}件`).join('、')}
          </p>
          {total === 0 ? (
            <>
              <div className="rounded-2xl bg-white/70 px-4 py-5 text-center text-sm text-ink-soft">
                {loadFailed ? (
                  <p>「{deferred.trim()}」は、読み込めたデータの中にはありませんでした。</p>
                ) : (
                  <p>「{deferred.trim()}」は見つかりませんでした。ひらがなや別の呼び名、短い言葉でもためしてみてください。</p>
                )}
                {loadingNote && <div className="mt-1">{loadingNote}</div>}
              </div>
              <Categories
                showAlcohol={showAlcohol}
                onPick={(k, f) => browse(k, f.id, '')}
              />
            </>
          ) : (
            <>
              {result.split && (
                <p className="rounded-2xl bg-white/70 px-3 py-2 text-xs text-ink-soft">
                  「{deferred.trim()}」そのままでは見つからなかったので、「{result.split[0]}」と「{result.split[1]}」の両方をふくむものを出しています。
                </p>
              )}
              {sections.length > 1 && (
                // 料理を選ぶ画面の種類の切り替えと同じ形（スマホは1行に収める）
                <div className="flex gap-0.5 rounded-full bg-white p-1 shadow-sm lg:w-fit" role="group" aria-label="種類でしぼる">
                  {[{ kind: 'all' as const, label: 'すべて', count: total }, ...sections.map((s) => ({ kind: s.kind, label: LOOKUP_KIND_LABEL[s.kind], count: s.hits.length }))].map((c) => (
                    <button
                      key={c.kind}
                      type="button"
                      aria-pressed={active === c.kind}
                      onClick={() => pickKind(c.kind)}
                      className={`min-h-11 flex-1 rounded-full px-1 text-xs leading-tight whitespace-nowrap lg:min-h-9 lg:flex-none lg:px-4 ${active === c.kind ? 'bg-coral font-bold text-ink-strong' : 'text-ink-soft'}`}
                    >
                      {c.label}
                      <span className="block text-2xs leading-tight tabular-nums lg:ml-1.5 lg:inline">{c.count > 999 ? '999+' : c.count}件</span>
                    </button>
                  ))}
                </div>
              )}
              {kindList || (
                // 種類ごとに上から数件ずつ。広い画面は横に並べる
                <div className="space-y-3 lg:grid lg:auto-cols-fr lg:grid-flow-col lg:items-start lg:gap-4 lg:space-y-0">
                  {sections.map((s) => (
                    <div key={s.kind} className="min-w-0 space-y-1.5">
                      <h2 className={SECTION_TITLE}>
                        {LOOKUP_KIND_LABEL[s.kind]}
                        <span className="ml-1.5 text-xs font-normal text-ink-soft tabular-nums">{s.hits.length.toLocaleString()}件</span>
                      </h2>
                      <ul className="grid grid-cols-1 gap-1.5">{rows(s.hits.slice(0, preview))}</ul>
                      {s.hits.length > preview && (
                        <button type="button" onClick={() => pickKind(s.kind)} className="min-h-11 w-full rounded-full text-sm font-bold text-coral-ink underline decoration-coral/60 underline-offset-2 hover:bg-white lg:min-h-9">
                          {LOOKUP_KIND_LABEL[s.kind]}をすべて見る（{s.hits.length.toLocaleString()}件）
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
