# ART-002 — full roster and four facings

Owner requested all remaining heroes in the approved Resonance pixel style, then added four-direction animation and explicitly grounded walking. Branch: `art/resonance-roster`, based on the accepted pilot in PR #144. Work in progress; do not merge or deploy this checkpoint.

Scope: 45 collectible heroes, with matching front/rear art mirrored left/right to cover all four isometric facings. Preserve identities, stats, kits, saves, enemy art and unrelated UI. Additional Werewolf Brute/awakened art and three Treants preserve hero transformations. The small/medium/large body bands remain 42/50/60 world pixels.

## Durable generation state

Source files in `tools/resonance/source/` are the local recovery record; skip existing files when resuming. `roster.json` lists the43 remaining heroes; `variants.json` lists five supporting appearances. The two pilot sources are `source/soldier.png` and `source/archer.png`.

- `source/roster/`: all48 new front atlases saved.
- `source/turning/`: rear atlases, partly generated. Earlier atlases use their last row for a front walk; later atlases have adjacent JSON marking `fullRear` with a true rear cast row.
- `source/walk/`: dedicated eight-frame front/rear walking cycles, partly generated. `pose-guide.png` is assembled from the original Knight walk as a pose reference; preserve the generated hero design rather than its older proportions.
- `rear-prompt.txt` and `walk-prompt.txt` preserve the generation instructions. Raw artwork remains locally available for corrections; the packed sheets and prompts are committed. Raw roster/turning/walk intermediates are ignored to avoid adding hundreds of megabytes to Git.

Some initial four-frame walks repeated one leg. They are being replaced with eight-frame contact/down/passing/lift phases for each leg, using dedicated walking atlases. Walking remains unvalidated until reviewed as a loop. Flat-ground hop is reduced; walk playback follows tile movement progress. Isometric facing respects section rotation. Eight-frame rows continue onto a reserved `_walk` row, with renderer and small-rig support.

## Remaining implementation and validation

Finish missing rear/walk sources. Pack, inspect flagged overlap/cropping, and wire every new sheet and hero appearance. Trim transparent frame padding and avoid loading obsolete hero textures. Keep original sheets for foes and original credits. Review actual four-facing walking loops and representative species, all45 portraits and combat at360×780,393×852,412×915, transformations, reduced motion and offline reload. Run typecheck/build and affected tests; record actual results here. No final checks have passed for this unfinished full-roster change.
