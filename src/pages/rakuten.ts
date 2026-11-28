import type { NutrientKey } from '../domain/types'
import picksJson from '../../data/rakuten-picks.json'
import { RAKUTEN_ACCESS_KEY, RAKUTEN_AFFILIATE_ID, RAKUTEN_APP_ID, RAKUTEN_MEASURE_ID } from '../site'

// 楽天アフィリエイト：成分のページの「〜のサプリメントなどを楽天市場でさがす」の欄（nutrientPages.tsx）。
// - 出すのは、その成分をおぎなうのに使われる商品の種類（たんぱく質ならプロテイン、食物繊維なら難消化性デキストリン、カルシウムならカルシウムのサプリ。下の KINDS と SHELVES）。
//   ランキングの食品そのものは出さない（「脂質が多い食品を買う」とすすめることになるのをさけるため、とりたい成分でも、合う種類のない成分のページには欄を出さない）
// - 種類の名前のリンクの行き先は、楽天市場の検索結果（種類の名前でさがす。値段や在庫が変わっても、リンクが古くならない）
// - 商品の例（画像つき）の出し方は2つ（rakutenProducts）：
//   api：楽天ウェブサービスのアプリ ID とアクセスキー（src/site.ts）があるときは、欄が画面に近づいたときに、
//     種類ごとの商品の例を出す（public/rakuten-shop.js。楽天市場商品検索 API を、見ている人のブラウザから呼ぶ）。取れないとき・プログラムが動かないときは、文字のリンクのまま
//   picks：それがないあいだは、前もって選んだ商品（data/rakuten-picks.json。楽天アフィリエイトの「商品リンク作成」で作ったリンク）を、
//     種類ごとに、画像だけで出す（名前・値段は出さない。選んだあとで変わるので）。プログラムは使わない
//   楽天のプログラム（ウィジェット）は、どちらでも読みこまない
// - ランキングの順位や数値は、広告のために変えない
// - アフィリエイトの ID（src/site.ts）が空・形がちがうときは、リンクも「広告」の表示も出さない

const ID_FORM = /^[0-9a-f]{8}(\.[0-9a-f]{8}){3}$/i

// ID が使える形か（8桁の英数字を「.」で4つつないだもの）
export const rakutenEnabled = (id: string = RAKUTEN_AFFILIATE_ID): boolean => ID_FORM.test(id)

// 計測 ID（成果をサイトごとに分けて見るための印。src/site.ts）としてリンクに入れる文字。使えない形（英数字・「_」・「-」のほかの字がある、長すぎる）なら空
const MEASURE_FORM = /^[0-9A-Za-z_-]{1,40}$/
export const rakutenMeasure = (measure: string = RAKUTEN_MEASURE_ID): string => (MEASURE_FORM.test(measure) ? measure : '')

// 楽天市場商品検索 API を呼ぶのに要る値（どれもページに載る公開の値）。measure：計測 ID としてリンクに入れる文字（なければ空）
export type RakutenApi = { appId: string; accessKey: string; affiliateId: string; measure: string }

const APP_FORM = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i
const KEY_FORM = /^pk_[0-9A-Za-z_-]{10,}$/

// 商品を画像つきで出せるか。アプリ ID・アクセスキー・アフィリエイトの ID が、どれも使える形のときだけ
export function rakutenApi(
  appId: string = RAKUTEN_APP_ID,
  accessKey: string = RAKUTEN_ACCESS_KEY,
  affiliateId: string = RAKUTEN_AFFILIATE_ID,
  measure: string = RAKUTEN_MEASURE_ID,
): RakutenApi | null {
  return APP_FORM.test(appId) && KEY_FORM.test(accessKey) && rakutenEnabled(affiliateId) ? { appId, accessKey, affiliateId, measure: rakutenMeasure(measure) } : null
}

// 楽天市場のジャンル。食べ物・飲み物の種類は、検索をジャンルでしぼる（名前だけでさがすと、同じ名前の食べ物でないものがまじるおそれがあるため）
const GENRE = {
  food: '100227', // 食品
  drink: '100316', // 水・ソフトドリンク
} as const
// all：ジャンルでしぼらない（サプリメント・プロテインは、店によってジャンルが分かれているので）
export type RakutenGenre = keyof typeof GENRE | 'all'

export type RakutenSearch = { word: string; genre: RakutenGenre }

