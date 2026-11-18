// 料理の作り方のページに出す「料理の種類」（和食・中華料理など）。
// 検索エンジン向けのレシピのデータ（Recipe の recipeCuisine）にも同じ言葉を入れる。
// 作り方のページを足したら、その料理をここのどれかに足す（足し忘れるとテストが落ちる）。
// 日本で生まれた洋風の料理（オムライス・とんかつ など）は「洋食」、日本の中華（ラーメン・天津飯 など）は「中華料理」に入れる
const CUISINE_DISHES: Record<string, string[]> = {
  和食: [
    'saba-misoni', 'karei-nitsuke', 'gindara-saikyoyaki', 'buta-kakuni', 'butashabu-salad', 'shabushabu', 'gyuniku-shigureni', 'yudofu', 'agedashi-tofu', 'takoyaki', 'monjayaki',
    'yakitori-negima-tare', 'yakitori-momo-shio', 'oden', 'buri-daikon', 'yosenabe', 'mizutaki', 'motsunabe', 'sukiyaki', 'katsuo-tataki', 'chanko-nabe', 'ishikari-nabe',
    'karaage', 'shogayaki', 'dashimaki', 'nikujaga', 'aji-nanban', 'grilled-mackerel', 'sashimi', 'okonomiyaki', 'shioyaki-aji', 'shioyaki-sanma', 'shioyaki-iwashi',
    'shioyaki-sawara', 'shioyaki-tai', 'shioyaki-tara', 'shioyaki-karei', 'shioyaki-kamasu', 'shioyaki-ayu', 'shioyaki-salmon', 'shioyaki-beniza', 'shioyaki-kajiki', 'himono-aji',
    'himono-hokke', 'himono-shishamo', 'himono-mezashi', 'himono-tarako', 'teriyaki-buri', 'teriyaki-chicken', 'sashimi-salmon', 'sashimi-hamachi', 'sashimi-tai', 'sashimi-katsuo',
    'sashimi-ika', 'sashimi-tako', 'sashimi-hotate', 'sashimi-amaebi', 'chawanmushi', 'kiriboshi-ni', 'hijiki-ni', 'satoimo-nikkorogashi', 'daikon-ni', 'gobo-salad',
    'daikon-salad', 'kyuri-wakame-sunomono', 'moyashi-itame', 'asazuke', 'yaki-nasu', 'nasu-agebitashi', 'hiyayakko', 'ohitashi', 'kinpira', 'yasai-itame', 'shiraae', 'goma-ae',
    'namasu', 'unohana', 'chikuzenni', 'ohitashi-komatsuna', 'ohitashi-shungiku', 'ohitashi-chingensai', 'ohitashi-okura', 'ohitashi-moyashi', 'yasai-edamame', 'yasai-corn',
    'yasai-kabocha-ni', 'sumashijiru', 'hamaguri-suimono', 'kakitama-jiru', 'kenchin-jiru', 'miso-soup', 'tonjiru', 'misoshiru-nameko', 'misoshiru-daikon', 'misoshiru-jagaimo',
    'misoshiru-asari', 'misoshiru-shijimi', 'misoshiru-cabbage', 'misoshiru-nasu', 'misoshiru-spinach', 'misoshiru-wakame', 'mugi-rice', 'zakkoku-rice', 'takikomi-gohan',
    'nigiri-sushi', 'tekka-maki', 'kappa-maki', 'temaki-sushi', 'okayu', 'sekihan', 'inari-sushi', 'chirashi-sushi', 'futomaki', 'ochazuke-salmon', 'zosui-egg', 'zoni-kanto',
    'onigiri-salmon', 'natto-rice', 'onigiri-ume', 'onigiri-tuna-mayo', 'onigiri-konbu', 'onigiri-okaka', 'onigiri-tarako', 'onigiri-mentaiko', 'onigiri-takana', 'kaisendon',
    'unadon', 'negitoro-don', 'tanindon', 'sauce-katsudon', 'gyudon', 'oyakodon', 'don-katsudon', 'don-tendon', 'don-tekka', 'don-salmon', 'don-butadon', 'don-tamago-kake',
    'curry-udon', 'yaki-udon', 'kamatama-udon', 'zaru-udon', 'nabeyaki-udon', 'tororo-soba', 'kamo-nanban', 'somen', 'kake-udon', 'zaru-soba', 'yakisoba', 'udon-kitsune',
    'udon-tanuki', 'udon-tsukimi', 'udon-tempura', 'udon-niku', 'udon-wakame', 'soba-kake', 'soba-kitsune', 'soba-tanuki', 'soba-tsukimi', 'soba-tempura', 'sweets-warabimochi',
    'sweets-zenzai', 'sweets-anmitsu', 'sweets-ohagi',
  ],
  中華料理: [
    'ebi-chili', 'banbanji', 'hoikoro', 'chinjao-rosu', 'mabo-nasu', 'ebi-mayo', 'yurinchi', 'mapo-tofu', 'gyoza', 'shumai', 'subuta', 'happosai', 'harusame-salad', 'wakame-soup',
    'chuka-tamago-soup', 'chimaki', 'tenshinhan', 'don-chukadon', 'don-mabodon', 'hiyashi-chuka', 'miso-ramen', 'shio-ramen', 'tonkotsu-ramen', 'tsukemen', 'tantanmen', 'champon',
    'sara-udon', 'shoyu-ramen',
  ],
  洋食: [
    'ika-fry', 'chicken-katsu', 'pork-saute', 'roll-cabbage', 'omelette', 'scrambled-egg', 'chicken-nanban', 'hamburg', 'fried-egg', 'croquette', 'cream-stew', 'beef-stew',
    'tofu-hamburg', 'ebi-fry', 'menchi', 'gratin', 'tonkatsu', 'boiled-egg', 'grill-steak', 'grill-chicken-saute', 'grill-chicken-breast', 'potato-salad', 'macaroni-salad',
    'caesar-salad', 'coleslaw', 'onyasai', 'green-salad', 'yasai-broccoli', 'consomme-soup', 'clam-chowder', 'pumpkin-soup', 'corn-soup', 'omurice', 'doria', 'pilaf',
    'hayashi-rice', 'roast-beef-don', 'curry-rice', 'napolitan', 'tarako-spaghetti', 'wafu-kinoko-pasta', 'meat-sauce', 'french-toast', 'mixed-sandwich', 'egg-sandwich', 'hot-dog',
    'hamburger', 'cheeseburger', 'toast', 'bread-jam-toast', 'bread-honey-toast', 'bread-cheese-toast',
  ],
  イタリア料理: [
    'minestrone', 'risotto', 'carbonara', 'peperoncino', 'vongole', 'lasagna', 'pizza-margherita',
  ],
  フランス料理: [
    'pot-au-feu', 'quiche',
  ],
  スペイン料理: [
    'paella',
  ],
  韓国料理: [
    'yakiniku-karubi', 'kimchi-nabe', 'namul', 'bibimbap', 'reimen',
  ],
  タイ料理: [
    'gapao-rice',
  ],
  ベトナム料理: [
    'pho',
  ],
  ハワイ料理: [
    'loco-moco',
  ],
  沖縄料理: [
    'goya-champuru', 'taco-rice',
  ],
}

const CUISINE_BY_DISH = new Map(Object.entries(CUISINE_DISHES).flatMap(([cuisine, ids]) => ids.map((id) => [id, cuisine] as const)))

// 一覧にある料理の id（テストで、作り方のページと合っているかを確かめる）
export const CUISINE_DISH_IDS: string[] = Object.values(CUISINE_DISHES).flat()

export const dishCuisine = (dishId: string): string | undefined => CUISINE_BY_DISH.get(dishId)
