"""The other eleven heroes' tavern figures (docs/notes/heroes-join-2.md): `<id>-activity.webp`, `<id>-left.webp` and `<id>-right.webp` in
src/art/tavern/guests, 384 x 440, cut from each hero's standing cutout (art-source/heroes-20/<id>-cutout.png) the way the Mythics' were (their
activity painting is the standing figure too) until painted activities exist. Nothing is repainted: the figure is cropped to its alpha, scaled to
fit and stood on the bottom; `-left` is the mirror. Run once; it is safe to run again."""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
IDS = ['banneret', 'astralSphinx', 'mirageDancer', 'plagueDoctor', 'bombardier', 'astrologer', 'inquisitor', 'seraph', 'corsairSurgeon', 'harpooner', 'seaReaver']
DEST = ROOT / 'src' / 'art' / 'tavern' / 'guests'
for hero in IDS:
    cut = Image.open(ROOT / 'art-source' / 'heroes-20' / f'{hero}-cutout.png').convert('RGBA')
    bound = cut.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox()
    cut = cut.crop(bound)
    k = min(360 / cut.width, 416 / cut.height)
    cut = cut.resize((round(cut.width * k), round(cut.height * k)), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (384, 440))
    canvas.alpha_composite(cut, ((384 - cut.width) // 2, 428 - cut.height))
    canvas.save(DEST / f'{hero}-activity.webp', quality=92, method=4)
    canvas.save(DEST / f'{hero}-right.webp', quality=92, method=4)
    ImageOps.mirror(canvas).save(DEST / f'{hero}-left.webp', quality=92, method=4)
print('done')
