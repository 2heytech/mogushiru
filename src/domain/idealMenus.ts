// 理想の献立：朝・昼・晩・その他で自然な組み合わせになり、1日の栄養の目安（PFC・カロリー・食塩・栄養素）に近い1日の食事。
// 献立は1人前（女性30〜49歳・ふつうの1日の目安 約2,000kcal）で組み、呼び出すときにプロフィールの目安に合わせて量を調整する。
//
// 量の調整（adjustIdealMenu）
//   1. おかず・汁物は、1日の目安と献立を組んだ目安（2,000kcal）の比の平方根の割合で控えめに増減する（0.8〜1.15人前）。
//      食塩の目安は女性6.5g・男性7.5gと、カロリーほどには違わないので、おかずを増やしすぎない
//   2. ごはん・パン・麺・丼で、朝・昼・晩それぞれの目安カロリー（1日の目安 × プロフィールの配分）に合わせる
//      （食事バランスガイドと同じく、エネルギーの調整は主食の量で行う。おかずのビタミン・ミネラルを減らしすぎないように）。
//      ただし大盛り（1.5人前）まで。2人前のような食べ方は自然でないので、
//   3. 足りない分は、献立ごとに決めた「足す一品」（ゆで卵・冷奴・焼き芋・おにぎりなど）で補う。
//      ごはんが1.2人前を大きくこえるときも一品を足して、ごはんをふつうの量に近づける。
//      果物・牛乳・ヨーグルト・納豆・卵など1個・1杯で数えるものは1個のまま（2個にはしない）
//   4. それでもPFCが目標の範囲を外れる・食塩や飽和脂肪酸が目安をこえるときは、0.1人前ずつ動かして直す
//   配分が0%の区分（朝食をとらない設定など）は空にして、その分をほかの区分に回す
//
// 市販品（コンビニ・メーカーの商品）も入れられる。量は献立に書いた1個・1パック（1杯）のままにして、
// ごはんだけでは1日のカロリーやPFCが合わないときだけ、おにぎり・パンを1個へらす（小食の人）、
// フルグラ・冷凍ギョーザなどグラムで数える商品を刻みずつ増減する（サラダなどほかの商品は献立の量のまま）。
// ごはんのない区分（コンビニのお昼、フルグラの朝など）は、その区分が目安から2割外れないように
// それらや果物・牛乳を1個・1杯ずつ動かし、そのぶんほかの区分のごはんを配り直す
import { MORE_IDEAL_MENUS } from './idealMenuData'
import { nutrientChecks, type NutrientCheck } from './nutrientChecks'
import { menuTotals, pfcRatio, type Catalog, type MenuTotals } from './nutrition'
import { SLOT_ENERGY_TOLERANCE } from './slotBalance'
import type { Targets } from './targets'
import { SLOTS, type DayMenu, type Dish, type MenuItem, type Product, type Slot } from './types'

// [料理のid, 人前]。人前を省くと1人前。
// 市販品は "product:<商品のjan>"。量は1個・1食で表示の商品は個数、100g・100mL当たりの商品はグラム（mL）で、
// 省くと1個（グラムの商品は表示の1食分、なければ100g）。
// グラムの商品は3つめに増減の刻み（ギョーザ1個のグラムなど）を書ける。省くと献立のグラムずつ
export type IdealMenuItem = string | [string, number] | [string, number, number]

const PRODUCT_PREFIX = 'product:'
export const idealProductJan = (x: IdealMenuItem): string | null => {
  const id = typeof x === 'string' ? x : x[0]
  return id.startsWith(PRODUCT_PREFIX) ? id.slice(PRODUCT_PREFIX.length) : null
}

// day：1日の合計でバランスをとる（軽い朝ごはんと、しっかりした晩ごはんなど）。
// meal：朝・昼・晩のどれも、1食だけで区分の目安（カロリー・PFC・食塩・飽和脂肪酸）に収まる。1食だけ呼び出してもよい
export type IdealBalance = 'day' | 'meal'
export const IDEAL_GENRES = ['和食', '洋食', '中華', 'イタリアン', '韓国', 'エスニック', '郷土料理', '市販品'] as const
export type IdealGenre = (typeof IDEAL_GENRES)[number]

export type IdealMenu = {
  id: string
  name: string
  balance: IdealBalance
  genre: IdealGenre
  // 献立のようす（一覧に出すひとこと）
  lead: string
  // 栄養のポイント
  point: string
  slots: Record<Slot, IdealMenuItem[]>
  // たくさん食べる人に足す一品（区分ごと）。ごはんを増やしすぎないように、足りない分はここから書いた順に1人前ずつ足す。
  // たくさん食べる人は食塩の目安がいちばん厳しいので、食塩の少ないものから並べる。小食の人やふつうの量の人では使わないこともある
  extras: Partial<Record<Slot, IdealMenuItem[]>>
}

