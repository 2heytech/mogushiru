import type { ReactNode } from 'react'
import { gaEnabled } from '../analytics'
import { OperatorLink } from '../components/OperatorLink'
import { AD_NOTICE } from '../components/RakutenShelf'
import { DISHES_INDEX_PATH, NUTRIENTS_INDEX_PATH, SITE_NAME, SITE_NAME_KANA, VIEW_PATH } from '../routes'
import { CONTACT_FORM_URL, OPERATOR_NAME, REPOSITORY_URL } from '../site'
import { NUTRIENTS_INDEX_HEADING } from './nutrientPages'
import type { OgCard } from './ogCard'
import { RAKUTEN_PICKS_DATE, rakutenEnabled, rakutenProducts, type RakutenProducts } from './rakuten'
import { LINK, StaticLayout } from './StaticLayout'

// 「このサイトについて」（/about/）。運営者・数値の確かめ方・使うときの注意・プライバシー・広告・出典とライセンス・問い合わせ先を1まいにまとめる。
// だれが作り、数値をどう確かめているかを、プログラムを動かさなくても読めるように、読みもののページにしてある（以前はアプリの画面）

export const ABOUT_HEADING = 'このサイトについて'
export const ABOUT_TITLE = `${ABOUT_HEADING}｜${SITE_NAME}`
// 広告（楽天アフィリエイト）を出しているか。出していないときは、「広告」の欄ごと出さない
const ADS = rakutenEnabled()
// 楽天市場の商品の例を、どう出しているか（rakuten.ts）。api：楽天市場商品検索 API で、画像・名前・値段。picks：前もって選んだ商品の画像。
// 出しているときは、楽天のサーバーとの通信のことを書く
const PRODUCTS = rakutenProducts()
// Google アナリティクスを使っているか（測定 ID があるとき。src/analytics.ts）。使っていないときは、プライバシーの Google アナリティクスの文を出さず、
// 「Cookie は使っていません」と書く
const ANALYTICS = gaEnabled()
export const ABOUT_DESCRIPTION = `${SITE_NAME}の運営者、数値の確かめ方、使うときの注意、プライバシー、${ADS ? '広告、' : ''}データの出典とライセンス、お問い合わせ先。`

export const ABOUT_OG: { card: OgCard; alt: string } = {
  card: {
    title: ABOUT_HEADING,
    sub: '料理を選ぶだけで、1日の栄養バランスが分かる無料のサイト',
    chips: ['運営者', '数値の確かめ方', '出典とライセンス', 'プライバシー', 'お問い合わせ'],
  },
  alt: `${SITE_NAME}について。運営者、数値の確かめ方、出典とライセンス、プライバシー、お問い合わせ`,
}

// 文部科学省の、成分表の値を食品ごとに引けるサイト
const FOOD_DB_URL = 'https://fooddb.mext.go.jp/'

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
      {children}
    </a>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-[var(--radius-card)] bg-white p-5 shadow-sm sm:p-6">
      <h2 id={id} className="scroll-mt-4 text-lg font-bold">
        {title}
      </h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed">{children}</div>
    </section>
  )
}

const BULLETS = 'list-disc space-y-1.5 pl-5 marker:text-coral'

// ページの中の見出し（上の目次と、本文の順）
const PARTS = [
  { id: 'about-what', title: 'モグシルとは' },
  { id: 'about-operator', title: '運営者' },
  { id: 'about-check', title: '数値の確かめ方' },
  { id: 'about-caution', title: '使うときの注意' },
  { id: 'about-privacy', title: 'プライバシー' },
  { id: 'about-ads', title: '広告' },
  { id: 'about-sources', title: '出典とライセンス' },
  { id: 'about-contact', title: 'お問い合わせ' },
] as const
type PartId = (typeof PARTS)[number]['id']
const titleOf = (id: PartId) => PARTS.find((p) => p.id === id)!.title
// 楽天グループの、個人情報の扱いの説明
const RAKUTEN_PRIVACY_URL = 'https://privacy.rakuten.co.jp/'
// Google アナリティクスの紹介・Google の個人情報の扱いの説明・Google アナリティクスへの送信を止めるブラウザの追加機能
const GA_ABOUT_URL = 'https://marketingplatform.google.com/intl/ja/about/analytics/'
const GOOGLE_PRIVACY_URL = 'https://policies.google.com/privacy?hl=ja'
const GOOGLE_PARTNER_SITES_URL = 'https://policies.google.com/technologies/partner-sites?hl=ja'
const GA_OPTOUT_URL = 'https://tools.google.com/dlpage/gaoptout?hl=ja'

