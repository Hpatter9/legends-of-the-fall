"""The Mythics' finishing art (docs/notes/mythics-finish.md), made only from the painted spell sheets in art-source/spell-fx; nothing is
drawn in code and nothing is repainted. Each picture layers two painted frames, scaled and recoloured, so none repeats a cell another
skill or spell already uses.

- src/art/fx/abilities/atlas-13.png: skill 2 and skill 3 of each Mythic (ten cells), with their rows in the catalogue. Before this
  they borrowed another hero's look (KIT_LOOKS).
- src/art/ult-show/mythic-*.webp: each Mythic's showcase prop (the black sun, the star chart, the halo, the world tree, the clock of
  fate). The ultimate's cut-in shows the same prop as its sigil.

Run once; it is safe to run again."""
import colorsys
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'art-source' / 'spell-fx'
OUT = ROOT / 'src' / 'art' / 'fx' / 'abilities'
SHOW = ROOT / 'src' / 'art' / 'ult-show'
SRC_CELL, CELL = 256, 192


def frame(sheet: str, row: int, n: int) -> Image.Image:
    im = Image.open(SRC / f'{sheet}.png').convert('RGBA')
    return im.crop((n * SRC_CELL, row * SRC_CELL, (n + 1) * SRC_CELL, (row + 1) * SRC_CELL))


