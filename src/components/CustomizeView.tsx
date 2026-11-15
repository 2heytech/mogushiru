import { useEffect, useMemo, useState } from 'react'
import { formatPortion, prioritySlots } from '../domain/customize'
import { ingredientsTotals, type Catalog } from '../domain/nutrition'
import { mealFirstRank } from '../domain/popular'
import { rankAndFilter } from '../domain/search'
import { SLOTS, type Dish, type DishCategory, type Ingredient, type MyDish, type Slot } from '../domain/types'
import { recentMyDishes } from '../store/useAppStore'
import { confirmDialog } from './confirm'
import { Customizer } from './Customizer'
import { dishImage, menuItemImage } from './illustration'
import { DISH_CATEGORY_LABEL, SLOT_LABEL } from './labels'

const MAX_CARDS = 60

// 「朝・昼」「すべての食事」
const slotsText = (slots: Slot[]) => (slots.length === SLOTS.length ? 'すべての食事' : slots.map((s) => SLOT_LABEL[s]).join('・'))

// 朝・昼・晩の定番を上に（その他だけの定番はそのあと）、郷土料理は基本の料理の後に
const dishRank = (d: Dish) => mealFirstRank(`dish:${d.id}`) + (d.source ? 1 : 0)

const kcalOf = (ingredients: Ingredient[], catalog: Catalog, portion = 1) => {
  try {
    return Math.round(ingredientsTotals(ingredients, catalog.foods).values.energyKcal * portion)
  } catch {
    return null
  }
}

type Editing = { kind: 'dish'; dish: Dish; tab?: 'edit' | 'recipe' } | { kind: 'myDish'; my: MyDish }

// 入口に置く、できることの例。押すと、その料理の編集の窓がひらく
const EXAMPLES: { dishId: string; title: string; desc: string }[] = [
  { dishId: 'rice', title: 'ごはんの量を変える', desc: '少なめや大盛りにする' },
  { dishId: 'nikujaga', title: '肉を入れ替える', desc: '肉じゃがの牛肉を豚肉に' },
  { dishId: 'miso-soup', title: '具を足す・へらす', desc: 'みそ汁の具やみその量を変える' },
]

// 料理の種類でしぼるボタンの並び
const CATEGORIES = Object.keys(DISH_CATEGORY_LABEL) as DishCategory[]

