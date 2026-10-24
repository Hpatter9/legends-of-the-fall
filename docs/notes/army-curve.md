# A steeper Normal curve, and shards spent on joining

## 1. The armies' recommended levels (the owner's ask: "up the levels required to beat the normal armies, a steeper curve")

`Army.level` (shown as "Recommended: Lv N" on the armies screen and "Lv N" on the war table) is now **1, 8, 15, 22, 30, 38, 40, 46, 52**
(it was 1, 5, 8, 12, 16, 20, 24, 28, 32). The owner first asked for about 1, 8, 15 ... 62; he then eased the last three (Infernal 46 to 40, Yokai 54 to 46, Golems 62 to 52). The first army is as easy as before (`start` back at 0.5).

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
| Undead Legion (8) | 1.47 (0.72) | 0.05 (0.17) |
| Beast Packs (15) | 1.59 (0.8) | 0.05 (0.15) |
| The Wildwood (22) | 1.76 (1.05) | 0.05 (0.136) |
| The Labyrinth (30) | 2.37 (1.15) | 0.05 (0.128) |
| Ogre Clans (38) | 2.76 (1.57) | 0.05 (0.124) |
| Infernal Host (40) | 3.01 (1.78) | 0.05 (0.13) |
| Yokai Night Parade (46) | 3.22 (1.8) | 0.05 (0.127) |
| Golem Forge (52) | 3.79 (2.2) | 0.05 (0.124) |

### Mean tries to clear Normal (24 saves a cell; 26 means no save cleared it in 25 tries; party as above)

| Army (rec. level) | Lv 1 | 10 | 20 | 30 | 45 | 60 | 80 | 100 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Orc Warband (1) | 2.2 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |
| Undead Legion (8) | 26 | 1.4 | 1.1 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |
| Beast Packs (15) | 26 | 6.6 | 1.7 | 1.1 | 1.0 | 1.0 | 1.0 | 1.0 |
| The Wildwood (22) | 26 | 11.5 | 3.3 | 1.2 | 1.1 | 1.0 | 1.0 | 1.0 |
| The Labyrinth (30) | 26 | 26 | 23.2 | 2.8 | 1.8 | 1.3 | 1.1 | 1.0 |
| Ogre Clans (38) | 26 | 26 | 24.5 | 3.9 | 2.7 | 1.8 | 1.2 | 1.1 |
| Infernal Host (40) | 26 | 26 | 25.4 | 6.0 | 2.4 | 1.4 | 1.0 | 1.0 |
| Yokai Night Parade (46) | 26 | 26 | 26 | 5.0 | 2.8 | 2.0 | 1.2 | 1.0 |
| Golem Forge (52) | 26 | 26 | 26 | 9.4 | 4.2 | 2.3 | 1.5 | 1.2 |

At the recommended level (32 saves): 2.2, 2.7, 2.8, 2.7, 2.8, 2.7, 2.9, 2.7, 2.8 tries (2 to 3.5). Below it, about 70% of the level: 8 to 20 tries;
about half: a wall (Undead at level 4 takes 17, Beasts at 4 never; Labyrinth at 19 takes 21; Golems at 40 take 12, at 33 21). **Level 1 clears the
first army only**, with XP carried (every other army: no save in 25 tries), pinned by a test (`test/armies.test.ts`).

### On the merged code (0.148.0: 8x11 boards, layouts, `USUAL_WALK`, hp nudges)

