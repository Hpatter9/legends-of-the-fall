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
- Each part is a loop of 8 frames in a 48 px cell, seen by the game's own camera, rendered at twice the size and shrunk with
  its **soft edges kept** (`soften`: colour weighted by alpha, alpha graded and not cut hard, as the battle clips' is: an aura
  is soft light that fades out). The atlas is packed with one palette of 256 colours, each with its own alpha, which is a third
  of the size of the same picture in full colour. The game samples it smoothly (`AURA_PIXEL` is false for it), so a part drawn
  larger than its pixels stays soft. A loop's last frame runs into its first: what rises is carried on
  a phase that wraps, what turns turns one step of its symmetry, and the noise walks a circle.
- The whole set (106 strips, 848 frames) renders in about 30 seconds on four cores and is packed as
  `src/art/fx/aura/atlas.png` with `atlas.json`: **the same seam the painted atlas used**, so the fight's aura
  (`awakenAura.ts`), the canvas one (`auraCanvas.ts`) and the cinematics' read it with no other change.

## The sizes

| | Before | After |
| --- | --- | --- |
| `src/art/fx/aura/atlas.png` | 6,298,225 bytes, 1536 x 3840 | 215,762 bytes, 768 x 2544 |
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
| The ailments' body parts (burn, poison, freeze and the rest: eleven) and their chips | `ailmentLayer.ts`, `statusStyles.ts` | painted atlas `src/art/fx/status/atlas.png`, 1,007,371 bytes |
| The guard ring (a raised guard) | `unitView.ts` | a painted strip (`VFX.earthShield`) |
| Stand marks on a fighter (time stop, hunter's mark, bane, rage, siege) and the moves' ground loops (War Banner, Rally Cry) | `fx.ts` `paintStand`, `movePaints.ts` | painted spell atlases |
| The halo and sparkles of a foe or summon of a higher grade; a summon's ring; the Nemesis rim | `unitView.ts` | code-drawn |
| Haste's gold dust and slow's ice puffs | `fx.ts` | painted particles |
| The Last Stand's rings | `standView.ts` | code-drawn |

Drawn on no fighter at all today (a gap, not an aura to replace): a taunt, the cleanse's ward, an aura's buff on a fighter
(`auraGuard`, `auraAtk`), and a charm beyond its small heart.

## The pictures

`docs/samples/auras/`: `aura-<class>.jpg` is each class on a hero fighting its wave alone, at 393 x 852 and twice the size:
the top row the light aura, the bottom the strong one; in each row the old aura, then the new at two moments of its loop.
`aura-all-g2.jpg` and `aura-all-g3.jpg` are all thirteen together; `contact-sheet.png` is every strip of the atlas.

## The second pass (the director's four)

1. **Soft alpha.** The first cut took the battle clips' finish (hard alpha, a palette of 10): the shell was a hard-edged oval.
   The frames now keep their graded alpha and the shell is a glow that fades out.
2. **Sparks and motes** are soft round points with a glow (a small patch of light facing the camera, hot at its heart), where
   they were balls of light, which at this size were white squares (the Gunner's, the Arcanist's, the Caster's).
3. **The Beast's and the Vanguard's flames** are soft licks: the same flames with their soft edges kept, sampled smoothly.
4. **The light aura is louder**: its ring is a third heavier and brighter and drawn larger, its wisps are two fifths more, its
   shell brighter (0.5 to 0.65). The strong aura was raised with it (a fuller shell and ring), so it stays plainly the stronger.

What is light is added to what is behind it (`add`: the shell, the motes, a halo, what circles or streams, the extra sparks);
the ring and the wisps are laid over with their own soft edges, so they read on pale ground as well as dark.

## The menus, the other sizes, grade 4

- **The menus draw no aura today.** The tavern, the hall and the camp ask `menuAuraStep`, which is 0 for every hero ("Home
  scenes have no combat tier, so do not wear a combat aura"), the party page's tableau takes a step only for the equipment a
  hero wears, and `wearAura` has no caller. So there is nothing of the canvas aura on any menu to look at. The cinematics use
  the fight's own `AwakenAura`.
- **360 x 780 and 412 x 915** and **grade 4** (which wears the strong aura, with its violet rim): the Knight, the Wizard and the
  Werewolf at each, `docs/samples/auras/aura-sizes-and-grade4.jpg`.

## A fault seen in main, not in this work

The photographing runs log a page error in about one run in three since 0.615 (one in thirteen before): `Failed to execute
'drawImage' on 'CanvasRenderingContext2D'`, from `CastleScene.paintGreatHall` (called from `CastleScene.terrace`): the home
castle's scene draws a picture before it has loaded. It is on main's own build too, and is nothing of the aura's. It is fixed in its own commit: `docs/notes/castle-goat-frames.md`.

## What I did not look at

The cinematics' aura was not photographed (it is the fight's own class, reading the same atlas). Reduced motion was not
photographed (its rule is unchanged and tested). At 360 x 780, 412 x 915 and grade 4 three classes were looked at, not all
thirteen.

## Group 1: the area auras on the ground

The eleven auras that lie on the ground round a fighter (the Aura of Protection and every ward that takes its look, Spirit
Guardians' ground, rot, the storm cloud, the font of magic, the healing mist, the cloud of daggers, the slow field, spike growth,
the bard's song, the circle of death) are rendered in Blender: `tools/blender-fx/auras/area.py`.

- **What each is:** a soft pool of its colour out to its rim, hoops round it and its own mark inside, turning and breathing: the
  protection's eight-pointed seal, the font's six-pointed one with a ring of beads turning the other way, the circle of death's
  five-pointed star turned backwards, the daggers' steel whirl, the slow field's dial of two rings of twelve, the spikes' ring of
  thorns, the song's staves ringing outward, the mist's hoops breathing out, rot's blotched pool. The storm cloud hangs over its
  caster as before, a dark bank of cloud lit from inside twice a loop.
- **What drifts in a field is in its ground's picture** (soft points, notes, crescents, runes, going round just over the
  ground). Before, three painted motes circled in the air over the field and passed in front of the fighters; they are no longer
  drawn (`paintAura`). Only Spirit Guardians, whose motes are the spirits themselves, still has them.
- **Under the fighters:** the ground is laid on the tiles of its reach by `GroundPaint`, as before; nothing of a field is over
  a body. It is drawn at 0.9 (`AURA_ALPHA`, was 0.7): it is light with soft edges now, not a painted fill.
- **The strikes** (the cloud's bolt, the spikes' jab, the circle's flare) are rendered too, and land in the reach as before.
  They play over the fighters for half a second, thinned by the game's own over-a-fighter rule, as every strike is.
- **Reduced motion:** as before: the ground holds its first frame and no strike lands.
- **The same seam:** the same keys, sizes and frame counts as the brief (`tools/spell-fx/spell-parts.json`), packed as the
  spell atlases' `b-auras` session, so `spellArt.ts` reads it unchanged. The circle of death, which was in `d-casters`, is packed
  here with the rest. The painted importer leaves this session alone (`RENDERED_SESSIONS`), and its four fixes to the painted
  area auras are gone with their paintings. The painted sources stay in `art-source/` as the record.

| | Before | After |
| --- | --- | --- |
| `src/art/fx/spells/b-auras.webp` | 257,824 bytes, 1536 x 960 | 123,654 bytes, 1536 x 1056 |
| Decoded (RGBA) | 5,898,240 bytes | 6,488,064 bytes (one more row: the circle of death's) |

`d-casters.webp` is unchanged on disk (the circle of death's old cells are still in it, unread).

Pictures: `docs/samples/auras/area/area-<aura>.jpg` (each laid round the Knight in a held fight by the game's own drawing, at
393 x 852 and twice the size: the old one at two moments, then the new), `area-all-1.jpg`, `area-all-2.jpg`, `contact-sheet.png`.
`AREA=1` with `WATCH=1` on `tools/blender-fx/ult-shots.mjs` takes them; `area_strips.py` lays them out.

What I did not look at: a field cast by its real owner in an ordinary fight (each was laid by the tool through `paintAura`, at
the reach its ability gives); the Dirge's violet tint of the song; 360 x 780 and 412 x 915; reduced motion in a picture. The
large fields (the slow field is eight tiles across, the font seven) are drawn three to four times their pixels' size, so their
hoops are broad soft bands and their marks coarse; the small ones (the daggers, the spikes) are the crispest.

## Group 5: what was drawn in code round a fighter

- **The sparkles over the body are gone.** A fighter of combat grade 3 or 4 rose in gold (or violet) stars drawn in code in front
  of its body, on the wall clock, taking no notice of reduced motion. Heroes lost them in the first step (their class aura's
  motes); the only fighters still wearing them were **summons** of a higher grade (a foe is never above grade 1 on the board, so
  there was no foe halo to replace). A summon's are now soft motes rising at its sides, behind its body (`gradeParts`), held
  still for reduced motion and dropped on battery saver.
- **A summon's glow** (the stacked ellipses behind a summon of grade 2 and up) is the rendered shell, in the same colour.
- **The level-milestone rings** (a hero of lasting level 40 and up, in a run that does not level its own heroes: one, two or
  three thin ellipses in the badge's colour, and from the Gold badge stacked ellipses behind the body) are rendered hoops with a
  soft pool, set wide of the class's own ring, and a faint shell of the badge's colour (`levelParts`). They turn slowly and
  breathe; reduced motion holds them.
- **The ring under a summon** that says whose it is (an ellipse in its caller's colour) is a rendered ring (`markParts`).

All four come from six **plain strips** in the class aura's atlas (`plain.ring1`, `ring2`, `ring3`, `mark`, `shell`, `rise`:
white, and tinted to their colour by the game), drawn by the same `AwakenAura` class from a list of parts, under the feet or
behind the body. The three `Graphics` they were drawn on are removed from the fighter.

**Left as they are:** the Nemesis rim and the grade rim. Each is the fighter's own body drawn again in one flat colour a pixel
out each way, an outline that follows its pose frame by frame; a rendered sheet cannot give a fighter's outline, and it lies
behind the body already. The Last Stand's rings were skipped (the mode is hidden).

| | Before this group | After |
| --- | --- | --- |
| `src/art/fx/aura/atlas.png` | 215,762 bytes, 768 x 2544 | 226,998 bytes, 768 x 2688 |

Pictures: `docs/samples/auras/plain/plain-before-after.jpg`: the Druid's treant at grade 3 (the stars over its body, then the
motes beside it), and the Knight at lasting levels 44, 61 and 100, before over after, at 393 x 852 and twice the size.
`SUMMONS=1` and `XP=<n>` with `LEVEL=1` on the tool's `AURA=1` mode take them.

What I did not look at: the ring under the treant is hidden by a plant in its crop, and the Beastmaster's wolf was buried in
the melee in every frame, so a summon's ring is not shown in a picture; a summon of grade 2 and of grade 4; the other two phone
sizes; reduced motion in a picture.
