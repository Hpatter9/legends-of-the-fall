# Gemini prompts for the Eidolons' strike effects (EIDOLON-FX)

Pixel-art effect strips for the six Eidolons' strikes (`docs/notes/eidolon-fx.md`), one prompt each, as the owner asked: generated with
the Gemini image API (`models/gemini-3-pro-image`, fallback `models/gemini-3.1-flash-image`).

**Status (2026-10-31): not generated.** Every Gemini image model answered `429 RESOURCE_EXHAUSTED` (the key is on the free tier, whose image
quota is 0), and the OpenAI image API had no credits. So the strikes were redrawn from the game's own painted spell sheets
(`tools/eidolon-fx/cut_fx.py`), plus one shared impact ring from PixelLab's VFX artist (`raw/impact-ring.png`). Once billing is on:

```bash
python3 tools/eidolon-fx/gen.py              # all of them, into raw/<name>.png
python3 tools/eidolon-fx/gen.py fire-wall    # one
```

Each comes back as one row of six frames on magenta, 21:9. To use one: key out the magenta (a tolerance on `min(R, B) - G`, then erode the
edge a pixel so the pink fringe goes, as `tools/eidolon-call-2/cut_askel.py` does), cut the six frames by their columns of magenta, stand
the pillars on one baseline (centre the bursts), shrink by a whole factor with nearest neighbour to about 96 px a frame, pad to square
cells, and save over the strip it replaces in `src/art/eidolons/fx/` (then set its frame count, `n`, in `src/eidolonFx.ts`).

Every prompt begins with the shared style line:

```text
Pixel art VFX sprite sheet for a 16-bit fantasy tactics game, ONE horizontal row of exactly 6 animation frames, evenly spaced in equal cells with clear empty space between frames, each frame centred in its cell, crisp hard-edged pixel art with a limited palette and no anti-aliasing, no outlines of cells, no grid lines, solid flat magenta #FF00FF background everywhere, no text, no numbers, no shadows on the background.
```

## fire-wall

For Askel: the pillar over each foe (now `askel-pillar`).

```text
A towering pillar wall of roaring fire erupting from the ground: frame 1 a small flare of flame at the ground, frame 2 a tall column of fire shooting up, frames 3 and 4 a huge towering blaze of orange, yellow and white-hot flame, frame 5 the flame breaking apart, frame 6 dying into scattered embers and smoke. Side view, the base of the fire on the same baseline in every frame.
```

## fire-blast

For Askel: the great burst (now `fire-burst`).

```text
A huge fire explosion: frame 1 a bright white-yellow core, frame 2 a ball of orange flame bursting outwards, frames 3 and 4 a giant expanding fireball with licking flames and flying sparks, frame 5 a ring of fire and dark smoke, frame 6 fading embers and smoke wisps. Front view, centred.
```

## ice-spikes

For Nivra: the pillar (now `nivra-pillar`).

```text
A cluster of jagged ice crystal spikes erupting from the ground: frame 1 cracks of frost on the ground, frame 2 small ice shards poking up, frames 3 and 4 a tall cluster of sharp pale-blue and white ice spikes towering up, frame 5 the ice shattering into shards, frame 6 drifting ice fragments and frost mist. Side view, the base on the same baseline in every frame.
```

## frost-nova

For Nivra: the great burst (now `ice-burst`).

```text
A frost nova burst: frame 1 a small bright white-blue point, frame 2 a burst of ice crystals expanding, frames 3 and 4 a big ring of jagged ice shards and snowflakes exploding outward, frame 5 a wide thin frost ring with glittering particles, frame 6 a few fading snowflakes. Top-down front view, centred.
```

## light-lance

For Aurelan: the lance from the sky (now `aurelan-pillar` and the CSS shaft).

```text
A lance of holy light falling from the sky and striking the ground: frame 1 a thin golden beam from the top, frame 2 a thick brilliant white and gold beam of light hitting the ground, frames 3 and 4 the beam at full blinding strength with a radiant splash of light at its base, frame 5 the beam thinning with golden sparkles, frame 6 fading sparkles. Side view, tall frames, the beam touching the same baseline at the bottom of every frame.
```

## light-burst

For Aurelan: the great burst (now `light-burst`).

```text
A radiant burst of holy sunlight: frame 1 a small white star, frame 2 golden rays bursting outward, frames 3 and 4 a huge radiant starburst of golden and white light rays with a halo ring, frame 5 a wide fading golden ring with sparkles, frame 6 a few glittering motes. Front view, centred.
```

## lightning-bolt

For Voltara: the bolt (now `voltara-pillar`).

```text
A forked lightning bolt striking down from the sky into the ground: frame 1 a thin flicker at the top, frame 2 a jagged bright white-blue bolt reaching the ground, frames 3 and 4 a thick forked bolt with branching arcs and an electric splash where it hits, frame 5 thin crackling arcs at the ground, frame 6 small fading sparks. Side view, tall frames, the strike point on the same baseline at the bottom of every frame.
```

## lightning-burst

For Voltara: the great burst (now `lightning-burst`).

```text
An electric shock explosion: frame 1 a bright blue-white spark, frame 2 crackling arcs spreading outward, frames 3 and 4 a big sphere of jagged forked lightning arcs radiating in all directions, cyan and white with violet edges, frame 5 scattered arcs, frame 6 tiny fading sparks. Front view, centred.
```

## earth-spikes

For Gorm: the pillar (now `gorm-pillar`).

```text
A cluster of sharp brown rock spikes and stone pillars erupting from the ground: frame 1 the ground cracking with dust, frame 2 jagged rocks bursting up, frames 3 and 4 tall sharp rock spires towering up with flying stones and dust, frame 5 the spires crumbling, frame 6 falling rubble and a dust cloud. Side view, the base on the same baseline in every frame.
```

## rock-burst

For Gorm: the great burst (now `earth-burst`).

```text
A ground-shattering rock eruption: frame 1 a crack in the ground glowing orange, frame 2 chunks of brown rock blasting upward, frames 3 and 4 a big explosion of boulders, stone debris and tan dust clouds, frame 5 debris falling and a wide dust cloud, frame 6 settling dust. Side view, the base on the same baseline in every frame.
```

## shadow-flame

For Vaelkhar: the pillar (now the recoloured `vaelkhar-pillar`).

```text
A pillar of black and violet shadow fire: frame 1 a small dark violet flame at the ground, frame 2 a tall column of black-purple fire rising, frames 3 and 4 a huge towering blaze of black flame with bright magenta-violet and lilac edges and dark smoke, frame 5 the flame tearing apart into dark wisps, frame 6 fading violet embers. Side view, the base on the same baseline in every frame. The flame colours must be dark purple, violet and black, never pink-magenta like the background.
```

## shadow-burst

For Vaelkhar: the great burst (now `dark-burst`).

```text
A dark shadow explosion: frame 1 a small black orb with a violet rim, frame 2 a burst of black and deep purple energy, frames 3 and 4 a huge dark explosion of swirling black smoke and violet lightning-like cracks with a dark ring, frame 5 a wide dissipating ring of purple smoke, frame 6 fading dark wisps. Front view, centred. Dark purple, violet and black, never pink-magenta like the background.
```

## impact-ring

For everyone: the flash and shockwave (now the PixelLab `impact-ring`).

```text
A huge impact flash and shockwave: frame 1 a small blinding white star flash, frame 2 a big white and pale yellow burst with rays, frame 3 a bright expanding shockwave ring with a white core, frames 4 and 5 a wide thin white-gold shockwave ring expanding with small debris sparks, frame 6 a faint wide ring breaking up. Front view, centred, white and pale gold only.
```
