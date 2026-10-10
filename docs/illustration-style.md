# 料理イラストのスタイル指定

料理イラストは「シンプルでポップ、かわいい」フラットイラストに揃える。今は手描きのSVG（`scripts/draw-illustrations.py` で生成）を使っていて、あとから画像生成AIの絵に差し替えられる。

## いまの絵（SVG）

- 正方形 128×128 の SVG。背景はカテゴリ色の丸、料理は太めの丸い茶色の輪郭線（`#5b4636`・3px）と明るいベタ塗りだけで描く。グラデーション・細かい影・文字は使わない。
- かわいさの決まりごと: 器の色は明るいパステル。背景の丸には白い小さなきらきらを同じ位置に入れる。料理や器に顔は付けない（顔があるのはマスコット「モグ」だけ）。
- 正面から少しのぞきこむ角度で、器（お茶わん・お皿・グラス）＋上にのる具を2〜4個のかたちで表す。
- 背景の丸の色: 主食・パン `#ffeeb0`／主菜・丼 `#ffd9cc`／副菜 `#d6f2dc`／汁物・麺 `#ffe3c2`／飲み物 `#d7ecff`／おやつ・お酒 `#e6defa`
- ファイルは `public/illustrations/<料理ID>.svg`。
- 1品ずつの絵がない料理（郷土料理など）には、料理名から選んだジャンル別の共通の絵（`public/illustrations/genre/<ジャンル>.svg`、雑煮・鍋・汁物・煮物・寿司・餅・団子・漬物など28種類）が自動で出る。ジャンルの選び方は `scripts/lib/illustration-genre.ts`（料理名のいちばん後ろで当たった調理法を優先）。1品ずつの絵を置けばそちらが優先される。
- どれにも当たらない料理には、カテゴリ色のふた付きのお皿（`public/illustrations/category/<カテゴリ>.svg`）が出る。

### 料理を足すとき

料理の型（塩焼き・刺身・みそ汁・おにぎり・うどん/そば・丼・トーストなど）で増やした料理は、型ごとの共通パーツ（`whole_fish()`・`fillet()`・`sashimi_set()`・`miso()`・`onigiri()`・`noodle_bowl()`・`donburi()`・`toast()` など）を使い、器と盛り付けを揃えて中身の色やかたちだけ変える。

1. `scripts/draw-illustrations.py` の `D['<料理ID>'] = (カテゴリ, 中身)` を足す。器は `plate()`・`bowl()`・`can()` などの共通パーツを使い、具は近い料理を写して色とかたちを変える
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
| タッチ | シンプルでポップ、かわいいフラットイラスト。太めの丸い輪郭線、明るいベタ塗り、影なし、顔は付けない |
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
(coral, sunny yellow, mint green, sky blue), no gradients, no shadows, minimal details, kawaii and cheerful, no faces on the food or dishes,
Japanese home cooking style, inside a pastel circle, no text, no people, no hands, no logo
```

ネガティブプロンプトが使えるサービスでは次を指定する。

```
photorealistic, 3d render, gradients, texture, detailed shading, text, letters, watermark, logo,
people, hands, faces, eyes, cluttered background, dark colors
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
| `shumai` | しゅうまい | four steamed shumai dumplings on a small plate |
| `subuta` | 酢豚 | sweet and sour pork with bell peppers, onion and pineapple on a plate |
| `happosai` | 八宝菜 | happosai, stir-fried napa cabbage, shrimp, squid, pork and quail eggs in thick sauce on a plate |
| `aji-nanban` | アジの南蛮漬け | fried horse mackerel marinated in sweet vinegar with sliced onion and carrot in a shallow dish |
| `croquette` | コロッケ | two golden potato croquettes with shredded cabbage |
| `cream-stew` | クリームシチュー | a bowl of Japanese white cream stew with chicken, potato, carrot and broccoli |
| `beef-stew` | ビーフシチュー | a bowl of brown beef stew with potato and carrot |
| `tofu-hamburg` | 豆腐ハンバーグ | a tofu hamburg steak with grated daikon and soy-based sauce |
| `ebi-fry` | えびフライ | three fried breaded shrimp with a lemon wedge and shredded cabbage |
| `menchi` | メンチカツ | a breaded fried minced meat cutlet (menchi katsu) cut in half |
| `gratin` | えびグラタン | shrimp macaroni gratin with golden cheese crust in an oval baking dish |
| `tonkatsu` | とんかつ | sliced pork cutlet (tonkatsu) with tonkatsu sauce and shredded cabbage |
| `grilled-mackerel` | さばの塩焼き | a grilled salted mackerel fillet on a small rectangular plate |
| `sashimi` | まぐろの刺身 | five slices of red tuna sashimi with wasabi and shiso leaf |
| `boiled-egg` | ゆで卵 | a boiled egg cut in half showing the yellow yolk |
| `okonomiyaki` | お好み焼き | okonomiyaki pancake with brown sauce, aonori and bonito flakes |
| `harumaki` | 春巻き | two crispy fried spring rolls (harumaki) |
| `shiraae` | 青菜の白和え | shira-ae, spinach and carrot dressed with mashed tofu in a small bowl |
| `goma-ae` | いんげんのごま和え | green beans dressed with sesame sauce in a small bowl |
| `namasu` | 紅白なます | kohaku namasu, thin strips of daikon and carrot in sweet vinegar in a small bowl |
| `unohana` | 卯の花 | unohana, simmered okara with carrot and green onion in a small bowl |
| `chikuzenni` | 筑前煮 | chikuzen-ni, simmered chicken, lotus root, carrot, burdock and taro in a bowl |
| `namul` | もやしのナムル | bean sprout namul with sesame in a small dish |
| `pumpkin-soup` | かぼちゃのスープ | a cup of creamy pumpkin soup |
| `corn-soup` | コーンスープ | a cup of creamy corn potage soup |
| `chimaki` | 中華ちまき | a Chinese sticky rice dumpling (zongzi) partly unwrapped from bamboo leaf |
| `pilaf` | えびピラフ | shrimp pilaf with peas, corn and carrot on a plate |
| `onigiri-ume` | 梅おにぎり | a triangle rice ball with nori seaweed and a red umeboshi plum on top |
| `fried-rice` | チャーハン | a dome of Chinese fried rice with egg and green onion on a plate |
| `yakisoba` | ソース焼きそば | sauce yakisoba noodles with pork and cabbage, topped with aonori |
| `roll-bread` | ロールパン（2個） | two soft butter rolls |
| `croissant` | クロワッサン | a croissant |
| `mikan` | みかん | a mandarin orange (mikan) with a leaf |
| `apple` | りんご | half an apple cut into wedges |
| `shortcake` | いちごのショートケーキ | a slice of strawberry shortcake |
| `pudding` | プリン | a custard pudding with caramel sauce |
| `daifuku` | 大福 | a white daifuku mochi with red bean paste visible inside |
| `potato-chips` | ポテトチップス（1袋） | a pile of potato chips in a small bowl (no package, no logo) |
| `chocolate` | ミルクチョコレート（1/2枚） | a few pieces of a milk chocolate bar (no wrapper, no logo) |
| `ice-cream` | アイスクリーム | a cup of vanilla ice cream with a small wooden spoon |
| `orange-juice` | オレンジジュース | a glass of orange juice |
| `cola` | コーラ（350mL） | a glass of cola with ice (no can, no logo) |

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
