# Calamity

A King God Castle style mode on the tower's machinery (`src/sim/calamity.ts`, `tower.ts`, `modes.ts` `calamityRun`,
`towerView.ts`, `calamityView.ts`). Home screen: a portal in the war camp with a small board under it (open from the start). **The map is no longer the tower's look: it is a local isometric land with fog and hidden side spots, see `calamity-map.md`.**

- **Start**: pick one owned hero (level 1). The run's `local` rules apply (see tower-reset.md); 40 gold.
- **Maps**: 6 maps of 6, 7, 7, 8, 8 and 8 floors (`CAL_ROWS`), each ending in a boss of its own (`calamityBosses.ts`); each map has its own
  name and one of the tower's three looks (`calamityLook`, the fourth tinted). `calamityMap`: floor 1 fights, floor 2 fights or
  a mystery, floor 3 is a recruit camp on every path (the long maps add a second), the floors between are fights, elites,
  shops, chests and mysteries, the one before the boss is a campfire. Every map has a shop and a chest. A boss's fall opens the
  next map; the last one's fall clears the run (`run.cleared`).
- **Bosses** (`src/sim/calamityBosses.ts`): six fighters of existing boss looks under their own name and title (Gorvak the Ashen, The Thorn
  Warden, Malphas, Hrungar the Mountain, Vorgrath the Hellbringer, Karnok the Calamity), shown with the tower's boss intro card (name and
  title line). Each is drawn bigger (`calBossBoost`) and has its own escort. Their kits stack: map 1 enrages as it falls; map 2 adds a
  shield wall; map 3 calls imps and mends; map 4 adds a shove (and cannot be shoved); map 5 poisons and drinks what it deals; map 6 has
  all of it, quickens with every kill and charges. From map 2 the boss floor also carries a twist. They are not in `BOSS_IDS` (the meta's
  boss codex), but `isBoss` knows them.
- **Mini-bosses**: every map has a named elite on a floor with other ways round it (so it can be skipped). Its win pays a choice of three relics, a piece of gear and double gold.
- **Hiring**: new node kind `recruit` offers three different kinds for `45 + 7 x floor` gold (kinds not yet owned first);
  shops sell a hero at the same price. Hires join at 70% of the roster's mean XP and take a squad place. Ten heroes at most
  (`CALAMITY_SQUAD`, `squadLimit`), **no merging**. The summon button is hidden.
- **Foes** (`foeScale`): `0.2 x (1 + 0.06 x (floor-1)) x (1 + 0.3 x (map-1))`, +15% per hero past five, a band fitted to
  the party (a lone hero meets two foes).
- **Rewards**: the fights' crowns as in the tower, `MAP_CROWNS` (60, 120, 200, 300, 420, 600) per map cleared, and a gold chest on a
  full clear; the best is `meta.calamity`. Abandoning ends the run behind a confirm and pays like a loss.
- **Saving**: own slot, see tower-reset.md.

**Balance** (`npm run balance -- --no-tables --calamity --attempts 100`, greedy bot, no castle; share of runs felling each map's boss): 86% / 78% / 64% / 44% / 36% / 16%, so a full clear is 16%. 7.8 heroes held and level 9.6 on average at the end. The ramp is steered by the boss stats (hp 3000, 3800, 4200, 3800, 3400, 2800; `calamityBosses.ts`) and the escorts as much as by the foe scale: a stacked kit made maps 4 and 5 walls until their hp and attack came down. `lostAt` in `tools/autoplay.ts` says which node a climb died at. A human should do better.
Tests: `test/calamity.test.ts` (hiring, cap, no merge, map progression, pay, save and reload). Shots: `docs/samples/calamity-*.png`.

**Ascension and boss phases** (`docs/notes/calamity-bosses.md`): each full clear opens a harder level (to 10) with one more lasting rule and a better reward, picked on the start screen (`meta.calamity.asc`, `run.mode.ascension`); the Calamity's bosses and the armies' final bosses change form at half health (`bossPhases.ts`). The boss stats above were lowered to match (hp 2280, 3270, 3350, 3210, 2780, 1700); the rates stay 86 / 80 / 64 / 45 / 33 / 14. The map's start was later capped at one or two spots (`calamity-map.md`) and the bosses' hp retuned to hold the rates (2000, 3100, 3250, 3250, 2760, 1900: 85 / 81 / 63 / 44 / 35 / 15).
