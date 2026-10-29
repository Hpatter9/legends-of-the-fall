# STATUS-FX phase A: lays the close-ups cut by tools/status-fx/shots.mjs into one contact sheet, a column an ailment and a
# row each for a hero and a foe, with each ailment's name under it: docs/samples/status-fx-contact.png.
from PIL import Image, ImageDraw
KEYS = ['burn', 'poison', 'freeze', 'bleed', 'chill', 'shock', 'stun', 'weak', 'curse', 'silence', 'fear']
NAMES = ['Burning', 'Poisoned', 'Frozen', 'Bleeding', 'Chilled', 'Shocked', 'Stunned', 'Weakened', 'Cursed', 'Silenced', 'Feared']
W, H, PER = 128, 168, 6
rows = (len(KEYS) + PER - 1) // PER
sheet = Image.new('RGB', (PER * W, rows * (2 * H + 18)), (24, 18, 14))
d = ImageDraw.Draw(sheet)
for i, (k, n) in enumerate(zip(KEYS, NAMES)):
    x, y = (i % PER) * W, (i // PER) * (2 * H + 18)
    for j, side in enumerate(['hero', 'foe']):
        sheet.paste(Image.open(f'out/shots/status-fx-crop-{k}-{side}.png').convert('RGB'), (x, y + j * H))
    d.text((x + 6, y + 2 * H + 3), n, fill=(240, 228, 200))
sheet.save('docs/samples/status-fx-contact.png')
print(sheet.size)
