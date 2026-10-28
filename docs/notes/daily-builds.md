# Daily build themes (DAILY-BUILDS) — phase A proposal

The owner's ask: make the dailies **varied, showing builds and synergies**. Each day should push a different team idea, show it up
front, and reward trying it. The daily keeps its goal from `docs/notes/daily-goal.md`: ten waves, a mid-boss at 5, the boss of the
day at 10, two hearts, the daily chest.

**Status:** phase A. The proposal below, a working prototype on the branch (the rules, a first balance pass and the screens), and
mock-ups. Phase B waits for the owner's answers to the questions at the end.

## What a theme is

Each date from `DAILY_THEMES_FROM` (1 November 2026) has a **theme** (`src/sim/dailyThemes.ts`, `DAILY_THEMES`). A theme sets:

| | What it does |
| --- | --- |
| **The day's heroes** | The starting five (all in the squad at wave 1) and two or three more that Hire can bring out (the run's `pool`). Today every daily is the same five (Knight, Samurai, Kunoichi, Archer, Fire Wizard), which hold no synergy beyond Samurai. A theme hands every player the same heroes, owned or not, so the day is fair and shows heroes the player may not have yet. |
| **The featured trait** | Its team bonus counts **twice** while it is woken (`FEATURED_MULT` 2; `featuredExtra`, read in `applyTraits` through `Stage.featured`). Four Beasts give +16% attack, not +8%. |
| **A goal** | "Beat the boss with 4 Beasts on the field": the featured trait's heroes placed in the boss of the day's fight. The five never meet it alone: it always needs a hire. Met, it is a **third bonus star** on the daily chest (+60 crowns, +1 shard, +1 summoning stone, +15% gear chance, as the other two stars). |
| **Host and land** | The army whose waves, mid-boss and boss the day uses (one of the six early armies, as now), and the land, chosen to fit (Beasts' Night is the Beast Packs in the Autumn Wood). |
| **A twist** (some days) | A floor twist from the tower's table on every wave (Mana surge for Spellstorm, Holy ground for Holy Vigil, Fog for the Yokai), or the theme's own (Glass Cannons: everyone hits 25% harder, foes too). |
| **A swarm** (one day) | The Swarm: each field wave doubled to at most eight foes (`SWARM_MAX`), each at half the hp (`SWARM_HP`); the bosses as they are. Fire and lightning that spread win it. |
| **A boss ease** | `boss`: the mid-boss's and the boss's hp and attack times this, so each theme clears about as often as the old daily (set by the balance pass). |

## The eighteen themes

They go round in a fixed order, one a day: a theme comes back every 18 days, never twice in a fortnight, and no two days running share
a host army or a land (both tested).

| # | Theme | Featured (goal) | Five + hires | Host · land | Twist |
| --- | --- | --- | --- | --- | --- |
| 1 | Beasts' Night | Beast (4) | Werewolf, Minotaur, Satyr, Knight, Archer + Gorgon, Wolf Bard | Beast Packs · Autumn Wood | |
| 2 | Spellstorm | Caster (4) | Fire Wizard, Wanderer, Warlock, Knight, Peasant + Tyrant, Great Sage | Undead · Graveyard | Mana surge |
| 3 | The Swarm | Mystic (3) | Fire Wizard, Lightning Mage, Knight, Samurai, Peasant + Wanderer, Sage, Dread Pirate | Orcs · War Camp | swarm waves |
| 4 | Shields Up | Guardian (3) | Knight, Paladin, Kraken Mate, Archer, Fire Wizard + Yamabushi, Juggernaut, Peasant | Ogres · Highlands | foes +15% attack |
| 5 | The Wild Hunt | Wild (4) | Werewolf, Druid, Barbarian, Knight, Archer + Wolf Bard, Satyr | Wildwood · Forest | |
| 6 | Glass Cannons | Assassin (4) | Mercenary, Buccaneer, Reaper, Archer, Knight + Arc Blade, Kunoichi | Labyrinth · Temple | all +25% attack |
| 7 | Holy Vigil | Holy (3) | Paladin, Cleric, Samurai, Archer, Knight + High Priestess, Wolf Bard | Undead · Shrine | Holy ground |
| 8 | Way of the Blade | Samurai (4) | Samurai, Kunoichi, Archer, Knight, Fire Wizard + Ninja Monk, Samurai Commander | Orcs · Highlands | |
| 9 | Iron and Steam | Machine (4) | Rifle Bot, Arc Blade, Juggernaut, Archer, Knight + Siege Bot, Gunslinger | Labyrinth · Forge | |
| 10 | Crown and Lance | Royal (4) | Lancer, Queen Dragoon, Tyrant, Archer, Knight + Demon Swordsman, Dread Pirate | Beast Packs · Plains | Haste |
| 11 | The Wardens' Wall | Warden (4) | Cleric, Druid, Shambler, Archer, Fire Wizard + Mummy, Knight | Ogres · Snow | |
| 12 | Night of Spirits | Yokai (3) | Kitsune, Yamabushi, Samurai, Archer, Fire Wizard + Karasu, Gorgon | Wildwood · Swamp | Fog |
| 13 | High Ground | Marksman (3) | Archer, Ranger, Knight, Peasant, Samurai + Gunslinger, Lightning Mage | Undead · Ruins | Gale |
| 14 | Sea Dogs (a featured duo) | Pirate (2) | Buccaneer, Dread Pirate, Knight, Archer, Fire Wizard + Kraken Mate, Gunslinger | Beast Packs · Oasis | |
| 15 | Frontier Guns | Frontier (4) | Ranger, Gunslinger, Mercenary, Knight, Peasant + Beastmaster, Rifle Bot | Orcs · Desert | |
| 16 | Grave Pact | Undead (4) | Shambler, Mummy, Reaper, Archer, Fire Wizard + Dread Pirate, Cleric | Ogres · Dungeon | Cursed |
| 17 | Arcane Tide | Arcane (4) | Warlock, Time Witch, Satyr, Knight, Archer + Illusionist, Great Sage | Wildwood · Crystal | |
| 18 | Smoke and Mirrors | Trickster (3) | Kunoichi, Illusionist, Knight, Archer, Fire Wizard + Kitsune, Karasu | Labyrinth · Ruins | |

## How it shows

- **The camp's Daily board**: the plate's line is the theme's name ("Beasts' Night · not tried"); the screen reader hears "Today:
  Beasts' Night, the Boar King · not tried" (`dailyLine`).
- **The start card** (`src/dailyView.ts`, `src/themeView.ts`): a gold-framed theme block under the date: the featured trait's badge,
  the theme's name and "Beast bonus x2", its one-line idea, the goal with a star, and the day's heroes (the five, then "+" and the
  hires dashed; the featured ones framed in gold). The boss sits smaller beside its name below it. Fits 393x852 without scrolling.
- **The deploy screen** (`src/main.ts`, small hooks): the banner under the top bar (the tower's twist banner, in gold) reads
  "Beasts' Night · Beast bonus x2" and "Goal at the boss: 4 Beasts · 3/4 placed", counting as heroes are placed, "Goal: ... 4/4 placed ✓"
  on the boss wave. The featured trait's chip leads the trait strip, framed in gold with an "x2" tag, and the hint says "twice over
  today" when it wakes. On the bench, the featured trait's mark is gold.
- **The result**: the chest's third star is listed with the other two ("Beat the boss with 4 Beasts on the field").

## Rules and numbers

- `dailyTheme(date)`: null before `DAILY_THEMES_FROM`; else `DAILY_THEMES[(days since that date) mod 18]` (`dayNumber` counts calendar
  days from the yyyymmdd date, so it does not hang on the clock or the time zone). Nothing draws from any random stream; every
  existing stream is untouched.
- The goal counts different kinds of the featured trait placed in the winning fight with the boss of the day (`noteFight` sets
  `run.themeMet`; fallen heroes still count: they were on the field).
- `dailyScale` (the answer to a strong save) is taken over the theme's five, not the old five.
- Practice runs, hearts, crowns per wave, the time and no-heart stars are as they were.

## Save fields

- `Run.themeMet?: boolean` (optional; a run saved before the change has none).
- `Meta.daily[date].stars` and a daily chest's `bonus` may be 3 on a themed date (`dailyStarsMax`; an older date is still held to 2).
- No new Meta field; the theme is worked out from the date.

## Balance (quick pass)

`node tools/daily-builds/themeRate.mjs --runs 20` plays each theme's dates from a fresh save (every hero level 1, no castle), with the two
hearts, two ways: the **greedy** player of `npm run daily-rate` (the five strongest, ignoring the theme) and a **themed** player (the
same, but it fields the featured heroes first, up to the goal). The old daily is 69% for the greedy player.

| Theme | Greedy clear | Themed clear | Themed goal |
| --- | --- | --- | --- |
| Beasts' Night | 80% | 70% | 65% |
| Spellstorm | 50% | 60% | 45% |
| The Swarm | 65% | 35% | 35% |
| Shields Up | 70% | 45% | 45% |
| The Wild Hunt | 50% | 75% | 75% |
| Glass Cannons | 75% | 55% | 55% |
| Holy Vigil | 50% | 65% | 60% |
| Way of the Blade | 40% | 65% | 50% |
| Iron and Steam | 50% | 85% | 80% |
| Crown and Lance | 80% | 70% | 65% |
| The Wardens' Wall | 85% | 90% | 70% |
| Night of Spirits | 45% | 55% | 55% |
| High Ground | 75% | 60% | 60% |
| Sea Dogs | 60% | 65% | 50% |
| Frontier Guns | 75% | 70% | 45% |
| Grave Pact | 75% | 60% | 40% |
| Arcane Tide | 70% | 40% | 25% |
| Smoke and Mirrors | 65% | 85% | 85% |
| **All** | **64%** | **64%** | **56%** |

Every theme is winnable at the daily's level (a fresh save) with a sensible party; the spread is wide on 20 dates a theme. Phase B would tune each theme's `boss` ease
over more dates to sit at 60 to 75% for the themed player, and lift The Swarm, Shields Up and Arcane Tide, where the bot places the heroes poorly
for the idea (it does not line casters up behind the wall).

## Files

- New: `src/sim/dailyThemes.ts` (the table and rules), `src/themeView.ts` (the start card block and the banner),
  `test/daily-builds.test.ts` (9 tests), `tools/daily-builds/themeRate.mjs`/`.ts` (the balance pass), `tools/daily-builds/shots.mjs`
  (the mock-ups).
- Small hooks: `src/sim/daily.ts` (host, swarm waves, boss ease), `dailySeed.ts` (the land), `modes.ts` (`dailyRun`, `dailyScale`,
  `dailyBonus`, `dailyLine`), `run.ts` (`startStage`: twist, featured, swarm hp; `noteFight`: the goal), `battle.ts` (`Stage.featured`,
  one line in `applyTraits`), `meta.ts` and `armyStars.ts` (the third star survives a save), `dailyView.ts`, `home.ts`, `main.ts`,
  `daily.css`.

## Risks

- The theme hands out heroes the player does not own (all at their lasting level, 1 if never played). This is the point (a trial), but
  it is a change from "the starting five" and from what the roster shows. Q2.
- A wider pool (7 or 8 kinds against 5) means fewer three-of-a-kind merges in a run; the boss ease answers that for now.
- The Swarm puts up to eight foes on the board: more units to draw on a phone. Not yet measured on a real phone.
- A run of today's daily saved before 1 November plays on as it was (the old daily); nothing changes for dates before the switch.
- The featured trait's doubled bonus of a weak trait (Samurai's +1% at two) is still small; the goal is the real push on those days.

## Mock-ups (MOCK-UP, real game, 393x852)

`docs/samples/daily-builds-mock-board.png` (the camp's board), `-start-beasts.png`, `-start-swarm.png`, `-start-sea.png` (start
cards), `-deploy.png` (wave 1, three of four Beasts placed), `-deploy-boss.png` (the boss wave, goal met), the same at `-360x780` and
`-412x915`, and the contact sheet `docs/samples/daily-builds-mock-sheet.png`.

## Questions for the owner

1. **Hard or soft?** Should a theme *force* its build (only its heroes may be fielded, e.g. "only casters") or *reward* it (anything
   goes; the build earns the bonus star)? **Recommended: soft.** The day's pool already steers the build (you can only hire the day's
   heroes), the doubled bonus makes it strong, and the goal's star rewards it, while a player who wants the chest can still win their
   own way. A hard rule would make a bad draw unwinnable.
2. **The day's heroes, owned or not?** The theme gives everyone the same five and hires, even heroes they have not collected (a free
   trial; hero levels from the save still apply). **Recommended: yes**, it is fair and shows heroes off. The other way (only owned heroes,
   the theme's missing ones swapped for owned ones of the trait) is possible but makes a new save's daily mostly the starting five.
3. **The goal's reward:** a third bonus star on the daily chest (+60 crowns, +1 shard, +1 summoning stone, +15% gear). **Recommended: yes.** Or a
   separate small prize (e.g. 3 summoning stones)?
4. **Order:** a fixed round of 18 (predictable: "Beasts' Night is back on Saturday") or shuffled each round (still never twice in a
   fortnight)? **Recommended: fixed**, simpler and lets the camp say tomorrow's theme.
5. **The boss of the day:** each theme fixes its host army (Beasts' Night is always the Boar King). **Recommended: keep it fixed** per
   theme so each one is tuned once; a seeded boss per day would make the balance far harder.
6. **Swarm count:** up to eight foes on a swarm day. **Recommended: eight**; ten if a phone holds the frame rate.
