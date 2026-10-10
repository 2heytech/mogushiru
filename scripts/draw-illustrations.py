"""料理イラスト（シンプル・ポップでかわいいフラットSVG）を描き出す。

使い方: python3 scripts/draw-illustrations.py public/illustrations

- 料理ごとに public/illustrations/<料理ID>.svg を書く。料理を足すときは D['<料理ID>'] = (カテゴリ, 中身) を追加する。
- 共通パーツ（plate / bowl / can など）と配色を使い、背景の丸はカテゴリ色にする。
- 器は明るいパステル色にし、背景にきらきらを入れる。料理には顔を付けない（顔はマスコット「モグ」だけ）。
- 絵がまだない料理には category/<カテゴリ>.svg（ふた付きのお皿）が出る。
- 同じ名前の .webp / .png を置くと、そちらが優先される（docs/illustration-style.md）。
"""
import math, os, sys

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

D['dashimaki'] = ('main', '<rect x="18" y="76" width="92" height="24" rx="8" fill="#fff"/>' + tamago(28) + tamago(52) + tamago(76))

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


# ---- 料理の型ごとの絵（同じ型は器と盛り付けを揃えて、中身の色やかたちだけ変える） ----
def long_plate():
    return '<rect x="14" y="70" width="100" height="32" rx="10" fill="#fff"/>'

def oroshi(x=96, y=90):
    return f'<path d="M{x-8} {y+2} q2 -10 10 -8 q8 2 6 10Z" fill="#fff"/><path d="M{x-14} {y-2} l8 -10 q4 8 -8 10Z" fill="#fff07a" stroke-width="2.5"/>'

def whole_fish(body, belly, length=76, height=22, cx=58, cy=80):
    x0, x1 = cx - length / 2, cx + length / 2
    return (f'<path d="M{x0} {cy} Q{x0+length*0.35} {cy-height} {x1-12} {cy-3} L{x1+6} {cy-12} L{x1+2} {cy} L{x1+6} {cy+12} L{x1-12} {cy+3} Q{x0+length*0.35} {cy+height*0.8} {x0} {cy}Z" fill="{body}"/>'
            f'<path d="M{x0+10} {cy+4} Q{x0+length*0.4} {cy+height*0.55} {x1-14} {cy+2}" fill="none" stroke="{belly}" stroke-width="4"/>'
            f'<circle cx="{x0+9}" cy="{cy-3}" r="2.6" fill="{INK}" stroke="none"/><path d="M{x0+18} {cy-8} q-4 8 0 14" fill="none" stroke-width="2.5"/>'
            f'<path d="M{x0+30} {cy-6} l4 4 m8 -6 l4 4 m8 -4 l4 4" stroke="#fff" stroke-opacity=".8" stroke-width="2.5"/>')

def flat_fish(body):
    return (f'<path d="M24 82 Q40 56 72 60 Q90 62 94 78 L108 70 L106 84 L108 96 L94 88 Q86 100 60 100 Q32 98 24 82Z" fill="{body}"/>'
            f'<circle cx="38" cy="76" r="2.6" fill="{INK}" stroke="none"/><circle cx="46" cy="72" r="2.6" fill="{INK}" stroke="none"/>'
            '<path d="M60 70 l4 4 m8 -6 l4 4 m-14 10 l4 4" stroke="#fff" stroke-opacity=".8" stroke-width="2.5"/>')

def fillet(flesh, skin, stripe):
    return (f'<path d="M26 84 Q34 58 64 58 Q94 58 100 78 Q96 92 64 92 Q30 94 26 84Z" fill="{flesh}"/>'
            f'<path d="M32 86 Q66 96 98 82" fill="none" stroke="{skin}" stroke-width="4"/>'
            f'<path d="M50 64 q4 10 2 22 M66 60 q4 12 2 28 M82 62 q4 10 2 22" fill="none" stroke="{stripe}" stroke-width="3"/>')

for k, art in {
    'shioyaki-aji': whole_fish('#a9bccc', '#e8eef4'),
    'shioyaki-sanma': whole_fish('#8fa4b8', '#e8eef4', length=92, height=14),
    'shioyaki-iwashi': whole_fish('#7f97ad', '#eef2f6', length=66, height=16),
    'shioyaki-kamasu': whole_fish('#c9b48a', '#f6efe0', length=88, height=14),
    'shioyaki-ayu': whole_fish('#b7b98a', '#f4f2dc', length=80, height=18),
    'shioyaki-tai': whole_fish('#ff9a9a', '#ffe0e0'),
    'shioyaki-karei': flat_fish('#c9a77a'),
    'shioyaki-sawara': fillet('#f4ece0', '#8fa4b8', '#fff'),
    'shioyaki-tara': fillet('#fbf6ee', '#b8a890', '#fff'),
    'shioyaki-salmon': fillet('#ff9a76', '#c96b4a', '#ffd0bd'),
    'shioyaki-beniza': fillet('#f0644a', '#a8462e', '#ffb09a'),
    'shioyaki-kajiki': fillet('#f7e4d8', '#8fa4b8', '#fff'),
}.items():
    D[k] = ('main', long_plate() + art + oroshi())

def opened(body, inner):
    return (f'<path d="M22 80 Q30 54 64 52 Q96 54 98 72 L110 64 L108 80 L110 96 L98 88 Q94 104 64 104 Q30 104 22 80Z" fill="{body}"/>'
            f'<path d="M30 80 Q38 62 64 60 Q90 62 92 80 Q90 96 64 98 Q38 96 30 80Z" fill="{inner}"/>'
            '<path d="M36 80 H90" stroke="#e8c8a8" stroke-width="3"/>')

def small_fish(n, body, length=60):
    return ''.join(whole_fish(body, '#f4f2ea', length=length, height=10, cx=56, cy=66 + i * 12) for i in range(n))

D['himono-aji'] = ('main', long_plate() + opened('#a9bccc', '#f2c89a') + oroshi(100, 94))
D['himono-hokke'] = ('main', long_plate() + opened('#c9b48a', '#f6d6a8') + oroshi(100, 94))
D['himono-shishamo'] = ('main', long_plate() + small_fish(3, '#d9b88a', 58))
D['himono-mezashi'] = ('main', long_plate() + small_fish(4, '#8fa4b8', 64))
D['himono-tarako'] = ('main', long_plate() + '<path d="M28 84 Q30 64 52 66 Q74 70 72 86 Q60 96 40 94 Q28 92 28 84Z" fill="#f2786a"/>'
                      '<path d="M60 82 Q64 62 86 64 Q104 68 102 84 Q92 96 74 94 Q60 92 60 82Z" fill="#ff8a7a"/>'
                      + dots([(40, 80), (50, 76), (78, 76), (88, 82)], 2, '#c9563e', False) + oroshi(102, 96))

def glossy(fill):
    return f'<path d="M26 84 Q34 58 64 58 Q94 58 100 78 Q96 92 64 92 Q30 94 26 84Z" fill="{fill}"/><path d="M40 70 q12 -8 28 -6" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="4"/>'

D['teriyaki-buri'] = ('main', long_plate() + glossy('#a8582e') + '<path d="M32 86 Q66 96 98 82" fill="none" stroke="#6b3a24" stroke-width="4"/>' + oroshi())
D['teriyaki-chicken'] = ('main', plate() + cabbage(36, 76)
    + ''.join(f'<rect x="{50 + i * 11}" y="{58 + i * 2}" width="12" height="26" rx="4" fill="#c9783a"/>' for i in range(5))
    + '<path d="M54 62 q10 -4 18 -2" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3"/>')

def sashimi_set(slices):
    return (plate() + '<path d="M26 82 Q30 54 58 52 Q54 72 26 82Z" fill="#6cbf5a"/><path d="M30 78 L54 56" stroke="#3d8a4a" stroke-width="2"/>'
            + slices + '<path d="M92 84 q6 -10 12 0Z" fill="#a8d86a"/>')

def slices(fill, line=None, n=5):
    out = ''
    for i in range(n):
        x, y = 40 + i * 11, 58 - i
        out += f'<rect x="{x}" y="{y}" width="16" height="24" rx="4" fill="{fill}" transform="rotate(14 {x+8} {y+12})"/>'
        if line:
            out += f'<path d="M{x+4} {y+6} q4 6 2 14" fill="none" stroke="{line}" stroke-width="2.5" transform="rotate(14 {x+8} {y+12})"/>'
    return out

D['sashimi-salmon'] = ('main', sashimi_set(slices('#ff8a5c', '#ffd0bd')))
D['sashimi-hamachi'] = ('main', sashimi_set(slices('#ffd8c8', '#f2a08a')))
D['sashimi-tai'] = ('main', sashimi_set(slices('#fff4f0', '#ffb3b3')))
D['sashimi-katsuo'] = ('main', sashimi_set(slices('#c43a4a', '#8a6a5a')))
D['sashimi-ika'] = ('main', sashimi_set(slices('#fbfbf6', '#e8e8e0')))
D['sashimi-tako'] = ('main', sashimi_set(''.join(f'<circle cx="{44 + i * 12}" cy="{70 - (i % 2) * 6}" r="9" fill="#fff"/><path d="M{44 + i * 12} {61 - (i % 2) * 6} a9 9 0 0 1 9 9" fill="none" stroke="#e8455a" stroke-width="4"/>' for i in range(4))))
D['sashimi-hotate'] = ('main', sashimi_set(''.join(f'<ellipse cx="{46 + i * 14}" cy="{70 - (i % 2) * 6}" rx="10" ry="8" fill="#fffaf0"/><ellipse cx="{46 + i * 14}" cy="{68 - (i % 2) * 6}" rx="6" ry="3" fill="#fff" stroke="none"/>' for i in range(4))))
D['sashimi-amaebi'] = ('main', sashimi_set(''.join(f'<path d="M{42 + i * 12} 60 q10 2 10 14 q-2 10 -10 12" fill="none" stroke="#ff8a7a" stroke-width="7"/><path d="M{52 + i * 12} 86 l4 4 l-6 2Z" fill="#ff5a5a" stroke-width="2"/>' for i in range(4))))

def garnish():
    return '<circle cx="92" cy="74" r="7" fill="#4fae5c"/><circle cx="98" cy="80" r="6" fill="#4fae5c"/><path d="M84 88 l14 -2 l-4 8Z" fill="#ff9a3c"/>'

D['grill-steak'] = ('main', plate() + '<path d="M28 76 Q30 56 56 58 Q80 54 82 72 Q84 90 56 90 Q30 92 28 76Z" fill="#8a4a2e"/>'
                    + '<path d="M38 66 l20 -4 M40 76 l24 -4" stroke="#5e2a18" stroke-width="3"/>' + garnish())
D['grill-chicken-saute'] = ('main', plate() + '<path d="M28 76 Q30 56 56 58 Q80 54 82 72 Q84 90 56 90 Q30 92 28 76Z" fill="#e3a256"/>'
                            + '<path d="M38 66 l20 -4 M40 76 l24 -4" stroke="#c9822e" stroke-width="3"/>' + garnish())
D['grill-chicken-breast'] = ('main', plate() + ''.join(f'<rect x="{30 + i * 12}" y="{60 + i}" width="13" height="26" rx="4" fill="#f6dcb8"/>' for i in range(4))
                             + '<path d="M32 62 h40" stroke="#e3a256" stroke-width="3"/>' + garnish())

D['ready-sausage'] = ('main', plate() + ''.join(f'<rect x="30" y="{58 + i * 10}" width="58" height="13" rx="6.5" fill="#d9663a" transform="rotate(-6 59 {64 + i * 10})"/><path d="M40 {62 + i * 10} l4 4 m6 -4 l4 4" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>' for i in range(3)) + '<circle cx="98" cy="80" r="6" fill="#4fae5c"/>')
D['ready-ham'] = ('main', plate() + '<circle cx="54" cy="72" r="20" fill="#ffb3b8"/><circle cx="74" cy="76" r="20" fill="#ffc4c8"/><path d="M62 70 q8 -4 14 0" fill="none" stroke="#fff" stroke-width="3"/>')
D['ready-bacon'] = ('main', plate() + ''.join(f'<path d="M26 {66 + i * 14} q10 -8 20 0 t20 0 t20 0 t16 0 v10 q-8 -8 -16 0 t-20 0 t-20 0 t-20 0Z" fill="#e8786a"/><path d="M30 {70 + i * 14} q10 -8 20 0 t20 0 t20 0" fill="none" stroke="#fff4e8" stroke-width="2.5"/>' for i in range(2)))
D['ready-roast-beef'] = ('main', plate() + ''.join(f'<path d="M{30 + i * 16} 82 Q{28 + i * 16} 58 {48 + i * 16} 56 Q{60 + i * 16} 64 {54 + i * 16} 84Z" fill="#e88a8a"/><path d="M{34 + i * 16} 80 Q{32 + i * 16} 62 {46 + i * 16} 60" fill="none" stroke="#a8462e" stroke-width="3"/>' for i in range(4)))
D['ready-chikuwa'] = ('main', plate() + '<rect x="26" y="62" width="70" height="22" rx="11" fill="#fff6e4"/><path d="M34 62 v22 M46 62 v22 M58 62 v22 M70 62 v22 M82 62 v22" stroke="#d9984a" stroke-width="5"/><ellipse cx="96" cy="73" rx="6" ry="11" fill="#fff"/><ellipse cx="96" cy="73" rx="2.5" ry="5" fill="#f6eee2" stroke="none"/>')
D['ready-satsumaage'] = ('main', plate() + '<ellipse cx="54" cy="72" rx="24" ry="14" fill="#c9862e"/><ellipse cx="78" cy="78" rx="22" ry="13" fill="#d9984a"/>' + dots([(46, 68), (60, 74), (76, 76), (86, 80)], 2, '#ff9a3c', False))
D['ready-natto'] = ('main', '<rect x="26" y="50" width="76" height="52" rx="6" fill="#fff"/><rect x="32" y="56" width="64" height="40" rx="4" fill="#f6eee2" stroke="none"/>'
                    + dots([(44, 66), (54, 62), (64, 68), (74, 62), (84, 68), (48, 78), (60, 80), (72, 78), (84, 82), (66, 88), (52, 88)], 5, '#c08a4a')
                    + '<path d="M26 50 L40 30 H88 L102 50" fill="#fff" fill-opacity=".8"/>')
D['ready-atsuage'] = ('main', plate() + ''.join(f'<rect x="{30 + i * 22}" y="{58 + (i % 2) * 6}" width="22" height="22" rx="4" fill="#d9984a"/><rect x="{34 + i * 22}" y="{62 + (i % 2) * 6}" width="14" height="14" rx="2" fill="#fff6e0" stroke="none"/>' for i in range(3)) + negi([(46, 56), (74, 58)]))
D['ready-ganmodoki'] = ('main', bowl('#fff', '#f2c66a', rx=44, top='<circle cx="64" cy="54" r="16" fill="#d9984a"/>' + dots([(58, 50), (68, 54), (62, 60)], 2, '#ff9a3c', False) + dots([(70, 48)], 2, '#4fae5c', False)))

def tempura_paper():
    return plate() + '<path d="M30 80 L64 50 L100 78 L66 96Z" fill="#fffdf6" stroke-width="2.5"/>'

def batter(x, y, w, h, rot, inner=''):
    return (f'<g transform="rotate({rot} {x} {y})"><path d="M{x-w/2} {y} q0 -{h/2} 8 -{h/2} h{w-16} q8 0 8 {h/2} q0 {h/2} -8 {h/2} h-{w-16} q-8 0 -8 -{h/2}Z" fill="#ffd77a"/>{inner}'
            + dots([(x - w / 4, y - 2), (x + w / 6, y + 3)], 1.6, '#e8b52e', False) + '</g>')

D['ready-ebi-tempura'] = ('main', tempura_paper() + batter(60, 64, 50, 16, -24, '') + '<path d="M80 52 l10 -8 l0 10Z" fill="#ff5a5a" stroke-width="2.5"/>'
                          + batter(66, 80, 50, 16, -18) + '<path d="M86 70 l10 -8 l0 10Z" fill="#ff5a5a" stroke-width="2.5"/>')
D['ready-imo-tempura'] = ('main', tempura_paper() + ''.join(f'<ellipse cx="{50 + i * 16}" cy="{70 + (i % 2) * 6}" rx="12" ry="9" fill="#ffd77a"/><ellipse cx="{50 + i * 16}" cy="{70 + (i % 2) * 6}" rx="7" ry="5" fill="#ffc22e" stroke="none"/><ellipse cx="{50 + i * 16}" cy="{70 + (i % 2) * 6}" rx="12" ry="9" fill="none" stroke="#b05a8a" stroke-width="2"/>' for i in range(3)))
D['ready-nasu-tempura'] = ('main', tempura_paper() + ''.join(f'<path d="M{44 + i * 18} 60 q10 -2 12 10 q2 12 -6 16 q-10 -2 -10 -14Z" fill="#ffd77a"/><path d="M{48 + i * 18} 64 q6 0 6 8 q0 8 -4 10" fill="none" stroke="#7a4a8a" stroke-width="3"/>' for i in range(3)))

D['ready-aji-fry'] = ('main', plate() + cabbage(36, 76) + '<path d="M50 84 Q52 58 76 60 L92 52 L90 66 L98 76 L82 78 Q74 92 50 84Z" fill="#e8a24a"/>'
                      + dots([(60, 72), (70, 66), (74, 78)], 1.6, '#c97a2e', False) + '<path d="M92 86 l12 -2 q-2 10 -12 2Z" fill="#fff07a"/>')
D['ready-kaki-fry'] = ('main', plate() + cabbage(36, 76) + ''.join(f'<path d="M{56 + i * 14} {66 + (i % 2) * 10} q-2 -12 10 -12 q10 2 6 14 q-4 8 -12 6 q-6 -2 -4 -8Z" fill="#e8a24a"/>' for i in range(3))
                       + '<path d="M90 88 l12 -2 q-2 10 -12 2Z" fill="#fff07a"/>')
D['ready-hire-katsu'] = ('main', plate() + cabbage(36, 76) + ''.join(cutlet(54 + i * 16, 60 + (i % 2) * 8, 18, 22) for i in range(3))
                         + '<path d="M58 64 q16 -4 30 2" fill="none" stroke="#6b2e1a" stroke-width="3.5"/>')
D['ready-fries'] = ('main', ''.join(f'<rect x="{40 + i * 8}" y="{30 + (i % 3) * 6}" width="8" height="44" rx="2" fill="#ffd25e" transform="rotate({(i - 3) * 5} {44 + i * 8} 70)"/>' for i in range(7))
                    + '<path d="M34 58 L94 58 L86 108 H42Z" fill="#ff6b5a"/><path d="M38 70 H90" stroke="#fff" stroke-width="3"/>')

def green_mound(leaf, vein, extra=''):
    return bowl('#fff', '#fff', rx=40, y=66,
                top=f'<path d="M38 66 Q40 44 64 44 Q88 44 90 66Z" fill="{leaf}"/><path d="M48 60 q8 -10 16 -12 M64 62 q8 -10 14 -10" fill="none" stroke="{vein}" stroke-width="2.5"/>{extra}'
                    '<path d="M56 42 l6 -5 l3 6Z M68 40 l6 1 l-3 5Z" fill="#f2c6a0" stroke-width="2"/>')

D['ohitashi-komatsuna'] = ('side', green_mound('#3f9a50', '#2a7038'))
D['ohitashi-shungiku'] = ('side', green_mound('#5fae4a', '#3d8a34', '<path d="M44 54 l4 -4 l4 4 l4 -4 M70 52 l4 -4 l4 4" fill="none" stroke="#3d8a34" stroke-width="2.5"/>'))
D['ohitashi-chingensai'] = ('side', green_mound('#8fd36a', '#e8f7c8', '<path d="M52 64 q4 -12 12 -16 M68 64 q2 -10 8 -14" fill="none" stroke="#fffbe6" stroke-width="5"/>'))
D['ohitashi-okura'] = ('side', bowl('#fff', '#fff', rx=40, y=66, top=''.join(
    f'<circle cx="{x}" cy="{y}" r="8" fill="#6cbf5a"/><path d="M{x} {y-5} l1.5 3.5 l3.5 1.5 l-3.5 1.5 l-1.5 3.5 l-1.5 -3.5 l-3.5 -1.5 l3.5 -1.5Z" fill="#e8f7c8" stroke-width="1.5"/>'
    for x, y in [(48, 60), (64, 54), (80, 60), (56, 66), (72, 66)])))
D['ohitashi-moyashi'] = ('side', bowl('#fff', '#fff', rx=40, y=66, top=''.join(
    f'<path d="M{x} {y} q6 -12 14 -14" fill="none" stroke-width="5"/><path d="M{x} {y} q6 -12 14 -14" fill="none" stroke="#fffbe6" stroke-width="2.5"/>'
    for x, y in [(38, 66), (48, 64), (58, 66), (68, 62), (78, 66), (52, 56), (66, 52)]) + '<path d="M56 42 l6 -5 l3 6Z" fill="#f2c6a0" stroke-width="2"/>'))

def small_dish(top, color='#cfe6fa'):
    return f'<ellipse cx="64" cy="84" rx="44" ry="16" fill="{color}"/><ellipse cx="64" cy="82" rx="32" ry="10" fill="#fff" fill-opacity=".5" stroke="none"/>{top}'

D['yasai-broccoli'] = ('side', small_dish(''.join(f'<path d="M{x} {y+8} v12" stroke="#8cc46a" stroke-width="6"/><circle cx="{x-6}" cy="{y}" r="8" fill="#3f9a50"/><circle cx="{x+6}" cy="{y}" r="8" fill="#3f9a50"/><circle cx="{x}" cy="{y-6}" r="8" fill="#4fae5c"/>' for x, y in [(46, 66), (74, 62), (62, 76)])
                                     + '<path d="M84 76 q6 -10 12 0 q-6 6 -12 0Z" fill="#fff8d8"/>'))
D['yasai-edamame'] = ('side', small_dish(''.join(f'<g transform="rotate({r} {x} {y})"><rect x="{x-18}" y="{y-7}" width="36" height="14" rx="7" fill="#8fd36a"/><path d="M{x-8} {y-6} v12 M{x+4} {y-6} v12" stroke="#5fae4a" stroke-width="2"/></g>' for x, y, r in [(48, 70, -20), (76, 68, 15), (62, 82, -5), (86, 84, 30)])))
D['yasai-corn'] = ('side', small_dish('<rect x="28" y="62" width="72" height="24" rx="12" fill="#ffd84d" transform="rotate(-10 64 74)"/>'
                                      + ''.join(f'<path d="M{38 + i * 9} 64 v22" stroke="#e8b52e" stroke-width="2" transform="rotate(-10 64 74)"/>' for i in range(7))))
D['yasai-tomato'] = ('side', small_dish(''.join(f'<path d="M{x} {y} a14 14 0 0 1 28 0Z" fill="#ff5a5a"/><path d="M{x+6} {y} a8 8 0 0 1 16 0" fill="#ffb0a0" stroke="none"/>' for x, y in [(30, 80), (50, 74), (70, 80)]) + '<path d="M60 58 l4 -6 l4 6" fill="#6cbf5a" stroke-width="2.5"/>'))
D['yasai-kabocha-ni'] = ('side', bowl('#b48ad0', '#e8b06a', rx=44, top=''.join(f'<path d="M{x} {y} l18 -2 l2 12 l-18 4Z" fill="#ffb02e"/><path d="M{x} {y} l18 -2" stroke="#3f7a3a" stroke-width="5"/>' for x, y in [(36, 58), (56, 54), (74, 60)])))
D['yasai-kimchi'] = ('side', small_dish('<path d="M36 82 Q38 56 64 56 Q90 56 92 82Z" fill="#e8553a"/><path d="M44 74 q8 -10 18 -8 M64 70 q10 -8 18 -2" fill="none" stroke="#ffd0b0" stroke-width="4"/>' + dots([(52, 64), (74, 64)], 2, '#ffd0b0', False), '#fff'))
D['yasai-takuan'] = ('side', small_dish(''.join(f'<path d="M{x} 84 a13 13 0 0 1 26 0Z" fill="#ffe94d"/>' for x in (30, 48, 66)), '#fff'))
D['yasai-hakusai-zuke'] = ('side', small_dish('<path d="M34 82 Q36 58 64 58 Q92 58 94 82Z" fill="#f2f8d8"/><path d="M42 76 q8 -12 20 -12 M66 74 q8 -10 18 -8" fill="none" stroke="#9bd36a" stroke-width="5"/>' + dots([(56, 66), (78, 68)], 1.6, '#e8455a', False), '#fff'))
D['yasai-kyuri-nuka'] = ('side', small_dish(''.join(f'<ellipse cx="{x}" cy="{y}" rx="10" ry="7" fill="#e8f7c8"/><ellipse cx="{x}" cy="{y}" rx="10" ry="7" fill="none" stroke="#3f9a50" stroke-width="4"/>' for x, y in [(42, 78), (58, 72), (74, 78), (88, 72)]), '#fff'))
D['yasai-umeboshi'] = ('side', small_dish('<circle cx="64" cy="72" r="14" fill="#e8455a"/><path d="M58 66 q4 -4 8 -2" fill="none" stroke="#fff" stroke-width="3"/><path d="M76 60 q8 -6 14 -2 q-6 8 -14 2Z" fill="#b05a8a" stroke-width="2.5"/>', '#fff'))

def miso(top, surface='#e6ad5c'):
    return bowl('#f08a6e', surface, rx=46, top=top + negi([(36, 64), (88, 64)]))