// 1日の食事とは別に、料理を選んで人前や材料を変え、お気に入りに保存する画面
export function CustomizeView({
  catalog,
  myDishes,
  showAlcohol,
  initialDishId,
  onInitialDishOpened,
  onSaveNew,
  onUpdate,
  onDelete,
}: {
  catalog: Catalog
  myDishes: MyDish[]
  showAlcohol: boolean
  // 料理の作り方のページから来たときに、はじめから編集の窓をひらく料理
  initialDishId?: string
  onInitialDishOpened?: () => void
  onSaveNew: (d: Omit<MyDish, 'id' | 'createdAt' | 'updatedAt'>) => void
  onUpdate: (id: string, patch: Pick<MyDish, 'name' | 'ingredients' | 'portion' | 'slots'>) => void
  onDelete: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<DishCategory | null>(null)
  const [editing, setEditing] = useState<Editing | null>(() => {
    const dish = initialDishId ? catalog.dishes.get(initialDishId) : undefined
    return dish ? { kind: 'dish', dish, tab: dish.recipe || dish.source ? 'recipe' : 'edit' } : null
  })
  // ひらいたことを伝える（親が initialDishId を消すので、呼ぶのは1回だけ）
  useEffect(() => {
    if (initialDishId) onInitialDishOpened?.()
  }, [initialDishId, onInitialDishOpened])
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
  const searched = useMemo(() => rankAndFilter(dishes, query, (d) => [d.name, d.kana]), [dishes, query])
  const found = useMemo(() => (category ? searched.filter((d) => d.category === category) : searched), [searched, category])
  // 料理のある種類だけ（お酒を出さない設定のときは「お酒」も出ない）
  const categories = useMemo(() => CATEGORIES.filter((c) => dishes.some((d) => d.category === c)), [dishes])
  const examples = useMemo(() => EXAMPLES.flatMap((e) => (catalog.dishes.get(e.dishId) ? [{ ...e, dish: catalog.dishes.get(e.dishId)! }] : [])), [catalog])
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
          recipe={dish.recipe}
          initialTab={e.tab}
          foods={catalog.foods}
          saveLabel="お気に入りに保存"
          initialSlots={dish.suggestedSlots.length ? dish.suggestedSlots : [...SLOTS]}
          onSave={(name, ingredients, portion, slots) => {
            onSaveNew({ baseDishId: dish.id, name, ingredients, portion, slots })
            setNotice(`「${name}」をお気に入りに保存しました。${slotsText(slots)}の料理をえらぶとき、いちばん上に出ます`)
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
        recipe={base?.recipe}
        foods={catalog.foods}
        saveLabel="上書き保存"
        initialSlots={prioritySlots(my)}
        onSave={(name, ingredients, portion, slots) => {
          onUpdate(my.id, { name, ingredients, portion, slots })
          setNotice(`「${name}」を保存しました`)
          close()
        }}
        onClose={close}
      />
    )
  }

  return (
    <section aria-labelledby="customize-title" className="space-y-6">
      <div>
        <h2 id="customize-title" className="text-xl font-bold">
          料理をアレンジ
        </h2>
        <p className="mt-1 text-sm text-ink-soft">料理をえらんで、食べる量や材料を変えられます。保存すると「お気に入り」に入り、1日の食事で料理をえらぶとき上に出ます。</p>
      </div>
      {notice && (
        <p role="status" className="rounded-2xl bg-ok/15 px-4 py-2 text-sm">
          {notice}
        </p>
      )}

      {/* できることの例。押すと、その料理の編集の窓がひらく */}
      {examples.length > 0 && (
        <section aria-labelledby="customize-examples-title">
          <h3 id="customize-examples-title" className="mb-2 text-base font-bold">
            たとえば、こんなことができます
          </h3>
          <ul className="grid gap-2 md:grid-cols-3 md:gap-3">
            {examples.map((e) => (
              <li key={e.dishId}>
                <button
                  type="button"
                  onClick={() => setEditing({ kind: 'dish', dish: e.dish })}
                  aria-haspopup="dialog"
                  className="group flex h-full min-h-14 w-full items-center gap-3 rounded-2xl border-2 border-coral/50 bg-white px-3 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-coral hover:shadow-md"
                >
                  <img src={dishImage(e.dish)} alt="" className="h-11 w-11 shrink-0 object-contain" loading="lazy" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug font-bold">{e.title}</span>
                    <span className="block text-xs leading-snug text-pretty text-ink-soft">{e.desc}</span>
                  </span>
                  <span aria-hidden className="shrink-0 font-bold text-coral-ink transition group-hover:translate-x-0.5">
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {mine.length > 0 && (
        <section aria-labelledby="my-dishes-title">
          <h3 id="my-dishes-title" className="mb-2 text-base font-bold">
            お気に入り
            <span className="ml-2 text-xs font-normal text-ink-soft">アレンジして保存した料理</span>
          </h3>
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
                    <span className="mt-0.5 text-2xs text-coral-ink">{slotsText(prioritySlots(my))}で上に</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!(await confirmDialog(`「${my.name}」を削除しますか？1日の食事からも外れます。`, { okLabel: '削除する', danger: true }))) return
                      onDelete(my.id)
                      setNotice(null)
                    }}
                    className="absolute top-0 right-0 grid h-11 w-11 place-items-center rounded-full text-ink-soft hover:bg-cream"
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
        <h3 id="dish-list-title" className="mb-2 text-base font-bold">
          料理をえらぶ
        </h3>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="料理をさがす（例：肉じゃが、カレー）"
          aria-label="料理の名前でさがす"
          className="mb-2 min-h-11 w-full rounded-full border-2 border-white bg-white px-4 text-base outline-none focus:border-coral md:max-w-md"
        />
        {/* 料理の種類でしぼる。スマホは横に流す */}
        <div role="group" aria-label="料理の種類でしぼる" className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          {[null, ...categories].map((c) => (
            <button
              key={c ?? 'all'}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={`min-h-11 shrink-0 rounded-full px-4 text-sm whitespace-nowrap transition md:min-h-9 ${category === c ? 'bg-coral font-bold text-ink-strong' : 'bg-white shadow-sm'}`}
            >
              {c ? DISH_CATEGORY_LABEL[c] : 'すべて'}
            </button>
          ))}
        </div>
        {found.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-soft">見つかりませんでした{category && '。種類を「すべて」にすると見つかるかもしれません'}</p>
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
    </section>
  )
}
