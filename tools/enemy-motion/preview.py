"""Assemble a looping preview from the shipping sprites at their battle proportions."""
import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
LAYOUT = json.loads((ROOT / 'src/art/units/sheets.json').read_text())
ENEMIES = [
    ('hk_orc_grunt', 'Orc Grunt', 0.63), ('hk_orc_archer', 'Orc Archer', 0.69),
    ('hk_orc_brute', 'Orc Brute', 0.57), ('hk_orc_warlord', 'Orc Warlord', 0.55),
    ('hk_demon', 'Demon', 0.39), ('hk_demon_lord', 'Demon Lord', 0.46),
    ('hk_imp', 'Imp', 0.65), ('hk_ogre', 'Ogre', 0.42), ('hk_ogre_horned', 'Horned Ogre', 0.47),
]


def main():
    sheets = {key: Image.open(ROOT / 'src/art/units' / (key + '.png')).convert('RGBA') for key, _, _ in ENEMIES}
    frames = []
    for tick in range(30):
        time = tick * 80
        canvas = Image.new('RGB', (720, 660), '#282c34')
        draw = ImageDraw.Draw(canvas)
        for i, (key, name, scale) in enumerate(ENEMIES):
            entry = LAYOUT[key]
            hurt = 1200 <= time < 1440
            row = entry['rows'].index('hurt' if hurt else 'idle')
            cell = (time - 1200) // 80 if hurt else ((time + (i + 1) * 173) % 1200) // 300
            image = sheets[key].crop((cell * entry['w'], row * entry['h'], (cell + 1) * entry['w'], (row + 1) * entry['h']))
            # Resize the full padded frame to preserve its feet and centre through the clip.
            image = image.resize((round(image.width * scale * 3), round(image.height * scale * 3)), Image.Resampling.NEAREST)
            col, line = i % 3, i // 3
            canvas.paste(image, (col * 240 + (240 - image.width) // 2, line * 220 + 192 - image.height), image)
            draw.text((col * 240 + 15, line * 220 + 200), name + (' - recoil' if hurt else ''), fill='white')
        frames.append(canvas)
    path = ROOT / 'docs/samples/enemy-motion/roster-motion.gif'
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=80, loop=0)
    print(path)


if __name__ == '__main__':
    main()
