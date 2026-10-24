# A steeper Normal curve, and shards spent on joining

## 1. The armies' recommended levels (the owner's ask: "up the levels required to beat the normal armies, a steeper curve")

`Army.level` (shown as "Recommended: Lv N" on the armies screen and "Lv N" on the war table) is now **1, 8, 15, 22, 30, 38, 46, 54, 62**
(it was 1, 5, 8, 12, 16, 20, 24, 28, 32). The first army is as easy as before (`start` back at 0.5).

**How it was tuned** (`node tools/curve/run.mjs`, new): the recruits' party (Knight, Paladin, Archer, Warlock, Cleric) at the army's level, the castle a
climb has by then (none until the sixth army; then 6, 13, 18 and 22 levels over the five buildings), gear dressed, XP carried between tries (so a
party that falls gets stronger), at most 25 tries. `start` was bisected (32 saves a step) until the recommended level took about 2.5 to 3 tries.

**The one extra knob: `growth`.** Raising only `start` was not enough. Foes that grow 12 to 17% a wave let a failing level-1 party clear the early
waves, bank their XP and come back stronger: the first attempt left Undead falling to level 1 in 11 tries and Beasts in 13. So from the second
army Normal's `growth` is **0.05** (the curve is nearly flat across the waves, with `start` higher to make up) and a party that is far too weak
falls in the first waves and earns almost nothing. The harder tiers keep their own curve through the new `Army.tierGrowth` (the old `growth`), as
they keep `tierStart`, so their bands do not move. (The simulation reads `tierGrowth ?? growth` for tiers above Normal; `waveBoost`.)

| army (rec. level) | start (was) | growth (was) |
| --- | --- | --- |
| Orc Warband (1) | 0.5 (0.5) | 0.176 (0.176) |
| Undead Legion (8) | 1.46 (0.72) | 0.05 (0.17) |
| Beast Packs (15) | 1.65 (0.8) | 0.05 (0.15) |
| The Wildwood (22) | 1.82 (1.05) | 0.05 (0.136) |
| The Labyrinth (30) | 2.23 (1.15) | 0.05 (0.128) |
| Ogre Clans (38) | 2.76 (1.57) | 0.05 (0.124) |
| Infernal Host (46) | 3.33 (1.78) | 0.05 (0.13) |
| Yokai Night Parade (54) | 3.4 (1.8) | 0.05 (0.127) |
| Golem Forge (62) | 4.11 (2.2) | 0.05 (0.124) |

### Mean tries to clear Normal (24 saves a cell; 26 means no save cleared it in 25 tries; party as above)

| Army (rec. level) | Lv 1 | 10 | 20 | 30 | 45 | 60 | 80 | 100 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Orc Warband (1) | 2.1 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |
| Undead Legion (8) | 26 | 1.7 | 1.1 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |
| Beast Packs (15) | 26 | 7.4 | 2.0 | 1.1 | 1.0 | 1.0 | 1.0 | 1.0 |
| The Wildwood (22) | 26 | 14.0 | 4.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |
| The Labyrinth (30) | 26 | 26 | 18.8 | 2.2 | 1.2 | 1.0 | 1.0 | 1.0 |
| Ogre Clans (38) | 26 | 26 | 20.5 | 3.8 | 2.4 | 1.5 | 1.1 | 1.0 |
| Infernal Host (46) | 26 | 26 | 26 | 8.0 | 2.9 | 1.6 | 1.0 | 1.0 |
| Yokai Night Parade (54) | 26 | 26 | 25.0 | 13.5 | 5.6 | 2.0 | 1.3 | 1.2 |
| Golem Forge (62) | 26 | 26 | 26 | 21.5 | 8.7 | 2.9 | 1.5 | 1.2 |

At the recommended level (32 saves): 2.1, 2.9, 2.5, 2.8, 2.6, 2.6, 2.9, 3.1, 2.8 tries (2 to 3.5). Below it, about 70% of the level: 8 to 20 tries;
about half: a wall (Undead at level 4 takes 17, Beasts at 4 never; Labyrinth at 19 takes 21; Golems at 40 take 12, at 33 21). **Level 1 clears the
first army only**, with XP carried (every other army: no save in 25 tries), pinned by a test (`test/armies.test.ts`).

### Hard to Mythic keep their calibration, with one change

Same party and castle, Hard (16 saves): Orc Warband 1.0 at level 30; Undead 1.4 (30) / 1.1 (45); Beasts 3.1 / 1.8; Wildwood 23.6 / 15.3; Labyrinth 25 / 25;
Ogres 16.9 / 11.0; Infernal 21.1 / 10.0; Yokai 16.1 / 9.8; Golems 14.9 / 6.7 (level 30 / 45, tierStart 1.7); at 60: Undead 1.1, Beasts 1.3, Wildwood 4.5, Labyrinth 14.3, Ogres 3.8, Infernal 3.4, Yokai 3.8, Golems 2.2.
Against Normal's table above, Hard is above Normal at the same level on every army **except the Golem Forge**, where the new Normal (start 4.11) was
harder than Hard (tierStart 1.7): Hard took 6.7 tries at level 45 against Normal's 8.7. I raised only the Golem Forge's `tierStart` from 1.7 to 1.8
(Hard at 45: 11.8, at 60: 3.7, at 80: 1.5 against Normal 8.7, 2.9, 1.5). Side effects measured with `--deep` (12 saves): Mythic at level 100 with talents is
unchanged (Yokai 3.1, Golems 3.8: the band of 3 to 4 holds); Elite Golem Forge at level 85 went from 12.4 tries (83% cleared) to 17.3 (58%).

