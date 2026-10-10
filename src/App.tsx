import { useEffect, useMemo, useState } from 'react'
import { Customizer } from './components/Customizer'
import { Picker } from './components/Picker'
import { ProfileDialog } from './components/ProfileDialog'
import { SlotBoard } from './components/SlotBoard'
import { RankingView } from './components/RankingView'
import { SummaryPanel } from './components/SummaryPanel'
import { useCatalog, withMyDishes } from './data/catalog'
import { usePrices } from './data/prices'
import { menuTotals, type Catalog } from './domain/nutrition'
import { computeTargets } from './domain/targets'
import type { Slot } from './domain/types'
import { useAppStore } from './store/useAppStore'
import { BowlMogu } from './components/Mascot'

// スマホでは絵文字の下に小さく名前、広い画面では横並び
const NAV_BUTTON =
  'flex min-h-11 min-w-14 flex-col items-center justify-center whitespace-nowrap rounded-2xl bg-white px-2 text-[11px] leading-tight shadow-sm sm:flex-row sm:gap-1 sm:rounded-full sm:px-4 sm:text-sm'

type View = 'menu' | 'ranking'

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
  } = useAppStore()
  const [profileOpen, setProfileOpen] = useState(false)
  const [pickerSlot, setPickerSlot] = useState<Slot | null>(null)
  const [customizing, setCustomizing] = useState<{ slot: Slot; uid: string } | null>(null)
  const targets = useMemo(() => computeTargets(profile), [profile])
  const catalog = catalogState.status === 'ready' ? withMyDishes(catalogState.catalog, myDishes) : null
  const totals = useMemo(() => (catalog ? menuTotals(menu, catalog) : null), [catalog, menu])

  function renderCustomizer(catalog: Catalog, { slot, uid }: { slot: Slot; uid: string }) {
    const item = menu[slot].find((i) => i.uid === uid)
    const close = () => setCustomizing(null)
    if (item?.kind === 'dish') {
      const dish = catalog.dishes.get(item.refId)
      if (!dish) return null
      return (
        <Customizer
          title={dish.name}
          original={dish.ingredients}
          initial={item.customIngredients ?? dish.ingredients}
          foods={catalog.foods}
          saveLabel="マイ料理に保存"
          onApply={(ingredients) => {
            customizeItem(slot, uid, ingredients)
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
    if (item?.kind === 'myDish') {
      const my = catalog.myDishes.get(item.refId)
      if (!my) return null
      const base = my.baseDishId ? catalog.dishes.get(my.baseDishId) : undefined
      return (
        <Customizer
          title={my.name}
          original={base?.ingredients ?? my.ingredients}
          initial={my.ingredients}
          foods={catalog.foods}
          saveLabel="マイ料理を上書き保存"
          onSave={(name, ingredients) => {
            updateMyDish(my.id, { name, ingredients })
            close()
          }}
          onClose={close}
        />
      )
    }
    return null
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <header className="flex items-center justify-between py-4">
        <h1 className="flex shrink-0 items-center gap-1.5">
          <BowlMogu slot="dinner" mood="happy" color="#ff8a65" className="h-11 w-11" label="ちゃわんモグ" />
          <span className="font-logo text-[28px] leading-none tracking-wide text-ink">モグシル</span>
        </h1>
        <nav className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setView(view === 'ranking' ? 'menu' : 'ranking')}
            className={NAV_BUTTON}
          >
            <span aria-hidden="true">{view === 'ranking' ? '🍚' : '🏆'}</span>
            <span>{view === 'ranking' ? '献立' : 'ランキング'}</span>
          </button>
          <button type="button" onClick={() => setProfileOpen(true)} className={NAV_BUTTON}>
            <span aria-hidden="true">👤</span>
            <span>プロフィール</span>
          </button>
        </nav>
      </header>

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
            <SlotBoard
              menu={menu}
              totals={totals}
              targets={targets}
              catalog={catalog}
              onAdd={setPickerSlot}
              onRemove={removeItem}
              onPortion={updatePortion}
              onCustomize={(slot, uid) => setCustomizing({ slot, uid })}
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
          onPick={(item) => {
            addItem(pickerSlot, item)
            setPickerSlot(null)
          }}
          onClose={() => setPickerSlot(null)}
        />
      )}

      {catalog && customizing && renderCustomizer(catalog, customizing)}

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
        <p>出典：文部科学省「日本食品標準成分表（八訂）増補2023年」（2026年3月27日訂正反映）を加工して作成／Open Food Facts（ODbL）／厚生労働省「日本人の食事摂取基準（2025年版）」／総務省「小売物価統計調査（動向編）」（価格）</p>
      </footer>
    </div>
  )
}
