# The Nemesis War, phase 3: revenge, trophies and taunts

Phase 3 of the expansion in `docs/design/legends-expansion.md` (section 9, "Phase 3: Revenge, trophies and taunts"), built to sections 2.3,
2.6 to 2.9 and 5.1 of the design on top of phases 1 and 2 (`docs/notes/nemesis-1.md`, `docs/notes/nemesis-2.md`). Phase 3's list: Grudges,
the Avenger, the Vengeance scenes, Vengeful, trophies taken and brought home, fleeing, cheating death's second half (Stitched and
humiliation), humiliation's return, the taunt cut-ins and their setting; with them, the Elusive and Survivor behaviours and the Craven and
Vain weaknesses that phase 1 left for later. Duels are phase 4; the heir's Blood Grudge is phase 6.

## What it plays as

### Revenge, the heroes' side (`src/sim/revenge.ts`)

- **Grudges** (`Meta.grudges`: hero kind, then nemesis id, then steps). A hero slain by a nemesis now in the War bears a Grudge on it: +10%
  against it, +10% more each further time it is slain by it, to +30% (`GRUDGE_STEPS`). Read at settle from the battle log (`settleRevenge`,
  a newborn's own killing blow included), forgotten when the nemesis leaves the War (`tidyGrudges`).
- **The Avenger** (`avengersOf`). The partner of a slain hero at bond level 3 (Sworn) or more. Only a kindred pair, or a rivalry once
  settled, reaches Sworn. The Avenger takes +15% attack on the slayer (`AVENGER_ATK`). Its skills come round 10% quicker while the slayer
  stands (`Unit.avenge`, read in `cdOf`, ended when the slayer falls or flees).
- **Vengeance.** An Avenger's killing blow on the slayer:
  - the slayer cannot cheat death (`cheatDeath` skips it);
  - the pair gains 30 bond points (`VENGEANCE_BOND`);
  - the pay is doubled (crowns and War Trophies);
  - the Fallen tab says "in Vengeance", and the News and the wave card say so too;
  - a short **Vengeance scene** plays the next time the camp opens (`War.vengeance`, `vengeanceScenes.ts`). There is one for every pair
    that can reach Sworn, each way round: 110 scenes. This first batch is written from four shapes in the bond scenes' style, with the pair's
    own names. Scenes written for each pair follow for the owner to read (the design's "written per kindred pair").

### Revenge, the foes' side

- **Humiliation** (`humiliate`). A nemesis is humiliated when it **cheats death** or **flees a fight in which no hero fell**. Phase 2's
  cheat rule changes here: a cheat gives no Might of its own, and a warchief cheats at a flat 35% (below). It then:
  - sits out 1 to 3 of its army's runs (`War.away`, drawn from `REVENGE_SALT`; `planRun` counts one off each time its army marches, and
    the last brings it back, with a line in the News). An away member does not answer the Muster either.
  - comes back **Vengeful** against the hero who humiliated it: the killing blow's hero for a cheat, the hero who hurt it most for a flight.
    That is +20% damage to that hero, whom it closes on first while the hero is within 6 tiles (`nemHunt`, the walk; `nemPrey`, the blow).
  - takes a **trophy** from that hero (below);
  - gains a scar (a cheat's scar is already given) and, after a cheat, the trait **Stitched**: once, at 0 hp, it stands again at 20% (the
    old Survivor effect), spent when it does. A warchief is Stitched once a seat holding;
  - costs its underlings 20 loyalty (`HUMBLED_LOYALTY`; phase 2 left this for now).
  - The promotion the design gives a returning nemesis is its Might for the deed, still +1 a run at most.
- **Trophies** (`trophyFrom`). The hero's piece in the first filled slot of weapon, shield, helm or charm (`main`, `off`, `head`, `acc`). The
  hero keeps the piece: the trophy is a story and an overlay. Two at most, each +5% attack (`TROPHY_ATK`, in `nemStats`). Slaying the
  bearer **brings them home**:
  - the piece's card in the hero sheet says "Reclaimed" (`War.reclaimed`, `equipView.ts`);
  - the pay is doubled (once, whatever the reasons);
  - the News, the Fallen and the wave card say so.
  - The design's memory line for the hero waits for the Dynasties' bearers (phase 5): heroes keep no memory yet.

### Fleeing (`nemesisTraits.ts`, `battle.ts`)

- **Who flees.** A lieutenant or captain under 20% health may break off and run: a lieutenant 30%, a captain 15%, a warchief never
  (`FLEE`, `fleeOdds`). Elusive flees at 20% for certain; Craven flees at 30% for certain.
- **How it is decided.** It is asked **once a fight**, the first time it acts under its share (`nemFlees`). The answer is a hash of the
  fight's seed, the moment and the fighter (`FLEE_SALT`), never a draw from `b.rng`. The Last Stand never asks.
- **Running off** (`runOff`):
  - it calls "Flees!" and walks for its own back row (row 0) by the cheapest way round the others;
  - it leaves the board there, or once it has run for 8 s, with the summons' `fade`;
  - it is `Unit.fled`, not slain, and it leaves no body to raise.
  - **The heroes let a runner go while foes still fight** (their mind turns to the others; splash and spells still reach it). This is a
    reading the design does not spell out: without it, three runners in four were cut down before the edge (below).
- **What it counts as.** The wave is won as usual when the rest fall. A nemesis that fled is **escaped**: +1 Might by the run's rule, and
  that is its only deed from the fight. It learns **Elusive** (the design's "escaped by timeout or by fleeing"), and it is humiliated if no
  hero fell.

### Craven and Vain

Both join the second weakness's pool at Might 5, at the pool's end, so an older nemesis's draw is as it was.

- **Craven:** breaks and runs at 30% health.
- **Vain:** "must be seen". Its cut-in always plays in full, even on the short setting. The design's other half (it always accepts a duel,
  and takes +10% in one, `VAIN_DUEL`) waits for the duels (phase 4).

### The taunt cut-ins (`src/sim/nemesisLines.ts`, `src/tauntCutRules.ts`, `src/tauntCut.ts`)

- **When.** Before the first wave of a run in which a nemesis stands, as its deploy opens (after a boss's card or a scene has had the
  screen), a band crosses the board:
  - the nemesis's portrait (its sprite's `portrait()` cut, in its rank's tone and frame, with its scars) slides in from the left, with its
    name, epithet, rank and Might and one taunt;
  - a trophy it carries of the named hero's sits on its frame, drawn with the piece's own gear icon;
  - the hero the taunt names, if on the board, answers from the right with one line.
- **How long.** About 2.5 s. A tap skips it once 0.6 s have played, and tapping Fight ends it. None plays under auto-replay.
- **Where.** The band is placed in the free gap between the screen's top parts (the top bar, the spell row, the boss's bar, the banners)
  and its bottom ones (the bench, the hero rows, the tactic button). It is measured as it opens, so it never covers the HUD.
