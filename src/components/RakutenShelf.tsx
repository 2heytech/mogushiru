import { ITEM_IMAGE_SIZE, RAKUTEN_CREDIT, RAKUTEN_PICKS_DATE, SHOP_ROWS, type RakutenApi, type ShopPick, type ShopSection } from '../pages/rakuten'

// 「楽天市場でさがす」の欄（広告。楽天アフィリエイト）。出すところは2つ：
// - 成分ごとの読みもののページ（/nutrients/<成分>/。pages/nutrientPages.tsx）
// - アプリの「成分ランキング」の画面（/ranking/。RankingView.tsx）。選んでいる成分の欄を、一覧の下に出す
// 何を出すか（成分ごとの商品の種類・前もって選んだ商品）は pages/rakuten.ts。ここは見た目だけ（状態を持たないので、読みもののページの HTML にも、アプリにも使える）

// 欄の枠と、文の中のリンクの見た目（読みもののページの CARD・LINK と同じ。pages/StaticLayout.tsx）
const CARD = 'rounded-[var(--radius-card)] bg-white p-4 shadow-sm sm:p-5'
const LINK = 'font-bold text-coral-ink underline decoration-coral/60 underline-offset-2 hover:decoration-coral-ink'

// 欄の見出しの id（目次や、ページのはじめの知らせから、ここへとぶ）
export const SHELF_ID = 'shop'

// 「広告」の印。広告のリンクがある欄の見出しに付ける
export function AdMark() {
  return <span className="rounded-full border border-ink-soft/60 px-2 py-0.5 text-2xs leading-none font-normal text-ink-soft">広告</span>
}

// ページのはじめに出す、広告があることの知らせ（広告のリンクがあるページだけ）
export const AD_NOTICE = 'このページには広告のリンクを含みます。'

// 商品を並べる種類の枠。広い画面では2列に並ぶので、見出し・説明・商品の3段を、となりの種類とそろえる（subgrid。使えない古いブラウザでは、そろわないだけで、くずれない）
const KIND_ROWS = 'min-w-0 sm:row-span-3 sm:grid sm:grid-rows-subgrid sm:gap-y-0'

// 「楽天市場でさがす」の欄の、商品の種類1つ分（プロテイン・カルシウムのサプリなど）。api：楽天市場商品検索 API で商品を出すか（出すときは、前もって選んだ商品を使わない）。
// pictures：前もって選んだ商品の画像を出すか（出さないときは、文字のリンクだけ）。
// クラスを `…${…}` でつなぐときは、「${」の前に空白を入れる（つめて書くと、Tailwind が前のクラスを見つけられず、CSS に入らない）
function ShopKind({ pick: s, api, pictures }: { pick: ShopPick; api: boolean; pictures: boolean }) {
  // 前もって選んだ商品。あれば、文字のリンクが見出しになる
  const items = api || !pictures ? [] : s.items
  const head = items.length > 0
  return (
    <li className={api ? 'group/food min-w-0 data-[shop-row]:col-span-full' : head ? KIND_ROWS : 'min-w-0'} {...(api && { 'data-shop-food': '', 'data-word': s.word, 'data-genre': s.genreId })}>
      <a
        href={s.href}
        target="_blank"
        rel="sponsored nofollow noopener"
        aria-label={`${s.label}を楽天市場でさがす（広告・新しいタブでひらく）`}
        className="flex min-h-12 items-center gap-2 rounded-2xl bg-cream px-3 py-2 text-sm leading-snug font-bold hover:bg-coral/20"
      >
        <span className="min-w-0 flex-1 text-balance">{s.label}</span>
        {/* 商品の例が下に並ぶときだけ出す。スマホは、種類の名前が折り返さないように短くする */}
        {(api || head) && (
          <span className={`shrink-0 text-xs font-normal text-coral-ink ${head ? '' : 'hidden group-data-[shop-row]/food:inline'}`}>
            <span className="hidden sm:inline">楽天市場で</span>もっと見る
          </span>
        )}
        <span aria-hidden className="shrink-0 text-coral-ink">
          ↗
        </span>
      </a>
      {/* その種類が何かの、短い説明（体へのはたらきは書かない）。説明のない種類も、商品を並べるときは場所だけ置く（となりの種類と、段をそろえるため） */}
      {s.note ? <p className="mt-1.5 px-1 text-xs leading-relaxed text-ink-soft">{s.note}</p> : head && <span aria-hidden className="hidden sm:block" />}
      {/* 前もって選んだ商品（画像だけ）。画像は、楽天のサーバーから読みこむ（画面に近づいたときに読む：loading="lazy"） */}
      {head && (
        <ul aria-label={`${s.label}の商品の例（楽天市場）`} className="mt-2 grid grid-cols-3 gap-2">
          {items.map((it, i) => (
            <li key={it.href} className="min-w-0">
              <a
                href={it.href}
                target="_blank"
                rel="sponsored nofollow noopener"
                aria-label={`${s.label}の商品の例${i + 1}（楽天市場・広告・新しいタブでひらく）`}
                className="block rounded-2xl border border-ink/10 bg-white p-1.5 hover:border-coral"
              >
                <img src={it.src} alt="" width={ITEM_IMAGE_SIZE} height={ITEM_IMAGE_SIZE} loading="lazy" className="aspect-square w-full rounded-xl object-contain" />
              </a>
            </li>
          ))}
        </ul>
      )}
      {/* API で取った商品の例を入れる場所。スマホは横に送る1列（欄が縦に長くなりすぎないように）、広い画面は横に6つ。
          読みこみ中は、商品が入ったときと同じぐらいの高さをあけて（下がずれないように）、うすく光らせる */}
      {api && (
        <ul
          data-shop-items=""
          hidden
          aria-label={`${s.label}の商品の例（楽天市場）`}
          className="mt-2 flex min-h-60 snap-x gap-2 overflow-x-auto pb-1 group-data-[shop-row=wait]/food:animate-pulse group-data-[shop-row=wait]/food:rounded-2xl group-data-[shop-row=wait]/food:bg-cream md:grid md:min-h-52 md:grid-cols-6 md:overflow-visible md:pb-0"
        />
      )}
    </li>
  )
}

