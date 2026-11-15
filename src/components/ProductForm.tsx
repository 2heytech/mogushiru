import { useState } from 'react'
import { NUTRIENT_KEYS, type Nutrients, type Product } from '../domain/types'
import type { MyProductInput } from '../store/useAppStore'
import { useDialog } from './useDialog'

type Basis = Product['basis']

const BASIS: { id: Basis; label: string }[] = [
  { id: 'serving', label: '1食（1個・1袋）あたり' },
  { id: '100g', label: '100gあたり' },
  { id: '100ml', label: '100mLあたり' },
]

// パッケージの栄養成分表示にある項目。食塩相当量まで入れてもらい、ほかは任意
const FIELDS: { key: 'energyKcal' | 'protein' | 'fat' | 'carb' | 'salt' | 'fiber' | 'alcohol'; label: string; unit: string; required: boolean }[] = [
  { key: 'energyKcal', label: 'エネルギー', unit: 'kcal', required: true },
  { key: 'protein', label: 'たんぱく質', unit: 'g', required: true },
  { key: 'fat', label: '脂質', unit: 'g', required: true },
  { key: 'carb', label: '炭水化物', unit: 'g', required: true },
  { key: 'salt', label: '食塩相当量', unit: 'g', required: true },
  { key: 'fiber', label: '食物繊維', unit: 'g', required: false },
  { key: 'alcohol', label: 'アルコール', unit: 'g', required: false },
]

const num = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) || Number(s) < 0 ? null : Number(s))
const str = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v))