D['misoshiru-nameko'] = ('soup', miso(dots([(46, 58), (56, 54), (66, 58), (76, 54), (60, 64), (72, 64)], 4.5, '#d9843a')))
D['misoshiru-daikon'] = ('soup', miso(''.join(f'<rect x="{x}" y="{y}" width="16" height="7" rx="2" fill="#fff" transform="rotate({r} {x+8} {y+3})"/>' for x, y, r in [(42, 54, -10), (62, 50, 10), (66, 62, -5), (48, 64, 15)])))
D['misoshiru-jagaimo'] = ('soup', miso('<rect x="42" y="52" width="14" height="12" rx="4" fill="#ffe07a"/><rect x="66" y="56" width="14" height="12" rx="4" fill="#ffe07a"/><path d="M56 60 q6 -8 12 0" fill="none" stroke="#fff4dc" stroke-width="4"/>'))
D['misoshiru-asari'] = ('soup', miso(''.join(f'<path d="M{x-9} {y} a9 7 0 0 1 18 0Z" fill="#e8dcc8"/><path d="M{x} {y-6} v6 M{x-5} {y-4} l2 4 M{x+5} {y-4} l-2 4" stroke="#b8a890" stroke-width="1.5"/>' for x, y in [(46, 62), (64, 56), (80, 62), (58, 68)])))
D['misoshiru-shijimi'] = ('soup', miso(''.join(f'<path d="M{x-6} {y} a6 5 0 0 1 12 0Z" fill="#5a4a3a"/>' for x, y in [(44, 60), (56, 56), (68, 58), (80, 60), (52, 66), (64, 66), (76, 66)]), '#e3b878'))
D['misoshiru-cabbage'] = ('soup', miso('<path d="M42 60 q8 -10 18 -6 l-4 10Z M64 54 q10 -6 18 2 l-6 8Z" fill="#d9f0b0" stroke-width="2.5"/>'))
D['misoshiru-nasu'] = ('soup', miso(''.join(f'<ellipse cx="{x}" cy="{y}" rx="9" ry="6" fill="#f6eee2"/><ellipse cx="{x}" cy="{y}" rx="9" ry="6" fill="none" stroke="#7a4a8a" stroke-width="3.5"/>' for x, y in [(48, 58), (66, 54), (78, 62)])))
D['misoshiru-spinach'] = ('soup', miso('<path d="M44 62 q6 -12 16 -10 q-2 10 -16 10Z M64 58 q8 -12 18 -8 q-4 10 -18 8Z" fill="#3f9a50" stroke-width="2.5"/>'))
D['misoshiru-wakame'] = ('soup', miso('<path d="M44 58 q6 -6 12 0 q-2 8 -12 0Z M64 52 q6 -6 12 0 q-2 8 -12 0Z M70 64 q6 -4 12 2 q-6 4 -12 -2Z" fill="#3d7a4a" stroke-width="2.5"/>' + negi([(56, 64), (60, 52)])))

FRUIT = {
    'fruit-strawberry': ''.join(f'<path d="M{x} {y-12} Q{x+14} {y-12} {x+10} {y+4} Q{x} {y+14} {x-10} {y+4} Q{x-14} {y-12} {x} {y-12}Z" fill="#ff4d5e"/><path d="M{x-6} {y-14} l6 4 l6 -4" fill="#6cbf5a" stroke-width="2.5"/>' + dots([(x - 4, y - 4), (x + 4, y - 2), (x, y + 4)], 1.2, '#ffe0a0', False)
                                for x, y in [(42, 64), (64, 58), (86, 64), (52, 88), (76, 88)]),
    'fruit-grape': '<path d="M64 26 v10" fill="none" stroke-width="4"/><path d="M66 30 q12 -8 22 -2 q-10 10 -22 2Z" fill="#6cbf5a"/>'
                   + ''.join(f'<circle cx="{x}" cy="{y}" r="10" fill="#9a5ac8"/>' for x, y in [(50, 46), (64, 44), (78, 46), (44, 62), (58, 62), (72, 62), (86, 62), (52, 78), (66, 78), (80, 78), (58, 94), (72, 94)])
                   + dots([(47, 43), (61, 41), (55, 59), (69, 59)], 2, '#fff', False),
    'fruit-kiwi': '<ellipse cx="44" cy="68" rx="22" ry="26" fill="#a8783a"/><circle cx="80" cy="74" r="24" fill="#8fd36a"/><circle cx="80" cy="74" r="8" fill="#f4f8d8" stroke="none"/>'
                  + dots([(80 + 14 * math.cos(a / 4), 74 + 14 * math.sin(a / 4)) for a in range(0, 25, 3)], 1.6, INK, False),
    'fruit-pear': '<path d="M26 80 A38 30 0 0 1 102 80Z" fill="#f4e9b8"/><path d="M26 80 A38 30 0 0 1 102 80" fill="none" stroke="#d9b85a" stroke-width="5"/><ellipse cx="64" cy="72" rx="10" ry="6" fill="#e8dca0" stroke="none"/>' + dots([(60, 72), (68, 72)], 2, '#8a5a34', False),
    'fruit-peach': '<path d="M26 82 A38 32 0 0 1 102 82Z" fill="#fff0e0"/><path d="M26 82 A38 32 0 0 1 102 82" fill="none" stroke="#ff9aa8" stroke-width="5"/><ellipse cx="64" cy="72" rx="11" ry="8" fill="#e8a888"/>',
    'fruit-persimmon': ''.join(f'<path d="M{x} 86 Q{x+2} 58 {x+16} 54 Q{x+30} 58 {x+32} 86Z" fill="#ff9a2e"/><path d="M{x+6} 84 Q{x+8} 64 {x+16} 62" fill="none" stroke="#ffd08a" stroke-width="3"/>' for x in (24, 48, 72)),
    'fruit-melon': '<path d="M22 84 Q64 30 106 84Z" fill="#b8e88a"/><path d="M22 84 Q64 30 106 84" fill="none" stroke="#5fae4a" stroke-width="6"/><path d="M34 84 Q64 50 94 84" fill="none" stroke="#e8f7c8" stroke-width="3"/>' + dots([(56, 74), (64, 70), (72, 74)], 1.6, '#e8d8a0', False),
    'fruit-watermelon': '<path d="M20 60 L108 60 L64 108Z" fill="#ff4d5e"/><path d="M20 60 L108 60" stroke="#4fae5c" stroke-width="10"/><path d="M24 64 L104 64" stroke="#e8f7c8" stroke-width="3"/>' + dots([(50, 74), (64, 80), (78, 74), (60, 92), (70, 92)], 2.4, INK, False),
    'fruit-pineapple': ''.join(f'<path d="M{x} 98 L{x+12} 52 L{x+24} 98Z" fill="#ffd84d"/><path d="M{x+4} 90 L{x+20} 90 M{x+7} 78 L{x+17} 78" stroke="#e8b52e" stroke-width="2"/>' for x in (26, 52, 78)) + '<path d="M60 46 l4 -14 l4 14Z" fill="#6cbf5a" stroke-width="2.5"/>',
    'fruit-grapefruit': '<circle cx="64" cy="70" r="32" fill="#ffd84d"/><circle cx="64" cy="70" r="26" fill="#ff8a7a"/>' + ''.join(f'<path d="M64 70 L{64 + 26 * math.cos(a * 3.1416 / 4):.1f} {70 + 26 * math.sin(a * 3.1416 / 4):.1f}" stroke="#fff4e0" stroke-width="2.5"/>' for a in range(8)),
    'fruit-cherry': ''.join(f'<path d="M{x} {y} Q{x+10} 40 64 30" fill="none" stroke="#5fae4a" stroke-width="3"/><circle cx="{x}" cy="{y}" r="11" fill="#e8253a"/><circle cx="{x-4}" cy="{y-4}" r="3" fill="#fff" stroke="none"/>' for x, y in [(44, 84), (64, 90), (84, 84)]) + '<path d="M64 30 q10 -10 20 -4 q-8 8 -20 4Z" fill="#6cbf5a" stroke-width="2.5"/>',
    'fruit-blueberry': '<path d="M26 66 Q28 104 64 104 Q100 104 102 66Z" fill="#fff"/>' + ''.join(f'<circle cx="{x}" cy="{y}" r="8" fill="#5a6ac8"/>' for x, y in [(40, 62), (54, 58), (68, 56), (82, 60), (48, 70), (62, 68), (76, 70), (88, 68)]) + dots([(54, 55), (68, 53)], 1.8, '#fff', False),
    'fruit-orange': '<circle cx="64" cy="70" r="32" fill="#ffa53c"/><circle cx="64" cy="70" r="26" fill="#ffc44d"/>' + ''.join(f'<path d="M64 70 L{64 + 26 * math.cos(a * 3.1416 / 4):.1f} {70 + 26 * math.sin(a * 3.1416 / 4):.1f}" stroke="#fff4e0" stroke-width="2.5"/>' for a in range(8)),
    'fruit-avocado': '<path d="M64 26 Q90 30 94 70 Q96 104 64 104 Q32 104 34 70 Q38 30 64 26Z" fill="#3d7a3a"/><path d="M64 34 Q84 38 86 70 Q88 96 64 96 Q40 96 42 70 Q44 38 64 34Z" fill="#d8ec9a" stroke="none"/><circle cx="64" cy="74" r="13" fill="#a8603a"/>',
}
for k, art in FRUIT.items():
    D[k] = ('snack', art)

SWEETS = {
    'sweets-dorayaki': '<ellipse cx="64" cy="84" rx="38" ry="12" fill="#c9862e"/><rect x="28" y="70" width="72" height="12" fill="#6b2e3a"/><ellipse cx="64" cy="66" rx="38" ry="14" fill="#d9984a"/><path d="M40 62 q10 -6 22 -6" fill="none" stroke="#f2c47a" stroke-width="3"/>',
    'sweets-imagawayaki': '<rect x="30" y="54" width="68" height="40" rx="10" fill="#f2c47a"/><ellipse cx="64" cy="56" rx="34" ry="10" fill="#e3a256"/><path d="M38 72 h52" stroke="#d9984a" stroke-width="3"/>',
    'sweets-manju': '<path d="M28 90 Q26 50 64 48 Q102 50 100 90Z" fill="#f2d4a0"/><path d="M28 90 H100" stroke-width="3"/><circle cx="64" cy="64" r="6" fill="#c9862e" stroke="none"/><path d="M40 70 q4 -10 12 -14" fill="none" stroke="#fff4dc" stroke-width="3"/>',
    'sweets-dango': '<path d="M30 102 L98 30" stroke="#d9b880" stroke-width="5"/>' + ''.join(f'<circle cx="{x}" cy="{y}" r="13" fill="#f6e8c8"/><path d="M{x-12} {y-4} a13 13 0 0 1 24 0Z" fill="#c9783a" stroke-width="2.5"/>' for x, y in [(46, 84), (64, 66), (82, 48)]),
    'sweets-kashiwamochi': '<path d="M24 92 Q20 50 64 44 Q108 50 104 92Z" fill="#6cbf5a"/><path d="M64 46 V92" stroke="#3d8a4a" stroke-width="2.5"/><path d="M36 92 Q36 64 64 62 Q92 64 92 92Z" fill="#fffdf6"/>',
    'sweets-sakuramochi': '<ellipse cx="64" cy="74" rx="34" ry="24" fill="#ffc4d6"/><path d="M30 74 Q40 40 82 48 Q98 60 96 82 Q70 66 30 74Z" fill="#8fbf6a"/><path d="M36 72 Q60 56 90 74" fill="none" stroke="#5f8f4a" stroke-width="2"/>',
    'sweets-yokan': '<path d="M32 60 L72 50 L98 62 L58 72Z" fill="#8a3a4a"/><path d="M32 60 V92 L58 104 V72Z" fill="#6b2e3a"/><path d="M58 72 V104 L98 94 V62Z" fill="#7a3242"/>',
    'sweets-castella': '<rect x="24" y="52" width="80" height="42" rx="4" fill="#ffd84d"/><rect x="24" y="52" width="80" height="10" rx="4" fill="#a8582e"/><rect x="24" y="86" width="80" height="8" rx="3" fill="#c9783a"/><path d="M36 72 h20" stroke="#fff4b0" stroke-width="3"/>',
    'sweets-senbei': ''.join(f'<circle cx="{x}" cy="{y}" r="22" fill="#d9984a"/><rect x="{x-14}" y="{y-6}" width="28" height="12" rx="2" fill="#2f4a3a"/>' for x, y in [(48, 62), (78, 82)]),
    'sweets-arare': '<path d="M26 66 Q28 104 64 104 Q100 104 102 66Z" fill="#fff"/>' + ''.join(f'<ellipse cx="{x}" cy="{y}" rx="7" ry="5" fill="{c}" transform="rotate({r} {x} {y})"/>' for x, y, c, r in [(40, 62, '#e3a256', 20), (52, 56, '#ffb3c6', -10), (64, 60, '#e3a256', 40), (76, 56, '#9bd36a', 0), (88, 62, '#e3a256', -30), (48, 68, '#fff', 10), (70, 68, '#ffb3c6', -20)]),
    'sweets-karinto': '<path d="M26 66 Q28 104 64 104 Q100 104 102 66Z" fill="#fff"/>' + ''.join(f'<rect x="{x}" y="{y}" width="24" height="9" rx="4.5" fill="#6b3a24" transform="rotate({r} {x+12} {y+4})"/>' for x, y, r in [(30, 56, 20), (50, 50, -15), (72, 54, 30), (40, 64, -5), (64, 62, 10)]),
    'sweets-cream-puff': '<path d="M26 86 Q24 58 48 54 Q56 40 72 46 Q96 46 100 70 Q104 90 80 92 H40 Q26 92 26 86Z" fill="#f2c47a"/><path d="M30 76 Q64 66 98 76 Q90 84 64 82 Q38 84 30 76Z" fill="#fff8d8"/>' + dots([(46, 60), (66, 52), (84, 60)], 1.6, '#d9984a', False),
    'sweets-cheesecake': '<path d="M24 62 L96 50 L104 66 V94 L32 104 L24 92Z" fill="#fff2c0"/><path d="M24 62 L104 66 V94 L24 90Z" fill="#ffe9a0"/><path d="M24 90 L104 94 V100 L24 98Z" fill="#c9862e"/><path d="M24 62 L104 66" fill="none" stroke="#e8b06a" stroke-width="5"/>',
    'sweets-apple-pie': '<path d="M24 62 L96 50 L104 66 V94 L24 92Z" fill="#e8a24a"/><path d="M24 70 L104 74 V88 L24 84Z" fill="#ffe07a"/><path d="M32 60 L88 52 M40 64 L96 56" stroke="#c9822e" stroke-width="3"/>',
    'sweets-pound-cake': '<rect x="30" y="44" width="68" height="56" rx="6" fill="#ffd77a"/><path d="M30 52 Q64 40 98 52 V58 H30Z" fill="#c9783a"/>' + dots([(46, 70), (66, 80), (82, 66), (54, 88)], 3, '#e8455a', False),
    'sweets-donut': '<circle cx="64" cy="70" r="32" fill="#e3a256"/><path d="M34 64 Q36 38 64 38 Q92 38 94 64 Q86 72 78 66 Q70 74 62 66 Q52 74 44 66 Q38 72 34 64Z" fill="#ff9fc0"/><circle cx="64" cy="70" r="10" fill="' + BG['snack'] + '"/>' + dots([(46, 52), (60, 46), (76, 50), (84, 58)], 1.8, '#fff', False),
    'sweets-hotcake': plate(cy=92, rx=46, ry=12) + '<ellipse cx="64" cy="82" rx="38" ry="11" fill="#c9783a"/><ellipse cx="64" cy="70" rx="38" ry="11" fill="#d9984a"/><ellipse cx="64" cy="66" rx="34" ry="8" fill="#e8b06a" stroke="none"/><rect x="56" y="58" width="16" height="10" rx="2" fill="#fff3a8"/><path d="M72 66 q8 4 6 14" fill="none" stroke="#c9783a" stroke-width="4"/>',
    'sweets-waffle': '<rect x="28" y="40" width="72" height="56" rx="12" fill="#f2b45a"/>' + ''.join(f'<path d="M{40 + i * 16} 44 V92 M32 {54 + i * 14} H96" stroke="#c9822e" stroke-width="3"/>' for i in range(3)),
    'sweets-biscuit': ''.join(f'<circle cx="{x}" cy="{y}" r="17" fill="#e8b06a"/>' + dots([(x - 6, y - 4), (x + 5, y - 6), (x, y + 6)], 2.6, '#6b3a24', False) for x, y in [(44, 70), (68, 60), (84, 82)]),
    'sweets-cracker': ''.join(f'<rect x="{30 + i * 10}" y="{44 + i * 8}" width="40" height="34" rx="4" fill="#f2c47a"/>' + dots([(40 + i * 10, 54 + i * 8), (60 + i * 10, 54 + i * 8), (50 + i * 10, 66 + i * 8)], 1.6, '#c9822e', False) for i in range(3)),
    'sweets-popcorn': ''.join(f'<circle cx="{x}" cy="{y}" r="10" fill="#fff8e0"/>' for x, y in [(44, 46), (58, 38), (72, 40), (86, 48), (52, 54), (68, 52), (80, 58)]) + '<path d="M34 58 L94 58 L86 108 H42Z" fill="#fff"/><path d="M44 58 L48 108 M64 58 V108 M84 58 L80 108" stroke="#ff6b5a" stroke-width="6"/>',
    'sweets-jelly': '<path d="M36 46 L44 104 H84 L92 46Z" fill="#fff" fill-opacity=".7"/><path d="M38 58 L44 104 H84 L90 58Z" fill="#ffb3c6" stroke="none"/><circle cx="56" cy="80" r="7" fill="#ffd84d"/><circle cx="72" cy="88" r="6" fill="#ff8a65"/><path d="M36 46 L44 104 H84 L92 46" fill="none"/>',
    'sweets-caramel': ''.join(f'<rect x="{x}" y="{y}" width="24" height="20" rx="4" fill="#e3a256"/><path d="M{x+4} {y+4} h8" stroke="#ffd08a" stroke-width="3"/>' for x, y in [(30, 64), (54, 56), (76, 70)]),
    'sweets-cheese': '<path d="M28 82 L96 54 L100 82Z" fill="#ffe07a"/><path d="M28 82 L100 82 V98 L28 98Z" fill="#ffd04d"/><circle cx="52" cy="90" r="4" fill="#f2b82e"/><circle cx="80" cy="88" r="3" fill="#f2b82e"/>',
    'sweets-peanuts': small_dish(''.join(f'<path d="M{x} {y} q-8 -10 2 -16 q10 -4 12 6 q4 10 -4 14 q-6 2 -10 -4Z" fill="#e8c08a" transform="rotate({r} {x} {y})"/>' for x, y, r in [(44, 82, 10), (60, 76, -20), (76, 82, 30), (86, 70, -10), (52, 66, 40)]), '#fff'),
    'sweets-yogurt-sweet': '<path d="M36 50 L44 104 H84 L92 50Z" fill="#fff"/><path d="M39 70 L42 86 H86 L89 70Z" fill="#ffb3c6" stroke="none"/><ellipse cx="64" cy="50" rx="28" ry="8" fill="#fffdf6"/><circle cx="58" cy="48" r="4" fill="#e8455a"/><circle cx="70" cy="49" r="3.5" fill="#5a6ac8"/>',
}
for k, art in SWEETS.items():
    D[k] = ('snack', art)

def yunomi(tea):
    return f'<path d="M38 46 L42 104 H86 L90 46Z" fill="#fff"/><path d="M40 70 L42 96 H86 L88 70Z" fill="#e8f0f8" stroke="none"/><ellipse cx="64" cy="46" rx="26" ry="7" fill="{tea}"/><path d="M38 46 L42 104 H86 L90 46" fill="none"/>'

def teacup(liquid, top=''):
    return ('<ellipse cx="64" cy="98" rx="44" ry="10" fill="#fff"/><path d="M92 66 Q110 66 108 78 Q106 88 90 86" fill="none" stroke-width="5"/>'
            f'<path d="M30 60 Q32 96 64 96 Q96 96 98 60Z" fill="#fff"/><ellipse cx="64" cy="60" rx="34" ry="9" fill="{liquid}"/>{top}')

def tall(fill, top=''):
    return glass(fill, top)

DRINKS = {
    'drink-green-tea': yunomi('#a8d86a'),
    'drink-barley-tea': tall('#d9984a', '<rect x="54" y="52" width="14" height="14" rx="3" fill="#fff" fill-opacity=".6" stroke-width="2.5"/>'),
    'drink-oolong': tall('#b8742e', '<rect x="60" y="56" width="14" height="14" rx="3" fill="#fff" fill-opacity=".6" stroke-width="2.5" transform="rotate(10 67 63)"/>'),
    'drink-black-tea': teacup('#c9562e', '<circle cx="74" cy="58" r="6" fill="#fff07a" stroke-width="2.5"/>'),
    'drink-coffee': teacup('#5e3020'),
    'drink-cafe-au-lait': teacup('#c9925a', '<path d="M54 58 q10 -6 20 0" fill="none" stroke="#fff4e0" stroke-width="3"/>'),
    'drink-cocoa': teacup('#8a4e2e', '<circle cx="56" cy="56" r="6" fill="#fff"/><circle cx="70" cy="58" r="5" fill="#ffd6e0"/>'),
    'drink-soy-milk': tall('#fbf3dc'),
    'drink-drink-yogurt': tall('#fff', '<path d="M44 44 H84" stroke="#ffb3c6" stroke-width="4"/>'),
    'drink-vegetable-juice': tall('#ff8a3c', '<rect x="60" y="14" width="6" height="40" rx="3" fill="#6cbf5a" transform="rotate(12 63 34)"/>'),
    'drink-tomato-juice': tall('#e8453a'),
    'drink-apple-juice': tall('#ffd04d', '<path d="M82 22 q8 -8 16 0 q4 12 -8 16 q-12 -4 -8 -16Z" fill="#ff5a5a"/>'),
    'drink-lactic': '<path d="M50 40 Q50 32 58 32 H70 Q78 32 78 40 V46 Q90 56 88 76 V96 Q88 104 80 104 H48 Q40 104 40 96 V76 Q38 56 50 46Z" fill="#fff4e8"/><rect x="48" y="26" width="32" height="8" rx="3" fill="#ff6b5a"/><rect x="42" y="64" width="44" height="18" fill="#ff9a8a" stroke="none"/>',
    'drink-sports-drink': '<rect x="40" y="36" width="48" height="70" rx="12" fill="#e8f4ff"/><rect x="52" y="22" width="24" height="14" rx="3" fill="#7fa8e8"/><rect x="40" y="58" width="48" height="24" fill="#7fa8e8" stroke="none"/><path d="M40 58 H88 M40 82 H88" stroke-width="2.5"/><path d="M50 46 v6" stroke="#fff" stroke-width="4"/>',
}
for k, art in DRINKS.items():
    D[k] = ('drink', art)

def rock(liquid, top=''):
    return (f'<path d="M34 54 L38 102 H90 L94 54Z" fill="{liquid}" stroke="none"/>'
            '<rect x="48" y="58" width="18" height="18" rx="3" fill="#fff" fill-opacity=".7" stroke-width="2.5" transform="rotate(10 57 67)"/>'
            '<rect x="64" y="66" width="18" height="18" rx="3" fill="#fff" fill-opacity=".7" stroke-width="2.5" transform="rotate(-12 73 75)"/>'
            f'{top}<path d="M32 40 L38 104 H90 L96 40Z" fill="none"/><path d="M36 100 H92" stroke-width="5"/>')

D['alcohol-white-wine'] = ('alcohol', D['red-wine'][1].replace('#b5304a', '#f7e48a').replace('#e0697f', '#fff8c8'))
D['alcohol-shochu'] = ('alcohol', rock('#f4f8fc'))
D['alcohol-umeshu'] = ('alcohol', rock('#f2c46a', '<circle cx="60" cy="90" r="8" fill="#b8c84a"/>'))
D['alcohol-shaoxing'] = ('alcohol', '<path d="M42 52 L46 104 H82 L86 52Z" fill="#c9782e" stroke="none"/><path d="M40 36 L46 104 H82 L88 36Z" fill="none"/><path d="M52 60 V92" stroke="#e8a85a" stroke-width="4"/>')

for k, top in {
    'onigiri-tuna-mayo': '<ellipse cx="64" cy="44" rx="9" ry="6" fill="#f2dcb0"/><path d="M58 42 q6 -4 12 0" fill="none" stroke="#fff" stroke-width="2.5"/>',
    'onigiri-konbu': '<path d="M56 46 q8 -10 16 0 q-8 6 -16 0Z" fill="#3a2a1e"/>',
    'onigiri-okaka': '<path d="M56 44 l6 -5 l3 6Z M66 42 l6 1 l-3 5Z M60 48 l6 -1 l-2 5Z" fill="#c98a5a" stroke-width="2"/>',
    'onigiri-tarako': '<ellipse cx="64" cy="44" rx="10" ry="5" fill="#ff8a7a"/>',
    'onigiri-mentaiko': '<ellipse cx="64" cy="44" rx="10" ry="5" fill="#e8453a"/>' + dots([(60, 44), (66, 43)], 1.2, '#ffd0c0', False),
    'onigiri-takana': '<path d="M56 46 q8 -12 16 0 q-8 6 -16 0Z" fill="#7a9a3a"/>',
}.items():
    D[k] = ('staple', onigiri(top))

def noodle_bowl(kind, top):
    if kind == 'udon':
        nd = ('<path d="M28 60 q12 6 24 0 t24 0 t24 0 M36 67 q12 6 24 0 t24 0" fill="none" stroke-width="8"/>'
              '<path d="M28 60 q12 6 24 0 t24 0 t24 0 M36 67 q12 6 24 0 t24 0" fill="none" stroke="#fffaf0" stroke-width="4"/>')
        color = '#7fa8e8'
    else:
        nd = ('<path d="M28 60 q12 6 24 0 t24 0 t24 0 M36 67 q12 6 24 0 t24 0" fill="none" stroke="#7d6a58" stroke-width="4"/>')
        color = '#b48ad0'
    return bowl(color, '#f5d99a' if kind == 'udon' else '#d9b070', rx=46, top=nd + top + negi([(46, 52), (40, 58)]))

NOODLE_TOP = {
    'kake': '<path d="M66 50 q8 -6 16 0 v4 h-16Z" fill="#ff9fb0" stroke-width="2.5"/>',
    'kitsune': '<path d="M58 44 L84 48 L80 66 L54 62Z" fill="#e8a24a"/><path d="M62 50 l16 3" stroke="#c9822e" stroke-width="2"/>',
    'tanuki': dots([(56, 50), (64, 46), (72, 52), (80, 48), (66, 56), (76, 58)], 3.5, '#f2c46a'),
    'tsukimi': '<ellipse cx="72" cy="54" rx="14" ry="8" fill="#fff"/><circle cx="72" cy="54" r="6" fill="#ffc22e"/>',
    'tempura': '<g transform="rotate(-20 72 52)"><rect x="52" y="46" width="40" height="13" rx="6.5" fill="#ffd77a"/><path d="M92 49 l8 -5 v12Z" fill="#ff5a5a" stroke-width="2.5"/></g>',
    'niku': '<path d="M56 50 q8 -8 16 -2 q8 -8 16 2 l-2 10 q-14 4 -30 0Z" fill="#a8603a"/>',
    'wakame': '<path d="M58 50 q6 -6 12 0 q-2 8 -12 0Z M72 46 q6 -6 12 0 q-2 8 -12 0Z M66 58 q6 -4 12 2 q-6 4 -12 -2Z" fill="#3d7a4a" stroke-width="2.5"/>',
}
for k in ['kitsune', 'tanuki', 'tsukimi', 'tempura', 'niku', 'wakame']:
    D[f'udon-{k}'] = ('noodle', noodle_bowl('udon', NOODLE_TOP[k]))
for k in ['kake', 'kitsune', 'tanuki', 'tsukimi', 'tempura']:
    D[f'soba-{k}'] = ('noodle', noodle_bowl('soba', NOODLE_TOP[k]))

