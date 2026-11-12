// 1日の食事の入力が、どこまで進んでいるか
import { isSupplementItem } from './nutrition'
import type { Targets } from './targets'
import type { DayMenu, Slot } from './types'

// 入っていないと「入力の途中」とみなす区分（その他は食べない日も多いので数えない）
const MEAL_SLOTS: Slot[] = ['breakfast', 'lunch', 'dinner']

// 朝・昼・晩のうち、食べる区分（カロリーの配分が0でない）なのに、まだ料理が入っていない区分。
// これが残っているあいだは、合計を「1日ぶん」として体重の変化などを計算しない
export function missingMealSlots(menu: DayMenu, targets: Pick<Targets, 'slotShare'>): Slot[] {
  return MEAL_SLOTS.filter((s) => targets.slotShare[s] > 0 && !menu[s].some((item) => !isSupplementItem(item)))
}
