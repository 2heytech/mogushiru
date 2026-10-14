// 使い方: npx tsx scripts/check-makers.ts
// data/makers/*.json の商品ページを取り直し、記録したエネルギーの値がまだページに載っているかを確かめる
// （リニューアルや終売でページが変わった商品を見つけ、表示を見直すため）
// 表示が画像だけのページ（丸美屋）と、値をあとから読み込むページ（山崎製パン）は、ここでは見つからないと出るのでブラウザで確かめる
import { readMakerLabels } from './lib/makers'

const USER_AGENT = 'Mozilla/5.0 (compatible; MogushiruBot/0.1; +https://github.com/2heytech/mogushiru)'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const items = readMakerLabels()
const changed: string[] = []
// 一覧表のページなど、同じページの商品はまとめて1回だけ取り直す
const byUrl = new Map<string, typeof items>()
for (const item of items) byUrl.set(item.url.split('#')[0], [...(byUrl.get(item.url.split('#')[0]) ?? []), item])
for (const [url, group] of byUrl) {
  await sleep(1000)
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    // 全角の数字・単位（「３１２ｋｃａｌ」）もそろえて探す
    const text = (await res.text()).replace(/<[^>]+>/g, ' ').normalize('NFKC')
    for (const item of group) {
      // 「350kcal」のほか、表の見出しが「エネルギー(kcal)」で値が別のセルにある形も探す
      const value = String(item.energyKcal).replace('.', '\\.')
      const found = new RegExp(`(^|[^0-9.])${value}\\s*kcal`, 'i').test(text) || (/kcal/i.test(text) && new RegExp(`(エネルギー|熱量)[\\s\\S]{0,400}(^|[^0-9.])${value}($|[^0-9.])`).test(text))
      if (!res.ok || !found) changed.push(`${item.jan} ${item.name}: ${res.ok ? 'エネルギーの値が見つからない' : `HTTP ${res.status}`}（${item.url}）`)
    }
  } catch (e) {
    for (const item of group) changed.push(`${item.jan} ${item.name}: 取得できない（${(e as Error).message}）`)
  }
}
console.log(changed.length ? `見直しが必要 ${changed.length}品:\n${changed.join('\n')}` : `${items.length}品すべて、ページの値は変わっていません`)