def donburi(top, color='#7fa8e8'):
    return bowl(color, '#fff', mound=40, top=top)

DON = {
    'don-katsudon': '<path d="M28 60 q4 -16 20 -14 q10 -12 26 -6 q16 -4 22 10 q8 6 2 12 Q64 70 30 64Z" fill="#ffd94d"/>' + ''.join(f'<rect x="{40 + i * 12}" y="{44 + (i % 2) * 2}" width="12" height="16" rx="3" fill="#e8a24a"/>' for i in range(4)) + '<path d="M60 40 q6 -8 12 -2" fill="none" stroke="#4fae5c" stroke-width="3"/>',
    'don-tendon': '<path d="M30 60 Q64 70 98 60" fill="#8a4e2e"/>' + '<g transform="rotate(-30 56 46)"><rect x="36" y="40" width="40" height="13" rx="6.5" fill="#ffd77a"/><path d="M76 43 l8 -5 v12Z" fill="#ff5a5a" stroke-width="2.5"/></g>' + '<ellipse cx="80" cy="54" rx="11" ry="8" fill="#ffd77a"/><ellipse cx="80" cy="54" rx="6" ry="4" fill="#7a4a8a" stroke="none"/>',
    'don-tekka': ''.join(f'<rect x="{30 + i * 11}" y="{46 + (i % 2) * 3}" width="14" height="16" rx="3" fill="#e8455a" transform="rotate(-10 {37 + i * 11} 54)"/>' for i in range(6)) + '<path d="M60 40 q6 -8 12 0Z" fill="#a8d86a"/>',
    'don-salmon': ''.join(f'<rect x="{30 + i * 11}" y="{46 + (i % 2) * 3}" width="14" height="16" rx="3" fill="#ff8a5c" transform="rotate(-10 {37 + i * 11} 54)"/><path d="M{34 + i * 11} {50 + (i % 2) * 3} q3 4 1 10" fill="none" stroke="#ffd0bd" stroke-width="2"/>' for i in range(6)),
    'don-butadon': '<path d="M30 58 q10 -14 22 -8 q8 -10 20 -4 q12 -8 24 6 q4 6 -2 10 Q64 68 32 64Z" fill="#c9783a"/><path d="M44 54 q8 -4 14 2 M68 50 q8 -2 12 4" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3"/>' + negi([(60, 42), (66, 44)]),
    'don-chukadon': '<path d="M28 62 Q30 40 64 38 Q98 40 100 62Z" fill="#f6e7b8"/><path d="M38 54 q10 -10 22 -4 l-4 10Z" fill="#9bd36a" stroke-width="2.5"/><path d="M60 52 a7 7 0 1 1 9 5" fill="none" stroke="#ff8a65" stroke-width="4.5"/><circle cx="82" cy="52" r="6" fill="#fff"/><path d="M70 44 l10 -2 l-2 6Z" fill="#ff9a3c" stroke-width="2.5"/>',
    'don-mabodon': '<path d="M28 62 Q30 40 64 38 Q98 40 100 62Z" fill="#e0573a"/><rect x="40" y="46" width="12" height="12" rx="3" fill="#fff"/><rect x="60" y="42" width="12" height="12" rx="3" fill="#fff"/><rect x="76" y="50" width="12" height="12" rx="3" fill="#fff"/>' + negi([(54, 58), (70, 58)]),
    'don-tamago-kake': '<path d="M40 54 Q42 40 64 40 Q86 40 88 54 Q76 62 64 60 Q52 62 40 54Z" fill="#ffd94d"/><circle cx="64" cy="50" r="8" fill="#ffb02e"/><path d="M58 46 q4 -3 8 -1" fill="none" stroke="#fff" stroke-width="2.5"/>',
}
for k, top in DON.items():
    D[k] = ('bowl', donburi(top, '#b48ad0' if k in ('don-tamago-kake', 'don-tekka') else '#7fa8e8'))

def toast(top=''):
    return ('<path d="M28 100 V56 Q24 34 44 30 Q64 22 84 30 Q104 34 100 56 V100Z" fill="#e3a256"/>'
            f'<path d="M36 94 V58 Q34 42 48 38 Q64 32 80 38 Q94 42 92 58 V94Z" fill="#ffdc8a" stroke="none"/>{top}')

BREAD = {
    'bread-jam-toast': toast('<path d="M42 60 Q44 46 64 46 Q86 46 86 62 Q88 82 64 84 Q40 84 42 60Z" fill="#e8455a" stroke="none"/><path d="M50 56 q6 -4 12 -2" fill="none" stroke="#ff9aa8" stroke-width="3"/>'),
    'bread-honey-toast': toast('<path d="M44 58 q10 6 20 0 t20 0 M44 72 q10 6 20 0 t20 0" fill="none" stroke="#f2b82e" stroke-width="5"/><rect x="52" y="76" width="22" height="14" rx="3" fill="#fff3a8"/>'),
    'bread-cheese-toast': toast('<path d="M38 54 Q40 40 64 40 Q88 40 90 54 V86 Q76 92 64 86 Q52 92 38 86Z" fill="#ffd04d"/>' + dots([(50, 60), (74, 64), (60, 76)], 3, '#e8a82e', False)),
    'bread-plain-toast': toast(),
    'bread-france': '<rect x="14" y="56" width="100" height="30" rx="15" fill="#d9984a" transform="rotate(-18 64 71)"/>' + ''.join(f'<path d="M{34 + i * 18} 70 q6 -8 14 -10" fill="none" stroke="#ffdc8a" stroke-width="4" transform="rotate(-18 64 71)"/>' for i in range(4)),
    'bread-bagel': '<circle cx="64" cy="70" r="32" fill="#d9984a"/><circle cx="64" cy="70" r="11" fill="' + BG['bread'] + '"/><path d="M42 58 q8 -14 22 -16" fill="none" stroke="#f2c47a" stroke-width="4"/>' + dots([(78, 50), (86, 64), (50, 86)], 1.6, '#fff', False),
    'bread-naan': '<path d="M34 100 Q20 60 44 36 Q60 24 76 38 Q106 66 94 96 Q84 110 60 108 Q42 108 34 100Z" fill="#f6dcae"/>' + dots([(50, 50), (66, 60), (56, 76), (78, 82), (70, 96), (46, 90)], 4, '#d9984a', False),
    'bread-anpan': '<path d="M26 88 Q24 48 64 46 Q104 48 102 88Z" fill="#c9782e"/><path d="M26 88 H102" stroke-width="3"/><circle cx="64" cy="58" r="5" fill="#fff8e0" stroke="none"/>' + dots([(48, 64), (80, 66), (56, 74), (74, 76)], 1.4, '#fff8e0', False),
    'bread-cream-pan': '<path d="M24 88 Q22 60 40 56 Q42 44 54 46 Q60 38 70 44 Q80 40 86 50 Q102 54 104 70 Q106 88 92 92 H36 Q24 92 24 88Z" fill="#e8a24a"/><path d="M48 52 V80 M64 46 V80 M80 50 V80" stroke="#c9822e" stroke-width="2.5"/>',
    'bread-melon-pan': '<path d="M24 86 Q22 42 64 40 Q106 42 104 86Z" fill="#ffd77a"/><path d="M24 86 H104" stroke-width="3"/>' + ''.join(f'<path d="M{36 + i * 14} 48 L{56 + i * 14} 84 M{92 - i * 14} 48 L{72 - i * 14} 84" stroke="#e8b052" stroke-width="2.5"/>' for i in range(3)),
    'bread-curry-pan': '<ellipse cx="64" cy="72" rx="40" ry="26" fill="#d9822e"/>' + dots([(40, 64), (52, 56), (66, 52), (80, 58), (88, 70), (46, 80), (62, 86), (80, 82), (64, 70)], 2.2, '#f2b45a', False),
    'bread-jam-pan': '<path d="M26 88 Q24 48 64 46 Q104 48 102 88Z" fill="#e3a256"/><path d="M26 88 H102" stroke-width="3"/><path d="M50 68 q14 -10 28 0" fill="none" stroke="#e8455a" stroke-width="6"/>',
}
for k, art in BREAD.items():
    D[k] = ('bread', art)

CLOCHE = ('<ellipse cx="64" cy="88" rx="46" ry="12" fill="#fff"/>'
          '<path d="M26 84 Q26 44 64 44 Q102 44 102 84Z" fill="#fff4dc"/>'
          '<circle cx="64" cy="38" r="6" fill="#ff8a65"/><path d="M40 70 Q42 56 56 52" fill="none" stroke="#fff" stroke-width="4"/>')
FALLBACK = {f'category/{c}': (c, CLOCHE) for c in BG}

# ---- ジャンル別の共通の絵（郷土料理など、1品ずつの絵がない料理に使う。scripts/lib/illustration-genre.ts と対応） ----
def donabe(top):
    return ('<path d="M10 70 q-6 -2 -4 6 q2 6 10 4 M118 70 q6 -2 4 6 q-2 6 -10 4" fill="#c97a4a"/>'
            '<path d="M14 70 Q16 106 64 106 Q112 106 114 70Z" fill="#c97a4a"/><path d="M24 86 q40 12 80 0" fill="none" stroke="#e8a878" stroke-width="3"/>'
            f'<ellipse cx="64" cy="70" rx="50" ry="16" fill="#f5d99a"/>{top}')

def kushi(x, balls):
    out = f'<path d="M{x} 24 L{x} 108" stroke="#d9b07a" stroke-width="4"/>'
    for i, c in enumerate(balls):
        out += f'<circle cx="{x}" cy="{40 + i * 22}" r="12" fill="{c}"/>'
    return out

def hosomaki(x, y, inner):
    return (f'<rect x="{x-12}" y="{y-12}" width="24" height="24" rx="10" fill="#2f4a3a"/><circle cx="{x}" cy="{y}" r="8" fill="#fff" stroke="none"/>'
            f'<circle cx="{x}" cy="{y}" r="3.5" fill="{inner}" stroke="none"/>')

def nigiri(x, y, fish, band=''):
    return (f'<rect x="{x-14}" y="{y}" width="28" height="14" rx="6" fill="#fff"/>'
            f'<path d="M{x-17} {y+4} Q{x-16} {y-8} {x} {y-8} Q{x+16} {y-8} {x+17} {y+4} Q{x} {y+2} {x-17} {y+4}Z" fill="{fish}"/>{band}')

GENRE = {
    'zoni': ('soup', bowl('#e0573a', '#fff1d6', rx=46,
        top='<rect x="44" y="50" width="22" height="16" rx="4" fill="#fff"/><path d="M70 58 q8 -10 18 -2 q-8 8 -18 2Z" fill="#ff9fb0" stroke-width="2.5"/>'
            '<circle cx="80" cy="66" r="5" fill="#ff9a3c" stroke-width="2.5"/><path d="M34 60 q6 -6 12 0 q-6 4 -12 0Z" fill="#4fae5c" stroke-width="2.5"/>')),
    'nabe': ('main', donabe('<rect x="30" y="62" width="16" height="12" rx="2" fill="#fff"/><path d="M50 72 l18 -10" stroke="#9bd36a" stroke-width="6"/>'
        '<path d="M64 60 a9 6 0 0 1 18 0Z" fill="#8a5a34"/><circle cx="90" cy="70" r="6" fill="#ff9a3c" stroke-width="2.5"/>'
        '<path d="M68 74 q8 -6 16 2 q-8 6 -16 -2Z" fill="#4fae5c" stroke-width="2.5"/><path d="M36 76 q6 -4 12 0" fill="none" stroke="#fff" stroke-width="3"/>')),
    'kayu': ('staple', bowl('#cfe6fa', '#fffaf0', rx=44,
        top=dots([(46, 60), (56, 56), (72, 58), (82, 62), (62, 64)], 1.8, '#e8dcc4', False) + '<circle cx="64" cy="56" r="6" fill="#e8455a"/>'
            + '<path d="M58 34 q-4 -6 0 -12 M70 34 q-4 -6 0 -12" fill="none" stroke="#fff" stroke-width="3"/>')),
    'soba': ('noodle', noodle_bowl('soba', NOODLE_TOP['kake'])),
    'udon': ('noodle', noodle_bowl('udon', NOODLE_TOP['kake'])),
    'somen': ('noodle', '<path d="M18 64 Q20 104 64 104 Q108 104 110 64Z" fill="#d7f0ff"/><ellipse cx="64" cy="64" rx="46" ry="14" fill="#eaf8ff"/>'
        '<path d="M30 64 q10 -8 20 0 t20 0 t20 0 t10 0 M36 70 q10 -6 20 0 t20 0 t18 0" fill="none" stroke="#fffdf6" stroke-width="4"/>'
        '<path d="M30 64 q10 -8 20 0 t20 0 t20 0 t10 0 M36 70 q10 -6 20 0 t20 0 t18 0" fill="none" stroke-width="1.5"/>'
        '<path d="M44 60 q8 -4 14 0" fill="none" stroke="#ff8aa0" stroke-width="3"/><path d="M70 62 q8 -4 14 0" fill="none" stroke="#7cc98a" stroke-width="3"/>'
        '<rect x="80" y="50" width="12" height="12" rx="3" fill="#fff" fill-opacity=".8" stroke-width="2.5" transform="rotate(12 86 56)"/>'),
    'jiru': ('soup', miso('<circle cx="44" cy="58" r="6" fill="#fff4dc"/><path d="M54 52 l10 -2 l-2 10Z" fill="#ff9a3c"/>'
        '<rect x="66" y="52" width="12" height="10" rx="2" fill="#9a9a9a"/><circle cx="82" cy="62" r="6" fill="#fff"/><path d="M58 64 l10 0" stroke="#8a5a34" stroke-width="4"/>',
        surface='#dd9a4e')),
    'sushi': ('staple', '<rect x="14" y="76" width="100" height="24" rx="5" fill="#e3c98a"/><path d="M24 100 v6 M104 100 v6" stroke-width="6"/>'
        + nigiri(36, 64, '#ff8a73') + nigiri(64, 64, '#ffd94d', '<path d="M60 56 v18" stroke="#2f4a3a" stroke-width="5"/>') + hosomaki(94, 70, '#7cc98a')),
    'onigiri': ('staple', onigiri('')),
    'don': ('bowl', donburi(DON['don-katsudon'])),
    'gohan': ('staple', bowl('#ff8a65', '#e8c27a', mound=34,
        top=''.join(f'<path d="M{x} {y} l8 -3" stroke="{c}" stroke-width="4"/>' for x, y, c in
                    [(46, 54, '#ff9a3c'), (62, 46, '#8a5a34'), (74, 54, '#ff9a3c'), (54, 58, '#8a5a34')])
            + dots([(68, 42), (84, 58)], 3, '#7cc98a'))),
    'curry': D['curry-rice'],
    'gyoza': D['gyoza'],
    'dango': ('snack', plate(cy=96, rx=48, ry=12) + '<g transform="rotate(-18 50 66)">' + kushi(50, ['#ffb0c4', '#fff', '#a8d86a']) + '</g>'
        + '<g transform="rotate(14 80 66)">' + kushi(80, ['#d9984a', '#d9984a', '#d9984a'])
        + '<path d="M70 34 q10 6 20 0 M70 56 q10 6 20 0 M70 78 q10 6 20 0" fill="none" stroke="#a8602e" stroke-width="3"/></g>'),
    'manju': ('snack', plate(cy=88) + '<path d="M22 88 Q22 58 46 58 Q70 58 70 88Z" fill="#fff8ec"/>'
        '<path d="M58 88 Q58 54 82 54 Q106 54 106 88Z" fill="#c9823e"/><circle cx="82" cy="68" r="5" fill="#8a4a2e" stroke="none"/>'
        '<path d="M34 44 q-4 -6 0 -12 M46 40 q-4 -6 0 -12" fill="none" stroke="#fff" stroke-width="3"/>'),
    'mochi': ('snack', plate(cy=88) + '<ellipse cx="40" cy="78" rx="18" ry="14" fill="#fff"/><ellipse cx="66" cy="72" rx="18" ry="14" fill="#8fc46a"/>'
        '<ellipse cx="90" cy="80" rx="18" ry="14" fill="#8a4a3e"/>' + dots([(84, 76), (94, 74), (90, 84)], 1.6, '#c98a7a', False)
        + '<path d="M58 66 q6 -4 12 -2" fill="none" stroke="#c9eba0" stroke-width="3"/>'),
    'yokan': ('snack', small_dish('<path d="M26 82 L36 50 H70 L60 82Z" fill="#8a4a5e"/><path d="M70 50 L80 58 L70 90 L60 82Z" fill="#6b3446"/>'
        '<path d="M60 82 L70 90 H32 L26 82Z" fill="#a8606e"/><path d="M80 82 L88 62 H106 L98 82Z" fill="#8a4a5e"/>'
        '<path d="M42 58 l12 0" stroke="#c98aa0" stroke-width="3"/>', '#d6f2dc')),
    'okashi': ('snack', '<path d="M18 84 L60 58 L110 80 L66 106Z" fill="#fffdf6" stroke-width="2.5"/>'
        '<circle cx="48" cy="72" r="20" fill="#d9984a"/><path d="M34 70 h28" stroke="#3d5a4a" stroke-width="7"/>' + dots([(42, 82), (56, 62)], 1.6, '#a8602e', False)
        + '<path d="M80 62 q8 -8 14 0 q8 2 4 10 q4 8 -6 10 q-4 8 -12 2 q-10 2 -8 -8 q-6 -8 8 -14Z" fill="#ffc0d0"/><circle cx="86" cy="72" r="3.5" fill="#ffe07a" stroke-width="2"/>'),
    'tsukemono': ('side', small_dish('<g transform="rotate(-10 44 72)"><rect x="30" y="60" width="28" height="10" rx="3" fill="#ffe14d"/><rect x="34" y="70" width="28" height="10" rx="3" fill="#ffd21f"/></g>'
        + dots([(70, 72), (82, 70)], 8, '#9bd36a') + dots([(70, 72), (82, 70)], 4, '#e8f7c8', False)
        + '<path d="M84 84 q8 -10 16 -2 q-6 8 -16 2Z M66 86 q8 -8 16 -2 q-8 8 -16 2Z" fill="#8a4a8e"/>', '#fff4dc')),
    'sashimi': D['sashimi'] if 'sashimi' in D else ('main', sashimi_set(slices('#ff8a73'))),
    'aemono': ('side', kobachi('<path d="M38 66 Q40 46 64 46 Q88 46 90 66Z" fill="#4fae5c"/><path d="M44 62 Q48 50 64 50 Q80 50 84 62Z" fill="#f2dcae" stroke-width="2.5"/>'
        + dots([(56, 54), (66, 52), (74, 56)], 1.6, INK, False) + '<path d="M50 58 l6 -4 M72 58 l6 -4" stroke="#ff9a3c" stroke-width="3"/>')),
    'nimono': ('main', bowl('#e0573a', '#d9a45a', rx=46,
        top='<circle cx="44" cy="58" r="8" fill="#fff4dc"/><path d="M60 50 a10 7 0 0 1 20 0Z" fill="#8a5a34"/><path d="M60 50 h20" stroke-width="2.5"/>'
            '<path d="M70 66 l3 -6 l4 4 l5 -2 l-1 6 l4 4 l-6 2 l-1 5 l-4 -4 l-5 2 l1 -6 l-4 -3Z" fill="#ff9a3c" stroke-width="2"/>'
            '<rect x="82" y="56" width="10" height="10" rx="2" fill="#9a9a9a" transform="rotate(20 87 61)"/>'
            '<path d="M48 70 q6 -8 14 -4 q-6 8 -14 4Z" fill="#7cc98a" stroke-width="2.5"/>')),
    'agemono': ('main', tempura_paper() + batter(54, 66, 44, 18, -20) + batter(74, 78, 40, 18, -6)
        + '<path d="M88 56 q10 -4 14 6 q-8 4 -14 -6Z" fill="#6cbf5a" stroke-width="2.5"/>'),
    'tofu': ('side', small_dish('<path d="M38 62 L64 52 L90 62 V80 L64 90 L38 80Z" fill="#fff"/><path d="M38 62 L64 72 L90 62 M64 72 V90" fill="none" stroke-width="2.5"/>'
        + negi([(56, 60), (68, 58)]) + '<circle cx="62" cy="64" r="4" fill="#ffc06a" stroke-width="2"/>', '#7aa8e0')),
    'tamago': ('main', bowl('#fff', '#d9a45a', rx=44,
        top='<path d="M28 62 q8 -12 18 -6 q8 -10 18 -2 q10 -8 18 2 q10 -4 14 6 q-6 8 -16 4 q-8 6 -16 0 q-10 6 -18 0 q-12 4 -18 -4Z" fill="#ffd94d"/>'
            '<path d="M40 58 q6 -4 12 0 M66 56 q6 -4 12 0" fill="none" stroke="#fff6c8" stroke-width="3"/>'
            '<path d="M60 48 q4 -8 10 -4 M64 46 l-2 -6" fill="none" stroke="#4fae5c" stroke-width="3"/>')),
    'fish': ('main', long_plate() + whole_fish('#9fb8d4', '#e8f0f8') + oroshi()),
    'meat': ('main', plate() + '<rect x="30" y="58" width="24" height="22" rx="6" fill="#a8582e"/><rect x="56" y="54" width="24" height="22" rx="6" fill="#b8683a"/>'
        '<rect x="42" y="72" width="24" height="20" rx="6" fill="#9a4e28"/><path d="M34 64 h16 M60 60 h16 M46 78 h16" stroke="#e8b088" stroke-width="3"/>'
        + garnish()),
    'yaki': ('main', plate() + '<ellipse cx="62" cy="74" rx="38" ry="18" fill="#d9984a"/><ellipse cx="62" cy="70" rx="32" ry="13" fill="#7a3a22"/>'
        '<path d="M38 70 q6 -6 12 0 t12 0 t12 0 t12 0" fill="none" stroke="#fff" stroke-width="3"/>' + dots([(48, 64), (60, 74), (74, 64), (82, 72)], 1.8, '#6cbf5a', False)
        + '<path d="M56 58 q4 -4 8 0 M68 60 q4 -4 8 0" fill="none" stroke="#ffb0a0" stroke-width="3"/>'),
}

# ---- 郷土料理の代表（料理名ごとに1枚。同じ名前の料理はどの都道府県も同じ絵） ----
def pot(color, surface, top, rx=50):
    """浅い鉄鍋・平鍋"""
    return (f'<path d="M{64-rx-8} 66 h10 M{64+rx-2} 66 h10" stroke-width="6"/>'
            f'<path d="M{64-rx} 64 Q{64-rx+2} 96 64 98 Q{64+rx-2} 96 {64+rx} 64Z" fill="{color}"/>'
            f'<ellipse cx="64" cy="64" rx="{rx}" ry="16" fill="{surface}"/>{top}')

def leaf(x, y, w, h, rot, fill='#6cbf5a', vein='#3d8a4a'):
    return (f'<g transform="rotate({rot} {x} {y})"><path d="M{x-w/2} {y} Q{x} {y-h} {x+w/2} {y} Q{x} {y+h} {x-w/2} {y}Z" fill="{fill}"/>'
            f'<path d="M{x-w/2+4} {y} H{x+w/2-4}" stroke="{vein}" stroke-width="2"/></g>')

def ring(x, y, r, fill, hole):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"/><circle cx="{x}" cy="{y}" r="{r/2.4}" fill="{hole}" stroke-width="2"/>'

def lotus(x, y):
    return f'<circle cx="{x}" cy="{y}" r="9" fill="#fff4dc"/>' + dots([(x - 4, y - 3), (x + 4, y - 3), (x, y + 4)], 2, '#e8d8b8', False)

def flower_carrot(x, y, r=6):
    pts = ' '.join(f'{x + (r if i % 2 == 0 else r * 0.6) * math.cos(i * math.pi / 5):.1f},{y + (r if i % 2 == 0 else r * 0.6) * math.sin(i * math.pi / 5):.1f}' for i in range(10))
    return f'<polygon points="{pts}" fill="#ff9a3c" stroke-width="2"/>'

def shiitake(x, y):
    return f'<path d="M{x-9} {y} a9 6 0 0 1 18 0Z" fill="#8a5a34"/><path d="M{x-4} {y-3} l8 0 M{x} {y-6} v6" stroke="#e8c8a0" stroke-width="2"/>'

def chikuwa(x, y, rot=0):
    return (f'<g transform="rotate({rot} {x} {y})"><rect x="{x-14}" y="{y-6}" width="28" height="12" rx="6" fill="#e8a24a"/>'
            f'<ellipse cx="{x-12}" cy="{y}" rx="3" ry="5" fill="#fff4dc" stroke-width="2"/></g>')

def mochi_round(x, y, fill, r=12):
    return f'<ellipse cx="{x}" cy="{y}" rx="{r+2}" ry="{r}" fill="{fill}"/>'

def kama(x, y, w=18):
    return f'<path d="M{x-w/2} {y+5} Q{x} {y-9} {x+w/2} {y+5}Z" fill="#fff"/><path d="M{x-w/2} {y+5} Q{x} {y-9} {x+w/2} {y+5}" fill="none" stroke="#ff8aa0" stroke-width="3"/>'

def thick_noodles(color, stroke=INK, w=9):
    return (f'<path d="M28 60 q12 6 24 0 t24 0 t24 0 M36 67 q12 6 24 0 t24 0" fill="none" stroke="{stroke}" stroke-width="{w}"/>'
            f'<path d="M28 60 q12 6 24 0 t24 0 t24 0 M36 67 q12 6 24 0 t24 0" fill="none" stroke="{color}" stroke-width="{w-4}"/>')

def flat_noodles(color):
    return ''.join(f'<path d="M{x} {y} q10 4 20 0" fill="none" stroke="{INK}" stroke-width="9"/><path d="M{x} {y} q10 4 20 0" fill="none" stroke="{color}" stroke-width="5"/>'
                   for x, y in [(30, 60), (52, 64), (74, 60), (40, 70), (64, 70)])

def skewer_stick(x1, y1, x2, y2):
    return f'<path d="M{x1} {y1} L{x2} {y2}" stroke="#d9b07a" stroke-width="4"/>'

def wood_tray(x=14, y=60, w=100, h=40, fill='#e3c98a'):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{fill}"/>'

K = {}
# 北海道・東北
K['ジンギスカン'] = ('main', '<path d="M14 84 Q20 50 64 46 Q108 50 114 84Z" fill="#8a8f98"/>'
    + ''.join(f'<path d="M{24 + i * 16} 80 Q{30 + i * 16} 60 {40 + i * 12} 54" fill="none" stroke="#6b7078" stroke-width="2.5"/>' for i in range(5))
    + '<path d="M40 62 q10 -8 22 -2 l-4 10 q-10 2 -18 -8Z M66 56 q12 -6 22 2 l-6 10 q-10 0 -16 -12Z" fill="#a8582e"/>'
    + '<path d="M24 80 q14 -12 26 -2 q-12 8 -26 2Z M78 80 q14 -12 26 -2 q-12 8 -26 2Z" fill="#c9eba0"/>'
    + '<path d="M50 74 l20 -4 M56 80 l18 -2" stroke="#fffaf0" stroke-width="3"/><circle cx="86" cy="68" r="6" fill="#fff" stroke-width="2.5"/>')
