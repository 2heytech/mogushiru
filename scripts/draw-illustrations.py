"""料理イラスト（シンプル・ポップでかわいいフラットSVG）を描き出す。

使い方: python3 scripts/draw-illustrations.py public/illustrations

- 料理ごとに public/illustrations/<料理ID>.svg を書く。料理を足すときは D['<料理ID>'] = (カテゴリ, 中身) を追加する。
- 共通パーツ（plate / bowl / can など）と配色を使い、背景の丸はカテゴリ色にする。
- 器か料理に顔（face）を付け、背景にきらきらを入れる。顔の位置は FACE に書く。
- 絵がまだない料理には category/<カテゴリ>.svg（ふた付きのお皿）が出る。
- 同じ名前の .webp / .png を置くと、そちらが優先される（docs/illustration-style.md）。
"""
import os, sys

OUT = sys.argv[1] if len(sys.argv) > 1 else 'public/illustrations'
INK = '#5b4636'
BG = {
    'staple': '#ffeeb0', 'bread': '#ffeeb0', 'main': '#ffd9cc', 'side': '#d6f2dc', 'soup': '#ffe3c2',
    'noodle': '#ffe3c2', 'bowl': '#ffd9cc', 'snack': '#e6defa', 'drink': '#d7ecff', 'alcohol': '#e6defa',
}

# 背景の小さなきらきら（どの絵にも同じ位置に入れる）
def star(x, y, r):
    return f'<path d="M{x} {y-r} Q{x} {y} {x+r} {y} Q{x} {y} {x} {y+r} Q{x} {y} {x-r} {y} Q{x} {y} {x} {y-r}Z" fill="#fff"/>'

SPARKLE = star(20, 34, 6) + star(108, 26, 5) + '<circle cx="110" cy="44" r="2" fill="#fff"/>'

# かわいい顔（点の目・にっこり口・ほっぺ）。light=True は濃い色の上に置くとき
def face(x, y, s=1.0, light=False):
    c = '#fff' if light else INK
    e, r = 7 * s, 2.4 * s
    return (f'<g stroke="none"><ellipse cx="{x-12*s:.1f}" cy="{y+3*s:.1f}" rx="{3.6*s:.1f}" ry="{2.3*s:.1f}" fill="#ff9a9a" opacity=".75"/>'
            f'<ellipse cx="{x+12*s:.1f}" cy="{y+3*s:.1f}" rx="{3.6*s:.1f}" ry="{2.3*s:.1f}" fill="#ff9a9a" opacity=".75"/>'
            f'<circle cx="{x-e:.1f}" cy="{y-2*s:.1f}" r="{r:.1f}" fill="{c}"/><circle cx="{x+e:.1f}" cy="{y-2*s:.1f}" r="{r:.1f}" fill="{c}"/></g>'
            f'<path d="M{x-3*s:.1f} {y+1.5*s:.1f} q{3*s:.1f} {3.2*s:.1f} {6*s:.1f} 0" fill="none" stroke="{c}" stroke-width="{max(2, 2.4*s):.1f}"/>')

def svg(cat, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">'
            f'<circle cx="64" cy="64" r="62" fill="{BG[cat]}"/>{SPARKLE}'
            f'<g stroke="{INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">{body}</g></svg>\n')

# ---- 共通パーツ ----
def plate(cy=84, rx=50, ry=16):
    return f'<ellipse cx="64" cy="{cy}" rx="{rx}" ry="{ry}" fill="#fff"/><ellipse cx="64" cy="{cy-2}" rx="{rx-14}" ry="{ry-6}" fill="#f6eee2" stroke="none"/>'

def bowl(color, surface, top='', mound=None, y=62, rx=44):
    """上から少しのぞいた器。surface=中身の面の色、top=面の上の具。"""
    m = f'<path d="M{64-rx+10} {y} Q64 {mound} {64+rx-10} {y}Z" fill="{surface}"/>' if mound else ''
    return (f'<path d="M{64-rx} {y} Q{64-rx+2} {y+40} 64 {y+42} Q{64+rx-2} {y+40} {64+rx} {y}Z" fill="{color}"/>'
            f'<path d="M50 {y+40} L52 {y+48} H76 L78 {y+40}" fill="{color}"/>'
            f'<ellipse cx="64" cy="{y}" rx="{rx}" ry="12" fill="{surface}"/>{m}{top}')

def dots(pts, r, fill, stroke=True):
    s = '' if stroke else ' stroke="none"'
    return ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"{s}/>' for x, y in pts)

def negi(pts):
    return ''.join(f'<circle cx="{x}" cy="{y}" r="3.2" fill="#9bd36a" stroke-width="2"/>' for x, y in pts)

def cabbage(x=40, y=72):
    return (f'<path d="M{x-20} {y+6} Q{x-18} {y-22} {x+4} {y-20} Q{x+22} {y-24} {x+24} {y+6}Z" fill="#c9eba0"/>'
            f'<path d="M{x-10} {y} q4 -10 8 -14 M{x+4} {y} q2 -10 8 -14" fill="none" stroke="#8cc46a" stroke-width="2.5"/>')

D = {}

D['rice'] = ('staple', bowl('#ff8a65', '#fff', mound=34) + dots([(52, 52), (66, 46), (78, 54)], 1.6, INK, False)
             + '<path d="M30 80 q8 4 16 0 M82 80 q8 4 16 0" fill="none" stroke="#fff" stroke-width="3"/>')

D['onigiri-salmon'] = ('staple',
    '<path d="M64 22 Q72 22 98 72 Q108 96 88 98 H40 Q20 96 30 72 Q56 22 64 22Z" fill="#fff"/>'
    '<rect x="44" y="74" width="40" height="26" rx="4" fill="#3d5a4a"/>'
    '<ellipse cx="64" cy="44" rx="7" ry="5.5" fill="#ff9a76"/>')

D['natto-rice'] = ('staple', bowl('#7cc98a', '#fff', mound=36,
    top=dots([(54, 50), (62, 46), (70, 48), (76, 54), (58, 56), (68, 56)], 4.5, '#c08a4a') + negi([(48, 58), (82, 58), (64, 40)])))

D['toast'] = ('bread',
    '<path d="M28 100 V56 Q24 34 44 30 Q64 22 84 30 Q104 34 100 56 V100Z" fill="#e3a256"/>'
    '<path d="M36 94 V58 Q34 42 48 38 Q64 32 80 38 Q94 42 92 58 V94Z" fill="#ffdc8a" stroke="none"/>'
    '<rect x="52" y="56" width="24" height="18" rx="4" fill="#fff3a8" transform="rotate(-8 64 65)"/>')

D['karaage'] = ('main', plate() + cabbage(44, 76)
    + '<path d="M58 66 q-2 -14 12 -14 q14 -2 14 12 q2 12 -12 14 q-14 0 -14 -12Z" fill="#e3913d"/>'
    + '<path d="M72 80 q-2 -12 12 -12 q14 0 14 12 q0 12 -14 12 q-12 0 -12 -12Z" fill="#d9822e"/>'
    + '<path d="M50 84 q0 -12 12 -12 q12 0 12 10 q0 12 -12 12 q-12 0 -12 -10Z" fill="#eb9d48"/>'
    + '<path d="M90 60 l14 4 q-4 12 -14 -4Z" fill="#fff07a"/>')

