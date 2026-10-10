// 栄養素のキー。値は 1人前・100g などの基準ごとの量
export const NUTRIENT_KEYS = [
  'energyKcal', // kcal
  'protein', // g
  'fat', // g
  'carb', // g
  'fiber', // g
  'salt', // g（食塩相当量）
  'alcohol', // g
  'satFat', // g（飽和脂肪酸）
  'monoUnsatFat', // g（一価不飽和脂肪酸）
  'polyUnsatFat', // g（多価不飽和脂肪酸。n-3系・n-6系を含む）
  'n3Fat', // g（n-3系多価不飽和脂肪酸）
  'n6Fat', // g（n-6系多価不飽和脂肪酸）
  'calcium', // mg
  'iron', // mg
  'potassium', // mg
  'vitaminA', // µg（レチノール活性当量）
  'retinol', // µg（レチノール。ビタミンAの耐容上限量の判定に使う）
  'vitaminD', // µg
  'vitaminB1', // mg
  'vitaminB2', // mg
  'vitaminC', // mg
] as const

export type NutrientKey = (typeof NUTRIENT_KEYS)[number]

// null = 未測定。0（含まない・微量）とは区別する
export type NutrientValue = number | null
export type Nutrients = Record<NutrientKey, NutrientValue>

// 合算結果。欠損があった栄養素を記録して「一部未収録」を表示できるようにする
export type NutrientTotals = {
  values: Record<NutrientKey, number>
  missing: Set<NutrientKey>
}

// 食品マスター（文部科学省 日本食品標準成分表）
export type Food = {
  id: string // 食品番号。先頭0を保つため文字列
  name: string // 原表の食品名
  displayName: string
  kana: string
  group: string
  per100g: Nutrients
  traceFlags?: NutrientKey[]
  unitWeights?: { label: string; grams: number }[]
}

export type Ingredient = {
  foodId: string
  grams: number
  role?: string
  alternatives?: string[]
}

export type DishCategory =
  | 'staple'
  | 'main'
  | 'side'
  | 'soup'
  | 'noodle'
  | 'bowl'
  | 'bread'
  | 'snack'
  | 'drink'
  | 'alcohol'

export const SLOTS = ['breakfast', 'lunch', 'dinner', 'other'] as const
export type Slot = (typeof SLOTS)[number]

// 料理マスター（1人前）
export type Dish = {
  id: string
  name: string
  kana: string
  category: DishCategory
  suggestedSlots: Slot[]
  illustration: string
  ingredients: Ingredient[]
  nutrients: Nutrients // ビルド時に事前計算
  missingNutrients?: NutrientKey[] // 材料に未測定の成分を含むもの
  source?: DishSource // 外部のレシピをもとにした料理の出典
}

// 料理のレシピの出典（郷土料理など）
export type DishSource = {
  label: string // 例: 農林水産省「うちの郷土料理」
  url: string
  region?: string // 都道府県
}

// 市販品マスター（Open Food Facts）
export type Product = {
  jan: string // 先頭0を落とさない文字列
  name: string
  brand: string
  category: string
  basis: '100g' | '100ml' | 'serving'
  servingGrams?: number
  servingLabel?: string // 1回分の量の表示（サプリの「2粒」など）
  nutrients: Nutrients // basis 当たり
  // ユーザー登録：栄養成分表示を見てブラウザに保存した市販品（jan は "my-" で始まる）
  source: { name: 'Open Food Facts' | 'ユーザー登録'; fetchedAt: string; saltConverted?: boolean }
}

// ブラウザに保存するもの
export type MyDish = {
  id: string
  baseDishId: string | null
  name: string
  ingredients: Ingredient[]
  createdAt: string
}

// portion: dish・myDish・product(serving) は人前倍率、food・product(100g/100ml) はグラム（mL）、supplement は回数。
// supplement は登録したサプリ（refId は Product の jan）。通常の食品以外からとった分として、上限の判定で見分けられるよう種類を分ける
export type MenuItem = {
  uid: string
  kind: 'dish' | 'myDish' | 'product' | 'food' | 'supplement'
  refId: string
  portion: number
  // 料理を献立の中だけでアレンジした材料（kind: 'dish' のとき）
  customIngredients?: Ingredient[]
}

export type DayMenu = Record<Slot, MenuItem[]>

export type Sex = 'male' | 'female'
export type Activity = 'low' | 'normal' | 'high'
export type Goal = 'lose' | 'keep' | 'gain'

export type Profile = {
  sex: Sex
  age: number
  heightCm?: number
  weightKg?: number
  activity: Activity
  goal?: Goal
  // 女性の鉄の推奨量を選ぶため。未設定なら50歳未満は「あり」として扱う
  menstruation?: boolean
}
