import {
  DAILY_ONLY,
  INFO_NUTRIENTS,
  LIMIT_NUTRIENTS,
  WANT_NUTRIENTS,
  notableChecks,
  summarizeChecks,
  type CheckStatus,
  type NutrientCheck,
} from '../domain/nutrientChecks'
import type { CheckedNutrient } from '../domain/targets'
import { SLOT_ENERGY_SHARE } from '../domain/slotBalance'
import { SLOTS, type Slot } from '../domain/types'
import { NUTRIENT_INFO, SLOT_LABEL } from './labels'
import { UiIcon } from './UiIcon'

const CHECKED_COUNT = LIMIT_NUTRIENTS.length + WANT_NUTRIENTS.length + INFO_NUTRIENTS.length

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
const LIMIT_WORD: Partial<Record<CheckedNutrient, string>> = { salt: '未満', alcohol: '未満', satFat: '以下', caffeine: 'まで' }

function statusText(c: NutrientCheck): string {
  const unit = NUTRIENT_INFO[c.key].unit
  if (c.target.kind === 'none') return '基準なし'
  if (c.status === 'info') return '—'
  if (c.target.kind === 'max' && c.target.basis === '耐容上限量') return c.status === 'over' ? '上限こえ' : c.status === 'near' ? '上限ちかい' : 'OK'
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
  if (c.target.kind === 'max' && c.target.basis === '耐容上限量') return `上限 ${value}`
  if (c.target.kind === 'max') return `${DAILY_ONLY.includes(c.key) ? '1日' : perSlot ? '目安' : c.target.basis} ${value}${LIMIT_WORD[c.key] ?? ''}`
  return `${perSlot ? '目安' : c.target.basis} ${value}`
}

// 達成の割合。0 でない少量は 1% と出す（0% に見えて「とれていない」と誤解されないように）
const pct = (p: number) => (p > 0 && p < 1 ? 1 : Math.round(p))

function CheckRow({ c, perSlot }: { c: NutrientCheck; perSlot: boolean }) {
  const { label, unit } = NUTRIENT_INFO[c.key]
  // 目安の線を 2/3 の位置に置き、目安の 1.5 倍までを描く
  const scale = c.goal ? Math.min(c.amount / c.goal, 1.5) / 1.5 : 0
  return (
    <li className="flex items-center gap-2">
      {/* w-0：長い栄養素名（ビタミンA（レチノール）など）の幅で、スマホの画面が横にはみ出さないようにする */}
      <div className="w-0 min-w-0 flex-1">
        <span className="block leading-snug">
          {label}
          {c.partial && <span className="text-ink-soft" title="成分が未収録の食品を含みます">※</span>}
        </span>
        {c.goal && c.percent !== null ? (
          <div className="mt-1 flex items-center gap-1.5">
            <div className="relative h-1.5 flex-1 rounded-full bg-ink/10" aria-hidden>
              <div className={`h-full rounded-full transition-all duration-500 ${BAR_COLOR[c.status]}`} style={{ width: `${scale * 100}%` }} />
              <div className="absolute -inset-y-0.5 left-2/3 w-0.5 rounded-full bg-ink/40" />
            </div>
            <span className="w-10 shrink-0 text-left text-xs leading-none font-bold tabular-nums" aria-label={`${c.target.kind === 'max' ? '上限' : '目安'}の${pct(c.percent)}%`}>
              {pct(c.percent)}%
            </span>
          </div>
        ) : null}
      </div>
      <div className="w-[6.5rem] shrink-0 text-right tabular-nums">
        <strong>{fmt(c.key, c.amount)}</strong>
        <span className="text-ink-soft">{unit}</span>
        <span className="block text-[11px] text-ink-soft">{goalText(c, perSlot)}</span>
        {c.upperScope === 'supplement' && c.upper !== null && c.upperAmount > 0 && (
          <span className="block text-[11px] text-ink-soft">
            サプリ {fmt(c.key, c.upperAmount)}・上限 {fmt(c.key, c.upper)}
          </span>
        )}
      </div>
      <span className={`w-16 shrink-0 rounded-full py-0.5 text-center text-[11px] font-bold whitespace-nowrap ${CHIP[c.status]}`}>{statusText(c)}</span>
    </li>
  )
}

// グループごとに色の台とアイコンを分け、「気をつけたい」と「とりたい」の境目がひと目で分かるようにする
const GROUP_STYLE = {
  limit: { icon: 'limit', box: 'bg-alert/8 ring-alert/25', title: 'text-alert', note: '少ないほど安心。上限の線をこえないように' },
  want: { icon: 'want', box: 'bg-ok/10 ring-ok/30', title: 'text-[#3f9466]', note: '目安の線まで届けば達成' },
  info: { icon: 'info', box: 'bg-cream ring-ink/10', title: 'text-ink-soft', note: '量だけを表示' },
} as const

