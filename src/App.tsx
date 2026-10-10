import { useEffect, useMemo, useState } from 'react'
import { Customizer } from './components/Customizer'
import { ItemEditor } from './components/ItemEditor'
import { PortionEditor } from './components/PortionEditor'
import { ProductForm } from './components/ProductForm'
import { Picker } from './components/Picker'
import { ProfileDialog } from './components/ProfileDialog'
import { SlotBoard } from './components/SlotBoard'
import { RankingView } from './components/RankingView'
import { MenuActions, SavedMenusDialog } from './components/SavedMenus'
import { SummaryPanel } from './components/SummaryPanel'
import { useCatalog, withMyData } from './data/catalog'
import { usePrices } from './data/prices'
import { knownItemsOnly, menuTotals, type Catalog } from './domain/nutrition'
import { computeTargets } from './domain/targets'
import type { Ingredient, Slot } from './domain/types'
import { MY_PRODUCT_PREFIX, useAppStore } from './store/useAppStore'
import { BowlMogu } from './components/Mascot'

const sameIngredients = (a: Ingredient[], b: Ingredient[]) =>
  a.length === b.length && a.every((x, i) => x.foodId === b[i].foodId && x.grams === b[i].grams)

// スマホでは絵文字の下に小さく名前、広い画面では横並び
const NAV_BUTTON =
  'flex min-h-11 min-w-14 flex-col items-center justify-center whitespace-nowrap rounded-2xl bg-white px-2 text-[11px] leading-tight shadow-sm sm:flex-row sm:gap-1 sm:rounded-full sm:px-4 sm:text-sm'

type View = 'menu' | 'ranking'

// アプリの2つの機能。いつも上に並べて、いまどちらを見ているかと、もう一方があることが分かるようにする
const FEATURES: { view: View; emoji: string; title: string; lead: string }[] = [
  { view: 'menu', emoji: '🍱', title: '1日の食事をつくる', lead: '料理を選んで1日の栄養バランスを見る' },
  { view: 'ranking', emoji: '🏆', title: '食品の栄養ランキング', lead: '栄養素の多い食品をさがす' },
]

function FeatureTabs({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <nav aria-label="機能の切り替え" className="mb-4 grid grid-cols-2 gap-2">
      {FEATURES.map((f) => {
        const active = f.view === view
        return (
          <button
            key={f.view}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => onChange(f.view)}
            className={`min-h-16 rounded-2xl border-2 px-2.5 py-2 text-left transition sm:px-4 ${
              active ? 'border-coral bg-white shadow-sm' : 'border-transparent bg-white/60 text-ink-soft hover:bg-white'
            }`}
          >
            <span className={`flex items-center gap-1 whitespace-nowrap text-xs font-bold leading-snug sm:gap-1.5 sm:text-base ${active ? 'text-coral-dark' : 'text-ink'}`}>
              <span aria-hidden="true" className="text-base sm:text-2xl">
                {f.emoji}
              </span>
              {f.title}
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug sm:text-xs">{f.lead}</span>
          </button>
        )
      })}
    </nav>
  )
}

const viewFromHash = (): View => (window.location.hash === '#ranking' ? 'ranking' : 'menu')

