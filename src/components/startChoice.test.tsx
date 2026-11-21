import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { DaySummary } from '../domain/daySummary'
import type { ResultPreview } from '../domain/resultPreview'
import { DaySummaryView } from './DaySummaryView'
import { ResultExample, StartChoice } from './StartChoice'

const noop = () => {}

// テスト用の架空の結果（値は実データではない）
const summary = (over: Partial<DaySummary> = {}): DaySummary => ({
  state: 'full',
  missing: [],
  ok: ['energy', 'pfc'],
  near: [],
  concerns: [
    { kind: 'vegetable', rest: 120 },
    { kind: 'fruit', rest: 200 },
  ],
  steps: [{ kind: 'addDish', slot: 'dinner', part: 'side', why: 'vegetable' }, { kind: 'addFruit' }],
  mood: 'okay',
  ...over,
})
const preview = (over: Partial<ResultPreview> = {}): ResultPreview => ({
  name: 'テストの献立',
  count: 12,
  kcal: 1980,
  targetKcal: 2000,
  gaps: [
    { key: 'p', ratio: 16, range: { lo: 13, hi: 20 }, gap: 0, grams: 80, kcal: 320 },
    { key: 'f', ratio: 32, range: { lo: 20, hi: 30 }, gap: 2, grams: 70, kcal: 630 },
    { key: 'c', ratio: 52, range: { lo: 50, hi: 65 }, gap: 0, grams: 260, kcal: 1040 },
  ] as ResultPreview['gaps'],
  summary: summary(),
  ...over,
})

const start = (props: Partial<Parameters<typeof StartChoice>[0]> = {}) =>
  renderToStaticMarkup(<StartChoice savedCount={0} onResume={noop} onPickSelf={noop} onBuild={noop} onOpenSaved={noop} onArrange={noop} onTrySample={noop} {...props} />)

// 色をぬったボタン（主ボタン）の数。「bg-coral/20」のようなうすい色は数えない
const filledButtons = (html: string) => (html.match(/<button[^>]*class="[^"]*\bbg-coral(?![/\w-])[^"]*"[^>]*>/g) ?? []).length

describe('最初の画面', () => {
  it('結果の例を、入口より先に見せる（何も押さなくても、結果の画面のイメージが見える）', () => {
    const html = start({ preview: preview() })
    expect(html).toContain('結果の例')
    expect(html).toContain('テストの献立（12品）')
    expect(html).toContain('1,980')
    expect(html).toContain('気になる点')
    expect(html.indexOf('結果の例')).toBeLessThan(html.indexOf('なにから始める？'))
    expect(html.indexOf('この例で結果の画面を見る')).toBeLessThan(html.indexOf('献立の例から選ぶ'))
  })

  it('色をぬった主ボタンは「献立の例から選ぶ」の1つだけ。入口の順は、献立の例から選ぶ → 自分の食事で試す', () => {
    for (const html of [start({ preview: preview() }), start({ previewLoading: true, previewName: 'テストの献立' }), start(), start({ preview: preview(), savedCount: 3, current: { count: 4, kcal: 800 } })]) {
      expect(filledButtons(html)).toBe(1)
      const primary = /<button[^>]*class="[^"]*\bbg-coral(?![/\w-])[^"]*"[^>]*>[\s\S]*?<\/button>/.exec(html)?.[0] ?? ''
      expect(primary).toContain('献立の例から選ぶ')
      expect(html.indexOf('献立の例から選ぶ')).toBeLessThan(html.indexOf('自分の食事で試す'))
      // もとの3つ目の入口は、結果の例のボタンになった
      expect(html).not.toContain('サンプルで結果を見る')
    }
  })

  it('データを読み込んでいるあいだも、結果の例の枠を同じ中身でとっておく（読み終えたときに下が動かないように）', () => {
    const html = start({ previewLoading: true, previewName: 'テストの献立' })
    expect(html).toContain('結果の例を計算しています…')
    expect(html).toContain('aria-busy="true"')
    // 中身は見えない形で置く（ボタンも、高さをとるために置いておく）
    expect(html).toContain('invisible')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('この例で結果の画面を見る')
    // 入口は、読み込みを待たずに出す
    expect(html).toContain('献立の例から選ぶ')
    expect(html).toContain('自分の食事で試す')
  })

  it('結果の例を出せないとき（データを読み込めなかった）は、枠を出さずに入口だけにする', () => {
    const html = start()
    expect(html).not.toContain('結果の例')
    expect(html).toContain('献立の例から選ぶ')
  })

  it('料理が入っているときは、いちばん上に「いまの1日の食事にもどる」。カロリーは、分かってから出す', () => {
    expect(start({ current: { count: 4, kcal: 812.4 } })).toContain('4品・812 kcal')
    const waiting = start({ current: { count: 4 } })
    expect(waiting).toContain('4品')
    expect(waiting).not.toContain('kcal</span>')
    expect(waiting.indexOf('いまの1日の食事にもどる')).toBeLessThan(waiting.indexOf('新しく始めるなら'))
  })
})

