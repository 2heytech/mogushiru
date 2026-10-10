import { useMemo, useState } from 'react'
import { Picker } from './components/Picker'
import { ProfileDialog } from './components/ProfileDialog'
import { SlotBoard } from './components/SlotBoard'
import { SummaryPanel } from './components/SummaryPanel'
import { useCatalog, withMyDishes } from './data/catalog'
import { menuTotals } from './domain/nutrition'
import { computeTargets } from './domain/targets'
import type { Slot } from './domain/types'
import { useAppStore } from './store/useAppStore'

export default function App() {
  const catalogState = useCatalog()
  const { menu, myDishes, profile, profileSet, setProfile, removeItem, addItem, updatePortion } = useAppStore()
  const [profileOpen, setProfileOpen] = useState(false)
  const [pickerSlot, setPickerSlot] = useState<Slot | null>(null)
  const targets = useMemo(() => computeTargets(profile), [profile])
  const catalog = catalogState.status === 'ready' ? withMyDishes(catalogState.catalog, myDishes) : null
  const totals = useMemo(() => (catalog ? menuTotals(menu, catalog) : null), [catalog, menu])

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <header className="flex items-center justify-between py-4">
        <h1 className="text-2xl font-bold text-coral">モグシル</h1>
        <button type="button" onClick={() => setProfileOpen(true)} className="min-h-11 rounded-full bg-white px-4 text-sm shadow-sm">
          👤 プロフィール
        </button>
      </header>

      {!profileSet && (
        <button type="button" onClick={() => setProfileOpen(true)} className="mb-4 w-full rounded-xl bg-white px-4 py-2 text-left text-sm shadow-sm">
          いまは「30〜49歳・女性・ふつう」の目安で表示しています。<span className="font-bold text-coral">プロフィールを入れる →</span>
        </button>
      )}

      {catalogState.status === 'ready' && catalogState.missing.length > 0 && (
        <p className="mb-4 rounded-xl bg-caution/20 px-4 py-2 text-sm">データ準備中：{catalogState.missing.join('・')}のデータはまだ読み込めません</p>
      )}

      {catalog && totals ? (
        <main className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="order-2 lg:order-1">
            <SlotBoard menu={menu} totals={totals} catalog={catalog} onAdd={setPickerSlot} onRemove={removeItem} onPortion={updatePortion} />
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
        <p>出典：文部科学省「日本食品標準成分表（八訂）増補2023年」（2026年3月27日訂正反映）を加工して作成／Open Food Facts（ODbL）／厚生労働省「日本人の食事摂取基準（2025年版）」</p>
      </footer>
    </div>
  )
}
