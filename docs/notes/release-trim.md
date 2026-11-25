# The Assault withdrawn, and no cheats in any build (RELEASE-TRIM)

The owner, before the release: "Let's remove the assault mode. It doesn't work well yet." and the developer mode and cheats out. Both on
`claude/release-trim`, from 0.613.

## 1. The Assault, out

**Every way in is gone:**
- the War Room's Assault plate and its buttons (storm, resume, abandon, tribute, the Warband regrouped), and its unlock at ten stars;
- the war table and the muster;
- Settings › Developer › Try an Assault;
- the Assault's tutorial card;
- the codex's Holds tab;
- the conquered camp's banner at the camp;
- the "Remnants" and "Conquered" lines on an army's card.

**The code that only it used is deleted:**
- `src/sim/assault/` (29 files and the nine maps);
- the screens (`assaultView`, `assaultScene`, `assaultSim`, `assaultSave`, `gateDuelView`, `devAssaultView`);
- the worker (`assaultWorker.ts` and its own `assault-worker.js` bundle);
- the bench (`?bench=assault`);
- the field's renderer (`fieldView`, `fieldFx`, `fieldFxRules`, `fieldLooks`, `fieldLife`, `fieldCampLife`, `fieldCull`, `fieldDetail`, `fieldCampRules`);
- its sound (`holdSound.ts`, `setHold` and the rest in `sound.ts`, the beds' stand-in and drum line in `audioBeds.ts`, and seven
  ambience beds and nine one-shots no other place played);
- its tools (`tools/assault-ai`, `assault-dev`, `assault-skills`, the bench and balance in `tools/assault`, the hold-sound probe, the bench shots);
- its 40 test files, their kit (`assaultKit.ts`) and the codex-order check, which tested only the Assault's pieces. With the
  developer grant's test (section 3), 43 test files went, each testing only removed code.

**In the shared code:**
- The battle's field hooks (`fieldHooks`, `Battle.field`) and their branches go, as do the trait perks' field branches, the big field's
  walks in `path.ts` and the siege ladder in `board.ts`.
- Every branch removed was one an ordinary fight never took (`b.field` was always absent). The fingerprint of whole ordinary fights
  (`node tools/status-fx/logs.mjs`: eleven scenarios, from field fights to the Calamity) is the same before and after, hash for hash.
- The three looks helpers the boards borrowed from the field (`hash`, `noise`) moved to `render/tileNoise.ts`, unchanged.

**The Drill Yard went with it.** It was a castle building whose two rooms only drilled the Assault's recruits. Its card, plot, painting,
room icons and Crown Terrace landmark are gone, and the castle has ten plots. The art scripts no longer cut it.

**Kept, because something else uses it:**
- **The nine hold sheets** (`src/art/assault/`, 11 MB) are every land's floor, decals and set pieces on the ordinary battlefields
  (LIVING-FIELDS, LAND-IDENTITY), with their atlases (`render/assault*Atlas.ts`). Their folder keeps its name, so the cached URLs hold.
- **The War's end:** `War.end`, its scene and music (`warend.opus`), and the Council's end card (its words now in `sim/warEndLines.ts`).
  A save that ended the War at the Last Hold keeps all of it. Nothing ends the War now.
- **The Conquest chest** (`StashChest.conquest`): one won and not yet opened stays in the stash and opens as before.
- The `conquest` kind of the War's News, so an old save's News reads.

**What changes in play:**
- A conquered army's waves and its Council seats come back to the War: no army is "conquered" any more.
- The Informant no longer hands over the scouts' report.
- What the Assault paid is paid elsewhere, at the rate it came at (the owner keeps the earn rates unchanged): see the next section.

## What the Assault paid, paid elsewhere

The Assault paid about a fifth of a daily player's summoning stones, and much of their XP tomes: a hold's first Conquest chest (a gold
chest with half again its stones, and the 8 stones the hidden modes moved there), and the regrouped Warband's chest each week the hold was
stormed again at Mythic (a gold chest of the army at Mythic: half again its stones, half its crowns, with its tomes, gear, scrolls and ores,
and 1 moved stone). They are paid where every player reaches, at the same stage:

- **An army's Legendary first clear** (its tenth star, the moment its hold opened) pays the stones the hold's first fall paid: the
  Legendary first-clear chest holds 13 stones in place of 3 (`legendFirstStones`, `MOVED_STONES.legend`).
