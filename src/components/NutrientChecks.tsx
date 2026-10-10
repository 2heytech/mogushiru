import {
  INFO_NUTRIENTS,
  LIMIT_NUTRIENTS,
  WANT_NUTRIENTS,
  summarizeChecks,
  type CheckStatus,
  type NutrientCheck,
} from '../domain/nutrientChecks'
import type { CheckedNutrient } from '../domain/targets'
import { NUTRIENT_INFO } from './labels'

const fmt = (key: CheckedNutrient, v: number) => {
  const { digits } = NUTRIENT_INFO[key]
  return v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

const BAR_COLOR: Record<CheckStatus, string> = {
  ok: 'bg-ok',
  near: 'bg-caution',
  low: 'bg-coral',
  over: 'bg-alert',
  info: 'bg-ink/25',
}
const CHIP: Record<CheckStatus, string> = {
  ok: 'bg-ok/20',
  near: 'bg-caution/25',
  low: 'bg-coral/20',
  over: 'bg-alert/20',
  info: 'bg-cream',
}

// 「〜未満」「〜以下」：食塩は目標量が「未満」、アルコールは「この量以上でリスク」、飽和脂肪酸は「以下」
const LIMIT_WORD: Partial<Record<CheckedNutrient, string>> = { salt: '未満', alcohol: '未満', satFat: '以下' }

function statusText(c: NutrientCheck): string {
  const unit = NUTRIENT_INFO[c.key].unit
  if (c.target.kind === 'none') return '基準なし'
  if (c.status === 'info') return '—'
  if (c.target.kind === 'max') return c.status === 'over' ? '目安こえ' : c.status === 'near' ? '上限ちかい' : 'OK'
  if (c.status === 'over') return '上限こえ'
  if (c.status === 'ok') return '達成'
  const rest = c.goal! - c.amount
  // 表示の桁で 0 に丸まるほど少ないときは数字を出さない
  if (rest < 10 ** -NUTRIENT_INFO[c.key].digits / 2) return 'あと少し'
  return `あと ${fmt(c.key, rest)}${unit}`
}

function goalText(c: NutrientCheck, perSlot: boolean): string {
  const unit = NUTRIENT_INFO[c.key].unit
  if (c.target.kind === 'none' || c.goal === null) return ''
  const value = `${fmt(c.key, c.goal)}${unit}`
  if (c.target.kind === 'max') return `${perSlot && c.key !== 'alcohol' ? '目安' : c.target.basis === '飲酒ガイドライン' ? '1日' : c.target.basis} ${value}${LIMIT_WORD[c.key] ?? ''}`
  return `${perSlot ? '目安' : c.target.basis} ${value}`
}

function CheckRow({ c, perSlot }: { c: NutrientCheck; perSlot: boolean }) {
  const { label, unit } = NUTRIENT_INFO[c.key]
  // 目安の線を 2/3 の位置に置き、目安の 1.5 倍までを描く
  const scale = c.goal ? Math.min(c.amount / c.goal, 1.5) / 1.5 : 0
  return (
    <li className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <span className="block truncate">
          {label}
          {c.partial && <span className="text-ink-soft" title="成分が未収録の食品を含みます">※</span>}
        </span>
        {c.goal ? (
          <div className="relative mt-1 h-1.5 rounded-full bg-ink/10" aria-hidden>
            <div className={`h-full rounded-full transition-all duration-500 ${BAR_COLOR[c.status]}`} style={{ width: `${scale * 100}%` }} />
            <div className="absolute -inset-y-0.5 left-2/3 w-0.5 rounded-full bg-ink/40" />
          </div>
        ) : null}
      </div>
      <div className="w-[6.5rem] shrink-0 text-right tabular-nums">
        <strong>{fmt(c.key, c.amount)}</strong>
        <span className="text-ink-soft">{unit}</span>
        <span className="block text-[11px] text-ink-soft">{goalText(c, perSlot)}</span>
      </div>
      <span className={`w-16 shrink-0 rounded-full py-0.5 text-center text-[11px] font-bold whitespace-nowrap ${CHIP[c.status]}`}>{statusText(c)}</span>
    </li>
  )
}

function Group({ title, keys, checks, perSlot }: { title: string; keys: readonly CheckedNutrient[]; checks: NutrientCheck[]; perSlot: boolean }) {
  const rows = keys.map((k) => checks.find((c) => c.key === k)!).filter((c) => !(perSlot && c.key === 'alcohol' && c.amount < 0.5))
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-bold text-ink-soft">{title}</h3>
      <ul className="space-y-2 text-xs">
        {rows.map((c) => (
          <CheckRow key={c.key} c={c} perSlot={perSlot} />
        ))}
      </ul>
    </div>
  )
}

