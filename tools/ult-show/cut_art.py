"""ULT-SHOW: cut the showcase frames (art-source/ult-showcase/, generated with the OpenAI image API) down to the game's size.

    python3 tools/ult-show/cut_art.py

Each picture is trimmed to what is drawn (its alpha's box, a few pixels kept round it) and scaled: the hero poses to 160 px tall (a
fighter on the board is drawn about 40 to 60 px tall, at up to twice that on a sharp phone), the die faces to 64 px, the props to 192 px
on their long side; the Arc Blade strip is cut into its six frames, each trimmed alike and laid side by side at 96 px tall. Written as
webp to src/art/ult-show/, where esbuild bundles them into game.js (so they play offline with nothing more for the service worker).
"""
from pathlib import Path
from PIL import Image

SRC = Path('art-source/ult-showcase')
OUT = Path('src/art/ult-show')
OUT.mkdir(parents=True, exist_ok=True)
POSES = {'barbarian-mid-air', 'beastmaster-horn', 'kunoichi-kneeling-finish', 'lancer-gallop', 'minotaur-charge', 'ninja-monk-flurry', 'samurai-iaido-crouch', 'samurai-sheathe'}


def trim(im: Image.Image, pad: int = 4) -> Image.Image:
    box = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    if not box:
        return im
    x0, y0, x1, y1 = box
    return im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))


def fit(im: Image.Image, h: int | None = None, side: int | None = None) -> Image.Image:
    k = h / im.height if h else side / max(im.size)
    return im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.Resampling.LANCZOS)


def save(im: Image.Image, name: str) -> None:
    p = OUT / f'{name}.webp'
    im.save(p, 'WEBP', quality=86, method=6)
    print(p, im.size, p.stat().st_size // 1024, 'KB')


for f in sorted(SRC.glob('*.png')):
    im = Image.open(f).convert('RGBA')
    name = f.stem
    if name == 'arc-blade-lightning-strip':
        n = 6
        w = im.width // n
        frames = [fit(trim(im.crop((i * w, 0, (i + 1) * w, im.height))), h=96) for i in range(n)]
        cell = max(fr.width for fr in frames)
        strip = Image.new('RGBA', (cell * n, 96))
        for i, fr in enumerate(frames):
            strip.paste(fr, (i * cell + (cell - fr.width) // 2, 0))
        save(strip, name)
        print('  cell', cell)
    elif name in POSES:
        save(fit(trim(im), h=160), name)
    elif name.startswith('buccaneer-die-face'):
        save(fit(trim(im), side=64), name)
    else:
        save(fit(trim(im), side=192), name)
