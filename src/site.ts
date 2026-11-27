// サイト全体の情報（「このサイトについて」とフッターで使う）
export const OPERATOR_NAME = 'へいてく'
// 運営者のサイト。運営者の名前を出すところから、リンクを張る
export const OPERATOR_URL = 'https://heyteku.com/'
export const REPOSITORY_URL = 'https://github.com/2heytech/mogushiru'
// お問い合わせの Google フォーム（回答者用のリンク）。空にすると「準備中」と出す
export const CONTACT_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSe6mLsOybTqTCWe0cGSyQRd5xCpzFScVyyC4d758j2cKOKNxw/viewform'

// 楽天アフィリエイトの ID（8桁の英数字を「.」で4つつないだもの。リンクの中に入って、だれでも見られる値）。
// 成分のページの「楽天市場でさがす」のリンクに使う（src/pages/rakuten.ts）。空にすると、リンクも「広告」の表示も出さない。
// このリポジトリをもとに別のサイトを作るときは、空にするか、自分の ID に書きかえる
export const RAKUTEN_AFFILIATE_ID: string = '591ccd02.0640cc07.591ccd03.563bee36'
