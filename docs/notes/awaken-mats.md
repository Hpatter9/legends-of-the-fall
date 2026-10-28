# Awakening materials (AWAKEN-MATS)

The owner's ask: a hero's awakening should need **materials**, one kind per **class trait**, earned from **Calamity wins**;
then (the answers to phase A) different armies drop different ores, the Calamity stays the richest source, it should be
difficult, with small trickles from a first Mythic clear, Last Stand records and gold chests, and old saves paid back.

## What it does

- **Thirteen rift ores**, one for each class trait (`traitsOf(kind)[1]`), each in its class aura's colour
  (`render/auraStyles.ts`): Oathgold (Guardian), Bastion Bronze (Bulwark), Whetblood Ore (Blade), Windglass (Marksman),
  Saltpetre Cake (Gunner), Hexquartz (Caster), Starseed (Arcanist), Hearthsalt (Support), Fang Amber (Beast), Nightglass
  (Assassin), Moonmilk Pearls (Trickster), Mossjade (Warden), Charge Cinders (Vanguard). Each has a wry line.
- **Awakening asks for its class's ores on top of the shards**: Awakening I 10, Awakening II 20 (`AWAKEN_ORES`). The shards
  are unchanged (16 in all and 6 used, then 26 and 10), so ranks, talents, `SHARD_CAP` and the duplicate crowns are as before.
  `awakenPlan` gains `ore`, `oreCost`, `oreHave` and `shardsReady`; `awaken` takes the ores.
- **Rift Caches**: a Calamity clear pays one, a first Mythic clear of an army pays one, and an old save is paid back one for
  each Calamity it cleared (up to five). A cache is opened on any hero's awakening panel and gives 8 ores of that hero's class
  (`openCache`), so the player chooses the class.

### Where each ore is found

**The armies** (`ARMY_ORES`): each drops two or three kinds that fit its troops; between them all thirteen.

| Army | Ores | Why |
|---|---|---|
| Orc Warband | Blade, Vanguard, Marksman | grunts with blades, brutes that charge, orc archers |
| Undead Legion | Arcanist, Assassin | a lich's lore; skeletons that strike from the dark |
| Beast Packs | Beast, Marksman | werewolves; the hunt |
| The Wildwood | Warden, Support, Trickster | the grove itself; the satyrs' pipes; forest mischief |
| The Labyrinth | Beast, Bulwark, Trickster | minotaurs; gorgons' stone; the maze |
| Ogre Clans | Guardian, Blade, Support | big shields and bigger clubs; the shaman king |
| Infernal Host | Caster, Assassin, Vanguard | hellfire; imps in the dark; demons that charge |
| Yokai Night Parade | Trickster, Arcanist, Caster | fox spirits; tengu monks' lore; foxfire |
| Golem Forge | Gunner, Bulwark, Guardian | the forge's powder; stone and iron hides |

**The Calamity** (`REALM_ORES`): each map's boss and mini-bosses drop that map's kinds (by its boss; the void map's look is
another branch, so the table is tied to the map's number and boss, not its scenery). All thirteen between them.

| Map | Boss | Ores | Why |
|---|---|---|---|
| 1 | Gorvak the Ashen (an orc warlord) | Blade, Vanguard | the warband's edge and charge |
| 2 | The Thorn Warden | Warden, Beast, Marksman | the bramble that remembers, its beasts and hunters |
| 3 | Malphas (calls the hordes, mends) | Caster, Support | summoning and mending |
| 4 | Hrungar, the Wall That Walks | Guardian, Bulwark | a wall of a giant |
| 5 | Vorgrath the Hellbringer (poison, the last flame) | Assassin, Gunner | poison, and powder and fire |
| 6 | Karnok the Calamity, the end of all roads | Trickster, Arcanist | the rift's tricks and lore |

### The numbers (`src/sim/awakenMats.ts`)

- **The Calamity** (the richest): a map's boss pays 2, 2, 3, 3, 4, 4 (`BOSS_ORES`, 18 a run), a mini-boss (a detour's too)
  2 (`ELITE_ORES`), each of one of its map's kinds; all of it a tenth more for each ascension level (`ORE_ASC`); a clear a
  Rift Cache (8 ores, `CACHE_ORES`). The drops are kept on the run (`TowerState.ores`, `MapRecap.ores`) and paid when it
  ends, **a loss or abandon too** (`settleCalamity`, `TowerSummary.ores`).
