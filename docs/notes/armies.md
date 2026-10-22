# Armies

The stages are now **armies**, King God Castle style. The Battle tab's big button opens the Armies screen; an army is a
campaign of 8 to 10 waves with a mid-boss around halfway and a final boss; beating the final boss opens the next army.
The run inside a campaign is the run as it was (summons and merges, events, relics and gear, stars, XP): the army only
decides which foes each stage meets.

## The seven armies (`src/sim/armies.ts`)

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

## Not done / notes

- A hurt row for the Lich King (he plays his idle frame when hit).
- Army skills are shared with the heroes' skills, so their effects use the same visuals; only Raise Dead and Soul Nova are new.
- The Wildwood and the later armies are tuned for a strong party (see the recruits table); the starting five alone struggle
  at the Infernal Host by design.