K['石狩鍋'] = ('soup', donabe('<rect x="30" y="60" width="18" height="12" rx="3" fill="#ff8a5c"/><path d="M34 64 h10" stroke="#fff" stroke-width="2"/>'
    '<rect x="72" y="62" width="18" height="12" rx="3" fill="#ff8a5c"/><path d="M76 66 h10" stroke="#fff" stroke-width="2"/>'
    '<rect x="52" y="58" width="16" height="12" rx="2" fill="#fff"/><path d="M48 76 q10 -8 20 0 q-10 6 -20 0Z" fill="#c9eba0" stroke-width="2.5"/>' + negi([(92, 72), (60, 76)])).replace('#f5d99a', '#e6ad5c'))
K['いかめし'] = ('staple', long_plate() + ''.join(
    f'<g transform="rotate({r} {x} 82)"><path d="M{x-34} 82 Q{x-30} 70 {x} 72 Q{x+24} 72 {x+30} 82 Q{x+24} 92 {x} 92 Q{x-30} 94 {x-34} 82Z" fill="#c9783a"/>'
    f'<path d="M{x+30} 82 l8 -8 v16Z" fill="#c9783a"/><ellipse cx="{x-6}" cy="82" rx="8" ry="6" fill="#fff"/>'
    + dots([(x - 8, 80), (x - 4, 84)], 1.4, '#e8d8b8', False) + f'<path d="M{x+8} 76 q6 6 0 12 M{x+16} 76 q6 6 0 12" fill="none" stroke="#8a4a2e" stroke-width="2.5"/></g>'
    for x, r in [(52, -8), (70, 6)]))
K['べこ餅'] = ('snack', plate(cy=88) + '<path d="M28 82 Q30 60 50 58 Q70 56 70 70 Q60 70 56 82 Q44 92 28 82Z" fill="#fff8ec"/>'
    '<path d="M56 82 Q60 70 70 70 Q70 56 82 56 Q102 58 100 80 Q90 92 56 82Z" fill="#a8683a"/><path d="M64 72 q6 -4 10 -2" fill="none" stroke="#d9a070" stroke-width="2.5"/>'
    '<path d="M38 70 q6 -6 12 -6" fill="none" stroke="#e8dcc4" stroke-width="2.5"/>')
K['せんべい汁'] = ('soup', bowl('#f08a6e', '#d39348', rx=46,
    top='<path d="M34 62 L48 48 L56 64Z" fill="#f2dcae"/><path d="M60 50 L80 46 L74 62Z" fill="#f2dcae"/><path d="M78 62 L96 56 L90 70Z" fill="#f2dcae"/>'
        + shiitake(60, 68) + '<rect x="40" y="64" width="10" height="8" rx="2" fill="#f2c6a0"/>' + negi([(70, 60), (86, 50)])))
K['いちご煮'] = ('soup', bowl('#e0573a', '#fff1d6', rx=46,
    top=dots([(44, 58), (52, 54), (48, 64), (58, 62), (66, 56), (74, 60)], 5, '#ffa836') + '<ellipse cx="84" cy="60" rx="9" ry="5" fill="#fff4dc"/>'
        + leaf(68, 66, 18, 7, -10, '#4fae5c')))
K['ひっつみ'] = ('soup', bowl('#f08a6e', '#d39348', rx=46,
    top='<path d="M34 58 q6 -10 16 -6 q4 8 -4 12 q-8 2 -12 -6Z M58 52 q8 -6 16 0 q0 10 -10 10 q-8 -2 -6 -10Z M76 60 q8 -8 16 0 q-2 8 -10 8 q-8 0 -6 -8Z" fill="#fff4dc"/>'
        '<path d="M50 66 l10 -2 l-2 6Z" fill="#ff9a3c"/>' + shiitake(70, 70) + negi([(56, 48), (90, 52), (42, 68)])))
K['ずんだ餅'] = ('snack', plate(cy=88) + ''.join(f'<ellipse cx="{x}" cy="{y}" rx="16" ry="12" fill="#a8dc6a"/>' + dots([(x - 6, y - 2), (x + 4, y - 4), (x + 2, y + 4)], 2, '#7cba4a', False)
    for x, y in [(42, 78), (66, 70), (88, 80)]))
K['はらこ飯'] = ('staple', bowl('#7fa8e8', '#e8c27a', mound=36,
    top='<path d="M36 56 q8 -12 22 -8 l-2 10 q-12 4 -20 -2Z M64 46 q10 -8 22 0 l-4 10 q-12 0 -18 -10Z" fill="#ff8a5c"/><path d="M42 54 q6 -3 12 -2 M70 50 q6 -2 12 2" fill="none" stroke="#fff" stroke-width="2"/>'
        + dots([(56, 60), (62, 56), (68, 60), (74, 56), (80, 62), (50, 62), (62, 64)], 3.5, '#ff4a3a', True)))
K['笹かまぼこの磯部揚げ'] = ('main', tempura_paper() + ''.join(
    f'<g transform="rotate({r} {x} {y})"><path d="M{x-22} {y} Q{x-10} {y-12} {x+20} {y-4} Q{x+12} {y+10} {x-22} {y}Z" fill="#ffd77a"/>' + dots([(x - 8, y - 2), (x + 4, y - 4), (x + 8, y + 2)], 1.8, '#3d8a4a', False) + '</g>'
    for x, y, r in [(58, 66, -14), (70, 80, -4)]))
K['きりたんぽ鍋'] = ('soup', donabe(''.join(f'<g transform="rotate({r} {x} {y})"><rect x="{x-16}" y="{y-5}" width="32" height="10" rx="5" fill="#f2d9a0"/><path d="M{x-6} {y-5} v10 M{x+6} {y-5} v10" stroke="#c9944a" stroke-width="2.5"/></g>'
    for x, y, r in [(46, 64, -20), (76, 62, 18)]) + '<path d="M40 74 q10 -6 18 2 M58 74 l6 -12 M66 74 l4 -12" fill="none" stroke="#4fae5c" stroke-width="3"/>' + shiitake(84, 76) + negi([(30, 70), (98, 70)])))
K['しょっつる鍋'] = ('soup', donabe(whole_fish('#c9d4e0', '#f4f2ea', length=40, height=10, cx=52, cy=66)
    + '<rect x="76" y="60" width="16" height="12" rx="2" fill="#fff"/><path d="M38 76 q10 -6 20 0 q-10 6 -20 0Z" fill="#c9eba0" stroke-width="2.5"/>' + negi([(70, 76), (84, 76)])).replace('#f5d99a', '#f2e2b8'))
K['玉こんにゃく'] = ('side', plate(cy=92, rx=46, ry=12) + skewer_stick(28, 104, 98, 30)
    + ''.join(f'<circle cx="{x}" cy="{y}" r="12" fill="#7a5a48"/><path d="M{x-6} {y-6} q4 -3 8 -2" fill="none" stroke="#b8988a" stroke-width="2.5"/>' for x, y in [(44, 86), (62, 68), (80, 50)])
    + '<path d="M90 82 q6 -6 12 0 q-6 4 -12 0Z" fill="#ffd21f" stroke-width="2.5"/>')
K['こづゆ'] = ('soup', '<ellipse cx="64" cy="94" rx="40" ry="8" fill="#c9432e"/><path d="M14 66 Q18 94 64 94 Q110 94 114 66Z" fill="#e0573a"/><ellipse cx="64" cy="66" rx="50" ry="14" fill="#fff1d6"/>'
    + ''.join(f'<rect x="{x}" y="{y}" width="9" height="9" rx="2" fill="{c}" stroke-width="2"/>' for x, y, c in [(30, 62, '#ff9a3c'), (48, 58, '#8a5a34'), (66, 62, '#fff4dc'), (84, 58, '#ff9a3c'), (56, 68, '#5a4a40')])
    + ring(42, 70, 4, '#fff8e0', '#f2d9a0') + ring(78, 70, 4, '#fff8e0', '#f2d9a0') + negi([(96, 64)]))
K['しもつかれ'] = ('main', small_dish('<path d="M30 80 Q30 58 50 58 Q58 52 70 56 Q94 56 98 80Z" fill="#f2c6a0"/>'
    + ''.join(f'<path d="M{x} {y} l6 -3" stroke="{c}" stroke-width="3"/>' for x, y, c in [(40, 70, '#ff9a3c'), (54, 64, '#fff'), (70, 66, '#ff9a3c'), (82, 72, '#fff'), (62, 74, '#ff9a3c')])
    + dots([(48, 76), (76, 62), (88, 68)], 4, '#c9432e') + '<path d="M58 60 q6 -4 10 0 q-4 4 -10 0Z" fill="#ff8a5c" stroke-width="2"/>', '#fff4dc'))
K['おきりこみ'] = ('noodle', bowl('#7fa8e8', '#d39348', rx=46,
    top=flat_noodles('#fff4dc') + '<path d="M70 50 q10 -10 18 2 l-6 8Z" fill="#ffb84a"/><path d="M70 50 q10 -10 18 2" fill="none" stroke="#4fae5c" stroke-width="3"/>'
        '<path d="M40 50 l10 -2 l-2 8Z" fill="#ff9a3c"/>' + negi([(58, 50), (92, 64)])))
K['冷や汁'] = ('soup', bowl('#cfe6fa', '#f2d9a0', rx=46,
    top=''.join(f'<circle cx="{x}" cy="{y}" r="6" fill="#c9eba0"/><circle cx="{x}" cy="{y}" r="2" fill="#7cba4a" stroke="none"/>' for x, y in [(42, 58), (56, 54), (70, 60), (84, 56)])
        + leaf(56, 66, 18, 6, 8, '#3d8a4a', '#2f6a3a') + '<rect x="74" y="62" width="12" height="10" rx="3" fill="#fff" fill-opacity=".8" stroke-width="2.5"/>'
        + dots([(48, 64), (64, 64), (90, 62)], 1.4, INK, False)))
# 関東
K['にぎりずし'] = ('staple', '<rect x="12" y="76" width="104" height="24" rx="5" fill="#e3c98a"/><path d="M22 100 v6 M106 100 v6" stroke-width="6"/>'
    + nigiri(32, 64, '#e8455a') + nigiri(64, 64, '#fff4ec', '<path d="M52 58 h24 M54 62 h20" stroke="#ff8a5c" stroke-width="2.5"/>')
    + nigiri(96, 64, '#f6f2ea', '<path d="M88 60 l4 -4 m4 4 l4 -4" stroke="#c9c2b8" stroke-width="2"/>'))
K['ちゃんこ鍋'] = ('soup', donabe(dots([(36, 64), (48, 60)], 7, '#d9a878') + '<path d="M58 60 q12 -12 26 -2 q-12 10 -26 2Z" fill="#c9eba0"/>'
    '<rect x="84" y="62" width="14" height="10" rx="2" fill="#fff"/>' + flower_carrot(52, 74) + shiitake(72, 76) + negi([(30, 74), (92, 76)])))
K['柳川鍋'] = ('main', pot('#6b5a50', '#f2c86a', '<path d="M24 64 q14 -10 30 -2 q16 -10 30 0 q12 -6 20 4 q-20 10 -40 6 q-24 4 -40 -8Z" fill="#ffd94d"/>'
    + ''.join(f'<path d="M{x} {y} l12 -4" stroke="#8a5a34" stroke-width="3"/>' for x, y in [(36, 66), (52, 70), (70, 66), (84, 70)])
    + '<path d="M44 58 q12 -2 22 2 M70 56 q10 -2 18 4" fill="none" stroke="#7a6a5a" stroke-width="4"/>'
    + '<path d="M58 56 q4 -8 10 -4 M62 54 l-2 -6" fill="none" stroke="#4fae5c" stroke-width="3"/>', rx=46))
K['すき焼き'] = ('main', pot('#4a4a52', '#a8683a', '<path d="M24 62 q10 -10 22 -4 q8 -6 18 0 l-4 10 q-18 4 -36 -6Z" fill="#b0603c"/>'
    '<rect x="66" y="54" width="18" height="14" rx="2" fill="#fff4dc"/><path d="M70 58 h10 M70 62 h10" stroke="#c9944a" stroke-width="2"/>'
    '<path d="M86 64 l16 -6" stroke="#fffaf0" stroke-width="7"/><path d="M86 64 l16 -6" stroke="#9bd36a" stroke-width="3"/>'
    '<path d="M42 70 q8 -4 16 0 t16 0" fill="none" stroke="#fff" stroke-width="3"/><path d="M58 52 q4 -6 10 -2" fill="#4fae5c"/>'))
K['おでん'] = ('main', donabe('<circle cx="36" cy="64" r="11" fill="#f2d9a0"/><path d="M30 62 q6 -4 12 0" fill="none" stroke="#c9944a" stroke-width="2.5"/>'
    '<ellipse cx="60" cy="62" rx="9" ry="11" fill="#fff"/><circle cx="60" cy="64" r="5" fill="#ffc22e" stroke="none"/>'
    '<path d="M76 72 L84 52 L96 72Z" fill="#8a8a8a"/>' + dots([(84, 64), (88, 68)], 1.2, '#5a5a5a', False) + chikuwa(56, 78, -6)
    + skewer_stick(84, 40, 84, 52)))
K['串だんご'] = ('snack', plate(cy=96, rx=48, ry=12) + '<g transform="rotate(-16 50 66)">' + kushi(50, ['#c9823e', '#c9823e', '#c9823e'])
    + '<path d="M40 34 q10 6 20 0 M40 56 q10 6 20 0 M40 78 q10 6 20 0" fill="none" stroke="#8a4a2e" stroke-width="3"/></g>'
    + '<g transform="rotate(14 82 66)">' + kushi(82, ['#7a3a3e', '#7a3a3e', '#7a3a3e']) + dots([(76, 38), (86, 60), (78, 84)], 1.6, '#a8606e', False) + '</g>')
K['かんぴょう巻き'] = ('staple', plate() + ''.join(f'<rect x="{x-11}" y="{y-11}" width="22" height="22" rx="8" fill="#2f4a3a"/><circle cx="{x}" cy="{y}" r="7.5" fill="#fff" stroke="none"/><circle cx="{x}" cy="{y}" r="3.5" fill="#b07a3a" stroke="none"/>'
    for x, y in [(38, 72), (60, 68), (82, 72), (48, 88), (72, 88)]) + '<path d="M96 86 q4 -8 10 -2 q-4 6 -10 2Z" fill="#ffb0a0" stroke-width="2"/>')
K['よこすか海軍カレー'] = ('bowl', D['curry-rice'][1] + '<path d="M96 30 L98 56 H112 L114 30Z" fill="#fff"/><path d="M97 40 H113" stroke-width="2"/>')
K['けんちん汁'] = ('soup', bowl('#f08a6e', '#d9a45a', rx=46,
    top=dots([(38, 58), (46, 62), (82, 58)], 4, '#fff8ec') + '<rect x="50" y="52" width="14" height="10" rx="2" fill="#fff"/>'
        + ''.join(f'<path d="M{x} {y} l10 -3" stroke="{c}" stroke-width="4"/>' for x, y, c in [(64, 62, '#ff9a3c'), (68, 54, '#fff'), (40, 68, '#8a5a34'), (74, 66, '#fff')])
        + '<circle cx="86" cy="66" r="6" fill="#f2e2c8"/>' + negi([(58, 66), (92, 58)])))
K['いなりずし'] = ('staple', plate() + ''.join(f'<path d="M{x-16} {y+8} Q{x-18} {y-12} {x} {y-12} Q{x+18} {y-12} {x+16} {y+8} Q{x} {y+14} {x-16} {y+8}Z" fill="#c9823e"/><path d="M{x-8} {y-6} q8 -4 16 0" fill="none" stroke="#e8b06a" stroke-width="2.5"/>'
    for x, y in [(40, 78), (66, 70), (90, 80)]) + '<path d="M50 92 q6 -6 12 0 q-6 4 -12 0Z" fill="#ffb0a0" stroke-width="2"/>')
K['なめろう'] = ('main', plate() + leaf(54, 76, 54, 18, -10, '#4fae5c') + '<path d="M36 76 Q40 60 58 60 Q76 62 76 76 Q60 86 36 76Z" fill="#c98a7a"/>'
    + dots([(46, 70), (58, 66), (66, 72)], 1.8, '#a8605a', False) + negi([(52, 64), (60, 74)]) + '<path d="M84 78 q8 -8 14 0 q-6 6 -14 0Z" fill="#ffe07a" stroke-width="2.5"/>')
K['納豆汁'] = ('soup', miso(dots([(46, 58), (54, 54), (62, 58), (70, 54), (78, 58)], 4.5, '#c08a4a') + '<rect x="56" y="62" width="10" height="9" rx="2" fill="#fff"/>' + dots([(80, 64), (44, 66)], 4, '#d9843a')))
K['シューマイ'] = D['shumai']
K['親子丼'] = D['oyakodon']
K['玉子焼き'] = D['dashimaki']
K['豚汁'] = D['tonjiru']
K['しじみ汁'] = D['misoshiru-shijimi']
# 中部
K['へぎそば'] = ('noodle', '<rect x="12" y="52" width="104" height="52" rx="6" fill="#e3c98a"/><rect x="18" y="58" width="92" height="40" rx="3" fill="#f2dcae" stroke-width="2"/>'
    + ''.join(f'<path d="M{24 + i * 22} 66 q6 -6 12 0 q6 6 0 12 q-6 6 0 12" fill="none" stroke="{INK}" stroke-width="10"/><path d="M{24 + i * 22} 66 q6 -6 12 0 q6 6 0 12 q-6 6 0 12" fill="none" stroke="#8a9a78" stroke-width="6"/>' for i in range(4)))
K['のっぺ汁'] = ('soup', bowl('#e0573a', '#e8c890', rx=46,
    top=dots([(40, 58), (78, 60)], 6, '#fff4dc') + flower_carrot(58, 56) + '<rect x="64" y="60" width="10" height="8" rx="2" fill="#8a8a8a"/>' + shiitake(86, 62)
        + dots([(48, 66), (54, 64), (52, 70)], 3, '#ff4a3a') + '<path d="M70 52 q8 -2 12 4" fill="none" stroke="#4fae5c" stroke-width="3"/>'))
K['笹団子'] = ('snack', plate(cy=94, rx=48, ry=12) + ''.join(
    f'<g transform="rotate({r} {x} 66)"><path d="M{x} 30 Q{x+20} 50 {x+12} 90 L{x} 100 L{x-12} 90 Q{x-20} 50 {x} 30Z" fill="#4fae5c"/>'
    f'<ellipse cx="{x}" cy="66" rx="13" ry="16" fill="#8fc46a"/><path d="M{x-14} 54 h28 M{x-14} 78 h28" stroke="#c9a85e" stroke-width="3"/></g>'
    for x, r in [(46, -14), (82, 12)]))
K['ます寿司'] = ('staple', '<ellipse cx="64" cy="82" rx="50" ry="20" fill="#e3c98a"/><path d="M14 82 V90 Q64 116 114 90 V82" fill="#c9a85e"/>'
    '<ellipse cx="64" cy="78" rx="42" ry="15" fill="#4fae5c"/><path d="M64 78 L22 74 A42 15 0 0 1 64 63Z" fill="#ff9a8a"/>'
    '<path d="M64 78 L22 74 V80 L64 84Z" fill="#fff"/><path d="M34 70 l20 2 M40 66 l18 2" stroke="#ffd0c8" stroke-width="2.5"/>'
    '<path d="M64 78 L106 74 M64 78 L96 88 M64 78 L64 94" stroke="#2f8a44" stroke-width="2"/>')
K['ほたるいかの酢味噌和え'] = ('side', small_dish(''.join(
    f'<g transform="rotate({r} {x} {y})"><path d="M{x-10} {y} Q{x-8} {y-8} {x+4} {y-6} L{x+10} {y} L{x+4} {y+6} Q{x-8} {y+8} {x-10} {y}Z" fill="#a8445a"/><path d="M{x+10} {y} l6 -4 m-6 4 l6 0 m-6 0 l6 4" stroke-width="2"/></g>'
    for x, y, r in [(42, 72, -10), (62, 68, 8), (80, 76, -4), (54, 84, 6)]) + '<path d="M72 86 q8 -8 16 -2 q-6 6 -16 2Z" fill="#ffe07a" stroke-width="2.5"/>' + negi([(90, 70)]), '#cfe6fa'))
K['ぶり大根'] = ('main', bowl('#fff', '#c9944a', rx=46, top='<ellipse cx="44" cy="60" rx="14" ry="8" fill="#e8b878"/><ellipse cx="44" cy="58" rx="9" ry="4" fill="#f2cc96" stroke="none"/>'
    '<path d="M60 52 q12 -10 26 0 l-2 12 q-12 4 -22 -2Z" fill="#a8603a"/><path d="M64 54 q8 -4 16 0" fill="none" stroke="#f2c6a0" stroke-width="2.5"/>'
    '<ellipse cx="80" cy="66" rx="12" ry="6" fill="#e8b878"/><path d="M52 66 l8 -6 M56 68 l8 -6" stroke="#ffe07a" stroke-width="2"/>'))
K['ほうとう'] = ('noodle', pot('#4a4a52', '#d39348', flat_noodles('#fff4dc')
    + '<path d="M60 48 q12 -12 24 0 l-6 12 h-12Z" fill="#ffb84a"/><path d="M60 48 q12 -12 24 0" fill="none" stroke="#3d8a4a" stroke-width="4"/>'
    + '<path d="M30 52 q10 -10 20 0 l-4 8 h-12Z" fill="#ffb84a"/><path d="M30 52 q10 -10 20 0" fill="none" stroke="#3d8a4a" stroke-width="4"/>' + shiitake(92, 62) + negi([(76, 72)])))
K['吉田のうどん'] = ('noodle', bowl('#7fa8e8', '#d9a45a', rx=46, top=thick_noodles('#fffaf0', w=11)
    + '<path d="M36 50 q10 -10 22 -2 q-10 8 -22 2Z" fill="#c9eba0"/><path d="M62 48 q10 -6 20 0 l-2 8 q-10 2 -18 -8Z" fill="#a8583a"/><circle cx="88" cy="54" r="6" fill="#e0402e"/>'))
K['馬刺し'] = ('main', plate() + ''.join(f'<rect x="{40 + i * 12}" y="{56 - i}" width="16" height="26" rx="4" fill="#e8607a" transform="rotate(14 {48 + i * 12} {69 - i})"/><path d="M{44 + i * 12} {64 - i} q4 6 8 6" fill="none" stroke="#ffd0dc" stroke-width="2" transform="rotate(14 {48 + i * 12} {69 - i})"/>' for i in range(4))
    + '<path d="M26 84 q8 -10 16 0" fill="none" stroke="#f6eefa" stroke-width="5"/><path d="M26 84 q8 -10 16 0" fill="none" stroke-width="1.5"/><path d="M92 84 q6 -8 12 0Z" fill="#ffe07a" stroke-width="2.5"/>')
K['おやき'] = ('snack', plate(cy=90) + '<ellipse cx="44" cy="76" rx="22" ry="14" fill="#f2e2c8"/>' + dots([(36, 72), (50, 70), (44, 80)], 3, '#c9944a', False)
    + '<path d="M62 84 Q60 60 84 60 Q106 60 104 84Z" fill="#f2e2c8"/><path d="M68 84 Q68 70 84 70 Q100 70 100 84Z" fill="#4fae5c"/>' + dots([(78, 76), (88, 78)], 2, '#2f8a44', False))
K['五平餅'] = ('snack', plate(cy=94, rx=48, ry=12) + ''.join(f'<g transform="rotate({r} {x} 64)"><path d="M{x} 96 V108" stroke="#d9b07a" stroke-width="5"/><ellipse cx="{x}" cy="64" rx="14" ry="30" fill="#fff4dc"/>'
    f'<ellipse cx="{x}" cy="62" rx="11" ry="26" fill="#a8603a" stroke="none"/><path d="M{x-8} 50 l14 6 M{x-8} 66 l14 6" stroke="#6b3a24" stroke-width="2.5"/></g>' for x, r in [(46, -10), (80, 10)]))
K['鶏ちゃん'] = ('main', pot('#4a4a52', '#c9783a', '<path d="M28 62 q10 -10 22 -2 q-6 10 -22 2Z M58 56 q10 -10 22 -2 q-6 10 -22 2Z M82 64 q10 -8 18 0 q-8 8 -18 0Z" fill="#d9603a"/>'
    '<path d="M42 70 q12 -10 26 0 q-12 8 -26 0Z M70 70 q10 -8 20 0 q-10 6 -20 0Z" fill="#c9eba0"/>' + negi([(52, 60), (76, 58)])))
K['朴葉味噌'] = ('side', '<rect x="30" y="80" width="68" height="24" rx="6" fill="#8a8f98"/><path d="M36 92 h56" stroke="#e8455a" stroke-width="3"/>'
    + '<path d="M14 72 Q30 44 64 44 Q98 44 114 72 Q98 86 64 86 Q30 86 14 72Z" fill="#b08a4a"/><path d="M20 70 H108 M40 70 l-8 -10 M60 70 l-6 -14 M80 70 l6 -12 M96 70 l6 -8" fill="none" stroke="#8a6a34" stroke-width="2"/>'
    + '<path d="M40 70 Q44 56 64 56 Q84 56 88 70 Q64 78 40 70Z" fill="#c9783a"/>' + negi([(54, 64), (70, 62)]) + shiitake(76, 68))
K['味噌煮込みうどん'] = ('noodle', donabe(thick_noodles('#fffaf0') + '<ellipse cx="70" cy="58" rx="12" ry="7" fill="#fff"/><circle cx="70" cy="58" r="5" fill="#ffb02e" stroke="none"/>'
    + kama(46, 54) + negi([(88, 60), (94, 66), (36, 70)])).replace('#f5d99a', '#a8603a'))
K['きしめん'] = ('noodle', bowl('#7fa8e8', '#d9a45a', rx=46, top=flat_noodles('#fffaf0')
    + '<path d="M50 50 l4 -6 l4 6 l4 -6 l4 6 l4 -6 l4 6" fill="#f2c6a0" stroke-width="2"/><path d="M76 56 q8 -8 16 0 q-8 6 -16 0Z" fill="#4fae5c" stroke-width="2.5"/>'
    + '<rect x="34" y="52" width="14" height="10" rx="2" fill="#e8a24a"/>' + kama(70, 66, 14)))
