import { useState } from 'react'
import { NUTRIENT_KEYS, type Nutrients, type Product } from '../domain/types'
import type { MyProductInput } from '../store/useAppStore'

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

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-ink/30 md:items-center md:justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={initial ? 'お気に入りの市販品を編集' : '市販品を登録'}
        className="flex max-h-[92vh] w-full flex-col rounded-t-[var(--radius-card)] bg-cream p-4 shadow-xl md:max-w-lg md:rounded-[var(--radius-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex shrink-0 items-center justify-between">
          <h2 className="text-lg font-bold">{initial ? '市販品を編集' : '市販品を登録'}</h2>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full hover:bg-white" aria-label="閉じる">
            ×
          </button>
        </header>
        <div className="-mx-1 flex-1 space-y-4 overflow-y-auto px-1 pb-1">
          <p className="text-xs text-ink-soft">パッケージの「栄養成分表示」を見て入れてください。登録したものはこのブラウザだけに保存され、お気に入りに入ります。</p>
          <label className="block text-sm">
            商品名
            <input value={name} onChange={(e) => setName(e.target.value)} className={`${field} mt-1`} placeholder="例：いつものプロテインバー" />
          </label>
          <label className="block text-sm">
            メーカー（任意）
            <input value={brand} onChange={(e) => setBrand(e.target.value)} className={`${field} mt-1`} />
          </label>
          <fieldset>
            <legend className="mb-1 text-sm">表示の単位</legend>
            <div className="grid grid-cols-3 gap-2">
              {BASIS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  aria-pressed={basis === b.id}
                  onClick={() => setBasis(b.id)}
                  className={`min-h-11 rounded-2xl px-2 py-2 text-xs ${basis === b.id ? 'bg-coral font-bold text-white' : 'bg-white'}`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </fieldset>
          {basis !== 'serving' && (
            <label className="block text-sm">
              1個（1本・1袋）の量（任意）
              <span className="mt-1 flex items-center gap-2">
                <input inputMode="decimal" value={serving} onChange={(e) => setServing(e.target.value)} className={field} />
                {basis === '100ml' ? 'mL' : 'g'}
              </span>
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <label key={f.key} className="block text-sm">
                {f.label}
                {!f.required && <span className="text-ink-soft">（任意）</span>}
                <span className="mt-1 flex items-center gap-2">
                  <input
                    inputMode="decimal"
                    value={values[f.key]}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    className={field}
                    aria-invalid={f.required && values[f.key] !== '' && num(values[f.key]) === null}
                  />
                  <span className="w-8 shrink-0 text-xs text-ink-soft">{f.unit}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-ink-soft">ナトリウム表示しかないときは、ナトリウム(mg) × 2.54 ÷ 1000 が食塩相当量(g)です。</p>
        </div>
        <footer className="mt-3 flex shrink-0 gap-2">
          {onDelete && (
            <button type="button" onClick={onDelete} className="min-h-11 rounded-full bg-white px-4 text-sm text-alert">
              削除
            </button>
          )}
          <button
            type="button"
            disabled={!valid}
            onClick={save}
            className="min-h-11 flex-1 rounded-full bg-coral text-sm font-bold text-white disabled:opacity-50"
          >
            {valid ? (initial ? '保存する' : '登録する') : '商品名と表示の5項目を入れてください'}
          </button>
        </footer>
      </div>
    </div>
  )
}
