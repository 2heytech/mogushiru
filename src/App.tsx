import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Customizer } from './components/Customizer'
import { prioritySlots, withSlot } from './domain/customize'
import { CustomizeView } from './components/CustomizeView'
import { ItemEditor } from './components/ItemEditor'
import { ProductForm } from './components/ProductForm'
import { SupplementForm } from './components/SupplementForm'
import { isSupplement } from './domain/supplement'
import { Picker, type PickerStart } from './components/Picker'
import { FRUIT } from './components/pickerCards'
import type { Step } from './domain/daySummary'
import { ProfileDialog, type ProfileFocus } from './components/ProfileDialog'
import { SlotStrip } from './components/SlotStrip'
import { DayMenuPanel } from './components/DayMenuPanel'
import { LoadProblemContext } from './components/loadProblemContext'
import { LoadProblemNote } from './components/LoadProblemNote'
import { ArrangeLink, BackRow, StartChoice } from './components/StartChoice'
import { RankingView } from './components/RankingView'
import { FoodCompare } from './components/FoodCompare'
import { FoodDetailDialog } from './components/FoodDetailDialog'
import { FoodLookup } from './components/FoodLookup'
import { inAppLink } from './components/inAppLink'
import { INITIAL_LOOKUP, lookupItemExists, type LookupItem, type LookupState } from './components/lookupCards'
import { confirmDialog } from './components/confirm'
import { pushHistory } from './components/useDismiss'
import { SiteFooter } from './components/SiteFooter'
import { adjustIdealMenu, IDEAL_MENUS, idealMenuAvailable, idealMenuHasProducts } from './domain/idealMenus'
import { isMealSlot, type MealSlot } from './domain/idealMeals'
import {
  addTargetFromParam,
  appLinkParam,
  compareIdsFromParam,
  dishTabFromParam,
  foodIdFromPath,
  hasAppLinkHash,
  legacyPageRedirect,
  legacyRedirect,
  menuScreenFromState,
  menuScreenState,
  nutrientFromSlug,
  READING_LINKS,
  VIEW_FEATURE,
  VIEW_META,
  VIEW_PATH,
  viewFromLocation,
  withoutAppLinkParam,
  type Feature,
  type MenuScreen,
  type View,
} from './routes'
import { ConfirmHost } from './components/ConfirmDialog'
import { addChoice } from './components/addChoice'
import { IdealMealDialog, MenuActions, SaveMenuDialog, SavedMenusDialog, SlotChoiceSheet } from './components/SavedMenus'
import { MenuBuilderDialog } from './components/MenuBuilder'
import { DayInfo } from './components/SummaryPanel'
import { STORES_DATA_NAME, useCatalog, withMyData } from './data/catalog'
import { usePrices } from './data/prices'
import { knownItemsOnly, menuTotals, type Catalog } from './domain/nutrition'
import { resultPreview, SAMPLE_MENU_ID } from './domain/resultPreview'
import { dayFoods } from './domain/foodBalance'
import { swapIdeas } from './domain/swaps'
import { computeTargets } from './domain/targets'
import { missingMealSlots } from './domain/dayProgress'
import { SLOTS, type Ingredient, type MenuItem, type Slot } from './domain/types'
import { drinkSpec } from './domain/drinks'
import { MY_PRODUCT_PREFIX, useAppStore } from './store/useAppStore'
import { DEFAULT_PROFILE_LABEL } from './components/labels'
import { LogoMogu } from './components/Mascot'
import { UiIcon } from './components/UiIcon'

const sameIngredients = (a: Ingredient[], b: Ingredient[]) =>
  a.length === b.length && a.every((x, i) => x.foodId === b[i].foodId && x.grams === b[i].grams)

// 右上の「栄養の目安を設定」
const NAV_BUTTON =
  'flex min-h-11 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-white pr-3 pl-2 text-xs leading-tight font-bold shadow-sm sm:pr-4 sm:pl-3 sm:text-sm sm:font-normal'

// 最初の画面の「結果の例」に使う献立の名前（データを読み終える前から、枠の高さをそろえるのに使う）
const SAMPLE_MENU_NAME = IDEAL_MENUS.find((m) => m.id === SAMPLE_MENU_ID)?.name

// lg（ヘッダーに1段で並べる幅）は、「栄養の目安を設定」のボタンと並ぶので少し小さく
const ICON_CLASS = 'h-6 w-6 shrink-0 sm:h-9 sm:w-9 lg:h-7 lg:w-7 xl:h-9 xl:w-9'

// 上のメニュー（3つ）。title の | は狭い画面で折り返してよい位置。いつも上に並べて、いまどれを見ているかと、ほかに何があるかが分かるようにする。
// 名前は、幅320pxのスマホでも3つ並んで収まる短さにする（「1日の栄養バランスを確認」→「栄養バランス」など）。
// 「料理をアレンジ」は、ここには出さない：栄養バランスの中の画面にして、1日の食事・最初の画面から入る（その画面を見ているあいだは、
// 「栄養バランス」を選んだ形にする。routes.ts の VIEW_FEATURE）
const FEATURES: { view: Feature; icon: ReactNode; title: string; lead: string }[] = [
  { view: 'menu', icon: <UiIcon name="menu" className={ICON_CLASS} />, title: '栄養|バランス', lead: '朝・昼・晩の料理を選んで確かめる' },
  { view: 'foods', icon: <UiIcon name="search" className={ICON_CLASS} />, title: '食品を|調べる', lead: '名前でさがして栄養素を見る' },
  { view: 'ranking', icon: <UiIcon name="ranking" className={ICON_CLASS} />, title: '成分|ランキング', lead: '成分の多い食品を順に見る' },
]

// いま見ている画面のメニューか。そのメニューの画面そのもの（押しても移らない）なら 'page'、中の別の画面（料理をアレンジ）なら 'true'
const featureCurrent = (feature: Feature, view: View): 'page' | 'true' | undefined => (VIEW_FEATURE[view] !== feature ? undefined : view === feature ? 'page' : 'true')

