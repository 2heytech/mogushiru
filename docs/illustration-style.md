# 料理イラストのスタイル指定

料理イラストは「シンプルでポップ」なフラットイラストに揃える。今は手描きのSVG（`scripts/draw-illustrations.py` で生成）を使っていて、あとから画像生成AIの絵に差し替えられる。

## いまの絵（SVG）

- 正方形 128×128 の SVG。背景はカテゴリ色の丸、料理は太めの丸い茶色の輪郭線（`#5b4636`・3px）と明るいベタ塗りだけで描く。グラデーション・細かい影・文字は使わない。
- 正面から少しのぞきこむ角度で、器（お茶わん・お皿・グラス）＋上にのる具を2〜4個のかたちで表す。
- 背景の丸の色: 主食・パン `#ffeeb0`／主菜・丼 `#ffd9cc`／副菜 `#d6f2dc`／汁物・麺 `#ffe3c2`／飲み物 `#d7ecff`／おやつ・お酒 `#e6defa`
- ファイルは `public/illustrations/<料理ID>.svg`。絵がまだない料理には、カテゴリ色のふた付きのお皿（`public/illustrations/category/<カテゴリ>.svg`）が自動で出る。

### 料理を足すとき

1. `scripts/draw-illustrations.py` の `D['<料理ID>'] = (カテゴリ, 中身)` を1行足す。器は `plate()`・`bowl()`・`can()` などの共通パーツを使い、具は近い料理を写して色とかたちを変える
2. `python3 scripts/draw-illustrations.py` で SVG を書き出す
3. `npm run data:dishes` を実行する（絵のある料理に自動でファイル名が入る）
4. 画面で他の絵と並べて、浮いていないか確認する

## 画像生成AIに差し替えるとき

同じ料理IDの `.webp` か `.png` を `public/illustrations/` に置くと、SVG より優先して使われる（`npm run data:dishes` を実行し直す）。混ざると浮くので、差し替えるときは全品まとめて行う。

## 仕上がりの条件

| 項目 | 指定 |
|---|---|
| サイズ | 正方形 1024×1024 で生成し、配信用は 512×512 に縮小 |
| 背景 | 透過（透過できないサービスでは白背景で生成し、後で切り抜く） |
| 構図 | 料理だけを中央に、正面から少しのぞきこむ角度で。人物・手・文字・ロゴは入れない |
| タッチ | シンプルでポップなフラットイラスト、太めの丸い輪郭線、明るいベタ塗り、影なし |
| 器 | 和食は和食器、洋食は白い洋皿など。器の色はアプリの配色（クリーム・コーラル系）になじむもの |
| ファイル | `public/illustrations/<料理ID>.webp`（または `.png`）。1枚 50KB 以下が目安 |

- 利用する画像生成サービスは、生成物の商用利用が規約で認められているものを選ぶ。
- 実在の商品パッケージ・ブランドを描かせない（市販品はカテゴリ別の汎用イラストで表す）。
- 生成後、輪郭や色味が他のイラストから浮いていないか一覧で並べて確認する。

## 共通プロンプト

`{dish}` を下の表の英語の説明に置き換える。

```
A simple, pop flat icon illustration of {dish}, viewed from the front slightly above,
centered, single item, thick rounded dark brown outlines, bright solid flat colors
(coral, sunny yellow, mint green, sky blue), no gradients, no shadows, minimal details, cute and cheerful,
Japanese home cooking style, inside a pastel circle, no text, no people, no hands, no logo
```

ネガティブプロンプトが使えるサービスでは次を指定する。

```
photorealistic, 3d render, gradients, texture, detailed shading, text, letters, watermark, logo,
people, hands, cluttered background, dark colors
```

## 料理ごとの説明

