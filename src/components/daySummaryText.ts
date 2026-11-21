// 1日の結果のまとめ（domain/daySummary.ts）を、画面に出す言葉にする
import type { Alert } from '../domain/alerts'
import type { Concern, DaySummary, FoodPart, OkKey, ReduceWhat, Step } from '../domain/daySummary'
import { BALANCED_MEALS_GOAL } from '../domain/foodBalance'
import { NUTRIENT_INFO, PFC_LABEL, SLOT_LABEL } from './labels'

// 「PFC」は初めての人には通じにくいので、何のバランスかを添える
export const OK_LABEL: Record<OkKey, string> = {
  energy: 'カロリー',
  pfc: 'PFC（たんぱく質・脂質・炭水化物のバランス）',
  salt: '食塩',
  vegetable: '野菜',
  fruit: '果物',
  mealBalance: '主食・主菜・副菜のそろい',
  nutrients: 'ビタミン・ミネラル',
}
// ひとことの中で使う短い名前
const OK_SHORT: Record<OkKey, string> = { ...OK_LABEL, pfc: 'PFC' }

const PART_LABEL: Record<FoodPart, string> = { staple: '主食', main: '主菜', side: '副菜' }

const alertLabel = (a: Alert) => (a.key === 'energy' ? 'カロリー' : NUTRIENT_INFO[a.key].label)
const fmtAlert = (a: Alert, v: number) => {
  const digits = a.key === 'energy' ? 0 : NUTRIENT_INFO[a.key].digits
  return v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
}
const limitName = (a: Alert) => (a.limitKind === 'upper' ? '耐容上限量' : '目安')

const kcal = (n: number) => Math.round(Math.abs(n)).toLocaleString()

// 目安との差の言い方。範囲内なら「目安の範囲内（＋60 kcal）」
export function energyDiffText(value: number, target: number, tolerance: number): string {
  if (value === 0) return '料理を選ぶと計算されます'
  const diff = Math.round(value - target)
  if (Math.abs(value - target) <= target * tolerance) return diff === 0 ? '目安の範囲内' : `目安の範囲内（${diff > 0 ? '＋' : '−'}${kcal(diff)} kcal）`
  return diff < 0 ? `目安まであと ${kcal(diff)} kcal` : `目安より ${kcal(diff)} kcal 多い`
}

// 上限・目安の8割をこえているもの（範囲内）
export const nearText = (a: Alert) =>
  `${alertLabel(a)}${a.supplementOnly ? '（サプリの分）' : ''} ${fmtAlert(a, a.amount)}${a.unit}（${limitName(a)} ${fmtAlert(a, a.limit)}${a.unit}）`

export function concernText(c: Concern): string {
  switch (c.kind) {
    case 'over': {
      const a = c.alert
      const where = a.topSlot ? `。いちばん多いのは${SLOT_LABEL[a.topSlot]}` : ''
      if (a.key === 'energy') return `カロリーが目安を ${kcal(a.amount - a.limit)} kcal こえています${where}`
      return `${alertLabel(a)}${a.supplementOnly ? '（サプリの分）' : ''}が${a.limitKind === 'upper' ? '上限' : '目安'}をこえています（${fmtAlert(a, a.amount)}${a.unit}／${limitName(a)} ${fmtAlert(a, a.limit)}${a.unit}）${where}`
    }
    case 'energy':
      return c.diff < 0 ? `カロリーは目安まであと ${kcal(c.diff)} kcal` : `カロリーは目安より ${kcal(c.diff)} kcal 多い`
    case 'pfc':
      return `${PFC_LABEL[c.key]}が${c.gap < 0 ? '少なめ' : '多め'}（${Math.round(c.ratio)}%、目安は ${c.range.lo}〜${c.range.hi}%）`
    case 'vegetable':
      return `野菜は目安まであと${c.rest}g`
    case 'fruit':
      return `果物は目安まであと${c.rest}g`
    case 'mealBalance':
      return `主食・主菜・副菜がそろった食事は${c.count}回（目安は1日${BALANCED_MEALS_GOAL}回以上）`
    case 'nutrient':
      return `${NUTRIENT_INFO[c.key].label}が少なめ（目安の${Math.round(c.percent)}%）`
  }
}

