# Awakening materials (AWAKEN-MATS): phase A proposal

The owner's ask: a hero's awakening should need **materials**, one kind per **class trait**, earned from **Calamity wins**.

Phase A only: this proposal, the pace measured, and mock-ups on the real screens. Nothing in the game changes yet: the data
and draw rules sit in `src/sim/awakenMats.ts` (read by the pace model and the mock-ups, not by `awaken.ts`), and the icons in
`src/art/ui/ore/` (not loaded by the page). Questions for the owner are at the end.

## What it does

- **Thirteen rift ores**, one for each class trait (`traitsOf(kind)[1]`). Each wears its class aura's colour
  (`render/auraStyles.ts`), so a Guardian's awakening, its golden aura and its Oathgold all read as one thing.
- **Awakening asks for ores of the hero's class on top of the shards**: Awakening I 10, Awakening II 20 (30 for a hero in
  all). The shards stay as they are (16 in all and 6 used, then 26 and 10 used), so the ranks, the talents, `SHARD_CAP`
  and the duplicate crowns are untouched.
- **Ores drop only in the Calamity**:
  - each **map boss** pays 2, 2, 3, 3, 4, 4 ores (maps 1 to 6; 18 for a whole run) of **one class drawn from the heroes in
    the party that beat it** (one entry a hero, so a class with three heroes in the party comes up three times as often);
  - each **mini-boss** (the elites, the detours' too) pays 2 ores of **any** class (a chance at a class you do not play);
  - a **full clear** pays a **Rift Cache**: 8 ores of the player's choice, opened on any hero's awakening panel ("Open: +8
    Oathgold" on the Knight's page gives Oathgold). It is kept until used, so the choice is made when it matters.
  - **Ascension**: every count grows by a tenth a level (rounded, never less): the cache is 8 at level 0, 10 at 3, 16 at 10;
    a level 10 run pays about twice a level 0 one.
  - A **lost or abandoned run keeps the ores of the bosses and mini-bosses it beat**, as it keeps the maps' crowns.
- **Old saves**: heroes already awakened keep their steps (`readAwakened` does not look at ores). Ores start at none.
  Whether past Calamity clears pay back some Rift Caches is a question below.

### The thirteen ores

Icons: one 32x32 icon each from the **Free Mining Pixel 32x32 Icons** pack (Craftpix), its shading mapped onto the class's
aura colour by `tools/awaken/ore-icons.py`, so each keeps the pack's drawing (bars, ore lumps, crystals, heaps, pebbles,
beads) and the shapes differ even where two colours are close.

| Class | Ore | Colour | Pack icon | Line |
|---|---|---|---|---|
| Guardian | Oathgold | gold `#ffd24a` | gold bar (31_20) | Melted down from promises kept. There is not a great deal of it. |
| Bulwark | Bastion Bronze | bronze `#f0b860` | ore lump (31_11) | Scraped off a wall that refused to fall. The wall is still sulking. |
| Blade | Whetblood Ore | crimson `#e0304a` | red ore (31_31) | Sharpens anything it touches, including tempers. |
| Marksman | Windglass | pale `#dbe8f4` | crystal splinters (31_22) | Splinters of a gust that never missed. Handle by the edges. |
| Gunner | Saltpetre Cake | yellow `#f2d35a` | heap (31_18) | Smells of burnt eyebrows. Keep away from candles, and from Siege Bot. |
| Caster | Hexquartz | violet `#b06cff` | crystal cluster (31_21) | Hums in a key that wizards find soothing and cats do not. |
| Arcanist | Starseed | indigo `#7a86ff` | pebbles (31_24) | Pebbles of night sky. Each one remembers a different tomorrow. |
| Support | Hearthsalt | cream `#fff0b8` | white heap (31_28) | Warm to the touch, and tastes faintly of soup. |
| Beast | Fang Amber | orange `#ff6a2a` | beads (31_34) | Something with teeth is asleep inside. Do not knock. |
| Assassin | Nightglass | dusk `#6a46a8` | dark lump (31_12) | Hard to find, harder to see, and someone has always just pocketed it. |
| Trickster | Moonmilk Pearls | moon `#c6d2ff` | white pebbles (31_29) | Count them twice; the answer will differ. |
| Warden | Mossjade | green `#6cd060` | green ore (31_36) | Grows back if you chip it, which the jewellers find rude. |
| Vanguard | Charge Cinders | amber `#ffa040` | heap (31_33) | Still warm from the last time someone ran at a wall. |

The classes are uneven: Guardian, Blade, Marksman, Caster, Beast, Assassin, Trickster, Warden and Vanguard have four heroes
each (120 ores to awaken them all), Support three (90), Gunner, Bulwark and Arcanist two (60). The cache lets the player
make up a class the bosses rarely draw.

## The pace

`npm run unlock-pace -- --awaken` (20 seeds; new flags `--calweek N` runs a week once clearing, `--caltry DAY` first try
before the first clear, `--ores "I,II"` other costs). The model's Calamity: tried weekly from day 35 (beating 2 maps, then
one more a fortnight, no cache), first cleared on day 70 (the model's own date), then one clear a week, a level higher
every four weeks, 3 mini-bosses a run, the party ten of the player's heroes at random, the cache opened on the hero with
the most shards. The player awakens greedily. Shards are counted as the model has them (talent spending left out).

| Median day | Today (shards only) | Proposal, 1 run a week | Proposal, 2 a week | Costs 6 / 14 | Costs 15 / 30 |
|---|---|---|---|---|---|
| First hero could take Awakening I | **13** | **64** | 64 | 50 | 70 |
| First hero could take Awakening II | **24** | **91** | 81 | 77 | 105 |
| Heroes awakened I / II on day 90 | 20 / 17 have the shards | 8 / 0 | 12 / 2 | 13 / 1 | 4 / 0 |
| on day 120 | 27 / 22 | 18 / 3 | 25 / 8 | 23 / 7 | 12 / 1 |
| on day 180 | 37 / 34 | 33 / 11 | 37 / 32 | 36 / 23 | 27 / 4 |
| on day 240 | 45 / 44 | 44 / 25 | | | |
| Ores earned in a year | | about 2,000 | about 3,600 | | |

What it means:

- **Today the shards are not the gate.** Since the summoning stones (SUMMON-002) a daily player's first hero has the 16
  shards on about day 13 and the 26 on day 24; on day 60, 13 heroes could be fully awakened. (The balance note in
  `awaken-gear.md`, "no hero reaches 16 shards in the climb", predates the stones.)
- **With the ores, awakening waits for the Calamity**: the first Awakening I about day 64 (a few weeks after the Calamity's
  first tries), the first Awakening II about day 91. A player who plays the Calamity twice a week fully awakens most of the
  roster by day 180; a weekly player has nearly every hero at Awakening I by day 240, and every hero fully awakened by about day 300 to 365.
- The first awakening is set by **when the Calamity is played**, not by the costs: 6 / 14 brings it 2 weeks sooner, 15 / 30
  a week later. The model's dates for the Calamity (open by day 35, cleared by day 70) are its own guesses; the Calamity
  opens at 16 army stars.

## Where ores are shown (mock-ups)

- **The awakening panel** (`awakenView.ts`, Progression tab): a line under the heading with the class's ore (icon, name, the
  wry line, "7 / 10"), the Rift Cache row when one is held ("Open: +8 Oathgold"), each step's cost "16 shards in all · uses
  6 + 10 Oathgold", the bar in the ore's colour, and the button "Shards ready · 7 / 10 Oathgold" (disabled) or "Awaken ·
  uses 6 shards + 10 Oathgold". The Rank up card the button opens shows the same cost.