def hue(im: Image.Image, to: float, sat: float = 1.0, light: float = 1.0) -> Image.Image:
    """Turn every pixel's hue to `to` (0 to 1), keeping its lightness: the painting's strokes stay, its colour changes."""
    px = im.load()
    out = im.copy()
    po = out.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            r, g, b, a = px[x, y]
            if not a:
                continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            r2, g2, b2 = colorsys.hls_to_rgb(to, min(1, l * light), min(1, s * sat))
            po[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return out


def gold(im: Image.Image) -> Image.Image:
    return hue(im, 0.115, 1.1, 1.05)


def boost(im: Image.Image, k: float) -> Image.Image:
    """A faint painting made bolder: its alpha scaled up."""
    a = im.getchannel('A').point(lambda v: min(255, round(v * k)))
    out = im.copy()
    out.putalpha(a)
    return out


def scaled(im: Image.Image, k: float) -> Image.Image:
    return im.resize((max(1, round(im.size[0] * k)), max(1, round(im.size[1] * k))), Image.Resampling.LANCZOS)


def layer(base: Image.Image, top: Image.Image, k: float = 1.0, dx: int = 0, dy: int = 0) -> Image.Image:
    """`top` scaled by `k` and laid over the middle of `base` (offset by dx, dy)."""
    t = scaled(top, k)
    out = base.copy()
    out.alpha_composite(t, ((base.size[0] - t.size[0]) // 2 + dx, (base.size[1] - t.size[1]) // 2 + dy))
    return out


def broken(im: Image.Image, start: float, end: float) -> Image.Image:
    """A wedge cut out of a ring (the halo is broken), with soft edges."""
    m = Image.new('L', im.size, 255)
    ImageDraw.Draw(m).pieslice((-64, -64, im.size[0] + 64, im.size[1] + 64), start, end, fill=0)
    m = m.filter(ImageFilter.GaussianBlur(3))
    a = Image.composite(im.getchannel('A'), Image.new('L', im.size, 0), m)
    out = im.copy()
    out.putalpha(a)
    return out


def fit(im: Image.Image, size: int, margin: float = 0.8) -> Image.Image:
    """Cropped to its painting and centred in a clear margin, as tools/mythics/ability-art.py sets atlas-11's cells."""
    box = im.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
    if not box:
        raise SystemExit('an empty composite')
    im = im.crop(box)
    k = size * margin / max(im.size)
    im = scaled(im, k)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.alpha_composite(im, ((size - im.size[0]) // 2, (size - im.size[1]) // 2))
    return out


# ---- skill 2 and skill 3 of each Mythic: (move, motif, the composite)
MOVES = [
    ('Solar Aegis', 'a blazing golden shield before a white-gold sunburst',
     lambda: layer(frame('u-ultimate/ult-burst-light', 0, 2), frame('b-auras/aura-protection', 1, 2), 1.15)),
    ('Crownfall', 'a black-gold eclipse ring slamming into a molten golden crack',
     lambda: layer(gold(frame('f-martial/fissure', 0, 2)), gold(frame('u-ultimate/ult-burst-dark', 0, 3)), 0.85, 0, -18)),
    ('Star Hunger', 'a blue spiral galaxy swallowing a violet orb of stolen power',
     lambda: layer(hue(frame('v-vampire/astral-star', 1, 3), 0.6, 1.1, 1.1), frame('b-auras/mana-font', 1, 2), 0.55)),
    ('Comet Lance', 'three white-blue comets streaking behind a burning star head',
     lambda: layer(hue(frame('v-vampire/astral-star', 1, 0), 0.58, 0.9, 1.2), hue(frame('f-martial/divine-smite', 1, 1), 0.57, 0.8, 1.1), 0.7, 28, 22)),
    ('Unburied Mercy', 'a red grave-lily blooming in a pale golden mist',
     lambda: layer(gold(boost(frame('b-auras/healing-mist', 0, 4), 1.2)), frame('v-vampire/sanguine-lance', 1, 2), 1.1)),
    ('Broken Halo', 'a cracked golden halo with a burst of light in its gap',
     lambda: layer(broken(gold(scaled(frame('b-auras/spirit-guardians', 0, 2), 1.0)), 300, 345), frame('f-martial/divine-smite', 1, 0), 0.5, 70, -40)),
    ('Living Sanctuary', 'a ring of green living runes round a wheel of emerald light',
     lambda: layer(frame('f-martial/entangle', 0, 2), frame('u-ultimate/ult-burst-forest', 0, 2), 0.6)),
    ('Heartwood', 'a knot of thorned heartwood round a glowing emerald heart',
     lambda: layer(frame('a-toolkit/wall-thorns', 1, 2), frame('u-ultimate/ult-burst-forest', 0, 1), 0.7, 0, -8)),
    ('Stolen Tomorrow', 'a violet star chart drawn over a stopped clock face',
     lambda: layer(hue(boost(scaled(frame('g-spells/rewind', 0, 0), 1.0), 2.4), 0.76, 1.2, 1.3), hue(frame('v-vampire/astral-star', 0, 5), 0.78, 1.0, 1.2), 0.85)),
    ('Unmake', 'violet shards of a shattered future spun round a cracked web of light',
     lambda: layer(hue(frame('u-ultimate/ult-burst-lightning', 0, 4), 0.77, 1.1, 1.2), frame('g-spells/mirror-image', 1, 2), 0.9)),
]

# ---- each Mythic's showcase prop: (file, the composite, its size)
PROPS = [
    ('mythic-black-sun', lambda: layer(gold(frame('u-ultimate/ult-burst-dark', 0, 2)), hue(frame('u-ultimate/ult-burst-dark', 0, 1), 0.1, 1.2, 0.8), 0.7), 320),
    ('mythic-star-chart', lambda: layer(hue(frame('v-vampire/astral-star', 0, 4), 0.6, 1.1, 1.2), hue(frame('v-vampire/astral-star', 1, 2), 0.58, 1.0, 1.1), 0.9), 320),
    ('mythic-saint-halo', lambda: layer(hue(frame('b-auras/spirit-guardians', 0, 0), 0.12, 0.6, 1.2), frame('c-healers/death-ward', 1, 3), 0.55, 0, 6), 320),
    ('mythic-world-tree', lambda: layer(frame('g-spells/conjure-treant', 0, 2), frame('u-ultimate/ult-burst-forest', 0, 3), 0.75, 0, 30), 320),
    ('mythic-fate-clock', lambda: layer(hue(boost(frame('d-casters/time-stop', 1, 3), 1.5), 0.78, 1.1, 1.2), hue(boost(frame('g-spells/rewind', 1, 0), 2.6), 0.8, 1.1, 1.3), 1.6), 320),
]

if __name__ == '__main__':
    atlas = Image.new('RGBA', (768, 768), (0, 0, 0, 0))
    rows = []
    for i, (name, motif, make) in enumerate(MOVES):
        atlas.alpha_composite(fit(make(), CELL), ((i % 4) * CELL, (i // 4) * CELL))
        rows.append({'id': f'skill:{name}', 'name': name, 'motif': motif, 'atlas': 13, 'cell': i})
    atlas.save(OUT / 'atlas-13.png', optimize=True)
    cat = json.loads((OUT / 'catalogue.json').read_text())
    have = {r['id'] for r in cat}
    cat += [r for r in rows if r['id'] not in have]
    (OUT / 'catalogue.json').write_text(json.dumps(cat, indent=2) + '\n')
    for name, make, size in PROPS:
        fit(make(), size, 0.92).save(SHOW / f'{name}.webp', quality=88, method=6)
    print(len(cat), 'rows;', len(PROPS), 'props')
