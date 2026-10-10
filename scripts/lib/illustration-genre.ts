// 1品ずつの絵がない料理（郷土料理など）に、料理名からジャンル別の共通の絵を当てる
import type { DishCategory } from '../../src/domain/types'

const FISH = /鮎|あゆ|鯛|鯖|さば|鰯|いわし|さんま|サンマ|鮭|ぶり|ブリ|鰤|魚|うなぎ|鰻|あなご|穴子|ハモ|鱧|いか|イカ|たこ|タコ|かに|カニ|蟹|えび|エビ|海老|鯉|鮒|ふな|ふぐ|ふく|はたはた|ニシン|にしん|鰊|鱈|たら|かつお|鰹|まぐろ|鮪|あじ|鯵|ほっけ|ます|鱒|かれい|むつごろう|どじょう|しじみ|あさり|かき|牡蠣|貝|うに|ほたる|ごり|しらうお|白魚|あめご|あまご|やまめ|いわな|岩魚|きびなご|とびうお|あご|ぼら|めばる|がっちょ|げんげ|からすみ/

// 上から順に見て、最初に当てはまったジャンルにする
const RULES: [string, RegExp][] = [
  ['zoni', /雑煮/],
  ['nabe', /鍋|ちゃんこ|すき焼|しゃぶ|すき$|おでん|田楽/],
  ['kayu', /がゆ|かゆ|粥|雑炊|ぞうすい|ろうすい|おじや|茶漬|冷や汁|冷汁/],
  ['soba', /そば|蕎麦/],
  ['udon', /うどん|ほうとう|ぼうとう|おきりこみ|きしめん|ひもかわ|はっとう|ばっとう|ばっと$/],
  ['somen', /そうめん|素麺|冷麦|ひやむぎ|ちゃんぽん|ラーメン|麺|めん$/],
  ['jiru', /汁|すいとん|ひっつみ|呉汁|のっぺい|ぬっぺい|こづゆ|けんちん|こく$|スープ|吸い物|すまし|おつゆ/],
  ['sushi', /寿司|すし|ずし|鮨|バッテラ|恵方巻|かんぴょう巻|太巻|細巻/],
  ['onigiri', /おにぎり|むすび|にぎり飯|握り飯/],
  ['don', /丼|かつめし/],
  ['gohan', /飯|めし|ごはん|ご飯|おこわ|赤飯|強飯|じゅーしー|ジューシー|ちらし|炊き込み|まま$/],
  ['curry', /カレー/],
  ['gyoza', /餃子|ぎょうざ|シューマイ|焼売|しゅうまい|ワンタン/],
  ['dango', /団子|だんご|だご|だんす/],
  ['manju', /まんじゅう|饅頭|おやき|やきもち|焼き餅|焼餅/],
  ['mochi', /餅|もち|ぼた|おはぎ|しとぎ/],
  ['yokan', /ようかん|羊羹|羊かん|寒天|ゼリー|ういろう|外郎|くずきり|ところてん|くず餅/],
  ['okashi', /菓子|せんべい|煎餅|かりんとう|おこし|ゆべし|柚餅子|飴|きんとん|かるかん|ちんすこう|カステラ|ぼうろ|ボーロ|ケーキ|甘納豆|干し柿|あんぽ柿|まき$/],
  ['tsukemono', /漬|づけ|こうこ|ごうこ|たくあん|がっこ|奈良漬/],
  ['sashimi', /刺身|刺し|さしみ|たたき|あらい|洗い|〆|なめろう|膾$|きずし/],
  ['aemono', /あえ|和え|なます|ぬた|酢の物|すのもの|ごま酢|酢味噌|おひたし|ひたし|よごし|ぶて|サラダ/],
  ['nimono', /昆布ま?き|昆布巻|煮|炊き|炊いたん|しめ$|甘露|いとこ|きんぴら|炒め|炒り|いり$|佃|つくだ|でんぶ/],
  ['agemono', /天ぷら|てんぷら|天$|揚げ|揚|あげ|フライ|カツ|かつ|唐揚|からあげ|コロッケ|竜田|串カツ/],
  ['tofu', /豆腐|とうふ|湯葉|ゆば|湯波|麩|がんも|厚揚|納豆/],
  ['tamago', /卵|玉子|たまご|茶碗蒸|ちゃわんむし|ふわふわ/],
  ['fish', FISH],
  ['meat', /肉|牛|豚|鶏|とり|ジンギスカン|ホルモン|鴨|かも|しし|猪|くじら|鯨|チキン|ハム|ソーセージ|ラフテー|ミミガー/],
  ['yaki', /焼|やき|お好み|もんじゃ|ポーポー|ちぢみ/],
]

const BY_CATEGORY: Record<DishCategory, string> = {
  staple: 'gohan', main: 'nimono', side: 'aemono', soup: 'jiru', noodle: 'udon', bowl: 'don',
  bread: 'yaki', snack: 'manju', drink: 'yokan', alcohol: 'yokan',
}

export const ILLUSTRATION_GENRES = [...new Set([...RULES.map(([g]) => g), ...Object.values(BY_CATEGORY)])]

export function illustrationGenre(name: string, category: DishCategory): string {
  const base = name.replace(/（[^）]*）/g, '')
  // 料理名は最後のほうに調理法が来るので、いちばん後ろで当たったジャンルを選ぶ（同じ位置なら先のルール）
  let best: { genre: string; end: number } | undefined
  for (const [genre, re] of RULES) {
    for (const m of base.matchAll(new RegExp(re.source, 'g'))) {
      const end = m.index + m[0].length
      if (!best || end > best.end) best = { genre, end }
    }
  }
  if (best?.genre === 'yaki' && FISH.test(base)) return 'fish'
  return best?.genre ?? BY_CATEGORY[category]
}
