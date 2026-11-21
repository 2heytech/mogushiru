// サイトの URL の決まり。アプリの画面（1日の食事・食品を調べる・ランキング・アレンジ）と、
// ビルドのときに書き出す読みもののページ（成分ごとのランキング・献立の例・料理・食品・このサイトについて）の両方で使う。
// 画面の切り替えは以前は #ranking のように # で持っていた。検索エンジンは # の違いを別のページとして読まないので、ふつうのパスにした
import type { IdealGenre } from './domain/idealMenus'
import type { NutrientKey } from './domain/types'

export const SITE_URL = 'https://mogushiru.app'
export const SITE_NAME = 'モグシル'
// 名前の読みと別の書き方。ひらがなやローマ字でさがした人にも見つかるよう、はじめのページのタイトル・説明文と、検索エンジン向けのデータ（alternateName）に入れる
export const SITE_NAME_KANA = 'もぐしる'
export const SITE_ALT_NAMES = [SITE_NAME_KANA, 'もぐシル', 'mogushiru']

// customize は「料理をアレンジ」
export type View = 'menu' | 'foods' | 'ranking' | 'customize'

export const VIEW_PATH: Record<View, string> = { menu: '/', foods: '/foods/', ranking: '/ranking/', customize: '/customize/' }

// 「このサイトについて」（運営者・数値の確かめ方・注意・プライバシー・出典・お問い合わせ）。フッターから入る。
// プログラムを動かさなくても本文が読めるよう、アプリの画面ではなく読みもののページにしてある（src/pages/aboutPage.tsx）
export const ABOUT_PATH = '/about/'

// 上のメニューは3つ：栄養バランス（menu）・食品を調べる（foods）・成分ランキング（ranking）。
// 「料理をアレンジ」（customize）は、栄養バランスの中の画面にした（上のメニューには出さず、1日の食事・最初の画面から入る。
// URL は /customize/ のまま）。その画面を見ているあいだ、上のメニューは「栄養バランス」を選んだ形にする
export type Feature = 'menu' | 'foods' | 'ranking'

export const VIEW_FEATURE: Record<View, Feature> = { menu: 'menu', customize: 'menu', foods: 'foods', ranking: 'ranking' }

// 画面ごとのタイトルと説明（ブラウザのタブ・検索結果・SNS に貼ったときの表示）
export const VIEW_META: Record<View, { title: string; description: string; heading: string }> = {
  // はじめのページ：検索でさがされる言葉（栄養計算・栄養バランス）を先に書く。Google は最初の「｜」より後ろを落とすことがあるので、
  // 要点は最初の区切りに入れる。名前の読み（もぐしる）は、説明文と検索エンジン向けのデータ（alternateName）で伝える
  menu: {
    title: `栄養計算・栄養バランスチェック（無料）｜料理を選ぶだけ｜${SITE_NAME}`,
    heading: '料理を選ぶだけで、1日の栄養バランスがわかる',
    description: `${SITE_NAME}（${SITE_NAME_KANA}）は、料理を選ぶだけで1日のカロリーとPFCバランス、ビタミン・ミネラルの過不足を計算できる、無料の栄養計算・栄養バランスチェックのサイトです。登録不要。コンビニの商品や市販品も選べます。`,
  },
  foods: {
    title: '食品の栄養素を名前で調べる｜食材・料理・市販品のカロリーと栄養｜モグシル',
    heading: '食品の栄養素を名前で調べる',
    description:
      '食品の名前を入れると、食材・料理・コンビニやメーカーの市販品のカロリーと、たんぱく質・脂質・炭水化物、ビタミン・ミネラルなど26の成分がすぐ見られます。1日の目安に対する割合つき。野菜・肉・魚などの種類からもさがせます。登録不要・無料です。',
  },
  // ランキングを並べ替える道具の画面。検索には載せない（NOINDEX_VIEWS）。検索の受け皿は、読みものの一覧 /nutrients/（食品成分ランキング）
  ranking: {
    title: 'ランキングを並べ替え｜成分・くらべ方・食品の種類を選ぶ｜モグシル',
    heading: 'ランキングを並べ替え',
    description: 'たんぱく質・鉄・カルシウム・ビタミンなど26の成分について、くらべ方（1回に食べる量・100gあたり・100kcalあたり・100円あたり）と食品の種類を選んで、食品を多い順に並べ替えられます。',
  },
  customize: {
    title: '料理をアレンジ｜材料や量を変えて栄養を計算｜モグシル',
    heading: '料理をアレンジ',
    description: '肉じゃがの肉を変える、ごはんを減らすなど、料理の材料と量を変えてカロリーと栄養を計算し、お気に入りとして保存できます。登録不要・無料です。',
  },
}

