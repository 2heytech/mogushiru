import type { ReactNode } from 'react'
import type { DaySummary, Step } from '../domain/daySummary'
import { OK_LABEL, concernText, nearText, stepText } from './daySummaryText'
import { SLOT_LABEL } from './labels'

const TONE = {
  ok: { box: 'bg-[color-mix(in_srgb,var(--color-ok)_12%,white)] ring-ok/30', title: 'text-ok-ink', mark: 'bg-ok/30 text-ok-ink' },
  concern: { box: 'bg-[color-mix(in_srgb,var(--color-caution)_16%,white)] ring-caution/40', title: 'text-ink', mark: 'bg-caution/50 text-ink-strong' },
  next: { box: 'bg-white ring-coral/30', title: 'text-coral-ink', mark: 'bg-coral/25 text-coral-ink' },
} as const

function Group({ tone, mark, title, children }: { tone: keyof typeof TONE; mark: string; title: string; children: ReactNode }) {
  const t = TONE[tone]
  return (
    <section className={`rounded-2xl px-3 py-2.5 ring-1 ${t.box}`}>
      <h3 className={`mb-1 flex items-center gap-1.5 text-sm font-bold ${t.title}`}>
        <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-2xs leading-none font-bold ${t.mark}`} aria-hidden>
          {mark}
        </span>
        {title}
      </h3>
      {children}
    </section>
  )
}

// まとめの中身。上から「目安の範囲内」「気になる点」「次に試すこと」の順に読めるように分ける。
// onStep：次に試すことのボタン（料理を足す画面をひらく・食品を調べる など）
export function DaySummaryView({ summary, onStep }: { summary: DaySummary; onStep?: (step: Step) => void }) {
  if (summary.state === 'empty') return null
  const { ok, near, concerns, steps } = summary
  const nearList = near.length > 0 && (
    <p className="mt-1 text-xs leading-relaxed text-ink-soft">
      <span className="font-bold text-ink">範囲内ですが、上限に近いもの：</span>
      {near.map(nearText).join('、')}
    </p>
  )
  return (
    // 文節の切れ目で折り返す（対応しているブラウザだけ。「0／回」のような折り返しを避ける）
    <div className="space-y-2 [word-break:auto-phrase]">
      {summary.state === 'partial' && (
        <Group tone="concern" mark="…" title="入力の途中">
          <p className="text-sm leading-relaxed">
            {summary.missing.map((s) => SLOT_LABEL[s]).join('・')}がまだ入っていません。入れると、1日のバランスがわかります。
          </p>
          {nearList}
        </Group>
      )}
      {(ok.length > 0 || (summary.state === 'full' && near.length > 0)) && (
        <Group tone="ok" mark="✓" title="目安の範囲内">
          {ok.length > 0 && <p className="text-sm leading-relaxed">{ok.map((k) => OK_LABEL[k]).join('、')}</p>}
          {nearList}
        </Group>
      )}
      {concerns.length > 0 && (
        <Group tone="concern" mark="!" title="気になる点">
          <ul className="space-y-1 text-sm leading-relaxed">
            {concerns.map((c, i) => (
              <li key={i} className={`flex gap-1.5 ${c.kind === 'over' ? 'font-bold text-alert-ink' : ''}`}>
                <span aria-hidden className="shrink-0 text-ink-soft">
                  ・
                </span>
                <span>{concernText(c)}</span>
              </li>
            ))}
          </ul>
        </Group>
      )}
      {steps.length > 0 && (
        <Group tone="next" mark="→" title="次に試すこと">
          <ul className="space-y-1.5 text-sm leading-snug">
            {steps.map((s, i) => {
              const { text, button } = stepText(s)
              return (
                <li key={i} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1">{text}</span>
                  {button && onStep && (
                    <button
                      type="button"
                      onClick={() => onStep(s)}
                      aria-label={`${button}：${text}`}
                      className="min-h-11 shrink-0 rounded-full border border-coral bg-white px-3.5 text-sm font-bold whitespace-nowrap text-coral-ink shadow-sm transition hover:bg-coral/10"
                    >
                      {button}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </Group>
      )}
    </div>
  )
}
