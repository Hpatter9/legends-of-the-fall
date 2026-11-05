#!/usr/bin/env python3
"""Paint the relic icons with the Gemini image API (the network proxy adds the key).

  python3 tools/relics/paint-relics.py [ids...] [--try 2] [--model models/gemini-3-pro-image]
  python3 tools/relics/paint-relics.py --prompts      # only rewrite art-source/relics/PROMPTS.md

Each relic's raw painting goes to art-source/relics/raw/<id>.png (a second try to <id>-try2.png), and its
prompt, model and date are logged to art-source/relics/raw/log.json. The cut-out is done by cutout.py.
"""
import base64, concurrent.futures as cf, datetime, io, json, os, sys, time, urllib.request
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = json.load(open(os.path.join(ROOT, 'tools/relics/relics.json')))
RAW = os.path.join(ROOT, 'art-source/relics/raw')
LOG = os.path.join(RAW, 'log.json')
REF = os.path.join(ROOT, 'art-source/gear/trinkets/emberAmulet.png')
API = 'https://generativelanguage.googleapis.com/v1beta/{}:generateContent'

RARITY = {
    'Common': 'A plain, well-used everyday relic.',
    'Rare': 'A finer, more precious relic than most, with a little more craftsmanship and detail.',
    'Eidolon': 'A relic left behind by a great elemental being, touched by its element.',
    'Storied': 'One of the keep\'s legendary relics: richer, more ornate and more precious than any other, with a faint glow of power.',
}

def prompt_for(r):
    rid, name, group, rarity, _old, subject = r
    tint = DATA['groups'][group]['tint']
    return (
        'A single fantasy relic, painted as a game item icon in the same hand-painted style as the reference image '
        '(glossy, rich saturated colour, soft painted highlights, a crisp clean silhouette). Match only the painting style '
        'of the reference, not its object or colours. '
        'The relic is an ancient, treasured artefact, aged and worn: worn gilding, patina, small chips and scratches, '
        'old thread or wax where it fits, lit warmly as if by candlelight in a reliquary. '
        f'{RARITY[rarity]} Colour accent: {tint}. '
        f'Subject: {subject}. '
        'Composition: exactly one object, centred, three-quarter view, filling about 80% of the square, not touching the edges. '
        'Background: a perfectly flat, solid, pure magenta (#FF00FF) background, one uniform colour everywhere, with no gradient, '
        'no vignette, no cast shadow, no floor and no glow spilling onto it. '
        'No text, no letters, no frame, no border, no hands, no scene. Square 1:1 image, PNG.'
    )

def ref_part():
    im = Image.open(REF).convert('RGBA')
    bg = Image.new('RGBA', im.size, (255, 0, 255, 255)); bg.alpha_composite(im)
    b = io.BytesIO(); bg.convert('RGB').save(b, 'PNG')
    return {'inline_data': {'mime_type': 'image/png', 'data': base64.b64encode(b.getvalue()).decode()}}

def call(model, prompt, ref):
    body = {'contents': [{'parts': [ref, {'text': prompt}]}],
            'generationConfig': {'responseModalities': ['IMAGE'], 'imageConfig': {'aspectRatio': '1:1'}}}
    req = urllib.request.Request(API.format(model), json.dumps(body).encode(), {'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=300) as f:
        d = json.load(f)
    for c in d.get('candidates', []):
        for p in c.get('content', {}).get('parts', []):
            data = p.get('inlineData') or p.get('inline_data')
            if data:
                return base64.b64decode(data['data']), data.get('mimeType') or data.get('mime_type')
    raise RuntimeError('no image: ' + json.dumps(d)[:400])

def paint(r, attempt, models, ref):
    rid = r[0]; prompt = prompt_for(r)
    out = os.path.join(RAW, rid + ('' if attempt == 1 else f'-try{attempt}') + '.png')
    last = None
    for model in models:
        for k in range(3):
            try:
                data, mime = call(model, prompt, ref)
                im = Image.open(io.BytesIO(data)); im.save(out, 'PNG')
                return rid, {'file': os.path.relpath(out, ROOT), 'model': model, 'mime': mime, 'size': im.size,
                             'date': datetime.date.today().isoformat(), 'prompt': prompt, 'attempt': attempt}
            except Exception as e:
                last = e; time.sleep(4 * (k + 1))
    return rid, {'error': str(last)[:300], 'attempt': attempt}

def write_prompts():
    """art-source/relics/PROMPTS.md: each relic's prompt, and the model and date of each painting made so far."""
    log = json.load(open(LOG)) if os.path.exists(LOG) else {}
    picks = json.load(open(os.path.join(RAW, 'picks.json'))) if os.path.exists(os.path.join(RAW, 'picks.json')) else {}
    L = ['# Relic paintings: prompts', '',
         'Made by `tools/relics/paint-relics.py` (prompts from `tools/relics/relics.json`), cut out by `tools/relics/cutout.py`.',
         'Every prompt is sent with one reference image for the style: the painted Ember Amulet (`art-source/gear/trinkets/emberAmulet.png`) on magenta.',
         'Ids are the kebab-case of the new names; "old ids" are the relics each replaces (`docs/notes/relics-redesign.md`).', '']
    for r in DATA['relics']:
        rid, name, group, rarity, old, _ = r
        L += [f'## {name} (`{rid}`)', '', f'{DATA["groups"][group]["label"]} · {rarity}' + (f' · old ids: {old}' if old else ' · new'), '']
        tries = log.get(rid, {})
        made = [t for t in tries.values() if 'model' in t]
        if made:
            for t in sorted(made, key=lambda t: t['attempt']):
                kept = ' (kept)' if picks.get(rid, rid + '.png') == os.path.basename(t['file']) else ''
                L.append(f'- try {t["attempt"]}{kept}: `{t["model"]}`, {t["date"]}, `{t["file"]}`')
        else:
            L.append('- not painted yet')
        L += ['', '> ' + prompt_for(r), '']
    open(os.path.join(ROOT, 'art-source/relics/PROMPTS.md'), 'w').write('\n'.join(L))

def main():
    args = sys.argv[1:]
    if '--prompts' in args:
        write_prompts(); return; attempt = 1; models = ['models/gemini-3-pro-image', 'models/gemini-3.1-flash-image']
    if '--try' in args: i = args.index('--try'); attempt = int(args[i + 1]); del args[i:i + 2]
    if '--model' in args: i = args.index('--model'); models = [args[i + 1]]; del args[i:i + 2]
    todo = [r for r in DATA['relics'] if not args or r[0] in args]
    log = json.load(open(LOG)) if os.path.exists(LOG) else {}
    ref = ref_part()
    with cf.ThreadPoolExecutor(6) as ex:
        for rid, rec in ex.map(lambda r: paint(r, attempt, models, ref), todo):
            log.setdefault(rid, {})[str(attempt)] = rec
            print(rid, rec.get('model') or rec.get('error'), flush=True)
            json.dump(log, open(LOG, 'w'), indent=1)
    write_prompts()

if __name__ == '__main__':
    main()