// 最初に手で組んだ献立。一覧ではこの順で先に出し、そのあとに追加分（idealMenuData.ts）を続ける
const FIRST_IDEAL_MENUS: IdealMenu[] = [
  {
    id: 'washoku',
    balance: 'day',
    genre: '和食',
    name: '和食の定番',
    lead: '納豆と玄米の朝、サーモン丼の昼、銀だらの西京焼きの晩',
    point: '魚と大豆でたんぱく質。玄米・枝豆・煮豆で食物繊維',
    slots: {
      breakfast: ['genmai-rice', 'ready-natto', 'yasai-tomato', 'misoshiru-spinach'],
      lunch: ['don-salmon', 'yasai-edamame', 'fruit-persimmon'],
      dinner: ['rice', 'gindara-saikyoyaki', 'ready-atsuage', 'nimame'],
      other: ['sweets-yogurt-sweet', 'banana'],
    },
    extras: { breakfast: ['milk', 'fruit-grape', 'boiled-egg'], lunch: ['apple', 'hiyayakko'], dinner: ['ready-imo-tempura', 'yasai-corn', 'mikan', 'yasai-kabocha-ni'], other: ['sweets-yakiimo', 'sweets-mixed-nuts', 'onigiri-salmon'] },
  },
  {
    id: 'bread',
    balance: 'day',
    genre: '洋食',
    name: 'パンの朝ごはん',
    lead: 'ジャムトーストと目玉焼きの朝、ロコモコの昼、あじフライの晩',
    point: 'ヨーグルト・牛乳・冷奴でカルシウム。卵とあじでビタミンD',
    slots: {
      breakfast: ['bread-jam-toast', 'fried-egg', 'yasai-broccoli', 'sweets-yogurt-sweet', 'banana'],
      lunch: ['loco-moco', 'yasai-tomato', 'fruit-persimmon'],
      dinner: ['rice', 'ready-aji-fry', 'hiyayakko', 'nimame'],
      other: ['milk', 'apple'],
    },
    extras: { breakfast: ['orange-juice', 'boiled-egg'], lunch: ['ready-fries', 'fruit-kiwi', 'coleslaw'], dinner: ['yasai-corn', 'yasai-kabocha-ni', 'yasai-edamame'], other: ['sweets-yakiimo', 'sweets-mixed-nuts', 'onigiri-salmon'] },
  },
  {
    id: 'sashimi',
    balance: 'day',
    genre: '和食',
    name: 'お刺身の晩ごはん',
    lead: '卵焼きの朝、ヒレカツ定食の昼、たいのお刺身の晩',
    point: 'ヒレカツの豚肉でビタミンB1。小松菜と厚揚げでカルシウムと鉄',
    slots: {
      breakfast: ['rice', 'dashimaki', 'ohitashi-komatsuna'],
      lunch: ['genmai-rice', 'ready-hire-katsu', 'yasai-kabocha-ni', 'yasai-tomato'],
      dinner: ['rice', 'sashimi-tai', 'ready-atsuage', 'onyasai'],
      other: ['sweets-yogurt-sweet', 'fruit-orange'],
    },
    extras: { breakfast: ['banana', 'milk', 'ready-natto'], lunch: ['apple', 'nimame'], dinner: ['ready-imo-tempura', 'yasai-corn', 'fruit-grape', 'yasai-edamame'], other: ['sweets-yakiimo', 'sweets-mixed-nuts', 'onigiri-salmon'] },
  },
  {
    id: 'chuka',
    balance: 'day',
    genre: '中華',
    name: '中華の晩ごはん',
    lead: 'スクランブルエッグの朝、鉄火丼の昼、麻婆豆腐の晩',
    point: 'まぐろと豆腐でたんぱく質。ナッツでビタミンE、青菜でビタミンC',
    slots: {
      breakfast: ['genmai-rice', 'scrambled-egg', 'ohitashi', 'yasai-tomato'],
      lunch: ['don-tekka', 'yasai-broccoli', 'banana'],
      dinner: ['rice', 'mapo-tofu', 'ohitashi-chingensai'],
      other: ['sweets-yogurt-sweet', 'sweets-mixed-nuts'],
    },
    extras: { breakfast: ['milk', 'apple'], lunch: ['fruit-kiwi', 'nimame'], dinner: ['yasai-corn', 'fruit-pineapple', 'yasai-edamame'], other: ['sweets-yakiimo', 'onigiri-salmon'] },
  },
  {
    id: 'nabe',
    balance: 'day',
    genre: '和食',
    name: '鍋の晩ごはん',
    lead: '紅ざけの朝、ぶりの照り焼きの昼、水炊きの晩',
    point: '紅ざけとぶりでビタミンDとn-3系脂肪酸。鍋で野菜がたっぷり',
    slots: {
      breakfast: ['genmai-rice', 'shioyaki-beniza', 'ohitashi-komatsuna'],
      lunch: ['rice', 'teriyaki-buri', 'yasai-broccoli', 'mikan'],
      dinner: ['mugi-rice', 'mizutaki', 'yasai-kabocha-ni'],
      other: ['sweets-yogurt-sweet', 'fruit-kiwi'],
    },
    extras: { breakfast: ['banana', 'milk', 'ready-natto'], lunch: ['nimame', 'ready-imo-tempura', 'apple', 'hiyayakko'], dinner: ['yasai-corn', 'fruit-grape', 'yasai-edamame'], other: ['sweets-yakiimo', 'sweets-mixed-nuts', 'onigiri-salmon'] },
  },
  {
    id: 'italian',
    balance: 'day',
    genre: 'イタリアン',
    name: 'イタリアンの1日',
    lead: 'ゆで卵とジャムトーストの朝、マルゲリータの昼、リゾットと鶏むね肉のソテーの晩',
    point: 'ピザのチーズと豆乳でカルシウム。鶏むね肉と卵でたんぱく質、野菜ジュースと温野菜でビタミン',
    slots: {
      breakfast: ['bread-jam-toast', 'boiled-egg', 'sweets-yogurt-sweet', 'fruit-orange', 'drink-vegetable-juice'],
      lunch: ['pizza-margherita', 'yasai-tomato', 'fruit-grape'],
      dinner: ['risotto', 'grill-chicken-breast', 'onyasai'],
      other: ['drink-soy-milk', 'fruit-kiwi'],
    },
    // ピザとリゾットは食塩が多めなので、たくさん食べる人には食塩のない一品を多めに用意する
    extras: {
      breakfast: ['banana', 'apple', 'drink-apple-juice'],
      lunch: ['fruit-avocado', 'yasai-corn', 'ready-fries', 'fruit-pineapple'],
      dinner: ['fruit-pear', 'fruit-persimmon'],
      other: ['sweets-yakiimo', 'sweets-mixed-nuts', 'drink-drink-yogurt'],
    },
  },
  {
    id: 'korean',
    balance: 'day',
    genre: '韓国',
    name: '韓国風の1日',
    lead: 'サーモンの塩焼きの朝、ビビンバの昼、蒸し鶏とキムチの晩',
    point: 'ビビンバで野菜をたっぷり。サーモンでビタミンD、蒸し鶏と枝豆でたんぱく質。キムチは小皿で',
    slots: {
      breakfast: ['rice', 'shioyaki-salmon', 'yasai-tomato', 'drink-vegetable-juice'],
      lunch: ['bibimbap', 'sweets-yogurt-sweet', 'mikan'],
      dinner: ['rice', 'banbanji', 'yasai-kimchi', 'yasai-edamame'],
      other: ['drink-drink-yogurt', 'fruit-kiwi'],
    },
    extras: {
      breakfast: ['banana', 'apple'],
      lunch: ['fruit-avocado', 'fruit-grapefruit'],
      dinner: ['ready-imo-tempura', 'yasai-corn', 'fruit-pear'],
      other: ['sweets-yakiimo', 'sweets-mixed-nuts', 'drink-soy-milk'],
    },
  },
  {
    id: 'ethnic',
    balance: 'day',
    genre: 'エスニック',
    name: 'タイ風の1日',
    lead: 'トーストとバナナの朝、ガパオライスの昼、蒸し鶏ごはんと春雨サラダの晩',
    point: 'ガパオと蒸し鶏でたんぱく質。野菜ジュースとブロッコリーでビタミン、飲むヨーグルトでカルシウム',
    slots: {
      breakfast: ['bread-jam-toast', 'sweets-yogurt-sweet', 'yasai-tomato', 'banana', 'drink-vegetable-juice'],
      lunch: ['gapao-rice', 'yasai-broccoli', 'fruit-pineapple'],
      dinner: ['rice', 'banbanji', 'harusame-salad', 'fruit-kiwi'],
      other: ['drink-drink-yogurt', 'mikan'],
    },
    extras: {
      breakfast: ['apple', 'drink-cafe-au-lait'],
      lunch: ['fruit-avocado', 'yasai-corn', 'fruit-orange'],
      dinner: ['fruit-grape', 'fruit-pear', 'ready-nasu-tempura'],
      other: ['sweets-yakiimo', 'drink-soy-milk', 'sweets-mixed-nuts'],
    },
  },
  {
    id: 'okinawa',
    balance: 'day',
    genre: '郷土料理',
    name: '沖縄の1日',
    lead: 'ハムと目玉焼きの朝、沖縄そばの昼、ゴーヤーチャンプルーとイカスミ汁の晩',
    point: 'ゴーヤーとパイナップルでビタミンC、チャンプルーの豆腐とイカスミ汁でたんぱく質。おやつはサーターアンダーギー',
    slots: {
      breakfast: ['rice', 'fried-egg', 'ready-ham', 'yasai-tomato'],
      lunch: ['kyodo-47-20-okinawa', 'yasai-broccoli', 'fruit-pineapple'],
      dinner: ['rice', 'kyodo-47-11-okinawa', 'kyodo-47-12-okinawa', 'ohitashi-komatsuna'],
      other: ['kyodo-47-8-okinawa', 'sweets-yogurt-sweet'],
    },
    extras: {
      breakfast: ['banana', 'drink-soy-milk'],
      lunch: ['ready-imo-tempura', 'fruit-kiwi'],
      dinner: ['yasai-corn', 'fruit-orange'],
      other: ['sweets-mixed-nuts', 'yogurt'],
    },
  },
  // ここから毎食バランスの献立。朝・昼・晩のどれも、1食で区分の目安（カロリー・PFC・食塩・飽和脂肪酸）に収まる。
  // 1食の食塩は1日の目安 × 区分の割合（女性の朝なら約1.6g）までなので、みそ汁や麺など塩分の多いものは入れにくい
  {
    id: 'meal-washoku',
    balance: 'meal',
    genre: '和食',
    name: '和定食の1日',
    lead: 'サーモンの塩焼きの朝、鶏の照り焼きの昼、たいの刺身とがんもどきの晩',
    point: '毎食、主食・魚や肉・野菜をそろえる',
    slots: {
      breakfast: ['mugi-rice', 'shioyaki-salmon', 'yasai-kabocha-ni', 'yasai-tomato'],
      lunch: ['rice', 'teriyaki-chicken', 'yasai-edamame', 'fruit-persimmon'],
      dinner: ['genmai-rice', 'sashimi-tai', 'ready-ganmodoki', 'ohitashi-komatsuna'],
      other: ['drink-drink-yogurt', 'fruit-kiwi'],
    },
    extras: {
      breakfast: ['banana', 'yogurt', 'mikan'],
      lunch: ['apple', 'ready-imo-tempura', 'yasai-corn'],
      dinner: ['fruit-grape', 'sweets-yakiimo', 'fruit-pear'],
      other: ['drink-soy-milk', 'fruit-orange', 'sweets-mixed-nuts'],
    },
  },
  {
    id: 'meal-yoshoku',
    balance: 'meal',
    genre: '洋食',
    name: '洋食の1日',
    lead: 'ジャムトーストとゆで卵の朝、ロコモコの昼、あじフライの晩',
    point: '毎食、主食・肉や魚や卵・野菜をそろえる',
    slots: {
      breakfast: ['bread-jam-toast', 'boiled-egg', 'yasai-broccoli', 'sweets-yogurt-sweet', 'fruit-kiwi'],
      lunch: ['loco-moco', 'yasai-tomato', 'fruit-orange'],
      dinner: ['rice', 'ready-aji-fry', 'onyasai', 'yasai-tomato', 'fruit-grape'],
      other: ['milk', 'fruit-pineapple'],
    },
    extras: {
      breakfast: ['orange-juice', 'yasai-corn', 'sweets-mixed-nuts'],
      lunch: ['drink-soy-milk', 'banana', 'apple'],
      dinner: ['fruit-pear', 'ready-fries', 'ready-imo-tempura'],
      other: ['sweets-yakiimo', 'onigiri-salmon', 'mikan'],
    },
  },
  {
    id: 'meal-chuka',
    balance: 'meal',
    genre: '中華',
    name: '中華の1日',
    lead: '目玉焼きと枝豆の朝、酢豚の昼、麻婆豆腐の晩',
    point: '毎食、主食・肉や卵や豆腐・野菜をそろえる。豆腐と枝豆でカルシウムと鉄',
    slots: {
      breakfast: ['rice', 'fried-egg', 'yasai-edamame', 'yasai-tomato'],
      lunch: ['genmai-rice', ['subuta', 1.3], 'yasai-broccoli', 'hiyayakko', 'fruit-orange'],
      dinner: ['rice', 'mapo-tofu', 'ohitashi-chingensai', 'fruit-kiwi'],
      other: ['sweets-yogurt-sweet', 'banana'],
    },
    extras: {
      breakfast: ['drink-soy-milk', 'apple', 'orange-juice'],
      lunch: ['fruit-pineapple', 'yasai-corn', 'ready-imo-tempura'],
      dinner: ['fruit-grape', 'fruit-pear', 'fruit-persimmon'],
      other: ['mikan', 'sweets-mixed-nuts', 'sweets-yakiimo'],
    },
  },
  // ここから市販品を使う献立。コンビニの商品は毎月のデータ更新でなくなることがあるので、テストで確かめる
  {
    id: 'konbini',
    balance: 'day',
    genre: '市販品',
    name: 'コンビニでお昼',
    lead: '納豆ごはんの朝、セブン-イレブンのおにぎりとサラダの昼、さばの塩焼きの晩',
    point: 'お昼はおにぎり2個とサラダに、ヨーグルトとキウイを足す。朝と晩の料理で魚・大豆・青菜をとる',
    slots: {
      breakfast: ['rice', 'ready-natto', 'yasai-tomato'],
      lunch: ['product:seven-040313', 'product:seven-040302', 'product:seven-105215', 'sweets-yogurt-sweet', 'fruit-kiwi'],
      dinner: ['rice', 'grilled-mackerel', 'ohitashi-komatsuna', 'nimame'],
      other: ['sweets-mixed-nuts'],
    },
    extras: { breakfast: ['milk', 'fruit-grape'], lunch: ['boiled-egg', 'onigiri-salmon', 'banana'], dinner: ['yasai-corn', 'ready-imo-tempura', 'apple', 'hiyayakko'], other: ['drink-soy-milk', 'sweets-yakiimo'] },
  },
  {
    id: 'frugra-gyoza',
    balance: 'day',
    genre: '市販品',
    name: 'フルグラと冷凍ギョーザ',
    lead: 'フルグラと牛乳の朝、鶏の照り焼きの昼、冷凍ギョーザの晩',
    point: '朝はフルグラで手軽に食物繊維。ギョーザは塩分ひかえめのものに、野菜と豆腐を添える',
    slots: {
      breakfast: [['product:maker-calbee-frugra', 50, 10], 'milk', 'banana'],
      lunch: ['genmai-rice', 'teriyaki-chicken', 'ohitashi-komatsuna', 'yasai-tomato'],
      // 12個入り（276g）の半分の6個。1個23g
      dinner: ['rice', ['product:4901001567775', 138, 23], 'namul', 'hiyayakko'],
      other: ['sweets-yogurt-sweet', 'fruit-kiwi'],
    },
    extras: { breakfast: ['boiled-egg', 'orange-juice'], lunch: ['nimame', 'apple', 'ready-imo-tempura'], dinner: ['yasai-corn', 'fruit-pineapple', 'yasai-edamame'], other: ['sweets-yakiimo', 'sweets-mixed-nuts', 'onigiri-salmon'] },
  },
]

