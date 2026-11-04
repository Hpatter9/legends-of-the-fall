"""Hester's Stall and the skill books' art (docs/notes/shop-books-gear.md): the paintings in art-source/books-shop/ (from the
books-and-shop art set, with the second set's fixes) and the wear and selling pieces in art-source/gear/wear/, sized down and saved
as WebP in src/art/shop/. They load by URL (`shop/...`); build.mjs copies them and lists them for offline play.

    python3 tools/shop/import-shop-art.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'src/art/shop'
# (source, output name, longest side)
PICKS = [
    *[(f'books-shop/books/{k}-{r}.png', f'book-{k}-{r}', 160) for k in ('manual', 'grimoire', 'hymnal', 'bestiary') for r in ('common', 'rare')],
    ('books-shop/books/universal-rare.png', 'book-universal-rare', 160),
    ('books-shop/people/hester-vane.png', 'hester', 360),
    ('books-shop/people/caravan-master.png', 'caravan-master', 360),
    ('books-shop/people/gloaming-dealer.png', 'gloaming-dealer', 360),
    ('books-shop/stall/shop-stall.png', 'stall', 200),
    ('books-shop/study/studying.png', 'studying', 96),
    ('books-shop/study/learned.png', 'learned', 128),
    ('books-shop/ui/coin-purse.png', 'coin-purse', 96),
    ('books-shop/ui/price-tag.png', 'price-tag', 160),
    ('books-shop/ui/sold-out.png', 'sold-out', 160),
    ('books-shop/ui/shelf.png', 'shelf', 800),
    ('books-shop/ui/shelf-rare.png', 'shelf-rare', 800),
    *[(f'books-shop/ui/standing-{n}.png', f'standing-{n}', 96) for n in (1, 2, 3)],
    ('gear/wear/badge-worn.png', 'badge-worn', 48),
    ('gear/wear/badge-broken.png', 'badge-broken', 48),
    ('gear/wear/badge-field.png', 'badge-field', 48),
    ('gear/wear/wear-broken.png', 'wear-broken', 128),
    ('gear/wear/repair.png', 'repair', 96),
    ('gear/wear/repair-all.png', 'repair-all', 96),
    ('gear/wear/sell.png', 'sell', 96),
    ('gear/wear/buy-back.png', 'buy-back', 96),
]

OUT.mkdir(parents=True, exist_ok=True)
for src, name, side in PICKS:
    im = Image.open(ROOT / 'art-source' / src)
    im = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')
    k = side / max(im.size)
    if k < 1:
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    im.save(OUT / f'{name}.webp', 'WEBP', quality=82, method=6)
    print(name, im.size, (OUT / f'{name}.webp').stat().st_size)
