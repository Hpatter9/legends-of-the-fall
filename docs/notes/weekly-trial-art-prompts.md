# Weekly Trial: art prompts

The Weekly Trial (`docs/notes/weekly-trial.md`) needs one picture the packs and `src/art/` do not have: its own medallion for the camp
(over the Daily) and its card's tutorial. Until it lands, the painted cup of `ui/buttons/trophies.webp` (a camp medallion no screen used)
stands in; nothing is drawn in code.

For `hpatter9/legends-of-the-fall`, branch `art/weekly-trial`, files under `art-source/weekly-trial/`. Style: the game's painted brass
medallions (`art-source/ui/buttons/`, the camp sheet: the Daily's chest at sunrise, the Dark Council's throne), crisp edges, no text, no
logos, no watermark.

## The Trial's medallion

```text
Paint a round brass medallion for the Weekly Trial of Legends of the Last Keep, matching the camp medallions of art-source/ui/buttons/
(the same brass ring with its rivets, the same size, lighting and finish as the Daily's chest at sunrise and the Dark Council's throne).
Inside the ring: a stone arena gate under a dusk sky, two crossed swords before it and a laurel wreath hung over the crossing, a faint
seven-pointed star above the gate. Output art-source/weekly-trial/trial-medallion.png, 256 x 256, transparent background outside the ring.
Painted pixel art, crisp edges, no text.
```

## Once it lands

Cut it as the other medallions are (`tools/painted-buttons/cut.py`) to `src/art/ui/buttons/trial.webp`, add `'trial'` to the camp sheet's
names in `PB_ICONS` (`src/paintedButton.ts`), and use `pbUrl('trial')` where `home.ts` and `trialView.ts` use `trophies`, and
`ui/buttons/trial.webp` for the tutorial's `art` (`tutorialRules.ts`). The service worker lists every file under `ui/buttons/` already.
