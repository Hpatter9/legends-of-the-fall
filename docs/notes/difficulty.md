# Difficulty

The owner's ask: "make sure the difficulty scales properly, and is actually difficult." This branch writes the curve down, adds a fifth
army tier (**Mythic**), retunes Hard, Elite and Legendary to it, and stops the castle trivialising the spire and the Calamity. The
numbers are all from the same bot as `docs/notes/level-100.md` (`npm run balance -- --no-tables --deep ...`): the recruits' party (Knight,
Paladin, Archer, Warlock, Cleric) at the level shown, a maxed castle, gear dressed, a fresh save for each try, at most 25 tries; "with talents"
means every talent row the level opens (the points are the level's own). Full tables for all nine armies are in `difficulty-tables.md`.

## The target

Where a hero level is reached (`npm run level-pace`: the favourite is level 30 on day 4, 45 about day 43, 65 about day 95, 85 about day 133,
100 on day 164; it was 181 before this branch, see "Pace" below) and what it should feel like there:

| tier | meant for hero level | days (about) | foes (hp x, attack x, speed x, escorts) | at the band's entry | at the band's top | first-try clear from |
|---|---|---|---|---|---|---|
| Normal | 1 to 25 | 0 to 2 | 1, 1, 1 | as it was (the early armies 2 to 3 tries, the late ones 7 to 12 at level 1) | trivial: this is the learning tier | 15 on most armies |
| Hard | 25 to 45 | 2 to 40 | 1.75, 1.45, 1.05 | 5 to 9 tries on the late armies | 1.0 to 1.7 | 45 to 60 |
| Elite | 45 to 65 | 40 to 95 | 2.6, 1.95, 1.1, +1 foe a wave | 5 to 15 (some runs lost) | 1.0 to 1.3 | 60 |
| Legendary | 65 to 85 | 95 to 133 | 3.4, 2.5, 1.15, +1 | 5 to 9 | 1.3 to 1.7 | about 100 |
| Mythic | 85 to 100 | 133 to 164 | 4.6, 3.2, 1.2, +2, a boss that turns at 60% and hits 20% harder | a wall (12 to 20 tries from 85 to 92) | 3.0 to 3.8 at level 100 on the last three armies | never (a level-100 party still needs 3 or 4 tries) |

Why those bands: levels 1 to 25 are the first two days (the XP curve to 30 is the old one, so level 30 is day 4 whatever the tiers do),
so Normal is the first-day tier; after that the pace slows to about one band every five to eight weeks, which is a good length for a tier.
Hard opens at the 3 stars of Normal, which a player has by about day 12 on the first army.

**What can and cannot be hit.** The aim was 4 to 8 tries at the band's entry and 1.5 to 3 at its top. The party's power does not rise evenly
across a band: it rises in steps, because each deep talent row opens at a level (40, 60, 80, 100: `talentsDeep.ts`) and a milestone lump of
hp and attack comes with it, and because talents (10 points by level 30) are worth far more than the levels around them. Measured on the same
foes, the mean tries drop about fivefold over 20 levels (Elite 2.6 / 1.95 at level 45 is 5 to 15 tries, at 55 about 2, at 65 about 1.2). So I
set each tier to about 5 to 10 tries at its entry level, which puts the top at 1.0 to 2: a first-try clear only about one band above, which
is the other half of the target. Entry for Hard, Elite and Legendary is in range; the tops come out a little under 1.5 to 3.

**Mythic is calibrated to level 100**, not to its entry. The last stretch (85 to 100) holds the level-100 milestone and the seventh talent row
(nine points), a bigger step than any other, so a tier that is still several tries at level 100 is a wall at 85 to 95. Level 100 is where
a player spends the rest of the game, and the owner's rule is that nothing is trivial there, so the tier is set to 3 to 4 tries on the last
armies at level 100 (Infernal Host 3.0, Yokai Night Parade 3.4, Golem Forge 3.8, 8 saves) and is 12 to 20 tries at levels 85 to 92. If the owner would
rather Mythic opened easier, the knob is `TIERS[4].hp` and `atk` (4.6 / 3.2); with 4.0 / 3.0 and one escort it was 6 to 10 tries at 85 and 1.2 to 1.8 at 100.

The early and middle armies are easier on every tier by construction (their own `start` and `growth`), so Orc Warband is 2.8 tries at level 100
on Mythic only without talents and 1.0 with. The brief's "late armies" are the ones the targets are held to.

## What changed

- **`src/sim/tiers.ts`:** the `mythic` tier (`need` 10 stars: all of Normal, Hard, Elite and Legendary's star; one star, "Flawless: no hero lost in
  any boss fight", as Legendary's; pay x7 and XP x6). Hard, Elite and Legendary have new multipliers (above). A tier can now have `extra` (escorts),
  `phaseAt` and `surge` (the last boss's form).
- **Escorts** (`waveFoes` in `armies.ts`, read by `startStage`): Elite and Legendary add one foe to every wave, Mythic two. They are copies of the
  wave's own escorts in turn (no randomness, so no new stream; a boss is never copied, a boss wave with no escorts stays as it is). It adds
  pressure the player feels in the fight (more bodies), not just bigger numbers.
- **Boss form** (`Boost.surge`, `Unit.phase.surge`, `bossPhases.ts`): Mythic's last boss changes form at 60% of its health (a half on every
  other tier) and its second form's attack surge is 20% higher on top of the boss's own.
- **Saves.** Stored stars stay valid: `met` masks are read per tier (a save with no Mythic mask has none), `first` is masked to the five tiers,
  stored chests and first-clear marks are unchanged, and an old record has Mythic shut until its 10 stars are won. A test loads a pre-Mythic save
  (`test/armyStars.test.ts`). Nothing else read "four tiers": `ARMY_STARS` is 11 now, `tierRange` and `armyStars` follow `TIERS`, and the
  armies screen, the star recap and the first-clear chest list (`FIRST_CLEAR_CHEST`, a gold chest for Mythic) are driven by it. The
  chests stay at 3, 5 and 10 stars: the Mythic star adds no milestone chest of its own (its first clear pays a gold chest), so no chest is paid twice.
- **The armies screen** (`armiesView.ts`, `pixel.css`): five tier tabs (the text is 11px so "Legendary" fits at 360), an 11-star track, the foe line
  also names the escorts and the boss form. Shots: `docs/samples/difficulty-{mythic,legendary}-{393,360,412}.png` (`tools/ui/difficulty-shots.mjs`).
  No sideways scroll at 393, 360 or 412.

## Other modes at level 100

**The Calamity and the spire (the tower).** These start every hero at level 1 and ignore the lasting level, rank, worn gear and talents
(`localBoost`), so the level cap does not reach them. The one lasting power that does is **the castle**: the Barracks (+42% hp at the top) and
the Armoury (+35% attack), plus the Mage Tower, the Library (more in-run XP) and the Treasury. A player at level 100 has it all built. Measured
(30 greedy runs; the castle at its top; the balance tool's old foes):

| | no castle (the tuned baseline) | castle at its top, before | castle at its top, now |
|---|---|---|---|
| spire: floors cleared (median / mean) | 12 / 13.1 | 80 / 68.7 (the cap) | 12 / 20.5 |
| spire: first act boss felled | 7% | 90% | 37% |
| Calamity (asc 0): full clears / maps | 17% / 3.4 | 100% / 6.0 | 13% / 3.5 |
| Calamity asc 5 | 3% / 2.1 | 93% / 5.7 | 3% / 2.5 |
| Calamity asc 10 | 0% / 1.2 | 60% / 5.0 | 0% / 1.4 |

So a built castle made both modes a walk-over. **I scaled the foes** (not capped the castle): in a run that levels its own heroes (`run.local`),
`startStage` multiplies the foes' hp and attack by the castle's own hp and attack boost raised to `CASTLE_ANSWER.share` (`castle.ts`, 1.2).
The castle still counts: a run with a half-built castle meets foes about as strong as its heroes, and the castle's mana, stable, spells, Library
and gold are still worth having; the extra 0.2 pays for those (at 1.0 a full castle was still 50% on the Calamity). Capping the castle instead
(ignoring it in those modes) would have made the owner's "the castle still counts" (`tower-reset.md`) untrue. The tools take `--castle maxed` and
`--answer <share>`. The ascensions behave: each rule is applied on top of the same foes, so the table above is the ascension curve, 17%, 3%, 0%.

The unlocked hero pool (a bigger pool to hire from) is a small, bounded lasting benefit and I left it.

**The daily** (another worker is rebuilding it on `claude/daily-goal`; report only). It is not local: it fights at the lasting level, rank, gear
and talents, with no castle. Its foes rise by a straight line per stage and it is endless, so it cannot be trivial, but depth tracks power: the same
greedy bot (6 days each) reaches stage 4.8 at level 1, 30.7 at level 30, 45.7 at level 60 with talents and 85.8 at level 100 with talents
(one run hit the bot's 120-stage stop). So a level-100 player scores about 18 times a new one: the score shows depth, not challenge. If the owner
wants a daily that is the same test for everyone, the way is the spire's: make it `local` (levels from the run). That is the daily worker's call.

**Elites and bosses.** The elites and mid-bosses of an army are scaled by the tier like every foe, so they follow it. The spire's elites and
bosses are in the spire's foes above, scaled by the castle answer. The Calamity's bosses are fixed stats (`calamityBosses.ts`) with the same answer.

## The numbers

Mean tries to clear (the % in brackets is the share of 8 fresh saves that cleared within 25 tries; left out at 100%). One early (Orc Warband),
one middle (the Labyrinth) and one late army (Golem Forge). The other six are in `difficulty-tables.md`.

### With talents

**Normal**

| army | L1 | L15 | L30 | L45 | L60 | L80 | L100 |
|---|---|---|---|---|---|---|---|
| Orc Warband | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |
| The Labyrinth | 5.5 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |
| Golem Forge | 7.5 | 1.8 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |

**Hard**

| army | L1 | L15 | L30 | L45 | L60 | L80 | L100 |
|---|---|---|---|---|---|---|---|
| Orc Warband | 2.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |
| The Labyrinth | 25.0 (0%) | 19.3 (88%) | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |
| Golem Forge | 25.0 (0%) | 24.1 (12%) | 2.0 | 1.1 | 1.0 | 1.0 | 1.0 |

**Elite**

| army | L1 | L15 | L30 | L45 | L60 | L80 | L100 |
|---|---|---|---|---|---|---|---|
| Orc Warband | 7.6 | 3.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |
| The Labyrinth | 25.0 (0%) | 25.0 (0%) | 13.5 (88%) | 2.8 | 1.0 | 1.0 | 1.0 |
| Golem Forge | 25.0 (0%) | 25.0 (0%) | 23.6 (12%) | 5.0 | 1.1 | 1.1 | 1.0 |

**Legendary**

| army | L1 | L15 | L30 | L45 | L60 | L80 | L100 |
|---|---|---|---|---|---|---|---|
| Orc Warband | 24.9 (12%) | 10.1 (88%) | 1.3 | 1.0 | 1.0 | 1.0 | 1.0 |
| The Labyrinth | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 17.0 (62%) | 2.5 | 1.4 | 1.0 |
| Golem Forge | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 11.4 (88%) | 1.4 | 1.0 |

**Mythic**

| army | L1 | L15 | L30 | L45 | L60 | L80 | L100 |
|---|---|---|---|---|---|---|---|
| Orc Warband | 25.0 (0%) | 25.0 (0%) | 4.1 | 2.3 | 1.3 | 1.0 | 1.0 |
| The Labyrinth | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 6.4 | 1.5 |
| Golem Forge | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 23.0 (12%) | 3.8 |

### Without talents

**Normal**

| army | L1 | L15 | L30 | L45 | L60 | L80 | L100 |
|---|---|---|---|---|---|---|---|
| Orc Warband | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |
| The Labyrinth | 5.5 | 1.4 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |
| Golem Forge | 7.5 | 2.5 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |

**Hard**

| army | L1 | L15 | L30 | L45 | L60 | L80 | L100 |
|---|---|---|---|---|---|---|---|
| Orc Warband | 2.0 | 1.1 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |
| The Labyrinth | 25.0 (0%) | 21.9 (38%) | 8.0 (88%) | 3.0 | 1.6 | 1.0 | 1.0 |
| Golem Forge | 25.0 (0%) | 24.1 (12%) | 16.5 (50%) | 14.5 (62%) | 2.9 | 1.3 | 1.1 |

**Elite**

| army | L1 | L15 | L30 | L45 | L60 | L80 | L100 |
|---|---|---|---|---|---|---|---|
| Orc Warband | 7.6 | 4.4 | 1.1 | 1.0 | 1.0 | 1.0 | 1.0 |
| The Labyrinth | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 22.9 (38%) | 6.5 |
| Golem Forge | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 11.0 |

**Legendary**

| army | L1 | L15 | L30 | L45 | L60 | L80 | L100 |
|---|---|---|---|---|---|---|---|
| Orc Warband | 24.9 (12%) | 20.5 (62%) | 3.6 | 1.8 | 1.3 | 1.0 | 1.0 |
| The Labyrinth | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) |
| Golem Forge | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) |

**Mythic**

| army | L1 | L15 | L30 | L45 | L60 | L80 | L100 |
|---|---|---|---|---|---|---|---|
| Orc Warband | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 15.8 (62%) | 7.9 | 2.8 |
| The Labyrinth | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) |
| Golem Forge | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) | 25.0 (0%) |

