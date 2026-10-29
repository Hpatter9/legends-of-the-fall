# The armies' pace: the harder armies come later (ARMY-PACE)

The owner's ask: "Make it so getting to harder armies is harder. The final armies probably won't be clearable before the player clears all
15 stars on the first army." (An army holds **11** stars in the code: Normal, Hard and Elite three each, Legendary and Mythic one each,
`ARMY_STARS`; "all the stars" is taken as all 11, Mythic included.)

**The lever: strength, not a gate.** The last five armies' Normal `start` was raised (the Labyrinth a little, the Golem Forge nearly double),
their recommended levels with it, and their harder tiers lifted (`Army.tierLift`, new) so each tier stays above the one below. The unlocks
(`ARMY_NEED`, two stars an army; the Calamity at 16, the tower at 12, the castle at 10) did not move: the owner asked for the armies to be
harder to beat, and a star gate would only hide an army a player could already win. The first four armies, every Mythic tier and every
other mode are untouched.

## How it was measured (`node tools/army-pace/run.mjs`, new)

The player: the recruits' party (Knight, Paladin, Archer, Warlock, Cleric) at a level, **every talent row that level opens** (as `npm run
balance -- --deep --talents`; a real player has talents, and they are worth more than many levels), gear dressed, the castle a climb has at
that level (none to 30, 6 at 38, 13 at 40, 18 at 46, 22 at 52, then a level every two hero levels to the top), XP carried between tries.
Mean tries to clear (a fresh save each, at most 25 tries; 26 means never), 12 saves a cell. Days are the favourite hero's day for that
level (`npm run level-pace`). Measured on main 0.204.0 (the bosses start mid-arena since 0.201.0) and on this branch merged with it.

- `stars <levels>`: the first army's stars chased tier by tier at a level (a tier tried until all its stars are met, at most 25 tries).
- `normal <levels>`, `tiers <levels>` (with `ONLY`), `cell army:level`, `tune army:level` (bisects `start`, or with `TIER` the tier's lift).

### The first army's 11 stars (orcs; this branch does not change them)

| Level | Normal / Hard / Elite / Legendary / Mythic, mean tries to all the tier's stars | Saves with all 11 | Favourite's day |
| --- | --- | --- | --- |
| 45 | 1.0 / 1.1 / 1.4 / 4.6 / 17.0 | 4 of 8 | 39 |
| 55 | 1.0 / 1.0 / 1.3 / 2.1 / 17.4 | 5 of 8 | 61 |
| 65 | 1.0 / 1.0 / 1.1 / 1.3 / 6.0 | 8 of 8 | 81 |
| 75 | 1.0 / 1.0 / 1.1 / 1.3 / 2.4 | 8 of 8 | 97 |

So a typical player has every star of the first army somewhere between level 55 (a lucky or stubborn one) and 65 to 72 (about three tries
of Mythic), day 61 to about 92. Mythic is the wall: Normal to Legendary are done by level 45.

### Before and after

| Army | Rec. level before / after | Normal first clear (about 2.8 tries): level, day, before | after | Tries at the new rec. level | Tries at level 55 (before / after) |
| --- | --- | --- | --- | --- | --- |
| Orc Warband | 1 / 1 | 1, day 0 | same | 1.0 at 35+ (untouched) | 1.0 / 1.0 |
| Undead Legion | 8 / 8 | under 20, day 1 | same | untouched | 1.0 / 1.0 |
| Beast Packs | 15 / 15 | under 20, day 1 | same | untouched | 1.0 / 1.0 |
| The Wildwood | 22 / 22 | about 22, day 1 | same | untouched | 1.0 / 1.0 |
| The Labyrinth | 30 / **35** | about 26, day 3 | **35, day 15** | 2.8 | 1.0 / 1.0 |
| Ogre Clans | 38 / **45** | about 29, day 4 | **45, day 39** | 3.0 | 1.0 / 1.1 |
| Infernal Host | 40 / **58** | about 29, day 4 | **57, day 65** | 2.3 (5.3 at 55) | 1.0 / 5.3 |
| Yokai Night Parade | 46 / **65** | about 31, day 6 | **64, day 79** | 2.2 (17.8 at 58, half never) | 1.0 / 18.8 (half never) |
| Golem Forge | 52 / **74** | about 38, day 22 | **74, day 95** | 2.7 (8.7 at 65) | 1.0 / 26 (1 in 12 cleared) |

(Before: Labyrinth 15.5 tries at level 20 and 1.3 at 30; Ogres 25.3 / 2.0; Infernal 24.8 / 1.9; Yokai 26 / 3.3, 2.0 at 35; Golems 12.8 at 30,
5.1 at 35, 2.1 at 40. The old recommended levels were measured without talents, `docs/notes/army-curve.md`, which is why a talented party
was ahead of them.)

**Against the owner's target:** at level 55, where five saves in eight have every star of the first army, the Golem Forge is a wall (1 save in
12 cleared it in 25 tries) and the Yokai Night Parade is cleared by half the saves after about 19 tries; the Infernal Host takes about 5. At
level 65, where every save has all 11 stars (about 6 tries of Mythic), the Golem Forge still takes 8.7 tries; it is a first-try-ish clear only
around level 74, when the first army's Mythic is down to two or three tries. So the Golem Forge and the Yokai come after the first army's
stars, and the Infernal Host just before them ("probably"), as asked. The middle armies ramp: Labyrinth 35, Ogres 45.

### The harder tiers of the late armies (`tierLift`)

A late army's Normal is now tougher than its old Hard was, so its harder tiers were lifted (hp and attack) to stay above it: each tier's last
wave stronger than the one below (the test `armyStars.test.ts` holds every army to it), and each tier a few levels after the one below. Mythic's
lift is 1 on every army, so the Mythic calibration at level 100 (`docs/notes/difficulty.md`) is as it was.

| Army | `tierLift` (Hard, Elite, Legendary) | Rough first-clear level (Normal / Hard / Elite / Legendary / Mythic), this player, 6 saves |
| --- | --- | --- |
| Ogre Clans | 1.45, 1.1, 1 | 45 / 51 / 62 / 70 / as before |
| Infernal Host | 1.55, 1.16, 1 | 57 / 60 / 76 / 84 / as before |
| Yokai Night Parade | 2.12, 1.6, 1.25 | 64 / 70 / 78 / 86 / as before (11 tries at 86) |
| Golem Forge | 1.8, 1.34, 1.2 | 74 / 80 / 92 / about 92 (measured at a lift of 1.12; 1.2 keeps it above Elite) / as before |

The late armies' ladders are tighter than the early ones' (the Golem Forge runs from 74 to 100), which is what "the harder armies come later" means
once the top is fixed. If the owner would rather the late Hard and Elite tiers stayed where they were, the only way is for Normal to stop short
of them (the Golem Forge's Normal at about level 60 rather than 74).

### XP stays as it was (`xpStart`, `armyXpShare`)

A fight's XP follows the damage the heroes deal, so tougher foes paid more XP a run: with the new numbers alone the favourite's level 100 came on
day 119 instead of 158 (a level-100 party with talents; `npm run level-pace`), which would also bring the first army's Mythic sooner. So a run of
a changed army pays its old XP: the fight's XP times `xpStart / start` on Normal (`xpStart` is the old `start`) and `1 / tierLift` on a lifted tier
(`armyXpShare`, applied where the page pays a fight's XP in `main.ts`). The level pace after: level 40 on day 27, 50 on 52, 60 on 71, 70 on 88,
80 on 111, 100 on 155 (main: 26, 51, 72, 95, 116, 158). Crowns are unchanged (`pay`).

### The awakening ores and the Calamity (no conflict)

`npm run unlock-pace -- --awaken --seeds 30 --days 540`, with the model's Normal clear days moved to the new levels (`NORMAL_DAY` 26, 34, 43, 53
for the last four is now 38, 68, 83, 103; the Golem Forge's Hard 112 is 118, in `tools/unlockPace.ts` and `tools/levelPace.ts`): the first
Awakening I on day 40 (was 43), the first Awakening II on day 91 (84), every hero at Awakening I on day 252 and fully awakened on day 350 (the
same), the armies' ores 492 over 540 days (487). The Calamity is still about six times the armies, so the late armies coming later hardly moves
the ores. The Calamity still opens at 16 stars, which a player now earns mostly on the first army's tiers and the early armies; nothing about it
changed. Every pullable hero is owned by day 184 (181).

## Tests

- New `test/army-pace.test.ts`: a tier lift multiplies that tier's hp and attack and never Normal's, Mythic and the first five armies are not
  lifted; the first four armies keep their strength and levels; the levels climb at least five an army from the Labyrinth on; a party at level 45
  (every talent, the castle a climb has) does not clear the Infernal Host, the Yokai or the Golem Forge in 3 tries; a level-80 party does clear the
  Golem Forge; a changed army pays its old XP.
- Changed to the owner's new requirement: `test/armies.test.ts` "the steeper curve" pins the recommended levels `[1, 8, 15, 22, 35, 45, 58, 65, 74]`
  (was `[1, 8, 15, 22, 30, 38, 40, 46, 52]`). Nothing else needed changing.

## Files

`src/sim/armies.ts` (five `start`, `level`, `tierLift` and `xpStart` values; `waveBoost` reads the lift; `armyXpShare`), `src/main.ts` (one
multiplier on a fight's XP), `tools/army-pace/` (`pace.ts`, `run.mjs`, `shots.mjs`), `tools/levelPace.ts` (the schedule; the measuring party has its
talents, and the XP share), `tools/unlockPace.ts` (the schedule), `test/army-pace.test.ts`, `test/armies.test.ts`, this note, the pictures
`docs/samples/army-pace-{golems,yokai}-{393x852,360x780,412x915}.png` (the armies screen: "Recommended: Lv 74", no sideways scroll).
