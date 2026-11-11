# モグシル

料理を選んで組み合わせるだけで、1日のカロリーとPFCバランスがすぐ分かる栄養シミュレーター。
登録不要、ブラウザだけで使えます。設計は [docs/design.md](docs/design.md) を参照。

## 開発

```sh
npm install
npm run dev      # 開発サーバー
npm test         # 計算ロジック・データ変換のテスト
npm run build    # 本番ビルド（dist/）
```

## データの生成

配信用データ（`public/data/*.json`）は、元データからスクリプトで生成します。

| データ | 手順 |
|---|---|
| 食品（文部科学省 日本食品標準成分表） | [公式配布ページ](https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html)から本表と脂肪酸成分表（第1表）のExcelを `data/raw/` に置き、`npm run data:mext -- data/raw/<本表>.xlsx data/raw/<脂肪酸成分表>.xlsx`。表示名・検索語は `data/food-names.json` で調整 |
| 市販品（Open Food Facts） | `npm run data:off:fetch` で一括データ（約1.3GB）を読み流して日本販売分を取得（数分）→ `npm run data:off` で変換 |
| 料理 | `data/recipes/*.yaml` を編集し、`npm run data:dishes` で検証・栄養計算（食品データの生成後に実行） |

## 公開（Cloudflare Workers）

Cloudflare Workers の静的ファイル配信（Static Assets）で公開します。設定は `wrangler.jsonc` にあり、Worker のコードはありません。

Cloudflare のダッシュボードで「Workers & Pages」→「アプリケーションを作成」から GitHub のこのリポジトリをつなぎ、次の設定にします。

- プロジェクト名: `mogushiru`（`wrangler.jsonc` の `name` と同じにする。違うとビルドが失敗する）
- ビルドコマンド: `npm run build`
- デプロイコマンド: `npx wrangler deploy`
- プレビュービルド: オン（main 以外のブランチや PR ごとに確認用の URL ができる）

main にマージすると自動で公開に反映されます。Node のバージョンは `.node-version` で指定しています。

手元で確かめるときは `npm run build` のあと `npx wrangler dev`（公開はしない）。

## 出典・ライセンス

- 文部科学省「日本食品標準成分表（八訂）増補2023年」（2026年3月27日訂正反映）を加工して作成
- 市販品データ：Open Food Facts（[ODbL](https://opendatacommons.org/licenses/odbl/1-0/)）。`public/data/products.json` は ODbL で提供します
- 目標値：厚生労働省「日本人の食事摂取基準（2025年版）」、「健康に配慮した飲酒に関するガイドライン」
- ソースコード：MIT License