// サプリメントなどを使うときの注意。サプリメントを出す欄に、いつも添える
const SUPPLEMENT_CAUTION =
  'サプリメントなどは、食事でとりきれない分をおぎなうためのものです。まずは、ふだんの食事からとることを考えましょう。使うときは、商品に書いてある1日の目安の量を守ってください。いくつかを合わせて使うと、同じ成分をとりすぎることがあります。薬を飲んでいる人、通院している人、妊娠中・授乳中の人、子どもに使うときは、医師や薬剤師に相談してください。'

// その成分をおぎなうのに使われる商品（プロテイン・サプリメントなど）を、楽天市場でさがす欄（楽天アフィリエイト。rakuten.ts）。
// - 商品の種類ごとに、文字のリンク（種類の名前 → 楽天市場の検索結果）。新しいタブでひらき、検索エンジンには広告のリンクだと伝える（rel="sponsored nofollow"）
// - api があるときは、public/rakuten-shop.js が、欄が画面に近づいたときに種類ごとの商品の例（画像・名前・値段）を足す。
//   プログラムが読むのは data-shop で始まる印と data-word・data-genre、商品のひな形（template）。data-mid は、商品のリンクに入れる計測 ID の文字（あるときだけ）。見た目は、ここのクラスで決める：
//   種類（li）に data-shop-row が付くと、文字のリンクが行の見出しになって横いっぱいに広がり（wait は読みこみ中、on は商品あり）、その下に商品が並ぶ
// - api がないあいだは、前もって選んだ商品（ShopPick の items。data/rakuten-picks.json）を、種類ごとに画像で3つ並べる（プログラムは使わない）。
//   商品の名前・値段は出さない（選んだあとで変わるので）
// - アプリの「成分ランキング」の画面では、api を渡さない（public/rakuten-shop.js は、読みもののページのためのもの）。
//   API で出す設定のあいだは、pictures を false にして、文字のリンクだけにする（読みもののページと、商品の出し方の説明をそろえるため）
// - name：成分の呼び名（はじめの文の「食事でとりきれない○○を…」に使う）
// - 体へのはたらき（「〜に効く」など）は書かない。使うときの注意（目安の量を守る・医師や薬剤師に相談）を、欄の中に書く
// - 楽天のプログラム（ウィジェット）は読みこまない
export function RakutenShelf({ shop, name, api = null, pictures = true }: { shop: ShopSection; name: string; api?: RakutenApi | null; pictures?: boolean }) {
  const rows = Math.min(SHOP_ROWS, shop.picks.length)
  // 前もって選んだ商品を出す種類の数（API で出すとき・画像を出さないときは 0）
  const picked = api || !pictures ? 0 : shop.picks.filter((s) => s.items.length > 0).length
  return (
    <section
      aria-labelledby={SHELF_ID}
      className={`${CARD} scroll-mt-4`}
      {...(api && { 'data-shop': '', 'data-app': api.appId, 'data-key': api.accessKey, 'data-aff': api.affiliateId, 'data-rows': rows })}
      {...(api?.measure && { 'data-mid': api.measure })}
    >
      <h2 id={SHELF_ID} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-lg font-bold">
        {/* スマホで言葉の途中で折り返さないよう、「〜のサプリメントなどを」「楽天市場でさがす」のまとまりで折り返す */}
        <span>
          <span className="inline-block">{shop.title}を</span>
          <span className="inline-block">楽天市場でさがす</span>
        </span>
        <AdMark />
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">
        {shop.lead ?? `食事でとりきれない${name}をおぎなうのに使われる商品`}を、種類ごとに楽天市場でさがせます。
        {/* data-shop-off は商品を出す前だけ、data-shop-on は商品を出したあとだけ見せる（プログラムが切りかえる） */}
        {picked > 0 ? (
          <span>種類ごとに、楽天市場の商品の例を出しています。商品の画像や種類の名前を押すと、楽天市場のページを新しいタブでひらきます。</span>
        ) : (
          <span {...(api && { 'data-shop-off': '' })}>種類の名前を押すと、楽天市場の検索結果を新しいタブでひらきます。</span>
        )}
        {api && (
          <span hidden data-shop-on="">
            種類ごとに、楽天市場の商品の例を出しています。商品や種類の名前を押すと、楽天市場のページを新しいタブでひらきます。
          </span>
        )}
      </p>
      <ul className="mt-3 grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2">
        {shop.picks.map((s) => (
          <ShopKind key={s.key} pick={s} api={api !== null} pictures={pictures} />
        ))}
      </ul>
      {api && (
        <>
          {/* のこりの種類の商品を出すボタン。プログラムが、はじめの種類の商品を出せたときだけ見せる */}
          <button type="button" hidden data-shop-more="" className="mt-3 inline-flex min-h-11 items-center rounded-full border border-coral px-4 text-sm font-bold text-coral-ink hover:bg-coral/10">
            ほかの種類の商品も見る
          </button>
          {/* 商品1つ分のひな形。プログラムが写して、リンク・画像・名前・値段を入れる。
              relative は、読み上げ用の字（sr-only）を横に送る枠の中にとどめるため（ないと、ページが横にはみ出す） */}
          <template data-shop-card="">
            <li className="w-32 shrink-0 snap-start md:w-auto">
              <a target="_blank" rel="sponsored nofollow noopener" className="relative flex h-full flex-col gap-1 rounded-2xl border border-ink/10 bg-white p-2 hover:border-coral">
                <img alt="" width={240} height={240} loading="lazy" className="aspect-square w-full rounded-xl object-contain" />
                {/* 名前は2行まで。1行の名前でも2行分の高さをとって、となりの商品と値段の位置をそろえる */}
                <span data-shop-name="" className="line-clamp-2 min-h-[2lh] text-xs leading-snug break-all" />
                <span className="flex flex-wrap items-baseline gap-x-1.5 text-sm font-bold">
                  <span>
                    <span data-shop-price="" />円
                  </span>
                  <span data-shop-free="" hidden className="text-2xs font-normal text-ink-soft">
                    送料無料
                  </span>
                </span>
                {/* レビューの平均と件数（レビューのある商品だけ） */}
                <span data-shop-review="" hidden className="text-2xs leading-tight text-ink-soft">
                  <span aria-hidden>★</span>
                  <span className="sr-only">レビュー</span>
                  <span data-shop-stars="" />（<span data-shop-reviews="" />
                  件）
                </span>
                <span className="sr-only">（広告・新しいタブでひらく）</span>
              </a>
            </li>
          </template>
        </>
      )}
      {/* 使うときの注意。広告の小さい字より、読みやすい大きさ・色で出す */}
      <div className="mt-4 rounded-2xl bg-cream px-3 py-2.5 text-xs leading-relaxed">
        <p className="font-bold">使う前に</p>
        {!shop.food && <p className="mt-1">{SUPPLEMENT_CAUTION}</p>}
        {shop.caution && <p className="mt-1">{shop.caution}</p>}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-soft">
        楽天アフィリエイトのリンクです。リンクから楽天市場で買い物をすると、モグシルの運営者に紹介料が入ります。ランキングの順位と数値は、広告とは関係なく、食品成分表の値で決めています。
        {api && (
          <span hidden data-shop-on="">
            商品と値段は、ページを開いたときの楽天市場の検索結果で、このサイトが選んだものではありません。
          </span>
        )}
        {picked > 0 && (
          <span>
            商品の例は、{RAKUTEN_PICKS_DATE}
            に楽天市場でさがして、このサイトが選んだものです（おすすめの順ではありません。医薬品は選んでいません）。売り切れたり、内容が変わったりしていることがあります。
          </span>
        )}
        値段・在庫・成分の量・使い方は、楽天市場の商品のページで確かめてください。
        <a href="/about/#about-ads" className={LINK}>
          広告について
        </a>
      </p>
      {/* 楽天ウェブサービスのクレジット（楽天の指定の文字のリンク）。API で取った商品を出したときだけ見せる */}
      {api && (
        <p hidden data-shop-on="" className="mt-1 text-2xs text-ink-soft">
          <a href={RAKUTEN_CREDIT.href} target="_blank" rel="noopener" className="underline underline-offset-2">
            {RAKUTEN_CREDIT.text}
          </a>
        </p>
      )}
    </section>
  )
}
