# Hester's corner in the tavern (docs/notes/cliff-roam.md): her stall and the three traders' figures, cut from the books-and-shop
# art set (art-source/books-shop/) and sized for the tavern's rooms at three screen pixels to a room pixel (the tavern draws them
# smoothly at its own scale). Run from the repository's root: python3 tools/cliff-roam/tavern-art.py
from PIL import Image

OUT = 'src/art/tavern'
# (name, source, room pixels high)
PIECES = [
    ('hester-stall', 'art-source/books-shop/stall/shop-stall.png', 76),
    ('hester', 'art-source/books-shop/people/hester-vane.png', 42),
    ('trader-caravan', 'art-source/books-shop/people/caravan-master.png', 42),
    ('trader-dealer', 'art-source/books-shop/people/gloaming-dealer.png', 44),
]
for name, src, tall in PIECES:
    im = Image.open(src).convert('RGBA')
    im = im.crop(im.getbbox())
    h = tall * 3
    w = round(im.width * h / im.height)
    im = im.resize((w, h), Image.LANCZOS)
    im.save(f'{OUT}/{name}.webp', 'WEBP', quality=90, method=6)
    print(name, im.size)
