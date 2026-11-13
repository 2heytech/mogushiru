import { Fragment, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Customizer } from './components/Customizer'
import { prioritySlots, withSlot } from './domain/customize'
import { CustomizeIcon } from './components/CustomizeIcon'
import { CustomizeView } from './components/CustomizeView'
import { ItemEditor } from './components/ItemEditor'
import { ProductForm } from './components/ProductForm'
import { SupplementForm } from './components/SupplementForm'
import { isSupplement } from './domain/supplement'
import { Picker } from './components/Picker'
import { ProfileDialog, type ProfileFocus } from './components/ProfileDialog'
import { SlotStrip } from './components/SlotStrip'
import { DayMenuPanel } from './components/DayMenuPanel'
import { StartChoice } from './components/StartChoice'
import { RankingView } from './components/RankingView'
import { AboutView } from './components/AboutView'
import { confirmDialog } from './components/confirm'
import { SiteFooter } from './components/SiteFooter'
import { adjustIdealMenu, IDEAL_MENUS, idealMenuAvailable, idealMenuHasProducts } from './domain/idealMenus'
import { isMealSlot, type MealSlot } from './domain/idealMeals'
import { legacyRedirect, nutrientFromSlug, VIEW_META, VIEW_PATH, viewFromLocation, type View } from './routes'
import { ConfirmHost } from './components/ConfirmDialog'
import { IdealMealDialog, LoadMenuDialog, MenuActions, SaveMenuDialog } from './components/SavedMenus'
import { DayInfo } from './components/SummaryPanel'
import { useCatalog, withMyData } from './data/catalog'
import { usePrices } from './data/prices'
import { knownItemsOnly, menuTotals, type Catalog } from './domain/nutrition'
import { computeTargets } from './domain/targets'
import { missingMealSlots } from './domain/dayProgress'
import { SLOTS, type Ingredient, type Slot } from './domain/types'
import { MY_PRODUCT_PREFIX, useAppStore } from './store/useAppStore'
import { DEFAULT_PROFILE_LABEL } from './components/labels'
import { LogoMogu } from './components/Mascot'
import { UiIcon } from './components/UiIcon'

const sameIngredients = (a: Ingredient[], b: Ingredient[]) =>
  a.length === b.length && a.every((x, i) => x.foodId === b[i].foodId && x.grams === b[i].grams)

// スマホではアイコンの下に小さく名前、広い画面では横並び
const NAV_BUTTON =
  'flex min-h-10 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-white px-3 text-xs leading-tight font-bold shadow-sm sm:min-h-11 sm:px-4 sm:text-sm sm:font-normal'

// 最初の画面の「献立の例で試す」で入れる理想の献立（市販品を使わないので、すぐ入れられる）
const SAMPLE_MENU_ID = 'washoku'

// lg（ヘッダーに1段で並べる幅）は、プロフィールのボタンと並ぶので少し小さく
const ICON_CLASS = 'h-6 w-6 shrink-0 sm:h-9 sm:w-9 lg:h-7 lg:w-7 xl:h-9 xl:w-9'

// アプリの機能。title の | は狭い画面で折り返してよい位置。いつも上に並べて、いまどれを見ているかと、ほかに何があるかが分かるようにする
const FEATURES: { view: View; icon: ReactNode; title: string; lead: string }[] = [
  { view: 'menu', icon: <UiIcon name="menu" className={ICON_CLASS} />, title: '1日の|栄養|バランス|を確認', lead: '朝・昼・晩の料理を選んで確かめる' },
  { view: 'ranking', icon: <UiIcon name="ranking" className={ICON_CLASS} />, title: '食品成分|ランキング', lead: '成分の多い食品をさがす' },
  { view: 'customize', icon: <CustomizeIcon className={ICON_CLASS} />, title: '料理を|カスタマイズ', lead: '人前や材料の量を変えて保存' },
]