// 画面の切り替えは URL の # で持つ（ブラウザの戻るで献立に戻れるように）
function useView(): [View, (v: View) => void] {
  const [view, setView] = useState<View>(viewFromHash)
  useEffect(() => {
    const onHash = () => setView(viewFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const go = (v: View) => {
    window.location.hash = v === 'ranking' ? 'ranking' : ''
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
    menu,
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
    myProducts,
    favoriteProductIds,
    saveMyProduct,
    updateMyProduct,
    deleteMyProduct,
    toggleFavoriteProduct,
    savedMenus,
    saveMenu,
    loadMenu,
    deleteMenu,
    clearMenu,
  } = useAppStore()
  const [savedOpen, setSavedOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [pickerSlot, setPickerSlot] = useState<Slot | null>(null)
  const [editing, setEditing] = useState<{ slot: Slot; uid: string } | null>(null)
  // 市販品の登録（slot があれば登録後その区分に追加）・編集
  const [productForm, setProductForm] = useState<{ jan?: string; slot?: Slot } | null>(null)
  const targets = useMemo(() => computeTargets(profile), [profile])
  const catalog = catalogState.status === 'ready' ? withMyData(catalogState.catalog, myDishes, myProducts) : null
  const totals = useMemo(() => (catalog ? menuTotals(menu, catalog) : null), [catalog, menu])

  function renderEditor(catalog: Catalog, { slot, uid }: { slot: Slot; uid: string }) {
    const item = menu[slot].find((i) => i.uid === uid)
    const close = () => setEditing(null)
    if (!item) return null
    const portion = <PortionEditor key={item.uid} item={item} catalog={catalog} onPortion={(p) => updatePortion(slot, uid, p)} />
    if (item.kind === 'dish') {
      const dish = catalog.dishes.get(item.refId)
      if (!dish) return null
      return (
        <Customizer
          title={dish.name}
          original={dish.ingredients}
          initial={item.customIngredients ?? dish.ingredients}
          source={dish.source}
          foods={catalog.foods}
          saveLabel="お気に入りに保存"
          extra={portion}
          onApply={(ingredients) => {
            customizeItem(slot, uid, sameIngredients(ingredients, dish.ingredients) ? null : ingredients)
            close()
          }}
          onSave={(name, ingredients) => {
            const my = saveMyDish({ baseDishId: dish.id, name, ingredients })
            replaceWithMyDish(slot, uid, my.id)
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
          original={base?.ingredients ?? my.ingredients}
          initial={my.ingredients}
          source={base?.source}
          foods={catalog.foods}
          saveLabel="お気に入りを上書き保存"
          extra={portion}
          onSave={(name, ingredients) => {
            updateMyDish(my.id, { name, ingredients })
            close()
          }}
          onClose={close}
        />
      )
    }
    const isMine = item.kind === 'product' && item.refId.startsWith(MY_PRODUCT_PREFIX)
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

  function renderProductForm({ jan, slot }: { jan?: string; slot?: Slot }) {
    const initial = jan ? myProducts.find((p) => p.jan === jan) : undefined
    const close = () => setProductForm(null)
    return (
      <ProductForm
        initial={initial}
        onSave={(input) => {
          if (initial) updateMyProduct(initial.jan, input)
          else {
            const p = saveMyProduct(input)
            if (slot) {
              addItem(slot, { kind: 'product', refId: p.jan, portion: p.basis === 'serving' ? 1 : (p.servingGrams ?? 100) })
              setPickerSlot(null)
            }
          }
          close()
        }}
        onDelete={
          initial
            ? () => {
                if (!window.confirm(`「${initial.name}」を削除しますか？1日の食事からも外れます。`)) return
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
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <header className="flex items-center justify-between py-4">
        <h1 className="flex shrink-0 items-center gap-1.5">
          <BowlMogu slot="dinner" mood="happy" color="#ff8a65" className="h-11 w-11" label="ちゃわんモグ" />
          <span className="font-logo text-[28px] leading-none tracking-wide text-ink">モグシル</span>
        </h1>
        <button type="button" onClick={() => setProfileOpen(true)} className={NAV_BUTTON}>
          <span aria-hidden="true">👤</span>
          <span>プロフィール</span>
        </button>
      </header>

      <FeatureTabs view={view} onChange={setView} />

      {!profileSet && (
        <button type="button" onClick={() => setProfileOpen(true)} className="mb-4 w-full rounded-xl bg-white px-4 py-2 text-left text-sm shadow-sm">
          いまは「30〜49歳・女性・ふつう」の目安で表示しています。<span className="font-bold text-coral">プロフィールを入れる →</span>
        </button>
      )}

      {catalogState.status === 'ready' && catalogState.missing.length > 0 && (
        <p className="mb-4 rounded-xl bg-caution/20 px-4 py-2 text-sm">データ準備中：{catalogState.missing.join('・')}のデータはまだ読み込めません</p>
      )}

      {catalog && view === 'ranking' ? (
        <main>
          <RankingView catalog={catalog} targets={targets} prices={prices} />
        </main>
      ) : catalog && totals ? (
        <main className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="order-2 lg:order-1">
            <MenuActions menu={menu} savedCount={savedMenus.length} onOpenSaved={() => setSavedOpen(true)} onReset={clearMenu} />
            <SlotBoard
              menu={menu}
              totals={totals}
              targets={targets}
              catalog={catalog}
              onAdd={setPickerSlot}
              onRemove={removeItem}
              onEdit={(slot, uid) => setEditing({ slot, uid })}
            />
          </div>
          <aside className="order-1 lg:order-2 lg:sticky lg:top-4 lg:self-start">
            <SummaryPanel totals={totals} targets={targets} />
          </aside>
        </main>
      ) : (
        <p className="py-20 text-center text-ink-soft">読み込み中…</p>
      )}

      {catalog && pickerSlot && (
        <Picker
          slot={pickerSlot}
          catalog={catalog}
          productCategories={catalogState.status === 'ready' ? catalogState.productCategories : {}}
          showAlcohol={profile.age >= 20}
          favoriteProductIds={favoriteProductIds}
          onToggleFavorite={toggleFavoriteProduct}
          onRegisterProduct={() => setProductForm({ slot: pickerSlot })}
          // 選んでも閉じずに続けて選べるようにする（閉じるのは「できた」か×）
          onPick={(item) => addItem(pickerSlot, item)}
          onClose={() => setPickerSlot(null)}
        />
      )}

      {catalog && editing && renderEditor(catalog, editing)}

      {catalog && savedOpen && (
        <SavedMenusDialog
          menu={menu}
          saved={savedMenus}
          catalog={catalog}
          onSave={(name) => {
            saveMenu(name)
            setSavedOpen(false)
          }}
          onLoad={(m) => {
            // データの更新でなくなった料理があっても止まらないように外してから入れる
            loadMenu(m.id, (x) => knownItemsOnly(x, catalog))
            setSavedOpen(false)
          }}
          onDelete={(m) => deleteMenu(m.id)}
          onClose={() => setSavedOpen(false)}
        />
      )}

      {productForm && renderProductForm(productForm)}

      {profileOpen && (
        <ProfileDialog
          profile={profile}
          onSave={(p) => {
            setProfile(p)
            setProfileOpen(false)
          }}
          onClose={() => setProfileOpen(false)}
        />
      )}

      <footer className="mt-12 text-xs leading-relaxed text-ink-soft">
        <p>表示される値は目安です。医療・栄養指導の代わりにはなりません。</p>
        <p>出典：文部科学省「日本食品標準成分表（八訂）増補2023年」（2026年3月27日訂正反映）を加工して作成／農林水産省「うちの郷土料理」（https://www.maff.go.jp/j/keikaku/syokubunka/k_ryouri/）を加工して作成／Open Food Facts（ODbL）／厚生労働省「日本人の食事摂取基準（2025年版）」／総務省「小売物価統計調査（動向編）」（価格）</p>
      </footer>
    </div>
  )
}
