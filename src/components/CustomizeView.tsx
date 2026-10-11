import { useMemo, useState } from 'react'
import { formatPortion } from '../domain/customize'
import { ingredientsTotals, type Catalog } from '../domain/nutrition'
import { NOT_POPULAR, popularRank } from '../domain/popular'
import { rankAndFilter } from '../domain/search'
import { SLOTS, type Dish, type Ingredient, type MyDish } from '../domain/types'
import { recentMyDishes } from '../store/useAppStore'
import { confirmDialog } from './confirm'
import { Customizer } from './Customizer'
import { dishImage, menuItemImage } from './illustration'
import { DISH_CATEGORY_LABEL } from './labels'

const MAX_CARDS = 60

// どれかの区分の定番を上に、郷土料理は基本の料理の後に
const dishRank = (d: Dish) => Math.min(NOT_POPULAR, ...SLOTS.map((slot) => popularRank(slot, `dish:${d.id}`))) + (d.source ? 1 : 0)

const kcalOf = (ingredients: Ingredient[], catalog: Catalog, portion = 1) => {
  try {
    return Math.round(ingredientsTotals(ingredients, catalog.foods).values.energyKcal * portion)
  } catch {
    return null
  }
}

type Editing = { kind: 'dish'; dish: Dish } | { kind: 'myDish'; my: MyDish }

// 1日の食事とは別に、料理を選んで人前や材料を変え、お気に入りに保存する画面
export function CustomizeView({
  catalog,
  myDishes,
  showAlcohol,
  onSaveNew,
  onUpdate,
  onDelete,
}: {
  catalog: Catalog
  myDishes: MyDish[]
  showAlcohol: boolean
  onSaveNew: (d: Omit<MyDish, 'id' | 'createdAt' | 'updatedAt'>) => void
  onUpdate: (id: string, patch: Pick<MyDish, 'name' | 'ingredients' | 'portion'>) => void
  onDelete: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Editing | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const dishes = useMemo(
    () =>
      [...catalog.dishes.values()]
        .filter((d) => showAlcohol || d.category !== 'alcohol')
        .map((d) => ({ d, rank: dishRank(d) }))
        .sort((a, b) => a.rank - b.rank)
        .map((x) => x.d),
    [catalog, showAlcohol],
  )
  const found = useMemo(() => rankAndFilter(dishes, query, (d) => [d.name, d.kana]), [dishes, query])
  const mine = useMemo(() => recentMyDishes(myDishes), [myDishes])
  const close = () => setEditing(null)

  function renderEditor(e: Editing) {
    if (e.kind === 'dish') {
      const { dish } = e
      return (
        <Customizer
          title={dish.name}
          original={dish.ingredients}
          initial={dish.ingredients}
          source={dish.source}
          foods={catalog.foods}
          saveLabel="お気に入りに保存"
          onSave={(name, ingredients, portion) => {
            onSaveNew({ baseDishId: dish.id, name, ingredients, portion })
            setNotice(`「${name}」をお気に入りに保存しました。1日の食事で料理をえらぶとき、いちばん上に出ます`)
            close()
          }}
          onClose={close}
        />
      )
    }
    const { my } = e
    const base = my.baseDishId ? catalog.dishes.get(my.baseDishId) : undefined
    return (
      <Customizer
        title={my.name}
        baseName={base?.name ?? my.name}
        initialName={my.name}
        original={base?.ingredients ?? my.ingredients}
        initial={my.ingredients}
        initialPortion={my.portion ?? 1}
        source={base?.source}
        foods={catalog.foods}
        saveLabel="上書き保存"
        onSave={(name, ingredients, portion) => {
          onUpdate(my.id, { name, ingredients, portion })
          setNotice(`「${name}」を保存しました`)
          close()
        }}
        onClose={close}
      />
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-soft">料理をえらんで、何人前か・材料の量を変えられます。保存すると、1日の食事で料理をえらぶとき上に出ます。</p>
      {notice && (
        <p role="status" className="rounded-2xl bg-ok/15 px-4 py-2 text-sm">
          {notice}
        </p>
      )}

      {mine.length > 0 && (
        <section aria-labelledby="my-dishes-title">
          <h2 id="my-dishes-title" className="mb-2 text-base font-bold">
            カスタマイズした料理
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {mine.map((my) => {
              const portion = my.portion ?? 1
              const kcal = kcalOf(my.ingredients, catalog, portion)
              return (
                <li key={my.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setEditing({ kind: 'myDish', my })}
                    className="flex h-full w-full flex-col items-center rounded-2xl bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <img src={menuItemImage({ uid: '', kind: 'myDish', refId: my.id, portion }, catalog)} alt="" className="mb-2 h-16 w-16 object-contain" loading="lazy" />
                    <span className="line-clamp-2 text-sm font-bold">{my.name}</span>
                    <span className="mt-1 text-xs text-ink-soft">
                      {formatPortion(portion)}
                      {kcal !== null && ` ・ ${kcal}kcal`}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!(await confirmDialog(`「${my.name}」を削除しますか？1日の食事からも外れます。`, { okLabel: '削除する', danger: true }))) return
                      onDelete(my.id)
                      setNotice(null)
                    }}
                    className="absolute top-1 right-1 grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-cream"
                    aria-label={`${my.name}を削除`}
                  >
                    🗑
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="dish-list-title">
        <h2 id="dish-list-title" className="mb-2 text-base font-bold">
          料理をえらぶ
        </h2>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="料理をさがす（例：肉じゃが、カレー）"
          className="mb-3 min-h-11 w-full rounded-full border-2 border-white bg-white px-4 text-base outline-none focus:border-coral"
        />
        {found.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-soft">見つかりませんでした</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {found.slice(0, MAX_CARDS).map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => setEditing({ kind: 'dish', dish: d })}
                  className="group flex h-full w-full flex-col items-center rounded-2xl bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <img src={dishImage(d)} alt="" className="mb-2 h-16 w-16 object-contain transition-transform group-hover:scale-110 group-hover:-rotate-3" loading="lazy" />
                  <span className="line-clamp-2 text-sm font-bold">{d.name}</span>
                  <span className="mt-1 text-xs text-ink-soft">
                    {[DISH_CATEGORY_LABEL[d.category], d.source?.region].filter(Boolean).join('・')}
                    {d.nutrients.energyKcal !== null && ` ・ ${Math.round(d.nutrients.energyKcal)}kcal`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {found.length > MAX_CARDS && <p className="py-3 text-center text-xs text-ink-soft">ほか {found.length - MAX_CARDS} 件。検索でしぼりこめます</p>}
      </section>

      {editing && renderEditor(editing)}
    </div>
  )
}
