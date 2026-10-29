#!/usr/bin/env python3
"""Bring new painted hero artwork into the game (docs/notes/heritage-art-prompt.md).

For each hero id given (or every pair found), it reads the two originals from `art-source/heritage-heroes/`:
  <id>.png          the full scene, portrait orientation (2:3), at least 1024x1536, no transparency needed
  <id>-cutout.png   the same character alone on a transparent background, whole figure, standing, 2:3
and writes what the game loads, with the settings the existing gallery used (tools/anime-heroes/pack.cjs):
  src/art/heroes/<id>.webp            the scene, fitted inside 1024x1536, WebP quality 88
  src/art/heroes/<id>-portrait.webp   the cutout, fitted inside 320x480, WebP quality 85, lossless alpha
No code changes are needed: `build.mjs` copies every .webp in that folder and lists it for offline play.

  python3 tools/heritage/import-art.py              # every pair in art-source/heritage-heroes/
  python3 tools/heritage/import-art.py knight cleric
  python3 tools/heritage/import-art.py --check      # only check the originals, write nothing
"""
import os, re, sys
from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'art-source', 'heritage-heroes')
OUT = os.path.join(ROOT, 'src', 'art', 'heroes')


def heroes():
    """The hero ids the game knows (`ALL_HEROES` in src/sim/units.ts)."""
    src = open(os.path.join(ROOT, 'src', 'sim', 'units.ts'), encoding='utf-8').read()
    rest = re.search(r"ALL_HEROES[^=]*= \[\.\.\.HEROES, ([^\]]*)\]", src).group(1)
    return ['knight', 'samurai', 'kunoichi', 'archer', 'wizard'] + [s.strip().strip("'") for s in rest.split(',')]


def fit(im, w, h):
    """Shrunk (never enlarged) to fit inside w x h, keeping its shape."""
    k = min(w / im.width, h / im.height, 1)
    return im if k == 1 else im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)


def check(hid):
    problems = []
    scene_path, cut_path = os.path.join(SRC, f'{hid}.png'), os.path.join(SRC, f'{hid}-cutout.png')
    if not os.path.exists(scene_path):
        return [f'{hid}: missing {os.path.relpath(scene_path, ROOT)}']
    if not os.path.exists(cut_path):
        return [f'{hid}: missing {os.path.relpath(cut_path, ROOT)}']
    scene, cut = Image.open(scene_path), Image.open(cut_path)
    if scene.width < 1024 or scene.height < 1536:
        problems.append(f'{hid}: the scene is {scene.width}x{scene.height}, smaller than 1024x1536')
    if abs(scene.width / scene.height - 2 / 3) > 0.02:
        problems.append(f'{hid}: the scene is not 2:3 upright ({scene.width}x{scene.height})')
    if abs(cut.width / cut.height - 2 / 3) > 0.02 and abs(cut.width / cut.height - 1 / 2) > 0.02:
        problems.append(f'{hid}: the cutout is not 2:3 (or 1:2) upright ({cut.width}x{cut.height})')
    if cut.mode != 'RGBA' or cut.getchannel('A').getextrema()[0] > 0:
        problems.append(f'{hid}: the cutout has no transparent background')
    else:
        box = cut.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox()
        # (the cards show the top half of the cutout, so the head must be in it; and the figure fills the frame)
        if box and (box[1] > cut.height * 0.25 or box[3] - box[1] < cut.height * 0.6):
            problems.append(f'{hid}: the figure should stand full height, head in the top quarter (box {box})')
    return problems


def main():
    args = sys.argv[1:]
    only_check = '--check' in args
    args = [a for a in args if a != '--check']
    known = heroes()
    found = sorted(f[:-4] for f in os.listdir(SRC) if f.endswith('.png') and not f.endswith('-cutout.png')) if os.path.isdir(SRC) else []
    ids = args or found
    if not ids:
        print('nothing to bring in: put <id>.png and <id>-cutout.png in art-source/heritage-heroes/')
        sys.exit(1)
    bad = [f'{hid}: not a hero id (see ALL_HEROES in src/sim/units.ts)' for hid in ids if hid not in known]
    for hid in ids:
        if hid in known:
            bad += check(hid)
    if bad:
        print('\n'.join(bad))
        sys.exit(1)
    for hid in ids:
        if only_check:
            print(f'{hid}: ok')
            continue
        scene = Image.open(os.path.join(SRC, f'{hid}.png')).convert('RGB')
        fit(scene, 1024, 1536).save(os.path.join(OUT, f'{hid}.webp'), 'WEBP', quality=88, method=4)
        cut = Image.open(os.path.join(SRC, f'{hid}-cutout.png')).convert('RGBA')
        fit(cut, 320, 480).save(os.path.join(OUT, f'{hid}-portrait.webp'), 'WEBP', quality=85, alpha_quality=100, method=4)
        print(f'{hid}: src/art/heroes/{hid}.webp, src/art/heroes/{hid}-portrait.webp')


if __name__ == '__main__':
    main()
