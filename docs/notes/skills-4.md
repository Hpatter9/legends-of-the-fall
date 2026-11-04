# Skills overhaul, batch 4: the third skill for all 45

The owner-approved design is [skills-overhaul-design.md](skills-overhaul-design.md) (section 2 is the table of third skills; the owner's answer 1:
skill 3 opens at level 20). Batches 0 to 3 are in [skills-1.md](skills-1.md). This batch gives every hero its skill 3, built in the design's three
groups (one commit each): the tanks, melee and supports; the ranged, casters and healers; the summoners and monsters.

## What was built

- `SKILL3_LEVEL` **20** (`heroKits.ts`), `SLOT_LEVELS` [1, 10, 20], `skill3Open`; `HeroKit.s3` (the third slot, also `slots[2]`).
- `RES.SKILL3_PACE` **1.1**: once skill 3 is open the pool comes back that much faster again, on top of `SKILL2_PACE_*` (the design's starting
  number; kept: the parity tuning below did not need it moved).
- `src/sim/kits/third.ts` (new): the 45 casts, each from parts the game had: the plain skill strike, the toolkit's shove, pull, blink, the stone
  wall and its choke rule, the ailments (bleed, burn, poison, curse, slow, stun, shock, weaken, fear, charm, the ward and the cleanse), the
  Kunoichi's smoke (half the blows miss), the Lightning Mage's Charged mark, the Arc Blade's store, shields and heals. No cast draws from any stream
  (the smoke's miss rolls the skill stream, as Smoke Bomb's always did).
