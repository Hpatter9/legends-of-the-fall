# Tactics

The party's tactics, built from the owner-approved design ([tactics-design.md](tactics-design.md)). The owner's answers (through the
director): Advance together the default for every save; the foes strengthened to keep the pace targets; a Charge! call once a fight; small
formation bonuses each with a weak point; tactics from the first fight, formations with Auto place (army 3); Hunt the casters and the foes'
own tactics later; every mode the player sets out but the Last Stand; the pick remembered per army and mode.

## Batch 1: tactics in the sim

All of it is in `src/sim/tactics.ts` (pure), hooked into `decide` (`battle.ts`), the hero kits' casting (`heroKits.ts`) and the orders
(`orders.ts`).

- **`setTactic(b, 'advance' | 'charge' | 'hold')`**, before `fight`. A fight with none takes `TACTICS.fallback`, which is still `charge`
  in this batch, so every fight, pinned record and balance figure plays out exactly as before. Batch 2 turns the fallback to Advance and
  retunes the foes.
- **Advance together.** At `fight` the front-liners (`roleOf`, `suggest.ts`) are the line and the other heroes placed are held. A held hero:
  - casts any skill but an **opener** (`OPENERS`: the skills that carry their caster into the foe, read from seeded fights by
    `tools/tactics/openers.ts`: Shadow Step, Pilfer, Ravage, Voltage Blink, Iaido, Stillness Palm, Fox Guise, Bounty Hunt, and the Lancer's
    and Queen Dragoon's diving ultimates); escapes and the front-liners' own charges are never held;
  - strikes or shoots whatever is already in its reach;
  - otherwise walks toward the foe, but never past the row behind the foremost front-liner (`heldStep`), or waits.

  The line **meets the foe** when a front-liner swings its first blow or is struck (then a `lineMet` event, once), and after 6 s at the
  latest (`ADVANCE_CAP`). A held hero is let go on its own when a foe comes beside it, or when it is taunted or charmed. A party with no
  front-liner holds nobody.
- **Hold the line.** Every hero is held on the deploy rows (a front-liner may step one row out) until a foe comes within 2 tiles of any of
  them, or 10 s pass (`HOLD_CAP`).
- **Charge!** (`orderCharge`, `canCharge`): the player's call, once a fight, queued and applied at the start of the next tick like every
  tap, and kept in the fight's log, so a fight replays (`replayLog`).
- **No dice.** Nothing here rolls; who is held, and when, is read from where the fighters stand. The Last Stand takes no tactic.

### First measurements (`node tools/tactics/run.mjs --tactic ...`, 1,000 field fights a cell, random teams placed sensibly)

| | Level 1, stage 5 | Level 10, stage 27 | Level 30, stage 90 |
|---|---|---|---|
| Won: Charge (as before) | 62.1% | 48.2% | 70.1% |
| Won: Advance together | 64.4% (+2.3) | 50.7% (+2.5) | 73.3% (+3.2) |
| Won: Hold the line | | 49.0% (+0.8) | 70.8% (+0.7) |
| Strikers' lead on the front line (median), Charge / Advance | 1.3 s / 0.5 s | 1.5 s / 0.3 s | 1.4 s / 0.4 s |
| Strikers' health lost before the line meets the foe, Charge / Advance | 11% / 3% | 17% / 2% | 23% / 5% |

Hold the line by band (level 10, about 110 fights a band, noisy): minotaurs 66 to 68, mixed 53 to 62, ogres 54 to 60; gorgons 43 to 35.
It pays against those who come to it and costs against those who shoot.

An early cut released a held hero when a foe came within 3 tiles and met the line when a front-liner came within 2: the strikers still
came to blows first a third of the time (they walked up to the line, came within 3 of a foe and blinked in). Holding them until the foe is
beside them, and meeting the line on the front-liner's first blow, gives the figures above.

### Tests

`test/tactics.test.ts` (new, 9): Charge plays a fight exactly as no tactic; under Advance the held stay behind the Knight's row and cast no
opener until the line meets the foe, by the Knight's blow or the cap; a party with no front-liner holds nobody; Hold keeps everyone on the
deploy rows until a foe comes up or the cap; a foe beside a held hero lets it go; the Charge! once a fight, at the next tick, replayed from
the log; the same seed and tactic give the same fight; the Last Stand takes none; the openers are the heroes' real skills, and the escapes
and the front-liners' charges are not.

### Tools

- `tools/tactics/measure.ts` (`node tools/tactics/run.mjs`): the seeded measurement; `--tactic`, `--level`, `--stage`, `--placed`,
  `--diag` (how the early strikers came to blows).
- `tools/tactics/openers.ts` (`node tools/tactics/run.mjs --openers`): the skills that carry their caster nearer the foe, read from seeded fights.

## Batch 2: Advance the default, and the rebalance

- **`TACTICS.fallback` is `advance`**: every fight the player (or a tool) does not set otherwise advances together. The Last Stand still
  takes none.
- **The foes' answer, `TACTICS.answer` 1.02**: every foe of a fight's band strikes 2% harder (`startBattle`'s band boost). Attack alone, so
  no health is rounded twice (an answer on health too moved the corruption's and the Fortified twist's stated +% by a point of rounding).
  The Last Stand's waves come by their own rules and are left as they were. Measured on random teams placed sensibly
  (`node tools/tactics/run.mjs`, 1,500 fights a cell, on main at 0.340.0):

  | Won | Level 1, stage 5 | Level 10, stage 27 | Level 30, stage 90 |
  |---|---|---|---|
  | Before the tactics (Charge, no answer) | 63.4% | 48.8% | 67.5% |
  | Advance together, answer 1.02 (the default now) | 63.3% | 47.6% | 68.6% |
  | Charge, answer 1.02 | | | 65.7% |

  So a sensibly placed party plays at the old pace with Advance, and Charge costs about 2 points on average (more against brutes, less or
  none against archers; batch 1's table by band).
- **Parity** (the hero sweep, `tools/heroSweep.ts`: random teams placed at random, 12,000 fights). Random placings put strikers in front of
  the line, so Advance lifts them more than it lifts a sensible party (the average rose 2 to 5 points), and it lifts most the heroes who
  gain from waiting: those whose self skill is cast before contact (the Werewolf's Shapechange), whose aura reaches a party standing
  together (the Samurai Commander's War Banner), and the front-liners the others now follow. Retuned by their own kits:
  - the Werewolf's Hunter back to its numbers before the joint rebalance (`HUNTER_QUICK` 1.35 to 1.25, `HUNTER_BLEED` 0.18 to 0.12);
  - the War Banner 6 s to 4 s (`BANNER_MS`; the Samurai Commander's alone);
  - the Karasu's Pounce (`TUNE1`) 0.24 to 0.36 (his opener is held, so he lost most);
  - the Siege Bot's Bombard (`TUNE1`) 0.27 to 0.38;
  - the Knight's Hold Fast (`TUNE3`) 1.166 to 0.8 (his ultimate's power was the first lever, but it cost the Last Stand's strong party its
    fourth room; Hold Fast does not);
  - the Shambler's ultimate (`tuned.power`) 0.933 to 0.84.

  | | Level 1, stage 5 | Level 10, stage 27 | Level 30, stage 92 |
  |---|---|---|---|
  | Average, spread | 58.5%, 10.7 | 44.4%, 13.5 | 62.2%, 10.4 |
  | Beyond 6 | none | Kitsune +7.9, Werewolf +6.8, Shambler +6.6 | none |

  The level-30 yardstick (`hero-balance-ultimates`) moved from stage 90 to 92, where the average team wins 62% as it did at 90 before (66%
  at 90 now); its band is the same 6. Level 10 has no test; its three above 6 are watch items for the end's re-measure (their skill 2 is
  a utility skill whose `tune` does nothing, and their timers barely moved them).
- **Records**: `spells-identity` and `ailments-identical` re-recorded (every scenario but the spells proof's `stand`), `stand-regression`
  re-pinned (the third fight now won, the seventh lost), the Calamity scenario back among those that play as recorded with the bosses'
  signatures on (its greedy run ends before that boss again), and two tests re-staged (`boss-big`'s dodge on a charging party, as its
  heroes packed behind the line left no tile to step to; the Vaelkhar trial on seed 2004, which shows his whole kit under Advance).
- **Tools**: `TACTICS_OFF=1` (`tools/tactics/off.ts`, imported by `tools/balance.ts`) measures as before the tactics; `run.mjs --answer`.

## Batch 3: the page

- **The chip** (`src/tacticsView.ts`, `src/tactics.css`): on the prep screen between Auto and Home, a pennant and the tactic picked for this
  run's mode or army ("Advance"). A tap opens a bottom sheet: the three tactics as large buttons with one line each, the picked one lit, and
  Close (it is a screen in the page's stack, `openScreen`, so the back button closes it). A pick is kept in the save at once.
- **The pick** (`src/sim/tacticPick.ts`, `Meta.tactics`): kept per army in the army runs (`army:<id>`, any tier) and per mode in the others
  (`daily`, `calamity`, `quest`...); Advance together where none is. A save from before has none; an unknown tactic in a save is dropped on
  load. `begin` sets it on the battle (`setTactic`) before `fight`, so Auto's replays and the page's own fights take it alike.
- **Charge!** (`#chargeBtn`): at the right of the board, under the spell row and its Auto switch, while the party is held (`canCharge`); a tap
  sends the sim's order (`orderCharge`) and the button goes. The status line says "The line advances" (or "Holding the line") until the
  line meets the foe, then "Fight!" as before.
- Shots (`node tools/tactics/shots.mjs` after `npm run web`): `docs/samples/tactics-{deploy,sheet,fight}-{393,360,412}.png`.
- Tests: `test/tactic-pick.test.ts` (new, 3): the keys by army and mode and the default; saved and loaded, with an unknown tactic dropped and a
  save from before having none; every tactic's words.

## Batch 4: formations

All the rules are in `src/sim/formations.ts` (pure), hooked into the AC (`acAgainst`, `blow.ts`), the facing a blow is weighed against
(`swing`'s `blowMult`), a step's time (`stepTo`), a blow's damage (`swing`) and splash (`hurt`). A formation is read once, as the fight
begins (`formationOf`, `startFormation`), from where the heroes stand; the first shape that fits, in this order:

| Formation | Shape | Bonus | Weak point |
|---|---|---|---|
| Shield Wall | 3 or more side by side on the front row, 2 of them front-liners (`roleOf`) | +1 AC each while a friend of the wall stands beside it | the ends: a blow from the outer side counts as from behind |
| Spearhead | a tip on the front row, a wing a row behind on each diagonal | tip and wings march 15% faster for 6 s; the tip's first landed blow +20% | the tip at -1 AC |
| Hollow Square | a back-liner on the back row, a friend on each side (beside or a row ahead) and one ahead | while 2 friends stand round it, every blow on it counts as from the front | its heroes take 15% more splash while packed (2 friends round) |
| Skirmish | 4 or more, no two on touching tiles | splash on them 20% less | none of its own: nobody stands beside a friend, so guards and auras reach fewer |

- **On only where set** (`setFormations`): the page sets it once Auto place is open (the owner's answer: formations with Auto place, army
  3); every other fight, the tools' and the records' included, reads no formation and plays exactly as before (a test holds it). Batch 5
  turns them on for Auto and its tools. The Last Stand reads none.
- **Splash** is the splash of a blow (the `splash` hits); a skill's area is not counted in this batch.
- **Arrange** (`formationSpots`): a party's tiles in a shape, the front-liners and strikers taking the lead's tiles and the back line the
  rear's, laid at the centre column that fits most; a tile that does not fit goes to the nearest free one. The page's sheet shows the
  formations under the tactics once they are open: the shape the heroes stand in now ("Formation: Shield Wall") and the four as buttons
  (name, bonus and weak point); a tap sets the placed heroes out in that shape. The chip shows it as a small second line ("Advance / Wall").
- **No dice**: every rule is read from where the fighters stand.
- Tests: `test/formations.test.ts` (new, 6): each shape read (a wall needs two front-liners; a spearhead staged as a square is a
  spearhead, the first that fits); off, a fight plays exactly as with none, and on, the same seed gives the same fight; the wall's AC
  while a friend stands beside and its open ends; the spearhead's march, first blow and tip; the square's guard while two friends stand
  round and its splash, the skirmish's splash; Arrange sets a party out in each shape, read back as that shape.
- Shots: `docs/samples/tactics-{deploy,sheet,arranged,fight}-{393,360,412}.png` (the save has Auto place open).
- After merging main (0.343.0): `set-powers`' small fights (new on main) re-seeded nine powers to seed 7, where each fires under Advance
  together (the table records "where each power was seen to fire").

## Batch 5: the advice, and the final re-measure

### What the counters measured

`node tools/tactics/run.mjs --tactic <t> [--formation <f>] --formations-on --games 5400` (random teams, about 600 fights a band; the
formations set out by `formationSpots`, "none" placed with care; won %):

| Band | Lv 1: Advance / Hold+Square / Advance+Skirmish / Hold+Wall | Lv 10 | Lv 30 |
|---|---|---|---|
| Skeletons | 51.7 / 53.8 / 55.3 / 51.8 | 45.2 / 42.2 / 39.0 / 42.0 | 67.7 / 71.5 / 65.7 / 70.3 |
| Werewolves | 54.8 / 54.3 / 54.0 / 54.2 | 29.3 / 29.7 / 28.0 / 31.0 | 66.5 / 59.0 / 59.3 / 62.5 |
| Minotaurs | 61.7 / 59.2 / 56.0 / 61.0 | 63.0 / 67.3 / 60.3 / 65.0 | 87.7 / 86.7 / 84.2 / 85.2 |
| Gorgons | 68.3 / 56.0 / 69.0 / 50.8 | 42.7 / 33.2 / 44.5 / 31.0 | 59.0 / 55.7 / 56.5 / 50.3 |
| Satyrs | 73.8 / 70.0 / 72.0 / 73.7 | 55.7 / 52.5 / 50.2 / 51.8 | 79.0 / 78.5 / 76.8 / 78.3 |
| Mixed | 65.2 / 64.2 / 63.2 / 65.5 | 48.8 / 52.2 / 46.3 / 50.7 | 69.3 / 73.2 / 69.7 / 71.0 |
| Orcs | 60.7 / 61.7 / 57.7 / 58.0 | 45.5 / 45.3 / 40.5 / 42.0 | 71.0 / 70.7 / 65.0 / 68.7 |
| Demons | 44.7 / 44.0 / 41.5 / 43.8 | 25.3 / 25.5 / 21.7 / 24.5 | 47.7 / 48.5 / 46.8 / 47.7 |
| Ogres | 75.2 / 73.2 / 68.0 / 72.3 | 61.5 / 62.0 / 54.8 / 60.2 | 74.5 / 71.0 / 67.2 / 70.7 |

(Charge, at level 10, 200 fights a band, was never the best.) What holds at every level: **holding the line against a band that shoots
loses** (the gorgons, 7 to 17 points); **Advance together placed with care is the best or within the noise of the best everywhere**; no
formation beats a careful placing by more than 2 points at every level (the square against the mixed band gains 3 to 4 at levels 10 and
30, loses 1 at level 1). The formations' bonuses, as designed, are too small to make counters; the design asked +3 to +5 for the right
shape, and they do not reach it. That is a question for the owner (below).

### What shipped

- **The advice** (`src/sim/tacticAdvice.ts`): only what the fights bear out. The sheet shows a line against this wave's foes ("Advance
  together...", or "They shoot: advance together and close on them." when two in five or more shoot), and a warning when the pick is Hold
  against a band that shoots. Auto place lays the party out as before (`autoFormation`); the tools and the pace records keep the default,
  Advance together placed with care, which is what a player who never opens the sheet plays.
- The sheet's lines for Charge and Hold now say what was measured ("the quickest reach the foe first, often alone"; "Archers will shoot a
  line that waits").
- Test: `test/tactic-advice.test.ts` (new): Advance against every band, the warning only for Hold against a band that shoots.
- `run.mjs --advice` plays the advice.

### The final re-measure (main at 0.343.0 merged)

- **Parity** (12,000 fights): level 1, stage 5: average 58.5%, spread 10.7, none beyond 6; level 30, stage 92: 62.2%, 10.4, none beyond
  6; level 10, stage 27: 44.2%, 14.4, the **Kitsune +8.8 and the Werewolf +7.3** beyond 6 (watch items; main's later changes moved them a
  little; their skill 2 is a utility skill whose `tune` does nothing, so their lever is in the kit's own numbers).
- **Pace**: sensibly placed random teams win at the old rates with Advance (batch 2's table); every mode's pace bar in the tests (the
  armies' pace, the daily, the Calamity, the Last Stand, the deep tiers) passes.

### Questions for the owner

1. **The formations' bonuses are too small to matter** (no shape beats a careful placing by 2 points at every level). Raise them so the
   right shape is worth +3 to +5 against its armies (a tuning pass of its own, with new counters measured), or keep them small, as a
   flavour? Recommended: a tuning pass, in its own batch, if formations are to carry the "party building with real trade-offs" idea.
2. **Charge is never the best pick** now that the foes answer Advance. Leave it as the old way to fight, or give it an edge (say, the
   first blows of a charge land harder)? Recommended: give it an edge against bands that shoot, so it is the counter the design meant.
3. **Level 10's Kitsune and Werewolf** sit 7 to 9 points over the roster there (no test holds level 10). Trim them in their own kits now?
   Recommended: yes, by their Alter Self's and Shapechange's own numbers, measured at levels 10 and 30.

## Batch 6: Charge's edge, the formations' tuning, and the level-10 trims (the owner's answers)

The owner took the three recommendations of batch 5: a tuning pass for the formations, a real edge for Charge, and the level-10 Kitsune and
Werewolf trimmed by their own kits. Built on main 0.347.0 (runes, the half-health return). Every figure below: `node tools/tactics/run.mjs`,
random teams placed with care, about 600 fights a band (5,400 a cell); the parity rows the hero sweep, 12,000 fights.

### Charge's edge (`CHARGE` in `tactics.ts`)

A charging party marches 20% faster for its first 6 s, and each hero's first landed blow **on a foe that shoots** is +60% (`chargeMove`,
`chargeBlow`; from the fight's start under Charge, from the call under the player's Charge!, which now carries the edge too). `TACTICS.edge`
off plays the old Charge (the "as before the tactics" proofs). A first cut, +30% on any foe and 25% faster, made Charge the best pick
overall (+4 at level 1), so the blow was narrowed to shooters and raised:

| Won: Advance / Charge | Level 1 | Level 10 | Level 30 |
|---|---|---|---|
| Overall | 62.1 / 62.9 | 46.8 / 46.6 | 69.4 / 67.4 |
| Gorgons (they shoot) | 68.3 / **78.0** | 43.7 / **54.2** | 59.8 / **63.5** |
| Ogres (slow brutes) | 74.2 / 69.7 | 61.7 / 55.8 | 76.3 / 69.5 |
| Minotaurs | 62.8 / 59.5 | 64.3 / 62.3 | 88.8 / 84.3 |

So Charge is now the counter the design meant: about level overall, +4 to +10 against a band that shoots, -2 to -7 against slow brutes.

### The formations, tuned (`FORM` in `formations.ts`)

| | Batch 4 | Now |
|---|---|---|
| Shield Wall | +1 AC | +1 AC and a fifth less from melee blows (`WALL_MELEE`), while a friend of the wall stands beside |
| Spearhead | march +15%, the tip's first blow +20% | march +30% for 6 s, the first blow of the tip and of each wing +50% |
| Hollow Square | the back-liner's guard | and +2 AC for the square's heroes while two friends stand round them |
| Skirmish | splash -20% | splash halved, and the foes' skills -30% |

Won, level 10, Advance and the shape against loose (formations off, placed with care): Shield Wall 47.8% against 46.8% (minotaurs +4.0,
the mixed band +3.7, ogres +0.1); Hollow Square 48.5% (minotaurs +4.0, orcs +3.8); Skirmish 43.1% (worse against every field band: they
bring few blasts; it is for the bosses and armies that do); Spearhead with Charge 44.3% against Charge loose 46.6% (it adds nothing over
Charge's own edge). At level 1 the wall and square are +1.8 overall, at level 30 -0.8 and +0.7. So the wall and the square are now small
real gains, a counter to the minotaurs worth about +4 at level 10, but **not the +3 to +5 against every army the design asked for**: a
careful placing already stands the front-liners side by side, so the baseline has most of a wall, and the arranged shapes lose the
placing's own sense. The bonuses were left here rather than raised until a shape is a must; the formations count only where Auto place is
open, so no pace record moved.

### The advice (`tacticAdvice.ts`)

Two in five or more shoot: **Charge** (a warning on Hold). Three in five or more are slow brutes (400 health or more, a step of 900 ms or
more: the minotaurs, the ogres): **Advance behind a Shield Wall** (no wall without two front-liners; a warning on Charge). Else Advance. The
sheet's words for Charge and the formations say their new numbers.

### The level-10 trims

| | Before | Now |
|---|---|---|
| The Kitsune's Alter Self | 15 s, the copied attack up to x1.3 | 6 s, up to x1.1 (`TIMER.alterSelf`, `GUISE_CAP`) |
| The Werewolf's Shapechange | 40 s | 25 s (`TIMER.wolfForm`) |
| The Werewolf's Pounce (`TUNE1`) | 0.85 | 0.65 |

(The Hunter's quickness did not move him at level 10; his lift was his Pounce, held, and the form he takes before he meets the foe.)

| Parity | Level 1, stage 5 | Level 10, stage 27 | Level 30, stage 92 |
|---|---|---|---|
| Average, spread | 58.2%, 10.6 | 43.6%, 11.3 | 61.6%, 11.0 |
| Kitsune, Werewolf | -0.9, +1.0 | +5.8, +5.1 | +0.8, +2.2 |
| Beyond 6 | none | none | none |

### Records and tests

- `ailments-identical` (field1, field30, bosses, spells) and `spells-identity` (field1, field30, bosses, spells, heroes1, heroes10, heroes30)
  re-recorded: the Kitsune's and Werewolf's kits, and Charge's edge where a scenario charges.
- `test/tactics.test.ts`: Charge's edge (the march, the first blow on a shooter once, none on a foe that does not shoot, none for the foes,
  none with the switch off) and the player's Charge! carrying it; `test/formations.test.ts`: the wall's melee guard, the square's AC, the
  skirmish's guard against skills, the wings' first blow; `test/tactic-advice.test.ts`: the three cases and the two warnings.
- **Merged over FOE-STYLES (main 0.351.0)**: the blow keeps main's `rush` and `gangOf` with Charge's edge. The Great Sage fell to -6.6 at
  level 30 (stage 92); his Arcane Surge (pools and shields, so its `power` moves nothing) now fills faster, `rate` 1.7 to 2.1: -5.2, and no
  hero beyond 6 (average 63.2%, spread 11.1). `ailment-logs` and `spells-identity` re-recorded from the tests' own output.
