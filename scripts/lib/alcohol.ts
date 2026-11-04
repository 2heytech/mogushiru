// お酒のアルコール量。表示に書かれていないお酒は、商品名の度数か、表示のエネルギーから推定する

// 度数（% vol）→ 純アルコール量 g/100mL（エタノールの比重 0.8）
export function alcoholVolToG(percentVol: number): number {
  return percentVol * 0.8
}

// 名前に「酒」「ワイン」が入るが、お酒として飲むものではない食品のカテゴリ（酒蒸し・甘酒・酒まんじゅう・料理酒など）。
// お酒のカテゴリに入っていたものだけに使う
const NOT_DRINK: [RegExp, string][] = [
  [/酒蒸し|ワイン蒸し|ワイン煮/, 'side'],
  [/まんじゅう|饅頭/, 'dessert'],
  [/甘酒|あまざけ|お酒にプラス/, 'drink'],
  [/料理酒|料理用|レモン果汁/, 'seasoning'],
]

export function notDrinkCategory(name: string): string | null {
  const t = name.normalize('NFKC')
  return NOT_DRINK.find(([re]) => re.test(t))?.[1] ?? null
}

// 商品名の度数（「焼酎25度」「Alc.37%」「アルコール分9%」）。ノンアルコールは 0。「糖質70%オフ」などは読まない
const ABV = [/(\d+(?:\.\d+)?)\s*度/, /alc\.?\s*(\d+(?:\.\d+)?)\s*%/i, /アルコール(?:分|度数)?\s*(\d+(?:\.\d+)?)\s*%/]
const NON_ALCOHOLIC = /ノンアルコール|アルコールフリー|0\.00\s*%/

export function abvFromName(name: string): number | null {
  const t = name.normalize('NFKC')
  if (NON_ALCOHOLIC.test(t)) return 0
  for (const re of ABV) {
    const m = t.match(re)
    if (m && Number(m[1]) <= 100) return Number(m[1])
  }
  return null
}

export type AlcoholEstimate = { grams: number; from: 'name' | 'energy' }

// 表示の値（basis 当たり）から純アルコール量（g）を推定する。basisMl は表示が何mL当たりか（分からなければなし）。
// 度数が分かればそれから、なければエネルギーからたんぱく質・脂質・炭水化物の分を引いた残りをアルコール（1gで7kcal）とみる。
// 表示の数値の丸めで少しずれるので、0.5g未満は 0（ノンアルコール）とする
export function estimateAlcohol(
  name: string,
  n: { energyKcal: number | null; protein: number | null; fat: number | null; carb: number | null },
  basisMl?: number,
): AlcoholEstimate | null {
  const abv = abvFromName(name)
  if (abv !== null && (abv === 0 || basisMl)) return { grams: round1((alcoholVolToG(abv) * (basisMl ?? 0)) / 100), from: 'name' }
  if (n.energyKcal === null || n.protein === null || n.fat === null || n.carb === null) return null
  const rest = (n.energyKcal - 4 * n.protein - 9 * n.fat - 4 * n.carb) / 7
  return { grams: rest < 0.5 ? 0 : round1(rest), from: 'energy' }
}

const round1 = (v: number) => Math.round(v * 10) / 10
