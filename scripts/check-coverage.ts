// 使い方: npx tsx scripts/check-coverage.ts
// data/coverage/everyday-dishes.txt の代表的な料理が、料理データ（郷土料理を除く）にあるかを調べる
import { readFileSync } from 'node:fs'
import type { Dish } from '../src/domain/types'
import { findMissing, parseChecklist } from './lib/coverage'

const items = parseChecklist(readFileSync('data/coverage/everyday-dishes.txt', 'utf8'))
const { dishes } = JSON.parse(readFileSync('public/data/dishes.json', 'utf8')) as { dishes: Dish[] }
const missing = findMissing(items, dishes)
console.log(`代表的な料理 ${items.length}品のうち ${items.length - missing.length}品あり、${missing.length}品なし`)
for (const m of missing) console.log(`  ${m.group}: ${m.names[0]}`)
process.exit(missing.length ? 1 : 0)
