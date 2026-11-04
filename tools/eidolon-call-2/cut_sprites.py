# SUPERSEDED (EIDOLON-FX): the call now uses the owner's Gemini sheets for all six, cut by tools/eidolon-fx/cut_gemini.py, which writes
# the same files; running this would put the old pack sprites back over them. Kept for the record.
# EIDOLON-CALL-2: cuts the sprite Eidolons that perform the attack on the board (the owner: "a sprite version of the summons that actually
# perform the attack after the opening scene"), from whtdragon's RPG Maker MV animals pack in the private assets repository. Each is one row of
# frames (left to right), the pack's pixels kept, written to src/art/eidolons/sprites/<id>.png. Askel (the black dire wolf) and Gorm (the
# stone golem) use sheets the game already has (src/art/units/). Voltara has none: no pack has a copper goddess. Re-runs.
#   python3 tools/eidolon-call-2/cut_sprites.py [../chronos-assets]
import colorsys
import sys
from PIL import Image, ImageDraw

ASSETS = sys.argv[1] if len(sys.argv) > 1 else '../chronos-assets'
PACK = f'{ASSETS}/whtdragons_MVanimals_ALL_4-1-2025'
OUT = 'src/art/eidolons/sprites'


def row(path, fw, fh, col0, row, n=3):
    im = Image.open(path).convert('RGBA')
    out = Image.new('RGBA', (fw * n, fh))
    for i in range(n):
        out.paste(im.crop(((col0 + i) * fw, row * fh, (col0 + i + 1) * fw, (row + 1) * fh)), (i * fw, 0))
    return out


def shift(im, test, to_hue, sat=1.0):
    # (a recolour: pixels the test picks take the new hue, their lightness kept)
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if test(h, l, s):
                r2, g2, b2 = colorsys.hls_to_rgb(to_hue, l, min(1, s * sat))
                px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return im


# Nivra the Rime Wyrm: the silver-white coiled dragon (the large Asian dragon's second colour), facing us, its three frames; cooled to ice blue
nivra = row(f'{PACK}/dragons and wyverns/!$large_asiandragon.png', 72, 114, 0, 1)
shift(nivra, lambda h, l, s: s > 0.12 and (h < 0.14 or h > 0.9), 0.55, 0.8)
nivra.save(f'{OUT}/nivra.png', optimize=True)
# Aurelan the Lion of Dawn: the golden lion (the lions sheet's first lion), walking to the right, its three frames
row(f'{PACK}/animals/lions.png', 48, 48, 0, 2).save(f'{OUT}/aurelan.png', optimize=True)
# Vaelkhar the Dragon King: the black dragon with the burning wings (the big dragons' third colour), facing us; its fire turned violet
vael = row(f'{PACK}/Mythological animals/$BigDragons_recolor.png', 120, 120, 0, 2)
# (this sheet has a white ground, not transparency: flooded out from each frame's corners with its pale shadow, so the white inside the wings stays)
for i in range(3):
    fr = vael.crop((i * 120, 0, (i + 1) * 120, 120))
    for c in ((0, 0), (119, 0), (0, 119), (119, 119)):
        ImageDraw.floodfill(fr, c, (0, 0, 0, 0), thresh=110)
    # (its pale ground shadow, a light grey ellipse at the feet, goes too)
    px = fr.load()
    for y in range(84, 120):
        for x in range(120):
            r, g, b, a = px[x, y]
            if a and min(r, g, b) > 150 and max(r, g, b) - min(r, g, b) < 18:
                px[x, y] = (0, 0, 0, 0)
    vael.paste(fr, (i * 120, 0))
shift(vael, lambda h, l, s: s > 0.25 and (h < 0.17 or h > 0.95), 0.78, 1.1)
vael.save(f'{OUT}/vaelkhar.png', optimize=True)
print('ok')