The bigger boards moved the climb a little (Infernal harder, Yokai easier, Beasts at level 20 under the old test's 30% one-try floor), so `start` was
bisected again on the merged code (the table above is the merged one). Hard (16 saves, same party and castle) at level 30 / 45 / 60: Undead 1.8 / 1.4 / 1.2, Beasts 5.6 / 2.8 / 1.5,
Wildwood 21.1 / 13.9 / 4.3, Labyrinth 25.6 / 24.8 / 9.9, Ogres 19.9 / 13.0 / 2.9, Infernal 23.9 / 19.9 / 5.3, Yokai 13.8 / 6.3 / 3.1, Golems 24.1 / 18.5 / 6.9: above Normal everywhere.
The Hard figures in the next section are from before the merge.

### Hard to Mythic keep their calibration

With the last three armies eased (rec. 40, 46, 52) the Golem Forge's `tierStart` is **back at 1.7** (the 1.8 of the first pass is no longer needed).
Hard (16 saves, same party and castle) at level 30 / 45 / 60 against Normal at the same levels: Undead 1.8 / 1.4 / 1.2; Beasts 5.6 / 2.8 / 1.5;
Wildwood 21.1 / 13.9 / 4.3; Labyrinth 25.6 / 24.8 / 9.9 (Normal 2.8 / 1.8 / 1.3); Ogres 19.9 / 13.0 / 2.9 (3.9 / 2.7 / 1.8); Infernal 23.9 / 19.9 / 5.3 (6.0 / 2.4 / 1.4);
Yokai 13.8 / 6.3 / 3.1 (5.0 / 2.8 / 2.0); Golems 19.4 / 11.6 / 2.6 (9.4 / 4.2 / 2.3). Hard is above Normal on every army at every level shown (Golems at 60 is the
closest, 2.6 against 2.3). The Elite, Legendary and Mythic bands are exactly as they were: no tier constant moved, and Mythic at level 100 with talents is
unchanged from the first pass (Yokai 3.1, Golems 3.8, measured at tierStart 1.7 in `docs/notes/difficulty.md`).

The overlap the first pass reported (Normal for levels 46 to 62 sitting on the Hard band) is gone with the owner's choice of the eased levels: Normal now ends at level 52,
and Hard's band (25 to 45) overlaps only the last two or three armies' Normal levels by a few levels.

## Star unlocks (the owner's answer: Tower at 12 stars, Calamity at 16, Castle stays 10)

`MODE_NEED` in `modeUnlock.ts` is now `{ castle: 10, tower: 12, calamity: 16 }`. The camp's labels ("Opens at 12 stars", "n/12 stars"), the war table and the
castle plate read the constants, so they follow; tests (`test/modes.test.ts`) and `docs/notes/menus-unlocks.md` are updated. Old saves keep what they had (`opened`).

Mean Normal stars (of 3) of a first clear at the recommended level (`node tools/curve/run.mjs stars`, 16 saves): Orcs 1.75, Undead 2.06, Beasts 2.0, Wildwood 2.0,
Labyrinth 1.38, Ogres 1.75, Infernal 2.25, Yokai 2.13, Golems 1.25 (ten levels above, much the same: the stars are about how the fight goes, not the level). Cumulative:
1.8, 3.8, 5.8, 7.8, 9.2, 10.9, 13.2, 15.3, 16.6. An army needs 2 stars an army before it (`ARMY_NEED`), so with about 2 stars a clear the next army opens as
the last one falls (a party arrives one army's step under its recommended level); the Labyrinth and Golem clears give under 2 stars, so a replay or a Hard star fills the gap.

| Unlock | Stars | Armies cleared on Normal (about) | Expected party level | Favourite hero's day (`level-pace`) |
| --- | --- | --- | --- | --- |
| Castle | 10 | 5 to 6 (the Labyrinth or the Ogres) | 30 to 38 | 4 to 20 |
| Tower | 12 | 6 to 7 (the Ogres, then the Infernal Host) | 38 to 40 | 20 to 27 |
| Calamity | 16 | 8 to 9 on Normal alone, sooner with Hard stars | 46 to 52 (a little under with Hard stars) | 40 to 55 |
| Army n (2 x n stars) | 2, 4 ... 16 | n - 1 | the recommended level of the army before it (1, 8, 15 ... 46) | |

(`npm run level-pace`, on the merged code, 0.150.0: the favourite reaches level 30 on day 4, 40 on day 27, 50 on day 52 and 60 on day 72; a hero kept on the bench is
much slower: 30 on day 21, 40 on day 127, 60 on day 300. **An earlier version of this note quoted the bench figures as the favourite's: they were wrong.** The party's levels in a
real climb sit between the two, so the days above are the favourite's and a player who spreads XP is later.)

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