export const IDEAL_MENUS: IdealMenu[] = [...FIRST_IDEAL_MENUS, ...MORE_IDEAL_MENUS]

const itemId = (x: IdealMenuItem) => (typeof x === 'string' ? x : x[0])
const itemPortion = (x: IdealMenuItem) => (typeof x === 'string' ? undefined : x[1])
const itemStep = (x: IdealMenuItem) => (typeof x === 'string' ? undefined : x[2])

// 献立に使う市販品が、いまのデータにすべてあるか（コンビニの商品は入れ替わるので、なくなったら献立ごと出さない）
export const idealMenuAvailable = (menu: IdealMenu, catalog: Catalog): boolean =>
  SLOTS.every((slot) =>
    menu.slots[slot].every((x) => {
      const jan = idealProductJan(x)
      return jan ? catalog.products.has(jan) : catalog.dishes.has(itemId(x))
    }),
  )

export const idealMenuHasProducts = (menu: IdealMenu): boolean => SLOTS.some((slot) => menu.slots[slot].some((x) => idealProductJan(x) !== null))

// 量の調整のしかた。staple は主食（ごはん・パン・麺・丼）、dish はおかず・汁物、fixed は1個・1杯で数えるもの（1個のまま）、
// count は市販品（おにぎりは1個ずつ、グラムの商品は刻みずつ増減する）
export type PortionRole = 'staple' | 'dish' | 'fixed' | 'count'
// 献立の中での役割。extra は足す一品（0 か献立の量）
type LineRole = PortionRole | 'extra'