- **What it says.** It is **assembled from its memory**, not written per nemesis. `triggerOf` reaches for the most personal thing it has
  against a hero on the board, in this order:
  1. a trophy of that hero's;
  2. the hero who humiliated it;
  3. an Avenger;
  4. a hero it slew;
  5. its Dread;
  6. a hero it maimed.

  Failing those, it speaks of its escapes, its seat (the warchief), or a first meeting.
- **The writing.** Nine triggers in nine voices, one an army: orc gruff, undead cold, beasts snarling, wildwood fey, labyrinth proud, ogre
  dim, infernal grand, yokai riddling, golem formal. This first batch is two lines for each, 162 in all, plus two replies for every hero
  (plain, and personal). The design's 4 a cell (about 360) follow in batches for the owner to read. The heir's Blood Grudge trigger comes
  with the Dynasties.
- **Settings, Gameplay, Nemesis cut-ins:** Full, Short (the name plate only, 1.3 s) or Off. A nemesis's first meeting plays in full unless
  they are off (`Nemesis.seen` marks it). A Vain one always plays in full.
- **Reduced motion:** the bands fade in and out, held still.

### On the board (`nemesisView.ts`) and in the fight

- **The Council.** An Avenger's (or else a Grudge holder's) face sits on a seat's corner. A member away licking its wounds is dimmed, and
  its aria label says so.
- **A nemesis's card** gains:
  - "Licking its wounds: it sits out the next 2 runs";
  - Stitched;
  - **Trophies**: each piece's gear icon and "Kwame's shield";
  - **Grudges**: each Grudge holder and Avenger, with its face and its share;
  - the pay doubled for a trophy.
- **The Fallen** says "slain by Kenji in Vengeance; a trophy brought home".
- **The News** has four new kinds: fled, humiliated (and the return), Vengeance and reclaimed. A cheat's humiliation is told on its own
  cheat's line.