D['grilled-salmon'] = ('main',
    '<rect x="16" y="68" width="96" height="34" rx="10" fill="#fff"/>'
    '<path d="M28 82 Q36 54 66 54 Q96 54 102 76 Q98 90 64 90 Q32 92 28 82Z" fill="#ff9a76"/>'
    '<path d="M34 84 Q66 94 98 80" fill="none" stroke="#c96b4a" stroke-width="4"/>'
    '<path d="M50 62 q4 10 2 22 M66 58 q4 12 2 28 M82 60 q4 10 2 22" fill="none" stroke="#ffd0bd" stroke-width="3"/>')

D['shogayaki'] = ('main', plate() + cabbage(40, 76)
    + '<path d="M54 60 q10 -6 20 0 t20 0 l4 16 q-10 6 -20 0 t-20 0Z" fill="#c97a4a"/>'
    + '<path d="M58 76 q10 -6 20 0 t20 0 l2 12 q-10 6 -20 0 t-20 0Z" fill="#d98c58"/>')

D['hamburg'] = ('main', plate()
    + '<ellipse cx="60" cy="72" rx="30" ry="18" fill="#b0643c"/>'
    + '<path d="M36 66 Q60 50 84 66 Q86 74 80 76 Q76 70 72 78 Q66 72 60 78 Q54 70 48 76 Q40 74 36 66Z" fill="#5e2a18"/>'
    + '<circle cx="98" cy="72" r="8" fill="#6cbf5a"/><path d="M90 86 l16 -4 l-4 10Z" fill="#ff9a3c"/>')

D['nikujaga'] = ('main', bowl('#8fb0ee', '#d9a45a',
    top='<rect x="42" y="50" width="18" height="16" rx="6" fill="#ffd75e"/><rect x="62" y="48" width="18" height="16" rx="6" fill="#ffe07a"/>'
        '<path d="M80 58 l14 -4 l-4 12Z" fill="#ff9a3c"/><path d="M30 60 q8 -8 14 0" fill="#a0623a"/>' + dots([(56, 68), (72, 68)], 3, '#7cc98a')))

D['mapo-tofu'] = ('main', bowl('#fff', '#e0573a', rx=46,
    top='<rect x="38" y="52" width="14" height="14" rx="3" fill="#fff"/><rect x="58" y="48" width="14" height="14" rx="3" fill="#fff"/>'
        '<rect x="76" y="54" width="14" height="14" rx="3" fill="#fff"/>' + negi([(52, 68), (70, 66), (86, 50), (44, 50)])))

def gyoza(x, y):
    return (f'<path d="M{x-12} {y+8} Q{x-12} {y-14} {x+8} {y-14} Q{x+22} {y-10} {x+14} {y+8}Z" fill="#fff4dc"/>'
            f'<path d="M{x-12} {y+8} H{x+14}" stroke="#d9822e" stroke-width="5"/>')

D['gyoza'] = ('main', plate(cy=86) + ''.join(gyoza(36 + i * 14, 80 - (i % 2) * 4) for i in range(5))
    + '<ellipse cx="100" cy="52" rx="13" ry="6" fill="#fff"/><ellipse cx="100" cy="52" rx="8" ry="3" fill="#8a4a2e" stroke="none"/>')

def tamago(x, spiral=True):
    sp = f'<path d="M{x+12} 73 m-4 0 a4 4 0 1 1 4 4 a7 7 0 1 1 7 -7" fill="none" stroke="#e8b52e" stroke-width="2.5"/>' if spiral else ''
    return f'<rect x="{x}" y="58" width="24" height="30" rx="7" fill="#ffd94d"/>{sp}'

D['dashimaki'] = ('main', '<rect x="18" y="76" width="92" height="24" rx="8" fill="#fff"/>' + tamago(28) + tamago(52, False) + tamago(76))

D['fried-egg'] = ('main', plate()
    + '<path d="M30 76 Q28 54 50 56 Q60 44 78 52 Q100 52 98 72 Q100 90 76 90 Q60 96 46 90 Q30 90 30 76Z" fill="#fff"/>'
    + '<circle cx="62" cy="70" r="13" fill="#ffc22e"/><circle cx="57" cy="66" r="3" fill="#fff" stroke="none"/>')

D['hiyayakko'] = ('side',
    '<path d="M20 74 L64 56 L108 74 L64 96Z" fill="#7aa8e0"/><path d="M20 74 V82 L64 104 L108 82 V74 L64 96Z" fill="#5f8fcc"/>'
    '<path d="M40 58 L64 48 L88 58 V76 L64 86 L40 76Z" fill="#fff"/><path d="M40 58 L64 68 L88 58 M64 68 V86" fill="none" stroke-width="2.5"/>'
    + negi([(56, 56), (66, 54), (72, 60)]) + '<circle cx="62" cy="62" r="4" fill="#ffc06a" stroke-width="2"/>'
    '<path d="M48 54 l6 -4 l2 5Z M76 54 l6 2 l-4 4Z" fill="#f2c6a0" stroke-width="2"/>')

D['ohitashi'] = ('side', bowl('#fff', '#fff', rx=40, y=66,
    top='<path d="M38 66 Q40 44 64 44 Q88 44 90 66Z" fill="#4fae5c"/><path d="M48 60 q8 -10 16 -12 M64 62 q8 -10 14 -10" fill="none" stroke="#2f8a44" stroke-width="2.5"/>'
        '<path d="M56 42 l6 -5 l3 6Z M68 40 l6 1 l-3 5Z" fill="#f2c6a0" stroke-width="2"/>'))

D['green-salad'] = ('side', bowl('#e9f7ff', '#8fd36a', rx=46,
    top='<path d="M26 62 q6 -18 20 -14 q6 -14 20 -10 q14 -8 22 6 q14 0 14 18Z" fill="#8fd36a"/>'
        '<circle cx="50" cy="52" r="9" fill="#ff6b5a"/><circle cx="78" cy="54" r="8" fill="#ff6b5a"/>'
        '<circle cx="64" cy="60" r="7" fill="#e8f7c8"/><circle cx="64" cy="60" r="3" fill="#9bd36a" stroke="none"/>'
        '<circle cx="90" cy="64" r="6" fill="#e8f7c8"/>'))

D['kinpira'] = ('side', bowl('#fff', '#f6eee2', rx=42, y=66,
    top=''.join(f'<path d="M{x} {y} l{dx} -10" stroke="{c}" stroke-width="5"/>' for x, y, dx, c in
                [(38, 68, 10, '#8a5a34'), (48, 66, 14, '#ff9a3c'), (58, 68, 12, '#8a5a34'), (66, 64, 14, '#8a5a34'),
                 (74, 68, 10, '#ff9a3c'), (82, 66, 8, '#8a5a34'), (52, 58, 12, '#8a5a34'), (68, 56, 10, '#ff9a3c')])
        + dots([(58, 52), (72, 50)], 1.8, '#fff')))