// 1日のまとめ欄・区分カードの「栄養素チェック」。開くと栄養素ごとの目安・上限との比較が出る
export function NutrientChecks({ checks, perSlot = false }: { checks: NutrientCheck[]; perSlot?: boolean }) {
  const s = summarizeChecks(checks)
  // 区分カードでは混み合わないよう、こえているものだけ数を出す
  const counts = [
    s.over > 0 && { text: `こえ ${s.over}`, cls: 'bg-alert/20' },
    s.low > 0 && { text: `不足 ${s.low}`, cls: 'bg-coral/20' },
    s.near > 0 && { text: `あと少し ${s.near}`, cls: 'bg-caution/25' },
    s.ok > 0 && { text: `OK ${s.ok}`, cls: 'bg-ok/20' },
  ]
    .filter((x): x is { text: string; cls: string } => Boolean(x))
    .filter((x) => !perSlot || x.text.startsWith('こえ'))
  const partial = checks.some((c) => c.partial)
  return (
    <details className="group rounded-2xl bg-white/70 px-3 py-2">
      <summary className="flex min-h-9 cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold">
        <span className="text-ink-soft transition-transform group-open:rotate-90" aria-hidden>
          ▸
        </span>
        <span className="whitespace-nowrap">{perSlot ? 'くわしい栄養素' : '栄養素チェック'}</span>
        <span className="ml-auto flex flex-wrap justify-end gap-1 text-[11px] font-bold">
          {counts.map((c) => (
            <span key={c.text} className={`rounded-full px-2 py-0.5 ${c.cls}`}>
              {c.text}
            </span>
          ))}
        </span>
      </summary>
      <div className="mt-2 space-y-3 pb-1">
        <Group title="とりすぎに気をつけたい" keys={LIMIT_NUTRIENTS} checks={checks} perSlot={perSlot} />
        <Group title="しっかりとりたい" keys={WANT_NUTRIENTS} checks={checks} perSlot={perSlot} />
        <Group title="基準のないもの" keys={INFO_NUTRIENTS} checks={checks} perSlot={perSlot} />
        <div className="space-y-0.5 text-[11px] leading-relaxed text-ink-soft">
          {perSlot ? (
            <p>区分の目安は、1日の目安を朝25%・昼35%・晩30%・その他10%で分けたアプリ独自の値です（アルコールは1日の値）。</p>
          ) : (
            <p>目安は「日本人の食事摂取基準（2025年版）」の推奨量・目安量・目標量、アルコールは「健康に配慮した飲酒に関するガイドライン」の値です。</p>
          )}
          <p>一価・多価不飽和脂肪酸は食事摂取基準に値がないため、量だけを表示しています。</p>
          <p>カルシウムとビタミンDは耐容上限量をこえると「上限こえ」になります。ビタミンAの上限はβ-カロテン由来の分を含まない値のため比べていません。</p>
          {partial && <p>※ 成分が未収録の食品（市販品など）を含むため、実際より少なく出ている可能性があります。</p>}
        </div>
      </div>
    </details>
  )
}
