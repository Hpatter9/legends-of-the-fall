# FIXES3 — the old map over the new one, the walk between waves, the Paladin's colours

Branch: `claude/fixes-map-walk-paladin`. Three owner fixes.

## 1. "Sometimes the old map stays when I go play a new map: it overlaps it"

**The path that caused it: the Calamity's map (`#towerMap`, `towerView.ts`) left open.** The map is a full-screen page at
z-index 5, above the home screen (4) and the canvas. It was only ever shut by its own buttons (Home / ×, a spot's fight, the
run's summary). Any other way to the home screen (a `home.open()` from a callback, a quest or reveal finishing after the
map came back up, the result of a fight that reopened it) put the home screen *under* the map, and every mode begun from
there (an army, the daily, the Last Stand, a quest battle) was then drawn under the old map: the old map stayed over the
new one. Reproduced in the browser: Calamity map → home → army, daily or Last Stand all left the map on top.

**The fix: one screen at a time.** `TowerView.dismiss()` saves the run's slot (as the map's own Home button does) and
shuts the map; it is called whenever another screen takes over:
- in `newBattle` (every fight of every mode begins there; a tower or Calamity fight shuts its map first anyway, so it is a
  no-op for them),
- in `hideBoard(true)` (the Last Stand taking the canvas),
- when the home screen is shown (the `home` observer in `main.ts`): the home screen shown is the home screen seen.

The board itself was checked the same way and was clean in every order tried: `BoardView.build` destroys the old columns,
`ChainView.sync/clear` replaces the finished sections, the Stand's field is hidden when it leaves, and the cinematics' canvas
is destroyed when a scene ends.

**The check:** `node tools/fixes3/maps.mjs [port] [--shots] [--cal]` (after `npm run web`) plays the page through many
switches (home → army → home → daily; army mid-fight → home → daily; the walk to the next wave cut short → another army;
army → Last Stand → army; Calamity map → home → army / daily / Last Stand; Calamity fight → home → daily ...) and after
each looks for leftovers: stray layers on the board, a board drawn that is not the one in play, an old section or
another road's finished sections left drawn, fighters drawn that are not in the fight, the Last Stand's field or page
outside the Stand, and the Calamity's map over anything but its own run. Before the fix five Calamity steps failed; after
it every step is clean. (The map is DOM, so this one has no pure test.)

## 2. "Make the heroes the same fast speed at the end of round when they go to the next section"

The walk between waves is drawn only (`render/chainView.ts`; the sim knows one section at a time), so no fight changes.
- **The same brisk pace for everyone:** a step takes `WALK_STEP_MS` (230 ms, `render/dropRules.ts`) for every hero. It was
  `stepMs(moveMs)`, the hero's own pace (230 to 420 ms a tile), so a Knight or Paladin took nearly twice as long as a
  Kunoichi.
- **Climbing costs nothing extra:** `walkAcross` (`sim/chain.ts`) is now the fewest tiles (a plain breadth-first walk, the
  directions in a fixed order, so the same every time) with a stride of `WALK_JUMP` (`FLY_JUMP - 1`: any hill, never deep
  water or scenery). It was the combat walk's cheapest path for the hero's own `jump`, which sent slow climbers the long way
  round the hills. The combat walk (`path.ts walkFrom`, `canStep`) is unchanged.
- Tests (`test/long-map.test.ts`): the rule "a walk step lasts a hero's own pace" was replaced, on the owner's ask, by
  "every hero walks between waves at the same brisk pace"; new: "the walk between waves takes the fewest tiles: a hill in
  the way is walked over, not round" (never longer than the old jump-2 walk, a tile at a time, never on deep water or
  scenery, and some walks climb steps a jump-2 walker could not). Identity tests are untouched (no sim rule changed).

## 3. "Paladin is off in colour too"

**What was off:** his plain sheet was another man. The game bundles `hero_res_paladin_olive.png`: a pale, blond, blue-eyed
anime youth that the heritage tool had re-toned to olive skin and brown hair, which left a greyish, muddy face and hair.
He awakens into (and his painted portrait shows) a bearded man with dark brown hair and warm olive skin, in gold plate.
The same mismatch the Knight had before 0.265.0.

**The fix, as the Knight's:** `python3 tools/paladin/plain.py [--preview DIR]` makes the plain front and back sheets from
`src/art/awakened/awakened_paladin(_back).png`, frame for frame:
- the gold plate, trim, belt and mace (and the mace's orange glow) become plain steel, each pixel keeping its lightness;
- the head is kept exactly as painted: the hair (the largest solid patch of dark brown in the frame) and the face and
  beard grown from it within a face's reach (the skin's hues are the gold plate's too, so it is found by where it lies);
- the gold sign on the shield (and on the cape from behind) stays gold: the gold inside the shield's blue field;
- the blue and white cloth is unchanged.

It reuses the Knight tool's helpers (`tools/knight/plain.py`). The sheets take the awakened grid: `hero_res_paladin` and
`_back` in `src/art/units/sheets.json` are 138 x 127 cells (were 162 x 120), with the same rows, frame counts and figure
(96), so he stands the same size. The `_olive` copies the game bundles are the plain sheets (the awakened sheets carry his
tone already), and `tools/heritage/recolour.py` now skips him (`DRAWN_IN_TONE`). The portrait is unchanged: it already
shows this man. Test: `test/paladin-sprite.test.ts`.

Review: [front, before / after / awakened](../samples/fixes3-paladin-front.png),
[back](../samples/fixes3-paladin-back.png), in the game at
[393x852](../samples/fixes3-paladin-393.png), [360x780](../samples/fixes3-paladin-360.png),
[412x915](../samples/fixes3-paladin-412.png).