D['yasai-itame'] = ('side', plate()
    + '<path d="M28 82 Q30 56 64 54 Q98 56 100 82Z" fill="#d9f0b0"/>'
    + '<path d="M42 70 l14 -6 M70 64 l16 4 M54 80 l14 -4" stroke="#ff9a3c" stroke-width="5"/>'
    + '<path d="M60 64 q8 -6 14 2 q-6 6 -14 -2Z M80 76 q8 -6 14 2 q-6 6 -14 -2Z M36 78 q8 -6 14 2 q-6 6 -14 -2Z" fill="#e8a888" stroke-width="2.5"/>'
    + '<path d="M48 60 q4 6 10 4 M86 66 q-2 6 4 8" fill="none" stroke="#fffbe6" stroke-width="3"/>')

D['miso-soup'] = ('soup', bowl('#f08a6e', '#e6ad5c', rx=46,
    top='<rect x="40" y="56" width="12" height="12" rx="2" fill="#fff"/><rect x="74" y="54" width="12" height="12" rx="2" fill="#fff"/>'
        '<path d="M54 56 q6 -6 12 0 q-2 8 -12 0Z" fill="#3d7a4a" stroke-width="2.5"/><path d="M60 66 q6 -4 12 2 q-6 4 -12 -2Z" fill="#3d7a4a" stroke-width="2.5"/>'
        + negi([(36, 64), (88, 64), (64, 50)])))

D['tonjiru'] = ('soup', bowl('#f08a6e', '#dd9a4e', rx=46,
    top='<circle cx="44" cy="60" r="7" fill="#fff4dc"/><circle cx="82" cy="62" r="7" fill="#fff4dc"/>'
        '<path d="M56 54 l10 -2 l-2 10Z" fill="#ff9a3c"/><path d="M62 62 q8 -6 16 0 q-8 6 -16 0Z" fill="#e8a888" stroke-width="2.5"/>'
        + negi([(52, 66), (74, 52), (90, 56)])))

D['kake-udon'] = ('noodle', bowl('#7fa8e8', '#f5d99a', rx=46,
    top='<path d="M28 60 q12 6 24 0 t24 0 t24 0 M36 67 q12 6 24 0 t24 0" fill="none" stroke-width="8"/>'
        '<path d="M28 60 q12 6 24 0 t24 0 t24 0 M36 67 q12 6 24 0 t24 0" fill="none" stroke="#fffaf0" stroke-width="4"/>'
        '<path d="M66 50 q8 -6 16 0 v4 h-16Z" fill="#ff9fb0" stroke-width="2.5"/>' + negi([(46, 52), (56, 50), (50, 56)])))

D['zaru-soba'] = ('noodle',
    '<rect x="16" y="64" width="72" height="38" rx="6" fill="#e3c98a"/>'
    '<path d="M24 72 H80 M24 82 H80 M24 92 H80" fill="none" stroke="#c9a85e" stroke-width="2"/>'
    '<path d="M24 86 Q22 54 52 54 Q82 54 80 86Z" fill="#a89580"/>'
    '<path d="M32 70 q6 -8 12 0 t12 0 t12 0 M30 80 q6 -8 12 0 t12 0 t12 0 t10 0" fill="none" stroke="#7d6a58" stroke-width="2.5"/>'
    '<rect x="40" y="48" width="24" height="9" rx="2" fill="#2f4a3a" stroke-width="2.5"/>'
    '<path d="M84 78 L88 102 H106 L110 78Z" fill="#7fa8e8"/><ellipse cx="97" cy="78" rx="13" ry="4" fill="#6b3a24"/>')

D['shoyu-ramen'] = ('noodle', bowl('#ff8a73', '#d39348', rx=48,
    top='<path d="M30 62 q10 5 20 0 t20 0 t20 0" fill="none" stroke="#ffe48a" stroke-width="4"/>'
        '<circle cx="46" cy="56" r="10" fill="#f2c6a0"/><circle cx="46" cy="56" r="4" fill="#e8a888" stroke="none"/>'
        '<rect x="70" y="44" width="16" height="18" rx="2" fill="#2f4a3a" transform="rotate(-10 78 53)"/>'
        '<ellipse cx="84" cy="64" rx="9" ry="6" fill="#fff"/><ellipse cx="84" cy="64" rx="4" ry="3" fill="#ffb02e" stroke="none"/>'
        '<path d="M58 64 l8 2 M60 58 l8 2" stroke="#d9a85a" stroke-width="4"/>' + negi([(62, 50), (66, 54)]))
)

D['meat-sauce'] = ('noodle', plate()
    + '<path d="M28 84 Q28 58 64 56 Q100 58 100 84Z" fill="#ffd977"/>'
    + '<path d="M34 78 q8 -10 16 0 t16 0 t16 0 t14 0" fill="none" stroke="#e8b52e" stroke-width="2.5"/>'
    + '<path d="M44 64 Q50 46 66 48 Q84 46 86 62 Q80 72 64 70 Q48 72 44 64Z" fill="#c4452e"/>'
    + dots([(56, 58), (70, 56), (76, 62)], 2.5, '#8a2e1e', False) + dots([(62, 52)], 2.5, '#6cbf5a'))

D['curry-rice'] = ('bowl', plate(rx=52, ry=18)
    + '<path d="M22 82 Q22 58 50 58 Q62 58 64 70 Q60 84 44 92 Q24 92 22 82Z" fill="#fff"/>'
    + '<path d="M64 70 Q66 56 86 58 Q106 62 104 80 Q100 94 64 94 Q44 94 44 92 Q60 84 64 70Z" fill="#c9862e"/>'
    + '<rect x="70" y="66" width="12" height="11" rx="3" fill="#ffe07a"/><path d="M86 72 l12 -2 l-4 10Z" fill="#ff9a3c"/>'
    + '<rect x="62" y="80" width="12" height="10" rx="3" fill="#ffe07a"/>')

D['gyudon'] = ('bowl', bowl('#7fa8e8', '#fff', mound=40,
    top='<path d="M30 58 q10 -14 22 -8 q8 -10 20 -4 q12 -8 24 6 q4 6 -2 10 Q64 68 32 64Z" fill="#a8603a"/>'
        '<path d="M44 56 q8 -4 14 2 M68 52 q8 -2 12 4" fill="none" stroke="#fff4dc" stroke-width="3"/>'
        '<path d="M82 46 l8 -3 l1 6Z" fill="#ff5a6a" stroke-width="2"/>'))

D['oyakodon'] = ('bowl', bowl('#b48ad0', '#fff', mound=40,
    top='<path d="M28 60 q4 -16 20 -14 q10 -12 26 -6 q16 -4 22 10 q8 6 2 12 Q64 70 30 64Z" fill="#ffd94d"/>'
        '<path d="M40 54 q10 -4 16 4 M66 50 q8 0 12 6" fill="none" stroke="#fff6c8" stroke-width="3"/>'
        '<rect x="50" y="50" width="12" height="10" rx="3" fill="#f2c6a0"/><rect x="72" y="54" width="12" height="10" rx="3" fill="#f2c6a0"/>'
        '<path d="M60 42 q6 -8 12 -2 M66 40 l2 -6" fill="none" stroke="#4fae5c" stroke-width="3"/>'))

