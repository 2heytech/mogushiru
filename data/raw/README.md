# 元データ

取得した元データを置く場所。取得日をファイル名かこのファイルに記録する。

- 文部科学省 本表Excel：リポジトリに含める
- Open Food Facts の取得結果（off-*.jsonl）：大きいので含めない
- mext-honpyo.xlsx: 2026-10-10 取得（https://www.mext.go.jp/content/20260327-mxt_kagsei-mext-000029402_02.xlsx 、2026年3月27日更新版）
- off-japan.jsonl: 2026-10-10 取得（Open Food Facts 一括データ en.openfoodfacts.org.products.csv.gz から日本販売分を抽出、リポジトリには含めない）
- mext-fattyacid-1.xlsx: 2026-10-10 取得（脂肪酸成分表編 第1表 可食部100g当たり、https://www.mext.go.jp/content/20260327-mxt_kagsei-mext-000029402_09.xlsx ）
- mext-souzai-2015.json: 2026-10-10 取得（成分表2015年版 第3章「3 そう菜」 https://www.mext.go.jp/component/a_menu/science/detail/__icsFiles/afieldfile/2016/11/30/1365334_1-0322r8.pdf から41品の材料配合割合を抽出）。八訂の18群「調理済み流通食品類」のそう菜は、この配合割合をもとに成分値が計算されている
