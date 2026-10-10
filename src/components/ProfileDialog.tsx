import { useState } from 'react'
import { MIN_SUPPORTED_AGE } from '../domain/dri'
import { computeTargets } from '../domain/targets'
import type { Activity, Goal, Profile, Sex } from '../domain/types'

const ACTIVITY: { id: Activity; label: string; desc: string }[] = [
  { id: 'low', label: '低い', desc: '座っていることが多い' },
  { id: 'normal', label: 'ふつう', desc: '立ち仕事や通勤・家事で動く' },
  { id: 'high', label: '高い', desc: '体を動かす仕事・運動習慣がある' },
]
const GOAL: { id: Goal; label: string }[] = [
  { id: 'lose', label: '減らしたい' },
  { id: 'keep', label: 'キープ' },
  { id: 'gain', label: '増やしたい' },
]

function Choice<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string; desc?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`min-h-11 rounded-2xl px-2 py-2 text-sm ${value === o.id ? 'bg-coral font-bold text-white' : 'bg-white'}`}
        >
          {o.label}
          {o.desc && <span className={`mt-0.5 block text-[11px] ${value === o.id ? 'text-white/90' : 'text-ink-soft'}`}>{o.desc}</span>}
        </button>
      ))}
    </div>
  )
}

const numOrUndef = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) ? undefined : Number(s))

export function ProfileDialog({ profile, onSave, onClose }: { profile: Profile; onSave: (p: Profile) => void; onClose: () => void }) {
  const [sex, setSex] = useState<Sex>(profile.sex)
  const [age, setAge] = useState(String(profile.age))
  const [height, setHeight] = useState(profile.heightCm ? String(profile.heightCm) : '')
  const [weight, setWeight] = useState(profile.weightKg ? String(profile.weightKg) : '')
  const [activity, setActivity] = useState<Activity>(profile.activity)
  const [goal, setGoal] = useState<Goal>(profile.goal ?? 'keep')

  const ageNum = numOrUndef(age)
  const valid = ageNum !== undefined && ageNum >= 1 && ageNum <= 120
  const draft: Profile | null = valid
    ? { sex, age: ageNum, heightCm: numOrUndef(height), weightKg: numOrUndef(weight), activity, goal }
    : null
  const preview = draft ? computeTargets(draft) : null

  const field = 'min-h-11 w-full rounded-2xl border-2 border-white bg-white px-4 text-base outline-none focus:border-coral'

  return (
    <div className="fixed inset-0 z-20 flex items-end bg-ink/30 md:items-center md:justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="プロフィール"
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-[var(--radius-card)] bg-cream p-5 shadow-xl md:max-w-md md:rounded-[var(--radius-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-bold">プロフィール</h2>
        <p className="mb-4 text-xs text-ink-soft">目安のカロリーを計算するために使います。入力内容はこの端末のブラウザにだけ保存されます。</p>
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-sm">性別</p>
            <Choice value={sex} onChange={setSex} options={[{ id: 'female', label: '女性' }, { id: 'male', label: '男性' }]} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-sm">
              年齢
              <input className={field} inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} />
            </label>
            <label className="text-sm">
              身長(cm)
              <input className={field} inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="任意" />
            </label>
            <label className="text-sm">
              体重(kg)
              <input className={field} inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="任意" />
            </label>
          </div>
          {ageNum !== undefined && ageNum < MIN_SUPPORTED_AGE && (
            <p className="text-xs text-ink-soft">※ {MIN_SUPPORTED_AGE}歳未満の方は、成長に必要な分を含めた計算に対応していないため、{MIN_SUPPORTED_AGE}歳の目安で表示します。</p>
          )}
          <div>
            <p className="mb-1 text-sm">ふだんの活動量</p>
            <Choice value={activity} onChange={setActivity} options={ACTIVITY} />
          </div>
          <div>
            <p className="mb-1 text-sm">体重の目標</p>
            <Choice value={goal} onChange={setGoal} options={GOAL} />
          </div>
          {preview && (
            <p className="rounded-2xl bg-white px-4 py-3 text-sm">
              1日の目安：<strong className="text-lg">{preview.energyKcal.toLocaleString()} kcal</strong>
              {preview.usedReferenceWeight && <span className="block text-xs text-ink-soft">体重が未入力のため、年齢・性別の標準的な体重で計算しています</span>}
            </p>
          )}
        </div>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className="min-h-11 flex-1 rounded-full bg-white">
            キャンセル
          </button>
          <button
            type="button"
            disabled={!draft}
            onClick={() => draft && onSave(draft)}
            className="min-h-11 flex-1 rounded-full bg-coral font-bold text-white disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