// 検索に載せない画面。ランキングを並べ替える道具（/ranking/）は、成分ごとの読みもののページ（/nutrients/…）と中身が重なるので外す。
// 最初に返す HTML に noindex を入れ、サイトマップにも入れない（sitePages.tsx）。画面とサイト内のリンクはそのまま使える
export const NOINDEX_VIEWS: readonly View[] = ['ranking']

const LEGACY_HASH: Record<string, View> = { '#ranking': 'ranking', '#customize': 'customize' }
// 古い /#about は、読みもののページ（/about/）へ送る（アプリの画面ではないので、ページごと移る）
const LEGACY_ABOUT_HASH = '#about'

// いまの URL から画面を決める。古い # のリンク（/#ranking など）も開けるようにする
export function viewFromLocation(pathname: string, hash = ''): View {
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`
  const found = (Object.keys(VIEW_PATH) as View[]).find((v) => v !== 'menu' && VIEW_PATH[v] === path)
  if (found) return found
  // 食品のページの URL（/foods/natto/）は、アプリの中では、その食品の栄養素の窓をひらいているあいだのアドレス。画面は「食品を調べる」
  if (foodIdFromPath(path)) return 'foods'
  return LEGACY_HASH[hash] ?? 'menu'
}

// 古い # のリンクで来たときに、アドレス欄を新しい URL に直す（直す必要がなければ null）
export function legacyRedirect(pathname: string, hash: string): string | null {
  const view = LEGACY_HASH[hash]
  return view && (pathname === '/' || pathname === '') ? VIEW_PATH[view] : null
}

// 古い # のリンクのうち、ページごと移るもの（/#about → /about/）。移る先のパスを返す（なければ null）
export function legacyPageRedirect(pathname: string, hash: string): string | null {
  return hash === LEGACY_ABOUT_HASH && (pathname === '/' || pathname === '') ? ABOUT_PATH : null
}

// 「栄養バランス」の中の2つの画面：最初の画面（start。3つの入口）と、1日の食事（day。朝・昼・晩と結果）。
// URL はどちらも / のまま、どちらを出しているかをブラウザの履歴の印（history.state）に持たせて、
// ブラウザの「戻る」でも最初の画面にもどれるようにする
export type MenuScreen = 'start' | 'day'

export const menuScreenState = (screen: MenuScreen): { screen: MenuScreen } => ({ screen })

// 履歴の印から画面を読む（印がない・読めないときは null）
export function menuScreenFromState(state: unknown): MenuScreen | null {
  const screen = typeof state === 'object' && state !== null ? (state as { screen?: unknown }).screen : undefined
  return screen === 'start' || screen === 'day' ? screen : null
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

// ---- 食品のページ（/foods/<slug>/） ----
// 定番の食品（食品を調べるの「定番の食品」と同じ12品）に、1食分と100gのカロリー・栄養のページを作る。
// 成分表の食品番号と、URL の名前。並びは「定番の食品」に出す順：ごはん・食パン・卵・納豆・牛乳・ヨーグルト・バナナ・鶏むね肉・鮭・木綿豆腐・ブロッコリー・さつまいも。
// アプリでその食品の栄養素の窓をひらいたときも、アドレスをこの URL にする（貼ったり読みこみ直したりすると、同じ食品のページがひらく）
const FOOD_PAGES: readonly (readonly [foodId: string, slug: string])[] = [
  ['01088', 'rice'],
  ['01026', 'bread'],
  ['12004', 'egg'],
  ['04046', 'natto'],
  ['13003', 'milk'],
  ['13025', 'yogurt'],
  ['07107', 'banana'],
  ['11220', 'chicken-breast'],
  ['10134', 'salmon'],
  ['04032', 'tofu'],
  ['06263', 'broccoli'],
  ['02006', 'sweet-potato'],
]

// ページのある食品（並び順つき）
export const FOOD_PAGE_IDS: readonly string[] = FOOD_PAGES.map(([id]) => id)
export const FOOD_SLUG: Readonly<Record<string, string>> = Object.fromEntries(FOOD_PAGES)

// 食品のページの URL（ページのない食品は null）
export const foodPagePath = (foodId: string): string | null => (FOOD_SLUG[foodId] ? `${VIEW_PATH.foods}${FOOD_SLUG[foodId]}/` : null)

// 食品のページの URL から、食品番号を読む（食品のページでなければ null）
export function foodIdFromPath(pathname: string): string | null {
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`
  if (!path.startsWith(VIEW_PATH.foods)) return null
  const slug = path.slice(VIEW_PATH.foods.length, -1)
  return FOOD_PAGES.find(([, s]) => s === slug)?.[0] ?? null
}

