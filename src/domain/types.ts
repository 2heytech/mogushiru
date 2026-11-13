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
  'magnesium', // mg
  'zinc', // mg
  'vitaminA', // µg（レチノール活性当量）
  'retinol', // µg（レチノール。ビタミンAの耐容上限量の判定に使う）
  'vitaminD', // µg
  'vitaminE', // mg（α-トコフェロール）
  'vitaminB1', // mg
  'vitaminB2', // mg
  'niacin', // mgNE（ナイアシン当量）
  'vitaminB6', // mg
  'folate', // µg（葉酸）
  'vitaminC', // mg
  'caffeine', // mg（成分表は備考に記載）
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
  recipe?: DishRecipe // 作り方（あるものだけ）
}

// 料理の作り方。材料の分量は ingredients（栄養の計算と同じ材料表）から出すので、手順の文には分量を書かない
// （人前や材料を変えても、文が食い違わないように）
export type DishRecipe = {
  minutes: number // 調理時間の目安（分）
  steps: string[]
  // 栄養に数えていない材料（水・揚げ油など）。amount は1人前あたりで、なければ「適量」
  extras?: RecipeExtra[]
  // 作るときの材料（1人前）。成分表の「できあがりの料理」を1つの材料にしている料理（唐揚げ・とんかつなど）だけ書く。
  // あれば、作り方の画面では ingredients のかわりにこれを出す
  materials?: RecipeMaterial[]
  // 材料の下に出すひとこと（「魚の重さは焼いたあとの重さ」など）
  note?: string
}

export type RecipeExtra = { name: string; amount?: number; unit?: string }

// foodId があれば「大さじ1」「1/2個」などの目安を添える。grams がなければ「適量」
export type RecipeMaterial = { name: string; grams?: number; foodId?: string }

// 料理のレシピの出典（郷土料理など）
export type DishSource = {
  label: string // 例: 農林水産省「うちの郷土料理」
  url: string
  region?: string // 都道府県
}

// 市販品マスター（コンビニ各社の公式サイト・Open Food Facts）
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
  // コンビニの商品（jan は "seven-" などの店の略号と各社の商品番号）とメーカー公式サイトから取った商品は、
  // name に会社名、url に商品ページを持つ
  // alcoholEstimated: 表示にアルコール量がないお酒で、商品名の度数（name）か表示のエネルギー（energy）から求めた
  source: { name: string; url?: string; fetchedAt: string; saltConverted?: boolean; alcoholEstimated?: 'name' | 'energy' }
}

// ブラウザに保存するもの
export type MyDish = {
  id: string
  baseDishId: string | null
  name: string
  ingredients: Ingredient[]
  // 選んだときの人前（材料は1人前あたり）。なければ1人前
  portion?: number
  // 料理をえらぶ画面で上に出す区分（朝・昼・晩・その他）。なければすべての区分
  slots?: Slot[]
  createdAt: string
  // 最後に保存した日時。料理をえらぶ画面で新しいものから上に並べる
  updatedAt?: string
}

// portion: dish・myDish・product(serving) は人前倍率、food・product(100g/100ml) はグラム（mL）、supplement は回数。
// supplement は登録したサプリ（refId は Product の jan）。通常の食品以外からとった分として、上限の判定で見分けられるよう種類を分ける
export type MenuItem = {
  uid: string
  kind: 'dish' | 'myDish' | 'product' | 'food' | 'supplement'
  refId: string
  portion: number
  // 料理を献立の中だけでアレンジした材料（kind: 'dish'・'myDish' のとき）
  customIngredients?: Ingredient[]
}

export type DayMenu = Record<Slot, MenuItem[]>

export type Sex = 'male' | 'female'
export type Activity = 'low' | 'normal' | 'high'
export type Goal = 'lose' | 'keep' | 'gain'

// ふだんの運動。type は EXERCISE_TYPES（src/domain/energy.ts）の id。minutes は1回の時間（分）、
// steps があれば歩数から時間に直す。perWeek は週の回数（1〜7）。mets は「そのほか」で入れた強さ
export type Exercise = { type: string; minutes: number; steps?: number; perWeek: number; mets?: number }

export type Profile = {
  sex: Sex
  age: number
  heightCm?: number
  weightKg?: number
  activity: Activity
  goal?: Goal
  // 女性の鉄の推奨量を選ぶため。未設定なら50歳未満は「あり」として扱う
  menstruation?: boolean
  // 1日の目安を朝・昼・晩・その他に分ける割合（％、合計100）。未設定なら 25:35:30:10
  slotShare?: Record<Slot, number>
  // ふだんの運動。activity は運動をのぞいた生活の動きとして、運動の分はここから足す
  exercises?: Exercise[]
}
