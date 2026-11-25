"""The Cursed status icon (PIXELLAB-ART): the picked PixelLab candidate (icons.py status_curse, cand01) laid into its own cell of the
status atlas, [6, 9] (curse.icon in atlas.json), at the size of the other ailments' icons, in place of the borrowed skull that was tinted.

  python3 tools/pixellab/curse.py
"""
import os
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
A = os.path.join(ROOT, 'src/art/fx/status/atlas.png')
icon = Image.open(os.path.join(ROOT, 'art-source/pixellab/icons/status_curse/cand01.png')).convert('RGBA')
icon = icon.crop(icon.getbbox()); k = 84 / max(icon.size)
icon = icon.resize((round(icon.width * k), round(icon.height * k)), Image.LANCZOS)
atlas = Image.open(A).convert('RGBA')
x, y = 6 * 96, 9 * 96
atlas.paste(Image.new('RGBA', (96, 96)), (x, y))
atlas.alpha_composite(icon, (x + (96 - icon.width) // 2, y + (96 - icon.height) // 2))
atlas.save(A, optimize=True)
print('curse icon laid at', (x, y))