describe('結果の例', () => {
  const example = (p?: ResultPreview, loading = false) => renderToStaticMarkup(<ResultExample preview={p} loading={loading} name="テストの献立" onOpen={noop} />)

  it('気になる点は1つだけ書き、のこりは件数で出す', () => {
    const html = example(preview())
    expect(html).toContain('気になる点</strong>')
    expect(html).toContain('ほか1件')
    expect(example(preview({ summary: summary({ concerns: [{ kind: 'vegetable', rest: 120 }] }) }))).not.toContain('ほか')
  })

  it('気になる点がなければ、範囲内と書く', () => {
    const html = example(preview({ summary: summary({ concerns: [], steps: [], mood: 'happy' }) }))
    expect(html).toContain('カロリーもバランスも、目安の範囲内')
    expect(html).not.toContain('気になる点')
  })

  it('PFCバランスは、範囲内は「◎」、外れているものは「少なめ」「多め」', () => {
    // カロリーは範囲内（◎）、たんぱく質と炭水化物は範囲内（◎）、脂質は多め
    const html = example(preview())
    expect(html.match(/◎/g)).toHaveLength(3)
    expect(html.match(/多め/g)).toHaveLength(1)
    expect(html).not.toContain('少なめ')
    // カロリーが目安の±10%の外なら、カロリーにも印を出す
    expect(example(preview({ kcal: 1500 })).match(/少なめ/g)).toHaveLength(1)
    expect(example(preview({ kcal: 2500 })).match(/多め/g)).toHaveLength(2)
  })

  it('読み込んでもいないし、結果もないときは何も出さない', () => {
    expect(example(undefined, false)).toBe('')
    expect(example(undefined, true)).toContain('結果の例を計算しています…')
  })
})

describe('まとめを2つに分けて出す（スマホは、気になる点と次に試すことを先頭に置く）', () => {
  const view = (s: DaySummary, part?: 'attention' | 'ok') => renderToStaticMarkup(<DaySummaryView summary={s} onStep={noop} part={part} />)

  it('分けないときは、目安の範囲内 → 気になる点 → 次に試すこと', () => {
    const html = view(summary())
    const at = ['目安の範囲内', '気になる点', '次に試すこと'].map((t) => html.indexOf(t))
    expect(at.every((i) => i >= 0)).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
  })

  it('attention：気になる点と、次に試すこと（ボタンつき）だけ', () => {
    const html = view(summary(), 'attention')
    expect(html).toContain('気になる点')
    expect(html).toContain('次に試すこと')
    expect(html).toContain('<button')
    expect(html).not.toContain('目安の範囲内')
  })

  it('ok：目安の範囲内だけ', () => {
    const html = view(summary(), 'ok')
    expect(html).toContain('目安の範囲内')
    expect(html).not.toContain('気になる点')
    expect(html).not.toContain('次に試すこと')
  })

  it('入力の途中は attention のほうに出す', () => {
    const partial = summary({ state: 'partial', missing: ['dinner'], ok: [], concerns: [], steps: [{ kind: 'addMeal', slot: 'dinner' }] })
    expect(view(partial, 'attention')).toContain('入力の途中')
    expect(view(partial, 'ok')).toBe('')
  })

  it('出すものがないほうは、何も出さない（空の枠を残さない）', () => {
    expect(view(summary({ concerns: [], steps: [] }), 'attention')).toBe('')
    expect(view(summary({ ok: [] }), 'ok')).toBe('')
    expect(view(summary({ state: 'empty' }))).toBe('')
  })
})