**Before** (Hard 1.35 / 1.2, Elite 1.85 / 1.5, Legendary 2.8 / 2.0, no Mythic; with talents, the late armies Infernal Host / Yokai / Golem Forge):
Hard 1.0 to 1.3 at level 30 (and 1.0 from 45), Elite 1.0 from level 30 (1.3, 3.4, 1.3 at 30), Legendary 1.0 from level 60 and 22 at level 30.
Every tier from Elite up was a first-try clear from level 60 and Hard from 45. Now Elite is not until about 60, Legendary about 100, and Mythic never.
(`docs/notes/level-100.md` has the earlier table.)

## Tests

`test/difficulty.test.ts`: the tier table rises and Normal is unchanged; the escorts (never a second boss) and Mythic's boss form; **Normal at level 1
keeps its feel** (the first army in two tries or fewer, the Labyrinth two or more); **Hard is not a first-try clear at level 1**, nor Elite at level 15,
nor Legendary at level 45 (with talents); **Mythic is not a first-try clear at level 100 with every talent** on the last three armies and is won in
the end; and the foes of the tower and Calamity answer the castle (the ratio is the castle's boost to the power 1.2), an army's do not.
`test/armyStars.test.ts` changed because the rule did: eleven stars in five tiers, Mythic opens after Legendary's star, a pre-Mythic save stays valid,
the first-clear chests (a gold one for Mythic). Nothing was loosened.

## Pace

`npm run level-pace` measures what a run pays, and kill XP follows the foes' hp, so the tougher Hard, Elite and Legendary pay more per run: level 100
comes on day 164, not 181 (level 60 on day 85, not 87; level 30 on day 4, the same). The model's clear schedule is unchanged (Hard from day 12, Elite
from day 40, no Legendary clears in the first year); with the new tiers a player at level 65 can clear Legendary from about day 95, so the schedule
is conservative. I did not change the XP curve.

## For the owner to decide

1. **Mythic's entry is a wall** (12 to 20 tries at levels 85 to 92; 4 to 8 only from about 95), because it is set so a level-100 party still needs 3 or 4
   tries. If you would rather it opened gentler, lower `TIERS[4].hp` and `atk` (4.0 / 3.0 with one escort: 6 to 10 tries at 85, 1.2 to 1.8 at 100, i.e. nearly trivial at 100).
2. **Normal is trivial from level 15** on most armies (it was before). I kept it: its level-1 feel is the brief's, and the way up is Hard.
3. **The castle answer** (1.2) puts a full castle just below the no-castle difficulty in the spire and Calamity. Higher makes a half-built castle a
   handicap there; lower leaves a full castle easier.
4. **The daily** rewards level without bound (above): make it local if it should be an equal test.
5. **No chest for the Mythic star** (only its first-clear gold chest): a fourth milestone chest at 11 stars is a one-line change to `MILESTONES` if wanted.
