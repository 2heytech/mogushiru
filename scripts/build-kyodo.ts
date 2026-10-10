// 使い方: npx tsx scripts/build-kyodo.ts
// data/raw/maff-kyodo.json（農水省「うちの郷土料理」の材料表）と data/kyodo/ingredients.yaml（材料名→成分表の対応表）から
// 1人前の料理レシピ data/recipes/kyodo.yaml を生成する。取り込めなかった料理と理由は data/kyodo/report.md に書く
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { parse } from 'yaml'
import type { Food } from '../src/domain/types'
import type { RecipeInput } from './lib/dishes'
import { buildRuleIndex, convertKyodo, type IngredientRule, type KyodoOverride } from './lib/kyodo'
import type { MaffRecipe } from './lib/maff'

// 1人前としてありえない値は取り込まない（材料表の読み違い・人数の書き方の違いを避ける）
// 調味料は煮汁に残る分も数えるので、汁物・麺以外で食塩が多すぎるもの（煮汁の多い煮物・漬物の下漬けなど）も外す
const KCAL = { min: 20, max: 1000, snackMax: 700 }
const SALT_MAX = { soup: 8, other: 6 }

const foods = new Map(
  (JSON.parse(readFileSync('public/data/foods.json', 'utf8')) as { foods: Food[] }).foods.map((f) => [f.id, f]),
)
const { recipes: raw } = JSON.parse(readFileSync('data/raw/maff-kyodo.json', 'utf8')) as { recipes: MaffRecipe[] }
const rules = parse(readFileSync('data/kyodo/ingredients.yaml', 'utf8')) as IngredientRule[]
const overrides: Record<string, KyodoOverride> = existsSync('data/kyodo/overrides.yaml')
  ? (parse(readFileSync('data/kyodo/overrides.yaml', 'utf8')) ?? {})
  : {}
const index = buildRuleIndex(rules)

// 既存の料理名（郷土料理と同じ名前なら県名を付ける）
const existingNames = new Set<string>()
for (const f of ['main', 'side', 'staple', 'drink-snack']) {
  for (const r of parse(readFileSync(`data/recipes/${f}.yaml`, 'utf8')) as RecipeInput[]) existingNames.add(r.name)
}

const ok: RecipeInput[] = []
const notesById = new Map<string, string[]>()
const failed: { r: MaffRecipe; reason: string }[] = []
for (const r of raw) {
  const res = convertKyodo(r, index, foods, overrides[r.id])
  if ('error' in res) {
    failed.push({ r, reason: res.error })
    continue
  }
  const n = res.recipe.ingredients.reduce(
    (s, i) => {
      const f = foods.get(i.foodId)!.per100g
      return { kcal: s.kcal + ((f.energyKcal ?? 0) * i.grams) / 100, salt: s.salt + ((f.salt ?? 0) * i.grams) / 100 }
    },
    { kcal: 0, salt: 0 },
  )
  const kcalMax = res.recipe.category === 'snack' ? KCAL.snackMax : KCAL.max
  if (n.kcal < KCAL.min || n.kcal > kcalMax) {
    failed.push({ r, reason: `1人前 ${Math.round(n.kcal)}kcal は範囲外` })
    continue
  }
  const saltMax = res.recipe.category === 'soup' || res.recipe.category === 'noodle' ? SALT_MAX.soup : SALT_MAX.other
  if (n.salt > saltMax) {
    failed.push({ r, reason: `1人前の食塩 ${n.salt.toFixed(1)}g は多すぎる` })
    continue
  }
  ok.push(res.recipe)
  notesById.set(res.recipe.id, res.notes)
}

// 同じ名前の料理（雑煮など）や既存の料理と同じ名前には県名を付ける
const count = new Map<string, number>()
for (const r of ok) count.set(r.name, (count.get(r.name) ?? 0) + 1)
for (const r of ok) {
  if ((count.get(r.name) ?? 0) > 1 || existingNames.has(r.name)) r.name = `${r.name}（${r.source!.region}）`
}

const header = [
  '# 郷土料理（自動生成。手で編集しない）',
  '# 生成: npx tsx scripts/build-kyodo.ts',
  '# 出典: 農林水産省ウェブサイト「うちの郷土料理」（https://www.maff.go.jp/j/keikaku/syokubunka/k_ryouri/）を加工して作成',
  '# 　　　公共データ利用規約 第1.0版。材料と分量を成分表の食品番号・1人前のグラムに換算した。写真・作り方は使っていない',
  '',
].join('\n')
const q = (v: string) => JSON.stringify(v)
const body = ok
  .map((r) => {
    const notes = notesById.get(r.id) ?? []
    return [
      ...(notes.length ? [`# ${notes.join('。')}`] : []),
      `- id: ${r.id}`,
      `  name: ${q(r.name)}`,
      `  kana: ${q(r.kana)}`,
      `  category: ${r.category}`,
      `  suggestedSlots: [${r.suggestedSlots.join(', ')}]`,
      `  source: { label: ${q(r.source!.label)}, url: ${q(r.source!.url)}, region: ${q(r.source!.region ?? '')} }`,
      '  ingredients:',
      ...r.ingredients.map((i) => `    - { foodId: "${i.foodId}", grams: ${i.grams} } # ${foods.get(i.foodId)!.displayName}`),
      '',
    ].join('\n')
  })
  .join('\n')
writeFileSync('data/recipes/kyodo.yaml', header + body)

const byReason = new Map<string, number>()
for (const f of failed) {
  const key = f.reason.replace(/（.*$/, '').replace(/[\d.]+/g, 'N')
  byReason.set(key, (byReason.get(key) ?? 0) + 1)
}
const report = [
  '# 郷土料理の取り込み結果',
  '',
  `農水省「うちの郷土料理」の材料表 ${raw.length}件のうち、${ok.length}品を料理データに取り込んだ。取り込めなかった ${failed.length}件の理由は次のとおり（\`npx tsx scripts/build-kyodo.ts\` で再生成）。`,
  '',
  '| 理由 | 件数 |',
  '|---|---|',
  ...[...byReason].sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`),
  '',
  '## 一覧',
  '',
  ...failed.map((f) => `- ${f.r.name}（${f.r.pref}）: ${f.reason}`),
  '',
].join('\n')
writeFileSync('data/kyodo/report.md', report)
console.log(`郷土料理 ${ok.length}品を data/recipes/kyodo.yaml に書き出しました（取り込めなかったもの ${failed.length}件）`)
for (const [k, v] of [...byReason].sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`)
