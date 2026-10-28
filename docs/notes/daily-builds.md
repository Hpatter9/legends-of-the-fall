# Daily build themes (DAILY-BUILDS)

The owner's ask: make the dailies **varied, showing builds and synergies**. Each day should push a different team idea, show it up
front, and reward trying it. The daily keeps its goal from `docs/notes/daily-goal.md`: ten waves, a mid-boss at 5, the boss of the
day at 10, two hearts, the daily chest.

**Status:** phase B done on the branch: the owner's answers (below) are built in, the weak themes tuned, live from 26 October 2026.
Phase A's proposal and mock-ups are kept below where they still hold.

## What a theme is

Each date from `DAILY_THEMES_FROM` (26 October 2026) has a **theme** (`src/sim/dailyThemes.ts`, `DAILY_THEMES`). A theme sets:

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

The days come in **blocks of 18** from 26 October 2026; each block has every theme once, in a **seeded shuffled order** (`themeBlock(n)`,
its own side stream `mixSeed(n, 0x7e3e)`), worked out from the date alone, so every player meets the same theme on the same day. The
shuffle is a small search that keeps two rules, across the edge of a block too: **no theme comes back within 14 days** (`THEME_GAP`: a
theme may stand at place i of a block only if it stood at place i + 4 or earlier in the last one), and **no two days running share a host
army or a land**. Each block hangs on the one before, so the blocks are worked out from block 0 on and kept (a year is about 20 blocks).
The camp does not show tomorrow's theme (the owner's call). The table's order below is only the table's.

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

- `dailyTheme(date)`: null before `DAILY_THEMES_FROM` (26 October 2026, so every date from the merge on is themed); else block
  `floor(d / 18)`, place `d mod 18`, for d the days since that date (`dayNumber` counts calendar days from the yyyymmdd date, so it
  does not hang on the clock or the time zone). No stream a fight uses is drawn from.
- A themed run names its theme in its mode (`mode.theme`, set by `dailyRun`); the run reads its theme from there (`runTheme`), not from
  the date. So a daily run begun on the old build on a date that is now themed (26 to 28 October, or today's if the update lands
  mid-run) carries no theme and plays on as the old daily: its five, its host from the old draw, two stars (`dailyArmy(date, null)`;
  tested). Old records for past dates read as before (`dailyStatus`; at most 2 stars on an unthemed date, 3 on a themed one).
- The goal counts different kinds of the featured trait placed in the winning fight with the boss of the day (`noteFight` sets
  `run.themeMet`; fallen heroes still count: they were on the field).
- `dailyScale` (the answer to a strong save) is taken over the theme's five, not the old five. The day's heroes are lent to everyone,
  owned or not; a hero's level from the save still applies (the owner's call).
- Practice runs, hearts, crowns per wave, the time and no-heart stars are as they were.

## Save fields

- `Run.themeMet?: boolean` and the daily mode's `theme?: string` (both optional; a run saved before the change has neither).
- `Meta.daily[date].stars` and a daily chest's `bonus` may be 3 on a themed date (`dailyStarsMax`; an older date is still held to 2).
- No new Meta field.

## Balance

`node tools/daily-builds/themeRate.mjs --runs 40` plays each theme's first 40 dates from a fresh save (every hero level 1, no castle),
with the two hearts, two ways: the **greedy** player of `npm run daily-rate` (the five strongest, ignoring the theme) and a **themed**
player (the same, but it fields the featured heroes first, up to the goal). `--only swarm,arcane` and `--boss swarm=0.5` try other eases.
The old daily is 69% for the greedy player.

| Theme | Boss ease before → after | Greedy clear before → after | Themed clear before → after | Themed goal after |
| --- | --- | --- | --- | --- |
| Beasts' Night | 1.08 | 60% | 68% | 65% |
| Spellstorm | 1 → 0.92 | 60% → 58% | 53% → 63% | 58% |
| **The Swarm** | 0.62 → 0.52 | 63% → 78% | **43% → 63%** | 55% |
| **Shields Up** | 0.7 → 0.6 | 60% → 70% | **58% → 68%** | 65% |
| The Wild Hunt | 1.12 → 1 | 48% → 63% | 53% → 70% | 60% |
| Glass Cannons | 1 | 70% | 63% | 58% |
| Holy Vigil | 1 | 68% | 75% | 60% |
| Way of the Blade | 1 | 60% | 58% | 50% |
| Iron and Steam | 1 → 1.05 | 63% → 58% | 78% → 70% | 60% |
| Crown and Lance | 0.9 → 1 | 93% → 88% | 85% → 65% | 45% |
| The Wardens' Wall | 1.05 → 1.12 | 65% → 68% | 83% → 80% | 65% |
| Night of Spirits | 1 → 0.92 | 43% → 53% | 53% → 68% | 68% |
| High Ground | 0.92 | 60% | 63% | 60% |
| Sea Dogs | 1 | 65% | 75% | 65% |
| Frontier Guns | 0.85 | 68% | 60% | 53% |
| Grave Pact | 1 | 70% | 58% | 50% |
| **Arcane Tide** | 0.85 → 0.76 | 63% → 65% | **58% → 63%** | 53% |
| Smoke and Mirrors | 0.9 → 1 | 80% → 60% | 80% → 73% | 73% |
| **All** | | **64% → 66%** | **64% → 67%** | **59%** |

