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

CLOCHE = ('<ellipse cx="64" cy="88" rx="46" ry="12" fill="#fff"/>'
          '<path d="M26 84 Q26 44 64 44 Q102 44 102 84Z" fill="#fff4dc"/>'
          '<circle cx="64" cy="38" r="6" fill="#ff8a65"/><path d="M40 70 Q42 56 56 52" fill="none" stroke="#fff" stroke-width="4"/>')
# 料理ごとの顔の位置 (x, y, 大きさ, 濃い色の上か)。器のある料理は器に、ないものは料理そのものに付ける
BOWL = (64, 88, 0.85)
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
