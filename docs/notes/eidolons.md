# Eidolons (quests, batches 3 and 4): the War Horn and the Eidolon's call

Batches 3 and 4 of the owner-approved design in [quests-summons-design.md](quests-summons-design.md), as its last sections decide them
("The owner's decisions", "Making the Eidolons feel epic", "The six Eidolons chosen"): the great summons are **Eidolons**, the gauge is
the **War Horn**, and the six are Askel the Cinderhound (fire), Nivra the Rime Wyrm (ice), Aurelan the Lion of Dawn (light), Voltara the
Copper Goddess (lightning), Gorm the Quarry Titan (earth) and Vaelkhar the Dragon King (dark). Then the director's later ask from the owner:
"make the cinematics more epic and movie-like: different camera angles, close-ups, lines".

**Unlocking, for now.** The design binds the Eidolons through the quest chains (batch 5 and on), so in normal play **no Eidolon is bound
yet**: the horn fills from today, and a tap on it (in a fight or at the camp) says "No Eidolon has answered you yet" and points to the
Summoner. A hidden dev flag, **`?eidolons=all`** on the page's address, binds all six and fills the horn (on each load with the flag), so
the owner can try the call. `bindEidolon` is the call the chains will make.

## The rules (batch 3)

### The War Horn (`src/sim/warHorn.ts`, `src/sim/hornFill.ts`)

- `Meta.eidolons?: { horn, bound?, chosen?, calls?, seen?, confirmed? }`, optional (`readEidolons`: an older save has an empty horn; unknown
  ids dropped; the fill kept between 0 and 1000). No version bump.
- Fills to `HORN_FULL` 1000. `hornGain(HornFight)`: a boss wave won **+100** (an army's mid-boss or last boss, the daily's two, a quest
  battle's, a Calamity guardian or spire boss node), a Calamity or spire elite **+25** (the design's table), each ordinary foe slain **+1**
  (fallen foes that are not bosses or elites; their adds count), an auto-replay **half**. A fight lost, a practice daily or practice quest
  battle (`counts: false`), and a fight in which an Eidolon was called add nothing. `hornFightOf(run, stage, b, won, auto)` reads it from a
  settled wave; the page adds it in its settle (`main.ts`) and shows "War Horn +100 · 740/1000" or "The War Horn is full" on the wave card.
- The Last Stand (one long fight) settles its run whole: `standHornGain(bossWaves, foes)` at **half**, at most **300** a run.
- Full, it **waits** (`addHorn`: the rest is lost). `blowHorn` empties it (the page calls it the moment the sim takes the order and saves at
  once). `chooseEidolon` picks one bound; the fill is kept. The first bound is chosen.

### The call (`src/sim/eidolons.ts`, through `src/sim/orders.ts`)