// 出典。政府のデータは利用規約にそって「加工して作成」を出典とは別に書く
const SOURCES: { name: ReactNode; note: ReactNode }[] = [
  {
    name: <Ext href="https://www.mext.go.jp/a_menu/syokuhinseibun/index.htm">文部科学省「日本食品標準成分表（八訂）増補2023年」</Ext>,
    note: '食品と料理の栄養成分。日本食品標準成分表（八訂）増補2023年（2026年3月27日訂正反映）から引用し、料理の分量に合わせて加工して作成',
  },
  {
    name: <Ext href="https://www.maff.go.jp/j/keikaku/syokubunka/k_ryouri/">農林水産省「うちの郷土料理」</Ext>,
    note: '郷土料理の材料と分量。農林水産省ウェブサイト「うちの郷土料理」を加工して作成（写真は使っていません）',
  },
  {
    name: (
      <>
        <Ext href="https://www.mhlw.go.jp/stf/newpage_44138.html">厚生労働省「日本人の食事摂取基準（2025年版）」</Ext>
      </>
    ),
    note: '1日の目安量・上限量。報告書の値をもとに加工して作成',
  },
  {
    name: <Ext href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/kenkounippon21_00006.html">厚生労働省「健康日本21（第三次）」</Ext>,
    note: '主食・主菜・副菜をそろえた食事（1日2回以上）、野菜350g・果物200gの目標。加工して作成',
  },
  {
    name: <Ext href="https://www.maff.go.jp/j/syokuiku/zissen_navi/balance/division.html">農林水産省「食事バランスガイド」</Ext>,
    note: '主食・主菜・副菜の数え方（1つ（SV）の基準）。料理の材料から数えるように加工して作成',
  },
  {
    name: <Ext href="https://www.city.fukuoka.lg.jp/hofuku/shika-eiyo/documents/02283point10shokuhinngnncheck.pdf">福岡市「フレイル予防の食事３つのポイント（10食品群チェック表）」</Ext>,
    note: '10の食品群（さあにぎやかにいただく）と1日7つ以上の目安。東京都健康長寿医療センター研究所の食品摂取の多様性スコアにもとづくもの',
  },
  {
    name: <Ext href="https://jpnsh.jp/data/pressrelease_241008.pdf">日本高血圧学会「尿ナトカリ比の目標値に関するコンセンサスステートメント」（2024年）</Ext>,
    note: '食塩とカリウムのつり合い（ナトカリ比）の考え方。目安は、ここで食事摂取基準の目標量に相当するとされている値を、食事の成分から計算するように加工して作成',
  },
  {
    name: <Ext href="https://www.who.int/publications/i/item/9789240105591">WHO「Use of lower-sodium salt substitutes」（2025年）</Ext>,
    note: 'カリウム入りの減塩タイプの食塩への置きかえと、腎臓の病気などでカリウムを控えている人への注意',
  },
  {
    name: <Ext href="https://www.who.int/news/item/17-07-2023-who-updates-guidelines-on-fats-and-carbohydrates">WHO「炭水化物と脂質のガイドライン」（2023年）</Ext>,
    note: '主食を全粒穀物にする置きかえ（炭水化物は主に全粒穀物・野菜・果物・豆から）',
  },
  {
    name: <Ext href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/undou/index.html">厚生労働省「健康づくりのための身体活動・運動ガイド2023」</Ext>,
    note: '運動で使うカロリー（メッツ表）と、筋トレを週2〜3日の目安。加工して作成',
  },
  {
    name: <Ext href="https://pubmed.ncbi.nlm.nih.gov/34453886/">Careau V, et al. Current Biology 2021（運動で使ったエネルギーの打ち消し）</Ext>,
    note: '体重の予測の幅。運動で使った分の平均約28%を体が打ち消すという結果をもとに計算',
  },
  {
    name: <Ext href="https://www.mhlw.go.jp/stf/newpage_38541.html">厚生労働省「健康に配慮した飲酒に関するガイドライン」</Ext>,
    note: 'お酒の量の目安。加工して作成',
  },
  {
    name: <Ext href="https://www.maff.go.jp/j/syouan/seisaku/risk_analysis/priority/hazard_chem/caffeine.html">農林水産省「カフェインの過剰摂取について」</Ext>,
    note: 'カフェインの目安（欧州食品安全機関・カナダ保健省の値の紹介）。加工して作成',
  },
  {
    name: <Ext href="https://www.e-stat.go.jp/stat-search/files?toukei=00200571&tstat=000000680001">総務省統計局「小売物価統計調査（動向編）」</Ext>,
    note: '食品ランキングの価格。2025年平均を加工して作成',
  },
  {
    name: (
      <>
        <Ext href="https://world.openfoodfacts.org/">Open Food Facts</Ext>（
        <Ext href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL</Ext>）
      </>
    ),
    note: (
      <>
        市販品の一部の栄養成分。このサイトで使っている Open Food Facts のデータ（
        <Ext href={`${REPOSITORY_URL}/blob/main/public/data/products.json`}>products.json</Ext>
        ）は、同じ ODbL で提供しています
      </>
    ),
  },
  {
    name: 'セブン-イレブン・ファミリーマート・ローソン・トップバリュ・各食品メーカーの公式サイト',
    note: '市販品の栄養成分表示の数値と商品名。商品ごとに出典のページと取得日を表示しています',
  },
  {
    name: (
      <>
        書体 <Ext href="https://fonts.google.com/specimen/Zen+Maru+Gothic">Zen Maru Gothic</Ext>・
        <Ext href="https://fonts.google.com/specimen/Mochiy+Pop+One">Mochiy Pop One</Ext>
      </>
    ),
    note: 'SIL Open Font License 1.1',
  },
]