- **In the fight:** a nemesis's name plate carries its trophies' gear icons to its left (`render/gearTex.ts` cuts them from the gear atlas
  the hero sheet uses; the plate hangs them once the atlas has loaded).

## Saved

All of these are optional fields, read by `readWar` and `readGrudges`, which drop unknown ids, clamp the numbers and cut the lists:

- `Nemesis` gains `trophies` (two at most), `shamed`, `maimed` (four), `fled`, `stitched` and `seen`.
- `War` gains `away` (1 to 3, members only), `reclaimed` (60) and `vengeance` (8 pairs, known kinds).
- `FallenNemesis` gains `vengeance` and `reclaimed`.
- `Meta.grudges`: three steps at most, twenty nemeses to a hero.
- `NemSnap` (`Run.nemesis`) carries what the fight and the taunts need, set by `decorate` as the run begins: the Grudges, the Avengers,
  the trophies, Stitched and the memory's makings.
- A save from before reads as it was.

## Determinism and the old fights

- **What is fixed when.** Everything a fight needs is fixed onto the run's snapshot as it begins (`planRun`, beside `planNemeses`;
  `startMuster` decorates its own).
- **The streams.** Fleeing is a hash of the moment. A humiliation's runs away draw from `mixSeed(run.seed, REVENGE_SALT, wave, id)`.
  Nothing draws from `b.rng`.
- **Every new hook is behind `Unit.nem`:** Grudge and Avenger in `nemHurt`; fleeing and the letting-go in `decide`; the Vengeful walk;
  Stitched in `nemSpare`; the Avengers' start in `fight`. The `Unit.avenge` cut in `cdOf` is set only by a nemesis's Avengers.
