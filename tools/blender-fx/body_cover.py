"""ON-FIGHTER (docs/notes/on-fighter.md): how much of a fighter's body each rendered clip that plays ON a fighter covers.

    python3 tools/blender-fx/body_cover.py [rows]     writes src/render/bodyCover.ts and tools/blender-fx/body-cover.json, and prints
                                                      the table, worst first (the build runs it after packing)

The body's box is the rule's (`BODY` in src/render/onFighterRules.ts): 0.6 of a tile wide about the clip's anchor, from 0.2 to 1.0
of a tile above the feet. A clip's cover is the share of that box its pixels fill (each by its own opacity), frame by frame; `max`
and `mean` are over the frames after the first 150 ms (a brief flash at the start is allowed). The clips measured are those the
renderer puts on a fighter: an ultimate's wind-up (on its caster), its strike where that plays on each fighter it touches or round
its caster, every aftermath (on those struck), the king's spells' cast and hit clips, and the aura loops.
"""
import json
import os
import re
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = open(os.path.join(ROOT, 'src/render/blenderFxData.ts')).read()
D = float(re.search(r'BFX_DENSITY = ([0-9.]+)', src).group(1))
clips = {m.group(1): json.loads(m.group(2)) for m in re.finditer(r"^  '([^']+)': (\{.*\}),?$", src, re.M)}
W, FROM, TO, FLASH = 0.6, 0.2, 1.0, 150
atlases = {}


def on_fighter(key, c):
    if key.startswith('ult-'):
        kind, stage = key.split('-')[1:3]
        if stage == 'windup' or stage == 'aftermath':
            return True
        return c.get('at') in ('each', 'friends', 'self')
    if key.startswith('aura-') and '-pool-' not in key and '-wisp-' not in key:
        return True
    return key.startswith('spell-') and key.rsplit('-', 1)[1] in ('cast', 'hit')


rows = []
for key, c in sorted(clips.items()):
    if not on_fighter(key, c):
        continue
    a = atlases.get(c['a'])
    if a is None:
        a = atlases[c['a']] = Image.open(os.path.join(ROOT, f"src/art/fx/blender/px-{c['a']}.webp")).convert('RGBA')
    per = c['ms'] / c['n']
    covers = []
    for i in range(c['n']):
        fx, fy = c['x'] + (i % c['cols']) * c['w'], c['y'] + (i // c['cols']) * c['h']
        x0, x1 = round(c['ax'] - W / 2 * D), round(c['ax'] + W / 2 * D)
        y0, y1 = round(c['ay'] - TO * D), round(c['ay'] - FROM * D)
        box = a.crop((fx + max(0, x0), fy + max(0, y0), fx + min(c['w'], x1), fy + min(c['h'], y1))).getchannel('A')
        area = max(1, (x1 - x0) * (y1 - y0))
        covers.append(sum(box.tobytes()) / 255 / area)
    late = [v for i, v in enumerate(covers) if i * per >= FLASH] or covers
    rows.append(dict(key=key, max=round(max(late), 3), mean=round(sum(late) / len(late), 3), ms=c['ms'], at=c.get('at', '')))
rows.sort(key=lambda r: (-r['max'], r['key']))
json.dump({r['key']: [r['max'], r['mean']] for r in rows}, open(os.path.join(ROOT, 'tools/blender-fx/body-cover.json'), 'w'), indent=0, sort_keys=True)
with open(os.path.join(ROOT, 'src/render/bodyCover.ts'), 'w') as f:
    f.write("// ON-FIGHTER (docs/notes/on-fighter.md): the most of a fighter's body each rendered clip that plays on a fighter covers, after its\n"
            "// first 150 ms (a share of the body's box, `BODY` in onFighterRules.ts). Made by tools/blender-fx/body_cover.py (the build runs\n"
            "// it); do not edit. The renderer thins a clip over the fighter by it (`overAlpha`).\n"
            "export const BODY_COVER: Readonly<Record<string, number>> = {\n")
    for r in sorted(rows, key=lambda r: r['key']):
        f.write(f"  '{r['key']}': {r['max']},\n")
    f.write("};\n")
top = int(sys.argv[1]) if len(sys.argv) > 1 else 40
print(f'{len(rows)} clips on a fighter; over 0.15: {sum(r["max"] > 0.15 for r in rows)}; over 0.5: {sum(r["max"] > 0.5 for r in rows)}')
print('| Clip | Most of the body covered | On average | Lasts |\n| --- | --- | --- | --- |')
for r in rows[:top]:
    print(f"| `{r['key']}` | {round(r['max'] * 100)}% | {round(r['mean'] * 100)}% | {r['ms']} ms |")
