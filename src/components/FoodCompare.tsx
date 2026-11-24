import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { COMPARE_BASIS_LABEL, COMPARE_MAX, compareNotes, compareTable, nearFoods, type CompareBasis, type CompareCell, type CompareRow } from '../domain/foodCompare'
import type { Catalog } from '../domain/nutrition'
import { FOOD_GROUP_LABEL } from '../domain/ranking'
import type { Food, NutrientKey } from '../domain/types'
import { compareAppPath, FOOD_PAGE_IDS } from '../routes'
import { foodImage } from './illustration'
import { nutrientInfo } from './labels'
import { foodLookupGroups, searchFoods } from './lookupCards'
import { useDialog } from './useDialog'

// 「食品を調べる」の「食材をくらべる」窓。選んだ食材（5つまで）の成分を、同じ量（100g・1回の量）で並べた表にする。
// ・近い食材（鹿肉なら牛肉・豚肉・鶏肉）を、押すだけで足せる
// ・食材の名前でさがして足せる（漢字・ひらがな・カタカナのどれでも）
// ひらいているあいだ、アドレスを /foods/#compare=<食品番号>,… にする（貼ると、同じ食材をくらべた窓がひらく）

// 「食材を足す」で、1回に出す候補の数
const SEARCH_MAX = 8

// 表の、食材の名前の行。下へ送っても、窓の上に止まる
const HEAD_CELL = 'sticky top-0 z-10 border-b border-ink/10 bg-white pt-1 pb-1.5 font-normal'

const CHIP = 'flex min-h-11 max-w-full items-center gap-1 rounded-full bg-white pr-3 pl-2 text-left text-sm shadow-sm transition hover:bg-coral/10 lg:min-h-9'

