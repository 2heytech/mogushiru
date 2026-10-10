import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Dish } from '../../src/domain/types'
import { findMissing, parseChecklist } from './coverage'

describe('代表的な料理のチェックリスト', () => {
  it('見出し・別名を読む', () => {
    expect(parseChecklist('# コメント\n【主食】\nごはん|白飯\n【麺】\nざるそば')).toEqual([
      { group: '主食', names: ['ごはん', '白飯'] },
      { group: '麺', names: ['ざるそば'] },
    ])
  })

  it('表記ゆれをそろえ、郷土料理は数えない', () => {
    const items = parseChecklist('【主食】\nオムライス\n【鍋】\n石狩鍋')
    const dishes = [
      { name: 'おむらいす', kana: '' },
      { name: '石狩鍋', kana: 'いしかりなべ', source: { label: '', url: '' } },
    ]
    expect(findMissing(items, dishes).map((m) => m.names[0])).toEqual(['石狩鍋'])
  })

  it('料理データにチェックリストの料理がすべてある', () => {
    const items = parseChecklist(readFileSync('data/coverage/everyday-dishes.txt', 'utf8'))
    const { dishes } = JSON.parse(readFileSync('public/data/dishes.json', 'utf8')) as { dishes: Dish[] }
    expect(findMissing(items, dishes).map((m) => `${m.group}: ${m.names[0]}`)).toEqual([])
  })
})
