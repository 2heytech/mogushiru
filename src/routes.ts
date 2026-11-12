// サイトの URL の決まり。アプリの画面（1日の食事・ランキング・カスタマイズ・このサイトについて）と、
// ビルドのときに書き出す読みもののページ（成分ごとのランキング・献立の例）の両方で使う。
// 画面の切り替えは以前は #ranking のように # で持っていた。検索エンジンは # の違いを別のページとして読まないので、ふつうのパスにした
import type { IdealGenre } from './domain/idealMenus'
import type { NutrientKey } from './domain/types'

export const SITE_URL = 'https://mogushiru.app'
export const SITE_NAME = 'モグシル'

// about は「このサイトについて」（上のタブには出さず、フッターから入る）
export type View = 'menu' | 'ranking' | 'customize' | 'about'

export const VIEW_PATH: Record<View, string> = { menu: '/', ranking: '/ranking/', customize: '/customize/', about: '/about/' }

// 画面ごとのタイトルと説明（ブラウザのタブ・検索結果・SNS に貼ったときの表示）
export const VIEW_META: Record<View, { title: string; description: string; heading: string }> = {
  menu: {
    title: 'モグシル｜料理を選ぶだけで栄養バランスがわかる',
    heading: '料理を選ぶだけで、1日の栄養バランスがわかる',
    description: '料理を選んで組み合わせるだけで、1日のカロリーとPFCバランス、栄養素の過不足がすぐ分かる栄養シミュレーター。登録不要・無料です。',
  },
  ranking: {
    title: '食品成分ランキング｜たんぱく質・鉄・カルシウムなど26成分｜モグシル',
    heading: '食品成分ランキング',
    description: 'たんぱく質・鉄・カルシウム・ビタミンなど26の成分が多い食品を、1回に食べる量・100gあたり・100kcalあたり・100円あたりでくらべられます。登録不要・無料です。',
  },
  customize: {
    title: '料理をカスタマイズ｜材料や量を変えて栄養を計算｜モグシル',
    heading: '料理をカスタマイズ',
    description: '肉じゃがの肉を変える、ごはんを減らすなど、料理の材料と量を変えてカロリーと栄養を計算し、お気に入りとして保存できます。登録不要・無料です。',
  },
  about: {
    title: 'このサイトについて｜モグシル',
    heading: 'このサイトについて',
    description: 'モグシルの使い方の注意、プライバシー、データの出典とライセンス、運営者とお問い合わせ先。',
  },
}

const LEGACY_HASH: Record<string, View> = { '#ranking': 'ranking', '#customize': 'customize', '#about': 'about' }