D['yogurt'] = ('snack',
    '<path d="M36 50 L44 104 H84 L92 50Z" fill="#fff"/><path d="M39 70 L42 86 H86 L89 70Z" fill="#9fdcc0" stroke="none"/>'
    '<ellipse cx="64" cy="50" rx="28" ry="8" fill="#fffdf6"/>'
    '<path d="M70 50 L96 22" stroke-width="6"/><path d="M70 50 L96 22" stroke="#ff8a65" stroke-width="2"/>')

D['banana'] = ('snack',
    '<path d="M28 44 Q30 94 80 98 Q104 98 106 86 Q102 82 96 84 Q54 84 42 42Z" fill="#ffd84d"/>'
    '<path d="M38 60 Q50 86 84 90" fill="none" stroke="#e8b52e" stroke-width="2.5"/>'
    '<rect x="26" y="34" width="12" height="12" rx="3" fill="#8a6a3a" transform="rotate(-15 32 40)"/>')

D['milk'] = ('drink',
    '<path d="M43.5 46 L47 104 H81 L84.5 46Z" fill="#fff" stroke="none"/>'
    '<path d="M42 24 L47 104 H81 L86 24Z" fill="none"/><path d="M43.5 46 H84.5" fill="none" stroke-width="2.5"/>'
    '<path d="M52 56 V92" stroke="#e3eef8" stroke-width="4"/>')

def can(x, color, mark):
    return (f'<rect x="{x}" y="38" width="32" height="66" rx="6" fill="{color}"/>'
            f'<path d="M{x+4} 38 V34 H{x+28} V38" fill="#ddd"/>{mark}')

D['beer'] = ('alcohol', can(20, '#ffd84d', '<rect x="20" y="58" width="32" height="18" fill="#fff" stroke-width="2.5"/>')
    + '<path d="M64 44 L68 104 H98 L102 44Z" fill="#ffb52e"/>'
    + '<path d="M62 44 Q62 30 74 32 Q80 24 90 30 Q104 28 104 44Z" fill="#fff"/>' + dots([(78, 70), (88, 84), (80, 92)], 2.5, '#ffe48a', False))

D['sake'] = ('alcohol',
    '<path d="M42 22 H62 L60 34 Q82 54 80 82 Q78 104 52 104 Q26 104 24 82 Q22 54 44 34Z" fill="#fbf6ec"/>'
    '<path d="M28 62 Q52 70 76 62" fill="none" stroke="#7fa8e8" stroke-width="5"/>'
    '<path d="M84 80 L88 104 H108 L112 80Z" fill="#fff"/><ellipse cx="98" cy="80" rx="14" ry="4" fill="#fff8d8"/>'
    '<circle cx="98" cy="92" r="4" fill="#7fa8e8" stroke="none"/>')

D['red-wine'] = ('alcohol',
    '<path d="M41.5 48 Q42 76 64 78 Q86 76 86.5 48Z" fill="#b5304a" stroke="none"/>'
    '<path d="M40 24 Q38 76 64 78 Q90 76 88 24Z" fill="none"/><path d="M41.5 48 H86.5" fill="none" stroke-width="2.5"/>'
    '<path d="M64 78 V104" fill="none"/><ellipse cx="64" cy="106" rx="18" ry="5" fill="#fff"/>'
    '<path d="M48 54 Q50 66 56 70" fill="none" stroke="#e0697f" stroke-width="3"/>')

D['highball'] = ('alcohol',
    '<path d="M43 40 L47 108 H81 L85 40Z" fill="#ffd98a" stroke="none"/>'
    '<rect x="50" y="46" width="16" height="16" rx="3" fill="#fff" fill-opacity=".7" stroke-width="2.5" transform="rotate(10 58 54)"/>'
    '<rect x="62" y="60" width="16" height="16" rx="3" fill="#fff" fill-opacity=".7" stroke-width="2.5" transform="rotate(-12 70 68)"/>'
    '<path d="M42 22 L47 108 H81 L86 22Z" fill="none"/>'
    '<circle cx="86" cy="30" r="12" fill="#fff07a"/><path d="M86 18 V42 M74 30 H98" stroke="#e8c52e" stroke-width="2"/>'
    + dots([(56, 86), (68, 94), (60, 98)], 2.2, '#fff', False))

D['chuhai'] = ('alcohol', can(18, '#c9f08a', '<circle cx="34" cy="70" r="10" fill="#fff07a" stroke-width="2.5"/><path d="M34 60 V80 M24 70 H44" stroke="#e8c52e" stroke-width="2"/>')
    + '<path d="M62 46 L66 104 H96 L100 46Z" fill="#fff8c8"/>'
    + '<rect x="70" y="56" width="14" height="14" rx="3" fill="#fff" stroke-width="2.5" transform="rotate(12 77 63)"/>'
    + dots([(76, 84), (86, 92), (82, 76)], 2.2, '#fff', False))

# ---- 追加の42品 ----
BOWL = (64, 88, 0.85)  # お茶わん・どんぶりの顔の位置
def cutlet(x, y, w, h, rot=0, fill='#e8a24a'):
    return (f'<g transform="rotate({rot} {x+w/2} {y+h/2})"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{h/2}" fill="{fill}"/>'
            + dots([(x + w * 0.25, y + h * 0.35), (x + w * 0.55, y + h * 0.6), (x + w * 0.75, y + h * 0.3)], 1.6, '#c97a2e', False) + '</g>')

def cup(surface, top=''):
    # 取っ手つきのスープカップ
    return ('<path d="M28 70 Q12 70 14 82 Q16 92 30 90" fill="none" stroke-width="5"/><path d="M100 70 Q116 70 114 82 Q112 92 98 90" fill="none" stroke-width="5"/>'
            '<path d="M24 64 Q26 104 64 104 Q102 104 104 64Z" fill="#fff"/>'
            f'<ellipse cx="64" cy="64" rx="40" ry="11" fill="{surface}"/>{top}')

def glass(fill, top=''):
    return (f'<path d="M43.5 44 L47 106 H81 L84.5 44Z" fill="{fill}" stroke="none"/>{top}'
            '<path d="M42 26 L47 106 H81 L86 26Z" fill="none"/><path d="M52 52 V92" stroke="#fff" stroke-opacity=".6" stroke-width="4"/>')

def onigiri(top):
    return ('<path d="M64 22 Q72 22 98 72 Q108 96 88 98 H40 Q20 96 30 72 Q56 22 64 22Z" fill="#fff"/>'
            '<rect x="44" y="74" width="40" height="26" rx="4" fill="#3d5a4a"/>' + top)

def shumai(x, y):
    return (f'<rect x="{x}" y="{y}" width="20" height="18" rx="6" fill="#fff2c8"/>'
            f'<ellipse cx="{x+10}" cy="{y+1}" rx="10" ry="4" fill="#f7c96a"/><circle cx="{x+10}" cy="{y-2}" r="3" fill="#7cc98a" stroke-width="2"/>')

