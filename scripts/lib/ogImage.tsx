// SNS などに貼ったときに出る画像（1200×630）を、ページごとに作る。
// satori で HTML ふうの記述を SVG にし、resvg で PNG にする（ブラウザは使わない。書体はアプリと同じ Zen Maru Gothic とロゴの Mochiy Pop One）
import { readFileSync } from 'node:fs'
import { renderAsync, Resvg } from '@resvg/resvg-js'
import { renderToStaticMarkup } from 'react-dom/server'
import satori from 'satori'
import { LogoMogu } from '../../src/components/Mascot'
import type { OgCard } from '../../src/pages/ogCard'

export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

const FONT_DIR = 'node_modules/@fontsource'
const font = (pkg: string, file: string) => readFileSync(`${FONT_DIR}/${pkg}/files/${file}`)
const FONTS = [
  { name: 'Zen Maru Gothic', weight: 700 as const, style: 'normal' as const, data: font('zen-maru-gothic', 'zen-maru-gothic-japanese-700-normal.woff') },
  { name: 'Zen Maru Gothic', weight: 700 as const, style: 'normal' as const, data: font('zen-maru-gothic', 'zen-maru-gothic-latin-700-normal.woff') },
  { name: 'Zen Maru Gothic', weight: 700 as const, style: 'normal' as const, data: font('zen-maru-gothic', 'zen-maru-gothic-greek-700-normal.woff') },
  { name: 'Mochiy Pop One', weight: 400 as const, style: 'normal' as const, data: font('mochiy-pop-one', 'mochiy-pop-one-japanese-400-normal.woff') },
]

const INK = '#5b4636'
const INK_SOFT = '#75604e'
const INK_STRONG = '#3d2b1f'
const CREAM = '#fff8ee'
const CORAL = '#ff8a65'
const OK = '#6cc4a1'
const CAUTION = '#f2b84b'
const MARGIN_X = 64

const svgUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
const LOGO = svgUri(renderToStaticMarkup(<LogoMogu />).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '))
// 絵（public/illustrations/…）を画像に埋めこむ
const illustration = (path: string) => svgUri(readFileSync(`public${path}`, 'utf8'))

// 見出しは1行におさめる（長いほど小さく）
const titleSize = (title: string) => (title.length <= 13 ? 68 : title.length <= 17 ? 58 : title.length <= 20 ? 50 : 44)

// 絵を右に大きく置く形（料理のページ）。字は左の HERO_TEXT_WIDTH におさめる
const HERO_SIZE = 392
const HERO_TEXT_WIDTH = OG_WIDTH - MARGIN_X * 2 - HERO_SIZE - 28
// 見出しは「〈料理名〉の」「カロリー・栄養」のように、言葉の切れ目で2行に分ける。1行ずつが横におさまる大きさにする
const HERO_BREAK = 'のカロリー・栄養'
function heroTitleLines(title: string): string[] {
  if (title.length <= 12 || !title.endsWith(HERO_BREAK)) return [title]
  return [title.slice(0, title.length - HERO_BREAK.length + 1), HERO_BREAK.slice(1)]
}
const heroTitleSize = (lines: string[]) => Math.max(34, Math.min(52, Math.floor(HERO_TEXT_WIDTH / Math.max(...lines.map((l) => l.length)))))

function Hero({ card }: { card: OgCard }) {
  const lines = heroTitleLines(card.title)
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginTop: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: HERO_TEXT_WIDTH }}>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: heroTitleSize(lines), lineHeight: 1.25 }}>
          {lines.map((l) => (
            <div key={l} style={{ display: 'flex' }}>
              {l}
            </div>
          ))}
        </div>
        {card.badge && <div style={{ display: 'flex', alignSelf: 'flex-start', backgroundColor: CORAL, color: INK_STRONG, fontSize: 46, padding: '8px 30px', borderRadius: 999, marginTop: 22 }}>{card.badge}</div>}
        <div style={{ display: 'flex', fontSize: 28, color: INK_SOFT, marginTop: 20 }}>{card.sub}</div>
        {card.chips && (
          <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 22 }}>
            {card.chips.map((c) => (
              <div key={c} style={{ display: 'flex', backgroundColor: '#fff', borderRadius: 999, padding: '8px 24px', fontSize: 28, marginRight: 14, boxShadow: '0 2px 6px rgba(91,70,54,0.12)' }}>
                {c}
              </div>
            ))}
          </div>
        )}
      </div>
      <img src={illustration(card.hero!)} width={HERO_SIZE} height={HERO_SIZE} style={{ marginLeft: 'auto' }} />
    </div>
  )
}