**For the owner to decide: the tiers overlap the late Normal armies.** The late armies' Normal levels (46 to 62) now sit on top of the Hard band
(25 to 45) and Elite's entry (45), and Normal's late waves are about as strong as Hard's (Normal's last wave on the Golem Forge: 7.0 hp and attack
against Hard's 8.6 hp and 7.1 attack; Normal's first waves are above Hard's on every army from the second, since Normal is flat). Hard remains the
harder tier in tries, but it is no longer "the next step up" in level for the last three armies. Options:
1. Leave it (what is here): tiers keep their calibrated bands, the late Normal armies are a long climb (level 62 is about day 300 for a favourite hero,
   `npm run level-pace`: level 30 day 21, 40 day 124, 50 day 212, 60 day 300).
2. Rebase the tiers on Normal (tier foes = Normal x the tier's multipliers, as the first design had it) and shift the bands up: Hard for levels 45 to 65,
   Elite 65 to 85, and so on. This changes every tier's tuning, and Mythic becomes a wall without more levels than 100 gives (talents at 100 take 3.8 tries
   now, but 40% harder late foes would not clear). It needs the owner's call on the level cap too.
3. Ease the late Normal armies (rec. 46 to 62 become about 40, 46, 52), keeping the tiers as they are.

## Star unlocks against the slower climb

Mean Normal stars (of 3) of a first clear at the recommended level (`node tools/curve/run.mjs stars`, 16 saves): Orcs 1.9, Undead 1.9, Beasts 2.1, Wildwood 2.1,
Labyrinth 1.7, Ogres 1.5, Infernal 2.4, Yokai 2.0, Golems 1.3 (ten levels above: much the same: the stars are about how the fight goes, not the level).
An army needs 2 stars an army before it (`ARMY_NEED`), so with about 2 stars a clear the next army opens as the last one falls, and a party arrives
one army's step (about 7 levels) under the army's recommended level. Cumulatively a player holds about 9.7 stars after five armies and 11.2 after six
(the Infernal Host opens at 12, the Yokai at 14, the Golems at 16): the Ogres, Labyrinth and Golem clears give under 2 stars, so a replay or a Hard star
fills the gap, which it did before.

| Unlock | Stars | Armies cleared at Normal (about) | Expected party level | Favourite hero's day (`level-pace`) |
| --- | --- | --- | --- | --- |
| Castle | 10 | 5 (the Labyrinth) | 30 | 21 |
| Tower | 15 | 7 to 8 (Infernal/Yokai) | 46 to 54 | 170 to 250 |
| Calamity | 21 | 9 Normal armies give 18 on average, so Hard stars are needed too | 54 to 62 and Hard | 250 and on |
| Army n (2 x n stars) | 2, 4 ... 16 | n - 1 | rec. level of the army before it (1, 8, 15 ... 54) | |

The stars still fit the climb for the armies themselves (each opens when the one before is cleared, a step under its level) and for the castle. The
**Tower (15) and the Calamity (21) now open about two to four armies later in level terms than before (levels 24 to 28, then 32, were the old points)**: if the
owner wants them reachable sooner, the knob is `MODE_NEED` in `modeUnlock.ts` (for example 12 and 16). I did not change it.

## 2. Shards are spent when a hero joins

Reproduced first, in the browser (Playwright, a save with the Cleric five shards in and a second bar begun) and in the simulation (many seeds, 600 pulls):
a hero that joins by shards has its `Meta.unlock` entry deleted in `giveShards`, gets no rank shard, the pull card says "NEW", the collection grid, the
hero sheet ("0 / 1 shards to rank 1"), `rankUpView`, `shardsToSpend` and the codex all read zero, and a gift bigger than the bar loses the rest rather than
carrying it. So I could not make the 7 of 7 linger through pulls. What I did, so it cannot show anywhere:
- `haveOf` (the one read of the bar) returns 0 for a hero already owned, whatever a stale entry says.
- `grantContent` (a milestone hero joining) now clears an unlock entry too (the others always did).
- Old saves: `loadMeta` already drops an unlock count for a hero owned (`readUnlock`), a test pins it.
- Tests (`test/hero-shards.test.ts`): after every join over four seeds the entry is gone, `haveOf` is 0 and no rank shards were granted; an oversize gift does not carry over;
  a stale count on an owned hero is dropped on load and never shown.

If the owner still sees a hero show 7 shards after joining, the next thing I would ask is for the save (it may hold a 7 as **rank** shards from an older
build, which is not stale: those are a hero's own rank shards).

## Tools and shots

`tools/curve/run.mjs` (`table`, `cell`, `stars`, `tune`; `SAVES`, `ONLY`, `TIER`, `START`, `GROWTH`, `TIERSTART`), `tools/curve/shots.mjs`; pictures
`docs/samples/army-curve-{warTable,armies}-{393x852,360x780,412x915}.png`. No layout changed: only the numbers in the "Recommended" line and the war table's
banner.
