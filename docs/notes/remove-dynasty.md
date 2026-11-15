# REMOVE-DYNASTY: the Dynasties taken out

The owner's ask: "lets take out the plan of the characters having heirs and heroes dying off permanently. no houses or anything like
that". The Dynasties expansion (phases 5 to 7 of `docs/design/legends-expansion.md` section 9: `docs/notes/dynasty-5.md`, `dynasty-6.md`,
`dynasty-7.md`, `dynasty-art-finish.md`) is out of the game: its code, views, scenes, art and tests are deleted, not hidden behind a switch.
Those notes stay as the record of what was built.

**No hero ever dies for good.** A hero that falls in a fight is down for that fight only, under the ten lives (`docs/notes/ten-lives.md`):
a life raises it, and with none left it stays down until the wave ends. Wounds (`wounds.ts`) only start it at half health in the next wave.
Nothing else in the game kills or retires a hero for good; the Hall of Legends' retirement (below) is undone by a recall.

## What went

- **The seasons and the Year of the War**, the season's chip on the camp's top bar and the Seasons' card.
- **Bearers, ages and life stages** (Youth, Prime, Veteran, Elder), their memory, and the veteran's and elder's looks (the colour grade
  on the battle sprite, the camp's roaming heroes and the portraits: `AGE_LOOKS`, `lookMatrix`, `setAgeLooks`, `ageFilter`, `gradeSmall`).
- **Elder's Counsel** (+5% XP) and **the Heir's Promise** (+25% XP), out of the page's XP chain.
- **Heirs**: naming one, the training, the candidates and their names, the heir's looks (`HEIR_LOOKS`), **the Mantle** with the
  birthright, **heirlooms** (`Equipment.heirloom`, +3% a mark, never sold), the Blood Grudge (`NemSnap.blood`, `BLOOD_GRUDGE`), the
  elder's honours, fielding the elder (the party picker's banner), the cadets, the ten heir scenes (and their lines in
  `docs/lines/new-lines.json`) and the one-time note to the Hall's mentors.
- **The Legend Oath** (the March orders' section, `Run.oath`), slain bearers, mourning (the army party less the mourners), foundlings,
  Legend renown, the Legend-slayer (its +2 Might and epithet, and the nemesis trait and its symbol), and the Oath's pay.
- **The Shades on the War Horn** (`SHADE`, `armShade`, the riders, `UnitNem.doomed` and the Council's "cannot cheat death"), the Shades'
  card and the Shade's short call.
- **The tavern's ghosts** and **the Elders' table** (its button, its story a day, its guest ride).
- **The Houses page** with its filters ("The fallen" among them), a line's page, a bearer's card, and the hero sheet's House row.
- **Art**: the season and fate icons, the House and heirloom paintings, the Houses' backdrop (and its ALIVE scene), the heirloom frame
  and signet chip, the Elders' table, the Legend-slayer's symbol. Their sources stay in `art-source/`. CREDITS.md says what left.
- **Tools**: `tools/dynasty/` (the saves, shots and the Oath's pay), the `--birthright` flag of `npm run balance`, the `:shade` call of
  `--eidolon`, `--counsel` and `--promise` of `npm run level-pace`, `--heirloom` of `tools/gear-balance.ts`; the Houses' scenes of the art checks.

## What stays, and how

- **The Hall of Legends** (`legacy.ts`): it is older than the Dynasties (DEPTH-BUILD) and its retirement is undone by a recall, so it
  is not a permanent loss. Only the Dynasties' part of it went: a mentor seated as an elder "with its line going on through an heir".
- **The War Horn and the Eidolons**, everything but the Shade.
- **The Nemesis War**: the twelve trait symbols and the Council's backdrops stay where they are (`src/art/dynasty/`, by their old name);
  a nemesis's blood-oath brother is the Council's own, not the Dynasties'.
- **The heroes' heritage looks** (`HERO_LOOKS`, the re-toned sheets) are older than the Dynasties and stay.
- **The tavern's painted button for the Elders' table** stays in the button sheet's slice list (`paintedButton.ts`), unused, so the
  other slices keep their places.

## Saves

A save made before the removal loads cleanly, and **no hero progress is lost**: everything lasting of a hero was always keyed by its kind
(XP and level, ranks, awakening, talents, books, gear and skill use), and a slain bearer was only a person in `Meta.dynasty`. Slaying one
touched the Dynasties' record and the run's squad and nothing else; mourning only kept the kind out of the army's party for three days.

- `Meta.dynasty` is dropped as the save loads (`loadMeta`).
- A mentor seated as an elder (`mentors[c].heir`) is let go from its seat with no wait on it (`readMentors`), so its kind, which stayed
  in the party through its heir, stays there and fights. A mentor seated the ordinary way keeps its seat.
- An heirloom's marks are not read (`readEquipment`): the piece is kept, worn as it was, an ordinary piece without its +3% a mark.
- The War Horn's chosen Shade is not read (`readEidolons`); the horn keeps its fill and its Eidolon.
- A run saved under the Oath marches on free of it (`catalogueRun` drops `oath`, `slain`, `oathFalls`, `oathWave`): a hero slain in it
  may join the squad again.
- A run's saved nemesis snapshot with a Blood Grudge keeps the field, which nothing reads.

`test/remove-dynasty.test.ts` loads such a save (the knight's line on its third bearer, two slain under the Oath, the House in mourning,
an heirloom, a Shade chosen, the samurai's elder in the Hall with its heir) and finds every hero there, at its level, shards and gear, the
mentor let go, the horn as it was, and nothing of the Dynasties written back; it loads a run saved under the Oath and fields its slain
hero; and it checks a party all down at a lost wave's end may all join the next fight.

## Size

`game.js` was 8,581,115 bytes on main (0.604.0) and is 8,365,294 now: **215,821 bytes (211 KB, 2.5%) smaller**, 134,041 bytes smaller
gzipped (4,227,074 to 4,093,033).

## Checks

- `npm run typecheck`: clean. `npm run web`: built. The full `npm test`: 3,419 tests, all passing.
- `node tools/remove-dynasty/shots.mjs` (after `npm run web`) loads the old save above and photographs the camp, the Heroes tab, the
  knight's sheet, the War Council's party picker and the War Horn's card at 393x852, 360x780 and 412x915 into
  `docs/samples/remove-dynasty/`. It fails on a page error, a page that scrolls sideways, or any of the Dynasties' words on a screen;
  none did at any of the three sizes. The 393 px shots are kept in the repo (the others are left out for size; the script makes them
  again). The knight, whose bearers were "slain", is in the company at level 72, and the samurai, the elder seated in the Hall, is
  back in the party at level 65.