// 広い画面（lg）ではロゴと「栄養の目安を設定」の間に1段で並べる小さな形
function FeatureTabsCompact({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <nav aria-label="機能の切り替え" className="flex gap-1.5 xl:gap-2">
      {FEATURES.map((f) => {
        const current = featureCurrent(f.view, view)
        const active = Boolean(current)
        return (
          <a
            key={f.view}
            href={VIEW_PATH[f.view]}
            aria-current={current}
            onClick={(e) => inAppLink(e, () => onChange(f.view))}
            title={f.lead}
            // いまいるメニューは、サンゴ色でぬる（ほかのタブと同じ見せ方。白いままだと、となりと見分けにくい）
            className={`flex min-h-12 items-center gap-1.5 rounded-full border-2 pr-3 pl-2 text-sm font-bold whitespace-nowrap transition xl:pr-4 ${
              active ? 'border-coral bg-coral text-ink-strong shadow-sm' : 'border-transparent bg-white/60 text-ink hover:bg-white'
            }`}
          >
            {f.icon}
            {f.title.replaceAll('|', '')}
          </a>
        )
      })}
    </nav>
  )
}

// 読みもののページ（献立の例・料理のカロリー・栄養）への入口。広い画面では、上のメニューのとなりに小さく並べる。
// 食品成分ランキングへは「成分ランキング」の画面の中から。スマホでは、1日の食事の「メニュー」・最初の画面・フッターから入る
function ReadingNav() {
  return (
    <nav aria-label="読みもの" className="hidden items-center gap-3 text-xs font-bold whitespace-nowrap lg:flex xl:gap-4 xl:text-sm">
      {READING_LINKS.filter((l) => l.key !== 'nutrients').map((l) => (
        <a key={l.key} href={l.path} className="flex min-h-11 items-center rounded-lg text-ink underline-offset-4 hover:underline focus-visible:ring-4 focus-visible:ring-coral/40 focus-visible:outline-none">
          {/* 幅が 1280px より せまいあいだは、となりの「栄養の目安を設定」に寄りすぎないように「料理の栄養」まで縮める */}
          {l.key === 'dishes' ? (
            <>
              料理の<span className="max-xl:hidden">カロリー・</span>栄養
            </>
          ) : (
            l.short
          )}
        </a>
      ))}
    </nav>
  )
}

function FeatureTabs({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <nav aria-label="機能の切り替え" className="mb-3 grid grid-cols-3 gap-1.5 sm:mb-4 sm:gap-2 lg:hidden">
      {FEATURES.map((f) => {
        const current = featureCurrent(f.view, view)
        const active = Boolean(current)
        return (
          <a
            key={f.view}
            href={VIEW_PATH[f.view]}
            aria-current={current}
            onClick={(e) => inAppLink(e, () => onChange(f.view))}
            className={`block min-h-14 rounded-2xl border-2 px-0.5 py-1.5 text-center transition sm:min-h-16 sm:px-4 sm:py-2 sm:text-left ${
              active ? 'border-coral bg-coral text-ink-strong shadow-sm' : 'border-transparent bg-white/60 text-ink-soft hover:bg-white'
            }`}
          >
            {/* スマホは3つ並ぶので、アイコンの下に名前だけ。広い画面では横並びに説明も添える */}
            <span
              className={`flex flex-col items-center gap-0.5 text-2xs leading-[1.3] font-bold tracking-tight sm:flex-row sm:gap-1.5 sm:text-sm sm:tracking-normal lg:text-base lg:whitespace-nowrap ${active ? 'text-ink-strong' : 'text-ink'}`}
            >
              {f.icon}
              <span className="[word-break:keep-all]">
                {f.title.split('|').map((part, i) => (
                  <Fragment key={part}>
                    {i > 0 && <wbr />}
                    {part}
                  </Fragment>
                ))}
              </span>
            </span>
            <span className="mt-0.5 hidden text-xs leading-snug sm:block">{f.lead}</span>
          </a>
        )
      })}
    </nav>
  )
}

const menuHasItems = () => SLOTS.some((s) => useAppStore.getState().menu[s].length > 0)

// 履歴に印がないとき（ほかのサイトから来た・# を書きかえた）は、料理が入っていれば1日の食事、空なら最初の画面
const screenFromHistory = (): MenuScreen => menuScreenFromState(window.history.state) ?? (menuHasItems() ? 'day' : 'start')

// 画面の切り替えは URL のパス（/ranking/ など）で持つ（ブラウザの戻るで献立に戻れるように）。
// 「栄養バランス」の中の、最初の画面と1日の食事のどちらを出すか（screen）は、履歴の印で持つ（URL は同じ /。routes.ts）。
// 古い # のリンク（/#ranking）で来たときは、その画面を開いてアドレス欄を新しい URL に直す
function useView(): { view: View; screen: MenuScreen; go: (v: View, screen?: MenuScreen, how?: 'push' | 'replace') => void } {
  const [view, setView] = useState<View>(() => viewFromLocation(window.location.pathname, window.location.hash))
  // ひらいたとき、1日の食事が空なら最初の画面から。料理が入っていれば1日の食事（読みこみ直したときは、その前に見ていたほう）
  const [screen, setScreen] = useState<MenuScreen>(() => (menuHasItems() ? screenFromHistory() : 'start'))
  const firstScreen = useRef(screen)
  useEffect(() => {
    const fixLegacy = () => {
      const { pathname, hash, search } = window.location
      // 古い /#about は、読みもののページ（/about/）へページごと移る
      const page = legacyPageRedirect(pathname, hash)
      if (page) {
        window.location.replace(page)
        return
      }
      const legacy = legacyRedirect(pathname, hash)
      if (legacy) window.history.replaceState(window.history.state, '', legacy + search)
    }
    const sync = () => {
      // アプリを開いたまま、指定つきの URL（/#menu=… など）に移ったときは、読みこみ直して指定を読む（指定は開いたときに1回だけ読むので）。
      // 食品のページの URL（/foods/natto/）に移ったとき（食品の窓を「戻る」で閉じたあとに「進む」）も、読みこみ直してそのページを出す
      if (hasAppLinkHash(window.location.hash) || foodIdFromPath(window.location.pathname)) {
        window.location.reload()
        return
      }
      fixLegacy()
      setView(viewFromLocation(window.location.pathname, window.location.hash))
      setScreen(screenFromHistory())
    }
    // ひらいたときの画面は、上の useState で URL から決めてある（古い # のリンクも）。ここではアドレス欄を直すだけ
    fixLegacy()
    // はじめの履歴にも印をつける（先へ進んだあと、ブラウザの「戻る」でここへもどれるように）
    window.history.replaceState(menuScreenState(firstScreen.current), '')
    window.addEventListener('popstate', sync)
    window.addEventListener('hashchange', sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener('hashchange', sync)
    }
  }, [])
  useEffect(() => {
    document.title = VIEW_META[view].title
  }, [view])
  // 最初の画面と1日の食事を行き来すると、押したボタン（入口・「最初の画面にもどる」）が消えてフォーカスの場所がなくなるので、本文（main）に移す。
  // 「料理をアレンジ」の画面との行き来（「料理をアレンジ」「1日の食事にもどる」）も同じ。
  // ダイアログの中にフォーカスがあるとき（献立の例の窓で1食ずつ選んでいる途中など）は動かさない
  useEffect(() => {
    if (document.activeElement === document.body) document.querySelector<HTMLElement>('main')?.focus({ preventScroll: true })
  }, [screen, view])
  // screen をはぶくと、いまのまま。replace は、履歴を足さずにいまの場所を書きかえる（URL で献立を指定して来たとき。ダイアログがひらいていないときに使う）。
  // 履歴を足すのは pushHistory で（ダイアログをひらいたまま・閉じてすぐの移動でも、履歴がずれないように）
  const go = (v: View, next: MenuScreen = screen, how: 'push' | 'replace' = 'push') => {
    const path = VIEW_PATH[v]
    const samePath = window.location.pathname === path
    if (how === 'replace') window.history.replaceState(menuScreenState(next), '', samePath ? undefined : path)
    else if (!samePath || menuScreenFromState(window.history.state) !== next) pushHistory(menuScreenState(next), path)
    setView(v)
    setScreen(next)
    window.scrollTo({ top: 0 })
  }
  return { view, screen, go }
}

