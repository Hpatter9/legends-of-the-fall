"""Pack the approved 3x2 source sheets into square quest portraits; run from any directory."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
BATCHES = {
    'campaigns': ['oswy', 'teal', 'pim', 'widow', 'sorrel'],
    'tales-1': ['shepherd', 'gaoler', 'smith', 'sexton', 'pawnbroker'],
    'tales-2': ['lantern', 'herald', 'clock', 'falconer', 'archivist'],
}
preview = Image.new('RGB', (750, 510), '#171415')
draw = ImageDraw.Draw(preview)
for row, (batch, names) in enumerate(BATCHES.items()):
    sheet = Image.open(ROOT / f'art-source/quest-givers/{batch}.png').convert('RGB')
    w, h = sheet.size
    assert w % 3 == 0 and h % 2 == 0 and w // 3 == h // 2
    cell = w // 3
    for i, name in enumerate(names):
        x, y = i % 3 * cell, i // 3 * cell
        # Tighten to head and shoulders for the game's 40px and 64px frames.
        portrait = sheet.crop((x + 50, y, x + cell - 50, y + cell - 100))
        assert portrait.width == portrait.height
        portrait.resize((256, 256), Image.Resampling.LANCZOS).save(
            ROOT / f'src/art/quests/{name}-face.png', optimize=True)
        preview.paste(portrait.resize((112, 112), Image.Resampling.LANCZOS), (i * 150 + 4, row * 170))
        preview.paste(portrait.resize((40, 40), Image.Resampling.LANCZOS), (i * 150 + 112, row * 170 + 72))
        draw.text((i * 150 + 4, row * 170 + 120), name, fill='#eadac1')
preview.save(ROOT / 'docs/samples/quest-givers/contact.png')
print('Imported 15 portraits at 256px; contact sheet includes 40px samples.')