// 1個・1パックで数えるおかず
const FIXED_DISHES = new Set(['ready-natto', 'boiled-egg', 'fried-egg', 'yasai-umeboshi'])

export function portionRole(dish: Dish): PortionRole {
  if (FIXED_DISHES.has(dish.id)) return 'fixed'
  switch (dish.category) {
    case 'staple':
    case 'bread':
    case 'noodle':
    case 'bowl':
      return 'staple'
    case 'main':
    case 'side':
    case 'soup':
      return 'dish'
    default:
      return 'fixed'
  }
}

// 人前の範囲。主食は小盛り〜大盛り、おかずは少し控えめ〜少し多め
const BOUNDS: Record<Exclude<PortionRole, 'count'>, [number, number]> = { staple: [0.5, 1.5], dish: [0.7, 1.5], fixed: [1, 1] }
// ごはん・パン・丼・麺は大盛り（1.5人前）まで。足りない分は足す一品で補う
export const stapleBounds = (_dish: Dish): [number, number] => BOUNDS.staple
// ごはんがこれをこえるときは、足す一品でごはんをへらす（ふつうの量の範囲）。こえた分の2乗 × STAPLE_WEIGHT を損とする
const STAPLE_COMFORT = 1.2
const STAPLE_WEIGHT = 10
// 毎食バランスの献立は、1食ずつ見てもごはんがふつうの量になるように、ごはんを増やすより一品を足すほうを選びやすくする
const STAPLE_WEIGHT_MEAL = 20
// 足す一品1品ぶんの損（violation の単位）。ごはんが1.4人前くらいまでなら、一品は足さずにごはんで合わせる
const EXTRA_COST = 0.5
// 市販品の量の範囲。おにぎり・食パンなど個数で数える主食は、小食の人なら1個へらす（1個は残す）。ふやすことはしない（ごはんと同じく、足す一品で補う）。
// サラダなどほかの1個・1食の商品は献立の量のまま（2個買うことはあまりないので）。
// グラムの商品は献立のグラムの2倍まで。刻み（step）があれば、刻み2つ分へらし・4つ分ふやすまで（ギョーザ6個なら4〜10個）
const COUNTED_STAPLES = new Set(['onigiri', 'bread'])
export function productBounds(product: Product, base: number, step = base): [number, number] {
  if (product.basis !== 'serving') return step >= base ? [base, base * 2] : [Math.max(step, base - 2 * step), base + 4 * step]
  return COUNTED_STAPLES.has(product.category) ? [Math.max(1, base - 1), base] : [base, base]
}
const boundsOf = (l: Line): [number, number] =>
  l.role === 'staple'
    ? stapleBounds(l.dish!)
    : l.role === 'count'
      ? l.product
        ? productBounds(l.product, l.base, stepOf(l))
        : [l.base, l.base]
      : l.role === 'extra'
        ? [0, l.base]
        : BOUNDS[l.role]

