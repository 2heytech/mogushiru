import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
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
import { confirmDialog } from './components/confirm'
import { ConfirmHost } from './components/ConfirmDialog'
import { LoadMenuDialog, MenuActions, SaveMenuDialog } from './components/SavedMenus'
import { DayInfo } from './components/SummaryPanel'
import { useCatalog, withMyData } from './data/catalog'
import { usePrices } from './data/prices'
import { knownItemsOnly, menuTotals, type Catalog } from './domain/nutrition'
import { computeTargets } from './domain/targets'
import { SLOTS, type Ingredient, type Slot } from './domain/types'
import { MY_PRODUCT_PREFIX, useAppStore } from './store/useAppStore'
import { LogoMogu } from './components/Mascot'
import { UiIcon } from './components/UiIcon'

const sameIngredients = (a: Ingredient[], b: Ingredient[]) =>
  a.length === b.length && a.every((x, i) => x.foodId === b[i].foodId && x.grams === b[i].grams)

// スマホではアイコンの下に小さく名前、広い画面では横並び
const NAV_BUTTON =
  'flex min-h-10 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-white px-3 text-xs leading-tight font-bold shadow-sm sm:min-h-11 sm:px-4 sm:text-sm sm:font-normal'

type View = 'menu' | 'ranking' | 'customize'

const ICON_CLASS = 'h-6 w-6 shrink-0 sm:h-9 sm:w-9'

// アプリの機能。title の | は狭い画面で折り返してよい位置。いつも上に並べて、いまどれを見ているかと、ほかに何があるかが分かるようにする
const FEATURES: { view: View; icon: ReactNode; title: string; lead: string }[] = [
  { view: 'menu', icon: <UiIcon name="menu" className={ICON_CLASS} />, title: '1日の|栄養|バランス|を確認', lead: '朝・昼・晩の料理を選んで確かめる' },
  { view: 'ranking', icon: <UiIcon name="ranking" className={ICON_CLASS} />, title: '食品成分|ランキング', lead: '成分の多い食品をさがす' },
  { view: 'customize', icon: <CustomizeIcon className={ICON_CLASS} />, title: '料理を|カスタマイズ', lead: '人前や材料の量を変えて保存' },
]

