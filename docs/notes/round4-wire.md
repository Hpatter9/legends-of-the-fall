# ROUND4-WIRE: round 4's art in the game

Round 4 ([art-remaining-prompt.md](art-remaining-prompt.md), PR #686, `art-source/round4/`) wired as
[art-remaining-wiring.md](art-remaining-wiring.md) says. The pictures are in `docs/samples/round4-wire/`
(`node tools/round4-wire/shots.mjs`, 393 x 852).

| Piece | Files | Wired |
| --- | --- | --- |
| The five quest guests, front and back | `src/art/units/guest_<name>.png`, `_back.png` | `sheets.json` (the peasant's grid, 160 x 120; each front names its back); `units.ts` `guestCarter`...`guestPrisoner`, scale 0.4 for their 104 px figures |
| The Machine's sentry turret | `src/art/units/summon_sentry.png` | its rows are `deploy` (the unfolding), `attack`, `idle`, `hurt` and `dead`. It never walks, so `walk` is an alias of `idle`. `units.ts` `sentry` at scale 0.55. `'sentry'` is in `OWN_ART` (`perkLookRules.ts`), so it is not tinted. Its shot leaves the barrel (`FOE_EMIT`, anchors) |
| The Pirate's ghost ship | `src/art/ult-show/pirate-ghost-ship.webp`, `-fire.webp` | the Broadside's beat (`fx.ts`). The ship rides over the middle of the raked file, above its word, at rest for 0.7 s, then with every gun port flashing for 1.4 s. It drifts a little, and is still for reduced motion |
| Voltara's aftermath | `src/art/eidolons/fx/voltara-after.webp` | `eidolonFx.ts`, in place of the reused `voltara-extra`. The strip is drawn small in its cell, so it is shown at 1.8 on the foes' ground (the other aftermaths are 0.7 to 0.9). It reads once the storm clears (`voltara-aftermath.png`) |
| Duchess's Wizard Hat | `src/art/duchess/hat-wizard.png` | `duchessHats.ts` gives `drawDuchessCosmetic` a drawer (`HAT_ART`). It lays the strip frame for the way she faces over her, wherever she is drawn: the camp, the tavern, her card and the Crown Terrace. The hand-drawn pixels stay only as the fallback until the strip loads |

**The Tiny Tin Crown and the Archery Quiver are not wired.** At her size the crown's painting is a dark grey lump with a red dot, and
the quiver reads as a wooden frame or ladder across her body (the director's look). Their hand-drawn versions stay; a redo goes into a
prompt.

**The Duchess change is small**, so it merges cleanly with `claude/cosmetics`. `duchessRules.ts` gains the `HAT_ART` hook, a few
lines at the top of `drawDuchessCosmetic`. `duchess.ts` imports `duchessHats.ts`. Every caller of `drawDuchessCosmetic` is unchanged.

**Tests:**
- `test/trait-card` now also checks that the sentry is not tinted.
- `test/emit-points` reads the sentry's point, as a perk summon that shoots.
- `test/eidolon-fx` checks Voltara's new strip, which is a lossy WebP with alpha like the rest.