D['shumai'] = ('main', plate() + shumai(22, 70) + shumai(42, 66) + shumai(66, 66) + shumai(86, 70))

D['subuta'] = ('main', plate()
    + '<path d="M30 82 Q30 60 64 58 Q98 60 98 82Z" fill="#f7b48a" stroke="none"/>'
    + '<rect x="36" y="64" width="18" height="15" rx="6" fill="#c9562e"/><rect x="72" y="66" width="18" height="15" rx="6" fill="#c9562e"/>'
    + '<rect x="54" y="62" width="20" height="17" rx="7" fill="#d9663a"/>'
    + '<path d="M44 80 l10 -6 l2 10Z M80 60 l10 2 l-6 8Z" fill="#6cbf5a" stroke-width="2.5"/>'
    + '<path d="M60 82 l10 -4 l2 8Z" fill="#ffe07a" stroke-width="2.5"/><path d="M34 74 q4 -8 10 -6" fill="none" stroke="#fff4dc" stroke-width="3"/>')

D['happosai'] = ('main', plate()
    + '<path d="M28 84 Q28 58 64 56 Q100 58 100 84Z" fill="#f6e7b8"/>'
    + '<path d="M38 70 q10 -10 22 -4 l-4 10Z" fill="#e8f7c8" stroke-width="2.5"/><path d="M70 64 q10 -6 18 2 l-6 8Z" fill="#9bd36a" stroke-width="2.5"/>'
    + '<path d="M54 72 a8 8 0 1 1 10 6" fill="none" stroke="#ff8a65" stroke-width="5"/>'
    + '<circle cx="82" cy="76" r="6" fill="#fff"/><path d="M44 80 l10 -2 l-2 6Z" fill="#ff9a3c" stroke-width="2.5"/>'
    + '<path d="M66 60 q4 -4 8 0" fill="none" stroke="#fff" stroke-width="3"/>')

D['aji-nanban'] = ('main', '<ellipse cx="64" cy="86" rx="48" ry="16" fill="#cfe6fa"/><ellipse cx="64" cy="84" rx="36" ry="10" fill="#e8f3fd" stroke="none"/>'
    + '<path d="M30 76 Q50 56 80 66 L98 58 L94 74 L98 88 L80 80 Q50 92 30 76Z" fill="#e8a24a"/>'
    + '<circle cx="38" cy="74" r="2" fill="' + INK + '" stroke="none"/>'
    + '<path d="M44 66 q10 -4 18 2 M60 64 q8 -4 14 2" fill="none" stroke="#fffbe6" stroke-width="4"/>'
    + '<path d="M50 80 l12 -4 M66 82 l12 -4" stroke="#ff9a3c" stroke-width="4"/>')

D['croquette'] = ('main', plate() + cabbage(40, 76)
    + '<ellipse cx="66" cy="70" rx="20" ry="13" fill="#e8a24a"/><ellipse cx="80" cy="80" rx="20" ry="13" fill="#eeb058"/>'
    + dots([(58, 66), (70, 64), (74, 74), (88, 78), (72, 84), (84, 86)], 1.6, '#c97a2e', False))

D['cream-stew'] = ('main', bowl('#ffd28a', '#fffaf0',
    top='<rect x="42" y="52" width="14" height="13" rx="4" fill="#ffe07a"/><path d="M60 50 l12 -2 l-4 10Z" fill="#ff9a3c"/>'
        '<circle cx="80" cy="56" r="5" fill="#4fae5c"/><circle cx="86" cy="60" r="4" fill="#4fae5c"/><rect x="62" y="60" width="13" height="10" rx="4" fill="#f7e2c0"/>'))

D['beef-stew'] = ('main', bowl('#ff8a73', '#9a4a2a',
    top='<rect x="40" y="52" width="14" height="13" rx="4" fill="#ffe07a"/><path d="M76 50 l12 -2 l-4 10Z" fill="#ff9a3c"/>'
        '<rect x="56" y="56" width="16" height="12" rx="5" fill="#6b2e1a"/><path d="M80 62 q6 -4 10 0" fill="none" stroke="#fff" stroke-width="3"/>'))

D['tofu-hamburg'] = ('main', plate()
    + '<ellipse cx="62" cy="74" rx="30" ry="17" fill="#ecc890"/>'
    + '<path d="M44 68 Q64 76 82 66 Q80 80 62 82 Q44 80 44 68Z" fill="#b8743a" stroke="none" opacity=".5"/>'
    + '<path d="M52 62 Q54 50 64 52 Q74 50 74 62Z" fill="#fff"/><path d="M70 50 q8 -10 16 -6 q-2 10 -16 6Z" fill="#6cbf5a" stroke-width="2.5"/>')

def ebi(x, y, rot):
    return (f'<g transform="rotate({rot} {x} {y})"><rect x="{x-24}" y="{y-7}" width="40" height="14" rx="7" fill="#eeb058"/>'
            f'<path d="M{x+14} {y-4} l12 -6 l-2 10 l2 10 l-12 -6Z" fill="#ff6b5a"/></g>')

D['ebi-fry'] = ('main', plate() + cabbage(34, 76) + ebi(64, 58, -14) + ebi(66, 74, -8) + ebi(66, 90, -2)
    + '<path d="M90 86 l14 -2 q-2 12 -14 2Z" fill="#fff07a"/>')

D['menchi'] = ('main', plate() + cabbage(36, 76)
    + '<path d="M50 84 A18 18 0 0 1 86 84Z" fill="#e8a24a"/><path d="M56 84 A12 12 0 0 1 80 84Z" fill="#a8603a" stroke="none"/>'
    + '<path d="M66 70 A18 18 0 0 1 100 66 L84 82Z" fill="#d9822e"/>'
    + dots([(54, 76), (82, 72), (90, 70)], 1.6, '#c97a2e', False))

D['gratin'] = ('main', '<ellipse cx="64" cy="80" rx="50" ry="22" fill="#fff"/><path d="M12 78 h8 M108 78 h8" stroke-width="6"/>'
    + '<ellipse cx="64" cy="74" rx="40" ry="15" fill="#ffd36a"/>'
    + dots([(46, 72), (62, 66), (80, 74), (70, 80)], 3, '#e0973a', False)
    + '<path d="M50 78 a6 6 0 1 1 8 4" fill="none" stroke="#ff8a65" stroke-width="4"/><circle cx="82" cy="66" r="3" fill="#6cbf5a" stroke-width="2"/>')

D['tonkatsu'] = ('main', plate() + cabbage(36, 76)
    + ''.join(f'<rect x="{50 + i * 10}" y="{58 + i * 2}" width="11" height="26" rx="3" fill="#e8a24a"/>' for i in range(5))
    + '<path d="M50 62 q10 6 20 0 t20 2 t10 2" fill="none" stroke="#6b2e1a" stroke-width="4"/>'
    + '<path d="M54 82 h40" stroke="#fff4dc" stroke-width="2.5"/>')

