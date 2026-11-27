// サイト全体の情報（「このサイトについて」とフッターで使う）
export const OPERATOR_NAME = 'へいてく'
// 運営者のサイト。運営者の名前を出すところから、リンクを張る
export const OPERATOR_URL = 'https://heyteku.com/'
export const REPOSITORY_URL = 'https://github.com/2heytech/mogushiru'
// お問い合わせの Google フォーム（回答者用のリンク）。空にすると「準備中」と出す
export const CONTACT_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSe6mLsOybTqTCWe0cGSyQRd5xCpzFScVyyC4d758j2cKOKNxw/viewform'

// 楽天アフィリエイトの ID（8桁の英数字を「.」で4つつないだもの。リンクの中に入って、だれでも見られる値）。
// 成分のページの「楽天市場でさがす」のリンクに使う（src/pages/rakuten.ts）。空にすると、リンクも「広告」の表示も出さない。
// 楽天アフィリエイトの管理画面の「URLからリンクを作成」が作るリンクに入っている ID を、そのまま使う。
// このリポジトリをもとに別のサイトを作るときは、空にするか、自分の ID に書きかえる（下の計測 ID も）
export const RAKUTEN_AFFILIATE_ID: string = '10050a54.f2753104.10050a55.ed345923'

// 楽天アフィリエイトの「計測 ID」のコード（リンクの中に入って、だれでも見られる値）。
// 楽天アフィリエイトのレポートで、成果（クリック・売り上げ）を計測 ID ごとに分けて見られる（運営者のほかのサイトの成果と分ける）。
// - 入れるのは、計測 ID の名前ではなく、コード：管理画面でリンクを作るときの「計測IDを設定する」の欄に「名前 [ コード ]」と出る、[ ] の中。
//   計測 ID を選ぶと、リンクの、アフィリエイトの ID のすぐあと（「/」と「?pc=」のあいだ）に、このコードが入る。同じ形のリンクを作る
// - いまの値は、このサイト用に作った計測 ID「mogushiru」のコード
// - 空・形がちがうときは、入れない（リンクは、計測 ID なしの形になる）
export const RAKUTEN_MEASURE_ID: string = '_RTLink160192'

// 楽天ウェブサービス（楽天市場商品検索 API）のアプリ ID とアクセスキー。成分のページの「楽天市場でさがす」の欄に、
// 商品を画像つきで出すのに使う（public/rakuten-shop.js が、見ている人のブラウザから API を呼ぶ）。
// - どちらも、ページの中に入って、だれでも見られる値。アプリは「Webアプリケーション」で登録し、「許可されたWebサイト」に
//   このサイト（mogushiru.app）を入れておく（ほかのサイトからは呼べない。PR ごとのプレビューの URL からも呼べない）
// - どちらかが空・形がちがうときは、商品を出さず、文字のリンクだけにする
export const RAKUTEN_APP_ID: string = ''
export const RAKUTEN_ACCESS_KEY: string = ''