- **The pinned fights hold:** `nemesis-regression` (63 army waves pinned before phase 1's hooks), `stand-regression` and
  `ailments-identical`.

## Where phase 3 reads the design narrowly

- **The heroes let a runner go** while other foes fight (above). The design says only that a fleeing nemesis walks to row 0. Measured
  without it, 33 nemeses broke and ran in 40 days of the war simulator and 9 got away. With it, over 61 days, 21 of 53 got away; the rest
  still fell to splash, spells and being the last foe standing.
- **A runner gives up after 8 s** (`FLEE.ms`) if it cannot reach row 0, so a fight never waits on a cornered runner.
- **A nemesis that fled learns Elusive** (if it can), rather than a trait drawn among those the fight earned.
- **Doubled once.** The design's "doubled by a duel, a trophy brought home, Vengeance" is read as doubled once, however many apply.
- **Not here:**
  - the warchief's fall's long cut-in (the result screen's "The Warchief falls!" stands for it);
  - the design's death-spiral guard (built, measured and left out, below);
  - the hero's memory line for a trophy brought home.

## Images (none new yet)

Phase 3 uses existing art only:

- the boss card's ribbon (`ui/ribbon.png`) behind the cut-in's bands;
- the hero cards' brass frame (`ui/hero-brass-frame.png`) round its faces;
- the sprites' `portrait()` cuts and the heroes' painted faces (`heroFace`);
- the gear icons for every trophy, as the design asks;
- the item art standing in for the four new News icons: the shadow cloak for fled, the blood vial for humiliated, the ember brand for
  Vengeance, the second weapon for reclaimed.

These load by URL already or are bundled into game.js, so the service worker's list does not change. The images that would replace the
placeholders, as prompts:

1. **The taunt cut-in panel** (the design's row 4). "A wide torn war banner for a dark fantasy pixel-art game's dialogue cut-in, 640x96
   pixels, transparent background: frayed black and blood-red cloth with ragged ends, a faint brass trim along the top edge, wisps of grey
   smoke curling off the torn right end, darker towards the edges so white text reads over it, crisp pixel art, 1 px dark outline, no text,
   no figures." A mirrored, green-and-brass second version for the hero's answer.
2. **The News's four new icons, 24 px.** "A sheet of four 24x24 pixel-art icons on a transparent background for a dark fantasy strategy
   game, 1 px dark outline, muted gothic palette with violet and blood-red accents, no text: (1) humiliated, a cracked helm with a tear of
   blood; (2) Vengeance, a sword through a skull with a red ribbon; (3) reclaimed, a shield carried home on an open hand; (4) returns, a
   bandaged fist." The phase 2 note's prompt already covers *fled* and *cheated death*.
3. **Stitched**, a trait icon with the phase 1 note's sheet of twelve: "a 24x24 pixel-art icon, a heart sewn together with black thread,
   transparent background, 1 px dark outline."

Each would be credited in `CREDITS.md` when made.

## The balance (table 5g, `--nemesis typical|harsh|full`)

The same commands as phases 1 and 2: `npm run balance -- --no-tables --nemesis typical|harsh|full --talents --attempts 16 --war-runs 10
--only orcs,undead,beasts,wildwood,labyrinth,ogres`, with `--might 3` for `full`. The typical and harsh Councils are grown by real fights
with phase 3 in: Grudges, humiliations, trophies and fleeing. Typical has 13 members at Might mean 2.8; harsh has the same members five Might
up, mean 7.4; full has four to each army, Might 3.

| Army (Normal, its level) | no War | typical | harsh | full, Might 3 |
|---|---|---|---|---|
| Orc Warband (1) | 1.8 | 2.8 (+1.0) | 2.8 (+0.9) | 2.1 (+0.3) |
| Undead Legion (8) | 2.1 | 2.3 (+0.1) | 2.3 (+0.1) | 2.3 (+0.2) |
| Beast Packs (15) | 1.4 | 1.4 (+0.0) | 1.4 (+0.0) | 1.5 (+0.1) |
| The Wildwood (22) | 1.1 | 1.1 (+0.0) | 1.1 (+0.0) | 1.4 (+0.3) |
| The Labyrinth (35) | 3.3 | 2.8 (-0.5) | 2.9 (-0.4) | 2.9 (-0.4) |
| Ogre Clans (45) | 3.3 | 4.1 (+0.8) | 3.6 (+0.3) | 4.1 (+0.8) |
| **The largest rise** | | **+1.00** | **+0.94** | **+0.75** |

Measured as shipped (a cheat with no Might, a warchief's flat 35%). The typical Council has 13 members at Might mean 2.9; harsh has the
same five Might up, mean 7.5; full has four to each army, Might 3. Phase 2 measured +0.81, +0.88 and +0.75, and phase 3 as first built
+0.88, +0.69 and +0.75.

**The typical Council's Orc Warband sits exactly on the bar.** A cell's tries come in sixteenths, so +1.00 is exactly 16 more tries over 16
saves. The tool's bar is "no more than +1", so it passes, but it is not under it. The cause is the grown Council's Might-10 Orc Warlord
(Might 5 on Normal) against the level-1 party, as in phases 1 and 2 (+0.81 to +0.88 there). The paired seeds' noise moves this cell by a
sixteenth or two. A fall in tries (the Labyrinth) is the same noise.

## The war simulator (`npm run war-sim`), and fleeing's second job

`tools/nemesis/warSim.ts` now also prints:

- the mean of the day's Might means over days 53 to 67, steadier than the one day;
- who reached Might 10 first, and how;
- the phase's counts: fled, humiliated, trophies taken and brought home, Vengeances.

Two seeds, 120 days, 3 runs a day:

| | phase 2 (seed 1 / seed 2) | phase 3 as first built | **phase 3 as shipped** | Target |
|---|---|---|---|---|
| Might mean at day 60 | 1.9 / 1.4 | 2.5 / 1.7 | **1.6 / 1.4** | 3 to 5 |
| ... days 53 to 67 | | 2.3 / 1.7 | **2.3 / 1.5** | |
| Might mean at day 90 / 119 | 2.1 / 2.8 (seed 1) | 2.1 / 2.2 (seed 1) | **2.3 / 3.3, and 2.8 / 3.6** | |
| Fled the board, humiliated (120 days) | | 28, 53 / 21, 58 | **39, 55 / 23, 66** | |
| Lost to infighting a week, from week 3 | 0.9 | 0.9 / 0.8 | **0.8 / 0.8** | about 1 |
| The Council's own seat changes a week | 14.1 | 10.3 / 11.3 | **12.1 / 8.3** | 3 to 5 |
| First member at Might 10 | day 73 / day 84 | day 36 / day 35 | **day 65 / day 102** | not before day 45 |

**What changed between the two.** Phase 3 as first built let a member reach Might 10 by day 35 on both seeds. Each time it was a warchief born
a boss, with 3 scars, who had cheated death about five times. He alternated every run: he beat the bot's retries, then cheated death at 55%
(35% for a warchief and 20% for his scars), and gained +1 Might either way. The cheats came back Stitched and Vengeful, which fed the next
win. The director's call, now in:

- **A cheat gives no Might of its own** (`cheatDeath`). The humiliated nemesis's promotion comes from its next deed, +1 a run as ever.
- **A warchief cheats at a flat 35%:** his scars and Survivor add nothing.
- **A warchief is Stitched once a seat holding** (`Nemesis.chiefStitch`, cleared by `crown`).

**The death-spiral guard** (section 8's "a nemesis that wins 3 meetings in a row has a 50% chance of a Feast instead of a promotion") was
built and measured both ways with the three changes above in:

- With the guard: Might 10 first on day 66 and day 77; mean at day 60 1.6 and 1.4.
- Without it: day 65 and day 102; the same means.

Both seeds clear day 45 without the guard, and with the guard the day-60 mean was no higher, so by the director's rule **it is not shipped**.
It remains the next lever if a spiral shows again.

**Fleeing's second job, honestly.** The day-60 mean is still short of 3. Measured over the two weeks round day 60 it is 2.3 and 1.5 against
phase 2's single days of 1.9 and 1.4. By day 90 to 119 it reaches 2.3 to 3.6. The bot still slays 20 to 30 members a week while it
outclasses the armies it plays (to about week 12), and fleeing at the design's odds (30% for a lieutenant, 15% for a captain) saves only
those it catches near death on their own turn. Taking a cheat's Might away costs some of what fleeing added; that is the price of the
day-45 target.

**Not measured by the simulator:** Vengeance and trophies. Its bot's saves have no Sworn pairs and wear only the gear a run finds, so it
shows 0 of each. `test/revenge.test.ts` covers both.

```bash
npm run war-sim                  # 120 days, 3 runs a day, seed 1
npm run war-sim -- --seed 2
```

## Checks

- `npm run typecheck`: clean. `npm run web`: built.
- **The full `npm test`:** 2,590 tests, all passing.
  - `test/revenge.test.ts` (15 tests): the Grudge's steps and its fight hook; the Avenger only at Sworn (never at Comrades), its +15% and its
    quicker skills; Vengeance (never cheated over 60 saves, double crowns and trophies, +30 bond points, its scene due); humiliation (1 to 3
    runs away and counted off, Vengeful, Stitched, the shield before the helm, -20 loyalty); trophies (two at most, +5% each, brought home as
    Reclaimed for double pay); fleeing by the hash (the fight's stream untouched, asked once, the same moment the same answer, about 30%
    for a lieutenant over 600 fights, the warchief never, Elusive and Craven certain); a real flight to the edge, escaped and humiliated;
    Craven and Vain; every taunt template filled from a real memory in every voice, every line coming up, and every hero's two replies; the
    cut-in's lengths and reduced motion; the snapshot; Stitched spent; a warchief Stitched once a seat holding; a cheat with no Might and a warchief's flat 35%; the save's round trip and caps.
  - `docs/lines/new-lines.json`, the lines file every scene is checked against (`test/new-lines.test.ts`), has the 110 Vengeance scenes'
    words added.
  - Phase 1's tests pass unchanged. One phase 2 test reads the News's newest line after a cheat, so a cheat's humiliation is told on that
    line. The same test's "a Might more, by the run's rule" now asserts the director's changed rule: a cheat gives no Might of its own. No
    test was loosened or removed.
- **The pinned fights:** `nemesis-regression`, `stand-regression` and `ailments-identical` hold.
- **The fight HUD** (`node tools/combat-hud/probe.mjs`):
  - it gains a **taunt** case (`SCENES=taunt` runs it alone): a nemesis wearing a hero's trophy planned into the wave, its cut-in and the
    hero's answer measured over the deploy at 393x852, 360x780, 412x915, 360x640 and 393x852 with a 24 px top inset;
  - **0 overlaps**, there and in every other case;
  - shots in `docs/samples/combat-hud/nemesis3-*`.
- **Screens** at 393x852, 360x780 and 412x915: `docs/samples/nemesis-3/` (`node tools/nemesis/shots3.mjs`, saves in
  `tools/nemesis/saves3.ts`). They show the Council (the Avenger's chip, Ysolde away), Morrow's card (his trophy, the Grudge, the Avenger)
  and its foot, the News, the Fallen, the cut-in (Hask wearing Natsu's sword, Natsu's answer), the short cut-in, the cut-in under reduced
  motion, and Hask's plate in the fight with the sword beside it.
