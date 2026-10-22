import json, sys
from PIL import Image, ImageDraw, ImageFont
roster = json.load(open(sys.argv[1]))
layout = json.load(open('src/art/units/sheets.json'))
D = 'src/art/units/'
TIER = {1: ('Common', (150, 150, 150)), 2: ('Rare', (90, 160, 255)), 3: ('Epic', (190, 110, 255)), 4: ('Legendary', (255, 170, 60)), 5: ('Mythic', (255, 90, 90))}
SIZE = 96   # a portrait
def portrait(sheet):
    e = layout[sheet]; im = Image.open(D + sheet + '.png').convert('RGBA')
    w, h = e['w'], e['h']; i = e['rows'].index('idle')
    cell = im.crop((0, i * h, w, (i + 1) * h))
    side = min(e['figure'] + 6, h)
    sx = max(0, w // 2 - side // 2)
    c = cell.crop((sx, h - side, sx + side, h))
    k = max(1, SIZE // side)
    c = c.resize((side * k, side * k), Image.NEAREST)
    out = Image.new('RGBA', (SIZE, SIZE), (46, 32, 24, 255))
    out.alpha_composite(c, ((SIZE - c.width) // 2, (SIZE - c.height) // 2))
    return out
font = ImageFont.load_default()
COLS, PAD, CELLW, CELLH = 4, 8, 2 * SIZE + 3 * 8, SIZE + 48
rows = (len(roster) + COLS - 1) // COLS
sheet = Image.new('RGBA', (COLS * (CELLW + PAD) + PAD, rows * (CELLH + PAD) + PAD), (24, 16, 12, 255))
d = ImageDraw.Draw(sheet)
for n, h in enumerate(roster):
    x = PAD + (n % COLS) * (CELLW + PAD); y = PAD + (n // COLS) * (CELLH + PAD)
    name, col = TIER[h['rarity']]
    d.rectangle([x, y, x + CELLW, y + CELLH], fill=(58, 40, 30, 255), outline=col)
    for j, g in enumerate((0, 2)):
        sheet.alpha_composite(portrait(h['forms'][min(g, len(h['forms']) - 1)]), (x + 8 + j * (SIZE + 8), y + 6))
    d.text((x + 8, y + SIZE + 12), h['name'], fill=(255, 240, 200), font=font)
    d.text((x + 8, y + SIZE + 24), f"{name} - {' / '.join(h['traits'])}", fill=col, font=font)
    d.text((x + 8, y + SIZE + 36), h['skill'] + (' + ' + h['ultimate'] if h['ultimate'] else ''), fill=(200, 200, 200), font=font)
sheet = sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST)
sheet.save(sys.argv[2]); print(sheet.size)
