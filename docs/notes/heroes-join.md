# Nine of the twenty join the roster

The owner's ask: the heroes whose battle sprite sheets are painted join the game now. They are the five Vampires (Vampire Lord, Hemomancer,
Nightstalker, Blood Gargoyle, Dhampir) and the War Drummer, Bell Warden, Falconer and Geomancer. The Banneret and the ten after him
(`COMING_HEROES`) stay coming. Background: [twenty-heroes.md](twenty-heroes.md).

## Sheets

`python3 tools/heroes-20/pack-sheets.py` packed each hero's plain front and back (28 poses each; awakened forms are deferred,
`AWAKENED_SHEETS_LATER` in `src/render/awakenLook.ts`, now holding the nine). Each was checked by eye on `--found` images: pose order, the dead
pose lying flat, the walk alternating, the back sheet a true back view. The sheets are `src/art/units/hero_res_<id>[_back].png` with their
layout in `sheets.json`, imported in `src/render/sheets.ts`. The contact images are in `docs/samples/heroes-20/`.

## What moved

Rows left the coming tables for the roster's: `HERO_NAMES`, `HERO_STORY`, `HERO_QUIPS`, `ROWS` (scores), `TREES`, `DEEP_KITS`, `PASSIVES`,
`HERO_TRAITS`, `CLASS_OF`, `PERKS`, and the whole Vampire origin (`TRAITS.vampire`) and the Night Kin (`COMBOS`). The nine are in `ALL_HEROES`
and out of `COMING_HEROES`; `TWENTY_HEROES` lists all twenty. Their kits are still built from their rows in `kits/`, and handed to `KITS`
(`abilities.ts`) and `HERO_KITS` (`kits/table.ts`) by `joinedKits` / `joinedHeroKits` in `kits/coming.ts` (`comingKits` and `comingHeroKits`
now hold only those still waiting; `twentyKits` and `twentyHeroKits` hold all twenty, for the tuner and tests). Borrowed skill looks for their
skills are in `kitLooks.ts`; heir names, nemesis taunts, awakening lines, ages and which book each reads were added.

## Traits with only some of their new heroes in

Samurai, Mystic, Yokai and Wild each gain one hero; Samurai and Wild reach five members. The owner's two-to-five rule for the twenty already
stood; the roster tests that said "two to four" now say five. No trait gains a tier for a fifth member, except the Vampire origin, whose tier
at five was decision 2 of the twenty. A trait with a still-coming member (Knightly, Warden) counts only the heroes that are in.

## Tests changed (owner-approved requirement)

Counts of 45 heroes became 54 (19 mana, 35 stamina); the traits' two-to-four became two-to-five; the combos' five-to-eight became nine; the
Vampire and batch tests now say the heroes have joined instead of waiting; the skill 3 test holds the first 45 as before. No test was
deleted or loosened beyond these counts.

## Load order

`kits/coming.ts` (the rows) imports `abilities.ts`, and `abilities.ts` imports `joinedKits` back. So `abilities.ts` does not read the rows while
it loads: the nine joined heroes' entries in `KITS` are getters over `joinedKits()`, installed at the end of the file and built on first use
(`HERO_KITS` takes `joinedHeroKits()` the same way, when it is first built). Either module may be loaded first; `coming-tune.test.ts` imports
the kits module first to prove it.