// ads：広告（楽天アフィリエイト）を出しているか。出していないときは、「広告」の欄と、プライバシーの楽天の行を出さない。
// products：楽天市場の商品の例の出し方（ads のときだけ。出していないときは null）。出し方で、楽天との通信と、商品の選び方の説明が変わる。
// analytics：Google アナリティクスを使っているか。使っているときは、プライバシーに、Cookie と、Google に送るもの・送らないもの・止め方を書く
export function AboutPage({ ads = ADS, products = PRODUCTS, analytics = ANALYTICS }: { ads?: boolean; products?: RakutenProducts; analytics?: boolean }) {
  const parts = PARTS.filter((p) => ads || p.id !== 'about-ads')
  return (
    <StaticLayout crumbs={[{ name: SITE_NAME, path: '/' }, { name: ABOUT_HEADING }]}>
      <div className="space-y-4">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">{ABOUT_HEADING}</h1>
          <nav aria-label="このページの中身">
            <ul className="flex flex-wrap gap-x-4 text-sm">
              {parts.map((p) => (
                <li key={p.id}>
                  <a href={`#${p.id}`} className={`${LINK} inline-flex min-h-11 items-center`}>
                    {p.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <Section id="about-what" title={titleOf('about-what')}>
          <p>
            {SITE_NAME}（読み：{SITE_NAME_KANA}）は、料理を選ぶだけで、1日のカロリーと栄養バランスが分かる無料のサイトです。登録はいりません。
          </p>
          <p>
            食べたものを朝・昼・晩に入れると、カロリー、たんぱく質・脂質・炭水化物のバランス、ビタミン・ミネラルの過不足を、年齢や性別に合わせた1日の目安とくらべて見られます。
          </p>
        </Section>

        <Section id="about-operator" title={titleOf('about-operator')}>
          <p>
            {SITE_NAME}は、
            <OperatorLink className={LINK} />
            が運営しています。{OPERATOR_NAME}は、スマートフォンアプリとWebサイトをつくる個人の開発スタジオです。
          </p>
          <p>
            {SITE_NAME}は2026年11月に公開しました。掲載している食品会社やコンビニとは関係のない、個人のサイトです。
          </p>
          <p>
            ご連絡は、このページの「
            <a href="#about-contact" className={LINK}>
              お問い合わせ
            </a>
            」からお送りください。
          </p>
        </Section>

        <Section id="about-check" title={titleOf('about-check')}>
          <p>{SITE_NAME}の数値は、国の機関のデータと各社の表示をもとに、プログラムで計算しています。まちがいが入りにくいように、次のように作り、確かめています。</p>
          <ul className={BULLETS}>
            <li>
              <strong>食材</strong>：文部科学省の成分表のファイルを、プログラムでそのまま読みこんでいます（手で打ち直していません）。成分表で測られていない成分は、0 にせず「値なし」として扱います。
            </li>
            <li>
              <strong>料理</strong>：材料の食品番号と重さ（g）から計算しています。成分表にない食品番号があると、データを作るところで止まります。1人前のカロリーや食塩がふつうの範囲から外れた料理は、知らせが出るので見直しています。
            </li>
            <li>
              <strong>市販品</strong>：各社の公式サイトの栄養成分表示の値です（一部は Open Food Facts のデータ）。エネルギー・たんぱく質・脂質・炭水化物・食塩相当量の5つがそろわない商品は入れていません。各社の公式サイトの値は月に1回取りなおし、商品ごとに出典のページと取得した日を出しています。
            </li>
            <li>
              <strong>1日の目安</strong>：厚生労働省「日本人の食事摂取基準（2025年版）」の値から、年齢・性別・体格・活動量に合わせて計算しています。
            </li>
            <li>
              <strong>自動のテスト</strong>：データの読みこみと計算の決まりごとに、自動のテストがあります（600件以上）。サイトを直すたびに、すべて通ることを確かめてから公開しています。
            </li>
          </ul>
          <h3 className="pt-1 font-bold">自分で確かめるには</h3>
          <ul className={BULLETS}>
            <li>
              食材：
              <a href={VIEW_PATH.foods} className={LINK}>
                食品を調べる
              </a>
              でひらく栄養素の一覧に、成分表での名前を出しています。文部科学省の
              <Ext href={FOOD_DB_URL}>食品成分データベース</Ext>
              で同じ食品をさがすと、もとの値とくらべられます。
            </li>
            <li>
              料理：
              <a href={DISHES_INDEX_PATH} className={LINK}>
                料理のページ
              </a>
              と「料理をアレンジ」の画面に、材料と分量を出しています。
            </li>
            <li>市販品：栄養素の一覧にある出典のリンクから、各社の商品ページを見られます。</li>
            <li>
              計算のプログラムとデータは、
              <Ext href={REPOSITORY_URL}>GitHub</Ext>
              で公開しています。
            </li>
          </ul>
          <p>
            数値のまちがいを見つけたら、「
            <a href="#about-contact" className={LINK}>
              お問い合わせ
            </a>
            」から教えてください。確かめて直します。
          </p>
        </Section>

        <Section id="about-caution" title={titleOf('about-caution')}>
          <ul className={BULLETS}>
            <li>表示される値は、食品成分表や各社の表示から計算した目安です。実際の料理や商品とは差があります。</li>
            <li>医療や栄養指導の代わりにはなりません。持病のある方、食事制限中の方、妊娠中・授乳中の方は、医師や管理栄養士に相談してください。</li>
            <li>体重の変化は、計算上の目安です。</li>
            <li>市販品の値は取得した日のものです。最新の値やアレルギーは、商品のパッケージで確かめてください。</li>
            <li>このサイトは、掲載している会社とは関係のない個人のサイトです。商品名は各社の商標です。</li>
            <li>内容の正確さには気をつけていますが、保証はできません。このサイトを使ったことで生じた損害について、法令で認められる範囲で責任を負いません。</li>
          </ul>
        </Section>

        <Section id="about-privacy" title={titleOf('about-privacy')}>
          <ul className={BULLETS}>
            <li>入力した内容（年齢・性別・身長・体重・運動、保存した1日の食事、お気に入り、登録した商品、最近見た食品）は、お使いの端末のブラウザの中だけに保存します。運営者を含め、だれにも送られません。</li>
            <li>消したいときは、ブラウザの設定でこのサイトのデータ（サイトデータ）を削除してください。</li>
            <li>{analytics ? 'このサイトが Cookie を使うのは、下の Google アナリティクス（アクセス解析）のためだけです。' : 'Cookie は使っていません。'}</li>
            <li>
              何人が使っているかを知るために、Cloudflare の
              <Ext href="https://www.cloudflare.com/web-analytics/">Web Analytics</Ext>
              を使っています（EU からの訪問には使いません）。開いたページ、参照元、ブラウザの種類などが Cloudflare に送られますが、個人を特定する情報や Cookie は使いません。
            </li>
            {analytics && (
              <li>
                どのページがよく読まれているか、どこから来た人が多いかをくわしく知って、サイトを直していくために、Google の
                <Ext href={GA_ABOUT_URL}>Google アナリティクス</Ext>
                も使っています。Google アナリティクスは Cookie を使って、同じブラウザからの訪問を見分けます。Google
                に送られるのは、開いたページのアドレスと題名、参照元、見ていた時間、ページを最後まで読んだこと、ほかのサイトへのリンク{ads && '（楽天市場など）'}を押したこと、ブラウザや端末の種類、画面の大きさ、言語、おおよその国・地域です。入力した内容（年齢・体重・食事など）や、名前・メールアドレスなど個人を特定する情報は送りません。IP
                アドレスは、おおよその地域を調べるのに使われますが、記録されません。広告のための機能（Google シグナル・広告のパーソナライズ）は使っていません。EU（欧州経済領域）・英国・スイスからの訪問では、Cookie
                を使わない設定にしています。
              </li>
            )}
            {analytics && (
              <li>
                Google アナリティクスが集めた情報は、
                <Ext href={GOOGLE_PRIVACY_URL}>Google のプライバシーポリシー</Ext>
                にそって扱われます（
                <Ext href={GOOGLE_PARTNER_SITES_URL}>Google のサービスを使用するサイトやアプリから収集した情報の Google による使用</Ext>
                ）。Google アナリティクスへの送信を止めたいときは、ブラウザに
                <Ext href={GA_OPTOUT_URL}>Google アナリティクス オプトアウト アドオン</Ext>
                を入れてください。止めても、このサイトはそのまま使えます。
              </li>
            )}
            <li>
              サイトは Cloudflare から配信しています。配信のための通信の記録（IP アドレスなど）は、Cloudflare の
              <Ext href="https://www.cloudflare.com/ja-jp/privacypolicy/">プライバシーポリシー</Ext>
              にそって扱われます。
            </li>
            <li>お問い合わせは Google フォームで受け付けます。送っていただいた内容は Google のサービスに保存され、運営者だけが読みます。メールアドレスは返信のためだけに使います。</li>
            {ads && (
              <li>
                楽天市場へのリンク（
                <a href="#about-ads" className={LINK}>
                  広告
                </a>
                ）を押すと、楽天のサイトに移ります。そのとき、楽天が Cookie などを使って、どのサイトからの紹介かを記録します。
                {!products && 'リンクを押さないかぎり、このサイトを開いただけで楽天に情報が送られることはありません。'}
              </li>
            )}
            {ads && products === 'api' && (
              <li>
                楽天市場の商品の例を出す欄（広告）があるページでは、その欄が画面に近づいたときに、お使いのブラウザから楽天のサーバーへ、さがす商品の種類の名前を送って商品の情報を受け取り、商品の画像を読みこみます。このとき、IP
                アドレスやブラウザの種類など通信に要る情報と、このサイト（mogushiru.app）から来たことが、楽天に伝わります。入力した内容（年齢・体重・食事など）は送りません。欄のないページでは、楽天との通信はありません。
              </li>
            )}
            {ads && products === 'picks' && (
              <li>
                楽天市場の商品の例を出す欄（広告）があるページでは、商品の画像を、楽天のサーバー（楽天アフィリエイトと、楽天市場の画像のサーバー）から読みこみます。このとき、IP
                アドレスやブラウザの種類など通信に要る情報と、このサイト（mogushiru.app）から来たことが、楽天に伝わります。楽天が Cookie
                を使うことがあります。入力した内容（年齢・体重・食事など）は送りません。欄のないページでは、楽天との通信はありません。
              </li>
            )}
          </ul>
        </Section>

        {ads && (
          <Section id="about-ads" title={titleOf('about-ads')}>
            <p>
              {SITE_NAME}は、運営の費用をまかなうため、楽天グループ株式会社の「楽天アフィリエイト」に参加しています。
              <a href={NUTRIENTS_INDEX_PATH} className={LINK}>
                {NUTRIENTS_INDEX_HEADING}
              </a>
              の成分ごとのページと、
              <a href={VIEW_PATH.ranking} className={LINK}>
                成分ランキング
              </a>
              の画面（成分を選んで並べ替える画面）にある「楽天市場でさがす」の欄のリンク{products && '（商品の種類の名前と、商品の例）'}から、楽天市場で買い物をすると、運営者に紹介料が支払われます。
            </p>
            <ul className={BULLETS}>
              <li>広告のリンクがあるページには、ページのはじめに「{AD_NOTICE}」、リンクの欄の見出しに「広告」と書いています。</li>
              <li>ランキングの順位と数値は、広告とは関係なく、食品成分表の値だけで決めています。お金をもらって順位を上げたり、載せたりしている食品はありません。</li>
              <li>
                欄に出しているのは、その成分をおぎなうのに使われる商品の種類（たんぱく質ならプロテイン、食物繊維なら難消化性デキストリン、カルシウムならカルシウムのサプリメントなど）です。ランキングの食品そのものへのリンクは出していません。サプリメントなどでおぎなうことの少ない成分（カロリー・脂質・炭水化物・オメガ6脂肪酸・一価不飽和脂肪酸）と、とりすぎに気をつけたい成分（塩分・飽和脂肪酸・カフェイン）には、欄を出していません（成分ランキングの画面で、その成分を選んでいるときも同じです）。
              </li>
              <li>
                サプリメントなどは、食事でとりきれない分をおぎなうためのものです。このサイトは、商品の体へのはたらきを確かめたり、うけあったりはしていません。使うときは、商品に書いてある1日の目安の量を守り、薬を飲んでいる人・通院している人・妊娠中や授乳中の人は、医師や薬剤師に相談してください。
              </li>
              {products === 'picks' ? (
                <li>
                  種類の名前のリンクの先は、楽天市場でその名前をさがした結果です。欄に出る商品の例（画像）は、{RAKUTEN_PICKS_DATE}
                  に、楽天市場を同じ言葉でさがして、その種類に合う商品を、1つの種類につき3つ、このサイトが選んだものです。医薬品は選んでいません。1日の目安の量が多すぎないもの（国の食事摂取基準の「耐容上限量」をこえないもの）を選ぶようにしています。お金をもらって載せている商品はなく、おすすめの順でもありません。選んだあとで、売り切れたり、内容が変わったりしていることがあります。商品の成分・使い方・値段・送料・在庫は、楽天市場の商品のページで確かめてください。
                </li>
              ) : products === 'api' ? (
                <li>
                  種類の名前のリンクの先は、楽天市場でその名前をさがした結果です。欄に出る商品の例（画像・名前・値段）は、同じ言葉でさがした結果を、楽天の「楽天市場商品検索
                  API」から受け取って、上から順に出したものです。このサイトが選んだり、すすめたりしているわけではありません。値段はページを開いたときのものです。商品の成分・使い方・値段・送料・在庫は、楽天市場の商品のページで確かめてください。
                </li>
              ) : (
                <li>リンクの先は、楽天市場でその種類の名前をさがした結果です。出てくる商品を、このサイトが選んだり、すすめたりしているわけではありません。商品の成分・使い方・値段は、楽天市場の商品のページで確かめてください。</li>
              )}
              <li>
                {products === 'api'
                  ? '楽天のプログラム（スクリプト）は読みこんでいません。商品の情報と画像は、欄が画面に近づいたときに楽天のサーバーから読みこみます（上の「プライバシー」）。'
                  : products === 'picks'
                    ? '楽天のプログラム（スクリプト）は読みこんでいません。商品の画像は、楽天のサーバーから読みこみます（上の「プライバシー」）。'
                    : 'リンクは文字だけで、楽天の画像やプログラムは読みこんでいません。'}
                リンクを押して楽天のサイトに移ったあとの情報の扱いは、
                <Ext href={RAKUTEN_PRIVACY_URL}>楽天グループの個人情報保護方針</Ext>
                をごらんください。
              </li>
            </ul>
          </Section>
        )}

        <Section id="about-sources" title={titleOf('about-sources')}>
          <ul className="space-y-2.5">
            {SOURCES.map((s, i) => (
              <li key={i}>
                <span className="block font-bold">{s.name}</span>
                <span className="block text-xs text-ink-soft">{s.note}</span>
              </li>
            ))}
          </ul>
          <p className="pt-1">
            料理の絵とキャラクターは、このサイトのために描いたものです。ソースコードは
            <Ext href={REPOSITORY_URL}>GitHub</Ext>
            で MIT ライセンスで公開しています。
          </p>
        </Section>

        <Section id="about-contact" title={titleOf('about-contact')}>
          <p>使い方・不具合のご連絡、データのまちがい、掲載している会社の方からの訂正・削除のご依頼は、こちらからお送りください。</p>
          {CONTACT_FORM_URL ? (
            <p>
              <Ext href={CONTACT_FORM_URL}>お問い合わせフォーム</Ext>
            </p>
          ) : (
            <p className="text-ink-soft">お問い合わせフォームは準備中です。</p>
          )}
        </Section>
      </div>
    </StaticLayout>
  )
}
