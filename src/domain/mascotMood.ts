import { type Alert, type Mood } from './alerts'
import { pfcRatio, type MenuTotals } from './nutrition'
import { slotBalance, type PfcKey } from './slotBalance'
import type { Targets } from './targets'
import type { Slot } from './types'

// マスコットの表情。Mood に「アラート（上限こえ）」を足したもの
export type MascotMood = Mood | 'alert'

export type DangoMoods = Record<PfcKey, MascotMood>

// 1日のまとめ欄の「PFCだんごモグ」。だんご1つずつが P・F・C を表す。
// 目標範囲から外れた栄養素のだんごだけ困り顔、上限こえのアラートがあれば残りのだんごはあせり顔
export function dangoMoods(totals: MenuTotals, targets: Targets, alerts: Alert[], dayMood: Mood): DangoMoods {
  const ratio = pfcRatio(totals.day.values)
  const hasOver = alerts.some((a) => a.level === 'over')
  const base: MascotMood = hasOver ? 'alert' : dayMood === 'happy' ? 'happy' : 'okay'
  const mood = (key: PfcKey): MascotMood => {
    if (!ratio) return 'okay'
    const r = targets.pfcRatio[key]
    return ratio[key] < r.lo || ratio[key] > r.hi ? 'worried' : base
  }
  return { p: mood('p'), f: mood('f'), c: mood('c') }
}

// 朝・昼・晩・その他のカードの「ちゃわんモグ」。カロリーとPFCそれぞれの横に、その指標の表情を出す。
// 区分が空なら null。その他（間食）はPFCを判定しないので、上限こえのとき以外は pfc も null
export type SlotMoods = { energy: MascotMood; pfc: MascotMood | null }

export function slotMoods(slotTotals: MenuTotals['day'], slot: Slot, targets: Targets, alerts: Alert[]): SlotMoods | null {
  const b = slotBalance(slotTotals, slot, targets)
  if (b.energy === 'empty') return null
  const overHere = (pred: (a: Alert) => boolean) => alerts.some((a) => a.level === 'over' && a.topSlot === slot && pred(a))
  const energy: MascotMood = overHere((a) => a.key === 'energy')
    ? 'alert'
    : b.energy === 'ok'
      ? 'happy'
      : b.energy === 'low'
        ? 'okay'
        : 'worried'
  let pfc: MascotMood | null
  if (overHere((a) => a.key !== 'energy')) pfc = 'alert'
  else if (slot === 'other' || !b.ratio) pfc = null
  else pfc = b.hints.length === 0 ? 'happy' : b.hints.length === 1 ? 'okay' : 'worried'
  return { energy, pfc }
}