- `armEidolon(b, id, { mid?, trial? })`: the page puts the chosen Eidolon on a fight when the horn is full (`mid`: the wave's boss is a
  mid-boss; `trial`: a great being's own trial, for batch 6). `b.eidolon` is optional; a fight armed and never called plays exactly as
  one never armed (tested).
- `orderEidolon(b, id)` queues it like a tapped ultimate (refused unless the fight is on, it is the one armed, none was called this fight
  and none waits); `applyOrders` resolves it at the start of the next tick (`strikeEidolon`) and logs it, so `replayLog` plays it again.
  **Once a fight** (the Last Stand's run is one fight).
- **The strike** (`STRIKE`, `struckAs`): a set share of full health, not a blow (no dodge, shield, guard or defence; no kit spares it; no
  kill credit): ordinary foes fall; elites (`ELITE_FOES`) and mid-bosses **65%**; last bosses **45%**; Calamity guardians (`calBoss*`)
  **40%**; a being in its trial **25%** (its adds fall). Foes still to come are untouched. Events: `{ kind: 'eidolon', phase: 'call' |
  'done' }` and `hit` events `by: 0` with `eidolon: true`.
- **The riders** (`RIDER`; the design's riders by element, on the new six): Askel, the foes' half of the board burns 6 s (3x3 zones, a
  fifth of the strongest hero's attack a second) and the heroes +15% attack for 10 s; Nivra, every foe left frozen 5 s, a boss slowed by
  half 6 s; Aurelan, the fallen rise at 60%, every hero healed, cleansed and shielded (30%) 3 s, the Last Stand's ruler healed 30%;
  Voltara, every hero's ultimate meter half filled (skill charge below level 30), +5 mana; Gorm, the heroes take half damage 10 s (stone
  skin, `guardUntil`), a boss stunned 2 s; Vaelkhar, bosses and elites lose shields and boons, and the heroes drain 25% of what they deal
  for 10 s. `tickEidolon` (in `stepBattle`, only after a call) ends the warmth and runs the drain. Nothing draws from `b.rng` or
  `b.skillRng`: the strike and riders are fixed, so no side stream was needed.
- **Auto never calls it**: no bot, Auto, auto-replay or balance tool orders it (tested). The balance tool's **`--eidolon <wave>[:<id>]`**
  calls one as that wave of every army attempt begins (`tools/autoplay.ts` `eidolonAt`), to see the walls with and without.

## The page (batch 4)

`src/eidolonCall.ts` (the horn, the sheets, the cinematic), `src/eidolonRules.ts` (pure: the shots and timings, the looks, the
choreography, the lines, the horn's look), `src/eidolons.css`.

- **The horn** (`HornView`): in the fight at the left end of the spell orbs row (`#hudSpells`, the Last Stand's `.stOrbs`), at the camp
  beside the stones (`Home` `onTopBar`). The four paintings line up exactly: `horn-empty` dimmed, `horn-light` revealed from the mouthpiece
  to the bell by the fill with a gold glow along the horn's own shape (the painted glow alone only covers the runes), `horn-ready` when
  full with a warm aura of turning runes and a sheen crossing it (eased, never blinking), its words in a small pill ("640/1000", "Full",
  "Blown"). A gain streams motes into it (`motesFor`: a boss wave's is a rush). A tap when it cannot be blown leaves a note ("No Eidolon has
  answered you yet", or the fill). At the camp a tap opens its card: the fill, how it fills, and the Eidolons bound as cards (tap to
  choose), or "No Eidolon has answered you yet" and the Summoner's hint.
- **The first blow** asks first (`confirmed`), the fight held while the sheet is up.
- **The cinematic** (`FULL`, about 4.8 s; `SHORT`, about 2 s): the fight holds from the tap; the sim's strike tick is let through on the
  first blow (`wantsTick`, `noteEvents`), so the foes fall under it; the fight runs again at `RESUME` (and a strike that ends the fight
  plays out before the result card). The shots (`SHOTS`, `shotAt`), cut rather than held: **horn** (the horn swings up and is blown, a cone
  of gold sound-light and a ring of force; the board dims) · **circle** (a slow push in; the painted summoning circle turns across the
  board in the element's tint) · **arrive** (a low angle: the sky tears open, the rift's frames tinted to the element, and the figure rises
  towering over the camera, letterbox bars in, motes drifting off it) · **name** (the figure framed whole, breathing; name, title and
  attack stamped in the largest type in the game) · **close** (a cut to its face, its painted card, pushing in on its eyes, `EYES`, as it
  speaks its line, `lineOf`: its first words the first time, then its others in turn) · **strike** (a cut to a wide shot of the field,
  `BOARD_ZOOM`, the figure lunging then thinning so the board shows; its attack in three or four beats, `CHOREO`, each with the element's
  huge painted bursts from the ULT-EPIC kit (`Fx.ultImpact`), a flash and a sound, a snap zoom on each blow, the first with a 0.25 s
  hit-stop (`Fx.hitStop`) and the full shake) · **after** (the figure fades up and out, the board washed in its colour, the rider's ground
  and marks left) · then a hero standing answers with a line (`REACTIONS`, by element, as a quip). The camera is a scale of the board's
  canvas about a point (`frameBoard`), put back after; the shots are plain data so the general shot layer (`claude/cinematics`) can take
  them over. The first call of each Eidolon always plays in full and cannot be skipped; after it a tap skips once a second has played, and
  **Settings, Full Eidolon calls** (`eidolonFull`) off gives the short one (circle, figure, name, two beats, no letterbox or close-up).
  Reduced motion: no camera moves, sweeps, shakes or snaps; the figure, the close-up and the words fade in and out held still. Battery
  saver: fewer motes and bursts, the same beats. Sounds: the game's own `horn`, `riseSummon`, `stingSummon`, `ultImpact` and the element's
  cue; the music ducks.

## The art (`tools/eidolons/import.py`, re-runs)

From `art-source/eidolons/dreamina-clean/` (merged from `art/eidolons-dreamina`) and `horn/`, `call/` (from `art/eidolons-1`), into
`src/art/eidolons/` (about 1 MB, loaded by URL, listed in the service worker's `FILES` by `build.mjs`):

- `<name>-figure.webp`, 900 px tall: the ground (a near-uniform grey with a gradient) is modelled, each pixel's difference from it gives a
  soft alpha (glow, smoke, frost and embers fade rather than cut), the colour is un-mixed from the grey where the alpha is partial, every
  sizeable patch of ground is taken out (also those the figure closes round: inside Nivra's coil, between Vaelkhar's wings, inside
  Voltara's rings) and the rest held solid (the hound's basalt and the dragon's scales are as dark as the ground), and a figure the
  painting cuts off at an edge fades out there. Checked on magenta, white and blue.
- `<name>-card.webp`, 256 px: head and shoulders (`CARD_BOX`; Nivra's tight on her head and frost breath), the ground darkened at the edges.
- `horn-<state>.webp`, 256 px wide, trimmed to the four paintings' common box; `eid-circle.webp`, `eid-rift.webp`: the rows the cinematic plays.

## Changed from the design, or left open

- **The music sting** in each Eidolon's colour (a few bars of the main theme) is not rendered yet: the game's existing horn and summoning
  stings play. **The heroes' line** uses lines written here (`REACTIONS`), not `heroSays`.
- **The figures are single paintings**, not layers: they breathe, drift, lunge and glow, with motes and parallax, rather than move limbs.
- **The recap** shows the horn's line on the wave card; the victory card of a whole run does not add it up.
- **The Last Stand**: one call a run; its horn settles with the run (`finish`). The strike's events are drawn in its own view.
- A boss signature attack whose windup was due may begin as the fight runs again (its cut-in follows the cinematic).
- Trials (`trial`), the Pact Gallery, the binding and the chains wait for their batches.

## Checked

`npm run typecheck`; `npm test -- eidolon` (`test/eidolons.test.ts`: the shares per foe kind, shields ignored, once a fight, Auto never
calls, determinism and replay, the six riders, the horn's fill per mode, the wait, the blow, the choice keeping the fill, saves;
`test/eidolon-moment.test.ts`: which cinematic, skipping, the beats and shots, the looks, lines and choreography, the horn's look); the full
`npm test`; `npm run web`. (A first full run caught three looping glows that breathed in brightness, against `test/no-flicker.test.ts`; they now breathe in size, and the full suite passes: 1787 tests.) In the browser (`tools/eidolons/shots.mjs`) at 393x852, 360x780 and 412x915: the horn filling and full, the
camp's chip and card (none bound and all bound), the note, the confirm, and the cinematic shot by shot for all six Eidolons, the short
version and reduced motion; and the Last Stand's horn and call. No page errors, no missing files.

Screenshots: `docs/samples/eidolon-<name>-strip.png` (the nine shots of each of the six), `eidolon-voltara-strip-360.png`,
`eidolon-aurelan-strip-412.png`, `eidolon-gorm-strip-short.png`, `eidolon-nivra-strip-reduced.png`, the key frames
`eidolon-askel-close.png`, `eidolon-vaelkhar-name.png`, `eidolon-nivra-strike.png`, `eidolon-gorm-after.png`, the horn's states
`eidolon-{camp-chip,camp-none,camp-bound,horn-filling,horn-full,horn-note,confirm}[-360|-412].png`, and `eidolon-stand-short.png`.
