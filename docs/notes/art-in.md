# Art in: tactic icons and the Nemesis War's art

Merged `art/tactic-icons` (#400) and `art/expansion` (#399) and put the art to use.

- **Tactic icons.** `build.mjs` already served `art-source/ui/tactics/<id>.png`; I brought them down from 256 to 96 px into `src/art/ui/tactics/` (which the build prefers), so the offline cache is lighter. `#tacticBtn` shows the current tactic's icon with its word under it (checked in `docs/samples/art-in/tactic-button-393.png`).
- **Cuts** (`src/art/expansion/`, from `art-source/expansion/`): the four badges are 176x224 crops of the 256 cells, at 88x112 (nearest); the two taunt banners and the duel banner are trimmed, then webp. All cuts are clean (transparent edges, nothing clipped). `src/expansionArt.ts` imports them, so they are bundled as data URLs and need nothing in `FILES`.
- **Where.** Rank badges: the Council board's seats and scout rows (`nemesisView.ts`; the warchief's badge replaces the old crown) and above the nemesis name plate in the fight (`render/unitView.ts`, loaded as an image, then a Pixi sprite). The Council medallion is the camp Council button's picture (`home.ts`). The duel banner is the crest on the duel card (`duelView.ts`). The foe and hero taunt banners replace `ui/ribbon.png` behind the two bands (`tauntCut.ts`, `nemesis.css`); text stays on a light dark wash so it reads.
- Nothing new moves, so reduced motion needs nothing more. Taps are unchanged (seats and the Council button were already 44 px or more).
- Screenshots at 393x852 are in `docs/samples/art-in/`.