function Frame({ card }: { card: OgCard }) {
  return (
    <div style={{ width: OG_WIDTH, height: OG_HEIGHT, display: 'flex', flexDirection: 'column', backgroundColor: CREAM, color: INK, fontFamily: 'Zen Maru Gothic', fontWeight: 700, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: -150, top: -190, width: 480, height: 480, borderRadius: 240, backgroundColor: '#ffe6d5', display: 'flex' }} />
      <div style={{ position: 'absolute', right: -130, bottom: -210, width: 480, height: 480, borderRadius: 240, backgroundColor: '#e8f5ea', display: 'flex' }} />
      {/* 上の丸より手前に出すため、中身も absolute で重ねる */}
      <div style={{ position: 'absolute', left: MARGIN_X, top: 44, width: OG_WIDTH - MARGIN_X * 2, height: OG_HEIGHT - 44, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src={LOGO} width={76} height={76} />
          <div style={{ fontFamily: 'Mochiy Pop One', fontWeight: 400, fontSize: 46, marginLeft: 12, letterSpacing: 2 }}>モグシル</div>
          <div style={{ marginLeft: 'auto', display: 'flex', backgroundColor: CORAL, color: INK_STRONG, fontSize: 24, padding: '8px 22px', borderRadius: 999 }}>登録不要・無料</div>
        </div>
        {card.hero && <Hero card={card} />}
        {!card.hero && <div style={{ display: 'flex', fontSize: titleSize(card.title), lineHeight: 1.2, marginTop: 26 }}>{card.title}</div>}
        {!card.hero && <div style={{ display: 'flex', fontSize: 30, color: INK_SOFT, marginTop: 10 }}>{card.sub}</div>}
        {card.rows && (
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 26 }}>
            {card.rows.map((r, i) => (
              <div key={r.name} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', borderRadius: 26, padding: '12px 26px 12px 16px', marginBottom: 14, boxShadow: '0 2px 6px rgba(91,70,54,0.12)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 26, backgroundColor: CORAL, color: INK_STRONG, fontSize: 28 }}>{i + 1}</div>
                <img src={illustration(r.image)} width={56} height={56} style={{ marginLeft: 16 }} />
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginLeft: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', fontSize: 34, maxWidth: 640, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{r.name}</div>
                    <div style={{ display: 'flex', fontSize: 30 }}>{r.value}</div>
                  </div>
                  <div style={{ display: 'flex', height: 12, borderRadius: 6, backgroundColor: CREAM, marginTop: 6 }}>
                    <div style={{ display: 'flex', width: `${Math.round(Math.min(Math.max(r.ratio, 0.05), 1) * 100)}%`, height: 12, borderRadius: 6, backgroundColor: card.caution ? CAUTION : OK }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {card.chips && !card.hero && (
          <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 30 }}>
            {card.chips.map((c) => (
              <div key={c} style={{ display: 'flex', backgroundColor: '#fff', borderRadius: 999, padding: '10px 26px', fontSize: 30, marginRight: 14, marginBottom: 14, boxShadow: '0 2px 6px rgba(91,70,54,0.12)' }}>
                {c}
              </div>
            ))}
          </div>
        )}
        {card.icons && (
          <div style={{ display: 'flex', marginTop: 'auto', marginBottom: 44 }}>
            {/* 料理の絵には、もとから丸い地がついている */}
            {card.icons.slice(0, 6).map((path, i) => (
              <img key={`${path}-${i}`} src={illustration(path)} width={150} height={150} style={{ marginRight: 28 }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export async function renderOgPng(card: OgCard): Promise<Buffer> {
  const svg = await satori(<Frame card={card} />, { width: OG_WIDTH, height: OG_HEIGHT, fonts: FONTS })
  return new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } }).render().asPng()
}

// レシピ用の画像（検索エンジン向け。料理のページのレシピのデータに書く）。料理の絵を、まんなかに大きく置く。
// 字は入れない（絵が主役）。右下に小さくロゴの絵だけ置く。写真は使わない
const RECIPE_ART_RATIO = 0.82
const LOGO_SVG = renderToStaticMarkup(<LogoMogu />)

// 入れ子の svg として、(x, y) に size の大きさで置く
const placeSvg = (svg: string, x: number, y: number, size: number) => svg.replace('<svg ', `<svg x="${x}" y="${y}" width="${size}" height="${size}" `)

export function recipeImageSvg(illustrationPath: string, width: number, height: number): string {
  const size = Math.round(Math.min(width, height) * RECIPE_ART_RATIO)
  const art = placeSvg(readFileSync(`public${illustrationPath}`, 'utf8'), Math.round((width - size) / 2), Math.round((height - size) / 2), size)
  const logo = Math.round(Math.min(width, height) * 0.11)
  const r = Math.round(Math.min(width, height) * 0.42)
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="${CREAM}"/>`,
    `<circle cx="${Math.round(r * 0.25)}" cy="${Math.round(r * 0.1)}" r="${r}" fill="#ffe6d5"/>`,
    `<circle cx="${width - Math.round(r * 0.3)}" cy="${height - Math.round(r * 0.05)}" r="${r}" fill="#e8f5ea"/>`,
    art,
    placeSvg(LOGO_SVG, width - logo - Math.round(logo * 0.35), height - logo - Math.round(logo * 0.3), logo),
    '</svg>',
  ].join('')
}

// 数が多い（料理ごとに3枚）ので、絵にするところは別のスレッドで動かす（いくつか並べて作れる）
export async function renderRecipePng(illustrationPath: string, width: number, height: number): Promise<Buffer> {
  return (await renderAsync(recipeImageSvg(illustrationPath, width, height), { fitTo: { mode: 'width', value: width } })).asPng()
}