// 広い画面（lg）ではロゴとプロフィールの間に1段で並べる小さな形
function FeatureTabsCompact({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <nav aria-label="機能の切り替え" className="flex gap-1.5 xl:gap-2">
      {FEATURES.map((f) => {
        const active = f.view === view
        return (
          <a
            key={f.view}
            href={VIEW_PATH[f.view]}
            aria-current={active ? 'page' : undefined}
            onClick={(e) => inAppLink(e, () => onChange(f.view))}
            title={f.lead}
            className={`flex min-h-12 items-center gap-1.5 rounded-full border-2 pr-3 pl-2 text-sm font-bold whitespace-nowrap transition xl:pr-4 ${
              active ? 'border-coral bg-white text-coral-ink shadow-sm' : 'border-transparent bg-white/60 text-ink hover:bg-white'
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

function FeatureTabs({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <nav aria-label="機能の切り替え" className="mb-3 grid grid-cols-3 gap-1.5 sm:mb-4 sm:gap-2 lg:hidden">
      {FEATURES.map((f) => {
        const active = f.view === view
        return (
          <a
            key={f.view}
            href={VIEW_PATH[f.view]}
            aria-current={active ? 'page' : undefined}
            onClick={(e) => inAppLink(e, () => onChange(f.view))}
            className={`block min-h-14 rounded-2xl border-2 px-1 py-1.5 text-center transition sm:min-h-16 sm:px-4 sm:py-2 sm:text-left ${
              active ? 'border-coral bg-white shadow-sm' : 'border-transparent bg-white/60 text-ink-soft hover:bg-white'
            }`}
          >
            {/* スマホは3つ並ぶので、アイコンの下に名前だけ。広い画面では横並びに説明も添える */}
            <span
              className={`flex flex-col items-center gap-0.5 text-[12px] leading-[1.3] font-bold tracking-tight sm:flex-row sm:gap-1.5 sm:text-sm sm:tracking-normal lg:text-base lg:whitespace-nowrap ${active ? 'text-coral-ink' : 'text-ink'}`}
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

// 画面へのリンクは <a href> にしておき（検索エンジンがたどれる・新しいタブでも開ける）、ふつうのクリックはページを読み直さずに切り替える
function inAppLink(e: MouseEvent<HTMLAnchorElement>, go: () => void) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  go()
}

// 画面の切り替えは URL のパス（/ranking/ など）で持つ（ブラウザの戻るで献立に戻れるように）。
// 古い # のリンク（/#ranking）で来たときは、その画面を開いてアドレス欄を新しい URL に直す
function useView(): [View, (v: View) => void] {
  const [view, setView] = useState<View>(() => viewFromLocation(window.location.pathname, window.location.hash))
  useEffect(() => {
    const sync = () => {
      const { pathname, hash, search } = window.location
      const legacy = legacyRedirect(pathname, hash)
      if (legacy) window.history.replaceState(null, '', legacy + search)
      setView(viewFromLocation(window.location.pathname, window.location.hash))
    }
    sync()
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
  const go = (v: View) => {
    if (window.location.pathname !== VIEW_PATH[v]) window.history.pushState(null, '', VIEW_PATH[v])
    setView(v)
    window.scrollTo({ top: 0 })
  }
  return [view, go]
}

// URL のクエリ（?n=iron や ?menu=…）を読んで、読み終えたらアドレス欄から消す
const queryParam = (name: string) => new URLSearchParams(window.location.search).get(name)
function dropQueryParam(name: string) {
  const url = new URL(window.location.href)
  if (!url.searchParams.has(name)) return
  url.searchParams.delete(name)
  window.history.replaceState(null, '', url.pathname + url.search + url.hash)
}

export default function App() {
  const catalogState = useCatalog()
  const prices = usePrices()
  const [view, setView] = useView()
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
  // 1日の食事が空のときに出す「呼び出す／自分でえらぶ」。どちらかで料理が入ったら、あとで全部外してもリセットするまで出さない
  const [startDismissed, setStartDismissed] = useState(() => SLOTS.some((s) => useAppStore.getState().menu[s].length > 0))
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileFocus, setProfileFocus] = useState<ProfileFocus | undefined>()
  const [pickerSlot, setPickerSlot] = useState<Slot | null>(null)
  // 料理をえらぶ画面（朝・昼・晩）から、理想の献立のその1食だけを呼び出す画面
  const [idealMealSlot, setIdealMealSlot] = useState<MealSlot | null>(null)
  const [editing, setEditing] = useState<{ slot: Slot; uid: string } | null>(null)
  // 市販品の登録（slot があれば登録後その区分に追加）・編集
  const [productForm, setProductForm] = useState<{ jan?: string; slot?: Slot; supplement?: boolean } | null>(null)
  const targets = useMemo(() => computeTargets(profile), [profile])
  // 毎回作り直すと、料理をえらぶ画面で1品押すたびに市販品の一覧を全部作り直すことになるので、中身が変わったときだけ作る
  const catalog = useMemo(
    () => (catalogState.status === 'ready' ? withMyData(catalogState.catalog, myDishes, myProducts) : null),
    [catalogState, myDishes, myProducts],
  )
  // コンビニ・メーカーの商品はあとから読むので、読み終えるまでは「ない商品」と決めつけない
  const storesLoaded = catalogState.status === 'ready' && catalogState.storesLoaded
  // データの更新でなくなった市販品などが1日の食事に残っていても、画面が止まらないように外して計算する
  const menu = useMemo(() => (catalog ? knownItemsOnly(storedMenu, catalog) : storedMenu), [catalog, storedMenu])
  useEffect(() => {
    if (catalog && storesLoaded && menu !== storedMenu) pruneMenu((m) => knownItemsOnly(m, catalog))
  }, [catalog, storesLoaded, menu, storedMenu, pruneMenu])
  // 1日の食事にコンビニ・メーカーの商品が入っていれば、読み終えるまで待ってから出す（入っていなければすぐ出す）
  const waitingForStores = Boolean(catalog) && !storesLoaded && menu !== storedMenu
  const totals = useMemo(() => (catalog ? menuTotals(menu, catalog) : null), [catalog, menu])
  const showStart = SLOTS.every((s) => menu[s].length === 0) && !startDismissed
  const sampleMenu = useMemo(() => {
    const ideal = IDEAL_MENUS.find((m) => m.id === SAMPLE_MENU_ID)
    return ideal && catalog && idealMenuAvailable(ideal, catalog) ? ideal : undefined
  }, [catalog])

  // 成分ランキングのページから「くらべ方を変えて見る」で来たとき（/ranking/?n=iron）は、その成分をえらんだ状態で開く
  const [rankingStart] = useState(() => nutrientFromSlug(queryParam('n')) ?? undefined)
  useEffect(() => dropQueryParam('n'), [])

  // 料理の作り方のページから来たとき（/customize/?dish=<料理id>）は、その料理の編集の窓を「つくり方」でひらく
  const [dishStart, setDishStart] = useState(() => queryParam('dish') ?? undefined)
  useEffect(() => dropQueryParam('dish'), [])

  // 献立の例のページから「この献立をアプリで開く」で来たとき（/?menu=<id>）は、その理想の献立をプロフィールに合わせて呼び出す
  const menuRequest = useRef(queryParam('menu'))
  useEffect(() => {
    const id = menuRequest.current
    if (!id || !catalog) return
    const ideal = IDEAL_MENUS.find((m) => m.id === id)
    // 市販品を使う献立は、コンビニ・メーカーの商品を読み終えるまで待つ
    if (ideal && !idealMenuAvailable(ideal, catalog) && idealMenuHasProducts(ideal) && !storesLoaded) return
    menuRequest.current = null
    dropQueryParam('menu')
    if (!ideal || !idealMenuAvailable(ideal, catalog)) return
    const planned = adjustIdealMenu(ideal, catalog, targets)
    const empty = SLOTS.every((s) => useAppStore.getState().menu[s].length === 0)
    void (async () => {
      if (!empty && !(await confirmDialog(`いまの1日の食事を「${ideal.name}」に置き換えますか？`, { okLabel: '呼び出す' }))) return
      replaceMenu(planned, ideal.name)
      setStartDismissed(true)
    })()
  }, [catalog, storesLoaded, targets, replaceMenu])

  function renderEditor(catalog: Catalog, { slot, uid }: { slot: Slot; uid: string }) {
    const item = menu[slot].find((i) => i.uid === uid)
    const close = () => setEditing(null)
    if (!item) return null
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

  return (
    // スマホは1日の食事のボタンを下に固定するので、そのぶん下をあける
    <div className={`mx-auto max-w-6xl px-4 ${view === 'menu' && !showStart ? 'pb-32 md:pb-16' : 'pb-16'}`}>
      <header className="flex items-center justify-between gap-4 py-2.5 sm:py-4 lg:gap-3 xl:gap-4">
        <h1 className="flex shrink-0 items-center gap-1.5">
          <LogoMogu className="h-10 w-10 sm:h-12 sm:w-12" />
          <span className="font-logo text-2xl leading-none tracking-wide text-ink sm:text-[28px]">モグシル</span>
        </h1>
        <div className="hidden lg:block">
          <FeatureTabsCompact view={view} onChange={setView} />
        </div>
        {/* プロフィールの入口はここ1つ。まだ入れていないあいだは、仮の目安で計算していることもこのボタンで伝える */}
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          title={profileSet ? undefined : `目安はいま「${DEFAULT_PROFILE_LABEL}・ふつう」で計算しています`}
          className={`${NAV_BUTTON} ${profileSet ? '' : 'ring-2 ring-coral/50'}`}
        >
          {/* 2行になるぶん横に広いので、狭い幅（小さなスマホと、タブが横に並ぶ lg）ではアイコンをはぶく */}
          <UiIcon name="profile" className={`h-6 w-6 shrink-0 ${profileSet ? '' : 'hidden min-[390px]:block lg:hidden xl:block'}`} />
          {profileSet ? (
            <span>プロフィール</span>
          ) : (
            <span className="flex flex-col text-left">
              <span className="font-bold text-coral-ink">プロフィールを入れる</span>
              <span className="text-[12px] font-normal text-ink-soft">いまは{DEFAULT_PROFILE_LABEL}</span>
            </span>
          )}
        </button>
      </header>

      <FeatureTabs view={view} onChange={setView} />

      {catalogState.status === 'ready' && catalogState.missing.length > 0 && (
        <p className="mb-4 rounded-xl bg-caution/20 px-4 py-2 text-sm">データ準備中：{catalogState.missing.join('・')}のデータはまだ読み込めません</p>
      )}

      {view === 'about' ? (
        <main tabIndex={-1} className="outline-none">
          <AboutView onBack={() => setView('menu')} />
        </main>
      ) : catalog && view === 'customize' ? (
        <main tabIndex={-1} className="outline-none">
          <CustomizeView
            catalog={catalog}
            myDishes={myDishes}
            showAlcohol={profile.age >= 20}
            initialDishId={dishStart}
            // 一度ひらいたら忘れる（ほかの画面からもどってきたとき、同じ料理をまたひらかない）
            onInitialDishOpened={() => setDishStart(undefined)}
            onSaveNew={saveMyDish}
            onUpdate={updateMyDish}
            onDelete={deleteMyDish}
          />
        </main>
      ) : catalog && view === 'ranking' ? (
        <main tabIndex={-1} className="outline-none">
          <RankingView catalog={catalog} targets={targets} prices={prices} initialNutrient={rankingStart} />
        </main>
      ) : catalog && totals && !waitingForStores ? (
        <main tabIndex={-1} className="space-y-4 outline-none">
          {showStart ? (
            // 1日の食事が空のうちは、どう入れるかを選ぶまで朝・昼・晩や栄養の表示を出さない
            <StartChoice
              savedCount={savedMenus.length}
              sampleName={sampleMenu?.name}
              onTrySample={() => {
                if (!sampleMenu) return
                // いまの目安（プロフィール）に合わせた量で入れる
                replaceMenu(adjustIdealMenu(sampleMenu, catalog, targets), sampleMenu.name)
                setStartDismissed(true)
                window.scrollTo({ top: 0 })
              }}
              onLoad={() => setSavedDialog('load')}
              onPickSelf={() => {
                setStartDismissed(true)
                // 朝食をとらない配分なら昼から
                setPickerSlot(SLOTS.find((s) => targets.slotShare[s] > 0) ?? 'breakfast')
              }}
            />
          ) : (
            <>
              {/* いちばん上に1日の食事（見出し・ボタン・朝〜その他）、その下に情報 */}
              <DayMenuPanel
                source={menuSource}
                totals={totals}
                targets={targets}
                actions={(layout) => (
                  <MenuActions
                    menu={menu}
                    layout={layout}
                    savedCount={savedMenus.length}
                    onOpenSave={() => setSavedDialog('save')}
                    onOpenLoad={() => setSavedDialog('load')}
                    onReset={() => {
                      clearMenu()
                      setStartDismissed(false)
                    }}
                  />
                )}
              >
                <SlotStrip
                  menu={menu}
                  totals={totals}
                  targets={targets}
                  catalog={catalog}
                  onAdd={setPickerSlot}
                  onRemove={removeItem}
                  onEdit={(slot, uid) => setEditing({ slot, uid })}
                />
              </DayMenuPanel>
              <DayInfo
                totals={totals}
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
              />
            </>
          )}
        </main>
      ) : (
        <p className="py-20 text-center text-ink-soft">読み込み中…</p>
      )}

      {catalog && pickerSlot && (
        <Picker
          slot={pickerSlot}
          catalog={catalog}
          productCategories={catalogState.status === 'ready' ? catalogState.productCategories : {}}
          storesLoaded={storesLoaded}
          showAlcohol={profile.age >= 20}
          favoriteProductIds={favoriteProductIds}
          onToggleFavorite={toggleFavoriteProduct}
          onRegisterProduct={() => setProductForm({ slot: pickerSlot })}
          onRegisterSupplement={() => setProductForm({ slot: pickerSlot, supplement: true })}
          // 配分が0%の区分（朝食をとらない設定など）は、理想の献立にもその1食がないので出さない
          onOpenIdeal={isMealSlot(pickerSlot) && targets.slotShare[pickerSlot] > 0 ? () => setIdealMealSlot(pickerSlot) : undefined}
          // 選んでも閉じずに続けて選べるようにする（閉じるのは「できた」か×）
          onPick={(item) => addItem(pickerSlot, item)}
          onUnpick={(uid) => removeItem(pickerSlot, uid)}
          onClose={() => setPickerSlot(null)}
        />
      )}

      {/* 料理をえらぶ画面の上に重ねる。×で料理をえらぶ画面に戻り、呼び出したら両方を閉じる */}
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

      {catalog && savedDialog === 'load' && (
        <LoadMenuDialog
          menu={menu}
          saved={savedMenus}
          catalog={catalog}
          targets={targets}
          storesLoaded={storesLoaded}
          onLoadIdeal={(ideal, m) => {
            replaceMenu(m, ideal.name)
            setStartDismissed(true)
            setSavedDialog(null)
          }}
          onLoadIdealSlot={(_, slot, items) => {
            replaceSlot(slot, items)
            setStartDismissed(true)
            setSavedDialog(null)
          }}
          onLoad={(m) => {
            // データの更新でなくなった料理があっても止まらないように外してから入れる
            // コンビニ・メーカーの商品を読み終える前は外さない（読み終えたあとに外す）
            loadMenu(m.id, storesLoaded ? (x) => knownItemsOnly(x, catalog) : undefined)
            setStartDismissed(true)
            setSavedDialog(null)
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

      <SiteFooter onAbout={() => setView('about')} />
    </div>
  )
}
