import { useState } from 'react'
import {
  hasAnyNutrient,
  IU,
  SUPPLEMENT_CATEGORY,
  SUPPLEMENT_KEYS,
  SUPPLEMENT_MAIN_KEYS,
  SUPPLEMENT_OTHER_KEYS,
  supplementNutrients,
  vitaminAFromCarotene,
} from '../domain/supplement'
import type { NutrientKey, Product } from '../domain/types'
import { nutrientInfo } from './labels'
import type { MyProductInput } from '../store/useAppStore'

const num = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) || Number(s) < 0 ? null : Number(s))
// 0 は「入っていない」なので空欄で見せる
const str = (v: number | null | undefined) => (v ? String(v) : '')

// サプリメントの登録・編集。ラベルの「1日あたり（1回分）」の値を入れてもらう
export function SupplementForm({
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  initial?: Product
  onSave: (p: MyProductInput) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [brand, setBrand] = useState(initial?.brand ?? '')
  const [servingLabel, setServingLabel] = useState(initial?.servingLabel ?? '')
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(SUPPLEMENT_KEYS.map((k) => [k, str(initial?.nutrients[k])])))
  const [more, setMore] = useState(() => SUPPLEMENT_OTHER_KEYS.some((k) => str(initial?.nutrients[k]) !== ''))
  const [carotene, setCarotene] = useState(() => (initial ? vitaminAFromCarotene(initial.nutrients) : false))

  const nutrients = supplementNutrients(Object.fromEntries(SUPPLEMENT_KEYS.map((k) => [k, num(values[k])])) as Record<NutrientKey, number | null>, {
    vitaminAFromCarotene: carotene,
  })
  const valid = name.trim() !== '' && hasAnyNutrient(nutrients)
  const save = () =>
    onSave({ name: name.trim(), brand: brand.trim(), basis: 'serving', servingLabel: servingLabel.trim() || undefined, nutrients, category: SUPPLEMENT_CATEGORY })
  const field = 'min-h-11 w-full rounded-2xl border-2 border-white bg-white px-4 text-base outline-none focus:border-coral'
  const groups = [
    { group: 'ビタミン・ミネラルなど', keys: SUPPLEMENT_MAIN_KEYS },
    ...(more ? [{ group: 'そのほか', keys: SUPPLEMENT_OTHER_KEYS }] : []),
  ]

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-ink/30 md:items-center md:justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={initial ? 'サプリを編集' : 'サプリを登録'}
        className="flex max-h-[92vh] w-full flex-col rounded-t-[var(--radius-card)] bg-cream p-4 shadow-xl md:max-w-lg md:rounded-[var(--radius-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex shrink-0 items-center justify-between">
          <h2 className="text-lg font-bold">💊 {initial ? 'サプリを編集' : 'サプリを登録'}</h2>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full hover:bg-white" aria-label="閉じる">
            ×
          </button>
        </header>
        <div className="-mx-1 flex-1 space-y-4 overflow-y-auto px-1 pb-1">
          <p className="text-xs text-ink-soft">
            パッケージの「1日あたり」や「1回分」の量を見て、入っている成分だけ入れてください。空欄は「入っていない」として計算します。登録したものはこのブラウザだけに保存されます。
          </p>
          <label className="block text-sm">
            商品名
            <input value={name} onChange={(e) => setName(e.target.value)} className={`${field} mt-1`} placeholder="例：マルチビタミン" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              メーカー<span className="text-ink-soft">（任意）</span>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} className={`${field} mt-1`} />
            </label>
            <label className="block text-sm">
              1回分の量<span className="text-ink-soft">（任意）</span>
              <input value={servingLabel} onChange={(e) => setServingLabel(e.target.value)} className={`${field} mt-1`} placeholder="例：2粒" />
            </label>
          </div>
          {groups.map((g) => (
            <fieldset key={g.group}>
              <legend className="mb-1 text-sm font-bold">{g.group}</legend>
              <div className="grid grid-cols-2 gap-3">
                {g.keys.map((k) => (
                  <label key={k} className="block text-sm">
                    {k === 'n3Fat' ? 'n-3系脂肪酸（DHA・EPAなど）' : nutrientInfo(k).label}
                    <span className="mt-1 flex items-center gap-2">
                      <input
                        inputMode="decimal"
                        value={values[k] ?? ''}
                        onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
                        className={field}
                        aria-invalid={values[k] !== '' && num(values[k]) === null}
                      />
                      <span className="w-8 shrink-0 text-xs text-ink-soft">{nutrientInfo(k).unit}</span>
                    </span>
                  </label>
                ))}
              </div>
              {g.keys.includes('vitaminA') && num(values.vitaminA) !== null && (
                <label className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
                  <input type="checkbox" checked={carotene} onChange={(e) => setCarotene(e.target.checked)} className="h-5 w-5 accent-coral" />
                  ビタミンAは「β-カロテン」由来と書いてある（とりすぎの判定に入れません）
                </label>
              )}
            </fieldset>
          ))}
          {!more && (
            <button type="button" onClick={() => setMore(true)} className="min-h-10 w-full rounded-full bg-white px-4 text-sm font-bold text-coral">
              ＋ DHA・EPAやカロリーなども入れる
            </button>
          )}
          <p className="text-xs text-ink-soft">
            IU（国際単位）で書かれているときは、ビタミンAは IU × {IU.vitaminA}、ビタミンDは IU × {IU.vitaminD} で µg になります。
            DHA・EPAが mg のときは 1000 で割って g にしてください。
          </p>
        </div>
        <footer className="mt-3 flex shrink-0 gap-2">
          {onDelete && (
            <button type="button" onClick={onDelete} className="min-h-11 rounded-full bg-white px-4 text-sm text-alert">
              削除
            </button>
          )}
          <button type="button" disabled={!valid} onClick={save} className="min-h-11 flex-1 rounded-full bg-coral text-sm font-bold text-white disabled:opacity-50">
            {valid ? (initial ? '保存する' : '登録する') : '商品名と、成分を1つ以上入れてください'}
          </button>
        </footer>
      </div>
    </div>
  )
}