// ---- 読みもののページから、アプリを「この成分・この献立・この料理」で開くリンク ----
// 指定は # のうしろに書く（/ranking/#n=iron）。? で書くと（/ranking/?n=iron）、検索エンジンが成分・献立・料理の数だけ
// 別のページとして読みに来て、読んでほしいページ（料理の作り方など）に来る回数がへる。# のうしろは別のページとして数えられない。
// 以前の ? のリンクも、そのまま開ける（appLinkParam）
const appLink = (path: string, name: string, value: string): string => `${path}#${name}=${encodeURIComponent(value)}`

// いまの URL から、アプリを開くときの指定を読む（# のうしろが先、なければ ? のうしろ）
export function appLinkParam(name: string, search: string, hash: string): string | null {
  return new URLSearchParams(hash.replace(/^#/, '')).get(name) ?? new URLSearchParams(search).get(name)
}

// # のうしろに、アプリを開くときの指定（成分 n・献立 menu・料理 dish・1日の食事に入れる料理や食品 add・栄養素を見る食品 food）があるか。
// アプリを開いたまま、指定つきの URL に移ったとき（アドレス欄に貼ったなど）に、読みこみ直して指定を読むために使う
const APP_LINK_NAMES = ['n', 'menu', 'dish', 'add', 'food']
export const hasAppLinkHash = (hash: string): boolean => APP_LINK_NAMES.some((name) => appLinkParam(name, '', hash) !== null)

// 読み終えた指定を取りのぞいた「? と # の部分」を返す（アドレス欄から消すため）。もともとなければ null
export function withoutAppLinkParam(name: string, search: string, hash: string): string | null {
  const query = new URLSearchParams(search)
  const fragment = new URLSearchParams(hash.replace(/^#/, ''))
  // # のうしろが「名前=値」の形でないとき（#ranking など）は、# にはさわらない
  const inHash = fragment.has(name)
  if (!query.has(name) && !inHash) return null
  query.delete(name)
  if (inHash) fragment.delete(name)
  const q = query.toString()
  const h = inHash ? fragment.toString() : hash.replace(/^#/, '')
  return `${q ? `?${q}` : ''}${h ? `#${h}` : ''}`
}

// ---- 以前の ? つきの URL を、読みもののページへ送る（301。worker/index.ts が使う） ----
// /ranking/?n=iron → /nutrients/iron/、/customize/?dish=nikujaga → /dishes/nikujaga/。
// アプリを開くリンクを # に変える前（?n=・?dish=）の URL が検索エンジンに登録されて残っているので、同じ中身の読みもののページにまとめる。
// 送り先のページがあるかどうかは、ここでは見ない（料理は数が多いので、呼ぶ側がたしかめる）。送らないときは null
export type LegacyQueryRedirect = { path: string; kind: 'nutrient' | 'dish' }

const DISH_ID = /^[a-z0-9][a-z0-9-]*$/

export function legacyQueryRedirect(pathname: string, search: string): LegacyQueryRedirect | null {
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`
  const query = new URLSearchParams(search)
  if (path === VIEW_PATH.ranking) {
    const key = nutrientFromSlug(query.get('n'))
    const to = key && nutrientPagePath(key)
    return to ? { path: to, kind: 'nutrient' } : null
  }
  if (path === VIEW_PATH.customize) {
    const id = query.get('dish')
    return id && DISH_ID.test(id) ? { path: dishPagePath(id), kind: 'dish' } : null
  }
  return null
}

// アプリのランキングを、成分を選んだ状態でひらく URL（/ranking/#n=iron）
export const rankingAppPath = (key: NutrientKey): string => {
  const slug = NUTRIENT_SLUG[key]
  return slug ? appLink(VIEW_PATH.ranking, 'n', slug) : VIEW_PATH.ranking
}

// ---- 献立の例（/menus/<slug>/） ----

export const MENUS_INDEX_PATH = '/menus/'

// 献立の例のページの分け方。数の少ないジャンル（イタリアン・韓国・エスニック）は1ページにまとめる。
// 検索結果に出すタイトルと説明文は、menuPages.tsx の menuGenreTitle・menuGenreDescription で作る
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
    title: 'コンビニ・市販品',
    heading: 'コンビニ・市販品を取り入れた1日の献立の例',
    // 「コンビニ 昼ごはん 組み合わせ」でさがす人の入口にする：ページの見出しとタイトルは「コンビニ昼ごはんの組み合わせ3例…」で、
    // 見出しのすぐ下に、昼の組み合わせの比較表（カロリー・たんぱく質・食塩）を出す（menuPages.tsx）
    lead: 'コンビニのおにぎりやサンドイッチ、グラノーラ、オートミール、冷凍ギョーザなど、買ってきたものを取り入れた栄養バランスの整う1日の献立です。',
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

// アプリで献立の例を呼び出した状態でひらく URL（/#menu=<献立のid>）
export const idealMenuAppPath = (id: string): string => appLink(VIEW_PATH.menu, 'menu', id)

// ---- 料理の作り方（/dishes/<料理id>/） ----

export const DISHES_INDEX_PATH = '/dishes/'

export const dishPagePath = (id: string): string => `${DISHES_INDEX_PATH}${id}/`

// ---- 読みもののページへの入口（アプリのメニュー・最初の画面・フッター、読みもののページの上のメニューで使う） ----
// 呼び名はここで決める：一覧は「食品成分ランキング」「献立の例」「料理のカロリー・栄養」。
// short は、幅のせまいところ（上のメニュー）で使う短い名前
export const READING_LINKS: readonly { key: 'nutrients' | 'menus' | 'dishes'; name: string; short: string; path: string }[] = [
  { key: 'nutrients', name: '食品成分ランキング', short: 'ランキング', path: NUTRIENTS_INDEX_PATH },
  { key: 'menus', name: '献立の例', short: '献立の例', path: MENUS_INDEX_PATH },
  { key: 'dishes', name: '料理のカロリー・栄養', short: '料理のカロリー・栄養', path: DISHES_INDEX_PATH },
]

// よくさがされるページへの直リンク（はじめのページの、3つの入口の下に置く）
export const POPULAR_LINKS: readonly { name: string; path: string }[] = [
  { name: 'コンビニ昼ごはんの組み合わせ3例', path: `${MENUS_INDEX_PATH}store-bought/` },
  { name: '100円あたりのたんぱく質が多い食べ物', path: `${NUTRIENTS_INDEX_PATH}protein/` },
]

// アプリで、その料理の編集の窓を出す URL（/customize/#dish=<料理id>）。ふつうは「材料と量」をひらく（材料と量を変えて栄養を計算する）。
// tab が 'recipe' なら「つくり方」をひらく（/customize/#dish=<料理id>&tab=recipe。作る人数を変えて見る）
export type DishTab = 'edit' | 'recipe'
export const dishAppPath = (id: string, tab?: 'recipe'): string => `${appLink(VIEW_PATH.customize, 'dish', id)}${tab ? `&tab=${tab}` : ''}`
export const dishTabFromParam = (value: string | null | undefined): DishTab => (value === 'recipe' ? 'recipe' : 'edit')

// アプリで、その料理を1日の食事に入れる URL（/#add=<料理id>）。どの食事に入れるかは、開いてから選ぶ
export const dishAddPath = (id: string): string => appLink(VIEW_PATH.menu, 'add', id)

// 食品（食材）を1日の食事に入れる URL（/#add=food.<食品番号>）。量は、その食品の1回の量。料理の id には「.」が入らないので、見分けられる
const ADD_FOOD_PREFIX = 'food.'
export const foodAddPath = (foodId: string): string => appLink(VIEW_PATH.menu, 'add', `${ADD_FOOD_PREFIX}${foodId}`)
// /#add= の値から、入れるもの（料理か食品か）を読む
export const addTargetFromParam = (value: string): { kind: 'dish' | 'food'; id: string } =>
  value.startsWith(ADD_FOOD_PREFIX) ? { kind: 'food', id: value.slice(ADD_FOOD_PREFIX.length) } : { kind: 'dish', id: value }

// アプリで、その食品の栄養素の窓を出す URL（/foods/#food=<食品番号>）。量を変えて計算したり、そのまま1日の食事に足したりできる
export const foodAppPath = (foodId: string): string => appLink(VIEW_PATH.foods, 'food', foodId)