- **The regrouped Warband's chest** comes with the first daily cleared in a week (`warbandChests` in `modes.ts`): for each army at its tenth
  star, every second week (the army's turn by its place), the same chest the re-storm paid, as the model had it won one week in two.
  `MOVED_STONES.warband` (1) is its moved stone, as `restorm`'s was.
- A Conquest chest won before still opens exactly as it did.

`npm run unlock-pace` (20 seeds, 365 days, a daily player; the model now has the Legendary clear on the day it had the first conquest):

| a year | main (0.613, with the Assault) | the Assault removed, nothing moved | this branch |
|---|---|---|---|
| stones | 2,855 (54.8 a week) | 2,222 (42.6 a week) | 2,927 (56.1 a week) |
| of which the first conquests / Legendary first clears | 117 | 0 | 117 |
| of which the regrouped Warbands' chests | 519 | 0 | 594 |
| XP in tomes by day 365 | 2,134,000 | 718,000 | 2,264,250 |
| heroes owned on day 180 / 365 | 31 / 47 | | 31 / 49 |
| day the 30th / 45th hero joins | 162 / 336 | | 156 / 325 |

The Warbands' chests run about 2.5% of the year's stones above the old rate: they come from the tenth star, where the model had a player
storm the regrouped Warband only from day 90 and a month after the fall. That is within the model's spread between seeds (the 45th hero joins
between days 261 and 357).

## 2. Old saves

A save that played the Assault loads, and is paid back once (`sim/assaultGone.ts`, `settleAssaultGone`, run by the meta's reader before
the castle is read) for what it bought and can no longer use:

| what | paid |
|---|---|
| each soldier still standing in its platoons (ten a platoon at most) | 60 crowns, its price |
| each hold scouted and not conquered | 100 crowns, the scouts' price |
| each hold conquered | one last day's tribute (150 to 330 crowns by the army) |
| the Drill Yard, each level built, and a level being built | 500 and 1500 crowns, what it cost |

- A storming left under way is withdrawn, as the old page's "abandon" did: its fallen stay fallen, its survivors are paid above, and the
  stored battle (`legends.assault` in IndexedDB) is deleted.
- Siege works were only paid at the march, so nothing is owed for them.
- The save's `assault` and the castle's `drillYard` are dropped, and the page says once: "The Assault has been withdrawn for now: N crowns
  returned for ...". A save that never played it is not touched.

The 0.613 save in `test/fixtures/save-0613-assault.json` was made by 0.613's own code. It has 28 soldiers standing and 2 fallen in a
storming under way, two holds conquered, one scouted, a Drill Yard at level 1 with level 2 being built, and a Conquest chest. It loads
with 4103 crowns paid, once (and 0.613 reads it too). In the browser the notice shows over the loading screen, and the War Room,
Settings and the castle show nothing of the Assault (`docs/samples/release-trim/`).

## 3. No cheats in any build

- **The Developer page is gone from every build**, the web's and the GitHub app's too (STORE-DEV had taken it out of the store's only):
  the free crowns, shards and stones, Build Town (`sim/devGrant.ts`) and Try an Assault.
- **`?eidolons=all`**, which bound all six Eidolons and filled the War Horn, is gone.
- **The tools' hooks on the page** are put there only when the page is driven by a browser under automation (`toolHooks.ts`, `toolsOn`:
  `navigator.webdriver`, which the tools' Playwright sets and a player's browser never does). That covers `window.__game`, `__castSpell`,
  `__toolkit`, `__settleFinds`, `__toastLines`, `__popups`, `__screens`, `__waveNotes`, `__bfxMem`, `__hall`, `__tarot`, `__earned`,
  `__summonFx`, `__popupGuard`, `__audioDebug` and `__audioApi`. The forcing hooks, `__forceLucky` (lucky summons) and `__forceDrop`
  (a wave's drop), are honoured only then too, as are the test page's flags `?seed`, `?scenario` and `?duchess`. So every tool works as
  before, and a player's console finds no helper.
- **The Shop's fake store** (0.614: `?shop=fake` on the web build, where every purchase succeeds) answers only under automation too
  (`iapView.ts`); the tools' shop pictures keep it.
- The Android app's Back (`window.__phoneBack`) stays as it is: the app calls it.
- The save itself is plain JSON in the browser's storage, as it always was; a player who edits it by hand is not something the page can
  stop.
- The Updates and notes page still tells of the Assault and the Developer page in its old entries: that is the history, left as it was.

## Size

| | before (0.613) | after |
|---|---|---|
| `out/web`, what ships (no source maps; the APK keeps maps out) | 274,404,802 bytes | 272,419,586 bytes |
| saved | | **1,985,216 bytes (1.99 MB)** |
| with the source maps | 299,525,048 bytes | 290,915,027 bytes (8.6 MB saved) |

The saving: `assault-worker.js` (1.52 MB), about 394 KB of `game.js`, and the Drill Yard's two pictures (71 KB). The Play build's numbers are
the same, give or take four bytes. The hold sheets stay, since the battlefields draw from them.

## Checked

- `npm run typecheck`, `npm run web` and `npm run web:play`.
- The tests touched: `release-trim` (new), `store-dev`, `first-hour`, `summon-stones`, `nemesis-depth`, `phone-back`, `update-ready`,
  `audio-beds`, `hold-sound` (its four checks that still apply) and the full suite.
- The ordinary-fight fingerprint, unchanged.
- The 0.613 save in the page, and the War Room, Settings and the castle at 393 x 852, 360 x 780 and 412 x 915.
