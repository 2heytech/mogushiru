import { useEffect, useRef, useState } from 'react'
import { MIN_SUPPORTED_AGE } from '../domain/dri'
import { DEFAULT_SLOT_SHARE_PERCENT } from '../domain/slotBalance'
import { expenditure } from '../domain/energy'
import { computeTargets } from '../domain/targets'
import { SLOTS, type Activity, type Exercise, type Goal, type Profile, type Sex, type Slot } from '../domain/types'
import { ExerciseEditor } from './ExerciseEditor'
import { fromDraft, toDraft, type ExerciseDraft } from './exerciseDraft'
import { SLOT_LABEL } from './labels'

// 運動を入れたときは、運動の分は別に足すので「高い」から運動習慣を外す
const activityOptions = (withExercise: boolean): { id: Activity; label: string; desc: string }[] => [
  { id: 'low', label: '低い', desc: '座っていることが多い' },
  { id: 'normal', label: 'ふつう', desc: '立ち仕事や通勤・家事で動く' },
  { id: 'high', label: '高い', desc: withExercise ? '体を動かす仕事が多い' : '体を動かす仕事・運動習慣がある' },
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

const SHARE_STEP = 5
const sameShare = (a: Record<Slot, number>, b: Record<Slot, number>) => SLOTS.every((s) => a[s] === b[s])

// 1日の目安を朝・昼・晩・その他に分ける割合。5%ずつ変え、合計100%で保存できる
function SlotShareEditor({ value, onChange, dayKcal }: { value: Record<Slot, number>; onChange: (v: Record<Slot, number>) => void; dayKcal: number | null }) {
  const total = SLOTS.reduce((a, s) => a + value[s], 0)
  const step = (slot: Slot, d: number) => onChange({ ...value, [slot]: Math.min(100, Math.max(0, value[slot] + d)) })
  const btn = 'grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream text-lg font-bold disabled:opacity-30'
  return (
    <div className="rounded-2xl bg-white px-4 py-3">
      <ul className="space-y-1.5">
        {SLOTS.map((slot) => (
          <li key={slot} className="flex items-center gap-2 text-sm">
            <span className="w-12 shrink-0">{SLOT_LABEL[slot]}</span>
            <button type="button" className={btn} aria-label={`${SLOT_LABEL[slot]}を減らす`} disabled={value[slot] <= 0} onClick={() => step(slot, -SHARE_STEP)}>
              −
            </button>
            <strong className="w-12 text-center tabular-nums">{value[slot]}%</strong>
            <button type="button" className={btn} aria-label={`${SLOT_LABEL[slot]}を増やす`} disabled={value[slot] >= 100} onClick={() => step(slot, SHARE_STEP)}>
              ＋
            </button>
            {dayKcal !== null && <span className="ml-auto text-xs text-ink-soft tabular-nums">{(Math.round((dayKcal * value[slot]) / 100 / 10) * 10).toLocaleString()} kcal</span>}
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className={total === 100 ? 'text-ink-soft' : 'font-bold text-alert'}>
          合計 {total}%{total !== 100 && `（あと ${total < 100 ? `${100 - total}% 増やして` : `${total - 100}% 減らして`}ください）`}
        </span>
        {!sameShare(value, DEFAULT_SLOT_SHARE_PERCENT) && (
          <button type="button" className="shrink-0 rounded-full bg-cream px-3 py-1" onClick={() => onChange(DEFAULT_SLOT_SHARE_PERCENT)}>
            はじめの配分に戻す
          </button>
        )}
      </div>
    </div>
  )
}

export type ProfileFocus = 'slotShare' | 'exercise'

const numOrUndef = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) ? undefined : Number(s))

export function ProfileDialog({
  profile,
  onSave,
  onClose,
  focus,
}: {
  profile: Profile
  onSave: (p: Profile) => void
  onClose: () => void
  // 'slotShare'・'exercise' のときはその欄までスクロールして開く
  focus?: ProfileFocus
}) {
  const [sex, setSex] = useState<Sex>(profile.sex)
  const [age, setAge] = useState(String(profile.age))
  const [height, setHeight] = useState(profile.heightCm ? String(profile.heightCm) : '')
  const [weight, setWeight] = useState(profile.weightKg ? String(profile.weightKg) : '')
  const [activity, setActivity] = useState<Activity>(profile.activity)
  const [goal, setGoal] = useState<Goal>(profile.goal ?? 'keep')
  const [menstruation, setMenstruation] = useState<boolean | undefined>(profile.menstruation)
  const [slotShare, setSlotShare] = useState<Record<Slot, number>>(profile.slotShare ?? DEFAULT_SLOT_SHARE_PERCENT)
  const [exercises, setExercises] = useState<ExerciseDraft[]>(() => (profile.exercises ?? []).map(toDraft))
  const slotShareRef = useRef<HTMLDivElement>(null)
  const exerciseRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (focus === 'slotShare') slotShareRef.current?.scrollIntoView({ block: 'center' })
    if (focus === 'exercise') exerciseRef.current?.scrollIntoView({ block: 'start' })
  }, [focus])

  const ageNum = numOrUndef(age)
  const shareOk = SLOTS.reduce((a, s) => a + slotShare[s], 0) === 100
  const exerciseList = exercises.map(fromDraft)
  const exercisesOk = exerciseList.every((e) => e !== null)
  const validExercises = exerciseList.filter((e): e is Exercise => e !== null)
  const valid = ageNum !== undefined && ageNum >= 1 && ageNum <= 120 && shareOk && exercisesOk
  const draft: Profile | null = valid
    ? {
        sex,
        age: ageNum,
        heightCm: numOrUndef(height),
        weightKg: numOrUndef(weight),
        activity,
        goal,
        ...(sex === 'female' && menstruation !== undefined ? { menstruation } : {}),
        // はじめの配分のままなら保存しない（初期値が変わったときに追従できるように）
        ...(sameShare(slotShare, DEFAULT_SLOT_SHARE_PERCENT) ? {} : { slotShare }),
        ...(validExercises.length > 0 ? { exercises: validExercises } : {}),
      }
    : null
  // 鉄の推奨量は、女性の64歳までだけ月経の有無で変わる
  const askMenstruation = sex === 'female' && ageNum !== undefined && ageNum <= 64
  const menstruationValue = menstruation ?? Math.max(ageNum ?? 0, MIN_SUPPORTED_AGE) < 50
  const preview = draft ? computeTargets(draft) : null
  const ageOk = ageNum !== undefined && ageNum >= 1 && ageNum <= 120
  const basics: Profile | null = ageOk ? { sex, age: ageNum, weightKg: numOrUndef(weight), activity, goal, exercises: validExercises } : null
  const dayKcal = basics ? computeTargets(basics).energyKcal : null
  // 運動の1回あたりの消費は、入れた体重（なければ参照体重）で出す
  const energy = basics ? expenditure(basics) : null

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
          {askMenstruation && (
            <div>
              <p className="mb-1 text-sm">月経</p>
              <Choice
                value={menstruationValue ? 'yes' : 'no'}
                onChange={(v) => setMenstruation(v === 'yes')}
                options={[
                  { id: 'yes', label: 'あり' },
                  { id: 'no', label: 'なし' },
                ]}
              />
              <p className="mt-1 text-[11px] text-ink-soft">鉄の目安を選ぶために使います（月経ありのほうが多くなります）</p>
            </div>
          )}
          <div>
            <p className="mb-1 text-sm">ふだんの活動量</p>
            <Choice value={activity} onChange={setActivity} options={activityOptions(exercises.length > 0)} />
          </div>
          <div ref={exerciseRef} className="scroll-mt-4">
            <p className="mb-1 text-sm">ふだんの運動（任意）</p>
            <ExerciseEditor value={exercises} onChange={setExercises} weightKg={energy?.weightKg ?? 60} />
            <p className="mt-1 text-[11px] text-ink-soft">
              {exercises.length > 0 && energy
                ? `運動で 1日あたり 約${Math.round(energy.exercise).toLocaleString()} kcal（週の回数でならした分）を足します。通勤や家事の動きは「ふだんの活動量」に入っています。`
                : '続けている運動を入れると、使うカロリーに足して計算します。通勤や家事の動きは「ふだんの活動量」に入っています。'}
            </p>
          </div>
          <div>
            <p className="mb-1 text-sm">体重の目標</p>
            <Choice value={goal} onChange={setGoal} options={GOAL} />
          </div>
          <div ref={slotShareRef}>
            <p className="mb-1 text-sm">朝・昼・晩・その他の配分</p>
            <SlotShareEditor value={slotShare} onChange={setSlotShare} dayKcal={dayKcal} />
            <p className="mt-1 text-[11px] text-ink-soft">1日の目安をこの割合で分けて、区分ごとのカロリーや栄養素の目安にします</p>
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
