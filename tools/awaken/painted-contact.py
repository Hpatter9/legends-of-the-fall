"""Lay out real browser captures from painted-checks.mjs; no game artwork is altered."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path('out/painted-auras')
dest = Path('docs/samples/painted-auras')
dest.mkdir(parents=True, exist_ok=True)
heroes = [('Guardian', 'knight'), ('Bulwark', 'juggernaut'), ('Blade', 'samurai'),
          ('Marksman', 'ranger'), ('Gunner', 'rifleBot'), ('Caster', 'wizard'),
          ('Arcanist', 'timeWitch'), ('Support', 'priestess'), ('Beast', 'werewolf'),
          ('Assassin', 'reaper'), ('Trickster', 'kitsune'), ('Warden', 'druid'), ('Vanguard', 'lancer')]
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 14)
sheet = Image.new('RGB', (1050, 100 + 5 * 240), '#181a20')
d = ImageDraw.Draw(sheet)
d.text((20, 16), 'PAINTED ASCENSION AURAS — actual battle renderer', font=font, fill='#ffd24a')
d.text((20, 48), 'Each pair: Ascension I / Ascension II. Controlled deploy-board fixtures at 393 × 852.', font=small, fill='#dddde5')
for i, (label, hero) in enumerate(heroes):
    x, y = 15 + (i % 3) * 345, 90 + (i // 3) * 240
    d.text((x, y), label, font=font, fill='white')
    for step in [1, 2]:
        capture = Image.open(root / f'close-{hero}-{step}.png').convert('RGB')
        capture.thumbnail((160, 200), Image.Resampling.LANCZOS)
        sheet.paste(capture, (x + (step - 1) * 165, y + 28))
sheet.save(dest / 'all-classes.jpg', quality=92)
print(dest / 'all-classes.jpg')

tags = ['360x780', '393x852', '412x915', '393x852-reduced', '393x852-saver']
phones = Image.new('RGB', (5 * 260, 80 + 3 * 585), '#181a20')
d = ImageDraw.Draw(phones)
d.text((16, 14), 'Painted auras — real portrait, reduced-motion and battery-saver captures', font=font, fill='#ffd24a')
for row, screen in enumerate(['camp', 'dossier', 'battle-wizard-2']):
    for col, tag in enumerate(tags):
        im = Image.open(root / f'{screen}-{tag}.png').convert('RGB')
        im.thumbnail((250, 545), Image.Resampling.LANCZOS)
        x, y = col * 260, 70 + row * 585
        d.text((x + 5, y), f'{screen} · {tag}', font=small, fill='white')
        phones.paste(im, (x + 5, y + 25))
phones.save(dest / 'phone-review.jpg', quality=92)
print(dest / 'phone-review.jpg')
