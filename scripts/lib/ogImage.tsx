// SNS などに貼ったときに出る画像（1200×630）を、ページごとに作る。
// satori で HTML ふうの記述を SVG にし、resvg で PNG にする（ブラウザは使わない。書体はアプリと同じ Zen Maru Gothic とロゴの Mochiy Pop One）
import { readFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'
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
        <div style={{ display: 'flex', fontSize: titleSize(card.title), lineHeight: 1.2, marginTop: 26 }}>{card.title}</div>
        <div style={{ display: 'flex', fontSize: 30, color: INK_SOFT, marginTop: 10 }}>{card.sub}</div>
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
        {card.chips && (
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