- **The armies** (slow): a won boss wave drops 1 ore now and then: a mid boss 1%, 1.5%, 2%, 2.5%, 3% (Normal to Mythic,
  `MID_CHANCE`), the army's last boss 2.5%, 3.5%, 4.5%, 5.5%, 6.5% (`FINAL_CHANCE`), 2 a drop on Legendary and Mythic
  (`BOSS_DROP`). A tier's first clear always pays 2, 3, 4, 6 (Normal to Legendary, `FIRST_CLEAR_ORES`) of the army's kinds;
  a first Mythic clear pays a Rift Cache. Auto-replays drop the same and count them in their summary.
- **Gold and Mythic chests**: a gold chest (10 stars, and the tower, Last Stand and Calamity gold chests) holds 2 of its army's
  ores one time in four, a Mythic chest 3 one time in two (`CHEST_ORES`); other chests none. The shop's chests none.
- **Last Stand records**: 2 ores of any kind for each tenth wave a run passes for the first time (`standOres`).
- Every draw has its own side stream (salts `0x0e5a` army, `0x0e5b` boss, `0x0e5c` chest, `0x0e5d` Stand, `0x0e5e`
  mini-boss), so every fight, chest and reward rolls as before (`npm run unlock-pace` without `--awaken` prints exactly
  what main does).

### Saves

`Meta.ores?` (class trait -> count) and `Meta.caches?`, both optional, no save version change. `readOres` keeps class traits
with a whole count above none. `readCaches`: a save that has no count yet (from before the ores) is given one cache for each
Calamity it cleared, up to five (`BACK_PAY_CACHES`), the first time it is read; the count is kept from then on (`0` for a save
with no clear), so it is never paid twice. Heroes already awakened keep their steps (`readAwakened` never looks at ores).

## The pace

`npm run unlock-pace -- --awaken --seeds 30 --days 540` plays the real rules (`settleArmyOres`, `openChest`, `payClear`,
`openCache`, `rankUp`, `awaken`): the farm's boss waves at the best tier cleared (13 runs a day) and the first clears on the
model's dates, the chests as they come, the Calamity tried weekly from day 35 (2 maps, one more a fortnight, no clear) and
cleared weekly from day 70 (6 bosses and 3 mini-bosses, the cache opened on the hero with the most shards still to awaken),
a level higher every four weeks. Flags: `--calweek 2` (two Calamity runs a week), `--armyrate`, `--ores "I,II"`, `--caltry`.
The Last Stand is not in the model (its ores are a trickle).

| Median day (30 seeds) | Before (shards only) | With the ores, 1 Calamity a week | 2 Calamity runs a week |
|---|---|---|---|
| First hero takes Awakening I | 14 | **43** | 43 |
| First hero takes Awakening II | 24 | **84** | 81 |
| Awakened I / II on day 90 | 20 / 17 have the shards | 13 / 1 | 16 / 2 |
| on day 120 | 27 / 22 | 22 / 4 | 26 / 12 |
| on day 180 | 36 / 33 | 36 / 15 | 36 / 30 |
| on day 240 | 45 / 44 | 44 / 27 | |
| Every hero at Awakening I | about day 240 (the roster's) | **245** | 230 |
| Every hero fully awakened | about day 240 | **350** | 247 |

Ores earned over 540 days (mean, one Calamity a week): the Calamity's bosses and mini-bosses 2,782 and its caches 331, the
armies 487, chests 33. The Calamity is about six times the armies. With the armies' boss-wave chances twice as high (the first
cut) the first Awakening I came on day 35 and the armies paid 900; halved to keep awakening slow, as the owner asked.

## Where ores are shown

