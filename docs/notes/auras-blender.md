# AURAS-BLENDER: the auras, started over in Blender

The owner's ask: "The auras need a slight revamp. They don't look like an aura should. Use Blender to fix this and start over
on them." This note has the list of every aura in the game (what is drawn round or under a fighter as an ongoing effect, where
and how), what this step replaced, and what is left.

## What an aura is now

A soft, layered, living field of light round the fighter, in its class's colour, looping seamlessly:

- **a ring on the ground** under the feet: a pool of light, hoops round it, and the class's own seal inside (the Guardian's
  six-sided seal, the Caster's five-pointed star, the Arcanist's eight-pointed one, the Bulwark's square keep), turning one step
  of its own symmetry a loop and breathing;
- **wisps rising at its rim**: shafts of light, winding wind, tongues of flame, smoke, mist, sparks or leaves, by the class;
- **a shimmering shell** behind the body, an upright oval of added light that is dark at its heart, where the body stands, and
  bright at its rim (faint and small on the light aura, brighter and larger on the strong one);
- **a few motes** at its sides: glints, embers, a curl of smoke, a rune, a leaf (the strong aura only; dropped on battery saver);
- and a class's own piece: a halo over the Support and the Arcanist, runes circling the Caster, crescents circling the Blade,
  speed lines behind the Marksman and the Vanguard, a second wide ring under the Bulwark.