K['黒はんぺんフライ'] = ('main', plate() + cabbage(40, 76) + ''.join(f'<path d="M{x-14} {y+8} Q{x-14} {y-12} {x} {y-12} Q{x+14} {y-12} {x+14} {y+8}Z" fill="#c9823e"/>' + dots([(x - 6, y - 4), (x + 4, y)], 1.8, '#e8b06a', False)
    for x, y in [(66, 74), (88, 78)]) + '<path d="M58 66 q8 -4 16 0 M80 70 q8 -4 16 0" fill="none" stroke="#6b3a24" stroke-width="3"/>')
K['サクラエビのかき揚げ'] = ('main', tempura_paper() + '<path d="M38 74 Q40 50 64 50 Q90 50 92 74 Q80 86 64 84 Q46 86 38 74Z" fill="#ffd77a"/>'
    + ''.join(f'<path d="M{x} {y} q4 -6 8 0 l-2 4" fill="none" stroke="#ff6b7a" stroke-width="3"/>' for x, y in [(46, 66), (58, 60), (70, 64), (80, 70), (54, 74), (66, 76)]))
# 近畿・中国・四国
K['鯖そうめん'] = ('noodle', plate() + '<path d="M26 82 Q28 60 54 60 Q76 60 78 82Z" fill="#d9a45a"/><path d="M32 76 q8 -8 16 0 t16 0 M36 70 q8 -6 14 0 t14 0" fill="none" stroke="#a8703a" stroke-width="2.5"/>'
    '<path d="M70 70 Q76 54 96 58 Q108 64 104 80 Q94 88 76 84Z" fill="#8a4a2e"/><path d="M80 66 q8 -4 16 2" fill="none" stroke="#c98a5a" stroke-width="3"/>' + negi([(44, 60)]))
K['千枚漬け'] = ('side', small_dish(''.join(f'<ellipse cx="{x}" cy="{y}" rx="16" ry="10" fill="#fffaf0"/><ellipse cx="{x}" cy="{y}" rx="10" ry="6" fill="none" stroke="#e8e2d0" stroke-width="2"/>' for x, y in [(44, 78), (58, 72), (72, 78), (86, 74)])
    + '<path d="M40 70 l40 -6" stroke="#3d7a4a" stroke-width="4"/><circle cx="66" cy="86" r="3" fill="#e0402e" stroke-width="2"/>', '#e6defa'))
K['バッテラ'] = ('main', long_plate() + ''.join(f'<rect x="{x}" y="64" width="20" height="22" rx="2" fill="#fff"/><path d="M{x} 64 h20 v8 h-20Z" fill="#a9bccc"/><path d="M{x+3} 68 h14" stroke="#e8f0f8" stroke-width="2"/><path d="M{x} 64 h20" stroke="#c9d8c0" stroke-width="5"/>'
    for x in (22, 44, 66, 88)) + '<path d="M22 64 H108" stroke-width="2"/>')
K['船場汁'] = ('soup', bowl('#fff', '#fff1d6', rx=46, top=''.join(f'<rect x="{x}" y="{y}" width="18" height="7" rx="2" fill="#fff" transform="rotate({r} {x+9} {y+3})"/>' for x, y, r in [(36, 56, -10), (68, 50, 8), (40, 66, 4)])
    + '<path d="M60 58 q10 -8 20 0 l-2 8 q-10 2 -18 -8Z" fill="#8fa4b8"/><path d="M64 60 q6 -2 10 0" fill="none" stroke="#fff" stroke-width="2"/>' + negi([(84, 64), (90, 58)])))
K['鯨のハリハリ鍋'] = ('main', donabe(''.join(f'<path d="M{x} {y} l12 -12" stroke="#4fae5c" stroke-width="4"/>' for x, y in [(28, 76), (36, 78), (44, 78), (80, 78), (88, 76), (96, 74)])
    + '<path d="M46 62 q10 -8 22 -2 l-4 10 q-10 0 -18 -8Z M64 58 q10 -6 20 2 l-6 8 q-10 -2 -14 -10Z" fill="#a8404a"/>').replace('#f5d99a', '#f2e2b8'))
K['ぼたん鍋'] = ('main', donabe(''.join(f'<ellipse cx="{64 + 14 * math.cos(a)}" cy="{66 + 6 * math.sin(a)}" rx="10" ry="6" fill="#e86a7a" transform="rotate({a * 57.3:.0f} {64 + 14 * math.cos(a)} {66 + 6 * math.sin(a)})"/>' for a in [i * math.pi / 3 for i in range(6)])
    + '<circle cx="64" cy="66" r="6" fill="#fff4f6"/>' + negi([(30, 70), (98, 70)]) + shiitake(36, 62)).replace('#f5d99a', '#d39348'))
K['たこめし'] = ('staple', bowl('#ff8a65', '#e8c27a', mound=34, top=''.join(f'<path d="M{x-6} {y+4} q0 -10 6 -10 q6 0 6 10Z" fill="#c9405a"/><circle cx="{x}" cy="{y+1}" r="2" fill="#ffd0d8" stroke="none"/>' for x, y in [(48, 50), (64, 44), (78, 52), (58, 56)])
    + negi([(70, 56), (40, 58)])))
K['味噌だれ餃子'] = ('main', D['gyoza'][1].replace('#8a4a2e', '#c9783a'))
K['柿の葉寿司'] = ('staple', plate() + ''.join(f'<rect x="{x-14}" y="{y-10}" width="28" height="20" rx="4" fill="#4fae5c"/><path d="M{x-14} {y} H{x+14}" stroke="#2f8a44" stroke-width="2"/>' for x, y in [(36, 76), (64, 70), (50, 88)])
    + '<rect x="78" y="70" width="26" height="18" rx="3" fill="#fff"/><path d="M78 70 h26 v7 h-26Z" fill="#ff9a8a"/>' + leaf(96, 92, 22, 7, -6, '#c9a03a', '#a87a2a'))
K['茶粥'] = ('staple', bowl('#7fa8e8', '#d9b878', rx=44, top=dots([(46, 60), (56, 56), (72, 58), (82, 62), (62, 64)], 2, '#f2e2c0', False)
    + '<path d="M58 34 q-4 -6 0 -12 M70 34 q-4 -6 0 -12" fill="none" stroke="#fff" stroke-width="3"/>'))
K['めはりずし'] = ('staple', plate() + '<ellipse cx="46" cy="74" rx="22" ry="18" fill="#4f8a44"/><path d="M30 70 q16 -10 32 0 M30 80 q16 -8 32 0" fill="none" stroke="#7cba5a" stroke-width="2.5"/>'
    + '<path d="M70 84 Q68 58 86 58 Q104 58 102 84Z" fill="#4f8a44"/><ellipse cx="86" cy="84" rx="16" ry="6" fill="#fff"/>')
K['いただき'] = ('main', bowl('#fff', '#d9a45a', rx=44, top='<path d="M36 60 L50 36 L64 60Z M62 60 L78 38 L92 60Z" fill="#c9823e"/><path d="M42 58 q6 -4 14 0 M70 58 q6 -4 14 0" fill="none" stroke="#e8b06a" stroke-width="2.5"/>'))
K['出雲そば'] = ('noodle', ''.join(f'<ellipse cx="{x}" cy="{y + 8}" rx="28" ry="8" fill="#c9432e"/><path d="M{x-28} {y} Q{x-26} {y+12} {x} {y+12} Q{x+26} {y+12} {x+28} {y}Z" fill="#e0573a"/><ellipse cx="{x}" cy="{y}" rx="28" ry="8" fill="#a89580"/>'
    f'<path d="M{x-18} {y} q6 -4 12 0 t12 0" fill="none" stroke="#7d6a58" stroke-width="2.5"/>' for x, y in [(64, 92), (64, 72), (64, 52)]) + negi([(56, 48), (64, 46)]) + '<path d="M70 48 l6 -2" stroke="#ff9a3c" stroke-width="3"/>')
K['ばらずし'] = ('staple', '<ellipse cx="64" cy="82" rx="50" ry="20" fill="#e3c98a"/><path d="M14 82 V90 Q64 116 114 90 V82" fill="#c9a85e"/><ellipse cx="64" cy="78" rx="42" ry="15" fill="#fff"/>'
    + ''.join(f'<path d="M{x} {y} l8 -2" stroke="{c}" stroke-width="4"/>' for x, y, c in [(34, 76, '#ffd94d'), (44, 70, '#ff9aa8'), (58, 80, '#ffd94d'), (70, 70, '#4fae5c'), (80, 80, '#ff9aa8'), (88, 72, '#ffd94d'), (50, 84, '#4fae5c')])
    + shiitake(64, 76) + dots([(40, 82), (78, 76)], 3, '#ff7a5a'))
K['ままかりずし'] = ('staple', long_plate() + ''.join(f'<rect x="{x}" y="66" width="22" height="18" rx="6" fill="#fff"/><path d="M{x-2} 70 Q{x+10} 56 {x+24} 70 Q{x+10} 68 {x-2} 70Z" fill="#b8c8d8"/><path d="M{x+4} 66 h14" stroke="#e8f0f8" stroke-width="2"/>' for x in (22, 52, 82))
    + leaf(40, 94, 22, 6, 0, '#6cbf5a'))
K['お好み焼き'] = D['okonomiyaki']
K['鯛めし'] = ('staple', donabe('<path d="M28 66 Q50 48 82 60 L98 50 L96 66 L100 78 L82 70 Q50 82 28 66Z" fill="#ff8a8a"/><circle cx="38" cy="64" r="2.4" fill="' + INK + '" stroke="none"/>'
    '<path d="M50 60 l4 4 m8 -6 l4 4" stroke="#fff" stroke-width="2.5"/>' + negi([(64, 78), (84, 78)])).replace('#f5d99a', '#fff4e0'))
K['ふく刺し'] = ('side', '<ellipse cx="64" cy="76" rx="54" ry="26" fill="#7fa8e8"/><ellipse cx="64" cy="76" rx="46" ry="21" fill="#cfe6fa" stroke="none"/>'
    + ''.join(f'<ellipse cx="{64 + 30 * math.cos(a):.1f}" cy="{76 + 13 * math.sin(a):.1f}" rx="10" ry="5" fill="#fff" fill-opacity=".75" stroke-width="1.5" transform="rotate({a * 57.3:.0f} {64 + 30 * math.cos(a):.1f} {76 + 13 * math.sin(a):.1f})"/>' for a in [i * math.pi / 6 for i in range(12)])
    + negi([(60, 74), (68, 74), (64, 70)]) + '<circle cx="64" cy="80" r="5" fill="#ff8a5c" stroke-width="2"/>')
K['祖谷そば'] = ('noodle', noodle_bowl('soba', '<path d="M56 48 l4 -6 l4 6 l4 -6 l4 6" fill="#f2c6a0" stroke-width="2"/>'))
K['そば米雑炊'] = ('soup', bowl('#b48ad0', '#f2d9a0', rx=46, top=dots([(40, 60), (48, 56), (56, 62), (64, 56), (72, 62), (80, 58), (88, 62), (52, 66), (70, 66)], 2.6, '#c9a06a')
    + '<rect x="44" y="50" width="10" height="8" rx="2" fill="#f2c6a0"/>' + flower_carrot(76, 52, 5) + negi([(62, 50), (90, 54)])))
K['しっぽくうどん'] = ('noodle', bowl('#7fa8e8', '#d9a45a', rx=46, top=thick_noodles('#fffaf0')
    + dots([(42, 52), (80, 52)], 6, '#fff8ec') + '<path d="M56 48 l10 -2 l-2 8Z" fill="#ff9a3c"/>' + '<rect x="64" y="56" width="10" height="8" rx="2" fill="#e8a24a"/>' + shiitake(90, 62)))
K['年明けうどん'] = ('noodle', bowl('#e0573a', '#fff1d6', rx=46, top=thick_noodles('#fffaf0') + kama(48, 54) + kama(68, 52) + '<circle cx="84" cy="56" r="6" fill="#e8455a"/>'))
K['しょうゆ豆'] = ('side', small_dish(''.join(f'<ellipse cx="{x}" cy="{y}" rx="9" ry="7" fill="#8a5a34"/><path d="M{x-4} {y-3} q3 -2 6 0" fill="none" stroke="#c9944a" stroke-width="2"/>' for x, y in [(40, 76), (56, 70), (72, 74), (86, 80), (52, 84), (68, 86)])
    + '<path d="M80 66 q6 -4 10 2 l-8 4Z" fill="#e0402e" stroke-width="2"/>', '#fff4dc'))
K['じゃこ天'] = ('main', long_plate() + ''.join(f'<ellipse cx="{x}" cy="{y}" rx="22" ry="12" fill="#a89580"/>' + dots([(x - 8, y - 2), (x + 6, y - 4), (x + 2, y + 4)], 1.6, '#7d6a58', False)
    for x, y in [(42, 82), (74, 80)]) + '<path d="M96 88 q6 -8 12 0Z" fill="#ffe07a" stroke-width="2.5"/>')
K['かつおのたたき'] = ('main', plate() + ''.join(f'<rect x="{38 + i * 12}" y="{58 - i}" width="14" height="26" rx="3" fill="#d9465a" transform="rotate(14 {45 + i * 12} {71 - i})"/><path d="M{38 + i * 12} {58 - i} v26" stroke="#7a3a3a" stroke-width="5" transform="rotate(14 {45 + i * 12} {71 - i})"/>' for i in range(4))
    + dots([(48, 62), (66, 58), (82, 62)], 3, '#fffaf0') + negi([(56, 60), (74, 60)]) + '<path d="M26 82 q8 -10 16 0" fill="none" stroke="#f6eefa" stroke-width="5"/><path d="M92 84 a8 8 0 0 1 14 -4Z" fill="#fff07a"/>')
# 九州・沖縄
K['がめ煮'] = ('main', bowl('#e0573a', '#c9944a', rx=46, top='<rect x="36" y="52" width="14" height="12" rx="4" fill="#e8b878"/>' + lotus(60, 56) + flower_carrot(78, 54)
    + '<path d="M44 66 l14 -2" stroke="#8a5a34" stroke-width="5"/><rect x="84" y="60" width="10" height="10" rx="2" fill="#8a8a8a" transform="rotate(20 89 65)"/>' + shiitake(66, 68)
    + '<path d="M28 60 q6 -6 12 0 q-6 4 -12 0Z" fill="#7cc98a" stroke-width="2.5"/>'))
K['博多雑煮'] = ('soup', bowl('#e0573a', '#fff1d6', rx=46, top='<ellipse cx="50" cy="58" rx="12" ry="8" fill="#fff"/><path d="M64 52 q10 -6 18 2 l-4 8 q-10 0 -14 -10Z" fill="#c9d4e0"/>'
    + leaf(80, 64, 28, 10, -12, '#3d8a4a', '#2f6a3a') + kama(38, 66, 14) + shiitake(62, 68)))
K['ちゃんぽん'] = ('noodle', bowl('#ff8a73', '#fff4e0', rx=48, top=thick_noodles('#ffe48a', w=8)
    + '<path d="M32 50 q10 -10 22 -2 q-10 8 -22 2Z" fill="#c9eba0"/>' + kama(62, 50, 14) + '<path d="M74 52 a7 7 0 1 1 9 5" fill="none" stroke="#ff8a65" stroke-width="4.5"/>'
    + ring(90, 60, 6, '#fff', '#fff4e0') + '<path d="M50 62 l12 0" stroke="#ff9a3c" stroke-width="3"/>'))
K['皿うどん'] = ('noodle', plate() + '<path d="M26 82 Q28 56 64 54 Q100 56 102 82Z" fill="#ffd77a"/>'
    + ''.join(f'<path d="M{30 + i * 9} 80 L{40 + i * 9} 58" stroke="#e8a82e" stroke-width="2"/>' for i in range(8))
    + '<path d="M40 64 Q50 52 64 54 Q82 52 88 64 Q76 74 64 72 Q50 74 40 64Z" fill="#f6eedc" fill-opacity=".9"/>' + kama(54, 60, 12)
    + '<path d="M70 58 a6 6 0 1 1 8 4" fill="none" stroke="#ff8a65" stroke-width="4"/><path d="M58 66 q8 -6 14 0 q-8 4 -14 0Z" fill="#9bd36a" stroke-width="2"/>')
dago = lambda strips: bowl('#f08a6e', '#e6ad5c', rx=46, top=strips + '<path d="M70 52 q8 -8 16 0 l-4 8 h-8Z" fill="#f2e2c8"/>' + shiitake(52, 68) + negi([(36, 64), (88, 64)]))
K['だご汁'] = ('soup', dago('<path d="M34 56 q8 -8 16 -2 q-4 8 -16 2Z M52 52 q10 -6 18 2 q-8 8 -18 -2Z M74 62 q8 -6 16 2 q-8 6 -16 -2Z" fill="#fff4dc"/>'))
K['だんご汁'] = ('soup', dago(''.join(f'<path d="M{x} {y} q12 4 24 0" fill="none" stroke="{INK}" stroke-width="9"/><path d="M{x} {y} q12 4 24 0" fill="none" stroke="#fff4dc" stroke-width="5"/>' for x, y in [(30, 58), (40, 64), (62, 60)])))
K['いきなり団子'] = ('snack', plate(cy=90) + '<path d="M24 86 Q22 54 48 54 Q72 54 72 86Z" fill="#fff8ec"/><path d="M58 86 Q58 60 82 60 Q106 60 104 86Z" fill="#fff8ec"/>'
    '<ellipse cx="82" cy="76" rx="14" ry="10" fill="#ffc94a"/><path d="M70 82 q12 -8 24 0" fill="#7a3a3e"/>' + '<path d="M38 44 q-4 -6 0 -12 M50 40 q-4 -6 0 -12" fill="none" stroke="#fff" stroke-width="3"/>')
K['とり天'] = ('main', plate() + cabbage(36, 76) + batter(66, 66, 34, 18, -12) + batter(80, 82, 34, 18, 4) + '<ellipse cx="100" cy="56" rx="10" ry="5" fill="#fff"/><ellipse cx="100" cy="56" rx="6" ry="2.5" fill="#8a4a2e" stroke="none"/>')
K['ひゅうが丼'] = ('bowl', donburi(''.join(f'<rect x="{x}" y="{y}" width="14" height="10" rx="3" fill="#d9465a" transform="rotate({r} {x+7} {y+5})"/>' for x, y, r in [(36, 48, -12), (52, 42, 6), (70, 44, -6), (84, 50, 10)])
    + '<path d="M40 60 q24 -8 48 0" fill="none" stroke="#e8c890" stroke-width="4"/>' + negi([(50, 52), (66, 54), (78, 40)]) + '<rect x="58" y="34" width="14" height="6" rx="1" fill="#2f4a3a" stroke-width="2"/>'))
K['チキン南蛮'] = ('main', plate() + cabbage(36, 76) + '<path d="M54 66 Q58 50 80 52 Q100 56 98 72 Q96 88 74 88 Q54 86 54 66Z" fill="#e8a24a"/>'
    '<path d="M60 64 Q66 54 80 56 Q94 60 92 70 Q80 76 60 64Z" fill="#fffaf0"/>' + dots([(70, 62), (80, 64)], 1.8, '#9bd36a', False) + '<circle cx="100" cy="86" r="6" fill="#ff6b5a"/>')
K['鶏飯'] = ('staple', bowl('#7fa8e8', '#fff', mound=36, top=''.join(f'<path d="M{x} {y} l10 -3" stroke="{c}" stroke-width="4"/>' for x, y, c in
    [(34, 56, '#ffd94d'), (44, 50, '#f2dcc0'), (56, 46, '#ffd94d'), (66, 50, '#f2dcc0'), (76, 46, '#ffd94d'), (84, 54, '#f2dcc0'), (48, 58, '#8a5a34'), (68, 58, '#ffd94d')])
    + negi([(60, 54), (80, 58)]) + '<path d="M88 46 l6 -4 l2 6Z" fill="#ffb84a" stroke-width="2"/>'))
K['きびなごの刺身'] = ('side', plate() + ''.join(f'<path d="M64 74 L{64 + 36 * math.cos(a):.1f} {74 + 15 * math.sin(a):.1f}" stroke="#b8c8e0" stroke-width="7"/><path d="M64 74 L{64 + 36 * math.cos(a):.1f} {74 + 15 * math.sin(a):.1f}" stroke="#e8f0f8" stroke-width="3"/>' for a in [i * math.pi / 5 for i in range(10)])
    + '<circle cx="64" cy="74" r="9" fill="#f2d070"/>')
K['沖縄そば'] = ('noodle', bowl('#7fa8e8', '#f2dcb0', rx=48, top=thick_noodles('#ffe48a', w=9)
    + '<rect x="40" y="46" width="20" height="14" rx="3" fill="#a8583a"/><path d="M40 51 h20" stroke="#fff4dc" stroke-width="2.5"/><rect x="62" y="44" width="20" height="14" rx="3" fill="#a8583a"/><path d="M62 49 h20" stroke="#fff4dc" stroke-width="2.5"/>'
    + kama(86, 58, 14) + '<path d="M48 64 l6 -2 l-1 4Z" fill="#e8455a" stroke-width="2"/>' + negi([(34, 58), (74, 62)])))
K['ゴーヤーチャンプルー'] = ('main', plate() + '<path d="M26 84 Q28 58 64 56 Q100 58 102 84Z" fill="#ffe48a"/>'
    + ''.join(f'<path d="M{x-10} {y} a10 6 0 0 0 20 0 h-5 a5 3 0 0 1 -10 0Z" fill="#6cbf5a" transform="rotate({r} {x} {y})"/>' for x, y, r in [(40, 70, -10), (60, 64, 8), (80, 72, -4), (56, 78, 12)])
    + '<rect x="70" y="58" width="12" height="10" rx="2" fill="#fff"/><rect x="38" y="76" width="12" height="9" rx="2" fill="#ff9a8a"/>' + dots([(88, 64)], 3, '#c9944a'))
K['ラフテー'] = ('main', small_dish(''.join(f'<rect x="{x}" y="{y}" width="26" height="24" rx="5" fill="#8a4a2e"/><path d="M{x} {y+8} h26 M{x} {y+16} h26" stroke="#e8b088" stroke-width="3"/><path d="M{x+4} {y+3} h10" stroke="#c98a5a" stroke-width="2.5"/>' for x, y in [(36, 60), (64, 58)])
    + '<path d="M84 82 q6 -6 12 0 q-6 4 -12 0Z" fill="#ffd21f" stroke-width="2.5"/>', '#ffd0dc'))
K['ソーキ汁'] = ('soup', bowl('#fff', '#f2dcb0', rx=46, top='<path d="M36 58 q10 -8 22 -2 l-2 8 q-12 2 -20 -6Z" fill="#c9844a"/><path d="M38 56 l-6 -4 M56 54 l6 -4" stroke="#fff4dc" stroke-width="4"/>'
    + '<ellipse cx="72" cy="58" rx="10" ry="6" fill="#fff8ec"/>' + '<path d="M80 64 q4 -8 10 -4 q2 6 -4 8Z" fill="#3d7a4a"/>' + negi([(60, 66), (48, 66)])))
K['中身汁'] = ('soup', bowl('#e0573a', '#fff1d6', rx=46, top=''.join(f'<path d="M{x} {y} l12 -2" stroke="{c}" stroke-width="5"/>' for x, y, c in [(36, 58, '#f2e2d0'), (50, 54, '#8a8a8a'), (66, 60, '#f2e2d0'), (78, 54, '#8a8a8a'), (44, 66, '#f2e2d0')])
    + shiitake(84, 64) + leaf(60, 64, 14, 5, 0, '#4fae5c')))
# 鍋・汁・魚・麺のほか
K['呉汁'] = ('soup', miso('<path d="M34 60 q14 -10 30 -2 q16 -8 30 2 q-14 8 -30 2 q-16 6 -30 -2Z" fill="#f6e8c8"/>' + leaf(56, 58, 18, 6, -10, '#4fae5c') + '<path d="M70 58 l10 -2" stroke="#ff9a3c" stroke-width="4"/>', '#e8c890'))
K['粕汁'] = ('soup', bowl('#f08a6e', '#f6eedc', rx=46, top='<rect x="36" y="52" width="16" height="10" rx="3" fill="#ff8a5c"/><path d="M40 56 h8" stroke="#fff" stroke-width="2"/>'
    + '<rect x="58" y="52" width="14" height="7" rx="2" fill="#fff"/><path d="M76 56 l10 -2 l-2 8Z" fill="#ff9a3c"/>' + dots([(56, 64)], 5, '#f2e2c8') + negi([(70, 64), (88, 62)])))
K['鮎の塩焼'] = ('main', long_plate() + whole_fish('#b8c49a', '#f4f2ea', cx=60, cy=80) + skewer_stick(14, 92, 104, 72)
    + dots([(24, 80), (90, 70), (96, 86)], 1.6, '#fff', False) + '<path d="M100 96 l8 -14" stroke="#ff8aa0" stroke-width="4"/>')
K['鯛そうめん'] = ('noodle', '<ellipse cx="64" cy="84" rx="56" ry="20" fill="#cfe6fa"/><ellipse cx="64" cy="82" rx="46" ry="15" fill="#eaf8ff" stroke="none"/>'
    + '<path d="M26 86 q8 -6 16 0 t16 0 t16 0 t16 0 t10 0" fill="none" stroke="#fffdf6" stroke-width="5"/><path d="M26 86 q8 -6 16 0 t16 0 t16 0 t16 0 t10 0" fill="none" stroke-width="1.5"/>'
    + '<path d="M28 72 Q50 54 82 66 L98 56 L96 72 L100 84 L82 76 Q50 88 28 72Z" fill="#ff8a8a"/><circle cx="38" cy="70" r="2.4" fill="' + INK + '" stroke="none"/><path d="M50 66 l4 4 m8 -6 l4 4" stroke="#fff" stroke-width="2.5"/>')
K['おろしそば'] = ('noodle', noodle_bowl('soba', '<path d="M54 56 Q56 44 66 44 Q78 44 78 56Z" fill="#fff"/>' + '<path d="M80 50 l4 -6 l4 6 l4 -6" fill="#f2c6a0" stroke-width="2"/>').replace('#d9b070', '#c9a878'))
K['丸焼き鯖'] = ('main', long_plate() + whole_fish('#5a8fb0', '#e8f0f8', length=84, height=24, cx=60, cy=80)
    + '<path d="M40 72 q6 -4 10 2 M54 70 q6 -4 10 2 M68 72 q6 -4 10 2" fill="none" stroke="#2f4a6a" stroke-width="3"/>' + skewer_stick(14, 86, 112, 74) + dots([(52, 82), (74, 84)], 3, '#8a5a34', False))
