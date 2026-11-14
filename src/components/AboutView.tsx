import type { ReactNode } from 'react'
import { SITE_NAME, SITE_NAME_KANA } from '../routes'
import { CONTACT_FORM_URL, OPERATOR_NAME, REPOSITORY_URL } from '../site'

// 「このサイトについて」（#about）。使うときの注意・プライバシー・出典とライセンス・運営者と問い合わせ先を1まいにまとめる

const LINK = 'font-bold text-coral-ink underline decoration-coral/60 underline-offset-2 hover:decoration-coral-ink'

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
      <h3 id={id} className="text-lg font-bold">
        {title}
      </h3>
      <div className="mt-2 space-y-2 text-sm leading-relaxed">{children}</div>
    </section>
  )
}

const BULLETS = 'list-disc space-y-1.5 pl-5 marker:text-coral'

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
    note: '運動で使うカロリー（メッツ表）。加工して作成',
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

export function AboutView({ onBack }: { onBack: () => void }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="about-title" className="text-xl font-bold">
          このサイトについて
        </h2>
        <button type="button" onClick={onBack} className="rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm hover:bg-coral/10">
          1日の栄養バランスにもどる
        </button>
      </div>

      <Section id="about-what" title="モグシルとは">
        <p>
          {SITE_NAME}（読み：{SITE_NAME_KANA}）は、料理を選ぶだけで、1日のカロリーと栄養バランスが分かる無料のサイトです。登録はいりません。
        </p>
        <p>運営：{OPERATOR_NAME}</p>
      </Section>

      <Section id="about-caution" title="使うときの注意">
        <ul className={BULLETS}>
          <li>表示される値は、食品成分表や各社の表示から計算した目安です。実際の料理や商品とは差があります。</li>
          <li>医療や栄養指導の代わりにはなりません。持病のある方、食事制限中の方、妊娠中・授乳中の方は、医師や管理栄養士に相談してください。</li>
          <li>体重の変化は、計算上の目安です。</li>
          <li>市販品の値は取得した日のものです。最新の値やアレルギーは、商品のパッケージで確かめてください。</li>
          <li>このサイトは、掲載している会社とは関係のない個人のサイトです。商品名は各社の商標です。</li>
          <li>内容の正確さには気をつけていますが、保証はできません。このサイトを使ったことで生じた損害について、法令で認められる範囲で責任を負いません。</li>
        </ul>
      </Section>

      <Section id="about-privacy" title="プライバシー">
        <ul className={BULLETS}>
          <li>入力した内容（年齢・性別・身長・体重・運動、保存した1日の食事、お気に入り、登録した商品）は、お使いの端末のブラウザの中だけに保存します。運営者を含め、だれにも送られません。</li>
          <li>消したいときは、ブラウザの設定でこのサイトのデータ（サイトデータ）を削除してください。</li>
          <li>Cookie は使っていません。</li>
          <li>
            何人が使っているかを知るために、Cloudflare の
            <Ext href="https://www.cloudflare.com/web-analytics/">Web Analytics</Ext>
            を使っています（EU からの訪問には使いません）。開いたページ、参照元、ブラウザの種類などが Cloudflare に送られますが、個人を特定する情報や Cookie は使いません。
          </li>
          <li>
            サイトは Cloudflare から配信しています。配信のための通信の記録（IP アドレスなど）は、Cloudflare の
            <Ext href="https://www.cloudflare.com/ja-jp/privacypolicy/">プライバシーポリシー</Ext>
            にそって扱われます。
          </li>
          <li>お問い合わせは Google フォームで受け付けます。送っていただいた内容は Google のサービスに保存され、運営者だけが読みます。メールアドレスは返信のためだけに使います。</li>
        </ul>
      </Section>

      <Section id="about-sources" title="出典とライセンス">
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

      <Section id="about-contact" title="お問い合わせ">
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
  )
}
