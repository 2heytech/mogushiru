import { useState } from 'react'
import { detailGroups, detailHighlights, type DetailRow, type MissingMode } from '../domain/foodDetail'
import { itemTotals, pfcRatio, type Catalog } from '../domain/nutrition'
import { FOOD_GROUP_LABEL } from '../domain/ranking'
import { servingFor } from '../domain/serving'
import type { Targets } from '../domain/targets'
import { SLOTS, type MenuItem, type Slot } from '../domain/types'
import { MY_PRODUCT_PREFIX } from '../store/useAppStore'
import type { LookupItem } from './lookupCards'
import { menuItemImage } from './illustration'
import { itemName } from './itemName'
import { DEFAULT_PROFILE_LABEL, DISH_CATEGORY_LABEL, nutrientInfo, PFC_COLOR, PFC_LABEL, SLOT_LABEL } from './labels'
import { StackedBar } from './PfcCompare'
import { PortionEditor } from './PortionEditor'
import { useDialog } from './useDialog'

// 「食品を調べる」で選んだ食品（食材・料理・市販品）の栄養素の一覧。
// 量を変えると、その量での値にすぐ変わる。見ている量のまま、1日の食事に足せる

type Preset = { label: string; portion: number }
type Meta = { kind: string; sub: string; official?: string; missing: MissingMode; presets: Preset[] }

function metaOf(item: LookupItem, catalog: Catalog): Meta {
  if (item.kind === 'food') {
    const f = catalog.foods.get(item.refId)!
    const serving = servingFor(f)
    const official = f.name.replace(/　/g, ' ')
    const same = serving.label === `${serving.grams}g`
    return {
      kind: '食材',
      sub: FOOD_GROUP_LABEL[f.group] ?? '',
      official: official === f.displayName ? undefined : official,
      missing: 'blank',
      presets: [{ label: same ? serving.label : `${serving.label}（${serving.grams}g）`, portion: serving.grams }, ...(serving.grams === 100 ? [] : [{ label: '100g', portion: 100 }])],
    }
  }
  if (item.kind === 'dish') {
    const d = catalog.dishes.get(item.refId)!
    return { kind: '料理', sub: [DISH_CATEGORY_LABEL[d.category], d.source?.region].filter(Boolean).join('・'), missing: 'sum', presets: [] }
  }
  if (item.kind === 'myDish') return { kind: 'お気に入り', sub: 'アレンジして保存した料理', missing: 'sum', presets: [] }
  const p = catalog.products.get(item.refId)!
  const unit = p.basis === '100ml' ? 'mL' : 'g'
  return {
    kind: '市販品',
    sub: p.brand,
    missing: 'hide',
    presets: p.basis !== 'serving' && p.servingGrams && p.servingGrams !== 100 ? [{ label: `1食分（${p.servingGrams}${unit}）`, portion: p.servingGrams }, { label: `100${unit}`, portion: 100 }] : [],
  }
}