const REDUCE_TEXT: Record<Exclude<ReduceWhat, 'supplement'>, string> = {
  energy: '量の多い料理を少しへらすか、1品入れかえる',
  salt: '食塩の多い料理（めん類・汁物・漬物など）を1品入れかえる',
  satFat: '脂身の多い肉や、バター・生クリームを使う料理を入れかえる',
  alcohol: 'お酒の量をへらす',
  caffeine: 'コーヒー・お茶・エナジードリンクをへらす',
  protein: '肉・魚のおかずを少しへらして、主食や野菜を足す',
  fat: '揚げ物や脂の多い料理を、焼き物・煮物に入れかえる',
  carb: 'ごはん・パン・めんの量を少しへらす',
}

// 次に試すこと。button があるものは、押すとその操作の画面がひらく
export function stepText(s: Step): { text: string; button?: string } {
  switch (s.kind) {
    case 'addMeal':
      return { text: `${SLOT_LABEL[s.slot]}ごはんを入れる`, button: `${SLOT_LABEL[s.slot]}に追加` }
    case 'addDish': {
      const button = `${SLOT_LABEL[s.slot]}に追加`
      if (s.why === 'vegetable') return { text: '野菜の副菜を1品追加する', button }
      if (s.why === 'protein') return { text: '主菜（魚・肉・卵・大豆の料理）を1品足す', button }
      if (s.why === 'carb') return { text: '主食（ごはん・パン・めん）を足す', button }
      if (s.why === 'energy') return { text: '主食やおかずを1品足す', button }
      return { text: `${SLOT_LABEL[s.slot]}に${PART_LABEL[s.part]}を1品足す`, button }
    }
    case 'addFruit':
      return { text: '果物を1つ足す（みかん1個で約100g）', button: '果物を選ぶ' }
    case 'reduce':
      return { text: s.what === 'supplement' ? `${s.nutrient ? NUTRIENT_INFO[s.nutrient].label : ''}のサプリの量を見直す` : REDUCE_TEXT[s.what] }
    case 'swapSalt':
      return { text: 'しょうゆ・みそを減塩タイプに置きかえる', button: '置きかえの案' }
    case 'ranking':
      // 押すと、上のメニューの「成分ランキング」を、その成分を選んだ形でひらく
      return { text: `${NUTRIENT_INFO[s.key].label}の多い食品を足す`, button: 'ランキングを見る' }
  }
}

const joinAnd = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join('・')}と${xs[xs.length - 1]}`)

// マスコットのひとこと。下に並べる「範囲内」「気になる点」と食いちがわないように、同じ結果から作る
export function moguMessage(s: DaySummary): string {
  if (s.state === 'empty') return '料理を選んで、1日の食事をつくってみよう！'
  const over = s.concerns.find((c) => c.kind === 'over')
  if (over?.kind === 'over') return `${alertLabel(over.alert)}が${over.alert.limitKind === 'upper' ? '上限' : '目安'}をこえてるよ！`
  if (s.state === 'partial') return `${s.missing.map((x) => SLOT_LABEL[x]).join('・')}も入れると、1日のバランスがわかるよ`
  if (s.concerns.length === 0) return 'ぜんぶ目安の範囲内！このままいこう'
  const good = s.ok.slice(0, 2).map((k) => OK_SHORT[k])
  if (good.length === 0) return `気になる点が${s.concerns.length}つあるよ。できるところから試してみよう`
  return `${joinAnd(good)}はいい感じ。気になる点が${s.concerns.length}つあるよ`
}
