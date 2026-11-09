"""Pack the twelve equal scenic tiles without repainting. Run from the repository root."""
import json
from pathlib import Path
from PIL import Image
source = Image.open('art-source/castle-tab-renewal/building-scenes.png').convert('RGB')
names = ['treasury', 'barracks', 'armoury', 'mageTower', 'stable', 'library', 'chapel', 'smithy', 'watchtower', 'hall', 'drillYard', 'site']
out = Path('src/art/castle-remake')
for i, name in enumerate(names):
    col, row = i % 4, i // 4
    box = (round(col * source.width / 4), round(row * source.height / 3), round((col + 1) * source.width / 4), round((row + 1) * source.height / 3))
    source.crop(box).save(out / f'{name}.webp', quality=90, method=6)
manifest = json.loads((out / 'manifest.json').read_text())
manifest['painted'] = sorted(set(manifest['painted']) | set(names))
(out / 'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