// 1日の食事の項目の量の調整のしかた（テスト・表示用）
export function menuItemRole(item: MenuItem, catalog: Catalog): PortionRole {
  if (item.kind === 'product') return 'count'
  return portionRole(catalog.dishes.get(item.refId)!)
}
// 献立を組んだときの1日の目安（女性30〜49歳・ふつう 2,040kcal に近い値）
export const IDEAL_REFERENCE_KCAL = 2000
// 最初に割り振るときのおかずの範囲（ここをこえる分は主食で合わせる）
const DISH_FIRST: [number, number] = [0.8, 1.15]

const clamp = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, v))
const round1 = (v: number) => Math.round(v * 10) / 10
// 量の刻み。市販品は1個・1パック（グラムで数えるものは献立に書いた刻み、なければ献立のグラム）、ほかは0.1人前
const stepOf = (l: Line) => (l.role !== 'count' ? 0.1 : !l.product || l.product.basis === 'serving' ? 1 : (l.step ?? l.base))
// 献立の量からのずれ（刻みの数）。同じくらいよくなるなら、ずれの小さい（自然な量の）ほうを選ぶのに使う
const drift = (ls: Line[]) => ls.reduce((a, l) => a + Math.abs(l.portion - l.base) / (l.role === 'count' ? stepOf(l) : 1), 0) * 1e-3
const roundFor = (l: Line, v: number) => (l.role === 'count' ? round1(Math.round(v / stepOf(l)) * stepOf(l)) : round1(v))

// dish か product のどちらか。kcal は portion 1 当たり（グラムで数える市販品は1g当たり）。step はグラムの商品の刻み
type Line = { slot: Slot; dish?: Dish; product?: Product; kcal: number; base: number; portion: number; role: LineRole; step?: number }

// 足す一品は uid でわかるようにする（一覧で「＋」をつける）
const EXTRA_UID = 'ideal-extra-'
export const isIdealExtra = (item: MenuItem): boolean => item.uid.startsWith(EXTRA_UID)

const toMenu = (lines: Line[]): DayMenu => {
  const menu: DayMenu = { breakfast: [], lunch: [], dinner: [], other: [] }
  lines.forEach((l, i) =>
    // 使わなかった足す一品（0人前）は入れない
    l.portion > 0 &&
    menu[l.slot].push(
      l.dish
        ? { uid: `${l.role === 'extra' ? EXTRA_UID : 'ideal-'}${i}`, kind: 'dish', refId: l.dish.id, portion: l.portion }
        : { uid: `${l.role === 'extra' ? EXTRA_UID : 'ideal-'}${i}`, kind: 'product', refId: l.product!.jan, portion: l.portion },
    ),
  )
  return menu
}

