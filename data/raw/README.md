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
