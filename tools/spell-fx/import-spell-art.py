"""RPG-SPELLS: bring the painted spell and movement effects into the game (the brief: art-source/spell-fx/BRIEF.md; the note:
docs/notes/spell-art.md). The way tools/status-fx/import-status-art.py brought in the ailments' paintings.

Usage (from anywhere; paths are the repo's):
    python3 tools/spell-fx/import-spell-art.py [<folder>] [cell=96] [--check] [--contact <png>]

<folder> (default art-source/spell-fx) holds one folder a session (a-toolkit, b-auras, c-healers, d-casters, e-moves, f-martial,
g-spells), each with one PNG a key (`<key>.png`). The manifest tools/spell-fx/spell-parts.json lists every key the brief asks
for, its session, and its rows in order as [part, kind, fewest frames, most frames, size in tiles].

For every sheet that is there, it checks the brief's format and names the sheet and row of each fault:
  - the height splits into the manifest's number of rows of square cells, `cell` px each (256), and the width into whole cells;
  - no row is empty, and each row's frames (from the left, up to the first empty cell) are within the manifest's range;
  - no frame follows an empty cell;
  - the four corner pixels of every used cell are transparent (alpha under 8).
A sheet with a fault is left out (the game keeps its placeholder look); a missing sheet is reported; a PNG the manifest does not
know is reported.

Then it scales the passing cells to `cell` px (Lanczos) and packs one atlas a session, src/art/fx/spells/<session>.webp
(quality 85), 16 cells a row, no strip split across rows. src/art/fx/spells/index.json, which the game bundles, maps each
session to {"cell", "w", "h", "bytes", "parts": {"<key>.<part>": [column, row, frames, size in tiles, 1 if it loops, foot]}}, where `foot` is
how far down the cell (0 to 1) the row's painting reaches at its lowest, so the game can stand an effect that grows from the ground
on the ground however the sheet placed it.
A session with no passing sheet has no atlas (an old one is removed). It prints each atlas's size and the total, and stops,
writing nothing, if the total is over 5 MB (run it again with cell=80).

Small fixes to a painted sheet, made here rather than by repainting it, are listed in tools/spell-fx/spell-fixes.json:
`"<key>.<part>": {"frames": [source frame numbers, from 0]}` packs the row's frames in that order (a loop that grows out of
nothing and would pop each time round is played from its full frames, back and forth; a loop that swaps colour every frame keeps
one colour); `"fade": n` adds n frames after the last, the last again thinner each time (a "once" row painted to end on its fullest
frame would cut off hard). A fix is applied after the checks, and the packed row must still be in the brief's range.

--check only checks the sheets and writes nothing (it exits 1 when a sheet has a fault). --contact <png> also draws every
packed strip, labelled, on one picture for review. The painted sources are never changed. Re-run it whenever a session lands.
"""
import io
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = json.loads((ROOT / 'tools/spell-fx/spell-parts.json').read_text())
SRC_CELL = MANIFEST['cell']
FIXES = json.loads((ROOT / 'tools/spell-fx/spell-fixes.json').read_text()) if (ROOT / 'tools/spell-fx/spell-fixes.json').exists() else {}
FIXES = {k: v for k, v in FIXES.items() if k != '_'}
SESSIONS = {k: v for k, v in MANIFEST.items() if k not in ('_', 'cell')}
OUT = ROOT / 'src/art/fx/spells'
COLS = 16
CAP = 5 * 1024 * 1024
QUALITY = 85

args = [a for a in sys.argv[1:]]
check_only = '--check' in args
contact = None
if '--contact' in args:
    i = args.index('--contact')
    contact = Path(args[i + 1])
    del args[i:i + 2]
args = [a for a in args if a != '--check']
cell = 96
src = ROOT / 'art-source/spell-fx'
for a in args:
    if a.startswith('cell='):
        cell = int(a[5:])
    else:
        src = Path(a).resolve()