- **The awakening panel** (hero page, Progression): the class's ore (icon, name, line, "7 / 10"), a Rift Cache row with
  "Open: +8 Oathgold" when one waits, each step's cost "16 shards in all · uses 6 + 10 Oathgold", the bar (shards, then the
  ore in its colour once the shards are ready), the button ("Shards ready · 7 / 10 Oathgold", "Awaken · uses 6 shards + 10
  Oathgold"), a hint where the ore is found, and the pouch of every class's ores under it. The Rank up card names the ores used.
- **The Calamity's start** (`calamityView.ts`): the pouch (seven to a row, the empty dimmed, the caches waiting).
- **A Calamity map's recap and victory screen** (`calClear.ts`): a "Rift ores" group; the victory screen adds the Rift Cache.
  The loss summary (`towerView.ts`) lists the ores too.
- **An army's card** (`armiesView.ts`): "Rift ores" and its kinds, so players know where to farm.
- **An army's result screen** (`#oreDrop` in `index.html`, `drawOreGain`): the ores the fight dropped and any cache.
- **Chests** (`chestStash.ts`): an ore line in the opening, and a tile in Open all's summary. The Last Stand's end card has
  a "Rift ores" row.

Pictures (`node tools/awaken/mats-shots.mjs`, the real game at 393x852, 360x780 and 412x915): `docs/samples/awaken-mats-*.png`
(`panel-short`, `panel-ready`, `panel-pouch`, `pouch`, `recap`, `victory`, `army-card`, `army-result`, `chest`, each with `-360`
and `-412`), and `awaken-mats-sheet.png`. The phase A mock-ups are `awaken-mats-mock-*.png`.

## Files

- `src/sim/awakenMats.ts` (new): the ores, the tables, the draws, the meta helpers (`grantOres`, `openCache`, `readOres`,
  `readCaches`, `settleArmyOres`).
- Sim hooks: `awaken.ts` (the cost), `meta.ts` (the fields and their reading), `tower.ts` (`finishTower` drops,
  `settleCalamity` pays), `calReward.ts` (the cache, `CLEAR_CACHES`), `armyStars.ts` (chests, `sumLoot.ores`), `stand.ts`
  (`settleStand`), `autoReplay.ts` (`totals.ores`).
- Page: `src/oreView.ts` and `src/ores.css` (new; `build.mjs` lists the CSS), `awakenView.ts`, `rankUpView.ts`,
  `menuHeroes.ts` (no show for a cache), `calClear.ts`, `calamityView.ts`, `towerView.ts`, `armiesView.ts`, `chestStash.ts`,
  `standView.ts`, `main.ts` (`settleArmyOres` after `settleArmyRun`, the result and auto summary), `index.html` (`#oreDrop`).
- Art: `src/art/ui/ore/` (Free Mining Pixel 32x32 Icons, tinted by `tools/awaken/ore-icons.py`; credited). The icons and the
  Rift Cache's chest are bundled into game.js as data URLs: no change to the offline list.
- Tools: `tools/unlockPace.ts` (`--awaken`), `tools/awaken/mats-shots.mjs`, `mats-sheet.py`; phase A's `mats-mock.mjs`.
- Tests: `test/awaken-mats.test.ts` (13: the ores and tables, the Calamity's drops on the run and its pay on a loss, the
  cache, the armies' chances and first clears, auto-replay totals, the cost, the chests, the Last Stand, saves and the back
  pay); `test/awaken.test.ts` gives its shard tests ores in plenty.

## Limits

- The Calamity's map table is by map number and boss; when the void map (`claude/cal-void`) lands, its realm names can be
  added to the table's comments with no rule change.
- The shop's chests hold no ores (crowns would buy ores); the daily chest none.
- The model's Calamity dates are its own guesses; the Last Stand's ores are not modelled.

## Checks run

- `npm run typecheck`: passed. `npm run web`: built.
- `npm test -- awaken-mats`: 13 of 13. `npm test -- rankUp awaken chest armyStars calMapRewards calamity stand meta autoReplay ascension`: 167 of 167.
- Full `npm test`: 1290 of 1290 passed. Two existing tests now give their heroes ores, since awakening asks for them (the
  owner's rule): `test/awaken.test.ts` (its shard tests) and `test/rankUp.test.ts` (the top rank before awakening).
- `npm run unlock-pace -- --awaken --seeds 30 --days 540` (and `--calweek 2`): the pace table above. Without `--awaken` the
  output is the same as main's (checked with a diff at 10 seeds).
- `node tools/awaken/mats-shots.mjs`: the nine screens at 393x852, 360x780 and 412x915, no page errors; the army result
  shot taken again with `ONLY=army-result` (the fight had not ended in time on the first pass at the two smaller sizes).
