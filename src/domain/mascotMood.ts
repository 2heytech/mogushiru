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

// 朝・昼・晩・その他のカードの「ちゃわんモグ」
export function bowlMood(slotTotals: MenuTotals['day'], slot: Slot, targets: Targets, alerts: Alert[]): MascotMood {
  const b = slotBalance(slotTotals, slot, targets)
  if (b.energy === 'empty') return 'okay'
  if (alerts.some((a) => a.level === 'over' && a.topSlot === slot)) return 'alert'
  const issues = b.hints.length + (b.energy === 'ok' ? 0 : 1)
  if (issues === 0) return 'happy'
  return issues === 1 ? 'okay' : 'worried'
}
