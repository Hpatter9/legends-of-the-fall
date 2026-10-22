# Armies

> Since `sell-waves.md` every army has 15 waves (mid-boss at 8, or 5 and 10 in the Wildwood, final boss at 15); the wave counts and tables below are from before.

The stages are now **armies**, King God Castle style. The Battle tab's big button opens the Armies screen; an army is a
campaign of 8 to 10 waves with a mid-boss around halfway and a final boss; beating the final boss opens the next army.
The run inside a campaign is the run as it was (summons and merges, events, relics and gear, stars, XP): the army only
decides which foes each stage meets.

## The nine armies (`src/sim/armies.ts`, the last two are described at the end)

| # | Army | Waves | Bosses (wave) | Land | Identity |
| --- | --- | --- | --- | --- | --- |
| 1 | Orc Warband | 8 | Orc Chieftain (4), **Orc Warlord** (8) | Highlands | the Chieftain's war banner, the Warlord's slam |
| 2 | Undead Legion | 8 | Bone Captain (4), **Lich King** (8) | Dungeon | skeleton marksmen rain volleys; the Lich King raises skeletons and freezes the heroes |
| 3 | Beast Packs | 8 | Alpha Werewolf (4), **Boar King** (8) | Snowfields | black, red and white werewolves: fast flankers that bite the weakest hero (Ravage) |
| 4 | The Wildwood | 9 | Thorn Warden (3), Wood Raider (6), **Grove Spearlord** (9) | Greenwood | satyrs pipe the pack faster (Pipes of Pan); the three forest bosses |
| 5 | The Labyrinth | 9 | Gorgon Queen (5), **Minotaur Champion** (9) | Dungeon | minotaurs gore-charge, gorgons stiffen the strongest hero |
| 6 | Ogre Clans | 10 | Shaman King (5), **Horned Ogre** (10) | Highlands | ogres and brutes shove heroes back |
| 7 | Infernal Host | 10 | Devil Leader (5), **Demon Lord** (10) | Ashlands | imps strike in flurries and set heroes alight; demons hurl hellfire |

The order follows the art quality, as the owner asked. Army skills are borrowed from the heroes' kits (`KITS` in
`abilities.ts`; the army kinds are the same sheets as the common foes under new ids in `foes.ts`: `boneVolley`, `pack*`,
`groveSatyr*`, `mazeMino*`, `mazeGorgon*`, `clanOgre`, `clanBrute`, `hellImp`, `hellDemon`). New mid-bosses (`orcChieftain`,
`boneCaptain`, `alphaWolf`, `gorgonQueen`) and the Labyrinth's `minotaurChampion` reuse existing sheets, bigger. The Wildwood's forest
bosses were renamed (Thorn Warden, Wood Raider, Grove Spearlord) so a locked card can say who opens it.

### The Lich King

Generated with PixelLab (see `hero-art.md`): boss size, a crown, dark robes, a bone staff with cold blue soul fire. He shoots
curses (range 3), has the title "The Frozen Crown" (`bossTitles.ts`, so the boss intro works), and two skills (`abilities.ts`):

- **Raise Dead** (the skill): two skeletons climb out of the ground beside him once fewer than two stand, at the foes' strength of
  the wave; at most six in a fight (`Unit.raised`), so a fight always ends.
- **Soul Nova** (his ultimate, charging at 45% of the skill's rate like a Mythic's): every hero within four tiles is hurt and
  frozen for 1.8 s. **Soul Drain**: his blows heal him for a sixth of what they deal.

## Rules

- **The run** (`run.ts`): `armyRun(seed, armyId, party, castle)` is a normal run with `mode = { kind: 'army', army }`; its
  `stage` is the wave. `startStage` takes the foes from the army's wave (`waveBoost`), the land from the army; `finish` on the
  last boss's win sets `run.cleared` and `run.over` (no next wave, no event). Daily and tower runs (and an older run saved
  mid-way, which has no mode) keep the endless climb's bands and boosts (`bandFor`, `stageBoost`, `areaFor`).
- **Foe strength**: wave n's foes are `start x (1 + growth x (n - 1))` of their stats in `foes.ts` (hp and attack), per army
  (`start` 0.5, 0.7, 0.85, 0.9, 1.0, 1.1, 1.25; growth 0.2, 0.2, 0.18, 0.17, 0.17, 0.16, 0.16). A boss has its own
  hp and attack at wave 1's strength (`mid` and `last` of the army), whatever its stats in `foes.ts`, so each army's walls are set
  in one place. Later waves have more foes (3 up to 6). A battle takes the foes as a list of ids (`startBattle`).