- **A Calamity map's recap** (`calClear.ts mapRecapCard`): a "Rift ores" group: "+3 Whetblood Ore, the boss · for Blades",
  "+2 Mossjade, the mini-boss · for Wardens", each chip ringed in its colour.
- **The victory screen** (`calClear.ts`): the run's ores together, and the Rift Cache (the game's bronze chest picture).
  The loss summary gets the same group when any were won.
- **The ore pouch**: every class's ores on the Calamity's start screen (`calamityView.ts pickHero`), seven to a row, the
  empty ones dimmed. Recommended as the one "inventory" place, since the ores are the Calamity's; the hero roster's filter
  could add "can awaken" later.
- A boss's fall in the fight could pop a small ore chip; left out of the mock-ups (the recap already says it).

Pictures (each labelled MOCK-UP, the real screens with the proposed parts laid over them by `tools/awaken/mats-mock.mjs`):
`docs/samples/awaken-mats-mock-panel-short.png`, `-panel-ready.png`, `-recap.png`, `-victory.png`, `-pouch.png` (and the
`-360`, `-412` sizes), on one sheet: `docs/samples/awaken-mats-mock-sheet.png`.

## Phase B: the files and save fields

- `src/sim/awakenMats.ts`: the data and draws (here now); `awakenRules.ts` gets `AWAKEN_ORES`.
- `src/sim/awaken.ts`: `awakenPlan` gains `ore`, `oreCost`, `oreHave`; `can` also needs the ores; `awaken` takes them;
  `openCache(m, kind)`.