| 料理ID | 料理名 | `{dish}` に入れる説明 |
|---|---|---|
| `yogurt` | ヨーグルト（無糖） | a small cup of plain yogurt |
| `banana` | バナナ | a banana |
| `milk` | 牛乳 | a glass of milk |
| `beer` | ビール（350mL缶） | a 350ml can of beer next to a glass of beer |
| `sake` | 日本酒（1合） | a tokkuri sake flask with a small ochoko cup |
| `red-wine` | 赤ワイン（グラス1杯） | a glass of red wine |
| `highball` | ハイボール | a tall glass of whisky highball with ice and lemon |
| `chuhai` | 缶チューハイ（350mL） | a can of lemon chuhai next to a glass |
| `karaage` | 鶏の唐揚げ | Japanese fried chicken (karaage) with shredded cabbage |
| `grilled-salmon` | 焼き鮭 | a grilled salted salmon fillet on a small plate |
| `shogayaki` | 豚の生姜焼き | ginger pork (shogayaki) with shredded cabbage |
| `hamburg` | ハンバーグ | a Japanese hamburg steak with demi-glace sauce |
| `nikujaga` | 肉じゃが | nikujaga, simmered beef and potatoes in a bowl |
| `mapo-tofu` | 麻婆豆腐 | mapo tofu in a small dish |
| `gyoza` | 焼きぎょうざ | six pan-fried gyoza dumplings with a small sauce dish |
| `dashimaki` | 卵焼き | a rolled Japanese omelette (tamagoyaki) |
| `fried-egg` | 目玉焼き | a sunny-side-up fried egg |
| `hiyayakko` | 冷奴 | chilled tofu (hiyayakko) with green onion, ginger and bonito flakes |
| `ohitashi` | ほうれん草のおひたし | boiled spinach (ohitashi) with bonito flakes in a small bowl |
| `green-salad` | グリーンサラダ | a green salad with lettuce, tomato and cucumber |
| `kinpira` | きんぴらごぼう | kinpira gobo, stir-fried burdock and carrot in a small dish |
| `yasai-itame` | 野菜炒め | stir-fried vegetables with pork on a plate |
| `miso-soup` | 豆腐とわかめのみそ汁 | a bowl of miso soup with tofu, wakame and green onion |
| `tonjiru` | 豚汁 | a bowl of tonjiru, pork and vegetable miso soup |
| `rice` | ごはん | a bowl of steamed white rice |
| `onigiri-salmon` | 鮭おにぎり | a triangle rice ball with nori seaweed and a bit of salmon |
| `natto-rice` | 納豆ごはん | a bowl of rice topped with natto and green onion |
| `toast` | バタートースト | a slice of buttered toast |
| `kake-udon` | かけうどん | a bowl of hot udon noodles in light broth with green onion |
| `zaru-soba` | ざるそば | cold soba noodles on a bamboo tray with a small cup of dipping sauce |
| `shoyu-ramen` | しょうゆラーメン | a bowl of soy sauce ramen with chashu pork, menma, green onion and nori |
| `meat-sauce` | ミートソーススパゲッティ | spaghetti with meat sauce on a plate |
| `curry-rice` | カレーライス | Japanese curry rice on a plate |
| `gyudon` | 牛丼 | a beef bowl (gyudon) with sliced beef and onion over rice |
| `oyakodon` | 親子丼 | oyakodon, chicken and soft egg over rice in a bowl |

## マスコット「モグ」

おにぎりがモチーフのキャラクター。表情は3種類（にっこり・ふつう・困り顔）を同じタッチで作る。今はアプリ内の簡易SVG（`src/components/Mascot.tsx`）で代用している。

```
A cute mascot character shaped like a triangle Japanese rice ball (onigiri) with a nori seaweed band,
simple dot eyes, {expression}, soft rounded thick outlines, warm pastel colors, flat illustration,
transparent background, no text
```

`{expression}` は `a big happy smile with rosy cheeks` / `a calm neutral face` / `a slightly worried face with a small frown` のいずれか。

## AIで生成するときの手順

1. 共通プロンプトで生成し、512×512 に縮小して `public/illustrations/<料理ID>.webp` に置く
2. `npm run data:dishes` を実行する（イラストのある料理に自動でファイル名が入る）
3. 画面で他のイラストと並べて確認する
