import type { RankingRow } from '../domain/ranking'
import type { Food } from '../domain/types'
import { RAKUTEN_AFFILIATE_ID } from '../site'

// 楽天アフィリエイト：成分のページの「〜が多い食品を楽天市場でさがす」の欄（nutrientPages.tsx）。
// - 行き先は、楽天市場の検索結果（食品の名前でさがす）。商品を1つずつ選んで載せることはしない（値段や在庫が変わっても、リンクが古くならない）
// - 文字のリンクだけ。楽天のプログラム（ウィジェット）や画像は読みこまないので、ページを開いただけでは楽天に何も送られない
// - 出す食品は、ランキング（ふだん1回に食べる量）の上位から順に選ぶ。広告のために順位や数値を変えない
// - アフィリエイトの ID（src/site.ts）が空・形がちがうときは、リンクも「広告」の表示も出さない

const ID_FORM = /^[0-9a-f]{8}(\.[0-9a-f]{8}){3}$/i

// ID が使える形か（8桁の英数字を「.」で4つつないだもの）
export const rakutenEnabled = (id: string = RAKUTEN_AFFILIATE_ID): boolean => ID_FORM.test(id)

// 楽天市場のジャンル。検索を食べ物にしぼる（名前だけでさがすと、同じ名前の食べ物でないものがまじるおそれがあるため）
const GENRE = {
  food: '100227', // 食品
  drink: '100316', // 水・ソフトドリンク
} as const
// all：ジャンルでしぼらない（お菓子・菓子パンは「スイーツ・お菓子」と「食品」に分かれているので）
export type RakutenGenre = keyof typeof GENRE | 'all'

export type RakutenSearch = { word: string; genre: RakutenGenre }

// 楽天市場の検索結果のアドレス
export function rakutenSearchUrl({ word, genre }: RakutenSearch): string {
  return `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(word)}/${genre === 'all' ? '' : `${GENRE[genre]}/`}`
}

// 楽天のアドレスを、アフィリエイトのリンクにする。ID が使えなければ null
export function rakutenAffiliateUrl(url: string, id: string = RAKUTEN_AFFILIATE_ID): string | null {
  if (!rakutenEnabled(id)) return null
  return `https://hb.afl.rakuten.co.jp/hgc/${id}/?pc=${encodeURIComponent(url)}&link_type=text`
}