K['恵方巻き'] = ('staple', plate() + '<rect x="14" y="62" width="78" height="30" rx="14" fill="#2f4a3a" transform="rotate(-8 53 77)"/>'
    + '<ellipse cx="94" cy="72" rx="16" ry="17" fill="#2f4a3a"/><ellipse cx="94" cy="72" rx="12" ry="13" fill="#fff" stroke="none"/>'
    + dots([(90, 66)], 3.5, '#ffd94d', False) + dots([(98, 68)], 3, '#ff8aa0', False) + dots([(92, 76)], 3, '#4fae5c', False) + dots([(99, 77)], 3, '#c9823e', False))
# 甘いもの
K['柏餅'] = ('snack', plate(cy=90) + ''.join(f'<g transform="rotate({r} {x} 74)"><ellipse cx="{x}" cy="74" rx="20" ry="15" fill="#fff8ec"/><path d="M{x-24} 76 Q{x-16} 54 {x+6} 56 Q{x+24} 62 {x+22} 80 Q{x} 94 {x-24} 76Z" fill="#6cbf5a"/>'
    f'<path d="M{x-20} 76 Q{x} 66 {x+20} 76" fill="none" stroke="#3d8a4a" stroke-width="2"/></g>' for x, r in [(44, -10), (82, 8)]))
K['ぼた餅'] = ('snack', plate(cy=88) + '<ellipse cx="44" cy="76" rx="20" ry="14" fill="#7a3a3e"/>' + dots([(36, 72), (48, 70), (44, 80)], 1.6, '#a8606e', False)
    + '<ellipse cx="82" cy="76" rx="20" ry="14" fill="#f2cc7a"/>' + dots([(74, 72), (86, 70), (82, 80)], 1.6, '#d9a84a', False))
K['草餅'] = ('snack', plate(cy=88) + ''.join(f'<ellipse cx="{x}" cy="{y}" rx="18" ry="13" fill="#7cb85a"/><path d="M{x-8} {y-4} q8 -4 14 0" fill="none" stroke="#a8d886" stroke-width="2.5"/>' for x, y in [(44, 78), (82, 76)])
    + '<path d="M60 78 q4 -8 10 0" fill="#7a3a3e" stroke-width="2.5"/>')
K['栗きんとん'] = ('snack', small_dish('<path d="M30 80 Q32 58 64 56 Q96 58 98 80Z" fill="#ffd23a"/><path d="M50 62 Q52 44 66 44 Q80 46 78 62Z" fill="#f2b82e"/>'
    + '<path d="M40 70 q8 -4 14 0 M74 70 q8 -4 14 0" fill="none" stroke="#fff3a8" stroke-width="3"/>', '#e0573a'))
K['かるかん'] = ('snack', small_dish('<path d="M30 80 L40 56 H88 L98 80Z" fill="#fffaf0"/><path d="M30 80 H98 V88 H30Z" fill="#f2ecdc"/>' + dots([(50, 66), (64, 62), (78, 68), (58, 74), (84, 74)], 1.4, '#e8dcc4', False), '#cfe6fa'))
K['いももち'] = ('snack', plate(cy=88) + ''.join(f'<ellipse cx="{x}" cy="{y}" rx="18" ry="12" fill="#e8b878"/><ellipse cx="{x}" cy="{y-2}" rx="12" ry="6" fill="#c9844a" stroke="none"/>' for x, y in [(42, 80), (64, 68), (86, 80)]))
ALIAS = {'鮎塩焼き': '鮎の塩焼'}

def kyodo_ids():
    """data/recipes/kyodo.yaml から (料理ID, 都道府県を除いた料理名) を読む"""
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'recipes', 'kyodo.yaml')
    ids, out = None, []
    for line in open(path, encoding='utf-8'):
        if line.startswith('- id: '):
            ids = line[6:].strip()
        elif line.startswith('  name: ') and ids:
            name = line[8:].strip().strip('"').split('（')[0]
            out.append((ids, ALIAS.get(name, name)))
    return out

for kid, name in kyodo_ids():
    if name in K:
        D[kid] = K[name]

# ---- ふだんの定番料理（料理ID → 絵）。郷土料理やジャンルの絵と同じものはそれを使う ----
E = {}
def rice_bowl(surface, top='', color='#ff8a65'):
    return bowl(color, surface, mound=34, top=top)

def oval_plate(cy=84):
    return f'<ellipse cx="64" cy="{cy}" rx="54" ry="18" fill="#fff"/><ellipse cx="64" cy="{cy-2}" rx="42" ry="12" fill="#f6eee2" stroke="none"/>'

def omelet_dome(x=64, y=74, w=40, h=20, fill='#ffd94d'):
    return f'<path d="M{x-w} {y+6} Q{x-w} {y-h} {x} {y-h} Q{x+w} {y-h} {x+w} {y+6} Q{x} {y+12} {x-w} {y+6}Z" fill="{fill}"/>'

def gratin_dish(top, fill='#ffd977'):
    return (f'<ellipse cx="64" cy="80" rx="50" ry="22" fill="#fff"/><path d="M8 74 h10 M110 74 h10" stroke-width="6"/>'
            f'<ellipse cx="64" cy="76" rx="42" ry="16" fill="{fill}"/>{top}')

E['genmai-rice'] = ('staple', rice_bowl('#e8d2a0', dots([(52, 52), (66, 46), (78, 54), (60, 58)], 1.8, '#b8945a', False)))
E['mugi-rice'] = ('staple', rice_bowl('#fff', ''.join(f'<path d="M{x} {y} l4 -2" stroke="#c9a070" stroke-width="3"/>' for x, y in [(50, 52), (64, 44), (76, 52), (58, 58), (70, 58)])))
E['zakkoku-rice'] = ('staple', rice_bowl('#f2d8d8', dots([(50, 52), (60, 46), (72, 50), (80, 56), (56, 58), (68, 58)], 2.2, '#8a4a5e', False) + dots([(64, 52), (52, 46)], 2, '#ffd94d', False)))
E['takikomi-gohan'] = ('staple', GENRE['gohan'][1])
E['nigiri-sushi'] = K['にぎりずし']
E['tekka-maki'] = ('staple', plate() + ''.join(hosomaki(x, y, '#e8455a') for x, y in [(38, 72), (60, 68), (82, 72), (48, 88), (72, 88)]) + '<path d="M96 86 q4 -8 10 -2 q-4 6 -10 2Z" fill="#ffb0a0" stroke-width="2"/>')
E['kappa-maki'] = ('staple', plate() + ''.join(hosomaki(x, y, '#7cc98a') for x, y in [(38, 72), (60, 68), (82, 72), (48, 88), (72, 88)]) + '<path d="M96 86 q4 -8 10 -2 q-4 6 -10 2Z" fill="#ffb0a0" stroke-width="2"/>')
E['temaki-sushi'] = ('staple', plate(cy=92, rx=46, ry=12) + '<path d="M40 104 L22 40 Q50 30 80 40Z" fill="#2f4a3a"/><path d="M26 44 Q50 22 78 42 Q52 50 26 44Z" fill="#fff"/>'
    '<path d="M40 40 q4 -14 12 -16 l4 16Z" fill="#e8455a"/><path d="M56 40 l10 -18 l6 18Z" fill="#7cc98a"/><path d="M62 42 l14 -12 l2 12Z" fill="#ffd94d"/>'
    + '<path d="M80 104 L94 52 Q104 50 112 56 L96 104Z" fill="#2f4a3a" opacity=".9"/><path d="M92 58 q8 -8 18 -2" fill="#fff"/>')
E['omurice'] = ('staple', oval_plate() + omelet_dome(64, 74, 42, 24) + '<path d="M40 64 q12 -8 24 -2 t24 0" fill="none" stroke="#e8455a" stroke-width="6"/>'
    + '<path d="M44 76 q10 -4 20 0" fill="none" stroke="#fff3a8" stroke-width="3"/><circle cx="100" cy="80" r="5" fill="#6cbf5a"/>')
E['hayashi-rice'] = ('bowl', plate(rx=52, ry=18) + '<path d="M22 82 Q22 58 50 58 Q62 58 64 70 Q60 84 44 92 Q24 92 22 82Z" fill="#fff"/>'
    + '<path d="M64 70 Q66 56 86 58 Q106 62 104 80 Q100 94 64 94 Q44 94 44 92 Q60 84 64 70Z" fill="#8a3a2a"/>'
    + '<path d="M72 68 q6 -4 12 0 M80 80 q6 -4 12 0" fill="none" stroke="#e8c8a0" stroke-width="3"/>' + shiitake(70, 82) + '<path d="M80 62 q6 -4 12 -2" fill="none" stroke="#fff" stroke-width="2.5"/>')
E['doria'] = ('staple', gratin_dish(dots([(44, 72), (60, 68), (78, 74), (52, 82), (72, 82)], 4, '#e8a82e', False) + dots([(64, 76)], 3, '#6cbf5a', False)))
E['paella'] = ('staple', pot('#4a4a52', '#ffc22e', '<path d="M30 62 a8 8 0 1 1 10 6" fill="none" stroke="#ff8a65" stroke-width="5"/>'
    '<path d="M70 56 q10 -10 20 0 q-10 6 -20 0Z" fill="#3d3a5a"/><path d="M50 70 q10 -10 20 0 q-10 6 -20 0Z" fill="#3d3a5a"/>' + dots([(56, 56), (86, 68), (40, 72)], 3, '#6cbf5a')
    + '<path d="M92 60 a8 5 0 0 1 12 0Z" fill="#fff07a"/>' + dots([(64, 62), (78, 70)], 3, '#e8455a'), rx=48))
E['bibimbap'] = ('bowl', bowl('#4a4a52', '#fff', mound=40, top=
    '<path d="M30 60 L44 46 L56 58Z" fill="#4fae5c"/><path d="M56 58 L62 42 L74 44 L70 58Z" fill="#ff9a3c"/><path d="M70 58 L80 44 L96 58Z" fill="#fff8d8"/>'
    '<path d="M38 62 L48 52 L58 62Z" fill="#a8583a"/><path d="M72 62 L84 54 L92 64Z" fill="#e8455a"/><circle cx="64" cy="52" r="7" fill="#ffc22e"/>'))
E['gapao-rice'] = ('bowl', oval_plate() + '<path d="M22 82 Q24 62 46 60 Q60 62 60 80 Q50 92 30 90Z" fill="#fff"/>'
    + '<path d="M58 80 Q60 60 84 60 Q104 62 104 80 Q96 92 70 92Z" fill="#a8603a"/>' + dots([(72, 70), (88, 72)], 3, '#e8455a') + leaf(82, 64, 14, 5, -20, '#3d8a4a')
    + '<path d="M28 66 Q30 54 46 54 Q60 56 58 66 Q44 72 28 66Z" fill="#fff"/><circle cx="44" cy="62" r="6" fill="#ffc22e"/>')
E['taco-rice'] = ('bowl', oval_plate() + '<path d="M24 82 Q26 60 64 58 Q102 60 104 82Z" fill="#fff"/><path d="M30 78 Q34 62 64 62 Q94 62 98 78Z" fill="#a8603a"/>'
    + '<path d="M34 70 q10 -8 20 0 q-10 6 -20 0Z M74 68 q10 -8 20 0 q-10 6 -20 0Z" fill="#9bd36a"/>' + ''.join(f'<path d="M{x} {y} l6 -4" stroke="#ffc22e" stroke-width="3"/>' for x, y in [(52, 66), (60, 72), (68, 64)])
    + dots([(58, 64), (80, 74), (44, 76)], 3, '#e8455a'))
E['loco-moco'] = ('bowl', oval_plate() + '<path d="M22 84 Q22 62 46 60 Q60 64 58 84Z" fill="#fff"/>' + '<ellipse cx="72" cy="76" rx="26" ry="14" fill="#8a4a2e"/>'
    + '<path d="M48 78 Q60 62 76 60 Q96 62 98 76 Q84 70 74 80 Q62 74 48 78Z" fill="#5e2a18"/>'
    + '<path d="M58 64 Q60 52 74 52 Q90 52 90 62 Q74 68 58 64Z" fill="#fff"/><circle cx="74" cy="58" r="6" fill="#ffc22e"/>' + '<circle cx="34" cy="68" r="7" fill="#6cbf5a"/>')
E['risotto'] = ('staple', '<ellipse cx="64" cy="82" rx="54" ry="20" fill="#fff"/><ellipse cx="64" cy="80" rx="38" ry="13" fill="#f6eadc" stroke="none"/>'
    + '<path d="M32 80 Q36 64 64 64 Q92 64 96 80 Q64 90 32 80Z" fill="#fff4d0"/>' + dots([(48, 74), (58, 70), (70, 72), (80, 76), (62, 78)], 2, '#e8dcb0', False)
    + shiitake(56, 76) + dots([(74, 70), (84, 72)], 2.4, '#4fae5c', False))
E['kaisendon'] = ('bowl', donburi('<rect x="30" y="46" width="16" height="12" rx="3" fill="#e8455a"/><rect x="46" y="42" width="16" height="12" rx="3" fill="#ff8a5c"/>'
    '<rect x="62" y="42" width="16" height="12" rx="3" fill="#fff4ec"/><path d="M66 46 h8" stroke="#ff8a5c" stroke-width="2"/><rect x="78" y="46" width="16" height="12" rx="3" fill="#f6f2ea"/>'
    + dots([(46, 60), (52, 58), (58, 60)], 3, '#ff4a3a') + '<path d="M64 58 l10 -2 l-2 6Z" fill="#ffd94d"/>' + leaf(86, 60, 14, 5, 0, '#4fae5c'), '#2f4a6a'))
E['unadon'] = ('bowl', donburi('<rect x="30" y="44" width="68" height="16" rx="6" fill="#a8582e"/><path d="M36 50 h56" stroke="#6b3a24" stroke-width="3"/><path d="M36 46 q12 6 22 0 M66 46 q12 6 22 0" fill="none" stroke="#e8a878" stroke-width="2"/>', '#2f2a2a'))
E['negitoro-don'] = ('bowl', donburi('<path d="M34 58 Q38 42 64 42 Q90 42 94 58 Q64 64 34 58Z" fill="#ff8a9a"/>' + negi([(52, 50), (62, 46), (72, 50), (66, 54)]) + '<path d="M80 52 l6 -6" stroke="#4fae5c" stroke-width="3"/>'))
E['tanindon'] = ('bowl', donburi('<path d="M28 60 q4 -16 20 -14 q10 -12 26 -6 q16 -4 22 10 q8 6 2 12 Q64 70 30 64Z" fill="#ffd94d"/>'
    '<path d="M44 52 q10 -8 20 -2 l-2 8 q-10 2 -18 -6Z M68 50 q10 -6 18 2 l-4 6 q-8 0 -14 -8Z" fill="#b0603c"/><path d="M60 42 q6 -8 12 -2" fill="none" stroke="#4fae5c" stroke-width="3"/>', '#b48ad0'))
E['sauce-katsudon'] = ('bowl', donburi('<path d="M30 58 q10 -10 24 -6 q12 -8 26 -2 q12 -2 16 8 Q64 66 30 58Z" fill="#c9e8a0"/>'
    + ''.join(f'<rect x="{36 + i * 18}" y="{42 + (i % 2) * 2}" width="18" height="14" rx="3" fill="#5e2a18"/>' for i in range(3)) + '<path d="M40 44 h10 M58 46 h10 M76 44 h10" stroke="#a8603a" stroke-width="2"/>'))
E['roast-beef-don'] = ('bowl', donburi(''.join(f'<path d="M{x-14} {y+6} Q{x-12} {y-8} {x} {y-8} Q{x+12} {y-8} {x+14} {y+6}Z" fill="#c9465a"/><path d="M{x-12} {y+4} Q{x} {y-12} {x+12} {y+4}" fill="none" stroke="#8a3a3a" stroke-width="3"/>' for x, y in [(42, 54), (64, 48), (86, 54)])
    + '<circle cx="64" cy="56" r="6" fill="#ffc22e"/>' + negi([(50, 60), (78, 60)])))
E['tenshinhan'] = ('bowl', oval_plate() + omelet_dome(64, 74, 40, 22, '#ffd94d') + '<path d="M20 82 Q24 92 64 94 Q104 92 108 82 Q100 88 64 88 Q28 88 20 82Z" fill="#e8783a" fill-opacity=".85"/>'
    + '<path d="M40 64 q12 -6 24 0 t22 0" fill="none" stroke="#e8783a" stroke-width="5"/>' + dots([(54, 70), (76, 72)], 3, '#6cbf5a'))
E['okayu'] = GENRE['kayu']
E['sekihan'] = ('staple', rice_bowl('#f2b8b8', dots([(50, 52), (60, 46), (72, 50), (80, 56), (56, 58), (68, 58)], 3, '#8a3a4a') + dots([(64, 40), (70, 42)], 1.4, INK, False)))
E['inari-sushi'] = K['いなりずし']
E['chirashi-sushi'] = K['ばらずし']
E['futomaki'] = ('staple', plate() + ''.join(f'<rect x="{x-17}" y="{y-16}" width="34" height="32" rx="12" fill="#2f4a3a"/><circle cx="{x}" cy="{y}" r="12" fill="#fff" stroke="none"/>'
    + dots([(x - 4, y - 4)], 3.2, '#ffd94d', False) + dots([(x + 5, y - 2)], 3, '#ff8aa0', False) + dots([(x - 2, y + 5)], 3, '#4fae5c', False) + dots([(x + 5, y + 5)], 2.6, '#c9823e', False)
    for x, y in [(42, 74), (84, 74)]))
E['ochazuke-salmon'] = ('staple', bowl('#7fa8e8', '#d8e8a0', mound=None, top='<path d="M36 58 Q40 50 64 50 Q88 50 92 58 Q64 64 36 58Z" fill="#fff"/>'
    '<path d="M48 52 q8 -6 18 -2 l-2 6 q-8 2 -16 -4Z" fill="#ff8a5c"/><path d="M68 52 l14 -2" stroke="#2f4a3a" stroke-width="4"/>' + dots([(78, 56), (56, 58)], 2, '#4fae5c', False)))
E['zosui-egg'] = ('staple', bowl('#c97a4a', '#f2dcae', rx=44, top='<path d="M32 60 q8 -10 18 -4 q8 -8 18 0 q10 -6 18 2 q6 4 6 8 Q64 70 32 60Z" fill="#ffd94d"/>' + negi([(48, 58), (64, 54), (78, 60)])
    + '<path d="M58 34 q-4 -6 0 -12 M70 34 q-4 -6 0 -12" fill="none" stroke="#fff" stroke-width="3"/>'))
E['zoni-kanto'] = GENRE['zoni']
# 麺
def ramen(soup, top, color='#ff8a73', noodle='#ffe48a'):
    return bowl(color, soup, rx=48, top=f'<path d="M30 62 q10 5 20 0 t20 0 t20 0" fill="none" stroke="{noodle}" stroke-width="4"/>' + top)

def pasta_plate(sauce, top='', noodle='#ffd977'):
    return (plate() + f'<path d="M28 84 Q28 58 64 56 Q100 58 100 84Z" fill="{noodle}"/>'
            '<path d="M34 78 q8 -10 16 0 t16 0 t16 0 t14 0 M38 68 q8 -8 14 0 t14 0 t14 0" fill="none" stroke="#e8b52e" stroke-width="2.5"/>'
            + (f'<path d="M30 82 Q34 62 64 62 Q94 62 98 82 Q64 90 30 82Z" fill="{sauce}" fill-opacity=".9"/>' if sauce else '') + top)

chashu = '<circle cx="46" cy="54" r="10" fill="#f2c6a0"/><circle cx="46" cy="54" r="4" fill="#e8a888" stroke="none"/>'
egg_half = '<ellipse cx="84" cy="62" rx="9" ry="6" fill="#fff"/><ellipse cx="84" cy="62" rx="4" ry="3" fill="#ffb02e" stroke="none"/>'
nori = '<rect x="70" y="42" width="14" height="18" rx="2" fill="#2f4a3a" transform="rotate(-10 77 51)"/>'
E['curry-udon'] = ('noodle', bowl('#7fa8e8', '#d9902e', rx=46, top=thick_noodles('#fffaf0') + '<path d="M30 60 q20 -10 40 -2 q20 -6 30 2" fill="none" stroke="#c97a22" stroke-width="5"/>' + negi([(50, 52), (66, 50), (80, 56)])))
E['yaki-udon'] = ('noodle', plate() + '<path d="M26 84 Q28 58 64 56 Q100 58 102 84Z" fill="#d9a45a"/>' + thick_noodles('#f2d8a0').replace('M28 60', 'M30 74').replace('M36 67', 'M38 80')
    + '<path d="M40 66 q10 -8 20 0 q-10 6 -20 0Z" fill="#c9eba0"/><path d="M66 64 q8 -6 16 0 l-2 6 q-8 2 -14 -6Z" fill="#e8a888"/>' + '<path d="M52 60 l4 -6 l4 6 l4 -6 l4 6" fill="#f2c6a0" stroke-width="2"/>')
E['kamatama-udon'] = ('noodle', bowl('#fff', '#fffaf0', rx=44, top=thick_noodles('#fffaf0') + '<ellipse cx="64" cy="56" rx="14" ry="8" fill="#ffd94d"/><circle cx="64" cy="56" r="6" fill="#ffb02e" stroke="none"/>' + negi([(44, 54), (84, 56)])))
E['zaru-udon'] = ('noodle', D['zaru-soba'][1].replace('#a89580', '#fffaf0').replace('#7d6a58', '#e8dcc4'))
E['nabeyaki-udon'] = ('noodle', donabe(thick_noodles('#fffaf0') + '<ellipse cx="72" cy="58" rx="12" ry="7" fill="#fff"/><circle cx="72" cy="58" r="5" fill="#ffb02e" stroke="none"/>'
    + '<g transform="rotate(-20 46 60)"><rect x="30" y="54" width="30" height="12" rx="6" fill="#ffd77a"/></g>' + shiitake(92, 66) + kama(52, 74, 14)))
E['tororo-soba'] = ('noodle', noodle_bowl('soba', '<path d="M44 58 Q48 44 66 44 Q84 44 86 58Z" fill="#fffdf2"/><circle cx="66" cy="50" r="5" fill="#ffc22e"/>' + '<rect x="78" y="44" width="10" height="4" fill="#2f4a3a" stroke-width="1.5"/>'))
E['kamo-nanban'] = ('noodle', noodle_bowl('soba', '<path d="M56 50 q8 -8 16 -2 q8 -8 16 2 l-2 10 q-14 4 -30 0Z" fill="#c9605a"/><path d="M60 54 q12 -4 24 0" fill="none" stroke="#fff4dc" stroke-width="2.5"/>'
    + '<path d="M34 56 l14 -4" stroke="#fff" stroke-width="7"/><path d="M34 56 l14 -4" stroke="#9bd36a" stroke-width="3"/>'))
E['hiyashi-chuka'] = ('noodle', '<ellipse cx="64" cy="84" rx="54" ry="22" fill="#7fa8e8"/><ellipse cx="64" cy="80" rx="44" ry="16" fill="#ffe48a"/>'
    + ''.join(f'<path d="M64 80 L{64 + 38 * math.cos(a):.0f} {80 + 14 * math.sin(a):.0f}" stroke="{c}" stroke-width="7"/>' for a, c in
              [(3.6, '#ffd94d'), (4.4, '#7cc98a'), (5.2, '#ff9aa8'), (6.0, '#ffd94d'), (0.6, '#7cc98a'), (1.6, '#ff9aa8'), (2.6, '#ff8a65')])
    + '<circle cx="64" cy="80" r="6" fill="#e8455a"/><path d="M90 66 l8 -4 l2 6Z" fill="#ffd21f" stroke-width="2"/>')
E['miso-ramen'] = ('noodle', ramen('#e0a050', chashu + '<path d="M60 52 q10 -8 20 0 q-10 6 -20 0Z" fill="#fffaf0"/>' + dots([(70, 60), (80, 56)], 3, '#ffe07a') + negi([(62, 62), (88, 58)])))
E['shio-ramen'] = ('noodle', ramen('#f2e2b8', chashu + egg_half + '<path d="M60 52 l10 -6 l4 8Z" fill="#3d7a4a"/>' + negi([(66, 60), (72, 56)])))
E['tonkotsu-ramen'] = ('noodle', ramen('#f6eedc', chashu + nori + '<path d="M58 60 q6 -4 10 0" fill="none" stroke="#e8455a" stroke-width="4"/>' + negi([(62, 50), (66, 54), (86, 62), (90, 58)])))
E['tsukemen'] = ('noodle', '<rect x="10" y="70" width="64" height="34" rx="8" fill="#fff"/><path d="M16 84 q8 -10 16 0 t16 0 t16 0 M18 92 q8 -8 16 0 t16 0 t16 0" fill="none" stroke="#e8b52e" stroke-width="5"/>'
    + '<path d="M70 52 Q72 92 94 92 Q116 92 118 52Z" fill="#ff8a73"/><ellipse cx="94" cy="52" rx="24" ry="8" fill="#b0603c"/>' + negi([(86, 50), (100, 52)]) + '<path d="M18 74 q10 -6 18 0" fill="none" stroke="#ffe48a" stroke-width="3"/>')
E['tantanmen'] = ('noodle', ramen('#e8603a', '<path d="M46 52 Q50 42 64 42 Q78 42 80 52 Q64 58 46 52Z" fill="#a8603a"/>' + dots([(54, 48), (70, 48)], 2, '#5e2a18', False)
    + '<path d="M80 56 q8 -8 16 0 q-8 6 -16 0Z" fill="#4fae5c"/>' + negi([(40, 60), (60, 60)])))
E['napolitan'] = ('noodle', pasta_plate('', '<path d="M30 80 Q34 62 64 62 Q94 62 98 80Z" fill="#ff7a4a" fill-opacity=".7"/>' + ''.join(f'<path d="M{x} {y} q6 -6 12 0" fill="none" stroke="#7cc98a" stroke-width="4"/>' for x, y in [(42, 70), (70, 66)])
    + '<rect x="56" y="70" width="12" height="6" rx="3" fill="#ff8a8a"/><rect x="80" y="74" width="12" height="6" rx="3" fill="#ff8a8a"/>'))
E['carbonara'] = ('noodle', pasta_plate('#fff4c8', dots([(48, 70), (70, 66), (80, 74)], 3.5, '#e8a888') + '<circle cx="62" cy="72" r="6" fill="#ffc22e"/>' + dots([(54, 64), (76, 62), (42, 76)], 1.2, INK, False)))
E['peperoncino'] = ('noodle', pasta_plate('', dots([(46, 70), (62, 64), (80, 72)], 2.5, '#e8455a') + ''.join(f'<ellipse cx="{x}" cy="{y}" rx="4" ry="2.5" fill="#fff8d8" stroke-width="1.5"/>' for x, y in [(54, 74), (72, 70), (88, 76)])
    + dots([(58, 68), (76, 78), (42, 78)], 2, '#4fae5c', False)))
