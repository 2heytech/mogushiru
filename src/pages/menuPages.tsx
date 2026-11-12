import { menuItemImage } from '../components/illustration'
import { itemName, portionLabel } from '../components/itemName'
import { SLOT_LABEL } from '../components/labels'
import { SlotIcon } from '../components/Mascot'
import { idealMealLeads, mealFaceItem } from '../domain/idealMenuFacets'
import { adjustIdealMenu, IDEAL_MENUS, idealMenuAvailable, idealMenuHasProducts, summarizeIdealMenu, type IdealMenu, type IdealMenuSummary } from '../domain/idealMenus'
import { itemTotals, type Catalog } from '../domain/nutrition'
import { computeTargets, DEFAULT_PROFILE } from '../domain/targets'
import { SLOTS, type DayMenu } from '../domain/types'
import { idealMenuAppPath, MENU_PAGES, MENUS_INDEX_PATH, menuPagePath, type MenuPage } from '../routes'
import type { OgCard } from './ogCard'
import { BUTTON, BUTTON_SUB, CARD, LINK, StaticLayout } from './StaticLayout'

// 献立の例のページ（/menus/ と /menus/<slug>/）。アプリの「理想の献立」を、30〜49歳女性・身体活動ふつうの量で並べる。
// 「この献立をモグシルで開く」で、アプリがその人のプロフィールに合わせて量を変えて呼び出す

const TARGETS = computeTargets(DEFAULT_PROFILE)

export type PlannedMenu = { ideal: IdealMenu; menu: DayMenu; summary: IdealMenuSummary }

export const menusFor = (page: MenuPage, all: IdealMenu[] = IDEAL_MENUS): IdealMenu[] =>
  // 1食ずつバランスの献立はそのページだけに出す（ジャンルのページと同じ献立が並ばないように）
  all.filter((m) => ('balance' in page ? m.balance === page.balance : m.balance === 'day' && page.genres.includes(m.genre)))

// 献立をプロフィールの初期値の量にする。市販品がなくなった献立は出さない（アプリと同じ）
export function planMenus(menus: IdealMenu[], catalog: Catalog): PlannedMenu[] {
  return menus
    .filter((ideal) => idealMenuAvailable(ideal, catalog))
    .map((ideal) => {
      const menu = adjustIdealMenu(ideal, catalog, TARGETS)
      return { ideal, menu, summary: summarizeIdealMenu(menu, catalog, TARGETS) }
    })
}

const kcalText = (v: number) => `${Math.round(v).toLocaleString()} kcal`

// ---- コンビニの昼ごはんの組み合わせ（市販品のページの上に出す） ----

const CONVENIENCE_STORES = ['セブン-イレブン', 'ファミリーマート', 'ローソン']

export type LunchCombo = {
  plan: PlannedMenu
  store: string
  // 「セブン-イレブンのおにぎりとサラダ」
  title: string
  rows: { key: string; name: string; count: string; url?: string; kcal: number; protein: number; salt: number }[]
  total: { kcal: number; protein: number; salt: number }
  // 商品の値を各社のサイトから取った日（いちばん古い日）
  fetchedAt?: string
}

// 昼にコンビニの商品が入っている献立から、昼の組み合わせを取り出す（量は献立の例と同じ 30〜49歳女性・ふつう）
export function lunchCombos(plans: PlannedMenu[], catalog: Catalog): LunchCombo[] {
  return plans.flatMap((plan) => {
    const products = plan.menu.lunch.flatMap((item) => (item.kind === 'product' ? (catalog.products.get(item.refId) ?? []) : []))
    const store = CONVENIENCE_STORES.find((s) => products.some((p) => p.brand === s))
    if (!store) return []
    const rows = plan.menu.lunch.map((item) => {
      const v = itemTotals(item, catalog).values
      const product = item.kind === 'product' ? catalog.products.get(item.refId) : undefined
      return {
        key: item.uid,
        name: itemName(item, catalog).replace(/　/g, ' '),
        count: portionLabel(item, catalog),
        url: product?.source.url,
        kcal: v.energyKcal,
        protein: v.protein,
        salt: v.salt,
      }
    })
    const sum = (k: 'kcal' | 'protein' | 'salt') => rows.reduce((a, r) => a + r[k], 0)
    const dates = products.map((p) => p.source.fetchedAt).sort()
    return [
      {
        plan,
        store,
        title: idealMealLeads(plan.ideal)?.lunch ?? `${store}でお昼`,
        rows,
        total: { kcal: sum('kcal'), protein: sum('protein'), salt: sum('salt') },
        fetchedAt: dates[0],
      },
    ]
  })
}