// ジャンルの番号（しぼらないときは空）。検索結果のアドレスと、商品検索 API の genreId に使う
export const rakutenGenreId = (genre: RakutenGenre): string => (genre === 'all' ? '' : GENRE[genre])

// 楽天市場の検索結果のアドレス
export function rakutenSearchUrl({ word, genre }: RakutenSearch): string {
  const id = rakutenGenreId(genre)
  return `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(word)}/${id ? `${id}/` : ''}`
}

// 楽天のアドレスを、アフィリエイトのリンクにする。ID が使えなければ null。
// 計測 ID の文字（measure）があれば、ID のすぐあとに入れる（楽天アフィリエイトの管理画面で、計測 ID を選んで作ったリンクと同じ形）
export function rakutenAffiliateUrl(url: string, id: string = RAKUTEN_AFFILIATE_ID, measure: string = RAKUTEN_MEASURE_ID): string | null {
  if (!rakutenEnabled(id)) return null
  return `https://hb.afl.rakuten.co.jp/hgc/${id}/${rakutenMeasure(measure)}?pc=${encodeURIComponent(url)}&link_type=text`
}

// 商品の種類。
// - label：欄に出す名前
// - word：楽天市場でさがす言葉（前もって選んだ商品 data/rakuten-picks.json の見出しにもなる）
// - genre：ジャンル（書かなければ、しぼらない）
// - note：その種類が何かの、短い説明（何から作るか・どう使うか。体へのはたらきは書かない：健康食品の広告の決まり）
type Kind = { label: string; word: string; genre?: RakutenGenre; note?: string }
const KINDS = {
  whey: { label: 'ホエイプロテイン', word: 'ホエイプロテイン', note: '牛乳からとったたんぱく質の粉。水や牛乳にとかして飲みます。' },
  soy: { label: 'ソイプロテイン', word: 'ソイプロテイン', note: '大豆からとったたんぱく質の粉。水や牛乳にとかして飲みます。' },
  bar: { label: 'プロテインバー', word: 'プロテインバー', note: 'たんぱく質を多くした、棒の形のお菓子。そのまま食べられます。' },
  drink: { label: 'プロテインドリンク', word: 'プロテインドリンク', note: 'たんぱく質を多くした飲み物。そのまま飲めます。' },
  dextrin: { label: '難消化性デキストリン', word: '難消化性デキストリン', note: 'とうもろこしなどのでんぷんから作る、水にとける食物繊維の粉。飲み物や料理にまぜて使います。' },
  inulin: { label: 'イヌリン', word: 'イヌリン', note: 'チコリやきくいもなどに入っている、水にとける食物繊維の粉。飲み物や料理にまぜて使います。' },
  psyllium: { label: 'サイリウム（オオバコ）', word: 'サイリウム', note: 'オオバコの種の皮の粉。水をすってふくらむ食物繊維です。たっぷりの水といっしょにとります。' },
  guar: { label: 'グアーガム分解物', word: 'グアーガム分解物', note: 'グアー豆からとった、水にとける食物繊維の粉。飲み物や料理にまぜて使います。' },
  ca: { label: 'カルシウムのサプリ', word: 'カルシウム サプリ' },
  camg: { label: 'カルシウム＋マグネシウムのサプリ', word: 'カルシウム マグネシウム サプリ', note: 'カルシウムとマグネシウムを、いっしょにとれるようにしたもの。' },
  iron: { label: '鉄のサプリ', word: '鉄 サプリ' },
  mmin: { label: 'マルチミネラル', word: 'マルチミネラル', note: 'カルシウム・鉄・亜鉛・マグネシウムなど、いくつものミネラルをまとめたもの。' },
  zinc: { label: '亜鉛のサプリ', word: '亜鉛 サプリ' },
  tomato: { label: 'トマトジュース（食塩無添加）', word: 'トマトジュース 食塩無添加', genre: 'drink', note: '食塩を足していないトマトジュース。' },
  veg: { label: '野菜ジュース（食塩無添加）', word: '野菜ジュース 食塩無添加', genre: 'drink', note: '食塩を足していない野菜ジュース。' },
  carotene: { label: 'β-カロテンのサプリ', word: 'βカロテン サプリ', note: 'β-カロテンは、体の中で、要る分だけビタミンAに変わる成分です。' },
  mvit: { label: 'マルチビタミン', word: 'マルチビタミン', note: 'ビタミンA・B群・C・D・E など、いくつものビタミンをまとめたもの。' },
  vd: { label: 'ビタミンDのサプリ', word: 'ビタミンD サプリ' },
  ve: { label: 'ビタミンEのサプリ', word: 'ビタミンE サプリ' },
  vb: { label: 'ビタミンB群のサプリ', word: 'ビタミンB群 サプリ', note: 'ビタミンB1・B2・B6・ナイアシン・葉酸など、ビタミンB のなかまをまとめたもの。' },
  folate: { label: '葉酸のサプリ', word: '葉酸 サプリ' },
  vc: { label: 'ビタミンCのサプリ', word: 'ビタミンC サプリ' },
  dha: { label: 'DHA・EPA のサプリ', word: 'DHA EPA サプリ', note: '魚の油に多いオメガ3脂肪酸（DHA・EPA）を、カプセルにしたもの。' },
  amani: { label: 'アマニ油', word: 'アマニ油', genre: 'food', note: 'オメガ3脂肪酸（α-リノレン酸）が多い油。熱に弱いので、料理にかけて使います。' },
} satisfies Record<string, Kind>
type KindKey = keyof typeof KINDS