// いまの URL から画面を決める。古い # のリンク（/#ranking など）も開けるようにする
export function viewFromLocation(pathname: string, hash = ''): View {
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`
  const found = (Object.keys(VIEW_PATH) as View[]).find((v) => v !== 'menu' && VIEW_PATH[v] === path)
  if (found) return found
  return LEGACY_HASH[hash] ?? 'menu'
}

// 古い # のリンクで来たときに、アドレス欄を新しい URL に直す（直す必要がなければ null）
export function legacyRedirect(pathname: string, hash: string): string | null {
  const view = LEGACY_HASH[hash]
  return view && (pathname === '/' || pathname === '') ? VIEW_PATH[view] : null
}

// ---- 成分ごとのランキング（/nutrients/<slug>/） ----

export const NUTRIENTS_INDEX_PATH = '/nutrients/'

// 成分の URL の名前。並び順はランキングの成分の並びと同じでなくてよい
export const NUTRIENT_SLUG: Partial<Record<NutrientKey, string>> = {
  protein: 'protein',
  fiber: 'fiber',
  calcium: 'calcium',
  iron: 'iron',
  potassium: 'potassium',
  magnesium: 'magnesium',
  zinc: 'zinc',
  vitaminA: 'vitamin-a',
  vitaminD: 'vitamin-d',
  vitaminE: 'vitamin-e',
  vitaminB1: 'vitamin-b1',
  vitaminB2: 'vitamin-b2',
  niacin: 'niacin',
  vitaminB6: 'vitamin-b6',
  folate: 'folate',
  vitaminC: 'vitamin-c',
  n3Fat: 'omega-3',
  n6Fat: 'omega-6',
  monoUnsatFat: 'monounsaturated-fat',
  polyUnsatFat: 'polyunsaturated-fat',
  energyKcal: 'calories',
  fat: 'fat',
  carb: 'carbohydrate',
  salt: 'salt',
  satFat: 'saturated-fat',
  caffeine: 'caffeine',
}

export const nutrientPagePath = (key: NutrientKey): string | null => {
  const slug = NUTRIENT_SLUG[key]
  return slug ? `${NUTRIENTS_INDEX_PATH}${slug}/` : null
}

export const nutrientFromSlug = (slug: string | null | undefined): NutrientKey | null => {
  if (!slug) return null
  const hit = (Object.entries(NUTRIENT_SLUG) as [NutrientKey, string][]).find(([, s]) => s === slug)
  return hit ? hit[0] : null
}

// アプリのランキングを、成分をえらんだ状態でひらく URL（/ranking/?n=iron）
export const rankingAppPath = (key: NutrientKey): string => {
  const slug = NUTRIENT_SLUG[key]
  return slug ? `${VIEW_PATH.ranking}?n=${slug}` : VIEW_PATH.ranking
}

// ---- 献立の例（/menus/<slug>/） ----

export const MENUS_INDEX_PATH = '/menus/'

// 献立の例のページの分け方。数の少ないジャンル（イタリアン・韓国・エスニック）は1ページにまとめる
export type MenuPage = { slug: string; title: string; heading: string; lead: string } & ({ genres: IdealGenre[] } | { balance: 'meal' })

export const MENU_PAGES: MenuPage[] = [
  { slug: 'washoku', genres: ['和食'], title: '和食', heading: '和食の1日の献立の例', lead: '焼き魚や刺身、煮物などを組み合わせた、栄養バランスの整う1日の和食の献立です。' },
  { slug: 'chuka', genres: ['中華'], title: '中華', heading: '中華の1日の献立の例', lead: '麻婆豆腐やえびチリなどの中華を主菜にした、栄養バランスの整う1日の献立です。' },
  { slug: 'yoshoku', genres: ['洋食'], title: '洋食', heading: '洋食の1日の献立の例', lead: 'ハンバーグやコロッケなどの洋食を主菜にした、栄養バランスの整う1日の献立です。' },
  {
    slug: 'world',
    genres: ['イタリアン', '韓国', 'エスニック'],
    title: 'イタリアン・韓国・エスニック',
    heading: 'イタリアン・韓国・エスニックの1日の献立の例',
    lead: 'ピザやガパオライス、韓国風・タイ風の料理などを入れた、栄養バランスの整う1日の献立です。',
  },
  { slug: 'kyodo', genres: ['郷土料理'], title: '郷土料理', heading: '郷土料理の1日の献立の例', lead: '各地の郷土料理を入れた、栄養バランスの整う1日の献立です。' },
  {
    slug: 'store-bought',
    genres: ['市販品'],
    title: '市販品を取り入れた',
    heading: '市販品を取り入れた1日の献立の例',
    lead: 'グラノーラやオートミール、コンビニの商品など、買ってきたものを取り入れた栄養バランスの整う1日の献立です。',
  },
  {
    slug: 'every-meal',
    balance: 'meal',
    title: '1食ずつバランス',
    heading: '1食ずつ栄養バランスが整う献立の例',
    lead: '1日の合計だけでなく、朝・昼・晩のそれぞれでも栄養バランスが整うように組んだ献立です。1食分だけ取り入れることもできます。',
  },
]

export const menuPagePath = (page: MenuPage): string => `${MENUS_INDEX_PATH}${page.slug}/`

// アプリで理想の献立を呼び出した状態でひらく URL（/?menu=<献立のid>）
export const idealMenuAppPath = (id: string): string => `/?menu=${encodeURIComponent(id)}`
