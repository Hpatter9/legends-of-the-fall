# EIDOLON-FX: generates the strike effects' sheets with the Gemini image API (docs/notes/eidolon-fx.md; the prompts are in
# art-source/eidolons/fx/PROMPTS.md). The network proxy adds the key. Writes art-source/eidolons/fx/raw/<name>.png.
#   python3 tools/eidolon-fx/gen.py [<name>...]
import base64, json, sys, os, urllib.request

OUT = 'art-source/eidolons/fx/raw'
MODELS = ['gemini-3-pro-image', 'gemini-3.1-flash-image']
STYLE = ('Pixel art VFX sprite sheet for a 16-bit fantasy tactics game, ONE horizontal row of exactly 6 animation frames, evenly spaced '
         'in equal cells with clear empty space between frames, each frame centred in its cell, crisp hard-edged pixel art with a limited '
         'palette and no anti-aliasing, no outlines of cells, no grid lines, solid flat magenta #FF00FF background everywhere, no text, '
         'no numbers, no shadows on the background. ')
PROMPTS = {
    'fire-wall': 'A towering pillar wall of roaring fire erupting from the ground: frame 1 a small flare of flame at the ground, frame 2 a tall column of fire shooting up, frames 3 and 4 a huge towering blaze of orange, yellow and white-hot flame, frame 5 the flame breaking apart, frame 6 dying into scattered embers and smoke. Side view, the base of the fire on the same baseline in every frame.',
    'fire-blast': 'A huge fire explosion: frame 1 a bright white-yellow core, frame 2 a ball of orange flame bursting outwards, frames 3 and 4 a giant expanding fireball with licking flames and flying sparks, frame 5 a ring of fire and dark smoke, frame 6 fading embers and smoke wisps. Front view, centred.',
    'ice-spikes': 'A cluster of jagged ice crystal spikes erupting from the ground: frame 1 cracks of frost on the ground, frame 2 small ice shards poking up, frames 3 and 4 a tall cluster of sharp pale-blue and white ice spikes towering up, frame 5 the ice shattering into shards, frame 6 drifting ice fragments and frost mist. Side view, the base on the same baseline in every frame.',
    'frost-nova': 'A frost nova burst: frame 1 a small bright white-blue point, frame 2 a burst of ice crystals expanding, frames 3 and 4 a big ring of jagged ice shards and snowflakes exploding outward, frame 5 a wide thin frost ring with glittering particles, frame 6 a few fading snowflakes. Top-down front view, centred.',
    'light-lance': 'A lance of holy light falling from the sky and striking the ground: frame 1 a thin golden beam from the top, frame 2 a thick brilliant white and gold beam of light hitting the ground, frames 3 and 4 the beam at full blinding strength with a radiant splash of light at its base, frame 5 the beam thinning with golden sparkles, frame 6 fading sparkles. Side view, tall frames, the beam touching the same baseline at the bottom of every frame.',
    'light-burst': 'A radiant burst of holy sunlight: frame 1 a small white star, frame 2 golden rays bursting outward, frames 3 and 4 a huge radiant starburst of golden and white light rays with a halo ring, frame 5 a wide fading golden ring with sparkles, frame 6 a few glittering motes. Front view, centred.',
    'lightning-bolt': 'A forked lightning bolt striking down from the sky into the ground: frame 1 a thin flicker at the top, frame 2 a jagged bright white-blue bolt reaching the ground, frames 3 and 4 a thick forked bolt with branching arcs and an electric splash where it hits, frame 5 thin crackling arcs at the ground, frame 6 small fading sparks. Side view, tall frames, the strike point on the same baseline at the bottom of every frame.',
    'lightning-burst': 'An electric shock explosion: frame 1 a bright blue-white spark, frame 2 crackling arcs spreading outward, frames 3 and 4 a big sphere of jagged forked lightning arcs radiating in all directions, cyan and white with violet edges, frame 5 scattered arcs, frame 6 tiny fading sparks. Front view, centred.',
    'earth-spikes': 'A cluster of sharp brown rock spikes and stone pillars erupting from the ground: frame 1 the ground cracking with dust, frame 2 jagged rocks bursting up, frames 3 and 4 tall sharp rock spires towering up with flying stones and dust, frame 5 the spires crumbling, frame 6 falling rubble and a dust cloud. Side view, the base on the same baseline in every frame.',
    'rock-burst': 'A ground-shattering rock eruption: frame 1 a crack in the ground glowing orange, frame 2 chunks of brown rock blasting upward, frames 3 and 4 a big explosion of boulders, stone debris and tan dust clouds, frame 5 debris falling and a wide dust cloud, frame 6 settling dust. Side view, the base on the same baseline in every frame.',
    'shadow-flame': 'A pillar of black and violet shadow fire: frame 1 a small dark violet flame at the ground, frame 2 a tall column of black-purple fire rising, frames 3 and 4 a huge towering blaze of black flame with bright magenta-violet and lilac edges and dark smoke, frame 5 the flame tearing apart into dark wisps, frame 6 fading violet embers. Side view, the base on the same baseline in every frame. The flame colours must be dark purple, violet and black, never pink-magenta like the background.',
    'shadow-burst': 'A dark shadow explosion: frame 1 a small black orb with a violet rim, frame 2 a burst of black and deep purple energy, frames 3 and 4 a huge dark explosion of swirling black smoke and violet lightning-like cracks with a dark ring, frame 5 a wide dissipating ring of purple smoke, frame 6 fading dark wisps. Front view, centred. Dark purple, violet and black, never pink-magenta like the background.',
    'impact-ring': 'A huge impact flash and shockwave: frame 1 a small blinding white star flash, frame 2 a big white and pale yellow burst with rays, frame 3 a bright expanding shockwave ring with a white core, frames 4 and 5 a wide thin white-gold shockwave ring expanding with small debris sparks, frame 6 a faint wide ring breaking up. Front view, centred, white and pale gold only.',
}

def gen(name):
    body = {'contents': [{'parts': [{'text': STYLE + PROMPTS[name]}]}],
            'generationConfig': {'responseModalities': ['IMAGE'], 'imageConfig': {'aspectRatio': '21:9'}}}
    for model in MODELS:
        req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
                                     data=json.dumps(body).encode(), headers={'content-type': 'application/json'})
        try:
            r = json.load(urllib.request.urlopen(req, timeout=300))
        except Exception as e:
            print(name, model, 'failed', e, getattr(e, 'read', lambda: b'')()[:300])
            continue
        for c in r.get('candidates', []):
            for p in c.get('content', {}).get('parts', []):
                d = p.get('inlineData') or p.get('inline_data')
                if d:
                    ext = 'png' if 'png' in d.get('mimeType', d.get('mime_type', '')) else 'jpg'
                    open(f'{OUT}/{name}.{ext}', 'wb').write(base64.b64decode(d['data']))
                    print(name, model, 'ok', ext)
                    return
        print(name, model, 'no image', json.dumps(r)[:300])

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    names = sys.argv[1:] or list(PROMPTS)
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(6) as ex:
        list(ex.map(gen, names))
