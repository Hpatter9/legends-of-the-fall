# The painted spell effects, sessions B, D, E, F and G (SPELL-ART-BDE)

The owner's painted sheets for the rest of the brief ([rpg-spells-art-prompt.md](rpg-spells-art-prompt.md)), made with another AI image
tool (sessions A and C were ChatGPT's): **B** auras and fields (#222, `art/spell-fx`, 10 sheets), **D** casters' spells (#223,
`art/spell-fx-d`, 12), **E** martial and monster moves (#225, `art/spell-fx-e`, 15), **F** the other martial and ranged moves (#226,
`art/spell-fx-f`, 30) and **G** the other spells and monster moves (#227, `art/spell-fx-g`, 39). This branch merges all five and brings
them in the way [spell-art.md](spell-art.md) brought A and C. **No sim changes.** All 131 sheets of the brief are now in the game.

## The import

`python3 tools/spell-fx/import-spell-art.py art-source/spell-fx` (cell 96): all 131 sheets pass the format check.

| Atlas | Parts | Size | Bytes |
| --- | --- | --- | --- |
| `a-toolkit.webp` | 36 | 1536x1632 | 780 KB |
| `b-auras.webp` | 20 | 1536x960 | 268 KB |
| `c-healers.webp` | 19 | 1536x864 | 447 KB |
| `d-casters.webp` | 22 | 1536x960 | 185 KB |
| `e-moves.webp` | 23 | 1536x960 | 201 KB |
| `f-martial.webp` | 60 | 1536x2880 | 441 KB |
| `g-spells.webp` | 78 | 1536x3744 | 546 KB |
| **All** | **258** | | **2.80 MB of the 5 MB cap** |

F and G are painted sparser and smaller than A and C, so they pack small; cell 80 was not needed. `build.mjs` already copies every
atlas and lists it in the service worker (offline).

**Fixes at import, not repaints** (`tools/spell-fx/spell-fixes.json`, applied after the checks; the sources are unchanged):

- `frames`: pack a row's frames in another order. Loops that grew out of nothing and would have blinked each time round play from their
  full frames back and forth: `healing-mist.ground`, `mana-font.ground`, `aura-rot.ground`, `storm-cloud.ground` (frames 3-5),
  `healing-mist.motes`. `spirit-guardians.ground` swapped gold and blue every frame (a strobe at play speed): it keeps the blue frames.
  `keg-blast.travel` swapped two different drawings of the keg: it keeps the one with the fuse.
- `fade`: `quivering-palm.cast` and `tentacles.cast` ended on their fullest frame (a hard cut): two thinner copies follow.

A measure of every row (the painting's cover, frame to frame) found no other loop that pops; every once row but those two ends near empty.

## In the game

- **Auras** (`fx.ts` `paintAura`): the ground loop, see-through (`AURA_ALPHA` 0.7, the Aura of Protection 0.42) since it lies over the
  fighters, and the motes circling. A sheet with a strike instead of motes strikes a random spot of its reach every 0.9 s (1.6 s on
  battery saver, none with reduced motion): the storm cloud's bolts, the spikes' jabs, the circle of death's flares. The storm cloud
  hangs over the Lightning Mage at 1.5 times its size (`hang`, `HANG_MULT`). Fixed in `auraLook`: "Protection" matched the rot's /rot/
  (whole words now); the circle of death has a painting (session D). The Ranger's spikes zone, the Time Witch's Slow and the Wolf
  Bard's loud song (gold, violet for the Dirge, `DIRGE_TINT`) are drawn as auras too; the Snare Trap's ring waits on its tile and snaps.
- **Moves** (`src/render/movePaints.ts`, pure, `MOVE_PAINT` by skill key; `fx.ts` `movePaint`): over the look each move already had, a
  move paints its `cast` on the caster, a `self` ring at its feet, a `travel` bolt (`paintFly`, turned along its way), a `beam` held to
  each foe (a `chain` along the tick's arcs for Chain Lightning), a `trail` along its dash or a `streak` to each foe, a `ground` loop at
  its brief size round the caster or under those struck, an `impact` on each struck (hit, marked, stopped, arced to or healed in the
  tick; `one` for a wide cleave), a `land` burst where it comes down, a `flare` on its body, and a `stand` loop held over a fighter
  while a state lasts (Time Stop's clock while stopped, the bounty's crosshair, the condemned crown, the Rage, the Siege Mode clamps).
  The Tidal Wave rolls out to the farthest and breaks on each (`roll`). A parried blow plays the riposte spark.
- **Throws** (`AREA_PAINT`, `fx.ts` `paintArea`): the moves that go off through the sim's `area` event (Fireball, Meteor Swarm,
  Magic Missile, the Powder Keg, Bombard, Cannonade and the Ghost Fleet, Volley and Hail of Arrows, Orbital Strike, Judgement) fly
  the painted ball (or play the painted mark on the spot) in place of the old orb, and burst with the old landing's thud; the fiery
  ones leave the crater (`scorch`). The `area` event comes before its cast's `skill` event in a tick, so `show` notes the tick's casts
  first (`tickCasts`); the old orb's art had the same order fault and now reads the right skill too.
- Every one of the 131 sheets is drawn for some move (checked by listing the unused: none).
- The rules kept: normal blending; loops fade in and out and never blink off; reduced motion holds a loop's first frame and drops the
  aura strikes; battery saver fewer motes and strikes.

## What looks bad (honest)

At play size, D and E read well; most of F and G read weakly: they were painted small in their cells, sparse (dots in a ring) and
faint, so in a fight they are small sparks over the old looks. The worst, to repaint:

- **aura-protection.ground**: a tall gold dome, not a ring of runes on the ground; it covers the party (drawn thinner for now).
- **aura-rot** and **cloud-of-daggers** grounds: dark green and black-violet, nearly invisible on the dark boards.
- **storm-cloud.ground**: the cloud is near-transparent; only its lightning shows.
- **tidal-wave.travel**: a blue pool with a splash, not a curling wave pointing right.
- **keg-blast.travel**: a tiny keg, two drawings alternating (fixed to one); no roll.
- **bardic-notes.motes** and **grappling-hook.travel**: a few pixels at 96 px (measured cover under 1.2%).
- **F**: `gore.cast` (a speck, not horns of force), `metamorphosis.cast` (small, no silhouette), `rapid-shot`, `snare`, `iaido.trail`
  (very faint).
- **G**, most of all: `wild-shape`, `summon-beast`, `plant-standard`, `conjure-treant`, `mirror-image.impact`, `pipes.impact` (almost
  empty), `pilfer`, `devour`, and the dotted-ring grounds (`pipes`, `irresistible-dance`, `battle-hymn`, `stone-curse`, `war-banner`,
  `reign-of-terror`) do not show what the brief asks; they need the brief's bold shapes and bright cores.

## Checks

- `npm test -- spell-fx`: every part the moves ask for is in the manifest and painted, of the right kind (stands and grounds loop,
  beams are beams, balls loop); every aura the sim raises has a painted sheet; the import fixes name real once/loop rows and stay in the
  brief's range. The old "an unpainted part keeps its placeholder" example moved to a part no sheet has (`fireball.cast`), since every
  session is painted now.
- `npm run typecheck`; the full `npm test` (1680 tests, 0 failures); `npm run web`.
- `tools/spell-fx/shots.mjs` (new): real army fights, the hero's pool or meter kept full until it casts the move, held a moment after;
  the auras raised through the toolkit. Contact sheets at 393x852: `docs/samples/spell-art-bde-auras.png` (8 auras),
  `-d.png` (8 D moves), `-e.png` (12 E moves), `-fg.png` (8 F and 4 G moves). No page errors. Chain Lightning, Petrifying Gaze,
  Drain Life, Slow, Tempest and Panacea were not caught in the minute each shot allows (the sim's own "has something to do" checks);
  their paths are the same as the moves shown.