const g1 = (v: number) => v.toFixed(1)

function LunchComboCard({ combo }: { combo: LunchCombo }) {
  const { plan, rows, total } = combo
  const day = plan.summary.totals.day.values
  return (
    <li className={`${CARD} space-y-3`}>
      <h3 className="text-base leading-snug font-bold">{combo.title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[20rem] text-sm tabular-nums">
          <thead>
            <tr className="border-b border-ink/10 text-xs text-ink-soft">
              <th scope="col" className="py-1.5 pr-2 text-left font-normal">
                品目
              </th>
              <th scope="col" className="py-1.5 pl-2 text-right font-normal whitespace-nowrap">
                カロリー
              </th>
              <th scope="col" className="py-1.5 pl-2 text-right font-normal whitespace-nowrap">
                たんぱく質
              </th>
              <th scope="col" className="py-1.5 pl-2 text-right font-normal whitespace-nowrap">
                食塩
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-ink/5">
                <th scope="row" className="py-1.5 pr-2 text-left leading-snug font-normal">
                  {r.url ? (
                    <a href={r.url} rel="noopener" className="underline decoration-ink-soft/40 underline-offset-2">
                      {r.name}
                    </a>
                  ) : (
                    r.name
                  )}
                  {r.count && <span className="text-ink-soft">{r.count}</span>}
                </th>
                <td className="py-1.5 pl-2 text-right whitespace-nowrap">{Math.round(r.kcal)} kcal</td>
                <td className="py-1.5 pl-2 text-right whitespace-nowrap">{g1(r.protein)} g</td>
                <td className="py-1.5 pl-2 text-right whitespace-nowrap">{g1(r.salt)} g</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <th scope="row" className="py-1.5 pr-2 text-left">
                昼ごはんの合計
              </th>
              <td className="py-1.5 pl-2 text-right whitespace-nowrap">{Math.round(total.kcal)} kcal</td>
              <td className="py-1.5 pl-2 text-right whitespace-nowrap">{g1(total.protein)} g</td>
              <td className="py-1.5 pl-2 text-right whitespace-nowrap">{g1(total.salt)} g</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-sm leading-relaxed">
        {idealMealLeads(plan.ideal) && (
          <>
            {idealMealLeads(plan.ideal)!.breakfast}の朝、{idealMealLeads(plan.ideal)!.dinner}の晩と合わせると、
          </>
        )}
        1日で <strong className="tabular-nums">{kcalText(plan.summary.kcal)}</strong>・たんぱく質 <span className="tabular-nums">{Math.round(day.protein)} g</span>・食塩{' '}
        <span className="tabular-nums">{g1(day.salt)} g</span> です。
      </p>
      <div className="flex flex-wrap gap-2">
        <a href={idealMenuAppPath(plan.ideal.id)} className={BUTTON}>
          この組み合わせをモグシルで開く
        </a>
        <a href={`#${plan.ideal.id}`} className={BUTTON_SUB}>
          朝・晩を含む1日の献立を見る
        </a>
      </div>
    </li>
  )
}

function LunchCombos({ combos }: { combos: LunchCombo[] }) {
  const fetchedAt = combos.map((c) => c.fetchedAt ?? '').sort()[0]
  return (
    <section aria-labelledby="konbini-lunch" className="scroll-mt-4 space-y-3">
      <h2 id="konbini-lunch" className="text-xl leading-snug font-bold">
        コンビニの昼ごはんの組み合わせ例
      </h2>
      <p className="text-sm leading-relaxed">
        {combos.map((c) => c.store).join('・')}
        の商品で組んだ昼ごはんの例です。どれも、おにぎりやサンドイッチに、サラダと果物・ヨーグルトなどを足した組み合わせで、朝・晩と合わせた1日の合計が、カロリー・PFCバランス・食塩の目安に合うようにしています。
      </p>
      <ul className="space-y-4">
        {combos.map((c) => (
          <LunchComboCard key={c.plan.ideal.id} combo={c} />
        ))}
      </ul>
      <p className="text-xs leading-relaxed text-ink-soft">
        モグシルで開くと、昼の商品をほかの商品に入れかえて、朝・晩を含めた1日の合計をその場でたしかめられます。商品の値は各社の公式サイトの栄養成分表示
        {fetchedAt && `（${fetchedAt} 時点）`}
        です。商品名から各社の商品ページを開けます。販売が終わったり、地域によって扱いがなかったりすることがあります。果物やヨーグルトなど商品名のない品目は、日本食品標準成分表の値で計算しています。
      </p>
    </section>
  )
}

// nested：上に「1日の献立の例」の見出し（h2）があるページでは、献立の名前を h3 にする
function MenuCard({ plan, catalog, nested }: { plan: PlannedMenu; catalog: Catalog; nested: boolean }) {
  const { ideal, menu, summary } = plan
  const salt = summary.totals.day.values.salt
  const Heading = nested ? 'h3' : 'h2'
  return (
    <li id={ideal.id} className={`${CARD} scroll-mt-4 space-y-3`}>
      <div>
        <Heading className="text-lg leading-snug font-bold">{ideal.name}</Heading>
        <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{ideal.lead}</p>
      </div>
      <p className="rounded-xl bg-cream px-3 py-2 text-sm tabular-nums">
        1日 <strong>{kcalText(summary.kcal)}</strong>
        {summary.ratio && (
          <>
            ・たんぱく質 {Math.round(summary.ratio.p)}%・脂質 {Math.round(summary.ratio.f)}%・炭水化物 {Math.round(summary.ratio.c)}%
          </>
        )}
        ・食塩 {salt.toFixed(1)} g
      </p>
      <dl className="space-y-2">
        {SLOTS.map((slot) => {
          const items = menu[slot]
          if (items.length === 0) return null
          const face = mealFaceItem(items, catalog)
          const src = face && menuItemImage(face, catalog)
          return (
            <div key={slot} className="flex items-start gap-2">
              <dt className="flex w-16 shrink-0 items-center gap-1 pt-0.5 text-sm font-bold">
                <SlotIcon slot={slot} className="h-5 w-5" />
                {SLOT_LABEL[slot]}
              </dt>
              <dd className="flex min-w-0 flex-1 items-start gap-2 text-sm leading-relaxed">
                {src && <img src={src} alt="" width={40} height={40} loading="lazy" className="h-10 w-10 shrink-0" />}
                <span className="min-w-0">
                  {items.map((item, i) => {
                    const portion = portionLabel(item, catalog)
                    const brand = item.kind === 'product' ? catalog.products.get(item.refId)?.brand : undefined
                    return (
                      <span key={item.uid}>
                        {i > 0 && '・'}
                        {brand && <span className="text-ink-soft">{brand}の</span>}
                        {itemName(item, catalog)}
                        {portion && <span className="text-ink-soft tabular-nums">{portion}</span>}
                      </span>
                    )
                  })}
                  <span className="ml-1 text-xs whitespace-nowrap text-ink-soft tabular-nums">（{kcalText(summary.totals.bySlot[slot].values.energyKcal)}）</span>
                </span>
              </dd>
            </div>
          )
        })}
      </dl>
      <p className="text-sm leading-relaxed">
        <span className="font-bold">栄養のポイント：</span>
        {ideal.point}
      </p>
      {idealMenuHasProducts(ideal) && (
        <p className="text-xs leading-relaxed text-ink-soft">※ 市販品はパッケージの栄養成分表示にある成分だけで計算しています（ビタミン・ミネラルは実際より少なく出ます）。</p>
      )}
      <a href={idealMenuAppPath(ideal.id)} className={BUTTON}>
        この献立をモグシルで開く
      </a>
    </li>
  )
}

const sizeNote = `量は30〜49歳女性・身体活動ふつう（1日 約${Math.round(TARGETS.energyKcal).toLocaleString()} kcal）に合わせています。モグシルで開くと、年齢・性別・活動量に合わせて量が変わり、料理を入れかえることもできます。`

function PageLinks({ current }: { current?: string }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {MENU_PAGES.map((p) => (
        <li key={p.slug}>
          {p.slug === current ? (
            <span aria-current="page" className="inline-flex min-h-9 items-center rounded-full bg-coral px-3 text-sm font-bold text-ink-strong">
              {p.title}
            </span>
          ) : (
            <a href={menuPagePath(p)} className="inline-flex min-h-9 items-center rounded-full bg-white px-3 text-sm shadow-sm hover:bg-cream">
              {p.title}
            </a>
          )}
        </li>
      ))}
    </ul>
  )
}

