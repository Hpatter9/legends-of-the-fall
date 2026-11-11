"""Render effects' frames with Blender (as a Python module: Cycles on the CPU, no display).

    python3 render.py <raw dir> <id> [<id> ...]

Each effect writes <raw dir>/<id>/NN.png, larger than it is kept (`lib.SUPER`); `pixelate.py` shrinks and cuts them.
An effect whose recipe and scene code have not changed since its last render is left alone.
"""
import hashlib
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


_SCENE_SRC = None


def scene_sources():
    """Each scene's own source in scenes.py (and the shared helpers before the first), so a change to one scene
    re-renders only the effects that use it. Read as text: this must not need Blender."""
    global _SCENE_SRC
    if _SCENE_SRC is None:
        text = open(os.path.join(HERE, 'scenes.py')).read()
        parts = re.split(r'(?m)^def (\w+)\(', text)
        shared = parts[0] + ''.join(parts[i + 1] for i in range(1, len(parts), 2) if parts[i].startswith('_'))
        _SCENE_SRC = {'': shared}
        for i in range(1, len(parts), 2):
            _SCENE_SRC[parts[i]] = parts[i + 1]
    return _SCENE_SRC


def stamp(spec):
    """What an effect's frames depend on: its recipe, its scenes' code and the shared code."""
    src = scene_sources()
    h = hashlib.sha256(json.dumps(spec, sort_keys=True).encode())
    for f in ('lib.py', 'render.py'):
        h.update(open(os.path.join(HERE, f), 'rb').read())
    h.update(src[''].encode())
    for name in [spec['scene']] if 'scene' in spec else [st['scene'] for st in spec['stages']]:
        h.update(src[name].encode())
    return h.hexdigest()


def stale(raw, spec):
    try:
        return open(os.path.join(raw, spec['id'], 'stamp')).read() != stamp(spec)
    except OSError:
        return True


def render(raw, spec):
    import bpy
    from lib import Ctx, hide, win
    from scenes import SCENES
    c = Ctx(spec)
    # (an effect is one scene, or stages: scenes that each play over their own stretch of the effect's time, so a
    # long move can be a wind-up, a strike and an aftermath)
    stages = spec.get('stages') or [dict(scene=spec['scene'], opt=spec.get('opt', {}), at=[0, 1])]
    built = []
    for st in stages:
        before = set(c.sc.collection.objects)
        step = SCENES[st['scene']](c, **st.get('opt', {}))
        built.append((step, st.get('at', [0, 1]), [o for o in c.sc.collection.objects if o not in before and o.type == 'MESH']))
    out = os.path.join(raw, spec['id'])
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        os.remove(os.path.join(out, f))
    n = spec['frames']
    for f in range(n):
        t = f / n if spec.get('loop') else f / max(1, n - 1)
        for step, (a, b), objs in built:
            on = a <= t <= b
            if len(built) > 1:
                for o in objs:
                    hide(o, not on)
            if on:
                step(win(t, a, b))
            if len(built) > 1 and not on:
                for o in objs:
                    hide(o, True)
        c.sc.render.filepath = os.path.join(out, f'{f:02d}.png')
        bpy.ops.render.render(write_still=True)
    open(os.path.join(out, 'stamp'), 'w').write(stamp(spec))


if __name__ == '__main__':
    from effects import EFFECTS
    raw = sys.argv[1]
    for key in sys.argv[2:]:
        render(raw, EFFECTS[key])
        print('rendered', key, flush=True)
