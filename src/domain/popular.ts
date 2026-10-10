import type { Slot } from './types'

// 区分ごとに、ふだんよく食べられるもの（料理を選ぶ画面で上に並べる）。
// 「dish:料理ID」「food:食品番号」を、よく食べられる順に並べる
export const POPULAR_BY_SLOT: Record<Slot, string[]> = {
  breakfast: [
    'food:01026', // 食パン
    'food:07013', // いちごジャム
    'food:14017', // バター
    'dish:rice',
    'dish:miso-soup',
    'dish:fried-egg',
    'dish:ready-natto',
    'dish:milk',
    'dish:yogurt',
    'dish:banana',
    'dish:toast',
    'dish:bread-jam-toast',
    'dish:ready-sausage',
    'dish:ready-ham',
    'dish:grilled-salmon',
    'dish:dashimaki',
    'dish:drink-coffee',
    'dish:onigiri-salmon',
    'dish:natto-rice',
    'dish:don-tamago-kake',
    'dish:green-salad',
    'dish:roll-bread',
    'dish:croissant',
    'dish:corn-soup',
    'dish:boiled-egg',
    'dish:scrambled-egg',
    'dish:orange-juice',
    'food:14020', // マーガリン
    'food:03022', // はちみつ
    'food:01137', // コーンフレーク
    'dish:sweets-cheese',
    'dish:ready-bacon',
    'dish:yasai-umeboshi',
    'food:09004', // 焼きのり
    'dish:drink-black-tea',
    'dish:fruit-kiwi',
    'dish:apple',
  ],
  lunch: [
    'dish:rice',
    'dish:curry-rice',
    'dish:onigiri-salmon',
    'dish:onigiri-ume',
    'dish:onigiri-tuna-mayo',
    'dish:shoyu-ramen',
    'dish:kake-udon',
    'dish:zaru-soba',
    'dish:gyudon',
    'dish:oyakodon',
    'dish:don-katsudon',
    'dish:fried-rice',
    'dish:yakisoba',
    'dish:meat-sauce',
    'dish:napolitan',
    'dish:mixed-sandwich',
    'dish:hamburger',
    'dish:karaage',
    'dish:shogayaki',
    'dish:hamburg',
    'dish:miso-soup',
    'dish:green-salad',
    'dish:cup-ramen',
    'dish:udon-kitsune',
    'dish:omurice',
    'dish:somen',
    'dish:hiyashi-chuka',
    'dish:gyoza',
    'dish:yasai-itame',
    'dish:mapo-tofu',
    'dish:drink-green-tea',
  ],
  dinner: [
    'dish:rice',
    'dish:miso-soup',
    'dish:karaage',
    'dish:shogayaki',
    'dish:hamburg',
    'dish:curry-rice',
    'dish:nikujaga',
    'dish:mapo-tofu',
    'dish:gyoza',
    'dish:grilled-salmon',
    'dish:saba-misoni',
    'dish:tonkatsu',
    'dish:sashimi',
    'dish:yasai-itame',
    'dish:green-salad',
    'dish:hiyayakko',
    'dish:ohitashi',
    'dish:potato-salad',
    'dish:kinpira',
    'dish:tonjiru',
    'dish:teriyaki-chicken',
    'dish:teriyaki-buri',
    'dish:cream-stew',
    'dish:sukiyaki',
    'dish:yosenabe',
    'dish:oden',
    'dish:chikuzenni',
    'dish:croquette',
    'dish:ebi-fry',
    'dish:subuta',
    'dish:happosai',
    'dish:hijiki-ni',
    'dish:beer',
  ],
  other: [
    'dish:banana',
    'dish:yogurt',
    'dish:drink-coffee',
    'dish:chocolate',
    'dish:potato-chips',
    'dish:ice-cream',
    'dish:pudding',
    'dish:sweets-senbei',
    'dish:mikan',
    'dish:apple',
    'dish:shortcake',
    'dish:sweets-cream-puff',
    'dish:daifuku',
    'dish:sweets-donut',
    'dish:sweets-biscuit',
    'dish:onigiri-salmon',
    'dish:sweets-nikuman',
    'dish:drink-cafe-au-lait',
    'dish:milk',
    'dish:sweets-mixed-nuts',
    'dish:sweets-cheese',
  ],
}

// 食材を選んだときの、ふだんの1回分の量（ない食材は100g）と、食品群より分かりやすい絵文字
export const FOOD_PORTION: Record<string, { grams: number; label: string; emoji?: string }> = {
  '01026': { grams: 60, label: '6枚切り1枚', emoji: '🍞' },
  '07013': { grams: 15, label: '大さじ1弱', emoji: '🍓' },
  '14017': { grams: 8, label: '小さじ2' },
  '14020': { grams: 8, label: '小さじ2' },
  '03022': { grams: 7, label: '小さじ1' },
  '01137': { grams: 40, label: '1食分', emoji: '🥣' },
  '09004': { grams: 3, label: '1枚' },
}

const RANK_CACHE = new Map<Slot, Map<string, number>>()

// リストにないものの順位（並べ替えで引き算しても NaN にならないよう有限の大きな数）
export const NOT_POPULAR = 1e9

// よく食べられる順位（小さいほど上）。リストにないものは NOT_POPULAR
export function popularRank(slot: Slot, key: string): number {
  let ranks = RANK_CACHE.get(slot)
  if (!ranks) {
    ranks = new Map(POPULAR_BY_SLOT[slot].map((k, i) => [k, i]))
    RANK_CACHE.set(slot, ranks)
  }
  return ranks.get(key) ?? NOT_POPULAR
}

// どれかの区分でよく食べられるもの（検索結果で同じ一致度なら前に出す）
const POPULAR_ANY = new Set(Object.values(POPULAR_BY_SLOT).flat())
export const isPopular = (key: string) => POPULAR_ANY.has(key)