function toLine(slot: Slot, x: IdealMenuItem, catalog: Catalog): Line | null {
  const jan = idealProductJan(x)
  if (jan) {
    const product = catalog.products.get(jan)
    if (!product) return null
    const perGram = product.basis !== 'serving'
    const base = itemPortion(x) ?? (perGram ? (product.servingGrams ?? 100) : 1)
    const kcal = (product.nutrients.energyKcal ?? 0) / (perGram ? 100 : 1)
    return { slot, product, kcal, base, portion: base, role: 'count', step: perGram ? itemStep(x) : undefined }
  }
  const dish = catalog.dishes.get(itemId(x))
  if (!dish) return null
  const base = itemPortion(x) ?? 1
  // 1個・1杯で数える料理（果物・牛乳など）は、市販品と同じく1個で数える
  const role = portionRole(dish)
  return { slot, dish, kcal: dish.nutrients.energyKcal ?? 0, base, portion: base, role: role === 'fixed' ? 'count' : role }
}

// PFC・カロリー・食塩・飽和脂肪酸の外れ具合（0 なら全部おさまっている）。直すときの目安。
// slotTargets はごはんで合わせる区分の目安、fixedTargets はごはんのない朝・昼・晩の目安
function violation(
  lines: Line[],
  catalog: Catalog,
  targets: Targets,
  slotTargets: Partial<Record<Slot, number>>,
  fixedTargets: Partial<Record<Slot, number>>,
  perMeal: boolean,
): number {
  const t = menuTotals(toMenu(lines), catalog)
  const v = t.day.values
  let score = 0
  // 毎食バランスの献立は、朝・昼・晩それぞれでも区分の目安に収める
  if (perMeal) for (const slot of MEALS) score += mealViolation(t.bySlot[slot].values, slot, targets)
  // 1日のカロリーは目安の ±3% まで
  const dayErr = Math.abs(v.energyKcal - targets.energyKcal) / targets.energyKcal
  score += Math.max(0, dayErr - 0.03) ** 2 * 1e4
  // 朝・昼・晩は区分の目安の ±15% まで（「ちょうどいい」は ±20%）
  for (const slot of ['breakfast', 'lunch', 'dinner'] as const) {
    const goal = slotTargets[slot]
    if (!goal) continue
    const err = Math.abs(t.bySlot[slot].values.energyKcal - goal) / goal
    score += Math.max(0, err - 0.15) ** 2 * 1e3
  }
  // ごはんのない区分は、画面で「少なめ」「多め」と出ない ±19% まで。その他（間食）は多めにならないように
  for (const slot of SLOTS) {
    const goal = fixedTargets[slot]
    if (!goal) continue
    const kcal = t.bySlot[slot].values.energyKcal
    const err = slot === 'other' ? Math.max(0, kcal - goal) / goal : Math.abs(kcal - goal) / goal
    score += Math.max(0, err - SLOT_ENERGY_TOLERANCE + 0.01) ** 2 * 1e3
  }
  // ごはんはふつうの量（1.2人前）まで。こえる分は足す一品で補いたい
  // 一品を足した区分のごはんは1人前から（ごはんを減らして一品に置きかえない）
  const stapleWeight = perMeal ? STAPLE_WEIGHT_MEAL : STAPLE_WEIGHT
  for (const l of lines) {
    if (l.role !== 'staple') continue
    score += Math.max(0, l.portion - STAPLE_COMFORT) ** 2 * stapleWeight
    if (lines.some((x) => x.role === 'extra' && x.portion > 0 && x.slot === l.slot)) score += Math.max(0, 1 - l.portion) ** 2 * stapleWeight
  }
  // PFCは目標の範囲の内側 0.5% ポイントまで
  const ratio = pfcRatio(v)
  if (ratio) {
    for (const key of ['p', 'f', 'c'] as const) {
      const r = targets.pfcRatio[key]
      const out = Math.max(0, r.lo + 0.5 - ratio[key], ratio[key] - (r.hi - 0.5))
      score += out ** 2 * 10
    }
  }
  score += Math.max(0, v.salt - (targets.saltMax - 0.1)) ** 2 * 100
  score += Math.max(0, v.satFat - targets.satFatMaxG * 0.98) ** 2 * 10
  return score
}