D['grilled-mackerel'] = ('main', '<rect x="16" y="68" width="96" height="34" rx="10" fill="#fff"/>'
    + '<path d="M26 82 Q34 56 64 56 Q94 56 100 76 Q96 90 64 90 Q30 92 26 82Z" fill="#9fb4c8"/>'
    + '<path d="M40 66 q6 6 0 12 M54 62 q6 8 0 16 M68 62 q6 8 0 16 M82 64 q6 6 0 12" fill="none" stroke="#5f7890" stroke-width="2.5"/>'
    + '<path d="M90 92 q4 -10 14 -6 q2 8 -14 6Z" fill="#fff"/><path d="M30 88 q30 8 64 -4" fill="none" stroke="#fff" stroke-width="3"/>')

D['sashimi'] = ('main', plate()
    + '<path d="M26 82 Q30 54 58 52 Q54 72 26 82Z" fill="#6cbf5a"/><path d="M30 78 L54 56" stroke="#3d8a4a" stroke-width="2"/>'
    + ''.join(f'<rect x="{40 + i * 11}" y="{58 - i}" width="16" height="24" rx="4" fill="#e8455a" transform="rotate(14 {48 + i * 11} {70 - i})"/>' for i in range(5))
    + '<path d="M92 82 q6 -10 12 0Z" fill="#a8d86a"/>')

D['boiled-egg'] = ('main', plate(cy=86)
    + '<ellipse cx="46" cy="72" rx="20" ry="16" fill="#fff"/><circle cx="46" cy="72" r="9" fill="#ffc22e"/>'
    + '<ellipse cx="82" cy="74" rx="20" ry="16" fill="#fff"/><circle cx="82" cy="74" r="9" fill="#ffc22e"/>')

D['okonomiyaki'] = ('main', plate()
    + '<ellipse cx="64" cy="76" rx="40" ry="16" fill="#e3a256"/><ellipse cx="64" cy="72" rx="36" ry="12" fill="#8a3e22"/>'
    + '<path d="M36 72 l8 -6 l8 8 l8 -8 l8 8 l8 -8 l8 8 l8 -6" fill="none" stroke="#fff" stroke-width="3"/>'
    + dots([(48, 68), (60, 76), (78, 70), (86, 74)], 1.8, '#6cbf5a', False)
    + '<path d="M62 64 l6 -4 l2 6Z M76 64 l6 2 l-4 4Z" fill="#f2c6a0" stroke-width="2"/>')

def harumaki(x, y, rot):
    return (f'<g transform="rotate({rot} {x} {y})"><rect x="{x-28}" y="{y-9}" width="56" height="18" rx="9" fill="#f2b04a"/>'
            f'<path d="M{x-10} {y-9} q4 9 0 18 M{x+8} {y-9} q4 9 0 18" fill="none" stroke="#d9822e" stroke-width="2.5"/></g>')

D['harumaki'] = ('main', plate() + harumaki(58, 66, -12) + harumaki(68, 80, -6))

def kobachi(top):
    return bowl('#fff', '#f6eee2', rx=40, y=66, top=top)

D['shiraae'] = ('side', kobachi('<path d="M38 66 Q40 46 64 46 Q88 46 90 66Z" fill="#fbf4e4"/>'
    '<path d="M48 58 l8 -6 M64 54 l10 -4" stroke="#4fae5c" stroke-width="4"/><path d="M56 62 l10 -4 M74 60 l8 -4" stroke="#ff9a3c" stroke-width="3"/>'))

D['goma-ae'] = ('side', kobachi(''.join(f'<path d="M{x} {y} l{dx} -12" stroke="#3d8a4a" stroke-width="7"/><path d="M{x} {y} l{dx} -12" stroke="#7cc98a" stroke-width="4"/>'
    for x, y, dx in [(40, 66, 14), (52, 64, 10), (64, 66, 14), (76, 64, 8), (54, 56, 16)])
    + dots([(50, 58), (62, 60), (72, 56), (80, 60)], 1.6, '#e3c98a', False)))

D['namasu'] = ('side', kobachi(''.join(f'<path d="M{x} {y} q6 -8 14 -10" fill="none" stroke="{c}" stroke-width="3.5"/>'
    for x, y, c in [(38, 66, '#fff'), (46, 64, '#ff9a3c'), (54, 66, '#fff'), (62, 62, '#fff'), (70, 66, '#ff9a3c'), (78, 64, '#fff'), (50, 56, '#fff'), (66, 54, '#ff9a3c')])))

D['unohana'] = ('side', kobachi('<path d="M38 66 Q40 46 64 46 Q88 46 90 66Z" fill="#f0dcae"/>'
    + dots([(50, 58), (66, 52), (76, 60)], 2.5, '#ff9a3c', False) + negi([(58, 60), (72, 54)])))

D['chikuzenni'] = ('side', bowl('#ffd28a', '#c98a4a',
    top='<circle cx="46" cy="56" r="9" fill="#fff4dc"/>' + dots([(43, 53), (49, 53), (46, 59)], 2, '#c98a4a', False)
        + '<path d="M64 48 l4 4 l6 -1 l-2 6 l4 4 l-6 1 l-2 6 l-4 -4 l-6 2 l1 -6 l-4 -4 l6 -2Z" fill="#ff9a3c" stroke-width="2.5"/>'
        + '<ellipse cx="82" cy="58" rx="8" ry="6" fill="#e8dcc8"/><rect x="56" y="62" width="12" height="9" rx="3" fill="#a8603a"/>'
        + '<path d="M30 62 q6 -6 12 0 q-6 4 -12 0Z" fill="#6cbf5a" stroke-width="2.5"/>'))

D['namul'] = ('side', '<ellipse cx="64" cy="84" rx="44" ry="16" fill="#cfe6fa"/>'
    + ''.join(f'<path d="M{x} {y} q6 -12 14 -14" fill="none" stroke-width="5"/><path d="M{x} {y} q6 -12 14 -14" fill="none" stroke="#fffbe6" stroke-width="2.5"/>'
              for x, y in [(36, 84), (46, 80), (56, 84), (66, 78), (76, 84), (50, 70), (64, 66), (80, 72)])
    + dots([(48, 72), (62, 74), (74, 70)], 1.6, '#e3c98a', False) + '<path d="M70 64 q4 -4 8 -2" fill="none" stroke="#e8455a" stroke-width="2"/>')

D['pumpkin-soup'] = ('soup', cup('#ffb347', '<path d="M50 62 q8 -6 14 0 t14 0" fill="none" stroke="#fff6e0" stroke-width="3"/><circle cx="74" cy="60" r="3" fill="#4fae5c" stroke-width="2"/>'))

D['corn-soup'] = ('soup', cup('#ffe07a', dots([(52, 62), (60, 66), (70, 60), (78, 66)], 3, '#ffc22e') + '<circle cx="64" cy="58" r="3" fill="#4fae5c" stroke-width="2"/>'))