// 成分のページごとの、欄の中身。書いていない成分のページには、欄を出さない：
// - カロリー・脂質・炭水化物・オメガ6脂肪酸・一価不飽和脂肪酸：サプリメントなどでおぎなうことの少ない成分（出すなら「脂質が多い食品」になってしまう）
// - 塩分・飽和脂肪酸・カフェイン：とりすぎに気をつけたい成分
// title：欄の見出し（「〜を楽天市場でさがす」の「〜」）。kinds：出す種類（出す順）。
// food：サプリメントではなく、ふつうの食べ物・飲み物だけを出す欄（サプリメントの使い方の注意を出さない）。
// lead：欄のはじめの文の「〜を、種類ごとに楽天市場でさがせます。」の「〜」（書かなければ「食事でとりきれない○○をおぎなうのに使われる商品」）。caution：その成分だけの注意
type Shelf = { title: string; kinds: KindKey[]; food?: boolean; lead?: string; caution?: string }
const SUPPLEMENTS = (name: string) => `${name}のサプリメントなど`
const B_GROUP: Shelf = { title: SUPPLEMENTS('ビタミンB群'), kinds: ['vb', 'mvit'] }
const OMEGA3: Shelf = { title: SUPPLEMENTS('DHA・EPA '), kinds: ['dha', 'amani'] }
const SHELVES: Partial<Record<NutrientKey, Shelf>> = {
  protein: {
    title: 'プロテインなど',
    kinds: ['whey', 'soy', 'bar', 'drink'],
    caution: '腎臓の病気などで、たんぱく質の量を決められている人は、医師の指示にしたがってください。',
  },
  fiber: {
    title: SUPPLEMENTS('食物繊維'),
    kinds: ['dextrin', 'inulin', 'psyllium', 'guar'],
    caution: '一度にたくさんとると、おなかがゆるくなったり、はったりすることがあります。少ない量から試してください。',
  },
  calcium: { title: SUPPLEMENTS('カルシウム'), kinds: ['ca', 'camg'] },
  iron: { title: SUPPLEMENTS('鉄'), kinds: ['iron', 'mmin'] },
  // カリウムは、錠剤やカプセルのサプリメントをすすめない（国の栄養機能食品の決まりでも、カリウムは錠剤・カプセルの形が対象の外）。食塩を足していない野菜の飲み物を出す
  potassium: {
    title: '食塩無添加のトマトジュースなど',
    kinds: ['tomato', 'veg'],
    food: true,
    lead: 'ふだんの食事にカリウムを足しやすい飲み物',
    caution: '腎臓のはたらきが弱い人は、カリウムをひかえるように言われていることがあります。そのときは、医師の指示にしたがってください。',
  },
  magnesium: { title: SUPPLEMENTS('マグネシウム'), kinds: ['camg', 'mmin'] },
  zinc: { title: SUPPLEMENTS('亜鉛'), kinds: ['zinc', 'mmin'] },
  // ビタミンA そのもの（レチノール）のサプリメントは、とりすぎになりやすいので出さない。体の中で要る分だけビタミンAに変わる β-カロテンを出す
  vitaminA: {
    title: SUPPLEMENTS('β-カロテン'),
    kinds: ['carotene', 'mvit'],
    caution: 'ビタミンAは体にたまりやすく、とりすぎに気をつけたい成分です。たばこを吸う人は、β-カロテンのサプリメントを使う前に、医師や薬剤師に相談してください。',
  },
  vitaminD: { title: SUPPLEMENTS('ビタミンD'), kinds: ['vd', 'mvit'] },
  vitaminE: { title: SUPPLEMENTS('ビタミンE'), kinds: ['ve', 'mvit'] },
  vitaminB1: B_GROUP,
  vitaminB2: B_GROUP,
  niacin: B_GROUP,
  vitaminB6: B_GROUP,
  folate: { title: SUPPLEMENTS('葉酸'), kinds: ['folate', 'mvit'] },
  vitaminC: { title: SUPPLEMENTS('ビタミンC'), kinds: ['vc', 'mvit'] },
  n3Fat: OMEGA3,
  polyUnsatFat: OMEGA3,
}