**It never hides the hero** (the owner's standing rule). The ring lies under the feet; every other part is drawn behind the
body and shows round its edges. No part is in front of the body (`front` is unset on every part; a test holds it).

Two strengths, as before: combat grade 2 wears the light aura (ring, a faint shell and wisps, and a class's own light piece),
grade 3 and up the strong one (a fuller ring, a brighter shell, more wisps, motes, the class's own piece).

## How it is made

`tools/blender-fx/auras/build.py` (needs `pip install bpy pillow numpy`):

```bash
python3 tools/blender-fx/auras/build.py                  # render what changed, pixelate, pack
python3 tools/blender-fx/auras/build.py --sheet out/auras.png      # a contact sheet of every strip
tools/blender-fx/auras/shots.sh out/web out/aura-after   # after `npm run web`: each class's aura on a hero in a real fight
python3 tools/blender-fx/auras/strips.py <before dir> <after dir> docs/samples/auras
```

- Fifteen small scenes (`ground`, `rays`, `wind`, `flames`, `puffs`, `bits`, `shell`, `halo`, `glint`, `ember`, `puff`,
  `rune`, `leaf`, `arc`, `streaks`), built from the pipeline's own helpers (`lib.py`): glowing discs, hoops, ribbons of light,
  sparks, flame and smoke. **Nothing is a modelled object** (the pipeline's rule).
- `RECIPES` gives each part of each class (`<class>.<step>.<role>`, the keys `src/render/auraStyles.ts` names) its scene and
  options; each class's palette is made from its one colour.
- Each part is a loop of 8 frames in a 48 px cell, seen by the game's own camera, rendered at twice the size and cut to the
  game's pixels and a palette of 10 colours by `pixelate.py`. A loop's last frame runs into its first: what rises is carried on
  a phase that wraps, what turns turns one step of its symmetry, and the noise walks a circle.
- The whole set (106 strips, 848 frames) renders in about 30 seconds on four cores and is packed as
  `src/art/fx/aura/atlas.png` with `atlas.json`: **the same seam the painted atlas used**, so the fight's aura
  (`awakenAura.ts`), the menus' and scenes' (`auraCanvas.ts`) and the cinematics' read it with no other change. Cells of 48 px
  or less are drawn sharp (`AURA_PIXEL`).

## The sizes

| | Before | After |
| --- | --- | --- |
| `src/art/fx/aura/atlas.png` | 6,298,225 bytes, 1536 x 3840 | 375,068 bytes, 768 x 2544 |
| Decoded (RGBA) | 23,592,960 bytes | 7,815,168 bytes |
| The built game (`out/web`) | 299,547,800 bytes | about 5.5 MB less |

No other sheet changed. The code-drawn pieces removed for heroes cost nothing either way.

## What changed in the renderer

- `auraStyles.ts`: the table is the new parts (`light`, `strong` and each class's own). The names and colours of the classes
  are kept.
- `auraPlace.ts`: a rising part is kept square (it was stretched 1.15 up) and its ground's middle is put on the feet
  (`RISE_GROUND`). The rising parts are sized so their wisps stand beside the body, not behind it: at the body's own width they
  were hidden, and drawn smaller than their pixels their thin lines were lost.
- `unitView.ts`: a hero that wears a rendered aura no longer has the **code-drawn halo** of stacked ellipses behind it (the
  shell is that now) nor the **code-drawn sparkles** that rose over its body at grade 3 and 4 (the motes are that now, behind
  it). Those sparkles were over the body and took no notice of reduced motion. A fighter with no class aura (a foe or a summon
  of a higher grade) keeps both.
- Reduced motion: unchanged. A calm aura holds each part's middle frame and nothing orbits or bobs (`poseAura`, `calm`).
- The sim is untouched.

## The list: every aura in the game

Replaced in this step:

| What | Where it is drawn | How it was drawn | Now |
| --- | --- | --- | --- |
| Class aura, 13 classes, two strengths | `awakenAura.ts`, `auraPlace.ts`, `auraStyles.ts`; the menus' in `auraCanvas.ts`; scenes in `sceneView.ts` | a painted atlas, 96 px cells, parts in front of the body | Blender, behind the body |
| Grade halo behind a hero | `unitView.ts` (stacked ellipses) | code-drawn `Graphics` | gone for heroes: the shell |
| Grade 3 and 4 sparkles over a hero | `unitView.ts` `drawSparks` | code-drawn `Graphics`, over the body | gone for heroes: the motes, behind |

Already Blender (BLENDER-FX, ON-FIGHTER), left as they are:

| What | Where | Clips |
| --- | --- | --- |
| Status wisps and pools (shield, haste, rally, banner, frenzy, regen); a boss's starting shield shows these all fight | `unitView.ts` `drawStatuses`, `onFighterRules.ts` | `aura-wisp-<el>`, `aura-pool-<el>` |
| Spirit Guardians' spirits | `fx.ts` `bfxRound` | `aura-spirits` |
| Vael's lasting black sun | `fx.ts`, `ULT_LASTS` | `aura-eclipse` |

Not yet started over (the next steps, in the order I would take them):

| What | Where | How it is drawn |
| --- | --- | --- |
| Area auras on the ground (Aura of Protection, Healing Mist, Spirit Guardians' ground, Circle of Death, Cloud of Daggers, rot, mana font, storm cloud, slow field, spike growth, the bard's song): eleven looks | `fx.ts` `paintAura`, `toolkitLooks.ts` `auraLook` | painted spell atlas (`b-auras.webp`, 257,824 bytes; `d-casters.webp`) |
| The ailments' body parts (burn, poison, freeze and the rest: eleven) and their chips | `ailmentLayer.ts`, `statusStyles.ts` | painted atlas `src/art/fx/status/atlas.png`, 1,007,371 bytes |
| The guard ring (a raised guard) | `unitView.ts` | a painted strip (`VFX.earthShield`) |
| Stand marks on a fighter (time stop, hunter's mark, bane, rage, siege) and the moves' ground loops (War Banner, Rally Cry) | `fx.ts` `paintStand`, `movePaints.ts` | painted spell atlases |
| Level-milestone rings and halo | `unitView.ts`, `levelLook.ts` | code-drawn `Graphics` |
| The halo and sparkles of a foe or summon of a higher grade; a summon's ring; the Nemesis rim | `unitView.ts` | code-drawn |
| Haste's gold dust and slow's ice puffs | `fx.ts` | painted particles |
| The Last Stand's rings | `standView.ts` | code-drawn |

Drawn on no fighter at all today (a gap, not an aura to replace): a taunt, the cleanse's ward, an aura's buff on a fighter
(`auraGuard`, `auraAtk`), and a charm beyond its small heart.

## The pictures

`docs/samples/auras/`: `aura-<class>.jpg` is each class on a hero fighting its wave alone, at 393 x 852 and twice the size:
the top row the light aura, the bottom the strong one; in each row the old aura, then the new at two moments of its loop.
`aura-all-g2.jpg` and `aura-all-g3.jpg` are all thirteen together; `contact-sheet.png` is every strip of the atlas.

## What I did not look at

The menus' canvas aura (the tavern, the hall, the camp) and the cinematics' were not photographed: they read the same atlas
through the same poses, and only the fight was looked at. 360 x 780 and 412 x 915 were not photographed (the aura is drawn in
the fighter's own space, so it scales with the fighter). Reduced motion was not photographed (its rule is unchanged and
tested). Grade 4 was not photographed (it wears the strong aura, as grade 3).