D['chimaki'] = ('staple', '<path d="M64 24 L102 96 Q64 108 26 96Z" fill="#6cbf5a"/>'
    + '<path d="M64 40 L88 88 Q64 96 40 88Z" fill="#c9965a"/>' + dots([(58, 68), (70, 74), (62, 82)], 2, '#a8603a', False)
    + '<path d="M30 92 L64 24 L98 92" fill="none" stroke="#3d8a4a" stroke-width="2.5"/><path d="M34 84 Q64 96 94 84" fill="none" stroke="#f7e2c0" stroke-width="4"/>')

D['pilaf'] = ('staple', plate()
    + '<path d="M28 84 Q30 52 64 50 Q98 52 100 84Z" fill="#ffe9a8"/>'
    + dots([(44, 70), (78, 66), (60, 62)], 3, '#6cbf5a') + dots([(54, 74), (86, 74), (70, 60)], 2.6, '#ffd22e')
    + '<path d="M40 78 l6 -3 M70 76 l7 -2" stroke="#ff9a3c" stroke-width="4"/><path d="M80 82 a6 6 0 1 1 8 -4" fill="none" stroke="#ff8a65" stroke-width="4"/>')

D['onigiri-ume'] = ('staple', onigiri('<circle cx="64" cy="42" r="7" fill="#e8455a"/><circle cx="62" cy="40" r="2" fill="#fff" stroke="none"/>'))

D['fried-rice'] = ('staple', plate()
    + '<path d="M28 84 Q30 50 64 48 Q98 50 100 84Z" fill="#f7d27a"/>'
    + '<path d="M44 66 q6 -4 10 0 q-4 6 -10 0Z M74 60 q6 -4 10 0 q-4 6 -10 0Z" fill="#ffe94d" stroke-width="2.5"/>'
    + negi([(56, 58), (84, 72), (40, 76)]) + dots([(66, 70), (52, 80)], 2.6, '#e8455a', False))

D['yakisoba'] = ('noodle', plate()
    + '<path d="M28 84 Q30 54 64 52 Q98 54 100 84Z" fill="#b8743a"/>'
    + '<path d="M34 78 q6 -10 12 0 t12 0 t12 0 t12 0 t12 0 M40 66 q6 -10 12 0 t12 0 t12 0 t12 0" fill="none" stroke="#8a4e22" stroke-width="2.5"/>'
    + '<path d="M50 58 q8 -6 14 0 l-4 6Z" fill="#c9eba0" stroke-width="2.5"/><path d="M70 60 q8 -6 14 2 q-6 6 -14 -2Z" fill="#e8a888" stroke-width="2.5"/>'
    + dots([(46, 64), (62, 68), (78, 70), (58, 56)], 1.6, '#4fae5c', False) + '<path d="M84 58 l6 -2 l0 5Z" fill="#ff5a6a" stroke-width="2"/>')

def roll(x, y):
    return (f'<ellipse cx="{x}" cy="{y}" rx="22" ry="15" fill="#e3a256"/>'
            f'<path d="M{x-10} {y-12} q-4 12 2 24 M{x+2} {y-14} q-4 14 2 28 M{x+12} {y-11} q-4 11 2 22" fill="none" stroke="#c9822e" stroke-width="2.5"/>'
            f'<path d="M{x-14} {y-6} q4 -6 10 -6" fill="none" stroke="#ffd28a" stroke-width="3"/>')

D['roll-bread'] = ('bread', plate(cy=88) + roll(46, 72) + roll(82, 74))

D['croissant'] = ('bread',
    '<path d="M20 84 Q22 70 34 66 L40 88 Q28 94 20 84Z" fill="#e8a24a"/><path d="M108 84 Q106 70 94 66 L88 88 Q100 94 108 84Z" fill="#e8a24a"/>'
    '<path d="M34 66 Q42 54 52 52 L56 92 Q46 94 40 88Z" fill="#f2b45a"/><path d="M94 66 Q86 54 76 52 L72 92 Q82 94 88 88Z" fill="#f2b45a"/>'
    '<path d="M52 52 Q64 44 76 52 L72 92 Q64 96 56 92Z" fill="#f7c46a"/><path d="M58 58 q6 -4 10 0" fill="none" stroke="#ffe0a0" stroke-width="3"/>')

D['mikan'] = ('snack', '<circle cx="64" cy="72" r="34" fill="#ffa53c"/>'
    + dots([(48, 58), (78, 60), (86, 80), (44, 86), (72, 96)], 1.5, '#e8862e', False)
    + '<path d="M64 38 q2 -6 0 -10" fill="none"/><path d="M64 34 q14 -14 26 -6 q-12 12 -26 6Z" fill="#6cbf5a"/>'
    + '<path d="M42 62 q4 -10 14 -14" fill="none" stroke="#ffd08a" stroke-width="4"/>')

D['apple'] = ('snack', '<path d="M54 40 Q30 34 26 62 Q24 92 50 100 Q58 102 64 98 Q70 102 78 100 Q104 92 102 62 Q98 34 74 40 Q64 44 54 40Z" fill="#ff5a5a"/>'
    + '<path d="M64 42 q0 -10 4 -14" fill="none" stroke-width="3.5"/><path d="M66 32 q12 -10 22 -4 q-10 10 -22 4Z" fill="#6cbf5a"/>'
    + '<path d="M38 58 q2 -10 10 -12" fill="none" stroke="#ffb0a8" stroke-width="4"/>')

D['shortcake'] = ('snack', '<path d="M24 60 L96 48 L104 64 V98 L32 106 L24 92Z" fill="#fff"/>'
    + '<path d="M24 60 L104 64 V98 L24 92Z" fill="#fffaf0"/>'
    + '<path d="M24 70 L104 74 V80 L24 76Z" fill="#ffe07a" stroke="none"/><path d="M24 84 L104 88 V94 L24 90Z" fill="#ffe07a" stroke="none"/>'
    + '<path d="M24 60 L104 64 V98 L24 92Z" fill="none"/>'
    + '<path d="M62 30 Q50 40 56 52 Q62 58 70 52 Q76 40 62 30Z" fill="#ff4d5e"/><path d="M58 32 l4 -6 l4 6" fill="#6cbf5a" stroke-width="2.5"/>'
    + dots([(60, 44), (66, 46)], 1.2, '#fff', False))

D['pudding'] = ('snack', plate(cy=94, rx=44, ry=12)
    + '<path d="M40 92 L48 44 H80 L88 92Z" fill="#ffe07a"/><path d="M48 44 Q64 36 80 44 L82 56 Q64 62 46 56Z" fill="#9a4a1e"/>'
    + '<path d="M52 66 V82" stroke="#fff6c8" stroke-width="4"/>')

D['daifuku'] = ('snack', plate(cy=94, rx=44, ry=12)
    + '<path d="M28 84 Q26 48 64 46 Q102 48 100 84 Q100 96 64 96 Q28 96 28 84Z" fill="#fffdf6"/>'
    + '<path d="M78 56 Q92 62 92 78 Q84 74 78 56Z" fill="#7a3a4a" stroke-width="2.5"/>'
    + dots([(44, 60), (54, 54), (70, 52), (40, 74)], 1.6, '#e8e0d0', False))