- `src/sim/meta.ts`: `Meta.ores?: Record<string, number>` (by class trait; missing is none) and `Meta.caches?: number`,
  both optional and read sane on load (`readOres`); no save version change.
- `src/sim/tower.ts`: the run keeps what it won (`TowerState.ores?: OreDrop[]`, `MapRecap.ores?`) when a boss or mini-boss
  falls, drawn from side streams of the run's seed (`0x0e5b`, `0x0e5e`), so no existing draw changes; `settleCalamity`
  pays them, and the cache on a clear (`ClearReward.cache`). The Calamity still reads nothing of the meta during a run.
- `src/awakenView.ts`, `rankUpView.ts`, `calClear.ts`, `calamityView.ts`, `awaken.css`/`calmap.css`; the icons bundled as
  data URLs (no change to the offline list); `CREDITS.md` (the Mining Icons pack).
- Tests: drops (deterministic, party classes, ascension, losses keep theirs), costs, the cache, old saves (awakened heroes
  keep their steps; no ores), and the pace tool.
- Fits with: the auras (same colours), the void map (`claude/cal-void`, looks only, other files), the other AI's Calamity
  encounters (they add spots; their wins would pay no ores unless they are mini-bosses).

## Risks

- **It slows awakening a lot for players who skip the Calamity**: a player who never plays it can never awaken. That is the
  ask, but it is the biggest change here (Q1, Q4).
- Uneven classes: two-hero classes need half the ores; the bosses' draw follows the party, so a player who hires Guardians
  gets Oathgold. The cache covers the rest.
- The ores add a currency; kept to two screens and a pouch so the menus do not grow a stash page.
- The model's Calamity dates are guesses; the real tries depend on the 16 stars and on how hard the first maps are.

## Questions for the owner

1. **Ores on top of the shards, or in place of some?** Recommended: on top (10 and 20), shards unchanged, so the ranks,
   talents and duplicate crowns stay as they are.
2. **Who picks the class?** Recommended: the bosses' ores follow the party that beat them, mini-bosses' are any class, and the
   clear's Rift Cache is the player's choice (opened on a hero's panel). Alternative: every boss offers a pick of three.
3. **How many?** Recommended: 10 / 20 a hero; bosses 2 to 4 (18 a run), mini-bosses 2, the cache 8; +10% an ascension level.
   First Awakening I about day 64 and the first Awakening II about day 91 for a weekly Calamity player (today 13 and 24).
4. **Any trickle from elsewhere?** Recommended: none at first, so the Calamity is the one home of awakening. Options: a Rift
   Cache for each Mythic tier first clear, or for each Last Stand record past wave 20, or one in a gold chest now and then.
5. **Old saves:** awakened heroes keep their steps (recommended, and asked). Should past Calamity clears pay something back?
   Recommended: one Rift Cache for each past clear, up to five.
6. **Where to show the pouch?** Recommended: the Calamity's start screen (mock-up), plus each hero's awakening panel.

## Checks run (phase A)

- `npm run typecheck`: passed. `npm run web`: built.
- `npm test -- awaken`: 15 passed, none failed (the new `test/awaken-mats.test.ts`, 2 tests: an ore for each class in its
  aura colour with its icon, and the draws deterministic, of the party's classes and growing with the ascension; and the
  existing awakening and aura tests).
- `npm run unlock-pace -- --seeds 20 --awaken` (and `--calweek 2`, `--calweek 3`, `--caltry 400`, `--ores 6,14`, `--ores 15,30`):
  the table above. Without `--awaken` the tool's output is unchanged (the ore model touches no meta).
- `node tools/awaken/mats-mock.mjs`: the five screens at 393x852, 360x780 and 412x915, no page errors; then
  `python3 tools/awaken/mats-mock-sheet.py` for the sheet. `python3 tools/awaken/ore-icons.py ../chronos-assets` makes the icons.