// 食品ごとの「さがす言葉」。書いていない食品は、名前からかっこ（「（生）」「（ゆで）」など）を取った言葉でさがす。
// - word：楽天市場でさがす言葉。成分表の言い方より、店で使われる言い方にする（「オリーブ油」→「オリーブオイル」）
// - label：欄に出す名前（書かなければ、名前からかっこを取ったもの）。同じ label の食品は、順位が上の1つだけ出す
// - genre：ジャンル（書かなければ、飲み物は drink、お菓子・菓子パンは all、ほかは food）
// - null：出さない（葉だけでは売られていない、など）
type Entry = { word: string; label?: string; genre?: RakutenGenre } | null
const SEARCH: Record<string, Entry> = {
  // 穀類
  '01048': { word: '中華麺', label: '中華めん' },
  '01049': { word: '焼きそば 麺', label: '焼きそばのめん' },
  '01085': { word: '玄米', label: '玄米' },
  '01088': { word: '白米', label: '白米' },
  '01144': { word: 'インスタントラーメン', label: 'インスタントラーメン' },
  '01150': { word: '冷麺', label: '冷めん' },
  '01154': { word: 'おこわ', label: 'おこわ' },
  '01170': { word: '押麦', label: '押麦' },
  '01200': { word: 'カップ麺', label: 'カップめん' },
  // いも
  '02008': { word: '焼き芋', label: '焼きいも' },
  '02009': { word: '干し芋', label: '干しいも' },
  '02010': { word: '里芋', label: 'さといも' },
  '02011': { word: '里芋', label: 'さといも' },
  '02012': { word: '里芋', label: 'さといも' },
  '02025': { word: '大和芋', label: 'やまといも' },
  // 豆
  '04001': { word: '小豆', label: 'あずき' },
  '04052': { word: '無調整豆乳', label: '無調整豆乳', genre: 'drink' },
  '04053': { word: '調製豆乳', label: '調製豆乳', genre: 'drink' },
  '04055': { word: '大豆ミート', label: '大豆たんぱく' },
  '04078': { word: '煎り大豆', label: 'いり大豆' },
  // ナッツ
  '05001': { word: '素焼きアーモンド', label: 'アーモンド' },
  '05040': { word: '素焼きアーモンド', label: 'アーモンド' },
  '05014': { word: 'くるみ 無塩', label: 'くるみ' },
  // 野菜・果物
  '06034': null,
  '06130': null,
  '06185': { word: 'トマトジュース', genre: 'drink' },
  '06247': { word: 'パプリカ 野菜', label: 'パプリカ' },
  '06249': { word: 'パプリカ 野菜', label: 'パプリカ' },
  '06267': { word: 'ほうれん草', label: 'ほうれんそう' },
  '06268': { word: 'ほうれん草', label: 'ほうれんそう' },
  '06269': { word: 'ほうれん草', label: 'ほうれんそう' },
  '06274': { word: '三つ葉', label: 'みつば' },
  '06399': { word: '野菜ジュース', genre: 'drink' },
  '07042': { word: 'オレンジジュース', label: 'オレンジジュース', genre: 'drink' },
  // 魚介
  '10005': { word: 'あじ 干物', label: 'あじ' },
  '10026': { word: '鮎', label: 'あゆ' },
  '10069': { word: 'うなぎ 白焼き', label: 'うなぎの白焼き' },
  '10070': { word: 'うなぎ 蒲焼き', label: 'うなぎのかば焼き' },
  '10086': { word: 'かつお 刺身', label: 'かつお' },
  '10100': { word: 'カレイ', label: 'かれい' },
  '10101': { word: 'カレイ', label: 'かれい' },
  '10102': { word: 'カレイ', label: 'かれい' },
  '10115': { word: '銀だら', label: 'ぎんだら' },
  '10134': { word: '鮭 切り身', label: '鮭' },
  '10136': { word: '鮭 切り身', label: '鮭' },
  '10139': { word: '塩鮭', label: '塩ざけ' },
  '10140': { word: 'いくら', label: 'イクラ' },
  '10141': { word: '筋子', label: 'すじこ' },
  '10150': { word: '紅鮭', label: '紅ざけ' },
  '10154': { word: 'さば 切り身', label: 'さば' },
  '10155': { word: 'さば 切り身', label: 'さば' },
  '10156': { word: 'さば 切り身', label: 'さば' },
  '10164': { word: 'サバ缶 水煮', label: 'さば水煮缶' },
  '10165': { word: 'サバ缶 味噌煮', label: 'さばみそ煮缶' },
  '10172': { word: 'さわら 切り身', label: 'さわら' },
  '10193': { word: '真鯛', label: 'たい' },
  '10195': { word: '真鯛', label: 'たい' },
  '10198': { word: '太刀魚', label: 'たちうお' },
  '10202': { word: 'たらこ', label: 'たらこ' },
  '10203': { word: 'たらこ', label: 'たらこ' },
  '10241': { word: 'ぶり 切り身', label: 'ぶり' },
  '10242': { word: 'ぶり 切り身', label: 'ぶり' },
  '10253': { word: 'まぐろ 赤身', label: 'まぐろ赤身' },
  '10263': { word: 'ツナ缶', label: 'ツナ缶' },
  '10292': { word: '牡蠣', label: 'かき（牡蠣）' },
  '10412': { word: 'ほっけ 開き', label: 'ほっけの開き' },
  '10459': { word: 'まぐろ トロ', label: 'まぐろトロ' },
  // 肉
  '11015': { word: '和牛 サーロイン', label: '和牛サーロイン' },
  '11034': { word: '牛肩ロース', label: '牛かたロース' },
  '11046': { word: '牛バラ肉', label: '牛ばら肉' },
  '11252': { word: '牛バラ肉', label: '牛ばら肉' },
  '11047': { word: '牛もも肉', label: '牛もも肉' },
  '11076': { word: '牛もも肉', label: '牛もも肉' },
  '11271': { word: '牛もも肉', label: '牛もも肉' },
  '11119': { word: '豚肩ロース', label: '豚かたロース' },
  '11129': { word: '豚バラ肉', label: '豚ばら肉' },
  '11195': { word: 'チャーシュー', label: 'チャーシュー' },
  '11202': { word: 'ラム肉', label: 'ラム肉' },
  '11205': { word: '合鴨', label: '合鴨肉' },
  '11227': { word: '鶏ささみ', label: '鶏ささみ' },
  '11276': { word: 'とんかつ', label: 'とんかつ' },
  '11289': { word: '唐揚げ', label: '鶏のから揚げ' },
  // 乳
  '13003': { word: '牛乳', genre: 'drink' },
  '13006': null,
  '13010': { word: 'スキムミルク', label: 'スキムミルク' },
  // 油
  '14001': { word: 'オリーブオイル', label: 'オリーブ油' },
  '14023': { word: 'アマニ油', label: 'あまに油' },
  // お菓子・そうざい
  '15140': { word: 'おしるこ', label: 'おしるこ' },
  '15168': { word: 'あんぱん', label: 'あんパン' },
  '18055': { word: 'カキフライ', label: 'かきフライ' },
}

// 上の表にある食品番号（テストで、成分表にある番号かを確かめる）
export const RAKUTEN_SEARCH_IDS = Object.keys(SEARCH)

// 名前のかっこ（「（生）」「（皮つき・焼き）」など）を取る
const plainName = (name: string) => name.replace(/（[^）]*）/g, '')

// 食品群ごとのジャンル：16 は飲み物、15 はお菓子・菓子パン
const groupGenre = (group: string): RakutenGenre => (group === '16' ? 'drink' : group === '15' ? 'all' : 'food')

// その食品を楽天市場でさがすときの言葉と、欄に出す名前。出さない食品は null
export function rakutenSearchFor(food: Pick<Food, 'id' | 'displayName' | 'group'>): (RakutenSearch & { label: string }) | null {
  const entry = SEARCH[food.id]
  if (entry === null) return null
  const plain = plainName(food.displayName)
  return { word: entry?.word ?? plain, label: entry?.label ?? plain, genre: entry?.genre ?? groupGenre(food.group) }
}

export type ShopPick = { food: Food; label: string; href: string }

// 欄に出す食品の数
export const SHOP_SIZE = 8

// ランキングの上から順に、楽天市場でさがせる食品を選ぶ。同じ名前（「鶏むね肉（皮つき・焼き）」と「鶏むね肉（皮なし）」）は、上の1つだけ
export function shopPicks(rows: RankingRow[], id: string = RAKUTEN_AFFILIATE_ID, max = SHOP_SIZE): ShopPick[] {
  const picks: ShopPick[] = []
  const seen = new Set<string>()
  for (const r of rows) {
    if (picks.length >= max) break
    const search = rakutenSearchFor(r.food)
    if (!search || seen.has(search.label) || seen.has(search.word)) continue
    const href = rakutenAffiliateUrl(rakutenSearchUrl(search), id)
    if (!href) return []
    seen.add(search.label).add(search.word)
    picks.push({ food: r.food, label: search.label, href })
  }
  return picks
}
