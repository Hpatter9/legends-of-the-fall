"""Everything from one command: render what has changed, pixelate, pack, write the manifest.

    python3 tools/blender-fx/build.py                 (npm run blender-fx)
    python3 tools/blender-fx/build.py --only spell-heal-cast,spell-frost-cast     render only these, then pack all
    python3 tools/blender-fx/build.py --sheet out.png spell-                      a contact sheet of the ids starting so

Needs `pip install bpy pillow numpy`. The rendered frames are kept in out/blender-fx/raw (not in the repo: this
command makes them again), so a second run only renders what changed.
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
RAW = os.path.join(ROOT, 'out', 'blender-fx', 'raw')
ART = os.path.join(ROOT, 'src', 'art', 'fx', 'blender')
MANIFEST = os.path.join(ROOT, 'src', 'render', 'blenderFxData.ts')
WORKERS = int(os.environ.get('WORKERS', os.cpu_count() or 2))


def main(argv):
    from effects import EFFECTS, SHIPPED
    from pack import pack
    from pixelate import pixelate
    from render import stale
    if '--sheet' in argv:
        from sheet import sheet
        i = argv.index('--sheet')
        ids = [k for k in EFFECTS if any(k.startswith(p) for p in argv[i + 2:])]
        render_all(ids, EFFECTS, stale)
        sheet(RAW, argv[i + 1], ids, int(os.environ.get('COLS', 8)), int(os.environ.get('ZOOM', 2)))
        return
    only = argv[argv.index('--only') + 1].split(',') if '--only' in argv else None
    render_all(only or SHIPPED, EFFECTS, stale)
    os.makedirs(ART, exist_ok=True)
    items = []
    for key in SHIPPED:
        frames, glows, _ = pixelate(RAW, EFFECTS[key])
        items.append((EFFECTS[key], frames, glows))
    total, warn, px, soft = pack(items, ART, MANIFEST)
    print(f'{len(items)} effects, {sum(len(f) for _, f, _ in items)} frames; {len(px)} pixel atlases {px}, {len(soft)} glow atlases {soft}; {total} bytes')
    for key in warn:
        print(f'  warning: {key} touches its canvas\'s edge (make its canvas larger)')
    # (ON-FIGHTER: how much of a fighter's body each clip that plays on one covers, for the renderer to thin it by)
    subprocess.run([sys.executable, os.path.join(HERE, 'body_cover.py'), '0'], check=True, stdout=subprocess.DEVNULL)


def render_all(ids, effects, stale):
    todo = [k for k in ids if stale(RAW, effects[k])]
    if not todo:
        return
    os.makedirs(RAW, exist_ok=True)
    print(f'rendering {len(todo)} effects on {WORKERS} workers', flush=True)
    procs = [subprocess.Popen([sys.executable, os.path.join(HERE, 'render.py'), RAW] + todo[w::WORKERS], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE) for w in range(WORKERS) if todo[w::WORKERS]]
    for p in procs:
        err = p.communicate()[1].decode()
        if p.returncode:
            raise SystemExit(err[-3000:])


if __name__ == '__main__':
    main(sys.argv[1:])