const formatAmount = (row: { key: NutrientKey }, amount: number) => {
  const { digits } = nutrientInfo(row.key)
  return amount.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

// ひらいているあいだのアドレス（閉じたら元にもどす）。くらべる食材がないときは、そのまま
function useCompareAddress(ids: string[]) {
  const key = ids.join(',')
  useEffect(() => {
    if (!key) return
    const before = window.location.pathname + window.location.search + window.location.hash
    const url = compareAppPath(key.split(','))
    try {
      window.history.replaceState(window.history.state, '', url)
    } catch {
      // 埋め込み表示などでアドレスを書きかえられないときは、そのまま
      return
    }
    return () => {
      // ボタンで閉じたとき・食材を入れかえたときは、まだ窓の履歴にいるので、アドレスを元にもどす。「戻る」で閉じたときは、もう元のアドレス
      if (window.location.pathname + window.location.hash === url) window.history.replaceState(window.history.state, '', before)
    }
  }, [key])
}

function Cell({ row, cell }: { row: CompareRow; cell: CompareCell }) {
  if (cell.amount === null) return <td className="px-1 py-1.5 text-center align-top text-2xs text-ink-soft md:px-1.5 md:text-xs">値なし</td>
  // いちばん多いところに色をつける。とりすぎに気をつけたい成分（食塩など）は、注意の色
  const bar = row.caution ? 'bg-caution' : 'bg-ok'
  return (
    <td className={`px-1 py-1.5 text-right align-top tabular-nums md:px-1.5 ${cell.top ? (row.caution ? 'bg-caution/20' : 'bg-ok/15') : ''}`}>
      <span className={`block text-sm leading-snug ${cell.top ? 'font-bold text-ink-strong' : ''}`}>
        {formatAmount(row, cell.amount)}
        {cell.top && <span className="sr-only">（いちばん多い）</span>}
      </span>
      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-ink/10" aria-hidden>
        <span className={`block h-full rounded-full ${bar}`} style={{ width: `${Math.round(cell.share * 100)}%` }} />
      </span>
    </td>
  )
}

function FoodChips({ label, foods, disabled, onAdd }: { label: string; foods: Food[]; disabled: boolean; onAdd: (id: string) => void }) {
  if (foods.length === 0) return null
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-bold text-ink-soft">{label}</h4>
      <ul className="flex flex-wrap gap-1.5">
        {foods.map((f) => (
          <li key={f.id} className="max-w-full">
            <button type="button" disabled={disabled} onClick={() => onAdd(f.id)} className={`${CHIP} disabled:opacity-50`}>
              <span aria-hidden className="font-bold text-coral-ink">
                ＋
              </span>
              <span className="truncate">{f.displayName}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function FoodCompare({
  ids,
  catalog,
  onChange,
  onOpenFood,
  onClose,
}: {
  // くらべる食材（食品番号）。並べる順。空なら、食材を選ぶところから
  ids: string[]
  catalog: Catalog
  onChange: (ids: string[]) => void
  // 食材の名前を押したとき：その食材の栄養素の一覧をひらく
  onOpenFood: (id: string) => void
  onClose: () => void
}) {
  const dialogRef = useDialog(onClose)
  const [basis, setBasis] = useState<CompareBasis>('per100g')
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const foods = useMemo(() => ids.flatMap((id) => catalog.foods.get(id) ?? []), [ids, catalog])
  const shownIds = useMemo(() => foods.map((f) => f.id), [foods])
  useCompareAddress(shownIds)
  const table = useMemo(() => compareTable(foods, basis), [foods, basis])
  const notes = useMemo(() => compareNotes(table), [table])
  const full = foods.length >= COMPARE_MAX
  const add = (id: string) => {
    if (full || shownIds.includes(id)) return
    onChange([...shownIds, id])
    setQuery('')
  }
  const remove = (id: string) => onChange(shownIds.filter((x) => x !== id))

  // 近い食材：1つめの食材をもとにさがす（もう並べてあるものは出さない）
  const near = useMemo(() => (foods[0] ? nearFoods(foods[0], catalog.foods.values()) : null), [foods, catalog])
  const notShown = (f: Food) => !shownIds.includes(f.id)
  // まだ1つも選んでいないときは、定番の食材から
  const staples = useMemo(() => FOOD_PAGE_IDS.flatMap((id) => catalog.foods.get(id) ?? []), [catalog])

  // 名前でさがして足す。文字を打つたびに作り直さないよう、候補のもとは1回だけ作る
  const groups = useMemo(() => foodLookupGroups(catalog), [catalog])
  const found = useMemo(() => searchFoods(groups, deferred).filter((c) => !shownIds.includes(c.item.refId)), [groups, deferred, shownIds])
  const searching = deferred.trim() !== ''

  const first = foods[0]
  const second = foods[1]

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-ink/30 md:items-center md:justify-center" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="食材をくらべる"
        className="flex max-h-[92dvh] w-full flex-col rounded-t-[var(--radius-card)] bg-cream shadow-xl outline-none md:max-h-[min(92dvh,860px)] md:max-w-4xl md:rounded-[var(--radius-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center gap-2.5 px-4 pt-3 pb-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg leading-snug font-bold">食材をくらべる</h2>
            <p className="text-xs text-ink-soft">成分を、同じ量で並べます（{COMPARE_MAX}つまで）</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-white" aria-label="閉じる">
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
          {foods.length === 0 ? (
            <p className="rounded-2xl bg-white p-3 text-sm shadow-sm">くらべたい食材を、下から選んでください。1つ選ぶと、近い食材（鹿肉なら牛肉・豚肉・鶏肉など）も出ます。</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-0.5 rounded-full bg-white p-1 shadow-sm" role="group" aria-label="くらべる量">
                  {(Object.keys(COMPARE_BASIS_LABEL) as CompareBasis[]).map((b) => (
                    <button
                      key={b}
                      type="button"
                      aria-pressed={basis === b}
                      onClick={() => setBasis(b)}
                      className={`min-h-11 rounded-full px-4 text-sm whitespace-nowrap lg:min-h-9 ${basis === b ? 'bg-coral font-bold text-ink-strong' : 'text-ink-soft'}`}
                    >
                      {COMPARE_BASIS_LABEL[b]}
                    </button>
                  ))}
                </div>
                {foods.length === 1 && <p className="text-xs text-ink-soft">もう1つ選ぶと、並べてくらべられます。</p>}
              </div>

              {/* 1つめを2つめとくらべて、ちがいの大きいところ */}
              {first && second && notes.length > 0 && (
                <div className="rounded-2xl bg-white p-3 text-sm shadow-sm">
                  <p className="text-xs text-ink-soft">
                    <strong className="text-ink">{first.displayName}</strong> は、{second.displayName} とくらべて
                  </p>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {notes.map((n) => (
                      <li key={n.key} className={`rounded-full px-2.5 py-1 text-xs ${n.more ? 'bg-ok/20' : 'bg-ink/5'}`}>
                        <strong>
                          {n.label}が{n.more ? '多い' : '少ない'}
                        </strong>
                        <span className="ml-1 text-ink-soft tabular-nums">
                          {formatAmount(n, n.self)}
                          {n.unit}（{formatAmount(n, n.other)}
                          {n.unit}）
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 列の幅は、どの食材も同じ。横には送らない（スマホでも、成分の名前と食材4つがそのまま入る。5つめを足すと、列がせまくなる）。
                  下へ送っても、食材の名前の行は上に止まる */}
              <div className="-mx-3 overflow-clip rounded-2xl bg-white shadow-sm md:mx-0">
                <table className="w-full table-fixed border-separate border-spacing-0 text-left">
                  <caption className="sr-only">
                    {foods.map((f) => f.displayName).join('・')}の成分（{COMPARE_BASIS_LABEL[basis]}）
                  </caption>
                  <thead>
                    <tr>
                      <td className="w-21 md:w-32" />
                      {table.columns.map(({ food }) => (
                        <td key={food.id} className="px-0.5 pt-1.5 md:px-1">
                          <span className="flex items-center justify-between md:justify-center md:gap-1">
                            <img src={foodImage(food)} alt="" className="h-7 w-7 min-w-0 shrink object-contain md:h-9 md:w-9" />
                            <button
                              type="button"
                              onClick={() => remove(food.id)}
                              aria-label={`${food.displayName}を外す`}
                              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-cream"
                            >
                              ×
                            </button>
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="col" className={`${HEAD_CELL} px-1.5 align-bottom text-2xs text-ink-soft md:px-2`}>
                        成分
                      </th>
                      {table.columns.map(({ food, amountText }) => (
                        <th key={food.id} scope="col" className={`${HEAD_CELL} px-0.5 align-top md:px-1`}>
                          <span className="flex flex-col items-center text-center">
                            <button type="button" aria-haspopup="dialog" onClick={() => onOpenFood(food.id)} className="line-clamp-4 text-2xs leading-tight font-bold underline decoration-ink/20 underline-offset-2 md:line-clamp-3">
                              {food.displayName}
                            </button>
                            <span className="mt-0.5 text-2xs leading-tight text-ink-soft">{amountText}</span>
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  {table.groups.map((g) => (
                    <tbody key={g.label}>
                      <tr>
                        <th scope="colgroup" colSpan={table.columns.length + 1} className="bg-cream/70 px-1.5 py-1 text-2xs font-bold text-ink-soft md:px-2">
                          {g.label}
                        </th>
                      </tr>
                      {g.rows.map((row) => (
                        <tr key={row.key}>
                          <th scope="row" className="border-t border-ink/5 px-1.5 py-1.5 align-top text-2xs leading-snug font-normal md:px-2 md:text-xs">
                            {row.label}
                            <span className="block text-2xs text-ink-soft">{row.unit}</span>
                          </th>
                          {row.cells.map((cell, i) => (
                            <Cell key={table.columns[i].food.id} row={row} cell={cell} />
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  ))}
                </table>
              </div>
              <p className="text-xs text-ink-soft">
                色のついたところは、並べた中でいちばん多い値です。棒は、いちばん多い値を100%としたときの長さ。「値なし」は、成分表で測られていない成分です（0 とはかぎりません）。食材の名前を押すと、その食材だけの栄養素の一覧がひらきます。
              </p>
            </>
          )}

          {/* 食材を足す：近い食材を押すか、名前でさがす */}
          <section aria-label="食材を足す" className="space-y-2.5 rounded-2xl bg-white/70 p-3">
            <h3 className="text-sm font-bold">
              {foods.length === 0 ? '食材を選ぶ' : '食材を足す'}
              {full && <span className="ml-2 text-xs font-normal text-ink-soft">{COMPARE_MAX}つまでです。どれかを外すと足せます。</span>}
            </h3>
            {!full && (
              <>
                <div className="relative">
                  <svg viewBox="0 0 24 24" aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-ink-soft" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <circle cx="11" cy="11" r="6.5" />
                    <path d="M16 16l4.5 4.5" />
                  </svg>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="食材名でさがす（例：牛肉）"
                    aria-label="くらべる食材を、名前でさがして足す"
                    enterKeyHint="search"
                    className="min-h-12 w-full rounded-full border-2 border-white bg-white pr-4 pl-11 text-base shadow-sm outline-none focus:border-coral"
                  />
                </div>
                {searching &&
                  (found.length === 0 ? (
                    <p className="text-sm text-ink-soft" role="status">
                      「{deferred.trim()}」の食材は見つかりませんでした。ひらがなや別の呼び名でもためしてみてください。
                    </p>
                  ) : (
                    <ul className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
                      {found.slice(0, SEARCH_MAX).map((c) => {
                        const f = catalog.foods.get(c.item.refId)
                        return (
                          <li key={c.key}>
                            <button type="button" onClick={() => add(c.item.refId)} className="flex min-h-12 w-full items-center gap-2 rounded-2xl bg-white px-2.5 py-1.5 text-left shadow-sm transition hover:bg-coral/5">
                              {c.image && <img src={c.image} alt="" className="h-8 w-8 shrink-0 object-contain" loading="lazy" />}
                              <span className="min-w-0 flex-1">
                                <span className="line-clamp-2 text-sm leading-snug font-bold">{c.name}</span>
                                <span className="block truncate text-xs text-ink-soft tabular-nums">
                                  {f && FOOD_GROUP_LABEL[f.group]}
                                  {f && f.per100g.energyKcal !== null && `・100gで ${Math.round(f.per100g.energyKcal)}kcal`}
                                </span>
                              </span>
                              <span aria-hidden className="shrink-0 font-bold text-coral-ink">
                                ＋
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  ))}
                {!searching && near && (
                  <>
                    <FoodChips label={`${foods[0].displayName} に近い食材`} foods={near.others.filter(notShown)} disabled={full} onAdd={add} />
                    <FoodChips label="同じ食材の、部位や状態のちがうもの" foods={near.same.filter(notShown)} disabled={full} onAdd={add} />
                  </>
                )}
                {!searching && !near && <FoodChips label="定番の食材から" foods={staples} disabled={full} onAdd={add} />}
              </>
            )}
          </section>

          <p className="text-xs text-ink-soft">値は文部科学省「日本食品標準成分表（八訂）増補2023年」の食材の値です（料理や市販品は、ここではくらべられません）。</p>
        </div>
      </div>
    </div>
  )
}