// 広い画面（lg）ではロゴとプロフィールの間に1段で並べる小さな形
function FeatureTabsCompact({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <nav aria-label="機能の切り替え" className="flex gap-2">
      {FEATURES.map((f) => {
        const active = f.view === view
        return (
          <button
            key={f.view}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => onChange(f.view)}
            title={f.lead}
            className={`flex min-h-12 items-center gap-1.5 rounded-full border-2 pr-4 pl-2 text-sm font-bold whitespace-nowrap transition ${
              active ? 'border-coral bg-white text-coral-ink shadow-sm' : 'border-transparent bg-white/60 text-ink hover:bg-white'
            }`}
          >
            {f.icon}
            {f.title.replaceAll('|', '')}
          </button>
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
          <button
            key={f.view}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => onChange(f.view)}
            className={`min-h-14 rounded-2xl border-2 px-1 py-1.5 text-center transition sm:min-h-16 sm:px-4 sm:py-2 sm:text-left ${
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
          </button>
        )
      })}
    </nav>
  )
}

const viewFromHash = (): View => (window.location.hash === '#ranking' ? 'ranking' : window.location.hash === '#customize' ? 'customize' : 'menu')

// 画面の切り替えは URL の # で持つ（ブラウザの戻るで献立に戻れるように）
function useView(): [View, (v: View) => void] {
  const [view, setView] = useState<View>(viewFromHash)
  useEffect(() => {
    const onHash = () => setView(viewFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const go = (v: View) => {
    window.location.hash = v === 'menu' ? '' : v
    setView(v)
    window.scrollTo({ top: 0 })
  }
  return [view, go]
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
      <header className="flex items-center justify-between gap-4 py-2.5 sm:py-4">
        <h1 className="flex shrink-0 items-center gap-1.5">
          <LogoMogu className="h-10 w-10 sm:h-12 sm:w-12" />
          <span className="font-logo text-2xl leading-none tracking-wide text-ink sm:text-[28px]">モグシル</span>
        </h1>
        <div className="hidden lg:block">
          <FeatureTabsCompact view={view} onChange={setView} />
        </div>
        <button type="button" onClick={() => setProfileOpen(true)} className={`relative ${NAV_BUTTON}`}>
          <UiIcon name="profile" className="h-6 w-6 shrink-0" />
          <span>プロフィール</span>
          {!profileSet && (
            <>
              <span className="rounded-full bg-alert/15 px-1.5 py-0.5 text-[12px] leading-none font-bold text-coral-ink sm:hidden">未入力</span>
              <span className="absolute top-1 right-1 hidden h-2.5 w-2.5 rounded-full bg-alert ring-2 ring-white sm:block" aria-hidden />
              <span className="sr-only">（未入力）</span>
            </>
          )}
        </button>
      </header>

      <FeatureTabs view={view} onChange={setView} />

      {!profileSet && (
        <p className="mb-3 hidden text-right sm:block">
          <button type="button" onClick={() => setProfileOpen(true)} className="min-h-9 rounded-full bg-white px-3 text-left text-xs shadow-sm">
            目安は「30〜49歳・女性・ふつう」です。
            <span className="font-bold whitespace-nowrap text-coral-ink">プロフィールを入れる →</span>
          </button>
        </p>
      )}

      {catalogState.status === 'ready' && catalogState.missing.length > 0 && (
        <p className="mb-4 rounded-xl bg-caution/20 px-4 py-2 text-sm">データ準備中：{catalogState.missing.join('・')}のデータはまだ読み込めません</p>
      )}

      {catalog && view === 'customize' ? (
        <main>
          <CustomizeView
            catalog={catalog}
            myDishes={myDishes}
            showAlcohol={profile.age >= 20}
            onSaveNew={saveMyDish}
            onUpdate={updateMyDish}
            onDelete={deleteMyDish}
          />
        </main>
      ) : catalog && view === 'ranking' ? (
        <main>
          <RankingView catalog={catalog} targets={targets} prices={prices} />
        </main>
      ) : catalog && totals && !waitingForStores ? (
        <main className="space-y-4">
          {showStart ? (
            // 1日の食事が空のうちは、どう入れるかを選ぶまで朝・昼・晩や栄養の表示を出さない
            <StartChoice
              savedCount={savedMenus.length}
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
                onEditSlotShare={() => {
                  setProfileFocus('slotShare')
                  setProfileOpen(true)
                }}
                onEditExercise={() => {
                  setProfileFocus('exercise')
                  setProfileOpen(true)
                }}
                onEditProfile={() => setProfileOpen(true)}
                profileSet={profileSet}
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
          // 選んでも閉じずに続けて選べるようにする（閉じるのは「できた」か×）
          onPick={(item) => addItem(pickerSlot, item)}
          onUnpick={(uid) => removeItem(pickerSlot, uid)}
          onClose={() => setPickerSlot(null)}
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

      <footer className="mt-12 text-xs leading-relaxed text-ink-soft">
        <p>表示される値は目安です。医療・栄養指導の代わりにはなりません。</p>
        <p>出典：文部科学省「日本食品標準成分表（八訂）増補2023年」（2026年3月27日訂正反映）を加工して作成／農林水産省「うちの郷土料理」（https://www.maff.go.jp/j/keikaku/syokubunka/k_ryouri/）を加工して作成／セブン-イレブン・ファミリーマート・ローソン・トップバリュ・各食品メーカーの公式サイトの商品情報（栄養成分表示の数値。商品ごとに出典と取得日を表示）／Open Food Facts（ODbL）／厚生労働省「日本人の食事摂取基準（2025年版）」／総務省「小売物価統計調査（動向編）」（価格）</p>
      </footer>
    </div>
  )
}