export function ProductForm({
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
  const dialogRef = useDialog(onClose)
  const [name, setName] = useState(initial?.name ?? '')
  const [brand, setBrand] = useState(initial?.brand ?? '')
  const [basis, setBasis] = useState<Basis>(initial?.basis ?? 'serving')
  const [serving, setServing] = useState(str(initial?.servingGrams))
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(FIELDS.map((f) => [f.key, str(initial?.nutrients[f.key])])),
  )

  const missing = FIELDS.filter((f) => f.required && num(values[f.key]) === null)
  const valid = name.trim() !== '' && missing.length === 0
  const save = () => {
    const nutrients = Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, null])) as Nutrients
    for (const f of FIELDS) nutrients[f.key] = num(values[f.key])
    // 栄養成分表示に飽和脂肪酸はないことが多いので、脂質0なら0、それ以外は未収録
    if (nutrients.fat === 0) nutrients.satFat = 0
    onSave({ name: name.trim(), brand: brand.trim(), basis, servingGrams: num(serving) ?? undefined, nutrients })
  }
  const field = 'min-h-11 w-full rounded-2xl border-2 border-white bg-white px-4 text-base outline-none focus:border-coral'
  const basisLabel = BASIS.find((b) => b.id === basis)!.label
  // 任意の項目は、入っているものがあればひらいておく
  const [optionalOpen, setOptionalOpen] = useState(() => Boolean(initial && (initial.brand || initial.servingGrams || FIELDS.some((f) => !f.required && initial.nutrients[f.key] != null))))
  // 成分1つの入力欄。単位は欄の右に、いつも見えるように出す
  const nutrientField = (f: (typeof FIELDS)[number]) => (
    <label key={f.key} className="block text-sm">
      {f.label}
      <span className="mt-1 flex items-center gap-1.5">
        <input
          inputMode="decimal"
          value={values[f.key]}
          onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
          className={`${field} min-w-0 px-3 text-right tabular-nums`}
          aria-invalid={f.required && values[f.key] !== '' && num(values[f.key]) === null}
        />
        <span className="w-9 shrink-0 text-sm font-bold">{f.unit}</span>
      </span>
    </label>
  )

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-ink/30 md:items-center md:justify-center" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={initial ? 'お気に入りの市販品を編集' : '市販品を登録'}
        className="outline-none flex max-h-[92vh] w-full flex-col rounded-t-[var(--radius-card)] bg-cream p-4 shadow-xl md:max-w-lg md:rounded-[var(--radius-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <h2 className="text-lg font-bold">{initial ? '市販品を編集' : '市販品を登録'}</h2>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full hover:bg-white" aria-label="閉じる">
            ×
          </button>
        </div>
        {/* かならず入れる項目（商品名・表示の単位・5つの成分）を先に、任意の項目は下にたたんでおく */}
        <div className="-mx-1 flex-1 space-y-4 overflow-y-auto px-1 pb-1">
          <p className="text-xs text-ink-soft">パッケージの「栄養成分表示」を見て入れてください。登録したものはこのブラウザだけに保存され、お気に入りに入ります。</p>
          <label className="block text-sm font-bold">
            商品名
            <input value={name} onChange={(e) => setName(e.target.value)} className={`${field} mt-1 font-normal`} placeholder="例：いつものプロテインバー" />
          </label>
          <fieldset>
            <legend className="mb-1 text-sm font-bold">表示の単位</legend>
            <p className="mb-1.5 text-xs text-ink-soft">栄養成分表示のいちばん上に「1食（◯g）あたり」「100gあたり」などと書いてあります。</p>
            <div className="grid grid-cols-3 gap-2">
              {BASIS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  aria-pressed={basis === b.id}
                  onClick={() => setBasis(b.id)}
                  className={`min-h-12 rounded-2xl px-2 py-2 text-xs ${basis === b.id ? 'bg-coral font-bold text-ink-strong' : 'bg-white'}`}
                >
                  {/* 折り返すときは「あたり」の前で */}
                  <span className="inline-block">{b.label.replace(/あたり$/, '')}</span>
                  <span className="inline-block">あたり</span>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            {/* どの単位の値を入れるのかを、スクロールしてもいつも見えるところに */}
            <legend className="sr-only">栄養成分（{basisLabel}）</legend>
            <p className="sticky top-0 z-10 -mx-1 mb-2 bg-cream px-1 py-1.5 text-sm font-bold" aria-hidden>
              栄養成分
              <span className="ml-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-coral-ink">{basisLabel}の値</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.filter((f) => f.required).map(nutrientField)}
            </div>
            <p className="mt-2 text-xs text-ink-soft">ナトリウム表示しかないときは、ナトリウム(mg) × 2.54 ÷ 1000 が食塩相当量(g)です。</p>
          </fieldset>
          <details className="group rounded-2xl bg-white/60 px-3" open={optionalOpen} onToggle={(e) => setOptionalOpen(e.currentTarget.open)}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 text-sm font-bold text-coral-ink [&::-webkit-details-marker]:hidden">
              任意の項目（メーカー・食物繊維など）
              <span aria-hidden className="ml-auto transition-transform group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="space-y-3 pb-3">
              <label className="block text-sm">
                メーカー
                <input value={brand} onChange={(e) => setBrand(e.target.value)} className={`${field} mt-1`} />
              </label>
              {basis !== 'serving' && (
                <label className="block text-sm">
                  1個（1本・1袋）の量
                  <span className="mt-1 flex items-center gap-2">
                    <input inputMode="decimal" value={serving} onChange={(e) => setServing(e.target.value)} className={field} />
                    <span className="w-8 shrink-0 text-sm font-bold">{basis === '100ml' ? 'mL' : 'g'}</span>
                  </span>
                </label>
              )}
              <div className="grid grid-cols-2 gap-3">
                {FIELDS.filter((f) => !f.required).map(nutrientField)}
              </div>
            </div>
          </details>
        </div>
        <footer className="mt-3 flex shrink-0 gap-2">
          {onDelete && (
            <button type="button" onClick={onDelete} className="min-h-12 rounded-full bg-white px-4 text-sm text-alert-ink">
              削除
            </button>
          )}
          <button
            type="button"
            disabled={!valid}
            onClick={save}
            className="min-h-12 flex-1 rounded-full bg-coral px-3 text-sm font-bold text-ink-strong disabled:opacity-50"
          >
            {valid ? (initial ? '保存する' : '登録する') : '商品名と5つの成分を入れてください'}
          </button>
        </footer>
      </div>
    </div>
  )
}