// 欄を出す成分と、種類の表（テストで、前もって選んだ商品とつき合わせる）
export const RAKUTEN_SHELF_KEYS = Object.keys(SHELVES) as NutrientKey[]
export const RAKUTEN_KINDS: Record<string, Kind> = KINDS

// 前もって選んだ商品（data/rakuten-picks.json）。楽天アフィリエイトの管理画面で、さがす言葉（文字のリンクと同じ言葉・ジャンル）で商品をさがし、
// その種類に合うものを1つの種類につき3つ選んで、「商品リンク作成」でリンクを作った。選び方の決まり：
// 医薬品は選ばない／1日の目安の量が、食事摂取基準の耐容上限量をこえるものは選ばない／名の知られたメーカーの、公式の店・大きな店のものを先に／
// メーカーや店が、なるべく重ならないように／期間や数にかぎりのあるものは選ばない
// - affiliateId：リンクを作った楽天アフィリエイトの ID。src/site.ts の ID とちがうときは、商品を出さない（リンクの ID は、この ID のものなので）
// - shops：店ごとの、楽天の店の番号（meId）と、リンクの ID（linkId。管理画面が、店ごとに作る）
// - picks：さがす言葉ごとの商品。itemId は楽天の商品の番号、code は商品のページのアドレスの最後の部分、image は商品の画像の場所
// - 選びなおすときは、pickedOn（選んだ日）も書きかえる
type PickShop = { meId: string; linkId: string }
type PickItem = { shop: string; itemId: string; code: string; image: string }
const PICKS: { pickedOn: string; affiliateId: string; shops: Record<string, PickShop>; picks: Record<string, PickItem[]> } = picksJson
export const RAKUTEN_PICKS = PICKS
// 商品を選んだ日（「2026年11月28日」の形）
export const RAKUTEN_PICKS_DATE = PICKS.pickedOn.replace(/^(\d+)-0?(\d+)-0?(\d+)$/, '$1年$2月$3日')

// 「商品リンク作成」の画面の設定（画像のみ・240×240 など）を表す文字。管理画面が作るリンクに入っているものを、そのまま入れる
const ITEM_UT = 'eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0Iiwic2l6ZSI6IjI0MHgyNDAiLCJuYW0iOjEsIm5hbXAiOiJyaWdodCIsImNvbSI6MSwiY29tcCI6ImRvd24iLCJwcmljZSI6MSwiYm9yIjoxLCJjb2wiOjEsImJidG4iOjEsInByb2QiOjAsImFtcCI6ZmFsc2V9'
// 商品の画像の大きさ（管理画面の「240×240」）
export const ITEM_IMAGE_SIZE = 240

// href：商品のページへのアフィリエイトのリンク。src：商品の画像（楽天アフィリエイトのサーバーを通して、楽天の画像のサーバーから読む）
export type ShopItem = { href: string; src: string }