E['tarako-spaghetti'] = ('noodle', pasta_plate('#ffc0b8', dots([(48, 70), (58, 66), (70, 70), (80, 66), (64, 76)], 1.6, '#ff8a7a', False) + '<path d="M56 62 l14 -2" stroke="#2f4a3a" stroke-width="4"/>' + leaf(76, 64, 12, 4, -10, '#4fae5c')))
E['vongole'] = ('noodle', pasta_plate('', ''.join(f'<path d="M{x-8} {y} a8 7 0 0 1 16 0Z" fill="#e8dcc8"/><path d="M{x-4} {y-4} l4 -2 l4 2" fill="none" stroke="#a89580" stroke-width="1.5"/>' for x, y in [(46, 72), (64, 66), (82, 72), (60, 80)])
    + dots([(54, 66), (72, 76)], 2, '#4fae5c', False)))
E['wafu-kinoko-pasta'] = ('noodle', pasta_plate('#e8c890', shiitake(48, 70) + shiitake(74, 68) + dots([(60, 74), (64, 70), (68, 74)], 2.5, '#fffaf0') + '<path d="M56 62 l14 -2" stroke="#2f4a3a" stroke-width="4"/>' + negi([(84, 76)])))
E['lasagna'] = ('noodle', plate() + '<path d="M28 88 L36 56 H92 L100 88Z" fill="#ffd977"/>' + ''.join(f'<path d="M{30 + i} {66 + i * 7} H{98 - i}" stroke="{c}" stroke-width="5"/>' for i, c in enumerate(['#c4452e', '#fff4c8', '#c4452e']))
    + '<path d="M36 56 Q64 46 92 56" fill="#e8a82e"/>' + dots([(50, 58), (72, 56)], 2.5, '#c97a22', False) + '<circle cx="64" cy="52" r="4" fill="#6cbf5a"/>')
E['pho'] = ('noodle', bowl('#fff', '#f6eedc', rx=46, top='<path d="M30 60 q10 5 20 0 t20 0 t20 0" fill="none" stroke="#fffaf0" stroke-width="6"/><path d="M30 60 q10 5 20 0 t20 0 t20 0" fill="none" stroke-width="1.5"/>'
    + '<path d="M40 52 q10 -8 20 0 l-2 6 q-10 2 -18 -6Z" fill="#e8a8a0"/>' + leaf(76, 52, 18, 6, -20, '#4fae5c') + leaf(84, 60, 16, 5, 10, '#6cbf5a') + '<path d="M58 62 q4 -6 8 0 q-4 4 -8 0Z" fill="#c9eba0" stroke-width="2"/>'
    + '<path d="M94 46 a8 8 0 0 1 12 6Z" fill="#c9eba0"/>'))
E['reimen'] = ('noodle', bowl('#cfe6fa', '#f6e4d0', rx=46, top='<path d="M30 60 q10 5 20 0 t20 0 t20 0" fill="none" stroke="#a89a8a" stroke-width="4"/>' + '<ellipse cx="50" cy="52" rx="10" ry="6" fill="#fff"/><ellipse cx="50" cy="52" rx="4" ry="3" fill="#ffb02e" stroke="none"/>'
    + '<path d="M64 48 l18 -2 l-2 6 l-16 2Z" fill="#c98a7a"/><path d="M70 58 l16 -2" stroke="#e8455a" stroke-width="5"/>' + dots([(84, 62)], 5, '#c9eba0')))
E['cup-ramen'] = ('noodle', '<path d="M30 40 L40 104 H88 L98 40Z" fill="#fff"/><path d="M34 62 L37 82 H91 L94 62Z" fill="#ff6b5a" stroke="none"/><path d="M30 40 L40 104 H88 L98 40" fill="none"/>'
    + '<ellipse cx="64" cy="40" rx="34" ry="8" fill="#e8b878"/><path d="M42 40 q8 -6 14 0 t14 0 t14 0" fill="none" stroke="#c9944a" stroke-width="2.5"/>' + dots([(50, 38), (74, 40)], 2.5, '#4fae5c')
    + '<path d="M58 26 q-4 -6 0 -12 M72 26 q-4 -6 0 -12" fill="none" stroke="#fff" stroke-width="3"/><path d="M48 72 h32" stroke="#fff" stroke-width="3"/>')
E['somen'] = GENRE['somen']
E['champon'] = K['ちゃんぽん']
E['sara-udon'] = K['皿うどん']
# パン
def bun_sandwich(fillings, top='#d9984a'):
    out = '<path d="M26 90 Q26 82 34 82 H94 Q102 82 102 90 Q102 98 94 98 H34 Q26 98 26 90Z" fill="' + top + '"/>'
    y = 82
    for c, h in fillings:
        out += f'<rect x="22" y="{y-h}" width="84" height="{h}" rx="{h/2}" fill="{c}"/>'
        y -= h
    return out + f'<path d="M26 {y} Q28 {y-30} 64 {y-30} Q100 {y-30} 102 {y}Z" fill="{top}"/>' + dots([(50, y - 18), (64, y - 22), (78, y - 18)], 1.8, '#fff8e0', False)

def sando(x, y, filling):
    return (f'<path d="M{x-24} {y+18} L{x} {y-22} L{x+24} {y+18}Z" fill="#fffaf0"/><path d="M{x-24} {y+18} L{x} {y-22} L{x+24} {y+18}" fill="none" stroke="#e8c890" stroke-width="5"/>'
            f'<path d="M{x-24} {y+18} L{x} {y-22} L{x+24} {y+18}" fill="none"/><path d="M{x-16} {y+12} L{x} {y-14} L{x+16} {y+12}" fill="none" stroke="{filling}" stroke-width="5"/>')

E['french-toast'] = ('bread', plate() + '<rect x="30" y="54" width="44" height="34" rx="8" fill="#f2b84a" transform="rotate(-8 52 71)"/><rect x="56" y="58" width="44" height="34" rx="8" fill="#e8a83a" transform="rotate(8 78 75)"/>'
    + '<rect x="64" y="62" width="14" height="10" rx="2" fill="#fff3a8"/><path d="M40 64 q10 4 20 0" fill="none" stroke="#ffe08a" stroke-width="3"/>' + dots([(46, 76), (84, 84)], 1.6, '#fff', False))
E['mixed-sandwich'] = ('bread', plate() + sando(44, 70, '#ffd94d') + sando(84, 70, '#7cc98a').replace('#7cc98a', '#7cc98a', 1) + '<path d="M70 84 h28" stroke="#ff8a8a" stroke-width="3"/>')
E['egg-sandwich'] = ('bread', plate() + sando(44, 70, '#ffd94d') + sando(84, 70, '#ffd94d'))
E['hot-dog'] = ('bread', plate() + '<path d="M16 76 Q16 60 32 60 H96 Q112 60 112 76 Q112 92 96 92 H32 Q16 92 16 76Z" fill="#e3a256"/>'
    + '<rect x="14" y="62" width="100" height="16" rx="8" fill="#c9503a"/><path d="M24 66 q8 -6 16 0 t16 0 t16 0 t16 0 t10 0" fill="none" stroke="#ffd21f" stroke-width="3"/><path d="M30 74 q8 -4 16 0 t16 0 t16 0 t16 0" fill="none" stroke="#e8455a" stroke-width="2.5"/>')
E['hamburger'] = ('bread', bun_sandwich([('#5e2a18', 12), ('#ff6b5a', 6), ('#8fd36a', 6)]))
E['cheeseburger'] = ('bread', bun_sandwich([('#5e2a18', 12), ('#ffc22e', 6), ('#8fd36a', 6)]))
E['pizza-margherita'] = ('bread', '<circle cx="64" cy="72" r="42" fill="#e8a24a"/><circle cx="64" cy="72" r="34" fill="#e0573a" stroke="none"/>'
    + ''.join(f'<ellipse cx="{x}" cy="{y}" rx="8" ry="6" fill="#fffaf0"/>' for x, y in [(48, 60), (78, 62), (60, 84), (82, 84), (44, 80)])
    + leaf(64, 66, 12, 5, 30, '#3d8a4a') + leaf(70, 80, 12, 5, -20, '#3d8a4a') + '<path d="M64 72 L106 72 M64 72 L43 36" stroke="#c9822e" stroke-width="2"/>')
# 主菜
def kushi_yaki(fill, glaze='', mark='#6b3a24'):
    out = ''
    for x, r in [(46, -8), (82, 8)]:
        out += f'<g transform="rotate({r} {x} 64)"><path d="M{x} 24 V108" stroke="#d9b07a" stroke-width="4"/>'
        for i in range(4):
            y = 36 + i * 16
            c = '#fff' if glaze == 'negi' and i % 2 else fill
            out += f'<rect x="{x-11}" y="{y}" width="22" height="14" rx="5" fill="{c}"/>'
            if glaze == 'negi' and i % 2:
                out += f'<path d="M{x-8} {y+7} h16" stroke="#9bd36a" stroke-width="2"/>'
            else:
                out += f'<path d="M{x-6} {y+4} l4 6 m4 -6 l4 6" stroke="{mark}" stroke-width="2"/>'
        out += '</g>'
    return plate(cy=96, rx=48, ry=12) + out

E['saba-misoni'] = ('main', bowl('#fff', '#c9844a', rx=46, top='<path d="M34 60 Q36 46 60 46 Q86 46 92 58 Q86 66 60 66 Q38 66 34 60Z" fill="#8fa4b8"/><path d="M38 60 Q62 68 90 58" fill="none" stroke="#e8b878" stroke-width="5"/>'
    '<path d="M48 52 l4 4 m8 -6 l4 4" stroke="#fff" stroke-width="2.5"/><path d="M76 52 l8 -4 M78 56 l8 -4" stroke="#ffe07a" stroke-width="2"/>'))
E['karei-nitsuke'] = ('main', long_plate() + flat_fish('#a8784a') + '<path d="M34 92 Q64 98 98 92" fill="none" stroke="#6b3a24" stroke-width="4"/><path d="M96 98 l10 -4" stroke="#4fae5c" stroke-width="4"/>')
E['gindara-saikyoyaki'] = ('main', long_plate() + fillet('#fff4e4', '#3a3a42', '#d9984a') + '<path d="M50 70 l8 6 M66 66 l8 6" stroke="#8a4a2e" stroke-width="3"/>' + '<path d="M96 96 l8 -14" stroke="#ff8aa0" stroke-width="4"/>')
E['unagi-kabayaki'] = ('main', long_plate() + '<rect x="20" y="62" width="88" height="26" rx="8" fill="#a8582e"/><path d="M26 72 h76 M26 80 h76" stroke="#6b3a24" stroke-width="2.5"/>'
    + '<path d="M28 66 q20 6 36 0 t36 0" fill="none" stroke="#e8a878" stroke-width="2.5"/>' + skewer_stick(30, 56, 30, 96) + skewer_stick(98, 56, 98, 96))
E['ebi-chili'] = ('main', plate() + '<path d="M26 84 Q28 60 64 58 Q100 60 102 84Z" fill="#ff7a4a"/>' + ''.join(f'<path d="M{x} {y} a10 10 0 1 1 12 8" fill="none" stroke="{INK}" stroke-width="10"/><path d="M{x} {y} a10 10 0 1 1 12 8" fill="none" stroke="#ffb08a" stroke-width="6"/>' for x, y in [(40, 74), (62, 68), (80, 76)]) + negi([(56, 80), (74, 62)]))
E['ika-fry'] = ('main', plate() + cabbage(36, 76) + ''.join(ring(x, y, 12, '#e8a24a', '#f6eee2') for x, y in [(62, 66), (84, 72), (70, 84)]) + '<path d="M96 56 l12 4 q-4 10 -12 -4Z" fill="#fff07a"/>')
E['chicken-katsu'] = ('main', plate() + cabbage(38, 76) + ''.join(f'<rect x="{54 + i * 14}" y="{56 + i * 2}" width="14" height="28" rx="3" fill="#e8a24a" transform="rotate(-10 {61 + i * 14} {70 + i * 2})"/><rect x="{56 + i * 14}" y="{60 + i * 2}" width="10" height="20" fill="#fff4dc" stroke="none" transform="rotate(-10 {61 + i * 14} {70 + i * 2})"/>' for i in range(3))
    + '<path d="M56 60 q20 -8 40 0" fill="none" stroke="#6b3a24" stroke-width="4"/>')
E['banbanji'] = ('main', plate() + '<path d="M26 84 Q30 66 50 66 L54 84Z" fill="#c9eba0"/>' + ''.join(f'<rect x="{44 + i * 12}" y="{58 - i}" width="14" height="24" rx="3" fill="#fff8ec" transform="rotate(14 {51 + i * 12} {70 - i})"/>' for i in range(4))
    + '<path d="M44 62 q20 10 48 -2" fill="none" stroke="#d9a45a" stroke-width="5"/>' + dots([(60, 64), (78, 64)], 2, '#fff', False) + '<circle cx="96" cy="82" r="6" fill="#ff6b5a"/>')
E['buta-kakuni'] = ('main', small_dish(''.join(f'<rect x="{x}" y="{y}" width="24" height="22" rx="5" fill="#8a4a2e"/><path d="M{x} {y+7} h24 M{x} {y+14} h24" stroke="#f2c8a0" stroke-width="3"/>' for x, y in [(36, 60), (62, 58)])
    + '<ellipse cx="94" cy="74" rx="9" ry="7" fill="#fff"/><ellipse cx="94" cy="74" rx="4" ry="3" fill="#ffb02e" stroke="none"/><path d="M42 86 q8 -6 14 0" fill="none" stroke="#4fae5c" stroke-width="4"/>', '#fff4dc'))
E['hoikoro'] = ('main', plate() + '<path d="M26 84 Q28 58 64 56 Q100 58 102 84Z" fill="#c9eba0"/>' + '<path d="M36 70 q10 -8 20 0 l-2 8 q-10 2 -18 -8Z M64 62 q10 -8 20 0 l-2 8 q-10 2 -18 -8Z" fill="#e8a8a0"/>'
    + '<path d="M50 80 q10 -6 20 0" fill="none" stroke="#a8603a" stroke-width="5"/><path d="M76 78 l12 -4" stroke="#e8455a" stroke-width="5"/><path d="M40 82 l10 -2" stroke="#4fae5c" stroke-width="4"/>')
E['chinjao-rosu'] = ('main', plate() + ''.join(f'<path d="M{x} {y} l{dx} -10" stroke="{c}" stroke-width="5"/>' for x, y, dx, c in
    [(34, 80, 14, '#4fae5c'), (44, 82, 16, '#8a4a2e'), (54, 78, 16, '#4fae5c'), (62, 82, 14, '#fffaf0'), (70, 80, 16, '#8a4a2e'), (80, 82, 14, '#4fae5c'), (48, 70, 14, '#8a4a2e'), (66, 68, 16, '#4fae5c'), (84, 72, 12, '#fffaf0')]))
E['butashabu-salad'] = ('main', plate() + '<path d="M26 84 Q28 56 64 54 Q100 56 102 84Z" fill="#8fd36a"/>' + '<path d="M38 70 q10 -10 24 -4 q-4 10 -24 4Z M60 62 q12 -8 24 0 q-8 10 -24 0Z M56 76 q12 -8 24 0 q-10 8 -24 0Z" fill="#f6ded8"/>'
    + '<circle cx="86" cy="76" r="7" fill="#ff6b5a"/><circle cx="40" cy="80" r="6" fill="#ff6b5a"/>' + '<path d="M48 66 q16 6 30 -4" fill="none" stroke="#d9a45a" stroke-width="3"/>')
E['pork-saute'] = ('main', plate() + '<path d="M26 78 Q28 56 56 58 Q82 56 84 76 Q84 92 56 92 Q28 92 26 78Z" fill="#c9844a"/><path d="M32 64 Q56 54 80 66" fill="none" stroke="#fff4dc" stroke-width="4"/>'
    + '<path d="M40 74 l20 -4 M42 82 l22 -4" stroke="#8a4a2e" stroke-width="3"/>' + garnish())
E['meatball'] = ('main', plate() + ''.join(f'<circle cx="{x}" cy="{y}" r="12" fill="#a8582e"/><path d="M{x-6} {y-5} q4 -3 8 -1" fill="none" stroke="#e8a878" stroke-width="2.5"/>' for x, y in [(44, 78), (64, 70), (84, 78), (64, 86)])
    + '<path d="M34 70 Q64 56 94 70" fill="none" stroke="#c4452e" stroke-width="4"/><circle cx="100" cy="66" r="5" fill="#6cbf5a"/>')
E['roll-cabbage'] = ('main', bowl('#fff', '#f2b06a', rx=46, top='<ellipse cx="50" cy="56" rx="18" ry="12" fill="#c9eba0"/><ellipse cx="78" cy="56" rx="18" ry="12" fill="#b8e090"/>'
    + '<path d="M40 52 q10 -6 20 2 M68 52 q10 -6 20 2" fill="none" stroke="#8cc46a" stroke-width="2.5"/><path d="M50 44 v24 M78 44 v24" stroke="#f2d070" stroke-width="3"/>'))
E['pot-au-feu'] = ('main', bowl('#7fa8e8', '#fff1d6', rx=46, top='<ellipse cx="44" cy="58" rx="10" ry="8" fill="#ffe07a"/><path d="M56 52 l14 -4 l-4 12Z" fill="#ff9a3c"/>'
    '<path d="M70 54 q8 -8 18 -2 q-8 8 -18 2Z" fill="#c9eba0"/>' + '<rect x="56" y="58" width="22" height="8" rx="4" fill="#d9846a"/>' + '<path d="M80 62 q6 -6 12 0 q-6 4 -12 0Z" fill="#fff" stroke-width="2"/>'))
E['yakiniku-karubi'] = ('main', '<circle cx="64" cy="76" r="44" fill="#5a5a62"/>' + ''.join(f'<path d="M{24 + i * 10} {50 + abs(4 - i) * 2} V{102 - abs(4 - i) * 2}" stroke="#8a8a92" stroke-width="3"/>' for i in range(9))
    + '<path d="M36 70 q10 -10 22 -4 l-4 12 q-12 2 -18 -8Z M64 64 q12 -8 22 0 l-4 12 q-12 0 -18 -12Z M48 86 q12 -8 22 0 l-4 10 q-12 0 -18 -10Z" fill="#b0503c"/>'
    + '<path d="M40 70 q8 -4 14 0 M68 68 q8 -4 14 0" fill="none" stroke="#f2c8b8" stroke-width="2.5"/><circle cx="84" cy="88" r="7" fill="#fff8d8"/>')
E['shabushabu'] = ('main', donabe('<path d="M44 70 a20 6 0 0 1 40 0" fill="none" stroke-width="2"/>' + '<path d="M30 64 q10 -6 20 0 q-10 6 -20 0Z" fill="#c9eba0"/>' + '<rect x="78" y="62" width="14" height="10" rx="2" fill="#fff"/>' + negi([(60, 74), (70, 72)])).replace('#f5d99a', '#fff4e0')
    + '<path d="M54 36 q10 -8 22 -2 q-6 14 -22 2Z" fill="#f6c8c0"/><path d="M60 38 q8 -2 12 2" fill="none" stroke="#fff" stroke-width="2"/>')
E['gyuniku-shigureni'] = ('main', small_dish('<path d="M30 80 Q32 60 64 58 Q96 60 98 80Z" fill="#8a4a2e"/><path d="M40 70 q10 -6 18 0 M64 66 q10 -6 18 0 M50 78 q10 -6 18 0" fill="none" stroke="#c98a5a" stroke-width="3"/>'
    + ''.join(f'<path d="M{x} {y} l6 -2" stroke="#ffe07a" stroke-width="3"/>' for x, y in [(54, 64), (76, 74), (44, 76)]), '#cfe6fa'))
E['mabo-nasu'] = ('main', bowl('#fff', '#e0573a', rx=46, top=''.join(f'<path d="M{x-10} {y} a10 6 0 0 0 20 0Z" fill="#8a4a8e"/><path d="M{x-8} {y+1} a8 3 0 0 0 16 0" fill="#f2e2c8" stroke="none"/>' for x, y in [(42, 56), (64, 52), (84, 58), (56, 64)]) + negi([(74, 64), (48, 50)])))
E['ebi-mayo'] = ('main', plate() + '<path d="M26 84 Q30 66 50 64 L56 84Z" fill="#c9eba0"/>' + ''.join(f'<path d="M{x} {y} a10 10 0 1 1 12 8" fill="none" stroke="{INK}" stroke-width="12"/><path d="M{x} {y} a10 10 0 1 1 12 8" fill="none" stroke="#fff4dc" stroke-width="8"/><path d="M{x} {y} a10 10 0 1 1 12 8" fill="none" stroke="#ffb08a" stroke-width="3"/>' for x, y in [(58, 72), (80, 76)]))
E['yurinchi'] = ('main', plate() + cabbage(36, 76) + ''.join(f'<rect x="{50 + i * 14}" y="{60 + i * 2}" width="14" height="24" rx="3" fill="#e8a24a" transform="rotate(-10 {57 + i * 14} {72 + i * 2})"/>' for i in range(3))
    + '<path d="M52 62 q20 -6 40 0" fill="none" stroke="#a8603a" stroke-width="4"/>' + negi([(60, 60), (74, 58), (86, 62)]) + dots([(66, 64)], 2.5, '#e8455a'))
E['quiche'] = ('main', plate() + '<path d="M28 80 L64 50 L100 80 Q64 92 28 80Z" fill="#e8b45a"/><path d="M34 78 L64 54 L96 78 Q64 86 34 78Z" fill="#ffe08a"/>' + dots([(56, 70), (70, 66), (78, 74), (60, 78)], 3, '#4fae5c') + dots([(66, 76)], 3, '#ff8a8a'))
E['omelette'] = ('main', oval_plate() + omelet_dome(60, 76, 36, 18) + '<path d="M40 74 q12 -6 22 -2" fill="none" stroke="#fff3a8" stroke-width="3"/><path d="M62 64 q8 -4 14 2" fill="none" stroke="#e8455a" stroke-width="5"/><circle cx="100" cy="80" r="6" fill="#6cbf5a"/>')
E['scrambled-egg'] = ('main', plate() + '<path d="M30 80 q4 -16 18 -12 q6 -12 20 -6 q12 -8 22 4 q10 4 6 14 q-8 8 -20 4 q-10 6 -22 0 q-14 4 -24 -4Z" fill="#ffd94d"/>'
    + '<path d="M44 72 q6 -4 12 0 M66 68 q6 -4 12 0" fill="none" stroke="#fff3a8" stroke-width="3"/>' + '<rect x="84" y="80" width="20" height="8" rx="4" fill="#ff8a8a"/>')
E['chawanmushi'] = ('side', '<ellipse cx="64" cy="102" rx="34" ry="8" fill="#cfe6fa"/><path d="M36 50 Q36 100 64 100 Q92 100 92 50Z" fill="#fff"/><ellipse cx="64" cy="50" rx="28" ry="9" fill="#fff3b0"/>'
    + kama(56, 48, 12) + '<path d="M66 46 q6 -6 12 0 M70 44 l-2 -6" fill="none" stroke="#4fae5c" stroke-width="3"/>' + '<path d="M40 26 Q40 14 64 14 Q88 14 88 26 Q64 32 40 26Z" fill="#fff" opacity=".9"/><circle cx="64" cy="12" r="4" fill="#fff"/>')
E['yudofu'] = ('main', donabe(''.join(f'<rect x="{x}" y="{y}" width="18" height="12" rx="2" fill="#fff"/>' for x, y in [(32, 60), (54, 56), (76, 60), (44, 70), (66, 70)]) + '<path d="M90 70 q8 -6 14 0" fill="none" stroke="#3d7a4a" stroke-width="5"/>').replace('#f5d99a', '#f2f2ea'))
E['agedashi-tofu'] = ('main', bowl('#fff', '#d9a45a', rx=44, top='<rect x="40" y="44" width="22" height="18" rx="4" fill="#ffd77a"/><rect x="64" y="46" width="22" height="18" rx="4" fill="#ffd77a"/>'
    + '<path d="M56 44 q6 -8 14 -2 q-4 6 -14 2Z" fill="#fff"/>' + negi([(52, 42), (70, 40)]) + '<path d="M74 42 l4 -6" stroke="#ff8a5c" stroke-width="3"/>'))
E['takoyaki'] = ('main', '<path d="M16 72 L28 100 H100 L112 72Z" fill="#e3c98a"/>' + ''.join(f'<circle cx="{x}" cy="{y}" r="12" fill="#e8a24a"/>' for x, y in [(40, 70), (64, 68), (88, 70), (52, 84), (76, 84)])
    + '<path d="M30 70 q10 -8 20 0 t20 0 t20 0 t10 0 M42 84 q10 -6 20 0 t20 0" fill="none" stroke="#6b3a24" stroke-width="5"/><path d="M34 72 l6 4 l6 -4 l6 4 M58 70 l6 4 l6 -4 M82 72 l6 4" fill="none" stroke="#fffaf0" stroke-width="2"/>'
    + dots([(44, 64), (68, 62), (90, 64), (56, 80), (80, 80)], 1.6, '#4fae5c', False) + skewer_stick(96, 40, 76, 76))
E['monjayaki'] = ('main', '<rect x="10" y="56" width="108" height="46" rx="6" fill="#5a5a62"/><path d="M26 80 Q30 62 64 62 Q98 62 102 80 Q98 96 64 96 Q30 96 26 80Z" fill="#c9944a"/>'
    + '<path d="M32 80 Q36 70 64 70 Q92 70 96 80 Q90 90 64 90 Q38 90 32 80Z" fill="#e8b878"/>' + dots([(46, 78), (60, 74), (76, 82), (84, 76)], 3, '#c9eba0') + dots([(54, 84), (70, 78)], 2.5, '#e8455a')
    + '<path d="M96 40 l-14 30" stroke="#c9c9d0" stroke-width="5"/><rect x="92" y="28" width="12" height="16" rx="2" fill="#8a5a34" transform="rotate(25 98 36)"/>')
E['yakitori-negima-tare'] = ('main', kushi_yaki('#a8582e', 'negi'))
E['yakitori-momo-shio'] = ('main', kushi_yaki('#f2d8b0', '', '#c9944a') + '<path d="M96 92 a8 8 0 0 1 14 -4Z" fill="#fff07a"/>')
E['oden'] = K['おでん']
E['buri-daikon'] = K['ぶり大根']
E['yosenabe'] = ('main', donabe('<path d="M28 66 q10 -8 22 -2 l-2 8 q-12 2 -20 -6Z" fill="#c9d4e0"/><path d="M52 60 a7 7 0 1 1 9 5" fill="none" stroke="#ff8a65" stroke-width="4.5"/>' + shiitake(76, 62) + '<rect x="84" y="64" width="14" height="10" rx="2" fill="#fff"/>'
    + '<path d="M40 76 q10 -6 20 0 q-10 6 -20 0Z" fill="#c9eba0" stroke-width="2.5"/>' + flower_carrot(70, 76) + negi([(92, 78)])))