D['potato-chips'] = ('snack', bowl('#8fb0ee', '#ffe9a8', rx=46,
    top=''.join(f'<ellipse cx="{x}" cy="{y}" rx="12" ry="8" fill="#ffd25e" transform="rotate({r} {x} {y})"/>' for x, y, r in
                [(42, 56, -20), (60, 48, 10), (80, 54, 25), (52, 64, 15), (72, 64, -15), (88, 62, 5)])))

D['chocolate'] = ('snack', plate(cy=92, rx=46, ry=12)
    + '<rect x="30" y="50" width="44" height="40" rx="4" fill="#8a4e2e" transform="rotate(-8 52 70)"/>'
    + '<path d="M38 52 V88 M52 50 V90 M30 70 H74" stroke="#5e3020" stroke-width="2.5" transform="rotate(-8 52 70)"/>'
    + '<rect x="72" y="62" width="22" height="20" rx="4" fill="#9a5a34" transform="rotate(12 83 72)"/>')

D['ice-cream'] = ('snack', '<path d="M34 58 L42 106 H86 L94 58Z" fill="#ffb3c6"/>'
    + '<path d="M30 60 Q30 30 64 30 Q98 30 98 60 Q90 66 82 60 Q74 66 64 60 Q54 66 46 60 Q38 66 30 60Z" fill="#fff6d8"/>'
    + '<rect x="84" y="20" width="8" height="30" rx="4" fill="#e3c98a" transform="rotate(30 88 35)"/>'
    + '<path d="M44 44 q4 -8 12 -8" fill="none" stroke="#fff" stroke-width="4"/>')

D['orange-juice'] = ('drink', glass('#ffb02e', '<rect x="60" y="14" width="6" height="40" rx="3" fill="#ff8a65" transform="rotate(12 63 34)"/>')
    + '<circle cx="86" cy="30" r="12" fill="#ffa53c"/><path d="M86 18 V42 M74 30 H98" stroke="#ffd08a" stroke-width="2"/>')

D['cola'] = ('drink', glass('#7a3a1e', '<rect x="52" y="48" width="14" height="14" rx="3" fill="#fff" fill-opacity=".6" stroke-width="2.5" transform="rotate(10 59 55)"/>'
    '<rect x="64" y="58" width="14" height="14" rx="3" fill="#fff" fill-opacity=".6" stroke-width="2.5" transform="rotate(-12 71 65)"/>'
    + dots([(56, 90), (70, 96), (62, 98), (74, 84)], 2, '#c98a5a', False)))

FACE_MORE = {
    'shumai': (52, 79, 0.45), 'subuta': (64, 71, 0.55, True), 'happosai': (64, 93, 0.55), 'aji-nanban': (60, 74, 0.6),
    'croquette': (80, 80, 0.6), 'cream-stew': BOWL, 'beef-stew': BOWL, 'tofu-hamburg': (62, 76, 0.6),
    'ebi-fry': (58, 74, 0.45), 'menchi': (68, 77, 0.45, True), 'gratin': (64, 92, 0.6), 'tonkatsu': (64, 93, 0.5),
    'grilled-mackerel': (64, 74, 0.6), 'sashimi': (64, 93, 0.5), 'boiled-egg': (46, 73, 0.45),
    'okonomiyaki': (64, 74, 0.6, True), 'harumaki': (68, 80, 0.5), 'shiraae': (64, 92, 0.8), 'goma-ae': (64, 92, 0.8),
    'namasu': (64, 92, 0.8), 'unohana': (64, 92, 0.8), 'chikuzenni': BOWL, 'namul': (64, 92, 0.55),
    'pumpkin-soup': (64, 88, 0.8), 'corn-soup': (64, 88, 0.8), 'chimaki': (64, 70, 0.55), 'pilaf': (64, 72, 0.6),
    'onigiri-ume': (64, 60, 0.85), 'fried-rice': (64, 70, 0.6), 'yakisoba': (64, 93, 0.5), 'roll-bread': (82, 76, 0.5),
    'croissant': (64, 74, 0.6), 'mikan': (64, 76, 0.85), 'apple': (64, 74, 0.85), 'shortcake': (64, 84, 0.55),
    'pudding': (64, 74, 0.7), 'daifuku': (60, 76, 0.8), 'potato-chips': BOWL, 'chocolate': (52, 72, 0.5, True),
    'ice-cream': (64, 84, 0.75), 'orange-juice': (64, 80, 0.75), 'cola': (64, 84, 0.7, True),
}

CLOCHE = ('<ellipse cx="64" cy="88" rx="46" ry="12" fill="#fff"/>'
          '<path d="M26 84 Q26 44 64 44 Q102 44 102 84Z" fill="#fff4dc"/>'
          '<circle cx="64" cy="38" r="6" fill="#ff8a65"/><path d="M40 70 Q42 56 56 52" fill="none" stroke="#fff" stroke-width="4"/>')
# 料理ごとの顔の位置 (x, y, 大きさ, 濃い色の上か)。器のある料理は器に、ないものは料理そのものに付ける
FACE = {
    'rice': BOWL, 'natto-rice': BOWL, 'nikujaga': BOWL, 'mapo-tofu': BOWL, 'green-salad': BOWL,
    'miso-soup': BOWL, 'tonjiru': BOWL, 'kake-udon': BOWL, 'shoyu-ramen': BOWL, 'gyudon': BOWL, 'oyakodon': BOWL,
    'ohitashi': (64, 92, 0.8), 'kinpira': (64, 92, 0.8),
    'onigiri-salmon': (64, 60, 0.85), 'toast': (64, 86, 0.75),
    'karaage': (62, 85, 0.6), 'grilled-salmon': (66, 74, 0.7), 'shogayaki': (64, 93, 0.55),
    'hamburg': (60, 82, 0.7, True), 'gyoza': (66, 76, 0.55), 'dashimaki': (64, 75, 0.6),
    'fried-egg': (62, 71, 0.65), 'hiyayakko': (77, 76, 0.5), 'yasai-itame': (64, 91, 0.55),
    'zaru-soba': (97, 92, 0.5), 'meat-sauce': (64, 92, 0.55), 'curry-rice': (40, 78, 0.6),
    'yogurt': (64, 80, 0.75), 'banana': (60, 80, 0.7), 'milk': (64, 80, 0.8),
    'beer': (84, 78, 0.7), 'sake': (52, 86, 0.75), 'red-wine': (64, 62, 0.6, True),
    'highball': (64, 92, 0.7), 'chuhai': (81, 84, 0.65),
}
FACE.update(FACE_MORE)
for k, f in FACE.items():
    cat, body = D[k]
    x, y, sc, *light = f
    D[k] = (cat, body + face(x, y, sc * 1.2, *light))

CLOCHE += face(64, 70, 0.8)
FALLBACK = {f'category/{c}': (c, CLOCHE) for c in BG}

os.makedirs(os.path.join(OUT, 'category'), exist_ok=True)
D.update(FALLBACK)
for k, (cat, body) in D.items():
    with open(os.path.join(OUT, f'{k}.svg'), 'w') as f:
        f.write(svg(cat, body))
print(len(D))
