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
| 食品（文部科学省 日本食品標準成分表） | [公式配布ページ](https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html)から本表Excelを `data/raw/` に置き、`npm run data:mext -- data/raw/<ファイル名>.xlsx` |
| 市販品（Open Food Facts） | `npm run data:off:fetch` で取得（数十分かかります）→ `npm run data:off` で変換 |
| 料理 | `data/recipes/*.yaml` から生成（作成中） |

## 公開（Cloudflare Pages）

Cloudflare Pages でこのリポジトリを接続し、次の設定にします。

- Build command: `npm run build`
- Build output directory: `dist`
- 環境変数 `NODE_VERSION`: `22`

## 出典・ライセンス

- 文部科学省「日本食品標準成分表（八訂）増補2023年」（2026年3月27日訂正反映）を加工して作成
- 市販品データ：Open Food Facts（[ODbL](https://opendatacommons.org/licenses/odbl/1-0/)）。`public/data/products.json` は ODbL で提供します
- 目標値：厚生労働省「日本人の食事摂取基準（2025年版）」、「健康に配慮した飲酒に関するガイドライン」
- ソースコード：MIT License