E['mizutaki'] = ('main', donabe('<path d="M30 64 q8 -8 18 -2 l-4 10 q-10 0 -14 -8Z M70 60 q8 -8 18 -2 l-4 10 q-10 0 -14 -8Z" fill="#f2d8b0"/><path d="M50 72 q12 -10 26 0 q-12 8 -26 0Z" fill="#c9eba0"/>'
    + '<rect x="52" y="58" width="14" height="10" rx="2" fill="#fff"/>' + negi([(36, 76), (90, 74)])).replace('#f5d99a', '#f6eedc'))
E['motsunabe'] = ('main', donabe('<path d="M36 70 q12 -12 26 0 q14 -12 28 0" fill="none" stroke="#3d8a4a" stroke-width="7"/>' + ''.join(f'<path d="M{x} {y} q4 -6 10 -2 q4 6 -2 8 q-6 2 -8 -6Z" fill="#f6e0d0"/>' for x, y in [(30, 64), (50, 60), (74, 62), (90, 66)])
    + '<path d="M54 74 l18 -4" stroke="#fff" stroke-width="5"/>' + dots([(64, 62), (44, 74)], 2.5, '#e8455a')).replace('#f5d99a', '#d9a45a'))
E['kimchi-nabe'] = ('main', donabe('<path d="M30 64 q10 -10 22 -2 q-10 8 -22 2Z M66 60 q10 -10 22 -2 q-10 8 -22 2Z" fill="#ff7a5a"/><rect x="50" y="62" width="16" height="12" rx="2" fill="#fff"/>'
    + '<path d="M40 74 q10 -6 18 0 l-2 4 q-8 2 -16 -4Z" fill="#e8a8a0"/>' + negi([(76, 74), (86, 72)]) + shiitake(94, 66)).replace('#f5d99a', '#e8603a'))
E['sukiyaki'] = K['すき焼き']
E['goya-champuru'] = K['ゴーヤーチャンプルー']
E['katsuo-tataki'] = K['かつおのたたき']
E['chicken-nanban'] = K['チキン南蛮']
E['chanko-nabe'] = K['ちゃんこ鍋']
E['ishikari-nabe'] = K['石狩鍋']
# 副菜
E['kiriboshi-ni'] = ('side', kobachi(''.join(f'<path d="M{x} {y} q6 -8 14 -6" fill="none" stroke="{c}" stroke-width="4"/>' for x, y, c in [(40, 62, '#f2dcae'), (50, 58, '#f2dcae'), (60, 62, '#ff9a3c'), (68, 56, '#f2dcae'), (76, 62, '#f2dcae'), (54, 52, '#c9823e'), (72, 50, '#ff9a3c')])))
E['hijiki-ni'] = ('side', kobachi('<path d="M38 66 Q40 46 64 46 Q88 46 90 66Z" fill="#3a3a42"/>' + ''.join(f'<path d="M{x} {y} l6 -2" stroke="{c}" stroke-width="4"/>' for x, y, c in [(46, 58, '#ff9a3c'), (64, 52, '#ff9a3c'), (74, 60, '#e8a24a'), (56, 62, '#e8a24a')]) + dots([(60, 56), (80, 56)], 3.5, '#d9b07a')))
E['satoimo-nikkorogashi'] = ('side', kobachi(''.join(f'<ellipse cx="{x}" cy="{y}" rx="11" ry="9" fill="#e8c890"/><path d="M{x-5} {y-4} q4 -2 8 0" fill="none" stroke="#fff4dc" stroke-width="2.5"/>' for x, y in [(48, 58), (70, 56), (60, 48)]) + '<path d="M80 48 l6 -6" stroke="#4fae5c" stroke-width="3"/>'))
E['daikon-ni'] = ('side', kobachi(''.join(f'<ellipse cx="{x}" cy="{y}" rx="14" ry="8" fill="#e8c890"/><ellipse cx="{x}" cy="{y-2}" rx="9" ry="4" fill="#f2d8a8" stroke="none"/>' for x, y in [(50, 58), (76, 56)]) + '<path d="M58 46 q6 -6 12 0 M62 44 l-2 -6" fill="none" stroke="#4fae5c" stroke-width="3"/>'))
E['potato-salad'] = ('side', small_dish('<path d="M30 80 Q30 52 64 52 Q98 52 98 80Z" fill="#fff4c8"/>' + ''.join(f'<circle cx="{x}" cy="{y}" r="5" fill="#c9eba0"/><circle cx="{x}" cy="{y}" r="1.6" fill="#7cba4a" stroke="none"/>' for x, y in [(46, 68), (70, 62)])
    + '<path d="M56 72 l8 -2 l-2 6Z M80 72 l8 -2 l-2 6Z" fill="#ff9a3c" stroke-width="2"/><path d="M50 60 q6 -4 12 0" fill="none" stroke="#fff" stroke-width="3"/>' + '<path d="M86 84 q6 -10 14 -2 q-6 8 -14 2Z" fill="#8fd36a"/>', '#cfe6fa'))
E['macaroni-salad'] = ('side', small_dish('<path d="M30 80 Q30 54 64 54 Q98 54 98 80Z" fill="#fff4dc"/>' + ''.join(f'<path d="M{x} {y} a6 6 0 0 1 10 0" fill="none" stroke="{INK}" stroke-width="7"/><path d="M{x} {y} a6 6 0 0 1 10 0" fill="none" stroke="#ffd977" stroke-width="3.5"/>' for x, y in [(40, 72), (54, 64), (66, 74), (76, 62), (84, 74)])
    + dots([(60, 70)], 3, '#ff9a3c') + '<path d="M86 84 q6 -10 14 -2 q-6 8 -14 2Z" fill="#8fd36a"/>', '#cfe6fa'))
E['caesar-salad'] = ('side', bowl('#e9f7ff', '#8fd36a', rx=46, top='<path d="M26 62 q6 -18 20 -14 q6 -14 20 -10 q14 -8 22 6 q14 0 14 18Z" fill="#a8dc78"/>'
    + ''.join(f'<rect x="{x}" y="{y}" width="10" height="10" rx="2" fill="#e8b45a"/>' for x, y in [(40, 50), (70, 46), (58, 56)]) + '<path d="M44 58 q20 -10 40 0" fill="none" stroke="#fffaf0" stroke-width="4"/>' + dots([(52, 46), (80, 56)], 2, '#fff8d8')))
E['coleslaw'] = ('side', small_dish('<path d="M30 80 Q30 54 64 54 Q98 54 98 80Z" fill="#f2f8e0"/>' + ''.join(f'<path d="M{x} {y} l10 -3" stroke="{c}" stroke-width="3"/>' for x, y, c in [(38, 74, '#b8e090'), (50, 66, '#ff9a3c'), (62, 72, '#b8e090'), (74, 64, '#b8e090'), (84, 72, '#ff9a3c'), (56, 60, '#b8e090')]) + dots([(68, 76), (46, 70)], 2.5, '#ffd94d'), '#ffd0dc'))
E['harusame-salad'] = ('side', small_dish('<path d="M30 80 Q30 54 64 54 Q98 54 98 80Z" fill="#f6f6f0" fill-opacity=".9"/>' + '<path d="M36 74 q8 -8 16 0 t16 0 t16 0 M40 66 q8 -6 14 0 t14 0 t14 0" fill="none" stroke="#e8e2d0" stroke-width="2.5"/>'
    + ''.join(f'<path d="M{x} {y} l10 -3" stroke="{c}" stroke-width="4"/>' for x, y, c in [(42, 70, '#7cc98a'), (58, 64, '#ff9a3c'), (72, 70, '#7cc98a'), (60, 76, '#ff8aa0'), (80, 64, '#ff8aa0')]), '#e6defa'))
E['gobo-salad'] = ('side', small_dish('<path d="M30 80 Q30 54 64 54 Q98 54 98 80Z" fill="#fff4c8"/>' + ''.join(f'<path d="M{x} {y} l12 -4" stroke="{c}" stroke-width="4"/>' for x, y, c in [(38, 74, '#a8784a'), (50, 66, '#a8784a'), (62, 74, '#ff9a3c'), (70, 62, '#a8784a'), (82, 72, '#a8784a'), (56, 60, '#ff9a3c')]) + dots([(48, 76), (76, 66)], 1.6, INK, False), '#cfe6fa'))
E['daikon-salad'] = ('side', small_dish('<path d="M30 80 Q30 54 64 54 Q98 54 98 80Z" fill="#fffaf0"/>' + '<path d="M36 74 l14 -12 M48 76 l14 -14 M62 76 l14 -14 M74 76 l14 -12" stroke="#e8e2d0" stroke-width="3"/>'
    + '<path d="M42 62 q10 -6 18 0 q-8 4 -18 0Z" fill="#7cc98a" stroke-width="2"/><path d="M58 60 l4 -6 l4 6 l4 -6 l4 6" fill="#f2c6a0" stroke-width="2"/>' + dots([(80, 64)], 4, '#ff6b5a'), '#7fa8e8'))
E['kyuri-wakame-sunomono'] = ('side', kobachi(''.join(f'<circle cx="{x}" cy="{y}" r="6" fill="#c9eba0"/><circle cx="{x}" cy="{y}" r="2" fill="#7cba4a" stroke="none"/>' for x, y in [(44, 60), (58, 54), (72, 60), (84, 56)])
    + '<path d="M48 52 q6 -8 14 -2 q-6 6 -14 2Z M64 62 q6 -6 12 0 q-6 4 -12 0Z" fill="#3d7a4a" stroke-width="2.5"/>' + dots([(66, 48), (52, 62)], 1.4, '#fff', False)))
E['moyashi-itame'] = ('side', plate() + '<path d="M28 82 Q30 58 64 56 Q98 58 100 82Z" fill="#fffaf0"/>' + ''.join(f'<path d="M{x} {y} q4 -6 10 -8" fill="none" stroke="#e8e2c8" stroke-width="3"/>' for x, y in [(36, 76), (46, 70), (56, 78), (64, 66), (74, 76), (84, 70), (52, 64), (90, 78)])
    + '<path d="M44 72 l12 -4 M72 66 l10 -2" stroke="#4fae5c" stroke-width="4"/><path d="M60 72 q6 -4 12 0 l-2 4 q-6 2 -10 -4Z" fill="#e8a8a0" stroke-width="2"/>')
E['asazuke'] = ('side', small_dish(''.join(f'<circle cx="{x}" cy="{y}" r="8" fill="#9bd36a"/><circle cx="{x}" cy="{y}" r="4" fill="#e8f7c8" stroke="none"/>' for x, y in [(40, 76), (54, 72)])
    + '<path d="M66 82 Q66 62 80 62 Q96 62 96 82Z" fill="#fffaf0"/><path d="M70 82 Q70 70 80 70 Q90 70 92 82" fill="#c9eba0"/><circle cx="58" cy="86" r="3" fill="#e0402e" stroke-width="2"/>', '#fff4dc'))
E['yaki-nasu'] = ('side', long_plate() + ''.join(f'<path d="M{x-28} 82 Q{x-26} 70 {x} 70 Q{x+26} 70 {x+28} 80 Q{x+20} 92 {x} 92 Q{x-26} 92 {x-28} 82Z" fill="#e8d8a0"/><path d="M{x-20} 80 h40" stroke="#c9b070" stroke-width="2.5"/>' for x in (44,))
    + '<path d="M70 82 Q72 70 94 70 Q108 72 108 82 Q100 92 86 92 Q72 92 70 82Z" fill="#e8d8a0"/>' + '<path d="M60 70 q8 -10 18 -6 q-6 10 -18 6Z" fill="#f2c6a0" stroke-width="2"/>' + negi([(48, 76), (90, 78)]))
E['nasu-agebitashi'] = ('side', kobachi(''.join(f'<path d="M{x-12} {y} a12 7 0 0 0 24 0Z" fill="#6b3a7e"/><path d="M{x-10} {y+1} a10 4 0 0 0 20 0" fill="#e8c890" stroke="none"/>' for x, y in [(48, 56), (74, 56), (60, 48)]) + '<path d="M62 60 l4 -6 l4 6" fill="#f2c6a0" stroke-width="2"/>'))
E['onyasai'] = ('side', small_dish(''.join(f'<path d="M{x} {y+8} v12" stroke="#8cc46a" stroke-width="6"/><circle cx="{x-6}" cy="{y}" r="8" fill="#3f9a50"/><circle cx="{x+6}" cy="{y}" r="8" fill="#3f9a50"/><circle cx="{x}" cy="{y-6}" r="8" fill="#4fae5c"/>' for x, y in [(44, 66), (80, 70)])
    + flower_carrot(62, 78, 8) + flower_carrot(64, 62, 7) + '<ellipse cx="96" cy="84" rx="8" ry="5" fill="#ffe07a"/>'))
E['nimame'] = ('side', small_dish(''.join(f'<ellipse cx="{x}" cy="{y}" rx="7" ry="5" fill="{c}"/>' for x, y, c in [(40, 76, '#a8604a'), (52, 70, '#c98a6a'), (64, 76, '#a8604a'), (76, 70, '#c98a6a'), (88, 78, '#a8604a'), (56, 84, '#c98a6a'), (72, 86, '#a8604a')])
    + dots([(54, 70), (78, 70)], 1.4, '#7a3a2a', False), '#fff4dc'))
# 汁物
E['sumashijiru'] = ('soup', bowl('#e0573a', '#fff1d6', rx=46, top='<path d="M42 58 q8 -8 18 -2" fill="none" stroke="#4fae5c" stroke-width="4"/><circle cx="68" cy="58" r="8" fill="#fff8ec"/>' + kama(84, 58, 12) + shiitake(52, 64)))
E['hamaguri-suimono'] = ('soup', bowl('#e0573a', '#fff1d6', rx=46, top=''.join(f'<path d="M{x-12} {y} a12 9 0 0 1 24 0Z" fill="#c9b8a0"/><path d="M{x-6} {y-4} l6 -3 l6 3" fill="none" stroke="#8a7a68" stroke-width="2"/>' for x, y in [(48, 62), (76, 60)]) + '<path d="M58 54 q6 -8 14 -2 M62 52 l-2 -6" fill="none" stroke="#4fae5c" stroke-width="3"/>'))
E['kakitama-jiru'] = ('soup', bowl('#f08a6e', '#fff1d6', rx=46, top='<path d="M32 62 q8 -8 16 -2 q8 -10 18 -2 q10 -8 18 0 q6 -4 12 2 q-10 8 -20 4 q-10 6 -22 0 q-12 4 -22 -2Z" fill="#ffd94d"/>' + negi([(48, 56), (70, 54), (84, 60)])))
E['consomme-soup'] = ('soup', cup('#d9903e', '<rect x="46" y="58" width="8" height="8" rx="2" fill="#ff9a3c"/><rect x="62" y="62" width="8" height="8" rx="2" fill="#ffe07a"/><rect x="74" y="58" width="8" height="8" rx="2" fill="#9bd36a"/>'))
E['minestrone'] = ('soup', cup('#e0573a', '<rect x="44" y="58" width="9" height="9" rx="2" fill="#ff9a3c"/><rect x="60" y="62" width="9" height="9" rx="2" fill="#ffe07a"/><rect x="74" y="56" width="9" height="9" rx="2" fill="#9bd36a"/>' + dots([(56, 60), (70, 58)], 3, '#fff4dc', False)))
E['clam-chowder'] = ('soup', cup('#fff4e0', ''.join(f'<path d="M{x-7} {y} a7 5 0 0 1 14 0Z" fill="#c9b8a0" stroke-width="2"/>' for x, y in [(50, 62), (76, 64)]) + '<rect x="60" y="58" width="9" height="9" rx="2" fill="#ffe07a"/><rect x="66" y="66" width="8" height="8" rx="2" fill="#ff9a3c"/>' + dots([(46, 66)], 2, '#4fae5c', False)))
E['wakame-soup'] = ('soup', bowl('#fff', '#f2dcb0', rx=46, top='<path d="M36 58 q8 -10 16 -2 q-6 8 -16 2Z M62 52 q8 -10 18 -2 q-8 8 -18 2Z M70 64 q8 -8 16 0 q-8 6 -16 0Z" fill="#3d7a4a" stroke-width="2.5"/>' + dots([(56, 60), (84, 54)], 1.6, '#fff', False) + negi([(48, 64)])))
E['chuka-tamago-soup'] = ('soup', bowl('#fff', '#f2dcb0', rx=46, top='<path d="M32 60 q10 -6 18 0 t18 0 t18 0 t12 0" fill="none" stroke="#ffd94d" stroke-width="6"/>' + negi([(46, 54), (62, 52), (80, 56)]) + dots([(56, 62), (74, 62)], 1.6, '#fff', False)))
E['kenchin-jiru'] = K['けんちん汁']
# おやつ
E['sweets-eclair'] = ('snack', plate(cy=88) + '<rect x="20" y="64" width="88" height="24" rx="12" fill="#f2c47a"/><path d="M22 72 Q22 60 34 60 H94 Q106 60 106 72 Q64 78 22 72Z" fill="#6b3a24"/><path d="M38 66 h24" stroke="#a8603a" stroke-width="3"/>')
E['sweets-roll-cake'] = ('snack', plate(cy=90) + '<circle cx="64" cy="70" r="28" fill="#f2c47a"/><circle cx="64" cy="70" r="22" fill="#fff8e0" stroke="none"/>'
    + '<path d="M64 70 m-4 0 a4 4 0 1 1 4 4 a10 10 0 1 1 10 -10 a16 16 0 1 1 -16 16" fill="none" stroke="#fffaf0" stroke-width="6"/><path d="M64 70 m-4 0 a4 4 0 1 1 4 4 a10 10 0 1 1 10 -10 a16 16 0 1 1 -16 16" fill="none" stroke="#f2c47a" stroke-width="2"/>')
E['sweets-kakinotane'] = ('snack', small_dish(''.join(f'<path d="M{x-8} {y} q8 -8 16 -2 q-6 6 -16 2Z" fill="#d9783a" transform="rotate({r} {x} {y})"/>' for x, y, r in [(42, 74, -20), (56, 68, 10), (70, 76, -10), (84, 70, 20), (50, 84, 30), (78, 86, -30)])
    + ''.join(f'<ellipse cx="{x}" cy="{y}" rx="6" ry="4" fill="#f6e4c0"/>' for x, y in [(62, 82), (90, 80), (44, 64)]), '#fff4dc'))
E['sweets-taiyaki'] = ('snack', plate(cy=92, rx=48, ry=12) + '<path d="M22 70 Q34 46 70 50 Q86 52 92 64 L110 50 L106 72 L112 92 L92 82 Q82 96 54 94 Q26 92 22 70Z" fill="#e8a24a"/>'
    + '<circle cx="36" cy="66" r="3" fill="#a8603a" stroke="none"/><path d="M48 62 l6 6 m8 -8 l6 6 m-16 8 l6 6 m8 -8 l6 6" stroke="#c9822e" stroke-width="2.5"/><path d="M28 76 q8 4 14 0" fill="none" stroke="#c9822e" stroke-width="2.5"/>')
E['sweets-warabimochi'] = ('snack', small_dish(''.join(f'<rect x="{x}" y="{y}" width="18" height="16" rx="6" fill="#f2e0b0" fill-opacity=".9"/>' for x, y in [(36, 68), (56, 62), (74, 70), (50, 80)]) + dots([(44, 72), (64, 66), (82, 74), (58, 84)], 1.6, '#c9a05a', False)
    + '<path d="M30 70 q4 -8 12 -6" fill="none" stroke="#6b3a24" stroke-width="3"/>', '#7fa8e8'))
E['sweets-zenzai'] = ('snack', bowl('#e0573a', '#7a3a3e', rx=44, top=dots([(46, 62), (58, 58), (74, 62), (82, 58)], 3, '#a8606e', False) + '<rect x="54" y="48" width="20" height="14" rx="4" fill="#fffaf0"/><path d="M58 50 q6 -4 12 0" fill="none" stroke="#e8c890" stroke-width="2"/>'))
E['sweets-anmitsu'] = ('snack', bowl('#cfe6fa', '#f6f2ea', rx=44, top=''.join(f'<rect x="{x}" y="{y}" width="10" height="10" rx="2" fill="#f6f6f6" fill-opacity=".8" stroke-width="2"/>' for x, y in [(36, 56), (48, 60), (78, 58)])
    + '<path d="M56 56 Q58 44 68 44 Q78 44 78 56Z" fill="#7a3a3e"/>' + dots([(44, 50)], 5, '#ffa836') + dots([(86, 52)], 4, '#e8455a') + dots([(62, 62)], 4, '#fff') + dots([(72, 62)], 4, '#a8dc6a')))
E['sweets-kakigori'] = ('snack', '<path d="M34 76 L44 104 H84 L94 76Z" fill="#cfe6fa"/><path d="M28 78 Q24 36 64 30 Q104 36 100 78Z" fill="#fff"/><path d="M34 70 Q36 44 64 40 Q78 42 86 52 Q70 52 60 64 Q50 74 34 70Z" fill="#ff7a8a" fill-opacity=".8" stroke="none"/>'
    + '<path d="M28 78 H100" stroke-width="3"/><path d="M80 26 l16 -16" stroke-width="3"/><path d="M76 32 l6 -6 l6 6 l-6 4Z" fill="#ffd94d" stroke-width="2"/>')
E['sweets-macaron'] = ('snack', plate(cy=92) + ''.join(f'<rect x="{x-20}" y="{y-14}" width="40" height="10" rx="5" fill="{c}"/><rect x="{x-18}" y="{y-4}" width="36" height="6" rx="3" fill="#fffaf0"/><rect x="{x-20}" y="{y+2}" width="40" height="10" rx="5" fill="{c}"/>' for x, y, c in [(44, 76, '#ffb0c4'), (84, 72, '#a8dc78')]))
E['sweets-hoshiimo'] = ('snack', small_dish(''.join(f'<rect x="{x}" y="{y}" width="20" height="34" rx="6" fill="#f2b84a" transform="rotate({r} {x+10} {y+17})"/><path d="M{x+6} {y+6} v20" stroke="#ffd77a" stroke-width="3" transform="rotate({r} {x+10} {y+17})"/>' for x, y, r in [(38, 52, -20), (58, 50, 0), (76, 54, 20)]), '#fff4dc'))
E['sweets-yakiimo'] = ('snack', '<path d="M20 90 Q30 60 64 56 Q98 60 108 90Z" fill="#fff4dc" stroke-width="2.5"/>' + '<path d="M22 70 Q24 50 54 50 Q74 52 78 68 Q72 84 46 84 Q24 84 22 70Z" fill="#a8445a"/>'
    + '<path d="M60 74 Q62 52 86 54 Q108 58 106 76 Q100 90 80 88 Q62 86 60 74Z" fill="#a8445a"/><path d="M70 74 Q72 60 86 62 Q100 64 98 76 Q92 84 80 82 Q70 80 70 74Z" fill="#ffd23a"/>'
    + '<path d="M80 66 q-4 -6 0 -12 M90 64 q-4 -6 0 -12" fill="none" stroke="#fff" stroke-width="3"/>')
E['sweets-nikuman'] = ('snack', plate(cy=92, rx=46, ry=12) + '<path d="M28 90 Q24 50 64 46 Q104 50 100 90Z" fill="#fffaf0"/>' + ''.join(f'<path d="M64 48 q{dx} 10 {dx * 2} 28" fill="none" stroke="#e8dcc4" stroke-width="2.5"/>' for dx in (-10, -4, 4, 10))
    + '<path d="M58 30 q-4 -6 0 -12 M70 30 q-4 -6 0 -12" fill="none" stroke="#fff" stroke-width="3"/>')
E['sweets-anman'] = ('snack', plate(cy=92, rx=46, ry=12) + '<path d="M28 90 Q24 52 64 50 Q104 52 100 90Z" fill="#fffaf0"/><circle cx="64" cy="64" r="5" fill="#e8455a" stroke="none"/>' + '<path d="M58 34 q-4 -6 0 -12 M70 34 q-4 -6 0 -12" fill="none" stroke="#fff" stroke-width="3"/>')
E['sweets-ohagi'] = K['ぼた餅']
E['sweets-mixed-nuts'] = ('snack', small_dish(''.join(f'<ellipse cx="{x}" cy="{y}" rx="7" ry="5" fill="{c}" transform="rotate({r} {x} {y})"/>' for x, y, c, r in
    [(40, 74, '#e8c08a', -20), (52, 68, '#c98a4a', 10), (64, 76, '#f2dcae', 30), (76, 68, '#e8c08a', -10), (88, 76, '#c98a4a', 20), (54, 84, '#a8784a', 0), (72, 86, '#f2dcae', -30), (62, 64, '#a8784a', 40)]), '#e6defa'))
# 飲み物・お酒
E['drink-hojicha'] = ('drink', yunomi('#b0703a'))
E['drink-amazake'] = ('drink', yunomi('#fffaf0').replace('<ellipse cx="64" cy="46"', '<ellipse cx="64" cy="46"') + '<path d="M56 30 q-4 -6 0 -12 M68 30 q-4 -6 0 -12" fill="none" stroke="#fff" stroke-width="3"/>' + dots([(58, 46), (68, 45)], 1.4, '#e8dcc4', False))
E['alcohol-happoshu'] = ('alcohol', can(48, '#7fc8e8', '<rect x="48" y="58" width="32" height="18" fill="#fff" stroke-width="2.5"/>'))
E['alcohol-whisky-mizuwari'] = ('alcohol', glass('#f2d08a', '<rect x="54" y="52" width="16" height="16" rx="3" fill="#fff" fill-opacity=".7" stroke-width="2.5" transform="rotate(10 62 60)"/><path d="M76 20 L68 90" stroke="#e8455a" stroke-width="3"/>'))
E['alcohol-shochu-oyuwari'] = ('alcohol', '<path d="M30 46 Q30 104 64 104 Q98 104 98 46Z" fill="#fff"/><ellipse cx="64" cy="46" rx="34" ry="9" fill="#f6f2ea"/><circle cx="58" cy="46" r="6" fill="#e8455a" stroke-width="2"/>'
    + '<path d="M38 66 h52 M42 80 h44" stroke="#c9d8e8" stroke-width="3"/><path d="M58 32 q-4 -6 0 -12 M70 32 q-4 -6 0 -12" fill="none" stroke="#fff" stroke-width="3"/>')

D.update(E)

os.makedirs(os.path.join(OUT, 'genre'), exist_ok=True)
D.update({f'genre/{g}': v for g, v in GENRE.items()})

os.makedirs(os.path.join(OUT, 'category'), exist_ok=True)
D.update(FALLBACK)
for k, (cat, body) in D.items():
    with open(os.path.join(OUT, f'{k}.svg'), 'w') as f:
        f.write(svg(cat, body))
print(len(D))