// 読みもののページからの指定（#n=iron や #menu=…。以前の ?n=iron も）を読んで、読み終えたらアドレス欄から消す
const queryParam = (name: string) => appLinkParam(name, window.location.search, window.location.hash)
function dropQueryParam(name: string) {
  const rest = withoutAppLinkParam(name, window.location.search, window.location.hash)
  if (rest !== null) window.history.replaceState(window.history.state, '', window.location.pathname + rest)
}

export default function App() {
  const { state: catalogState, loadStores, retry: retryLoad, retrying } = useCatalog()
  const prices = usePrices()
  const { view, screen, go } = useView()
  // 「食品を調べる」「料理をアレンジ」で1日の食事に足したあとは、「栄養バランス」を1日の食事からひらく（最初の画面のままだと、足したものを見るのにもう1回押すことになる）
  const addedOutside = useRef(false)
  const setView = (v: View) => {
    if (v === 'menu' && addedOutside.current) {
      addedOutside.current = false
      go('menu', 'day')
    } else go(v)
  }
  // 1日の食事の画面へ（入口を選んだ・献立を入れた）と、最初の画面へ（入れた料理はそのまま）
  const openDay = () => {
    addedOutside.current = false
    go('menu', 'day')
  }
  const openStart = () => go('menu', 'start')
  // 最初の画面の「結果の例」から1日の食事をひらいたとき：スマホ（幅768px未満）では、まとめの「気になる点」「次に試すこと」まで
  // 開いてすぐ読めるように、1日の食事のかたまりを画面の上に合わせる（上のメニューともどり口の分だけ送る。上へスクロールすればもどれる）
  const showResultFirst = useRef(false)
  useEffect(() => {
    if (screen !== 'day' || !showResultFirst.current) return
    showResultFirst.current = false
    if (!window.matchMedia('(max-width: 767px)').matches) return
    document.getElementById('day-menu')?.scrollIntoView({ block: 'start' })
  }, [screen])
  // 「料理をアレンジ」の画面へ（栄養バランスの中の画面。そこからのもどり先は、下の arrangeBack）
  const openArrange = () => go('customize')
  const {
    menu: storedMenu,
    pruneMenu,
    myDishes,
    profile,
    profileSet,
    setProfile,
    removeItem,
    addItem,
    updatePortion,
    updateDrink,
    recentDrinks,
    rememberDrink,
    pickerList,
    setPickerList,
    recentLookups,
    rememberLookup,
    clearRecentLookups,
    customizeItem,
    replaceWithMyDish,
    saveMyDish,
    updateMyDish,
    deleteMyDish,
    myProducts,
    favoriteProductIds,
    saveMyProduct,
    updateMyProduct,
    deleteMyProduct,
    toggleFavoriteProduct,
    savedMenus,
    saveMenu,
    loadMenu,
    replaceMenu,
    replaceSlot,
    deleteMenu,
    clearMenu,
    menuSource,
  } = useAppStore()
  const [savedDialog, setSavedDialog] = useState<'save' | 'load' | null>(null)
  // 「食品を調べる」の名前でさがす画面の、さがしている言葉としぼりこみ（ランキングやほかのタブへ行ってもどっても、続きから見られるように）
  const [lookup, setLookup] = useState<LookupState>(INITIAL_LOOKUP)
  // 栄養素の一覧をひらいている食品（名前でさがした候補か、ランキングの行を押したもの）
  const [foodDetail, setFoodDetail] = useState<LookupItem | null>(null)
  // 食品のページの「食べた量で計算する」から来たとき（/foods/#food=<食品番号>）は、その食品の栄養素の一覧をひらく（量は1回の量から）
  const [foodStart, setFoodStart] = useState(() => queryParam('food') ?? undefined)
  useEffect(() => dropQueryParam('food'), [])
  const openFood = (item: LookupItem) => {
    rememberLookup(item)
    setFoodStart(undefined)
    setFoodDetail(item)
  }
  // 「食材をくらべる」窓に並べている食材（食品番号）。窓を閉じても覚えておき、もう一度ひらいたら続きから。
  // /foods/#compare=<食品番号>,… で来たときは、その食材を並べた窓をひらく
  const [compareIds, setCompareIds] = useState(() => compareIdsFromParam(queryParam('compare')))
  const [compareOpen, setCompareOpen] = useState(() => compareIds.length > 0)
  useEffect(() => dropQueryParam('compare'), [])
  // くらべる窓の食材の名前を押してひらいた、その食材の栄養素の一覧（くらべる窓の上に重ねる。閉じると、くらべる窓にもどる）
  const [compareDetail, setCompareDetail] = useState<string | null>(null)
  // 献立の例から選ぶ窓
  const [builderOpen, setBuilderOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileFocus, setProfileFocus] = useState<ProfileFocus | undefined>()
  // 料理を選ぶ画面。start は、はじめにひらく種類としぼりこみ（まとめの「副菜を1品追加する」から来たときなど）
  const [picker, setPicker] = useState<{ slot: Slot; start?: PickerStart } | null>(null)
  const pickerSlot = picker?.slot ?? null
  const setPickerSlot = (slot: Slot | null) => setPicker(slot ? { slot } : null)
  // スマホで、料理の一覧をひらいている食事（下のバーの「料理を追加」は、この食事に足す）
  const [openSlot, setOpenSlot] = useState<Slot | null>(null)
  // 料理を選ぶ画面（朝・昼・晩）から、献立の例のその1食だけを選ぶ画面
  const [idealMealSlot, setIdealMealSlot] = useState<MealSlot | null>(null)
  // full: 飲み物の料理でも、材料まで変えられる画面（Customizer）でひらく
  const [editing, setEditing] = useState<{ slot: Slot; uid: string; full?: boolean } | null>(null)
  // 市販品の登録（slot があれば登録後その区分に追加）・編集
  const [productForm, setProductForm] = useState<{ jan?: string; slot?: Slot; supplement?: boolean } | null>(null)
  const targets = useMemo(() => computeTargets(profile), [profile])
  // 毎回作り直すと、料理を選ぶ画面で1品押すたびに市販品の一覧を全部作り直すことになるので、中身が変わったときだけ作る
  const catalog = useMemo(
    () => (catalogState.status === 'ready' ? withMyData(catalogState.catalog, myDishes, myProducts) : null),
    [catalogState, myDishes, myProducts],
  )
  // コンビニ・メーカーの商品はあとから読むので、読み終えるまでは「ない商品」と決めつけない
  const storesLoaded = catalogState.status === 'ready' && catalogState.storesLoaded
  // 読み込めなかったデータ（通信の失敗など）。あるあいだは、もう一度読み込む案内を出す
  const loadProblem = useMemo(
    () => ({ failed: catalogState.status === 'ready' ? catalogState.failed : [], retry: retryLoad, retrying }),
    [catalogState, retryLoad, retrying],
  )
  // コンビニ・メーカーの商品を読み終えて、中身がそろっている（読み込めなかったときは、ない商品と決めつけない）
  const storesReady = storesLoaded && !loadProblem.failed.includes(STORES_DATA_NAME)
  // データの更新でなくなった市販品などが1日の食事に残っていても、画面が止まらないように外して計算する
  const menu = useMemo(() => (catalog ? knownItemsOnly(storedMenu, catalog) : storedMenu), [catalog, storedMenu])
  useEffect(() => {
    if (catalog && storesReady && menu !== storedMenu) pruneMenu((m) => knownItemsOnly(m, catalog))
  }, [catalog, storesReady, menu, storedMenu, pruneMenu])
  // 1日の食事にコンビニ・メーカーの商品が入っていれば、読み終えるまで待ってから出す（入っていなければすぐ出す）
  const waitingForStores = Boolean(catalog) && !storesLoaded && menu !== storedMenu
  const totals = useMemo(() => (catalog ? menuTotals(menu, catalog) : null), [catalog, menu])
  // 主食・主菜・副菜、野菜・果物、10食品群（料理の材料から数える）
  const foods = useMemo(() => (catalog ? dayFoods(menu, catalog) : null), [catalog, menu])
  // 減塩・全粒穀物への置きかえの案（栄養素のタブに出す）
  const swaps = useMemo(() => (catalog ? swapIdeas(menu, catalog) : []), [catalog, menu])
  // 最初の画面（結果の例／献立の例から選ぶ／自分の食事で試す）。入口を選んで先へ進んだら、料理を全部外しても出さない。
  // もどるのは「最初の画面にもどる」・ロゴ・ブラウザの戻る・リセット（料理が入ったままでも出す）
  const showStart = screen === 'start'
  const itemCount = SLOTS.reduce((n, s) => n + menu[s].length, 0)
  // 「料理をアレンジ」の画面からのもどり先：1日の食事を見ていた・料理が入っているなら1日の食事、まだ始めていなければ最初の画面
  const arrangeBack: MenuScreen = screen === 'day' || itemCount > 0 ? 'day' : 'start'
  const sampleMenu = useMemo(() => {
    const ideal = IDEAL_MENUS.find((m) => m.id === SAMPLE_MENU_ID)
    return ideal && catalog && idealMenuAvailable(ideal, catalog) ? ideal : undefined
  }, [catalog])
  // 最初の画面の「結果の例」：その献立を、いまの目安（プロフィール）に合わせた量で入れたときの結果。最初の画面を出しているときだけ計算する
  const samplePreview = useMemo(
    () => (showStart && sampleMenu && catalog ? resultPreview(sampleMenu.name, adjustIdealMenu(sampleMenu, catalog, targets), catalog, targets) : undefined),
    [showStart, sampleMenu, catalog, targets],
  )

  // コンビニ・メーカーの商品（圧縮後でも約0.8MB）は、使う画面をひらいたときに読みはじめる：1日の食事（料理を選ぶ・保存した食事）、食品を調べる、
  // 献立の例から選ぶ窓、保存した食事の窓。1日の食事に、まだ読んでいない商品が入っているときも読む。
  // 最初の画面を見ているだけのとき・成分ランキング・料理をアレンジ・このサイトについて では読まない
  const needsStores =
    view === 'foods' || (view === 'menu' && !showStart) || builderOpen || savedDialog !== null || pickerSlot !== null || idealMealSlot !== null || (catalog !== null && menu !== storedMenu)
  useEffect(() => {
    if (needsStores) loadStores()
  }, [needsStores, loadStores])

  // 成分ランキングのページから「くらべ方を変えて見る」で来たとき（/ranking/#n=iron）は、その成分を選んだ状態で開く
  const [rankingStart, setRankingStart] = useState(() => nutrientFromSlug(queryParam('n')) ?? undefined)
  useEffect(() => dropQueryParam('n'), [])

  // 料理のページから来たとき（/customize/#dish=<料理id>）は、その料理の編集の窓をひらく。
  // ふつうは「材料と量」（材料と量を変えて栄養を計算する）、&tab=recipe がついていれば「つくり方」（作る人数を変えて見る）
  const [dishStart, setDishStart] = useState(() => {
    const id = queryParam('dish')
    return id ? { id, tab: dishTabFromParam(queryParam('tab')) } : undefined
  })
  useEffect(() => {
    dropQueryParam('dish')
    dropQueryParam('tab')
  }, [])

  // 料理・食品のページの「1日の食事に入れる」から来たとき（/#add=<料理id>・/#add=food.<食品番号>）は、どの食事に入れるかを選ぶ窓を出す
  const [addStart, setAddStart] = useState(() => queryParam('add') ?? undefined)
  useEffect(() => dropQueryParam('add'), [])
  const adding = addStart && catalog ? addChoice(addTargetFromParam(addStart), catalog) : null
  // 栄養素の一覧をひらく食品：画面で押したものが先、なければ URL で指定されたもの
  const startFood = foodStart && catalog ? addChoice({ kind: 'food', id: foodStart }, catalog)?.item : undefined
  const shownFood = foodDetail ?? startFood ?? null
  const comparedFood = compareOpen && compareDetail && catalog ? addChoice({ kind: 'food', id: compareDetail }, catalog)?.item : undefined

  // 献立の例のページから「この献立をアプリで開く」で来たとき（/#menu=<id>）は、その献立の例をプロフィールに合わせて入れる
  const menuRequest = useRef(queryParam('menu'))
  const goRef = useRef(go)
  useEffect(() => {
    goRef.current = go
  })
  useEffect(() => {
    const id = menuRequest.current
    if (!id || !catalog) return
    const ideal = IDEAL_MENUS.find((m) => m.id === id)
    // 市販品を使う献立は、コンビニ・メーカーの商品を読みはじめて、読み終えるまで待つ
    if (ideal && !idealMenuAvailable(ideal, catalog) && idealMenuHasProducts(ideal) && !storesLoaded) return loadStores()
    menuRequest.current = null
    dropQueryParam('menu')
    if (!ideal || !idealMenuAvailable(ideal, catalog)) return
    const planned = adjustIdealMenu(ideal, catalog, targets)
    const empty = SLOTS.every((s) => useAppStore.getState().menu[s].length === 0)
    void (async () => {
      if (!empty && !(await confirmDialog(`いまの1日の食事を「${ideal.name}」に置き換えますか？`, { okLabel: '置き換える' }))) return
      replaceMenu(planned, ideal.name)
      // 献立のページから来たので、最初の画面を出していたとき（空だった）は履歴を足さずに1日の食事へ（「戻る」で、もとのページへ）。
      // 料理が入っていたときは、もう1日の食事を出している
      goRef.current('menu', 'day', empty ? 'replace' : 'push')
    })()
  }, [catalog, storesLoaded, loadStores, targets, replaceMenu])

  // 飲み物の杯数・1杯の量を変えて、最近の飲み物として覚える
  const changeDrink = (slot: Slot, item: MenuItem, amount: Pick<MenuItem, 'portion' | 'cup'>) => {
    updateDrink(slot, item.uid, amount)
    if (!item.customIngredients) rememberDrink(`${item.kind}:${item.refId}`, amount.cup)
  }

  // まとめの「次に試すこと」のボタン
  const runStep = (step: Step) => {
    if (step.kind === 'addMeal') setPicker({ slot: step.slot })
    else if (step.kind === 'addDish') setPicker({ slot: step.slot, start: { tab: 'dish', category: step.part } })
    else if (step.kind === 'addFruit') setPicker({ slot: 'other', start: { tab: 'dish', category: FRUIT } })
    else if (step.kind === 'ranking') {
      setRankingStart(step.key)
      setView('ranking')
    }
  }

  function renderEditor(catalog: Catalog, { slot, uid, full }: { slot: Slot; uid: string; full?: boolean }) {
    const item = menu[slot].find((i) => i.uid === uid)
    const close = () => setEditing(null)
    if (!item) return null
    // 飲み物は、まず杯数と1杯の量の画面（料理の飲み物は「材料を変える」で Customizer へ）
    const drink = !full && drinkSpec(item, catalog)
    if (drink) {
      return (
        <ItemEditor
          item={item}
          catalog={catalog}
          favorite={favoriteProductIds.includes(item.refId)}
          onPortion={(p) => updatePortion(slot, uid, p)}
          onDrink={(amount) => changeDrink(slot, item, amount)}
          onCustomize={item.kind === 'dish' || item.kind === 'myDish' ? () => setEditing({ slot, uid, full: true }) : undefined}
          onToggleFavorite={item.kind === 'product' && !item.refId.startsWith(MY_PRODUCT_PREFIX) ? () => toggleFavoriteProduct(item.refId) : undefined}
          onEditProduct={item.kind === 'product' && item.refId.startsWith(MY_PRODUCT_PREFIX) ? () => setProductForm({ jan: item.refId }) : undefined}
          onRemove={() => {
            removeItem(slot, uid)
            close()
          }}
          onClose={close}
        />
      )
    }
    if (item.kind === 'dish') {
      const dish = catalog.dishes.get(item.refId)
      if (!dish) return null
      return (
        <Customizer
          title={dish.name}
          original={dish.ingredients}
          initial={item.customIngredients ?? dish.ingredients}
          initialPortion={item.portion}
          source={dish.source}
          recipe={dish.recipe}
          foods={catalog.foods}
          saveLabel="お気に入りに保存"
          initialSlots={[slot]}
          onApply={(ingredients, portion) => {
            customizeItem(slot, uid, sameIngredients(ingredients, dish.ingredients) ? null : ingredients)
            updatePortion(slot, uid, portion)
            close()
          }}
          onSave={(name, ingredients, portion, slots) => {
            const my = saveMyDish({ baseDishId: dish.id, name, ingredients, portion, slots })
            replaceWithMyDish(slot, uid, my.id, portion)
            close()
          }}
          onClose={close}
        />
      )
    }
    if (item.kind === 'myDish') {
      const my = catalog.myDishes.get(item.refId)
      if (!my) return null
      const base = my.baseDishId ? catalog.dishes.get(my.baseDishId) : undefined
      return (
        <Customizer
          title={my.name}
          baseName={base?.name ?? my.name}
          initialName={my.name}
          original={base?.ingredients ?? my.ingredients}
          initial={item.customIngredients ?? my.ingredients}
          initialPortion={item.portion}
          source={base?.source}
          recipe={base?.recipe}
          foods={catalog.foods}
          saveLabel="お気に入りを上書き保存"
          initialSlots={withSlot(prioritySlots(my), slot)}
          onApply={(ingredients, portion) => {
            customizeItem(slot, uid, sameIngredients(ingredients, my.ingredients) ? null : ingredients)
            updatePortion(slot, uid, portion)
            close()
          }}
          onSave={(name, ingredients, portion, slots) => {
            updateMyDish(my.id, { name, ingredients, portion, slots })
            customizeItem(slot, uid, null)
            updatePortion(slot, uid, portion)
            close()
          }}
          onClose={close}
        />
      )
    }
    const isMine = (item.kind === 'product' || item.kind === 'supplement') && item.refId.startsWith(MY_PRODUCT_PREFIX)
    return (
      <ItemEditor
        item={item}
        catalog={catalog}
        favorite={favoriteProductIds.includes(item.refId)}
        onPortion={(p) => updatePortion(slot, uid, p)}
        onToggleFavorite={item.kind === 'product' && !isMine ? () => toggleFavoriteProduct(item.refId) : undefined}
        onEditProduct={isMine ? () => setProductForm({ jan: item.refId }) : undefined}
        onRemove={() => {
          removeItem(slot, uid)
          close()
        }}
        onClose={close}
      />
    )
  }

  function renderProductForm({ jan, slot, supplement }: { jan?: string; slot?: Slot; supplement?: boolean }) {
    const initial = jan ? myProducts.find((p) => p.jan === jan) : undefined
    const close = () => setProductForm(null)
    const Form = supplement || isSupplement(initial) ? SupplementForm : ProductForm
    return (
      <Form
        initial={initial}
        onSave={(input) => {
          if (initial) updateMyProduct(initial.jan, input)
          else {
            const p = saveMyProduct(input)
            if (slot) {
              addItem(
                slot,
                isSupplement(p) ? { kind: 'supplement', refId: p.jan, portion: 1 } : { kind: 'product', refId: p.jan, portion: p.basis === 'serving' ? 1 : (p.servingGrams ?? 100) },
              )
              setPickerSlot(null)
            }
          }
          close()
        }}
        onDelete={
          initial
            ? async () => {
                if (!(await confirmDialog(`「${initial.name}」を削除しますか？1日の食事からも外れます。`, { okLabel: '削除する', danger: true }))) return
                setEditing(null)
                deleteMyProduct(initial.jan)
                close()
              }
            : undefined
        }
        onClose={close}
      />
    )
  }

  // 画面の中身を出せるか（最初の画面と「このサイトについて」は、データを待たない）。フッターは中身と一緒に出す
  // （読み込み中に先に出すと、中身が出たときに押し下げられて画面が動く）
  const contentReady = (view === 'menu' && showStart) || Boolean(catalog && totals && (view !== 'menu' || !waitingForStores))

  return (
    <LoadProblemContext.Provider value={loadProblem}>
    {/* スマホは1日の食事のボタンを下に固定するので、そのぶん下をあける */}
    <div className={`mx-auto max-w-6xl px-4 ${view === 'menu' && !showStart ? 'pb-32 md:pb-16' : 'pb-16'}`}>
      <header className="flex items-center justify-between gap-2 py-2.5 sm:gap-4 sm:py-4 lg:gap-3 xl:gap-4">
        {/* ロゴは見出し（h1）にしない。h1 は、それぞれの画面の見出し（最初の画面のキャッチコピー・「1日の食事」・「食品を調べる」など）。
            検索エンジンは h1 をページの題として読むので、どの画面も「モグシル」だけにならないようにする */}
        <div className="shrink-0">
          {/* ロゴを押すと、どの画面からでも最初の画面へ（入れた料理はそのまま） */}
          <a
            href={VIEW_PATH.menu}
            onClick={(e) => inAppLink(e, openStart)}
            title="最初の画面へ"
            className="flex items-center gap-1 rounded-2xl focus-visible:ring-4 focus-visible:ring-coral/40 focus-visible:outline-none min-[360px]:gap-1.5"
          >
            <LogoMogu className="h-10 w-10 sm:h-12 sm:w-12" />
            <span className="font-logo text-2xl leading-none tracking-wide text-ink sm:text-[28px]">モグシル</span>
          </a>
        </div>
        <div className="hidden lg:block">
          <FeatureTabsCompact view={view} onChange={setView} />
        </div>
        <ReadingNav />
        {/* 栄養の目安（プロフィール）の入口はここ1つ。まだ入れていないあいだは、枠と字の色で目立たせる。
            幅320pxでもロゴと並んで収まるように、1行で。いちばん狭い幅では「目安を設定」まで縮める */}
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          aria-haspopup="dialog"
          aria-label="栄養の目安を設定"
          title={profileSet ? undefined : `目安はいま「${DEFAULT_PROFILE_LABEL}・ふつう」で計算しています`}
          className={`${NAV_BUTTON} min-w-0 ${profileSet ? '' : 'font-bold text-coral-ink ring-2 ring-coral/50 sm:font-bold'}`}
        >
          <UiIcon name="profile" className="h-6 w-6 shrink-0" />
          <span>
            <span className="max-[359px]:hidden">栄養の</span>目安を設定
          </span>
        </button>
      </header>

      <FeatureTabs view={view} onChange={setView} />

      {/* データを読み込めなかったとき（通信の失敗など）：もう一度読み込む案内 */}
      <LoadProblemNote className="mb-4" />

      {catalog && totals && view === 'customize' ? (
        <main tabIndex={-1} className="space-y-4 outline-none">
          {/* 「料理をアレンジ」は、栄養バランスの中の画面。上に、1日の食事（まだ始めていなければ最初の画面）へのもどり口を置く */}
          <BackRow label={arrangeBack === 'day' ? '1日の食事にもどる' : '最初の画面にもどる'} onClick={() => (arrangeBack === 'day' ? openDay() : openStart())} />
          <CustomizeView
            catalog={catalog}
            myDishes={myDishes}
            menu={menu}
            totals={totals}
            showAlcohol={profile.age >= 20}
            initialDishId={dishStart?.id}
            initialDishTab={dishStart?.tab}
            // 一度ひらいたら忘れる（ほかの画面からもどってきたとき、同じ料理をまたひらかない）
            onInitialDishOpened={() => setDishStart(undefined)}
            onSaveNew={saveMyDish}
            onUpdate={updateMyDish}
            onDelete={deleteMyDish}
            // お気に入りの料理を、保存したときの量で1日の食事に足す
            onAddToDay={(slot, my) => {
              addItem(slot, { kind: 'myDish', refId: my.id, portion: my.portion ?? 1 })
              setOpenSlot(slot)
              addedOutside.current = true
            }}
            onOpenDay={openDay}
          />
        </main>
      ) : catalog && view === 'foods' ? (
        <main tabIndex={-1} className="space-y-4 outline-none">
          <FoodLookup
            catalog={catalog}
            storesLoaded={storesLoaded}
            showAlcohol={profile.age >= 20}
            state={lookup}
            onState={setLookup}
            recent={recentLookups}
            onClearRecent={clearRecentLookups}
            onOpen={openFood}
            onCompare={(ids) => {
              if (ids) setCompareIds(ids)
              setCompareOpen(true)
            }}
          />
        </main>
      ) : catalog && view === 'ranking' ? (
        <main tabIndex={-1} className="space-y-4 outline-none">
          <RankingView catalog={catalog} targets={targets} prices={prices} initialNutrient={rankingStart} onOpenFood={openFood} />
        </main>
      ) : view === 'menu' && showStart ? (
        <main tabIndex={-1} className="space-y-4 outline-none">
          {/* 入口を選ぶまでは、朝・昼・晩や栄養の表示を出さない。料理・食材のデータを読み終える前から出す
              （データを待つのは「結果の例」だけ。読み込み中に、画面の下のほうが動かないように） */}
          <StartChoice
            savedCount={savedMenus.length}
            preview={samplePreview}
            previewLoading={!catalog}
            previewName={SAMPLE_MENU_NAME}
            // データを読み終える前（と、入っている商品を読み終える前）は、カロリーを出さない
            current={itemCount > 0 ? { count: itemCount, kcal: totals && !waitingForStores ? totals.day.values.energyKcal : undefined } : undefined}
            onResume={openDay}
            onTrySample={async () => {
              if (!sampleMenu || !catalog) return
              if (itemCount > 0 && !(await confirmDialog(`いまの1日の食事を「${sampleMenu.name}」に置き換えますか？`, { okLabel: '置き換える' }))) return
              // いまの目安（プロフィール）に合わせた量で入れる
              replaceMenu(adjustIdealMenu(sampleMenu, catalog, targets), sampleMenu.name)
              showResultFirst.current = true
              openDay()
            }}
            onBuild={() => setBuilderOpen(true)}
            onOpenSaved={() => setSavedDialog('load')}
            onArrange={openArrange}
            // 朝・昼・晩に料理を入れていく画面へ（どの食事から入れるかは、そこで選ぶ）。
            // 料理が入っているときは、空から始めるかを確かめる（そのまま続けるなら、上の「いまの1日の食事にもどる」）
            onPickSelf={async () => {
              if (itemCount > 0) {
                if (!(await confirmDialog(`いま入っている料理（${itemCount}品）をすべて外して、空から始めますか？`, { okLabel: '空から始める', danger: true }))) return
                clearMenu()
                setOpenSlot(null)
              }
              openDay()
            }}
          />
        </main>
      ) : catalog && totals && !waitingForStores ? (
        <main tabIndex={-1} className="space-y-4 outline-none">
          {/* スマホ：上に1日の食事（見出し・朝〜その他）、その下に結果。
              広い画面（lg 以上）：左に1日の食事、右にまとめを並べて、料理や量を変えた結果をすぐ横で見られるようにする。くわしい内容はその下 */}
          {/* いちばん上の行：左に最初の画面へのもどり口、右に「料理をアレンジ」の画面への入口。
              広い画面では、下の「1日の食事」の右はしにそろえる（列の幅は、下の grid の 1.4 : 1 と同じ） */}
          <BackRow label="最初の画面にもどる" shortLabel="最初の画面へ" onClick={openStart} className="lg:w-[calc((100%-1rem)*7/12)]">
            <ArrangeLink onClick={openArrange} />
          </BackRow>
          <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-4 lg:space-y-0">
            <div className="min-w-0 lg:col-start-1 lg:row-start-1">
              <DayMenuPanel
                source={menuSource}
                totals={totals}
                targets={targets}
                actions={(layout) => (
                  <MenuActions
                    menu={menu}
                    totals={totals}
                    layout={layout}
                    savedCount={savedMenus.length}
                    openSlot={openSlot}
                    onAdd={setPickerSlot}
                    onOpenBuild={() => setBuilderOpen(true)}
                    onOpenSave={() => setSavedDialog('save')}
                    onOpenSaved={() => setSavedDialog('load')}
                    onArrange={openArrange}
                    onBackToStart={openStart}
                    onReset={() => {
                      clearMenu()
                      setOpenSlot(null)
                      openStart()
                    }}
                  />
                )}
              >
                <SlotStrip
                  menu={menu}
                  totals={totals}
                  targets={targets}
                  catalog={catalog}
                  open={openSlot}
                  onOpenChange={setOpenSlot}
                  onAdd={setPickerSlot}
                  onRemove={removeItem}
                  onDrink={(slot, item, amount) => changeDrink(slot, item, amount)}
                  onEdit={(slot, uid) => setEditing({ slot, uid })}
                />
              </DayMenuPanel>
            </div>
            <DayInfo
              totals={totals}
              foods={foods}
              swaps={swaps}
              onSwap={(idea) => customizeItem(idea.slot, idea.uid, idea.ingredients)}
              targets={targets}
              profile={profile}
              profileSet={profileSet}
              missingSlots={missingMealSlots(menu, targets)}
              onEditSlotShare={() => {
                setProfileFocus('slotShare')
                setProfileOpen(true)
              }}
              onEditExercise={() => {
                setProfileFocus('exercise')
                setProfileOpen(true)
              }}
              onEditProfile={() => setProfileOpen(true)}
              onStep={runStep}
            />
          </div>
        </main>
      ) : (
        // 読み込み中は、画面の高さいっぱいをとっておく（中身が出たときに、下のものが押し下げられて動かないように。フッターも、中身と一緒に出す）
        <p role="status" className="grid min-h-[70vh] place-items-center text-ink-soft">
          読み込み中…
        </p>
      )}

      {/* データを読み終える前に「献立の例から選ぶ」「保存した食事を呼び出す」を押したとき：窓がひらくまでのあいだ */}
      {!catalog && (builderOpen || savedDialog === 'load') && (
        <p role="status" className="fixed inset-x-4 bottom-6 z-50 mx-auto w-fit rounded-full bg-ink-strong px-5 py-3 text-sm font-bold text-white shadow-lg">
          データを読み込んでいます…
        </p>
      )}

      {catalog && pickerSlot && (
        <Picker
          // 同じ区分でも、ひらき方（しぼりこみ）がちがえば作り直す
          key={`${pickerSlot}:${picker?.start?.tab ?? ''}:${picker?.start?.category ?? ''}`}
          slot={pickerSlot}
          start={picker?.start}
          items={menu[pickerSlot]}
          recentDrinks={recentDrinks}
          catalog={catalog}
          productCategories={catalogState.status === 'ready' ? catalogState.productCategories : {}}
          storesLoaded={storesLoaded}
          showAlcohol={profile.age >= 20}
          favoriteProductIds={favoriteProductIds}
          onToggleFavorite={toggleFavoriteProduct}
          onRegisterProduct={() => setProductForm({ slot: pickerSlot })}
          onRegisterSupplement={() => setProductForm({ slot: pickerSlot, supplement: true })}
          // 配分が0%の区分（朝食をとらない設定など）は、献立の例にもその1食がないので出さない
          onOpenIdeal={isMealSlot(pickerSlot) && targets.slotShare[pickerSlot] > 0 ? () => setIdealMealSlot(pickerSlot) : undefined}
          // 選んでも閉じずに続けて選べるようにする（閉じるのは「できた」か×）
          onPick={(item) => addItem(pickerSlot, item)}
          onUnpick={(uid) => removeItem(pickerSlot, uid)}
          onDrink={(uid, amount) => updateDrink(pickerSlot, uid, amount)}
          onRememberDrink={rememberDrink}
          list={pickerList}
          onList={setPickerList}
          onClose={() => {
            // スマホでは、足した料理がすぐ見えるように、その食事をひらいておく
            if (menu[pickerSlot].length > 0) setOpenSlot(pickerSlot)
            setPickerSlot(null)
          }}
        />
      )}

      {/* 料理を選ぶ画面の上に重ねる。×で料理を選ぶ画面に戻り、呼び出したら両方を閉じる */}
      {catalog && idealMealSlot && (
        <IdealMealDialog
          slot={idealMealSlot}
          menu={menu}
          catalog={catalog}
          targets={targets}
          storesLoaded={storesLoaded}
          onLoad={(items) => {
            replaceSlot(idealMealSlot, items)
            setIdealMealSlot(null)
            setPickerSlot(null)
          }}
          onClose={() => setIdealMealSlot(null)}
        />
      )}

      {catalog && editing && renderEditor(catalog, editing)}

      {/* 料理・食品のページの「1日の食事に入れる」から来たとき。選んだ食事に、料理は1人前、食品は1回の量を入れて、1日の食事の画面へ */}
      {catalog && totals && adding && (
        <SlotChoiceSheet
          title="どの食事に入れますか？"
          lead={adding.lead}
          menu={menu}
          totals={totals}
          onPick={(slot) => {
            addItem(slot, adding.item)
            setAddStart(undefined)
            setOpenSlot(slot)
            openDay()
          }}
          onClose={() => setAddStart(undefined)}
        />
      )}

      {savedDialog === 'save' && (
        <SaveMenuDialog
          saved={savedMenus}
          onSave={(name) => {
            saveMenu(name)
            setSavedDialog(null)
          }}
          onClose={() => setSavedDialog(null)}
        />
      )}

      {catalog && builderOpen && (
        <MenuBuilderDialog
          menu={menu}
          catalog={catalog}
          targets={targets}
          storesLoaded={storesLoaded}
          onLoadDay={(ideal, m) => {
            replaceMenu(m, ideal.name)
            setBuilderOpen(false)
            openDay()
          }}
          // 1食ずつのときは、1食選ぶたびにその区分に入れる（途中で閉じても、選んだところまでは残る）
          onLoadMeal={(slot, items) => {
            replaceSlot(slot, items)
            // 最初の画面からひらいたときは、うしろの画面を1日の食事にしておく
            if (showStart) openDay()
          }}
          onDone={() => {
            setBuilderOpen(false)
            window.scrollTo({ top: 0 })
          }}
          onClose={() => setBuilderOpen(false)}
        />
      )}

      {catalog && savedDialog === 'load' && (
        <SavedMenusDialog
          menu={menu}
          saved={savedMenus}
          catalog={catalog}
          onLoad={(m) => {
            // データの更新でなくなった料理があっても止まらないように外してから入れる
            // コンビニ・メーカーの商品を読み終える前は外さない（読み終えたあとに外す）
            loadMenu(m.id, storesReady ? (x) => knownItemsOnly(x, catalog) : undefined)
            setSavedDialog(null)
            openDay()
          }}
          onDelete={(m) => deleteMenu(m.id)}
          onClose={() => setSavedDialog(null)}
        />
      )}

      {productForm && renderProductForm(productForm)}

      {profileOpen && (
        <ProfileDialog
          profile={profile}
          focus={profileFocus}
          onSave={(p) => {
            setProfile(p)
            setProfileOpen(false)
            setProfileFocus(undefined)
          }}
          onClose={() => {
            setProfileOpen(false)
            setProfileFocus(undefined)
          }}
        />
      )}

      <ConfirmHost />

      {catalog && shownFood && lookupItemExists(shownFood, catalog) && (
        <FoodDetailDialog
          // 別の食品をひらいたら、量などを作り直す
          key={`${shownFood.kind}:${shownFood.refId}`}
          item={shownFood}
          catalog={catalog}
          targets={targets}
          profileSet={profileSet}
          // 栄養素を見た食品を、その量のまま1日の食事に足す
          onAdd={(slot, item) => {
            addItem(slot, item)
            addedOutside.current = true
          }}
          // 近い食材と並べてくらべる：この窓は下にのこし、くらべる窓を上にひらく（閉じると、この食材の一覧にもどる）
          onCompare={(ids) => {
            setCompareIds(ids)
            setCompareOpen(true)
          }}
          onClose={() => {
            setFoodDetail(null)
            setFoodStart(undefined)
          }}
        />
      )}
      {catalog && compareOpen && (
        <FoodCompare
          ids={compareIds}
          catalog={catalog}
          onChange={setCompareIds}
          onOpenFood={setCompareDetail}
          onClose={() => {
            setCompareOpen(false)
            setCompareDetail(null)
          }}
        />
      )}
      {catalog && comparedFood && (
        <FoodDetailDialog
          key={`compare:${comparedFood.refId}`}
          item={comparedFood}
          catalog={catalog}
          targets={targets}
          profileSet={profileSet}
          above
          onAdd={(slot, item) => {
            addItem(slot, item)
            addedOutside.current = true
          }}
          onClose={() => setCompareDetail(null)}
        />
      )}
      {contentReady && <SiteFooter />}
    </div>
    </LoadProblemContext.Provider>
  )
}