export function MenuGenrePage({ page, plans, catalog }: { page: MenuPage; plans: PlannedMenu[]; catalog: Catalog }) {
  const combos = lunchCombos(plans, catalog)
  return (
    <StaticLayout crumbs={[{ name: 'モグシル', path: '/' }, { name: '献立の例', path: MENUS_INDEX_PATH }, { name: page.title }]}>
      <article className="space-y-5">
        <header className="space-y-2">
          <h1 className="text-2xl leading-snug font-bold sm:text-3xl">{page.heading}</h1>
          <p className="text-sm leading-relaxed">
            {page.lead}
            どれも1日のカロリー・PFCバランス・食塩が目安に合い
            {plans.some((p) => idealMenuHasProducts(p.ideal)) ? '' : '、ビタミンやミネラルもほぼ目安に届く'}
            ように量を決めています（{plans.length}種）。
          </p>
          <p className="text-xs leading-relaxed text-ink-soft">{sizeNote}</p>
        </header>
        <PageLinks current={page.slug} />
        {combos.length > 0 && <LunchCombos combos={combos} />}
        {combos.length > 0 && <h2 className="text-xl leading-snug font-bold">1日の献立の例（{plans.length}種）</h2>}
        <ol className="space-y-4">
          {plans.map((plan) => (
            <MenuCard key={plan.ideal.id} plan={plan} catalog={catalog} nested={combos.length > 0} />
          ))}
        </ol>
        <SourceNote />
      </article>
    </StaticLayout>
  )
}

