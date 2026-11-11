# LIVING-FIELDS: cut the painted sheets into the game (docs/notes/land-identity-art-prompts.md).
#   python3 -I tools/living-fields/import-art.py traps   art-source/land-identity/traps.png -> src/art/living-fields/traps.png + traps.json
#   python3 -I tools/living-fields/import-art.py life    art-source/land-identity/life.png  -> src/art/living-fields/life.png + life.json
# Each sheet is a grid of equal cells, named in reading order below. A cell is trimmed to its paint and packed into one atlas; the json
# says where each lies and where its tile's middle is against it (`foot`), so the game stands it on its tile with no code change
# (`src/render/trapArt.ts`). A cell left blank in the sheet is left out, and the game keeps its stand-in for it. Run once; the results
# are committed.
import json, os, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SHEETS = {
    # (8 across, 5 down, each cell 128 x 128: the tile's diamond, 128 x 64, lies in the cell's lower half; its middle is at (64, 96))
    'traps': dict(cell=(128, 128), cols=8, foot=(64, 96), names=[
        'spikes', 'spikesSprung', 'snare', 'snareSprung', 'ward', 'wardSpent', 'brambles', 'bramblesDry',
        'mud', 'quicksand', 'bog1', 'bog2', 'thin', 'cracked', 'iceHole', 'totem',
        'brazier', 'brazierFallen', 'vent', 'ventBurst', 'rubble', 'rockFalling', 'graveHands', 'graveHandsUp',
        'bladeSlot', 'bladeSwing', 'scorch', 'shrineSun', 'shrineIce', 'shrineAnvil', 'shrineStone', 'shrineMoon',
        'wallSand1', 'wallSand2', 'wallSnow', 'wallMoss', 'wallCrypt', 'kegCamp', 'urnAsh', 'crateForge',
    ]),
    # (8 across, 6 down, each cell 64 x 64: a small creature or thing; a row is one loop, its frames left to right; its feet at (32, 56))
    'life': dict(cell=(64, 64), cols=8, foot=(32, 56), names=[f'{row}{k}' for row in ['rabbit', 'crow', 'songbird', 'frog', 'fish', 'butterfly'] for k in range(8)]),
}

def cut(kind):
    spec = SHEETS[kind]
    src = os.path.join(ROOT, 'art-source', 'land-identity', f'{kind}.png')
    if not os.path.exists(src):
        sys.exit(f'{src} is not there yet: paint it from docs/notes/land-identity-art-prompts.md')
    sheet = Image.open(src).convert('RGBA')
    cw, ch = spec['cell']
    cols = spec['cols']
    rows = (len(spec['names']) + cols - 1) // cols
    if sheet.size != (cw * cols, ch * rows):
        sys.exit(f'{kind}.png is {sheet.size}, not {(cw * cols, ch * rows)}')
    cells = []
    for i, name in enumerate(spec['names']):
        x0, y0 = (i % cols) * cw, (i // cols) * ch
        cell = sheet.crop((x0, y0, x0 + cw, y0 + ch))
        box = cell.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
        if not box:
            continue
        cells.append((name, cell.crop(box), box))
    # a simple shelf pack, 1 px apart
    width, x, y, shelf, places = 1024, 0, 0, 0, {}
    for name, im, box in cells:
        if x + im.width > width:
            x, y, shelf = 0, y + shelf + 1, 0
        places[name] = (x, y)
        x += im.width + 1
        shelf = max(shelf, im.height)
    atlas = Image.new('RGBA', (width, y + shelf), (0, 0, 0, 0))
    out = {}
    fx, fy = spec['foot']
    for name, im, box in cells:
        px, py = places[name]
        atlas.paste(im, (px, py))
        # (where the tile's middle lies against the trimmed picture's top left)
        out[name] = [px, py, im.width, im.height, fx - box[0], fy - box[1]]
    dst = os.path.join(ROOT, 'src', 'art', 'living-fields')
    os.makedirs(dst, exist_ok=True)
    atlas.save(os.path.join(dst, f'{kind}.png'), optimize=True)
    with open(os.path.join(dst, f'{kind}.json'), 'w') as f:
        json.dump(out, f, separators=(',', ':'))
        f.write('\n')
    print(f'{kind}: {len(out)} of {len(spec["names"])} cells, atlas {atlas.size}')

if __name__ == '__main__':
    cut(sys.argv[1] if len(sys.argv) > 1 else 'traps')
