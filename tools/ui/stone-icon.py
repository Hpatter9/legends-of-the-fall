# Cuts the summoning stone's icon (src/art/ui/ic-stone.png) from the Crystal Caves platformer tileset's "Mana" crystal in the
# assets repo (clone hpatter9/chronos-assets next to this repo): cropped to its pixels, centred on a square and scaled to 64x64.
from PIL import Image
SRC = '../chronos-assets/assets/craftpix-net-376431-free-crystal-caves-2d-platformer-tileset/PNG/Collectable Object/Crystal_Caves_Forest_2D_Platformer_Tileset_Collectable Object - Mana.png'
im = Image.open(SRC).convert('RGBA')
im = im.crop(im.getbbox())
side = max(im.size)
sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
sq.resize((64, 64), Image.LANCZOS).save('src/art/ui/ic-stone.png')