export function MenusIndexPage({ groups }: { groups: { page: MenuPage; plans: PlannedMenu[] }[] }) {
  const total = groups.reduce((n, g) => n + g.plans.length, 0)
  return (
    <StaticLayout crumbs={[{ name: 'モグシル', path: '/' }, { name: '献立の例' }]}>
      <article className="space-y-5">
        <header className="space-y-2">
          <h1 className="text-2xl leading-snug font-bold sm:text-3xl">栄養バランスの整う1日の献立の例</h1>
          <p className="text-sm leading-relaxed">
            モグシルの「理想の献立」{total}種を、ジャンルごとにまとめました。どれも1日のカロリー・PFCバランス（たんぱく質・脂質・炭水化物）・食塩が目安に合うように、料理の組み合わせと量を決めています。市販品を使わない献立は、ビタミンやミネラルもほぼ目安に届きます。
          </p>
          <p className="text-xs leading-relaxed text-ink-soft">{sizeNote}</p>
        </header>
        <ul className="grid gap-3 sm:grid-cols-2">
          {groups.map(({ page, plans }) => (
            <li key={page.slug}>
              <a href={menuPagePath(page)} className={`${CARD} block h-full hover:bg-white/70`}>
                <span className="text-lg font-bold text-coral-ink">{page.heading}</span>
                <span className="ml-1 text-sm text-ink-soft">（{plans.length}種）</span>
                <span className="mt-1 block text-sm leading-relaxed">{page.lead}</span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
                  {plans
                    .slice(0, 4)
                    .map((p) => p.ideal.name)
                    .join('・')}
                  {plans.length > 4 && 'など'}
                </span>
              </a>
            </li>
          ))}
        </ul>
        <SourceNote />
      </article>
    </StaticLayout>
  )
}

