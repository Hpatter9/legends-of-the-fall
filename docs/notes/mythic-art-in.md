# Mythic art in

PR #440's ten images are in the game (the "Art that does not exist yet" section of `mythics-finish.md`).

- **Awakened paintings.** `art-source/mythics/awakened/<kind>.png` (768x1152) became `src/art/heroes/awakened-<kind>.webp` (640x960, quality 84, the
  portrait's frame). `heroArtwork.ts`, `sceneView.ts`, `ultMoment.ts` and `heroFaceRules.ts` no longer special-case Mythics, so the portrait, hero
  sheet, collection, codex, art viewer (with its "Show awakened form" button) and the HUD faces use it once awakened. The awakened paintings keep the
  base paintings' framing, so each Mythic's awakened face box equals its base one. The Mythic cut-in's whole painting (`mythicPainting(kind, awakened)`)
  switches too. `heroes/*.webp` is already copied into the service worker's list by `build.mjs`.
- **Battle sprites** stay the base ones (`AWAKENED_SHEETS_LATER` still holds the Mythics).
- **Showcase poses.** `art-source/mythics/poses/<kind>.png` became `src/art/ult-show/mythic-pose-<kind>.webp` (lossless, bundled into game.js, so
  offline). Each Mythic's showcase takes it as its `call` pose; `sky`, `burst` and `bless` now honour the `call` slot for the raise (as `pack` did).
- **Tests.** `test/awakened-forms.test.ts`: an awakened Mythic uses its awakened painting (face, cut-in), has the file and a showcase pose, and its
  sprites stay base.
