#!/usr/bin/env python3
"""Draws docs/samples/gear-icons.png: all 60 equipment icons with their names, rows of weapons, armour and trinkets.
Reads the names from src/sim/equipBases.ts. Usage: python3 tools/equip-sheet.py"""
import re, os
from PIL import Image, ImageDraw, ImageFont
root = os.path.join(os.path.dirname(__file__), '..')
src = open(os.path.join(root, 'src/sim/equipBases.ts')).read()
items = [(m[0], m[1] or m[2], m[3], m[4]) for m in re.findall(r"id: '(\w+)', name: (?:'([^']*)'|\"([^\"]*)\"), mythic: .*?slot: (\w), icon: '(\w+)'", src)]
S, COLS, CW, CH = 4, 5, 180, 100
font = ImageFont.load_default()
try: font = ImageFont.truetype(os.path.join(root, 'node_modules/@fontsource/pixelify-sans/files/pixelify-sans-latin-400-normal.woff'), 12)
except Exception: pass
rows = (len(items) + COLS - 1) // COLS
sheet = Image.new('RGBA', (COLS * CW, rows * CH), (42, 23, 14, 255))
d = ImageDraw.Draw(sheet)
for i, (bid, name, slot, icon) in enumerate(items):
    x, y = (i % COLS) * CW, (i // COLS) * CH
    d.rectangle([x + 2, y + 2, x + CW - 3, y + CH - 3], outline=(107, 65, 40, 255))
    d.rectangle([x + 8, y + 8, x + 8 + 16 * S + 3, y + 8 + 16 * S + 3], fill=(26, 13, 7, 255), outline=(150, 150, 150, 255))
    sheet.alpha_composite(Image.open(os.path.join(root, 'src/art/equip', icon + '.png')).convert('RGBA').resize((16 * S, 16 * S), Image.NEAREST), (x + 10, y + 10))
    d.text((x + 10 + 16 * S + 8, y + 12), {'W': 'weapon', 'A': 'armour', 'T': 'trinket'}[slot], fill=(255, 210, 74, 255), font=font)
    words = name.split(' ')
    d.text((x + 10 + 16 * S + 8, y + 28), '\n'.join(words) if len(name) > 14 else name, fill=(255, 255, 255, 255), font=font)
    d.text((x + 8, y + CH - 18), icon, fill=(150, 130, 110, 255), font=font)
sheet.save(os.path.join(root, 'docs/samples/gear-icons.png'))
print(len(items), 'items')