- **Losing**: the fight is lost, the run is over, the page goes back to the main screen and the army starts again from wave 1
  the next time (a new run: starting gold, two heroes). No checkpoints. The meta keeps the heroes' XP and levels (and the
  furthest wave as a record). A run still in progress (the app closed mid-army) can be continued from its card.
- **Unlocking**: an army is open when it is the first or the one before it has been beaten (`armyUnlocked`). When a last boss falls
  for the first time the page plays "A new army marches" (a ribbon slams down over the next army's boss portrait, name and
  blurb; `showUnlock` in `armiesView.ts`), and the next visit to the Armies screen shows that card with a glow and a NEW tag
  (`armyIsNew`, `markSeen`; the Battle tab's badge lights too).
- **Rewards** (crowns; the gold of a run is for its summons as before):
  - a first win of wave n pays `(10 + 2n) x pay`, a boss wave half as much again; the army's `pay` is 1, 1.5, 2.1, 2.8, 3.6,
    4.6, 5.8;
  - the first clear adds a bonus (`clear`: 120, 200, 300, 430, 600, 820, 1100);
  - **a replay pays 15% of that** (`REPLAY_SHARE`, at least 1 crown a wave): a wave already won pays the share, and the clear
    bonus after the first is the share too. Stars pay only what they add to the wave's best.
  - The card shows both: first clear 294 / 462 / 665 / 1026 / 1334 / 1901 / 2463 crowns, and replay 44 / 70 / 100 / 155 / 201 / 285 / 370 per full
    run (`firstClearTotal`, `replayTotal`). A lost fight pays nothing more (the waves won paid as they went).
- **The Armies screen** (`armiesView.ts`, in the home screen's sub page): a card an army with its boss's portrait, waves, best wave
  and stars, the two rewards; a locked card is dark with "Defeat the <boss> to unlock". Starting an army opens the party picker as
  before. If a run is going, "Fight" on another army asks a second tap first ("Leave ...?"), and the army being fought shows
  "Continue" and "Restart from wave 1" (asks too). The top bar shows armies beaten and stars. The endless tower opens when the
  Orc Warband is beaten (or an old save passed stage 10); the daily challenge is as it was.
- **Meta** (`Meta.armies`, `Meta.armySeen`): per army the furthest wave reached, the furthest won, the clears and the best stars
  per wave. `Meta.bestStage`, `Meta.stars`, `Meta.tower` and the daily records are untouched; the boss achievement counts every boss
  of the armies (`BOSS_IDS`).

## Saves

An old save's furthest stage is mapped onto the armies five stages to an army (`migrateArmies`): stage 6 or more means the Orc
Warband is beaten (its boss was stage 5), 11 or more the Undead Legion, and so on to stage 36 for all seven. The armies it
has opened are marked seen (nothing glows for a save that has played). Heroes, crowns, XP, shards, stars, castle, spellbook and
achievements are not touched. A run saved before the armies has no mode and plays on as the endless climb.

## Balance (`npm run balance -- --armies-only`, raw output in `docs/samples/armies-balance.txt`)

The greedy player of the whole-run table, on an army from wave 1: summons while it can, takes the first event option, fields
the five strongest heroes with the fighters in front and the shooters behind (`tools/autoplay.ts`, shared with the tests), no
castle, no recruits, no spells. Table 5a gives the chance of winning each wave with the party's heroes all at one level
(20 attempts a cell); table 5b a fresh save fighting the armies in order, trying each until it falls, levels carried over.
`--only orcs,undead --levels 1,5,10 --party starters --set orcs.last.hp=3500` tunes (the `--set` overrides are for one run).

The target: a fresh party wins wave 1 of the Orc Warband always; its Warlord is a wall for a couple of tries (a level-1 team
never beats him; level 8 almost always does); each later army needs the levels the one before earned and a little more, and
the last is out of reach of the starting five alone, which is what rarer heroes, ranks, grades and the castle are for.

Chance (%) of beating the whole army, every hero of the starting five at the level shown (20 attempts a cell):

| Level | Orc | Undead | Beasts | Wildwood | Labyrinth | Ogres | Infernal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 5 | 40 | 0 | 0 | 0 | 0 | 0 | 0 |
| 8 | 100 | 10 | 0 | 10 | 5 | 0 | 0 |
| 11 | 100 | 80 | 30 | 35 | 30 | 10 | 0 |
| 14 | 100 | 100 | 65 | 50 | 40 | 20 | 5 |
| 17 | 100 | 100 | 70 | 55 | 50 | 50 | 0 |
| 20 | 100 | 100 | 80 | 60 | 55 | 60 | 5 |

The same with a party of recruits (Knight, Paladin, Archer, Warlock, Cleric; rarer kinds with skills):

| Level | Orc | Undead | Beasts | Wildwood | Labyrinth | Ogres | Infernal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 45 | 0 | 0 | 0 | 0 | 0 | 0 |
| 5 | 100 | 30 | 0 | 10 | 15 | 5 | 0 |
| 8 | 100 | 90 | 55 | 55 | 40 | 70 | 15 |
| 11 | 100 | 100 | 90 | 70 | 70 | 85 | 65 |
| 14 | 100 | 100 | 100 | 80 | 80 | 95 | 65 |
| 17 | 100 | 100 | 100 | 80 | 85 | 100 | 85 |
| 20 | 100 | 100 | 100 | 90 | 90 | 100 | 90 |

Per wave (starters, level 8): the Orc Warband 100% to wave 7, then the Warlord 100%; at level 5 the Warlord is 40%; level 1 loses
at the Warlord or earlier (wave 4's Chieftain 85%). Field waves are rarely the wall; the bosses are (each army's table in the raw output).

The climb (table 5b: 60 fresh saves, the starting five only, no castle or recruits, 25 tries an army at most):

| Army | Cleared | Tries (mean) | Level on first try | Crowns for the first clear |
| --- | --- | --- | --- | --- |
| Orc Warband | 100% | 3.5 | 1.0 | 344 |
| Undead Legion | 100% | 3.0 | 6.7 | 523 |
| Beast Packs | 100% | 3.1 | 10.1 | 752 |
| The Wildwood | 100% | 2.0 | 12.8 | 1095 |
| The Labyrinth | 100% | 2.4 | 15.0 | 1451 |
| Ogre Clans | 100% | 2.4 | 16.5 | 2051 |
| Infernal Host | 88% | 10.4 | 17.9 | 3805 |

The tries go down after the first armies because each failed try earns XP (kills pay a tenth of the foe's hp, so later armies pay
much more), and the levels are carried. The mid-boss and final boss numbers (`mid`, `last` in `armies.ts`) were found by sweeps
like the walls in `balance.md` (for example the Lich King went 5,200 / 110, which nothing beat, to 3,800 / 90, then 2,600 / 70).

## Tests (`test/armies.test.ts`, others changed)

The old stage tests that assumed the endless climb's nine bosses (`bosses`, `achievements`, `modes`, `rarity`) were changed to the new
design (`BOSS_IDS` includes the armies' bosses; the tower opens on the first army; only the heroes have exactly the Mythics'
ultimates). `progression.test.ts` is unchanged: the endless climb (daily, tower) keeps its stage 5 wall. The new file tests: the
seven armies in order with real foes and the right bosses; unlock order; a loss restarts from wave 1 and loses nothing earned;
rewards (a replay is a share, harder armies pay more, stars pay only improvements); the glow; save migration (nothing lost, mapped
by stage, garbage dropped, not mapped twice); old runs and the daily and tower unchanged; an army run's waves, boss and land;
the first wave winnable for a fresh party; the Warlord a wall at level 1 and not at level 9; later armies needing more levels;
and the Lich King (title, raise at most two at a time and six in all, Soul Nova's range and freeze, a fight plays out the same each time).

## Screenshots

`docs/samples/armies-*.png` at 393x852 (upright) and 852x393 (sideways), made by `node tools/armies/shots.mjs out/web`: the home
screen, the Armies screen fresh / mid-progress (with a glowing new army) / all open (and scrolled), a wave deploying and fighting,
the Lich King's boss intro, deploy and fight, a victory, the unlock moment, the screen after it, a defeat and the main screen it
returns to.

## Armies 8 and 9, and the balance pass of nine (armies-2)

### The Yokai Night Parade (after the Demon Lord) and the Golem Forge (after the Yokai boss)

| # | Army | Waves | Bosses (wave) | Land | Identity |
| --- | --- | --- | --- | --- | --- |
| 8 | Yokai Night Parade | 10 | Nine-Tailed Fox (5), **Oni King** (10) | Greenwood | fox spirits slip away and curse, crows dive and possess, a tengu monk blows heroes about |
| 9 | Golem Forge | 10 | Sapphire Colossus (5), **Forge Titan** (10) | Dunes | slow tanks: crushing slams, armour plate, crystal shards, magma |

- **Art.** The free yokai pack has only three characters (Kitsune, Karasu Tengu, Yamabushi Tengu, all already heroes), so the troops are
  those sheets under foe ids (`yokaiFox`, `yokaiWitch` (range 3, curses), `yokaiCrow`, `yokaiSeer`, `yokaiMonk`) and the mid-boss is the Kitsune
  drawn big. The pack has no boss-sized figure, so the **Oni King** was generated with PixelLab (`tools/pixellab/oni.py`, as the Lich King: 4 base
  candidates, the armoured one picked, 4-frame idle / walk / attack / attack2 / dead clips, `lie.py` for the last frame; the job ids are in `tools/w/job_*.json`,
  not committed). Generations: 661.75 before the base, 562.75 after the last clip (99 used, far under the cap; later readings are lower because the other
  workers share the account). The Golems pack is **still figures** (64x96, 34 of them), so `tools/golems/cut.py` makes the sheets with whole-pixel moves
  (a stomping walk, a lean into the blow, a slump and a 90-degree lie): nothing is resampled, so it stays crisp. Stone, Iron, Crystal and Magma Golems are the troops, the
  Sapphire Colossus (blue crystal) the mid-boss and the Forge Titan (gilded clockwork) the last, both drawn at 0.85.
- **Skills** (`abilities.ts`): Fox Spirit = Mirror Image (illusions); Fox Witch = Hex (curses); Karasu Tengu = Dive; Crow Seer = Possession (a renamed Fox
  Charm: the strongest hero fights its own side); Yamabushi Monk = Wind Gust. Nine-Tailed Fox: **Foxfire** (a burning meteor) and, as ultimate, Nine-Tailed Dream.
  Oni King: **Kanabo Smash** (a 3x3 slam), ultimate **Thunder Drum** (Tempest: hurt, shoved, stunned 1.5 s), rage and unshakeable. Stone Golem: Crushing
  Slam; Iron Golem: Shield Wall with 33% armour; Crystal Golem: **Shard Burst** (new: hurts and holds every hero within 2 tiles for 1.2 s) with thorns; Magma Golem:
  Magma Burst and burning blows; Sapphire Colossus: Shard Storm and crystal armour; Forge Titan: Forge Hammer, ultimate Furnace Blast (meteor), armour and regen.
  Every skill has an effect and an element (`skillFx.ts`, `fxRules.ts`). Boss titles: *Lantern of the Hundred Nights*, *Lord of the Night Parade*, *Heart of the Blue Vein*,
  *Master of the Eternal Forge*.
- **Rewards**: `pay` 7.2 / 8.8 and `clear` 1450 / 1800: first clear 3142 / 3868 crowns (Infernal 2463), replay 472 / 580 (Infernal 370).
- **Lands**: the Yokai fight in the Greenwood, the Golems on the Dunes (the one land no army used); no new backdrop was made (other workers are on the scenes).

### The balance pass

New tooling in `npm run balance`: `playArmy` takes a castle and dresses the squad with the gear it finds; table **5c** (`--no-tables --climb --saves 120`) is the realistic player (a
fresh save that fights the armies in order, spending half its crowns on the castle (barracks, armoury, library, treasury, stable, lowest first) and the rest on single recruits, fielding
the five best owned heroes, levels carried); table **5d** (`--maxed`) gives the starting five a maxed castle at fixed levels. Raw output: `docs/samples/armies2-balance.txt`.

Tries (mean) to clear each army, realistic player, **before** (foes as they were; the two new armies at their first guess; 80 saves) and **after** (120 saves):

| Army | Before: tries | Before: cleared % | After: tries | After: cleared % | After: median / 90th | Party level | Castle levels |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Orc Warband | 3.1 | 100.0 | 3.1 | 100.0 | 3 / 4 | 1.0 | 0.0 |
| Undead Legion | 2.4 | 100.0 | 2.4 | 100.0 | 2 / 4 | 5.9 | 2.6 |
| Beast Packs | 2.0 | 100.0 | 1.9 | 100.0 | 2 / 3 | 8.8 | 5.7 |
| The Wildwood | 1.4 | 100.0 | 2.7 | 100.0 | 2 / 5 | 10.8 | 8.5 |
| The Labyrinth | 1.2 | 100.0 | 2.9 | 100.0 | 3 / 6 | 14.5 | 11.1 |
| Ogre Clans | 1.1 | 100.0 | 2.4 | 100.0 | 2 / 5 | 16.9 | 14.1 |
| Infernal Host | 1.1 | 100.0 | 2.7 | 100.0 | 2 / 6 | 18.2 | 16.6 |
| Yokai Night Parade | 1.2 | 100.0 | 2.8 | 100.0 | 2 / 6 | 19.1 | 19.6 |
| Golem Forge | 2.7 | 100.0 | 3.2 | 100.0 | 2 / 6 | 19.5 | 22.0 |

Targets met: the Orc Warband 3.1 tries, every later army 1.9 to 3.2 (the Infernal Host 2.7, under the 5 asked), Yokai and Golems 2.8 and 3.2 with a 90th percentile of 6 (challenging, reachable).
Before the pass the realistic player walked through armies 4 to 8 in about one to three tries (Labyrinth 1.2, Ogres 1.1, Infernal 1.1, Yokai 1.2): recruits, a castle growing towards
its top and levels of 15 and over had outgrown the foes. Only the foes, waves and walls were changed (never the heroes): the army multiplier `start` went 0.9 to 1.15 (Wildwood), 1.0 to 1.38
(Labyrinth), 1.1 to 1.55 (Ogres), 1.25 to 1.64 (Infernal), and the new armies sit at 1.68 and 1.7 (it must rise army to army, as a test checks); the Golems' own stats were cut about 12%
and their bosses set at 1,800 / 56 and 2,400 / 60 after a first guess (2,600 and 3,600 hp) made them a 9 to 14 try wall; the Yokai bosses are 2,200 / 52 and 3,000 / 55. The first three armies are untouched.

A **maxed castle** (every building at its top) on the starting five alone, % of 20 attempts clearing, by hero level:

| Level | Orc | Undead | Beasts | Wildwood | Labyrinth | Ogres | Infernal | Yokai | Golems |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 60.0 | 20.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| 5 | 100.0 | 40.0 | 20.0 | 0.0 | 5.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| 10 | 100.0 | 100.0 | 95.0 | 55.0 | 25.0 | 5.0 | 0.0 | 0.0 | 0.0 |
| 15 | 100.0 | 100.0 | 100.0 | 60.0 | 45.0 | 30.0 | 0.0 | 0.0 | 0.0 |
| 20 | 100.0 | 100.0 | 100.0 | 70.0 | 50.0 | 40.0 | 5.0 | 0.0 | 0.0 |

The first two armies are easy for a veteran with a maxed castle by design (a new player replays them for crowns, and a level-1 team still fails them); from the Wildwood on even a maxed castle at level 20 does
not clear an army with the starting five, and the last three are out of their reach (Infernal 5%, Yokai and Golems 0), which is what recruits and ranks are for: with those the climb above is 2 to 4 tries.

Tests: `test/armies2.test.ts` (order and unlock, rewards above the Infernal Host's, a kit and sheet rows for every new foe, titles, Shard Burst, Thunder Drum, the new walls, lying deaths);
`test/armies.test.ts` lists nine armies. Screenshots (393x852, `node tools/armies/shots2.mjs out/web`): `docs/samples/armies2-*.png`; the crispness lineup is
`docs/samples/armies2-lineup.png` (1:1 and 3x, beside a Craftpix Knight and Skeleton Warrior).

## Not done / notes

- (Done in `hero-art.md`: the Lich King now has a hurt row and a stepping walk.)
- Army skills are shared with the heroes' skills, so their effects use the same visuals; only Raise Dead and Soul Nova are new.
- The Wildwood and the later armies are tuned for a strong party (see the recruits table); the starting five alone struggle
  at the Infernal Host by design.
