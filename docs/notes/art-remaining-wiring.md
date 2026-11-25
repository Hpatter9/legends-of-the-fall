# ART-REMAINING: wiring the art when it lands

This is the builder's brief for the art in [art-remaining-prompt.md](art-remaining-prompt.md) (rounds 4 and 5). Nothing in the game uses
that art until it is wired. For each piece:

1. Check it by eye at 2x, frame by frame: `python3 tools/pixellab/rows.py <sheet> out.png` lays every row out. Check that the gear,
   weapon, colours and size hold from frame to frame and row to row, that it faces the right way, and that it has no text. Ask for a
   redo rather than wiring a sheet that flickers.
2. Credit it in `CREDITS.md` as original work made for the game. The in-app Credits page's "Original art made for Legends of the Last
   Keep" entry (`src/data/credits.ts`) can name it in `includes`; `test/store-credits` must still pass.

A sheet the build imports into `src/render/sheets.ts` is listed in the service worker's files by the build itself (`ART_FILES`), so it
needs no hand entry. Check that `out/web/sw.js` names it after `npm run web`.

## Round 4

### The five quest guests

They are now drawn in heroes' sheets (`src/sim/units.ts`: `guestCarter` to `guestPrisoner`).

- Copy the ten sheets to `src/art/units/guest_<name>.png` and `guest_<name>_back.png`.
- Give each a layout in `sheets.json`: copy `hero_res_peasant`'s and `hero_res_peasant_back`'s (160 x 120, 4 a row, the seven rows).
  - The front's `rear` names its back sheet, and the back's `front` names its front.
  - Measure `figure` (`tools/pixellab/wire.py` does this).
  - The prompt's last row, the gesture, takes the `attack2` slot.
- Import the sheets and add their `URLS` entries in `render/sheets.ts`.
- Set each guest's `sheet:` and check its `scale`: the peasant's 0.4375 suits a 96 px figure.
- Then run `python3 tools/emit-points/reach.py`.
- A guest is not a foe, so `KIN_SHEET` is not needed. Check that `heroFacing.ts`'s rear view finds the back sheet.
- Tests: `test/emit-points`, the quest tests (`npm test -- quest`) and a quest battle with a guest at 393x852.

### The sentry turret

It now borrows `robot_infantry`, tinted steel (`units.ts` `sentry`; `PERK_TINTS.sentry` in `render/perkLookRules.ts`).

- Copy the sheet to `src/art/units/summon_sentry.png`.
- Its layout is 128 x 96, 6 a row, with the rows `walk` (the unfolding), `attack`, `idle`, `hurt` and `dead`. Those are the same row
  lengths as `robot_infantry` (6, 5, 6, 4, 5), so the prompt's "deploy" row is laid in the walk slot.
- Set `sentry.sheet` to `summon_sentry` and fit its `scale` to the old height on the board.
- Add `'sentry'` to `OWN_ART` in `perkLookRules.ts` so it is no longer tinted, and extend `test/trait-card.test.ts`'s own-art case.
- Its shot needs a `FOE_EMIT`-style point. It is a summon that shoots, which `test/emit-points` already reads: measure the muzzle on
  the release frame.

### The ghost ship

The Broadside's beat (`render/perkFxRules.ts`, `broadside`, a `sky` look) has no ship yet.

- Cut the two 512 px frames to WebP under `src/art/fx/perks/` (or `ult-show/`, beside the Dread Pirate's ship).
- Show the ship at the board's edge as the beat plays, the way `ultShow.ts` shows `dread-pirate-ghost-ship` (`fx.showProp`): frame 1,
  then frame 2 as the guns fire.
- Keep it still under reduced motion.
- If it loads by URL rather than through an import, add it to the build's files.

### Voltara's aftermath

- Save the strip as `src/art/eidolons/fx/voltara-after.webp`, cut as the other `*-after.webp` are.
- In `src/eidolonFx.ts`, change Voltara's `after: s('voltara-extra', ...)` to `s('voltara-after', 6, ...)`. Take the timing from
  `askel-after`'s and `nivra-after`'s.
- The Eidolon FX files are listed by `build.mjs` from `src/art/eidolons/fx/`, so check `sw.js` names it.

### Duchess's three cosmetics

The crown, the wizard's hat and the quiver are now pixels drawn with `fillRect` (`drawDuchessCosmetic`, `src/render/duchessRules.ts`).
`tavern.ts` and `duchess.ts` call it.

- Save the overlays as `src/art/duchess/cosmetic-<id>.png` (288 x 48, six frames).
- Draw the overlay frame that matches her own frame (`goatFrame`) at her frame's place and scale, in place of the hand-drawn pixels.
  Keep the function's name and arguments so its callers stay as they are.
- Her `face` picks the half of the strip already, so no mirroring is needed.
- Check her in the tavern, the castle and the camp at 393x852 with each cosmetic on.
- Leave the three shop costumes (`costume_*`, round 2) to the cosmetics builder.

## Round 5: the twenty's awakened forms

These heroes now fall back to their plain sheet when awakened: `awakenedSheet` returns the base sheet for a hero with no form in the
manifest (`src/render/awakenLook.ts`).

- The packer is `node tools/ascended/pack.cjs <kinds>`. It reads one source per hero, `tools/ascended/source/<kind>.png`: 8 cells
  across and 7 rows down, the front's four cells beside the back's four. Lay each pair of round-5 sheets side by side into that file
  (the front left, the back right).
- Add the hero to `tools/ascended/roster.json` (id, name, base and rear sheets; copy a neighbour's entry) and to `pose-selection.json`
  where the packer asks for it.
- The packer trims and aligns each pair, writes `src/art/awakened/awakened_<kind>.webp` and `_back`, and updates the manifest and
  `src/render/awakenedArt.ts`. `build.mjs` copies `src/art/awakened/` and lists it for the service worker.
- Tests: `npm test -- awakened` (`test/awakened-forms.test.ts` and its neighbours). Check an awakened hero of each of the twenty on
  the board and on its hero page at 393x852, front and back.

## Natsu's portrait

- From `art-source/fix/natsu-archer.png`, cut `src/art/heroes/archer.webp` (512 x 1024) and `archer-portrait.webp` (480 x 960) the way
  the other heroes' paintings were cut, at the same framing.
- Check her hero page and the Summon reveal.