- `kits/table.ts`: `THIRD` (each hero's skill 3: its class, cost, cooldown, cast time and words), `TUNE3` (its strength), `THIRD_KINDS`; the slot is
  added to every kit as it is built. A guard's slot has its trigger as `emergency`, and its cast checks the same trigger.
- `kits/effects.ts`: five small marks the third skills leave, read where the old ones are (`kitStrike`): `exposed` (takes more: Reckless Swing on
  the Barbarian himself, Acid Flask, Bellow and Curse of Weakness from their caster alone), `scales` (Scale Ward), `bond` (Warding Bond, built as
  the Paladin's old vow is), `brand` (Infernal Brand; Cleave, `hellbladeSweep`, drinks double from a branded foe) and `missNext` (Sacred Flame).
- `kits/when.ts`: the readiness looks of the three utilities (Wall of Stone, Curse of Weakness, Bellow), which a lighter skill may be held for.
- `began`'s tag: skill 3 counts as skill 1 for the talents' cast effects (the heal, shield and haste on a cast come with skill 2 and the ultimate
  only, so cheap, frequent skills do not double their worth).
- Looks and sounds: each third skill borrows an existing signature, recoloured, and an element (`render/kitLooks.ts`), which also picks its sound.
- The page: the skill sheet (`fightHudRules.ts`, `fightHud.ts`) takes `Which` 3, with a Skill 3 tab when the kit has one (the tabs now fill the
  row by count); the unit card (`unitInfoRules.ts`) lists Skill 3, "Opens at level 20" below it; the hero sheet's Skills tab (`menuHeroes.ts`) and
  the codex (`codexView.ts`) list it. The fight HUD still draws two chips (three chips are batch 7); a `skill` event of skill 3 lights the row
  with the skill's name and no chip, and nothing else reads slot 3 there.
- `tools/kits/tune.ts`: a `t3` knob, applied at level 20.

### Moves from the design's table

- **Rule 2 at the measured income.** The design's jabs were set against its guessed income (3.5 SP, 4.5 MP a second); the measured one is 2.8 and
  3.8 (`INCOME`). 9 SP every 3 s, 10 SP every 3 s, 8 SP every 2.5 s, 12 MP every 3 s and 10 MP every 2.5 s each ask more than that, so their
  cooldowns were lengthened within the jab class: 9 SP and 12 MP jabs to 3.5 s, the Barbarian's 10 SP to 4 s, the 8 SP and 10 MP jabs to 3 s. The
  Gunslinger's Skip Shot is 4 s (at 3.5 s her kit asked 3.50 of the income, rule 3's ceiling) and the Lightning Mage's Spark 3.5 s (3.61 at 3 s).
- **A jab is held like any lighter skill.** The design's "a jab is never held while its demand is under the income" starved the heavies: at the
  measured income a jab cast whenever it is ready drinks nearly all the refill, and 17 heroes stopped casting their skill 2 in `hero-kits-all`'s
  long fight. Now a jab waits while a heavier skill with something to do comes round within the hold and paying for the jab would leave it short
  (`holdsFor`); with nothing heavier coming round it jabs whenever its cooldown allows (`skill3.test.ts` checks both).
- **Simplified effects** (the words say what the skill does): Hold Fast shakes off all his ailments (not one); Acid Flask's "defence drops by a
  third" is "it takes a fifth more for 4s" (`exposed`; defence has no timed hook); Curse of Weakness's "his blasts drink double" is "they take a
  fifth more from him"; Mend the Pack's ward is a shield of a fifth of each wolf's health; with no wolves she heals a tenth when under 40% with a foe
  near (its trigger); Thorn Whip with no treant drags the foe towards her; Command Strike's friend strikes at Command Strike's strength; Grapeshot's
  "three tiles before him" are the foe before him and the tiles either side of it across his aim.
- Each guard's strength (`TUNE3`) scales its heal, shield or time, as an ultimate's `power` does, so the tuner can move it.

## Parity

`node tools/kits/tune.mjs <knobs> <level> <stage> 12000` (every hero in 12,000 random five-hero teams of grade 1; the lift is its win rate against
the roster's average). Before is batch 2's figure from [skills-1.md](skills-1.md) (the grade-1 sweep did not move with batch 3); level 30 after
merging main 0.293.0.

| Level, stage | Before (no skill 3) | `TUNE3` at its first numbers | After tuning |
| --- | --- | --- | --- |
| 20, stage 30 | 54.1%, spread 12.8, largest 6.5 (Shambler, Siege Bot beyond 6) | about 61.6%, spread about 41 (400 fights: 21 beyond 6) | **60.0%, spread 8.2, none beyond 6, 2 beyond 4** |
| 30, stage 78 | 57.6%, spread 10.0, none beyond 6 | | 61.6%, spread 10.7, Samurai Commander +6.2 (with `TUNE3`) |
| 30, stage 78 (his ultimate's meter slowed) | | | **61.3%, spread 8.4, none beyond 6, 2 beyond 4** (Wanderer -4.7, Time Witch -4.3) |

`TUNE3` was stepped four times on the level-20 sweep (`--apply`, the tuner's damped step, its mean held), and checked at level 30 (each sweep run again on the final code). The Samurai
Commander's Rallying Cry (`TUNE` in `ultimates.ts`, the late lever) fills slower: `rate` 1.1 to **0.95**. (Its `power` was tried first, 1.391
to 1.2, and moved nothing: the banner's quarter of attack and health and the allies' charges do not scale with it; the power stays 1.391.)

The final lifts at level 20 run from -4.5 (Cleric) and -4.2 (Paladin) to +3.7 (Ranger), +3.2 (Kunoichi); at level 30 from -4.7 (Wanderer) to +3.7
(Minotaur), the Commander +3.3.

**The roster as a whole is stronger from level 20**: a level-20 team wins 60% at stage 30 where it won 54%, and about 4 points more at level 30.
The design leaves the overall strength to the global knobs last (batch 8, the full rebalance, with the armies' `start`, `CAL_SCALE`, `DAILY_START`);
`SKILL3_PACE` is the other lever if the owner wants it answered now (open question below).

**One army moved now, because a test holds it.** `test/army-pace.test.ts`'s strong party (Knight, Paladin, Archer, Warlock, Cleric at level 80,
every talent, a full castle, two saves of three tries) clears the Golem Forge on main in one try of six, at its last wave; with the third skills
every try stopped at wave 14 of 15. It is a knife edge, not one skill: taking away any one of the party's skill 3s but the Warlock's let one try
through, and so did shutting slot 3. The Golem Forge's `start` went from 19.1 to **18.7** (2% easier; at 19.0 and 18.9 it still fell a wave
short). Batch 8 re-tunes every army against batch 0, so this is a stopgap. The identity proofs put the Golem Forge's recorded strength back, so
none of their hashes moved for it.

**A sound fallback.** `battle-sound.test.ts`'s level-20 fights reached an old gap: the Kitsune's Alter Self can take the shape of a foe that reaches
past a tile but throws nothing, and her blow then sends a `shot` with no missile, which the sound and effects table (`missileOf`, `fxRules.ts`) did
not cover. It now draws and sounds a plain orb. That is renderer only, so no fight changes.

## The identity fixtures

Only the scenarios with heroes at level 20 or more moved, and only those were written back:

- Recorded after the Commander's meter moved too (it moves only level-30 fights).
- `test/fixtures/spells-identity.json`: field30, field30Others, heroes30, heroes30Others, bosses, armyFoes, spells (each with heroes at level 30),
  army (saves at levels 30 to 70) and stand (a party at 30). Kept: field1, field1Others, heroes1, heroes1Others, heroes10, heroes10Others, lands
  (level 10), daily and tower (fresh saves) and calamity.
- `test/fixtures/ailment-logs.json`: field30, bosses, armyFoes, spells, army and stand. Kept: field1, lands, daily, tower, calamity.

## The skills that want their own painting

Each plays a borrowed, recoloured signature until then (`KIT_LOOKS`). These read least like what they do:

1. **Wall of Stone** (Juggernaut): stone rising in a line (borrows Earthquake).
2. **Shuriken Fan** (Kunoichi): three spinning stars thrown in a fan (borrows Shadow Step).
3. **Skip Shot** (Gunslinger): a bullet skipping from one foe to the next (Dead Eye).
4. **Barrier Drone** (Rifle Bot): a small drone and its two shields (Overclock).
5. **Grapeshot** (Dread Pirate): a cone of shot over three tiles (Broadside).
6. **Fire Bolt** (Fire Wizard): a small, quick bolt, not a meteor (Meteor).
7. **Hourglass Bolt** (Time Witch): a stream of sand (Temporal Surge).
8. **Phantasmal Blade** (Illusionist): a ghostly blade (Mirror Image).
9. **Acid Flask** (Wanderer): a thrown flask and its green splash (Sanctuary).
10. **Thorn Whip** (Druid): a lash of thorns that drags (Call Treant).
11. **Fox Wisps** (Kitsune): three fox-fire wisps (Fox Charm).
12. **Feather Darts** (Karasu Tengu): black feathers thrown (Dive).
13. **Bellow** (Minotaur): a roar's ring (Gore Charge).
14. **Ink Cloud** (Kraken Mate): a cloud of ink (Undertow).
15. **Warding Bond** (Paladin): a tether of light between the two (Holy Challenge).
16. **Scale Ward** (Queen Dragoon): her scales hardening (Dragon Breath).
17. **Bile Spit** (Shambler) and **Serpent Bite** (Gorgon): a gob of bile, a snake's bite (Rotting Touch, Stone Curse).

The rest (the cuts, shots and bolts, the heals and wards) read well enough with their borrowed looks.

## Tests

- `test/skill3.test.ts` (new): every hero has a skill 3 from level 20 with a key of its own; each of the 45 does what its row says (set up in its
  case, cast at its strength, the effect read off the fighters); the AI casts it in its case (open and paid, skills 1 and 2 cooling, or a guard's
  trigger at once), and never below level 20; the jab hold rule.
- `test/skill-rules.test.ts`: slot 3 (`SLOT_LEVELS` [1, 10, 20]), rule 2 for every jab against the measured income, rule 3's floor of 1.4 now that
  every kit has three skills.
- Moved with the new skill, and said so in each: `hero-kits-looks` and `skill-keys` (every slot's look and key, skill 3 included),
  `hero-kits-all` (a readiness look names a skill 2 or 3), `unit-info` (the card lists skill 3, locked below 20).
- The identity fixtures, as above.

## Checks

`npm run typecheck`; the affected tests for each group (`skill3`, `skill-rules`, `hero-kits`, `hero-kits-all`, `hero-kits-looks`, `skill-keys`,
`unit-info`, `fight-hud`, `revive`, `class-heroes`, `new-heroes`, `more-heroes`, `ranged`, `mages`, `monsters`, `melee`, `summon-timers`); the
identity tests; the full `npm test` (2,080 of 2,082 on the first run: `army-pace`'s Golem Forge and `battle-sound`, both answered above; then 2,082 of 2,082); `npm run web`. The page changes are a tab on the skill sheet and lines on the cards, read through the same rules the tests
read; the HUD's chips are batch 7, which takes the screenshots.

## Open questions for the owner

1. **The roster's strength from level 20.** Skill 3 lifts a level-20 team by about 6 points of wins (54% to 60% at stage 30) and a level-30 one by
   about 4. Leave it for batch 8's rebalance (the design's order), or ease it now with `SKILL3_PACE` (1.1) below 1?
2. **Jabs held for the heavies** (above), in place of the design's "a jab is never held": accept?
3. **The Golem Forge's start eased to 18.7** for `army-pace`'s strong party at level 80: keep it until batch 8, or answer the cell another way?