// 商品1つのリンクと画像のアドレス。管理画面の「商品リンク作成」で「画像のみ」を選び、計測 ID を選んだときのリンクと同じ形にする
// （管理画面のリンクの見た目の指定（border・style）は使わない。見た目は、このサイトのクラスで決める）
export function rakutenItemLink(item: PickItem, shop: PickShop, measure: string = RAKUTEN_MEASURE_ID): ShopItem {
  const page = `https://item.rakuten.co.jp/${item.shop}/${item.code}/`
  const image = `https://thumbnail.image.rakuten.co.jp/${item.image}?_ex=${ITEM_IMAGE_SIZE}x${ITEM_IMAGE_SIZE}`
  return {
    href: `https://hb.afl.rakuten.co.jp/ichiba/${shop.linkId}/${rakutenMeasure(measure)}?pc=${encodeURIComponent(page)}&link_type=pict&ut=${ITEM_UT}`,
    src: `https://hbb.afl.rakuten.co.jp/hgb/${shop.linkId}/?me_id=${shop.meId}&item_id=${item.itemId}&pc=${encodeURIComponent(image)}&s=${ITEM_IMAGE_SIZE}x${ITEM_IMAGE_SIZE}&t=pict`,
  }
}

// その言葉でさがした商品のうち、前もって選んだもの。なければ（アフィリエイトの ID がちがうときも）空
export function pickedItems(word: string, id: string = RAKUTEN_AFFILIATE_ID, measure: string = RAKUTEN_MEASURE_ID): ShopItem[] {
  if (!rakutenEnabled(id) || PICKS.affiliateId !== id) return []
  return (PICKS.picks[word] ?? []).flatMap((item) => {
    const shop = PICKS.shops[item.shop]
    return shop ? [rakutenItemLink(item, shop, measure)] : []
  })
}

// 商品の例（画像つき）の出し方。api：楽天市場商品検索 API で、ページを開いたときの検索結果を出す。picks：前もって選んだ商品を出す。null：出さない（文字のリンクだけ）
export type RakutenProducts = 'api' | 'picks' | null
export function rakutenProducts(api: RakutenApi | null = rakutenApi(), id: string = RAKUTEN_AFFILIATE_ID): RakutenProducts {
  if (!rakutenEnabled(id)) return null
  if (api) return 'api'
  return PICKS.affiliateId === id && Object.keys(PICKS.picks).length > 0 ? 'picks' : null
}

// 欄に出す種類1つ分。word・genreId：商品検索 API でさがす言葉とジャンル（リンクの先の検索結果と同じ）。items：前もって選んだ商品（なければ空）
export type ShopPick = { key: string; label: string; note?: string; href: string; word: string; genreId: string; items: ShopItem[] }
// 欄1つ分。title：見出し（「〜を楽天市場でさがす」の「〜」）。food：ふつうの食べ物・飲み物だけの欄か。lead：はじめの文の言い方（あるときだけ）。caution：その成分だけの注意
export type ShopSection = { title: string; food: boolean; lead?: string; caution?: string; picks: ShopPick[] }

// API で出すとき、はじめから商品を画像つきで出す種類の数（上から）。のこりは「ほかの種類の商品も見る」を押したときに出す
export const SHOP_ROWS = 4
// 商品の例を出すプログラム（public/rakuten-shop.js）。欄のあるページだけが読む
export const RAKUTEN_SHOP_SCRIPT = '/rakuten-shop.js'
// 楽天ウェブサービスのクレジット（API で取った商品を出すときに添える、楽天の指定の文字のリンク）
export const RAKUTEN_CREDIT = { text: 'Supported by Rakuten Developers', href: 'https://developers.rakuten.com/' }

// その成分のページに出す欄。出さない成分・アフィリエイトの ID が使えないときは null
export function shopSection(key: NutrientKey, id: string = RAKUTEN_AFFILIATE_ID, measure: string = RAKUTEN_MEASURE_ID): ShopSection | null {
  const shelf = SHELVES[key]
  if (!shelf || !rakutenEnabled(id)) return null
  const picks = shelf.kinds.flatMap((k): ShopPick[] => {
    const kind: Kind = KINDS[k]
    const genre = kind.genre ?? 'all'
    const href = rakutenAffiliateUrl(rakutenSearchUrl({ word: kind.word, genre }), id, measure)
    return href ? [{ key: k, label: kind.label, note: kind.note, href, word: kind.word, genreId: rakutenGenreId(genre), items: pickedItems(kind.word, id, measure) }] : []
  })
  return picks.length > 0 ? { title: shelf.title, food: shelf.food ?? false, lead: shelf.lead, caution: shelf.caution, picks } : null
}