const MEALS = ['breakfast', 'lunch', 'dinner'] as const
// 区分の目安（画面の「区分ごとのバランス」と同じ）。カロリーは10kcal単位、食塩・飽和脂肪酸は1日の目安 × 区分の割合
const mealGoals = (slot: Slot, targets: Targets) => {
  const share = targets.slotShare[slot]
  return { kcal: Math.round((targets.energyKcal * share) / 10) * 10, salt: targets.saltMax * share, satFat: targets.satFatMaxG * share }
}
// 1食の外れ具合。カロリーは区分の目安の ±15% まで（画面の「ちょうどいい」は ±20%）、PFCは目標の範囲の内側 0.5% ポイントまで、
// 食塩は区分の目安の 0.05g 手前まで、飽和脂肪酸は区分の目安の98%まで
function mealViolation(v: MenuTotals['day']['values'], slot: Slot, targets: Targets): number {
  if (targets.slotShare[slot] <= 0 || v.energyKcal <= 0) return 0
  const goal = mealGoals(slot, targets)
  let score = Math.max(0, Math.abs(v.energyKcal - goal.kcal) / goal.kcal - 0.15) ** 2 * 1e3
  const ratio = pfcRatio(v)
  if (ratio)
    for (const key of ['p', 'f', 'c'] as const) {
      const r = targets.pfcRatio[key]
      score += Math.max(0, r.lo + 0.5 - ratio[key], ratio[key] - (r.hi - 0.5)) ** 2 * 10
    }
  score += Math.max(0, v.salt - (goal.salt - 0.05)) ** 2 * 300
  score += Math.max(0, v.satFat - goal.satFat * 0.98) ** 2 * 100
  return score
}
// 1日と区分ごとの食塩
const saltsOf = (lines: Line[], catalog: Catalog) => {
  const t = menuTotals(toMenu(lines), catalog)
  return { day: t.day.values.salt, bySlot: Object.fromEntries(SLOTS.map((s) => [s, t.bySlot[s].values.salt])) as Record<Slot, number> }
}
type Salts = ReturnType<typeof saltsOf>
// 動かして食塩がふえ、目安ぎりぎりになるか（1日の目安から margin 手前をこえる。毎食バランスなら、ふやした区分の目安から margin / 2 手前をこえる）。
// 食塩のない一品（果物など）を足すだけなら、すでにぎりぎりでもとってよい
function tooSalty(before: Salts, after: Salts, targets: Targets, perMeal: boolean, margin: number, slot: Slot): boolean {
  const more = (a: number, b: number) => a > b + 0.005
  if (more(after.day, before.day) && after.day > targets.saltMax - margin) return true
  return perMeal && slot !== 'other' && more(after.bySlot[slot], before.bySlot[slot]) && after.bySlot[slot] > mealGoals(slot, targets).salt - margin / 2
}

// 理想の献立を、プロフィールの目安（targets）に合わせた量の1日の食事にする
export function adjustIdealMenu(menu: IdealMenu, catalog: Catalog, targets: Targets): DayMenu {
  return planIdealMenu(menu, catalog, targets).menu
}

