import { EXERCISE_GROUP_LABEL, EXERCISE_TYPE, EXERCISE_TYPES, STEPS_PER_MINUTE, exerciseKcalPerSession, type ExerciseGroup } from '../domain/energy'
import { EXERCISE_LIMIT as LIMIT, fromDraft, newDraftKey as newKey, numOrUndef as num, within, type ExerciseDraft } from './exerciseDraft'

const GROUPS = Object.keys(EXERCISE_GROUP_LABEL) as ExerciseGroup[]

const field = 'min-h-11 rounded-2xl border-2 border-cream bg-cream px-3 text-base outline-none focus:border-coral'
const stepBtn = 'grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream text-lg font-bold disabled:opacity-30'

// ふだんの運動の一覧。種類・1回の時間（歩くものは歩数でも）・週の回数を入れる
export function ExerciseEditor({ value, onChange, weightKg }: { value: ExerciseDraft[]; onChange: (v: ExerciseDraft[]) => void; weightKg: number }) {
  const update = (key: string, patch: Partial<ExerciseDraft>) => onChange(value.map((d) => (d.key === key ? { ...d, ...patch } : d)))
  const add = () => onChange([...value, { key: newKey(), type: 'walk', unit: 'minutes', amount: '30', perWeek: 3, mets: '' }])
  return (
    <div className="space-y-2">
      {value.map((d) => {
        const t = EXERCISE_TYPE.get(d.type)
        const ex = fromDraft(d)
        const kcal = ex ? exerciseKcalPerSession(ex, weightKg) : null
        return (
          <div key={d.key} className="rounded-2xl bg-white px-3 py-3">
            <div className="flex items-center gap-2">
              <label className="min-w-0 flex-1">
                <span className="sr-only">運動の種類</span>
                <select
                  className={`${field} w-full pr-2`}
                  value={d.type}
                  onChange={(e) => {
                    const next = EXERCISE_TYPE.get(e.target.value)
                    update(d.key, { type: e.target.value, ...(next?.steps ? {} : { unit: 'minutes' }), ...(e.target.value === 'custom' && d.mets === '' ? { mets: '4' } : {}) })
                  }}
                >
                  {GROUPS.map((g) => (
                    <optgroup key={g} label={EXERCISE_GROUP_LABEL[g]}>
                      {EXERCISE_TYPES.filter((x) => x.group === g).map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <button
                type="button"
                aria-label="この運動を消す"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream text-ink-soft"
                onClick={() => onChange(value.filter((x) => x.key !== d.key))}
              >
                ×
              </button>
            </div>

            {t?.steps && (
              <div className="mt-2 inline-flex rounded-full bg-cream p-0.5 text-xs" role="group" aria-label="入れ方">
                {(['minutes', 'steps'] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    aria-pressed={d.unit === u}
                    onClick={() => {
                      if (d.unit === u) return
                      // 入れた量はそのままの長さで直す（30分 ⇔ 3,000歩）
                      const a = num(d.amount)
                      update(d.key, { unit: u, amount: a === undefined ? d.amount : String(u === 'steps' ? Math.round(a * STEPS_PER_MINUTE) : Math.round(a / STEPS_PER_MINUTE)) })
                    }}
                    className={`min-h-8 rounded-full px-3 ${d.unit === u ? 'bg-white font-bold shadow-sm' : 'text-ink-soft'}`}
                  >
                    {u === 'minutes' ? '時間で' : '歩数で'}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              <label className="flex items-center gap-1.5 whitespace-nowrap">
                1回
                <input
                  className={`${field} w-24 text-right tabular-nums`}
                  inputMode="numeric"
                  value={d.amount}
                  onChange={(e) => update(d.key, { amount: e.target.value })}
                  aria-invalid={!within(num(d.amount), d.unit === 'steps' ? LIMIT.steps : LIMIT.minutes)}
                />
                {d.unit === 'steps' ? '歩' : '分'}
              </label>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                週
                <button type="button" className={stepBtn} aria-label="週の回数を減らす" disabled={d.perWeek <= 1} onClick={() => update(d.key, { perWeek: d.perWeek - 1 })}>
                  −
                </button>
                <strong className="w-5 text-center tabular-nums">{d.perWeek}</strong>
                <button type="button" className={stepBtn} aria-label="週の回数を増やす" disabled={d.perWeek >= 7} onClick={() => update(d.key, { perWeek: d.perWeek + 1 })}>
                  ＋
                </button>
                回
              </span>
              {d.type === 'custom' && (
                <label className="flex items-center gap-1.5 whitespace-nowrap">
                  強さ
                  <input
                    className={`${field} w-20 text-right tabular-nums`}
                    inputMode="decimal"
                    value={d.mets}
                    onChange={(e) => update(d.key, { mets: e.target.value })}
                    aria-invalid={!within(num(d.mets), LIMIT.mets)}
                  />
                  メッツ
                </label>
              )}
            </div>
            {d.type === 'custom' && <p className="mt-1 text-[11px] text-ink-soft">メッツは、じっと座っているときの何倍のエネルギーを使うか（ふつうに歩く＝3.5）</p>}
            <p className={`mt-1.5 text-xs ${ex ? 'text-ink-soft' : 'font-bold text-alert'}`}>
              {ex && kcal !== null
                ? `1回 約${Math.round(kcal).toLocaleString()} kcal（${(t?.id === 'custom' ? ex.mets : t?.mets)?.toFixed(1)}メッツ）`
                : d.unit === 'steps'
                  ? `歩数は ${LIMIT.steps.min.toLocaleString()}〜${LIMIT.steps.max.toLocaleString()}歩で入れてください`
                  : d.type === 'custom' && within(num(d.amount), LIMIT.minutes)
                    ? `強さは ${LIMIT.mets.min}〜${LIMIT.mets.max}メッツで入れてください`
                    : `時間は ${LIMIT.minutes.min}〜${LIMIT.minutes.max}分で入れてください`}
            </p>
          </div>
        )
      })}
      <button type="button" onClick={add} className="min-h-11 w-full rounded-2xl border-2 border-dashed border-coral/60 bg-white/60 text-sm font-bold text-coral-dark">
        ＋ 運動を追加
      </button>
    </div>
  )
}
