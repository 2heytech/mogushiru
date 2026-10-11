import { type Alert, type Mood } from './alerts'
import type { MenuTotals } from './nutrition'
import type { PfcGap } from './pfcGap'
import { slotBalance, type PfcKey } from './slotBalance'
import type { Targets } from './targets'
import type { Slot } from './types'

// マスコットの表情。Mood に「アラート（上限こえ）」を足したもの
export type MascotMood = Mood | 'alert'

export type DangoMoods = Record<PfcKey, MascotMood>

// 「PFCだんごモグ」はPFCバランスだけを表す。だんご1つずつが P・F・C で、
// 目標範囲内ならごきげん、少なければしょんぼり（困り顔）、多ければあせり顔。ほかの栄養素のアラートには反応しない
export function dangoMoods(gaps: PfcGap[] | null): DangoMoods {
  const mood = (key: PfcKey): MascotMood => {
    const g = gaps?.find((x) => x.key === key)
    if (!g) return 'okay'
    return g.gap === 0 ? 'happy' : g.gap < 0 ? 'worried' : 'alert'
  }
  return { p: mood('p'), f: mood('f'), c: mood('c') }
}

// だんごの大きさ。目標範囲のまんなかの割合を 1 として、面積が割合に比例するように半径の倍率を出す
export function dangoScale(g: PfcGap): number {
  const mid = (g.range.lo + g.range.hi) / 2
  return Math.min(1.45, Math.max(0.55, Math.sqrt(g.ratio / mid)))
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
