"""Prepare selected generated gallery pairs without repainting their pixels.

The generator can trim transparent borders. Restore a 2:3 transparent canvas
around cutouts before the existing import/check tool runs; leave raw -anime
sources untouched. Source hashes record which revisions were selected.
"""
from pathlib import Path
from PIL import Image
import hashlib
import json
import math
import shutil

root = Path(__file__).resolve().parents[2]
source = root / 'art-source/heritage-heroes'
briefs = json.loads((root / 'tools/ascended/heritage.json').read_text())
provenance = {}
for spec in briefs:
    hid = spec['id']
    scene = source / f'{hid}-anime.png'
    # Kian retains the completed first cutout: same identity and equipment,
    # with a more realistic finish than the other selected illustrated cuts.
    cutout = source / (f'{hid}-selected-cutout.png' if hid == 'mercenary' else f'{hid}-anime-cutout.png')
    if not scene.exists() or not cutout.exists():
        raise SystemExit(f'{hid}: selected scene/cutout pair is not ready')
    art = Image.open(scene)
    if art.width < 1024 or art.height < 1536 or abs(art.width / art.height - 2 / 3) > .02:
        raise SystemExit(f'{hid}: scene needs regeneration: {art.size}')
    image = Image.open(cutout).convert('RGBA')
    if image.getchannel('A').getextrema()[0] > 0:
        raise SystemExit(f'{hid}: cutout needs a transparent background')
    box = image.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox()
    if not box:
        raise SystemExit(f'{hid}: empty cutout')
    # Cropping only empty margins keeps all painted pixels, then restores a
    # consistent canvas so faces sit near the top of the menu crop.
    image = image.crop(box)
    width = math.ceil(max(image.width * 1.08, image.height * 1.08 * 2 / 3))
    height = math.ceil(width * 3 / 2)
    canvas = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    canvas.alpha_composite(image, ((width - image.width) // 2, (height - image.height) // 2))
    shutil.copyfile(scene, source / f'{hid}.png')
    canvas.save(source / f'{hid}-cutout.png')
    provenance[hid] = {
        'scene': scene.name, 'sceneSha256': hashlib.sha256(scene.read_bytes()).hexdigest(),
        'cutout': cutout.name, 'cutoutSha256': hashlib.sha256(cutout.read_bytes()).hexdigest(),
        'sceneSize': list(art.size), 'originalCutoutSize': list(Image.open(cutout).size),
        'preparedCutoutSize': list(canvas.size), 'identity': spec['title'],
    }
    print(f'{hid}: selected illustration and prepared transparent cutout')
(root / 'tools/ascended/heritage-sources.json').write_text(json.dumps(provenance, indent=2) + '\n')
