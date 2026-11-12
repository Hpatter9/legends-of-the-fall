#!/usr/bin/env python3
"""INTI-MINH-ART: one command to pack Inti's (Ranger) and Minh's (Peasant) new battle sheets into the game.

  python3 tools/inti-minh-art/pack.py            # both
  python3 tools/inti-minh-art/pack.py ranger     # one

The new art replaces the two source atlases where the remakes' packer already reads them:
  art-source/hero-remakes/ranger.png   art-source/hero-remakes/peasant.png
each 8 columns by 7 rows on a transparent background (docs/notes/inti-minh-art-prompts.md has the layout). This checks
each source first and says plainly what is wrong with it, then runs the remakes' own steps: `tools/hero-remakes/pack.py`
(cuts the 56 figures, writes the front and back sheets, their toned copies and `sheets.json`), `tools/resonance/apply.cjs
--art-only` (bundles them), `tools/hero-remakes/validate.py` (checks all ten remakes' shipped pixels) and the contact
sheets. The Carter (the guest) draws the Peasant's sheet, so he follows with no step of his own.
Needs Pillow, NumPy and SciPy (`pip install pillow numpy scipy`).
"""
import subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/hero-remakes'))
HEROES = ['ranger', 'peasant']


def check(hero):
    """The faults a generated sheet most often has, each with what to ask for again."""
    import pack as remakes
    path = remakes.SOURCE / f'{hero}.png'
    if not path.exists():
        return f'{path.relative_to(ROOT)} is missing'
    im = Image.open(path)
    if im.mode != 'RGBA' or (np.array(im)[..., 3] < 128).mean() < 0.3:
        return f'{path.name}: the background is not transparent (ask for an RGBA PNG with a transparent background)'
    try:
        frames = remakes.extract(path)
    except AssertionError as e:
        why = e.args[0][-1] if e.args and isinstance(e.args[0], tuple) else str(e)
        where = e.args[0][1:-1] if e.args and isinstance(e.args[0], tuple) else ''
        return (f'{path.name}: {why} at row/column or cell {where} (rows and columns count from 0). The sheet must be exactly '
                '8 columns by 7 rows, one whole figure in every cell, no two figures touching')
    tall = [f['image'].height for f in frames[:8]]
    if min(tall) < 96:
        return f'{path.name}: the idle figures are only {min(tall)} px tall; they must be at least 96 px (ask for a larger canvas)'
    return None


def main():
    heroes = sys.argv[1:] or HEROES
    assert all(h in HEROES for h in heroes), f'only {HEROES}'
    faults = [f for f in map(check, heroes) if f]
    if faults:
        sys.exit('Not packed:\n  ' + '\n  '.join(faults))
    run = lambda *cmd: subprocess.run(cmd, cwd=ROOT, check=True)
    run(sys.executable, 'tools/hero-remakes/pack.py', *heroes)
    run('node', 'tools/resonance/apply.cjs', '--art-only')
    run(sys.executable, 'tools/hero-remakes/validate.py')
    run(sys.executable, 'tools/inti-minh-art/contact.py')
    print('Packed. Look at docs/samples/inti-minh-art/front.png and back.png and docs/samples/hero-remakes/{ranger,peasant}-*.png,'
          '\nthen: npm run typecheck && npm test -- heritage-looks resonance-facing hero-art hero-kits-looks quest-battle && npm run web')


if __name__ == '__main__':
    main()
