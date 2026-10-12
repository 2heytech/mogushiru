# 元データ

取得した元データを置く場所。取得日をファイル名かこのファイルに記録する。

- 文部科学省 本表Excel：リポジトリに含める
- Open Food Facts の取得結果（off-*.jsonl）：大きいので含めない
- mext-honpyo.xlsx: 2026-10-10 取得（https://www.mext.go.jp/content/20260327-mxt_kagsei-mext-000029402_02.xlsx 、2026年3月27日更新版）
- off-japan.jsonl: 2026-10-10 取得（Open Food Facts 一括データ en.openfoodfacts.org.products.csv.gz から日本販売分を抽出、リポジトリには含めない）
- mext-fattyacid-1.xlsx: 2026-10-10 取得（脂肪酸成分表編 第1表 可食部100g当たり、https://www.mext.go.jp/content/20260327-mxt_kagsei-mext-000029402_09.xlsx ）
- mext-souzai-2015.json: 2026-10-10 取得（成分表2015年版 第3章「3 そう菜」 https://www.mext.go.jp/component/a_menu/science/detail/__icsFiles/afieldfile/2016/11/30/1365334_1-0322r8.pdf から41品の材料配合割合を抽出）。八訂の18群「調理済み流通食品類」のそう菜は、この配合割合をもとに成分値が計算されている
- kouri-prices.json: 2026-10-10 取得。総務省統計局「小売物価統計調査（動向編）」2025年 第1表 調査品目の月別価格及び年平均価格（e-Stat https://www.e-stat.go.jp/stat-search/files?toukei=00200571&tstat=000000680001 の年次・食料の Excel 【01】〜【13】）から `npm run data:prices -- <Excelのフォルダ>` で抽出。Excel 自体は含めない
- maff-kyodo.json: 2026-10-10 取得（農林水産省「うちの郷土料理」 https://www.maff.go.jp/j/keikaku/syokubunka/k_ryouri/ の47都道府県のレシピページから、料理名・都道府県・人数・材料と分量を抽出（レシピ提供元は個人名を含むため含めない）。`npx tsx scripts/fetch-maff.ts <HTML保存先>` で再取得）。公共データ利用規約 第1.0版。写真・作り方の文章は含めない
- stores/seven.json・stores/famima.json・stores/lawson.json: 2026-10-11 取得。セブン-イレブン（https://www.sej.co.jp/products/ ）・ファミリーマート（https://www.family.co.jp/goods/safety.html 「アレルゲン、栄養成分…」のカテゴリページ）・ローソン（https://www.lawson.co.jp/recommend/original/ ）の商品ページから、商品名・税込価格・栄養成分表示（1包装・1食当たり）の数値と商品ページのURLを抽出。`npm run data:stores:fetch -- [HTMLの保存先] [seven|famima|lawson]` で取り直し（1秒に1回まで）、`npm run data:stores` で public/data/store-products.json を作る。写真・説明文は含めない。各社のサイトの利用規約は、著作権法で認められる範囲をこえた複製などを禁じている。取り込むのは事実である栄養成分の数値と商品名だけにしている。セブンプレミアムなどお店のブランドの加工品は、サイトに表示の単位（1袋・100g当たりなど）が書かれておらず商品ごとにまちまちなので、public/data には入れない（raw には残す）
- stores/topvalu.json: 2026-10-12 取得。イオンのお店のブランド「トップバリュ」の公式サイト（https://www.topvalu.net/items/ ）の食品の小分類ごとの一覧と商品ページ（番号はJANコード）から、商品名・規格（内容量）・税込価格・栄養成分表示（表示の単位を含む）の数値と商品ページのURLを抽出。`npm run data:stores:fetch -- [HTMLの保存先] topvalu` で取り直す（1秒に1回まで）。利用規約はコンビニ各社と同じく著作権法の範囲をこえた複製の禁止で、取り込むのは商品名と栄養成分の数値だけ。表示の単位が書かれていない商品は public/data に入れない。100g当たりなどの表示は100g(mL)当たりに直し、1袋の量や、おかず・飲み物など食べきりの内容量（300g・600mLまで）を1回分の量にする