function Group({
  kind,
  title,
  keys,
  checks,
  perSlot,
}: {
  kind: keyof typeof GROUP_STYLE
  title: string
  keys: readonly CheckedNutrient[]
  checks: NutrientCheck[]
  perSlot: boolean
}) {
  const rows = keys.map((k) => checks.find((c) => c.key === k)!).filter((c) => !(perSlot && ((c.key === 'alcohol' && c.amount < 0.5) || (c.key === 'caffeine' && c.amount < 1))))
  const st = GROUP_STYLE[kind]
  return (
    <section className={`rounded-xl px-2.5 pt-2 pb-2.5 ring-1 ${st.box}`}>
      <h3 className="mb-2 flex items-center gap-2">
        <UiIcon name={st.icon} className="h-7 w-7 shrink-0" />
        <span className="min-w-0 leading-tight">
          <span className={`block text-sm font-bold ${st.title}`}>{title}</span>
          <span className="block text-[11px] text-ink-soft">{st.note}</span>
        </span>
      </h3>
      <ul className="space-y-2 text-xs">
        {rows.map((c) => (
          <CheckRow key={c.key} c={c} perSlot={perSlot} />
        ))}
      </ul>
    </section>
  )
}

// 1日のまとめ欄・区分カードの「栄養素チェック」。開くと栄養素ごとの目安・上限との比較が出る
// defaultOpen：はじめから全部ひらいておく（「とじる」で畳める）
export function NutrientChecks({
  checks,
  perSlot = false,
  slotShare,
  defaultOpen = false,
}: {
  checks: NutrientCheck[]
  perSlot?: boolean
  slotShare?: Record<Slot, number>
  defaultOpen?: boolean
}) {
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
  const notable = notableChecks(checks, perSlot ? 2 : 4)
  const judged = checks.filter((c) => c.status !== 'info').length
  return (
    <details open={defaultOpen} className={`group rounded-2xl border-2 border-dashed border-coral/40 bg-white/70 px-3 py-2 open:border-solid open:border-transparent`}>
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="flex min-h-9 flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold">
          <span className="whitespace-nowrap">{perSlot ? 'くわしい栄養素' : '栄養素チェック'}</span>
          <span className="text-[11px] font-normal text-ink-soft">{CHECKED_COUNT}項目</span>
          <span className="ml-auto flex items-center gap-1 rounded-full bg-coral px-3 py-1 text-[11px] text-white shadow-sm">
            <span className="group-open:hidden">ひらいて見る</span>
            <span className="hidden group-open:inline">とじる</span>
            <span className="transition-transform group-open:rotate-180" aria-hidden>
              ▼
            </span>
          </span>
        </span>
        {/* 畳んでいるときも、何が分かるかを少しだけ見せる */}
        <span className="mt-1 flex flex-wrap items-center gap-1 text-[11px] font-bold group-open:hidden">
          {counts.map((c) => (
            <span key={c.text} className={`rounded-full px-2 py-0.5 ${c.cls}`}>
              {c.text}
            </span>
          ))}
          {notable.map((c) => (
            <span key={c.key} className={`rounded-full px-2 py-0.5 font-normal ${CHIP[c.status]}`}>
              {NUTRIENT_INFO[c.key].label} <strong>{pct(c.percent ?? 0)}%</strong>
            </span>
          ))}
          {notable.length === 0 && judged > 0 && <span className="font-normal text-ink-soft">どの栄養素も目安との割合を見られます</span>}
        </span>
      </summary>
      <div className="mt-2 space-y-3 pb-1">
        <Group kind="limit" title="とりすぎに気をつけたい" keys={LIMIT_NUTRIENTS} checks={checks} perSlot={perSlot} />
        <Group kind="want" title="しっかりとりたい" keys={WANT_NUTRIENTS} checks={checks} perSlot={perSlot} />
        <Group kind="info" title="基準のないもの" keys={INFO_NUTRIENTS} checks={checks} perSlot={perSlot} />
        <div className="space-y-0.5 text-[11px] leading-relaxed text-ink-soft">
          {perSlot ? (
            <p>
              区分の目安は、1日の目安を{SLOTS.map((s) => `${SLOT_LABEL[s]}${Math.round((slotShare ?? SLOT_ENERGY_SHARE)[s] * 100)}%`).join('・')}
              で分けた値です（プロフィールで変えられます。アルコール・カフェインは1日の値）。
            </p>
          ) : (
            <p>目安は「日本人の食事摂取基準（2025年版）」の推奨量・目安量・目標量、アルコールは「健康に配慮した飲酒に関するガイドライン」の値です。</p>
          )}
          <p>カフェインは日本の基準がないため、欧州食品安全機関とカナダ保健省の「健康な大人は1日400mgまで」を目安にしています（農林水産省の資料で紹介されている値）。妊娠中・授乳中は1日200mgまでが目安です。</p>
          <p>一価・多価不飽和脂肪酸は食事摂取基準に値がないため、量だけを表示しています。</p>
          <p>カルシウム・亜鉛・ビタミンD・ビタミンE・ビタミンB6は、耐容上限量（とりすぎで健康をそこなうおそれがある量）をこえると「上限こえ」になります。ビタミンAの耐容上限量はβ-カロテン由来の分を含まない値のため、レチノールの量と比べます。</p>
          <p>マグネシウム・ナイアシン・葉酸の耐容上限量は、サプリメントなど通常の食品以外からとる分だけにかかる値のため、サプリの分だけで比べます。食事からとる分には上限がありません。</p>
          {partial && <p>※ 成分が未収録の食品（市販品など）を含むため、実際より少なく出ている可能性があります。</p>}
        </div>
      </div>
    </details>
  )
}