// repairs は、配分どおりに割り振ったあと目安に収めるために動かした回数（0.1人前ずつ）
export function planIdealMenu(menu: IdealMenu, catalog: Catalog, targets: Targets, repair = true): { menu: DayMenu; repairs: number } {
  const share = targets.slotShare
  const lines: Line[] = []
  for (const slot of SLOTS) {
    if (share[slot] <= 0) continue
    for (const x of menu.slots[slot]) {
      const line = toLine(slot, x, catalog)
      if (line) lines.push(line)
    }
    // 足す一品は 0人前（使わない）から始める
    for (const x of menu.extras[slot] ?? []) {
      const line = toLine(slot, x, catalog)
      if (line) lines.push({ ...line, role: 'extra', portion: 0 })
    }
  }
  const kcalOf = (l: Line, portion = l.portion) => l.kcal * portion
  // 区分のカロリーに合わせるのは料理の主食だけ。市販品は、区分や1日のカロリー・PFCが合わないときに 3. 4. で1個・1パックずつ動かす
  // （コンビニのお昼などは、ふだん買う個数のままにしたいので）
  const adjustsKcal = (l: Line) => l.role === 'staple'

  // 1. おかず・汁物
  const g = clamp(Math.sqrt(targets.energyKcal / IDEAL_REFERENCE_KCAL), DISH_FIRST)
  for (const l of lines) if (l.role === 'dish') l.portion = round1(clamp(l.base * g, BOUNDS.dish))

  // 2. 主食のある区分で、残りのカロリーを配分どおりに分けて主食で合わせる（主食のない区分はそのまま）。
  //    パンなどが上限で足りない分は、まだ増やせる区分に配分の割合で回す
  const flexible = SLOTS.filter((s) => lines.some((l) => l.slot === s && adjustsKcal(l)))
  const shareSum = flexible.reduce((a, s) => a + share[s], 0)
  // 主食の量を決めなおし、ごはんで合わせる区分の目安を返す
  const distribute = () => {
    const restKcal = lines.filter((l) => !flexible.includes(l.slot)).reduce((a, l) => a + kcalOf(l), 0)
    const goals: Partial<Record<Slot, number>> = {}
    for (const slot of flexible) goals[slot] = ((targets.energyKcal - restKcal) * share[slot]) / shareSum
    const fill = (slot: Slot) => {
      const inSlot = lines.filter((l) => l.slot === slot)
      const staples = inSlot.filter(adjustsKcal)
      const others = inSlot.filter((l) => !adjustsKcal(l)).reduce((a, l) => a + kcalOf(l), 0)
      const h = (goals[slot]! - others) / staples.reduce((a, l) => a + kcalOf(l, l.base), 0)
      for (const l of staples) l.portion = roundFor(l, clamp(l.base * h, boundsOf(l)))
      return inSlot.reduce((a, l) => a + kcalOf(l), 0)
    }
    let open = [...flexible]
    for (let round = 0; round < 3 && open.length > 0; round++) {
      let left = 0
      for (const slot of open) left += goals[slot]! - fill(slot)
      const stuck = (slot: Slot) =>
        lines.filter((l) => l.slot === slot && adjustsKcal(l)).every((l) => l.portion === boundsOf(l)[left > 0 ? 1 : 0])
      open = open.filter((s) => !stuck(s))
      if (Math.abs(left) < 30 || open.length === 0) break
      const openShare = open.reduce((a, s) => a + share[s], 0)
      for (const slot of open) goals[slot]! += (left * share[slot]) / openShare
    }
    return goals
  }
  let goals = distribute()

  // 3. ごはんだけでは目安に合わない（ごはんが多すぎる・少なすぎる、主食のない区分のカロリーが外れる）ときに、
  //    足す一品を足す・やめる、主食のない区分の市販品を1個ずつ動かす。動かすたびに 2. をやりなおして、
  //    ほかの区分のごはんで1日のカロリーを合わせる。一品を足すのは本当に要るときだけ（1品ごとに少し損とする）
  const fixedSlots = SLOTS.filter((s) => !flexible.includes(s) && lines.some((l) => l.slot === s))
  const fixedTargets: Partial<Record<Slot, number>> = {}
  // 画面の区分の目安（slotBalance）と同じく10kcal単位に丸める
  for (const slot of fixedSlots) fixedTargets[slot] = Math.round((targets.energyKcal * share[slot]) / 10) * 10
  const perMeal = menu.balance === 'meal'
  const evaluate = () => violation(lines, catalog, targets, goals, fixedTargets, perMeal)
  const movable = lines.filter((l) => l.role === 'count' && fixedSlots.includes(l.slot) && l.slot !== 'other')
  const extras = lines.filter((l) => l.role === 'extra')
  const cost = () => evaluate() + drift(movable) + extras.filter((l) => l.portion > 0).length * EXTRA_COST
  let score = repair ? evaluate() : 0
  let total = repair ? cost() : 0
  let repairs = 0
  for (let step = 0; repair && step < 30; step++) {
    let best: { line: Line; portion: number; total: number } | null = null
    const moves: [Line, number][] = [
      ...movable.flatMap((l) => [-1, 1].map((sign): [Line, number] => [l, roundFor(l, l.portion + sign * stepOf(l))])),
      // 足す一品は区分ごとに書いた順に（食塩の少ないものから）。次に足せるのは、まだ使っていない一品のうち、
      // 足すと目安に近づく最初の1品（食塩が目安ぎりぎりになるもの・PFCが外れるものはとばす）
      ...extras.filter((l) => l.portion === 0).map((l): [Line, number] => [l, l.base]),
    ]
    const before = saltsOf(lines, catalog)
    const tried = new Set<Slot>()
    for (const [line, portion] of moves) {
      const [lo, hi] = boundsOf(line)
      if (portion < lo || portion > hi) continue
      const extra = line.role === 'extra'
      if (extra && tried.has(line.slot)) continue
      const saved = lines.map((l) => l.portion)
      const more = portion > line.portion
      line.portion = portion
      goals = distribute()
      // 食塩が目安ぎりぎりになる手はとらない（区分のカロリーより食塩を守る）
      const salty = more && tooSalty(before, saltsOf(lines, catalog), targets, perMeal, 0.2, line.slot)
      // 一品を足すのは、その区分のごはんがふつうの量（1人前）より少なくならないときだけ（ごはんを一品に置きかえない）
      const thin = extra && lines.some((l) => l.slot === line.slot && l.role === 'staple' && l.portion < 1)
      const s = cost()
      lines.forEach((l, i) => (l.portion = saved[i]))
      const better = !salty && !thin && s < total - 1e-9
      if (extra && better) tried.add(line.slot)
      if (better && (!best || s < best.total)) best = { line, portion, total: s }
    }
    goals = distribute()
    if (!best) break
    best.line.portion = best.portion
    goals = distribute()
    total = cost()
    repairs++
  }
  score = repair ? evaluate() : 0

  // 4. 目安から外れていれば 0.1人前ずつ直す（いちばんよくなる1手を選ぶのをくり返す）。
  // 同じ区分の主食（ごはんとおかゆなど）はいっしょに動かして、片方だけ大盛りにならないようにする。
  // 市販品（おにぎりなど）は1個ずつ別々に動かす
  const groups: Line[][] = []
  for (const l of lines) {
    if (l.role === 'fixed' || l.role === 'extra') continue
    const same = l.role === 'staple' ? groups.find((g) => g[0].role === 'staple' && g[0].slot === l.slot) : undefined
    if (same) same.push(l)
    else groups.push([l])
  }
  for (let step = 0; step < 60 && score > 0; step++) {
    let best: { group: Line[]; d: number; score: number } | null = null
    const before = saltsOf(lines, catalog)
    for (const group of groups) {
      for (const sign of [-1, 1]) {
        const d = sign * stepOf(group[0])
        const next = group.map((l) => roundFor(l, l.portion + d))
        if (next.some((p, i) => p < boundsOf(group[i])[0] || p > boundsOf(group[i])[1])) continue
        const prev = group.map((l) => l.portion)
        group.forEach((l, i) => (l.portion = next[i]))
        // 食塩が目安をこえそうになる手はとらない（カロリーが足りなくても、食塩を守る）
        const salty = d > 0 && tooSalty(before, saltsOf(lines, catalog), targets, perMeal, 0.1, group[0].slot)
        const s = evaluate() + drift(group)
        group.forEach((l, i) => (l.portion = prev[i]))
        if (!salty && s < score && (!best || s < best.score)) best = { group, d, score: s }
      }
    }
    if (!best) break
    for (const l of best.group) l.portion = roundFor(l, l.portion + best.d)
    score = evaluate()
    repairs++
  }
  return { menu: toMenu(lines), repairs }
}

export type IdealMenuSummary = {
  totals: MenuTotals
  checks: NutrientCheck[]
  kcal: number
  ratio: { p: number; f: number; c: number } | null
}

export function summarizeIdealMenu(menu: DayMenu, catalog: Catalog, targets: Targets): IdealMenuSummary {
  const totals = menuTotals(menu, catalog)
  return {
    totals,
    checks: nutrientChecks(totals.day, targets, undefined, totals.supplement),
    kcal: totals.day.values.energyKcal,
    ratio: pfcRatio(totals.day.values),
  }
}
