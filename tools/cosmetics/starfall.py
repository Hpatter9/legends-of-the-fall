"""COSMETICS (docs/notes/cosmetics.md): Starfall summons, cut from the round-2 art (art-source/round2/, the owner's PR #666):

  src/art/starfall/cardback.webp  256 x 384: the card back every summoning card shows before it turns (the painting cropped to its card)
  src/art/starfall/burst.webp     2048 x 256: the burst as a card turns and as a new hero arrives, eight frames of 256 px

    python3 tools/cosmetics/starfall.py
"""
import os
from PIL import Image

SRC = 'art-source/round2/'
OUT = 'src/art/starfall/'
os.makedirs(OUT, exist_ok=True)
back = Image.open(SRC + 'starfall_cardback.png').convert('RGBA')
back = back.crop(back.getbbox()).resize((256, 384), Image.LANCZOS)
back.save(OUT + 'cardback.webp', 'WEBP', quality=90, method=6)
Image.open(SRC + 'starfall_burst.png').convert('RGBA').save(OUT + 'burst.webp', 'WEBP', quality=88, method=6)
