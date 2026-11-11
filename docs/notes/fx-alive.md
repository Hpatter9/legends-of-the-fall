# FX-ALIVE: the effects over heroes live, and let them show

> **Superseded in part by BLENDER-FX** (`docs/notes/blender-fx.md`): the painted ground sheets (`src/art/fx/alive/`) and the pack's rune strip
> are no longer drawn. Each tile of a patch carries the element's Blender-rendered loop instead. The living patch's rules below (the faint
> fill, the rim, each tile's own beat, thinning under a fighter, reduced motion, the battery saver) all still hold.

Branch `claude/fx-alive` (from main 0.460.0). The owner: "Effects covering heroes are not animated and block them too much visually.
Animate the effects or give me the prompt for ChatGPT to animate them." Renderer only: the sim is unchanged, and `fxPlace`'s tiles are
exactly as they were (`test/fx-place.test.ts` passes untouched). The version and `UPDATES` are untouched.

## The living patch (`src/render/fxAlive.ts`, pure; `alivePatch` in `fx.ts`)

Every patch of marked ground is drawn tile by tile, and each tile:

- **Marks the edge, not the fill.** The fill is at most 0.11 (it was 0.2 to 0.45). The rim round the patch breathes between 0.5 and 0.95.
- **Breathes on its own beat** (`tilePhase`, `breath`). Neighbouring tiles are always out of step, so a patch shimmers instead of pulsing as
  one block.
- **Carries an animated strip.** The element's rune loop from the pack (`<element>-rune`) lies on the tile, blended additively so it
  brightens rather than covers. Each tile runs a few frames apart from its neighbours (`stripFrame`). When the painted sheet lands
  (`aliveArt.ts`), a whole-tile loop takes its place.
- **Thins under a fighter.** While someone stands on a tile, its fill and strip drop to 0.4 of their strength (`ALIVE.OCCUPIED`). The rim
  stays, so the area's edge always shows.
- **Respects the settings.** With reduced motion it holds still, mid-breath, at 0.75 of its strength. On the battery saver it leaves the
  strips out.

## Before and after

| Effect | Over a hero for | Before | After |
| --- | --- | --- | --- |
| An area's warning (volley, meteor, shells, the ultimates' rains) | up to 1.5 s | A flat tint, fill 0.2 to 0.27 pulsing as one block, a fixed rim | The living patch, with the fire rune (meteors) or the wind rune (volleys), growing surer as the blow nears |
| The Mythics' diamonds (Crownfall, Solar Aegis, Heartwood and the rest) | 0.6 s or so | A flat tint at 0.45 fill, the strongest of all, over up to 41 tiles round the caster | The living patch in the element's rune (a ward in light's), fading over its time |
| The king's spell marks (the 3x3, the Lance's column, the Sunbeam's row, the walls' row) | 0.6 to 1.2 s; the poison cloud for its life | A flat tint at 0.35, fading; poison held at 0.27 | The living patch in the spell's element (`SPELL_ELEMENT`); the poison cloud breathes at 0.85 of its strength |
| Auras with no painted art | as long as they last | A flat tint at 0.14 with a rim, the whole patch breathing as one | The living patch in the aura's element, laid again as the aura moves |
| An aura's loop at its heart | as long as it lasts | Drawn over its caster at 0.9 | Thinned to half while a fighter (its caster, most often) stands there |
| The land's hazard tells (rockfall, flares, geysers, grasp, spikes, springs) | 1.5 s | A flat tint at 0.45 fill, width-3 rim | The living patch, its rim carrying the warning (the land's own colour) |
| Burning ground (`zone`: a meteor's fire, Heavenfall's constellations) | 4 to 6 s | Flames already animated (each its own sway), full strength on a hero's tile | Flames under a fighter burn at 0.55 |
| An ailment's parts in front of a fighter (frozen ice, flames, the stun's halo, motes) | the ailment's length | Animated strips at 0.7 of their alpha (FX-CLEAR) | At 0.5 (`OVER_FIGHTER_STATUS_ALPHA`): the marks still read, the hero under them reads better |
| Raised walls (Wall of Fire, ice, stone) | their life | Dimmed to 0.45 over a fighter (0.451) | Unchanged |
| Painted auras and grounds (Spirit Guardians, the songs, the clouds) | their life | Painted loops, under the fighters | Unchanged |
| The boss's telegraphed blow (BOSS-BIG) | up to 2 s | A dark-red patch under the fighters, filling as the blow comes | Unchanged: a warning the player must read at once is meant to be loud |

Shots (`docs/samples/fx-alive/`, `tools/battle-feel/frames.mjs --only fx-mythic --from <ms> --tag ...`; the "before" from a build of main):

- `fx-mythic-crownfall-{before,after}-393.jpg` (and `-after-360`, `-after-412`): Vael's Crownfall over her own side at 6.6 s.
  `crownfall-zoom-before-after-393.jpg` is the same pair zoomed: the flat tan diamond over the heroes against the faint, rimmed one.
- `fx-mythic-rockfall-{before,after}-393.jpg`: the rest of the wave, the meteors and the land's rockfall.

## Art

One prompt, for all eight elements' living-ground loops on one sheet: `docs/notes/fx-alive-art-prompts.md`. Its cutter is
`tools/fx-alive/cut.py`, and the atlas `src/art/fx/alive/` is in the build, empty and ready. Until the sheet lands the pack's rune strips
animate the tiles.

## Tests and checks

`test/fx-alive.test.ts`:
- the rim is bright and the fill faint;
- neighbouring tiles are never in step, and the patch moves over time;
- a fighter thins the fill and strip, not the rim;
- reduced motion holds still and fainter;
- the strength scales everything;
- the status alpha;
- the atlas's shape.

`test/fx-clear.test.ts` still holds the over-fighter alphas in their band. Run: `npm run typecheck`, the full `npm test`, `npm run web`, and the
strips at 393x852, 360x780 and 412x915 (no page errors).
