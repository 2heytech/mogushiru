import { useState } from 'react'
import { naKRatio, targetNaKRatio } from '../domain/sodiumPotassium'
import type { SwapIdea } from '../domain/swaps'
import type { Targets } from '../domain/targets'
import type { NutrientTotals } from '../domain/types'
import { SLOT_LABEL } from './labels'

const one = (v: number) => v.toFixed(1)

// 食塩とカリウムのつり合い（ナトカリ比）と、減塩・全粒穀物への置きかえの案
export function SaltPotassiumView({
  totals,
  targets,
  ideas,
  onSwap,
}: {
  totals: NutrientTotals
  targets: Targets
  ideas: SwapIdea[]
  onSwap?: (idea: SwapIdea) => void
}) {
  const [done, setDone] = useState<string | null>(null)
  const v = totals.values
  const ratio = naKRatio(v.salt, v.potassium)
  const goal = targetNaKRatio(targets)
  const { salt: saltT, potassium: kT, fiber: fiberT } = targets.nutrients
  // 食塩が目標量の8割をこえたら減塩の案、食物繊維が目標量に届かなければ主食の案を1つ
  const saltIdeas = saltT.kind === 'max' && v.salt > saltT.value * 0.8 ? ideas.filter((i) => i.kind === 'salt').slice(0, 3) : []
  const fiberIdeas = fiberT.kind === 'min' && v.fiber < fiberT.value ? ideas.filter((i) => i.kind === 'fiber').slice(0, 1) : []
  const shown = [...saltIdeas, ...fiberIdeas]
  const ok = ratio !== null && goal !== null && ratio <= goal
  const saltOver = saltT.kind === 'max' && v.salt >= saltT.value
  const kLow = kT.kind === 'min' && v.potassium < kT.value
  const ways = [saltOver && '食塩を減らす', kLow && '野菜・いも・果物・豆でカリウムを足す'].filter(Boolean).join('か、')

  if (ratio === null && shown.length === 0 && !done) return null
  const max = (goal ?? 1.7) * 2.5
  return (
    <div className="space-y-4">
      {ratio !== null && (
        <section aria-labelledby="nak-title" className="space-y-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
            <h2 id="nak-title" className="font-bold">
              食塩とカリウムのつり合い
            </h2>
            <span className="text-sm text-ink-soft tabular-nums">
              ナトカリ比 <strong className="text-lg text-ink">{one(ratio)}</strong>
              {goal !== null && `（目安 ${one(goal)} 以下）`}
            </span>
          </div>
          <div className="relative h-3 rounded-full bg-white" role="img" aria-label={`ナトカリ比 ${one(ratio)}${goal !== null ? `、目安 ${one(goal)} 以下` : ''}`}>
            <div className={`h-full rounded-full transition-all duration-500 ${ok ? 'bg-ok' : 'bg-caution'}`} style={{ width: `${Math.min(ratio / max, 1) * 100}%` }} />
            {goal !== null && <div className="absolute -inset-y-0.5 w-0.5 rounded-full bg-ink/40" style={{ left: `${(goal / max) * 100}%` }} aria-hidden />}
          </div>
          {goal !== null && (
            <p className="text-sm">{ok ? '食塩にくらべて、カリウムが十分とれています' : ways ? `${ways}と下がります` : '食塩にくらべて、カリウムが少なめです'}</p>
          )}
          <p className="text-xs leading-relaxed text-ink-soft">
            ナトリウム（食塩）とカリウムの比で、小さいほど血圧によいとされます。目安は食事摂取基準の目標量どおりに食べたときの比で、日本高血圧学会の目標（尿で測って2未満）に相当します。
            {totals.missing.has('potassium') && 'カリウムの値がない市販品を含むので、実際より高めに出ます。'}
            腎臓の病気でカリウムを控えている人は、医師の指示にしたがってください。
          </p>
        </section>
      )}

      {(shown.length > 0 || done) && (
        <section aria-labelledby="swap-title" className="space-y-2">
          <h3 id="swap-title" className="font-bold">
            置きかえのアイデア
          </h3>
          {done && (
            <p role="status" className="rounded-xl bg-ok/20 px-3 py-2 text-sm text-ok-ink">
              {done}
            </p>
          )}
          {shown.length > 0 && (
            <ul className="space-y-1.5">
              {shown.map((idea) => (
                <li key={`${idea.uid}-${idea.toLabel}`} className="rounded-xl bg-white px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-ink-soft">
                        {SLOT_LABEL[idea.slot]}の{idea.itemName}
                      </p>
                      <p className="text-sm font-bold">
                        {idea.fromLabel} → {idea.toLabel}
                      </p>
                      <p className="mt-0.5 flex flex-wrap gap-1 text-xs tabular-nums">
                        <span className="rounded-full bg-ok/20 px-2 py-0.5 font-bold text-ok-ink">
                          {idea.kind === 'salt' ? `食塩 −${one(idea.gain)}g` : `食物繊維 ＋${one(idea.gain)}g`}
                        </span>
                        {idea.potassiumGain >= 50 && <span className="rounded-full bg-ok/20 px-2 py-0.5 font-bold text-ok-ink">カリウム ＋{Math.round(idea.potassiumGain)}mg</span>}
                      </p>
                    </div>
                    {onSwap && (
                      <button
                        type="button"
                        onClick={() => {
                          onSwap(idea)
                          setDone(`${SLOT_LABEL[idea.slot]}の${idea.itemName}を、${idea.toLabel}にしました。もとに戻すときは、その料理の編集から。`)
                        }}
                        className="min-h-9 shrink-0 rounded-full bg-coral px-3.5 text-xs font-bold text-ink-strong shadow-sm"
                      >
                        置きかえる
                      </button>
                    )}
                  </div>
                  {idea.caution && <p className="mt-1 text-xs text-alert-ink">{idea.caution}</p>}
                </li>
              ))}
            </ul>
          )}
          <p className="text-2xs text-ink-soft">減塩：日本高血圧学会「高血圧管理・治療ガイドライン2025」、WHO「減塩塩のガイドライン」（2025）。全粒穀物：WHO「炭水化物のガイドライン」（2023）</p>
        </section>
      )}
    </div>
  )
}