def check(key: str, rows: list, path: Path):
    """The sheet's faults (none: it fits), and each row's frames as images at the source size."""
    sheet = Image.open(path).convert('RGBA')
    w, h = sheet.size
    faults: list[str] = []
    side = h // len(rows)
    if h % len(rows) or side != SRC_CELL:
        return [f'{w}x{h} does not split into {len(rows)} row(s) of {SRC_CELL} px cells ({", ".join(r[0] for r in rows)})'], []
    if w % side:
        faults.append(f'{w} px wide is not a whole number of {side} px cells')
    strips = []
    for r, (part, _kind, lo, hi, _size) in enumerate(rows):
        frames = []
        ended = False
        for c in range(w // side):
            f = sheet.crop((c * side, r * side, (c + 1) * side, (r + 1) * side))
            a = f.getchannel('A')
            if a.getbbox() is None:
                ended = True
                continue
            if ended:
                faults.append(f'row {r + 1} ({part}): frame {c + 1} follows an empty cell')
                continue
            corners = max(a.getpixel(xy) for xy in ((0, 0), (side - 1, 0), (0, side - 1), (side - 1, side - 1)))
            if corners >= 8:
                faults.append(f'row {r + 1} ({part}) frame {c + 1}: a corner is not transparent (alpha {corners})')
            frames.append(f)
        if not frames:
            faults.append(f'row {r + 1} ({part}) is empty')
        elif not lo <= len(frames) <= hi:
            faults.append(f'row {r + 1} ({part}): {len(frames)} frames, the brief allows {lo} to {hi}')
        strips.append(frames)
    return faults, strips


failed: list[str] = []
packed: dict[str, list[tuple[str, list, float, bool]]] = {}
for session, keys in SESSIONS.items():
    folder = src / session
    if not folder.is_dir():
        print(f'{session}: not painted yet ({len(keys)} sheets to come); the placeholders stay')
        continue
    strips: list[tuple[str, list, float, bool]] = []
    missing = [k for k in keys if not (folder / f'{k}.png').exists()]
    unknown = sorted(p.stem for p in folder.glob('*.png') if p.stem not in keys)
    ok = 0
    for key, rows in keys.items():
        path = folder / f'{key}.png'
        if not path.exists():
            continue
        faults, frames = check(key, rows, path)
        if faults:
            failed.append(f'{session}/{key}.png')
            for f in faults:
                print(f'  FAULT {session}/{key}.png: {f}')
            continue
        ok += 1
        for (part, kind, lo, hi, size), fr in zip(rows, frames):
            fix = FIXES.get(f'{key}.{part}')
            if fix and 'frames' in fix:
                order = fix['frames']
                if any(i >= len(fr) for i in order) or not lo <= len(order) <= hi:
                    raise SystemExit(f'spell-fixes.json: {key}.{part} names frames {order} (the sheet has {len(fr)}; {lo} to {hi} allowed)')
                fr = [fr[i] for i in order]
            if fix and fix.get('fade'):
                # (a "once" row that ends on its fullest frame would cut off hard: that frame again, thinner each time, to nothing)
                n = fix['fade']
                last = fr[-1]
                for i in range(n):
                    f = last.copy()
                    f.putalpha(last.getchannel('A').point(lambda a, k=(n - i) / (n + 1): int(a * k)))
                    fr = fr + [f]
                if len(fr) > hi:
                    raise SystemExit(f'spell-fixes.json: {key}.{part} fades to {len(fr)} frames ({hi} allowed)')
            strips.append((f'{key}.{part}', fr, size, kind == 'loop'))
    bad = sum(1 for f in failed if f.startswith(session + '/'))
    print(f'{session}: {ok} of {len(keys)} sheets pass' + (f'; {bad} left out' if bad else ''))
    if missing:
        print(f'  missing ({len(missing)}): {", ".join(missing)}')
    if unknown:
        print(f'  not in the manifest (ignored): {", ".join(unknown)}')
    if strips:
        packed[session] = strips

if check_only:
    raise SystemExit(1 if failed else 0)

# Pack each session: rows of COLS cells, a strip never split across rows.
atlases: dict[str, tuple[bytes, dict, Image.Image]] = {}
total = 0
for session, strips in packed.items():
    place: dict[str, list] = {}
    col = row = 0
    for key, frames, size, loop in strips:
        if col + len(frames) > COLS:
            col, row = 0, row + 1
        low = max((f.getchannel('A').point(lambda a: 255 if a >= 24 else 0).getbbox() or (0, 0, 0, 0))[3] for f in frames)
        place[key] = [col, row, len(frames), size, 1 if loop else 0, round(low / SRC_CELL, 2)]
        col += len(frames)
    atlas = Image.new('RGBA', (COLS * cell, (row + 1) * cell), (0, 0, 0, 0))
    for key, frames, _size, _loop in strips:
        c, r = place[key][0], place[key][1]
        for i, f in enumerate(frames):
            atlas.paste(f.resize((cell, cell), Image.Resampling.LANCZOS), ((c + i) * cell, r * cell))
    buf = io.BytesIO()
    atlas.save(buf, 'WEBP', quality=QUALITY, method=6)
    data = buf.getvalue()
    total += len(data)
    atlases[session] = (data, {'cell': cell, 'w': atlas.width, 'h': atlas.height, 'bytes': len(data), 'parts': place}, atlas)
    print(f'{session}.webp: {len(place)} parts, {atlas.width}x{atlas.height}, {len(data) / 1024:.0f} KB')

print(f'total: {total / 1024 / 1024:.2f} MB of {CAP / 1024 / 1024:.0f} MB')
if total > CAP:
    raise SystemExit(f'over {CAP / 1024 / 1024:.0f} MB: nothing written. Run it again with a smaller cell (cell=80).')

OUT.mkdir(parents=True, exist_ok=True)
for old in OUT.glob('*.webp'):
    if old.stem not in atlases:
        old.unlink()
index = {}
for session, (data, meta, _img) in atlases.items():
    (OUT / f'{session}.webp').write_bytes(data)
    index[session] = meta
(OUT / 'index.json').write_text(json.dumps(index, separators=(',', ':')) + '\n')
print(f'wrote {len(atlases)} atlas(es) and index.json to {OUT.relative_to(ROOT)}')

if contact:
    # Every packed strip on one dark picture, a label above each, for review.
    thumb = 64
    lines = [(s, k, fr) for s, strips in packed.items() for k, fr, _sz, _lp in strips]
    width = 220 + 8 * thumb
    pic = Image.new('RGBA', (width, len(lines) * (thumb + 4) + 8), (24, 26, 34, 255))
    d = ImageDraw.Draw(pic)
    y = 4
    for s, k, fr in lines:
        d.text((6, y + thumb // 2 - 6), f'{s[0].upper()} {k}', fill=(230, 230, 230, 255))
        for i, f in enumerate(fr[:8]):
            x = 220 + i * thumb
            d.rectangle((x, y, x + thumb - 2, y + thumb - 2), fill=(52, 70, 52, 255) if (i % 2) else (60, 78, 60, 255))
            t = f.resize((thumb - 2, thumb - 2), Image.Resampling.LANCZOS)
            pic.alpha_composite(t, (x, y))
        y += thumb + 4
    contact.parent.mkdir(parents=True, exist_ok=True)
    pic.convert('RGB').save(contact)
    print(f'contact sheet: {contact}')

if failed:
    print(f'{len(failed)} sheet(s) left out: {", ".join(failed)}')
