# ART-FINAL: the last of the art in the game

The art of PR #704 wired, as [art-remaining-wiring.md](art-remaining-wiring.md) and
[weekly-trial-art-prompts.md](weekly-trial-art-prompts.md) say. The pictures are in `docs/samples/art-final/`, at 393 x 852:
- `node tools/art-final/shots.mjs`;
- Duchess by `OUT=docs/samples/art-final node tools/round4-wire/shots.mjs`.

## Round 5: the twenty's awakened forms

**Checked by eye:** all 40 sheets, front and back on each hero's own grid. Every cell is drawn and feet sit on the cell's bottom. The
gear holds from frame to frame, and the back sheets are three-quarter from behind, as the base sheets are. The art is soft-edged
(painted, not hard pixels), and the packer hardens it at alpha 128, as it did for every other awakened form.

**Packed:**
- `python3 tools/ascended/round5.py` lays each front and back side by side into the packer's source layout
  (`tools/ascended/source/<kind>.png`, not kept in git) and adds the hero to `roster.json`.
- `node tools/ascended/pack.cjs <kinds>` then writes:
  - `src/art/awakened/awakened_<kind>.png` and `_back`;
  - the manifest;
  - `src/render/awakenedArt.ts`.

  It packed 56 frames each, with no warnings.
- The roster's new `keepArt` keeps each of the twenty's painted awakened portraits (`src/art/heroes/awakened-<kind>.webp`). The packer
  would otherwise overwrite them with an enlarged sprite.
- `AWAKENED_SHEETS_LATER` (`render/awakenLook.ts`) now holds only the Mythics. Its own rule is that "a hero leaves this list when its
  awakened sheets are packed". With that, `test/awakened-forms` covers the twenty as it does the rest:
  - matched views;
  - a full eight-frame walk;
  - production assets.

**Shown:** awakened Vampire Lord, Seraph, Astral Sphinx, Harpooner, Plague Doctor, Nightstalker, Inquisitor and War Drummer in a fight.

## Natsu's cut-out

`art-source/fix/natsu-archer-cutout.png` (her action pose, on transparency) is cut with `tools/heritage/import-art.py`'s own
`solidify_interior_alpha` and `fit` (fitted inside 640 x 960, quality 94, alpha 100) to `src/art/heroes/archer-portrait.webp`. The
script's scene step is not run, because it would overwrite her painting and asks for a 2:3 scene.

Her face is re-measured in `heroFaceRules.ts`: `archer.art` is `[0.49, 0.155, 0.32]`. That framing is her face centred, with the helm
and the base of its crest, as before.

**Shown:** `natsu-card.png`, `roster.png`, and her face in the fight's rows (`awakened-*-fight.png`).

## Duchess's Tin Crown and Archery Quiver

The round-4 redos, checked in the camp at 393 x 852 (`camp-duchess-close.png`: plain, the Wizard Hat, the quiver, the crown):

- **The Tiny Tin Crown is wired** (`src/art/duchess/hat-crown.png`, through `duchessHats.ts` as the Wizard Hat is). It reads as a small
  tin crown with a red gem.
- **The Archery Quiver is not wired.** Its redo is a thin diagonal stick with red flecks across her neck. In the camp it does not read
  as a quiver, and the hand-drawn quiver (a brown case with fletchings) reads better, so that stays.

## The Weekly Trial's medallion

`art-source/weekly-trial/trial-medallion.png` is cut as the single medallions are (`tools/painted-buttons/cut.py`'s steps: trimmed to
its paint, squared, 96 px) to `src/art/ui/buttons/trial.webp`.

It is named in `PB_ICONS` (`trialMedal: ['trial']`) and used in place of the trophies' medallion it borrowed:
- the camp's Trial plaque (`home.ts`);
- the Trial's card (`trialView.ts`);
- the Trial's tutorial (`tutorialRules.ts`).

The service worker lists every file under `ui/buttons/` already. **Shown:** `camp-trial.png`.