(40 dates a theme, so a row moves by ±10% from run to run; the rows not tuned are the same dates and the same numbers.)

Why the three were weak: **the bot's placement is not the cause**. `autoFormation` puts the fighters in front and the casters behind, as it
should; what costs the themed player is the build itself: three fragile Mystics (The Swarm), three low-damage Guardians against foes
that hit 15% harder (Shields Up), four Arcane heroes of whom two are casters (Arcane Tide). And the bot casts no king's spells, so a
bonus to the king's mana (Mystic, Arcanist: the Swarm's featured bonus) is worth nothing to it; a player who casts gets more from those
days than the bot shows. So I eased those themes' bosses (`boss` in the table) rather than change the Auto button's formation, which every
mode shares. Crown and Lance was too easy for the greedy player (93%) and Smoke and Mirrors and The Wardens' Wall for the themed one; they
were hardened a little.

## The Swarm's frame time (eight foes, and ten measured)

`node tools/daily-builds/swarmPerf.mjs <build> [label]`: The Swarm's wave 9 at 393x852 in the headless browser (software rendering,
swiftshader), the five placed by Auto, six seconds of the fight timed by `requestAnimationFrame`, three fights a build:

| Foes | Mean frame | 95th percentile | Worst |
| --- | --- | --- | --- |
| 8 (shipped) | 123 to 155 ms (4 runs) | 200 to 350 ms | 450 to 757 ms |
| 10 (a test build) | 136 to 142 ms (3 runs) | 233 to 300 ms | 391 to 683 ms |

On this machine the software renderer is the cost (7 or 8 frames a second whatever the count), and eight against ten is inside the run to
run noise: the two extra foes cost no measurable frame time here. A real phone's GPU is not measured. Shipped at eight (the owner's call).

## Files

- New: `src/sim/dailyThemes.ts` (the table, the shuffle and the rules), `src/themeView.ts` (the start card block and the banner),
  `test/daily-builds.test.ts` (12 tests), `tools/daily-builds/themeRate.mjs`/`.ts` (the balance), `tools/daily-builds/swarmPerf.mjs`
  (the frame time), `tools/daily-builds/shots.mjs` (the screenshots).
- Small hooks: `src/sim/daily.ts` (host, swarm waves, boss ease; `dailyArmy(date, theme)`), `dailySeed.ts` (the land), `modes.ts`
  (`dailyRun`, `dailyScale`, `dailyBonus`, `dailyLine`), `run.ts` (`runTheme`, `waveArmyOf`; `startStage`: twist, featured, swarm hp;
  `noteFight`: the goal), `battle.ts` (`Stage.featured`, one line in `applyTraits`), `meta.ts` and `armyStars.ts` (the third star survives
  a save), `dailyView.ts`, `home.ts`, `main.ts` (the banner, the featured chip and bench mark, the boss's name from the run), `daily.css`.

## Risks

- The day's heroes include ones the player does not own (a free trial, the owner's call); the roster screens still show only the owned.
- A wider pool (7 or 8 kinds against 5) means fewer three-of-a-kind merges in a run; the boss ease answers that.
- The Swarm's eight foes: not measured on a real phone.
- The featured trait's doubled bonus of a weak trait (Samurai's +1% at two) is still small; the goal is the real push on those days.

## Screenshots

Phase B (the game as built, from `node tools/daily-builds/shots.mjs out/web [WxH]`): `docs/samples/daily-builds-<scene>[-WxH].png` for
`board` (the camp's board), `start-beasts`, `start-swarm`, `start-sea` (start cards), `deploy` (wave 1, three of four Beasts placed),
`deploy-boss` (the boss wave, goal met), `deploy-swarm` (a swarm wave, eight foes), at 393x852, 360x780 and 412x915; the sheet
`docs/samples/daily-builds-sheet.png`. Phase A's mock-ups are `docs/samples/daily-builds-mock-*.png` and `-mock-sheet.png`.

## The owner's answers (phase A's questions)

1. Hard or soft: **reward the build, don't force it**; a bonus star for meeting the goal.
2. The day's heroes, owned or not: **everyone gets them** as a free trial; hero levels from the save still apply.
3. The goal's reward: **a third chest star** (+60 crowns, +1 shard, +1 summoning stone, +15% gear chance).
4. Order: **random, not fixed**: a seeded shuffle from the date, the same for everyone; no repeat within 14 days across a block's edge;
   no two days running with the same host or land; tomorrow's theme not shown.
5. The boss: **fixed per theme**, tuned once.
6. The Swarm: **eight foes**; ten measured (above).
