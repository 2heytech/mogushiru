import { menuItemImage } from '../components/illustration'
import { itemName, portionLabel } from '../components/itemName'
import { SLOT_LABEL } from '../components/labels'
import { SlotIcon } from '../components/Mascot'
import { mealFaceItem } from '../domain/idealMenuFacets'
import { adjustIdealMenu, IDEAL_MENUS, idealMenuAvailable, idealMenuHasProducts, summarizeIdealMenu, type IdealMenu, type IdealMenuSummary } from '../domain/idealMenus'
import type { Catalog } from '../domain/nutrition'
import { computeTargets, DEFAULT_PROFILE } from '../domain/targets'
import { SLOTS, type DayMenu } from '../domain/types'
import { idealMenuAppPath, MENU_PAGES, MENUS_INDEX_PATH, menuPagePath, type MenuPage } from '../routes'
import { BUTTON, CARD, LINK, StaticLayout } from './StaticLayout'

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

function MenuCard({ plan, catalog }: { plan: PlannedMenu; catalog: Catalog }) {
  const { ideal, menu, summary } = plan
  const salt = summary.totals.day.values.salt
  return (
    <li id={ideal.id} className={`${CARD} scroll-mt-4 space-y-3`}>
      <div>
        <h2 className="text-lg leading-snug font-bold">{ideal.name}</h2>
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
        <ol className="space-y-4">
          {plans.map((plan) => (
            <MenuCard key={plan.ideal.id} plan={plan} catalog={catalog} />
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