function SourceNote() {
  return (
    <p className="text-xs leading-relaxed text-ink-soft">
      栄養の値は文部科学省「日本食品標準成分表（八訂）増補2023年」、市販品は各社の栄養成分表示、郷土料理の材料は農林水産省「うちの郷土料理」をもとに計算し、1日の目安は厚生労働省「日本人の食事摂取基準（2025年版）」をもとにしています。くわしくは
      <a href="/about/" className={LINK}>
        このサイトについて
      </a>
      をごらんください。
    </p>
  )
}

// ---- SNS などに貼ったときの画像 ----

// 献立の顔になる料理の絵（晩ごはんの主菜など）を、献立ごとに1つずつ。同じ絵は1回だけ
function faceImages(plans: PlannedMenu[], catalog: Catalog, limit = 6): string[] {
  const out: string[] = []
  for (const plan of plans) {
    for (const slot of ['dinner', 'lunch', 'breakfast'] as const) {
      const face = mealFaceItem(plan.menu[slot], catalog)
      const src = face && menuItemImage(face, catalog)
      if (src && !out.includes(src)) {
        out.push(src)
        break
      }
    }
    if (out.length >= limit) break
  }
  return out
}

// 1行に入るだけ名前を並べる（字の数でおおよその幅を見る）
function fitChips(names: string[], maxChars = 26): string[] {
  const out: string[] = []
  let used = 0
  for (const n of names) {
    if (used + n.length + 2 > maxChars) break
    out.push(n)
    used += n.length + 2
  }
  return out
}

export function menuGenreOgCard(page: MenuPage, plans: PlannedMenu[], catalog: Catalog): { card: OgCard; alt: string } {
  const combos = lunchCombos(plans, catalog)
  const title = combos.length > 0 ? 'コンビニの昼ごはんの組み合わせ例' : page.heading
  const sub = combos.length > 0 ? `商品名・カロリー・たんぱく質・食塩つき。1日の献立 ${plans.length}種も` : `カロリー・PFCバランス・食塩が目安に合う献立 ${plans.length}種`
  const chips = fitChips(combos.length > 0 ? combos.map((c) => c.store) : plans.map((p) => p.ideal.name))
  return {
    card: { title, sub, chips, icons: faceImages(plans, catalog) },
    alt: `${title}。${sub}（${plans
      .slice(0, 3)
      .map((p) => p.ideal.name)
      .join('・')}など）`,
  }
}

export function menusIndexOgCard(groups: { page: MenuPage; plans: PlannedMenu[] }[], catalog: Catalog): { card: OgCard; alt: string } {
  const total = groups.reduce((n, g) => n + g.plans.length, 0)
  const title = '栄養バランスの整う1日の献立の例'
  const sub = `カロリー・PFCバランス・食塩が目安に合う献立 ${total}種`
  return {
    card: {
      title,
      sub,
      chips: fitChips(groups.map((g) => g.page.title)),
      icons: faceImages(
        groups.flatMap((g) => g.plans.slice(0, 1)),
        catalog,
      ),
    },
    alt: `${title}。${sub}（${groups.map((g) => g.page.title).join('・')}）`,
  }
}