const formatAmount = (r: DetailRow) => {
  const { digits } = nutrientInfo(r.key)
  return r.amount!.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

// 割合の表示。10% 未満は小数1けたまで
const formatPercent = (p: number) => (p >= 10 ? Math.round(p).toLocaleString() : String(Number(p.toFixed(1))))

const refWord = (r: DetailRow) => (r.kind === 'max' ? '上限' : '目安')

function NutrientRow({ r }: { r: DetailRow }) {
  const over = r.kind === 'max' && r.percent !== null && r.percent >= 100
  return (
    <li className="py-1">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-sm leading-snug">
          {r.label}
          {r.partial && (
            <span className="text-ink-soft" title="材料の一部に値がないため、分かる分だけを足した量です">
              ※
            </span>
          )}
        </span>
        {r.amount === null ? (
          <span className="shrink-0 text-xs text-ink-soft">値なし</span>
        ) : (
          <span className="shrink-0 whitespace-nowrap tabular-nums">
            <strong className="text-sm">{formatAmount(r)}</strong>
            <span className="text-xs text-ink-soft"> {r.unit}</span>
          </span>
        )}
      </span>
      {r.percent !== null && (
        <span className="mt-0.5 flex items-center gap-2">
          <span className="block h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10" aria-hidden>
            <span className={`block h-full rounded-full ${over ? 'bg-alert' : r.kind === 'max' ? 'bg-caution' : 'bg-ok'}`} style={{ width: `${Math.min(r.percent, 100)}%` }} />
          </span>
          <span className="w-24 shrink-0 text-right text-2xs leading-tight whitespace-nowrap text-ink-soft tabular-nums">
            {refWord(r)}の {formatPercent(r.percent)}%
          </span>
        </span>
      )}
    </li>
  )
}

// "2026-10-11" → "2026年10月11日"
const formatFetchedAt = (d: string) => {
  const [y, m, day] = d.split('-').map(Number)
  return y && m && day ? `${y}年${m}月${day}日` : d
}

export function FoodDetailDialog({
  item: start,
  catalog,
  targets,
  profileSet,
  onAdd,
  onClose,
}: {
  item: LookupItem
  catalog: Catalog
  targets: Targets
  // 栄養の目安（プロフィール）を入れてあるか。まだなら、割合が仮の目安に対するものだと添える
  profileSet: boolean
  // 見ている量のまま、1日の食事（朝・昼・晩・その他）に足す
  onAdd: (slot: Slot, item: LookupItem) => void
  onClose: () => void
}) {
  const dialogRef = useDialog(onClose)
  const [portion, setPortion] = useState(start.portion)
  // 量のボタンで変えたときは、数字の入力欄を作り直して同じ量にそろえる
  const [editorKey, setEditorKey] = useState(0)
  const [added, setAdded] = useState<Slot | null>(null)
  const item: MenuItem = { uid: '', ...start, portion }
  const meta = metaOf(start, catalog)
  const name = itemName(item, catalog)
  const image = menuItemImage(item, catalog)
  const totals = itemTotals(item, catalog)
  const v = totals.values
  const groups = detailGroups(totals, targets, meta.missing)
  const rows = groups.flatMap((g) => g.rows)
  const { rich, caution } = detailHighlights(groups)
  const energy = rows.find((r) => r.key === 'energyKcal')
  const ratio = pfcRatio(v)
  const product = item.kind === 'product' ? catalog.products.get(item.refId) : undefined
  const dish = item.kind === 'dish' ? catalog.dishes.get(item.refId) : undefined
  const pfc = [
    { k: 'p', key: 'protein' },
    { k: 'f', key: 'fat' },
    { k: 'c', key: 'carb' },
  ] as const
  const change = (p: number) => {
    setPortion(p)
    setAdded(null)
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-ink/30 md:items-center md:justify-center" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`${name}の栄養素`}
        className="flex max-h-[92dvh] w-full flex-col rounded-t-[var(--radius-card)] bg-cream shadow-xl outline-none md:max-h-[min(92dvh,820px)] md:max-w-3xl md:rounded-[var(--radius-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center gap-2.5 px-4 pt-3 pb-2">
          {image && <img src={image} alt="" className="h-12 w-12 shrink-0 object-contain" />}
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-lg leading-snug font-bold">{name}</h2>
            <p className="truncate text-xs text-ink-soft">{[meta.kind, meta.sub].filter(Boolean).join('・')}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-white" aria-label="閉じる">
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className={meta.presets.length > 0 || item.kind === 'food' || (product && product.basis !== 'serving') ? '' : 'w-full'}>
              <PortionEditor key={editorKey} item={item} catalog={catalog} onPortion={change} />
            </div>
            {meta.presets.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {meta.presets.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    aria-pressed={portion === p.portion}
                    onClick={() => {
                      change(p.portion)
                      setEditorKey((k) => k + 1)
                    }}
                    className={`min-h-11 rounded-full px-3.5 text-sm whitespace-nowrap lg:min-h-9 ${portion === p.portion ? 'bg-coral font-bold text-ink-strong' : 'bg-white shadow-sm'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* まず知りたい数字：カロリーと、たんぱく質・脂質・炭水化物 */}
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <strong className="text-3xl leading-tight tabular-nums">{Math.round(v.energyKcal).toLocaleString()}</strong>
              <span className="text-sm font-bold">kcal</span>
              {energy?.percent != null && (
                <span className="ml-auto text-xs text-ink-soft tabular-nums">
                  1日の目安の {formatPercent(energy.percent)}%
                </span>
              )}
            </p>
            {ratio && (
              <div className="mt-2" role="img" aria-label={`カロリーのうちわけ ${pfc.map(({ k }) => `${PFC_LABEL[k]}${Math.round(ratio[k])}%`).join('・')}`}>
                <StackedBar ratio={ratio} />
              </div>
            )}
            <ul className="mt-2 grid grid-cols-3 gap-1.5 text-center">
              {pfc.map(({ k, key }) => (
                <li key={k} className="rounded-xl px-1 py-1.5" style={{ background: `color-mix(in srgb, ${PFC_COLOR[k]} 22%, white)` }}>
                  <span className="block text-2xs leading-tight">{PFC_LABEL[k]}</span>
                  {totals.missing.has(key) && meta.missing !== 'sum' ? (
                    <span className="text-xs text-ink-soft">値なし</span>
                  ) : (
                    <span className="tabular-nums">
                      <strong className="text-lg leading-tight">{v[key].toFixed(1)}</strong>
                      <span className="text-xs"> g</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {/* この量で、1日の目安・上限に対して多いもの */}
            {rich.length > 0 && (
              <div className="mt-2.5 text-xs">
                <p className="font-bold text-ok-ink">この量で多くとれる</p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {rich.map((r) => (
                    <li key={r.key} className="rounded-full bg-ok/20 px-2 py-0.5 whitespace-nowrap">
                      {r.label} <span className="text-ink-soft tabular-nums">目安の{formatPercent(r.percent!)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {caution.length > 0 && (
              <div className="mt-2.5 text-xs">
                <p className="font-bold text-alert-ink">とりすぎに気をつけたい</p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {caution.map((r) => (
                    <li key={r.key} className="rounded-full bg-caution/25 px-2 py-0.5 whitespace-nowrap">
                      {r.label} <span className="text-ink-soft tabular-nums">上限の{formatPercent(r.percent!)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="md:columns-2 md:gap-3">
            {groups.map((g) => (
              <section key={g.label} className="mb-3 break-inside-avoid rounded-2xl bg-white px-3 py-2 shadow-sm">
                <h3 className="text-xs font-bold text-ink-soft">{g.label}</h3>
                <ul className="divide-y divide-ink/5">
                  {g.rows.map((r) => (
                    <NutrientRow key={r.key} r={r} />
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="space-y-1 text-xs text-ink-soft">
            <p>
              「目安の◯%」「上限の◯%」は、あなたの1日の目安・上限に対する割合です。
              {!profileSet && `いまは仮の目安（${DEFAULT_PROFILE_LABEL}）で計算しています。右上の「栄養の目安を設定」で変えられます。`}
            </p>
            {rows.some((r) => r.partial) && <p>※ 材料の一部に値がないため、分かる分だけを足した量です。</p>}
            {rows.some((r) => r.amount === null) && <p>「値なし」は、成分表で測られていない成分です（0 とはかぎりません）。</p>}
            {item.kind === 'food' && (
              <p>
                値は文部科学省「日本食品標準成分表（八訂）増補2023年」をもとに計算しています。
                {meta.official && <>成分表の名前：{meta.official}</>}
              </p>
            )}
            {(item.kind === 'dish' || item.kind === 'myDish') && (
              <p>
                材料の成分（日本食品標準成分表）から計算した値です。
                {dish?.source && (
                  <>
                    レシピのもと：
                    <a href={dish.source.url} target="_blank" rel="noreferrer" className="underline">
                      {dish.source.label}
                    </a>
                  </>
                )}
              </p>
            )}
            {product && (
              <p>
                商品の栄養成分表示の値です。表示にない成分は出していません。
                {product.source.url ? (
                  <>
                    出典：
                    <a href={product.source.url} target="_blank" rel="noreferrer" className="underline">
                      {product.source.name}の商品ページ
                    </a>
                    （{formatFetchedAt(product.source.fetchedAt)}時点）。地域や時期で中身が変わることがあります。
                  </>
                ) : product.jan.startsWith(MY_PRODUCT_PREFIX) ? (
                  '自分で登録した商品です。'
                ) : (
                  `出典：${product.source.name}`
                )}
              </p>
            )}
            {product?.source.alcoholEstimated && (
              <p>
                {product.source.alcoholEstimated === 'name'
                  ? 'アルコール量は、商品名の度数から計算しました。'
                  : 'アルコール量は表示にないため、エネルギーからたんぱく質・脂質・炭水化物の分を引いて推定しました（目安）。'}
              </p>
            )}
          </div>
        </div>

        {/* 見ている量のまま、1日の食事に足す */}
        <footer className="flex shrink-0 items-center gap-2 border-t border-ink/10 px-4 py-2.5">
          <p className="w-[5.5em] shrink-0 text-xs leading-snug font-bold sm:w-auto" aria-live="polite">
            {added ? (
              // スマホは2行に収まるよう「◯に追加」まで出す（読み上げは「追加しました」まで）
              <span className="text-ok-ink">
                ✓ {SLOT_LABEL[added]}に追加<span className="sr-only sm:not-sr-only">しました</span>
              </span>
            ) : (
              '1日の食事に追加'
            )}
          </p>
          <div className="flex min-w-0 flex-1 gap-1.5 sm:justify-end">
            {SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                aria-label={`${SLOT_LABEL[slot]}に追加`}
                onClick={() => {
                  onAdd(slot, { ...start, portion })
                  setAdded(slot)
                }}
                className="min-h-11 flex-1 rounded-full border border-coral bg-white px-1 text-sm font-bold whitespace-nowrap text-coral-ink shadow-sm transition hover:bg-coral/10 sm:flex-none sm:px-5"
              >
                {SLOT_LABEL[slot]}
              </button>
            ))}
          </div>
        </footer>
      </div>
    </div>
  )
}
