# Complete hero sprite remakes

Owner: Codex. Branch: `audit/hero-repaint-faces`. Worktree: `/workspace/legends-of-the-fall`.

The owner requests complete remakes of all ten automatically repainted heroes: Cleric, Buccaneer, Fire Wizard, Illusionist, Time Witch, Peasant, Ranger, Queen Dragoon, Lightning Mage and Great Sage. Knight and Paladin already have replacement artwork.

Scope: new portrait-led character designs and full front/rear battle animations, preserving intended identities and skin tones. Completion requires approved visual direction, consistent faces/equipment across real animation frames, correct sheet layouts and production wiring, affected tests, typecheck/build and in-game portrait-size review.

First review proposal: [Selam / Cleric](../../art-source/hero-remakes/selam-concept.png), original generated concept art made for this project. References: existing `src/art/heroes/cleric-portrait.webp` and current Knight/Paladin plain-sprite previews. The concept translates braids, ivory hood, teal/gold robes, book and censer into a compact battle character. Four isolated poses demonstrate idle, walk, strike and rear; this is a design board, not a production animation sheet. It still requires pixel-scale and motion validation.

Status: owner approved the direction; all ten remakes are implemented. Twenty production front/rear sheets contain 560 frames: four idle, eight walking, four attack, four hurt, four death and four ability poses per view. All preserve the existing hero IDs, simulation values, figure heights, size bands and awakened artwork. The only bundle-map change adds the Cleric rear compatibility copy.

## Packaging and selected poses

Sources remain under `art-source/hero-remakes/`; [packing instructions](../../tools/hero-remakes/README.md) and `briefs.json` preserve the design and review workflow. `pack.py` extracts complete connected figures, hardens alpha, applies shared nearest-neighbour scales to paired views and preserves horizontal source anchors. The old tone filenames are byte-identical copies; `recolour.py` skips all ten heroes, so running the old command cannot filter their new faces again.

Malia's source contains eight rows; the last supplies her ability. Her rear death sequence holds the intact lying pose instead of returning to a seated pose. Mage attacks select intact casting gestures from their ability rows to avoid duplicated staffs. Selam's separate front/rear attack clip supplies her physical attack and Smite, replacing the first take's duplicated mace. Selection indices and source hashes are recorded in each hero's packing report and `pose-selection.json`; no missing limbs or weapons are painted procedurally.

## Review evidence

- [Actual production lineup](../samples/hero-remakes/lineup.png): idle, walk, attack and final death, front and rear for all ten.
- [Selam walk](../samples/hero-remakes/cleric-0-walk.gif) and [attack](../samples/hero-remakes/cleric-0-attack.gif), from the packed cells.
- Per-hero front/rear contact sheets and walk/attack/death GIFs: `docs/samples/hero-remakes/`.
- [Real game group 1](../samples/hero-remakes/browser/group-0-facing-393.png) and [group 2](../samples/hero-remakes/browser/group-1-facing-393.png).
- [Combat](../samples/hero-remakes/browser/combat-393.png) and [offline reload](../samples/hero-remakes/browser/offline-393.png).

## Validation

- `python3 tools/hero-remakes/validate.py`: 20 sheets / 560 frames pass dimensions, hard alpha, nonempty cells, safety margins, eight distinct walk poses, horizontal final death bounds, distinct rear views and compatibility-copy checks. Visual review separately verifies the corpse poses; bounding-box ratios alone cannot identify a seated figure reliably.
- `python3 tools/heritage/recolour.py`: all twelve heritage heroes skipped; map retains all 24 compatibility files.
- `npm run typecheck`: passed.
- `npm test -- heritage-looks knight-sprite paladin-sprite resonance-facing hero-art hero-kits-looks awaken`: 45 passed.
- `npm run web`: passed.
- Browser review: 393×852, 360×780 and 412×915 passed: ten dossiers and 320 walk-frame/facing checks per size (30 dossiers / 960 frame checks total), combat, party and reduced motion; controlled offline reload passed at 393. No page errors. Initial unseeded review was blocked by the new-save summoning overlay; the corrected review seeds a started save before loading the game. Final results are written to `docs/samples/hero-remakes/browser/checks.json`.

No release version bump, merge or deployment performed. The remakes replace the plain forms; existing awakened assets remain as before. Small sprite faces still have deliberately limited detail at battle scale, so inspect the enlarged frame contacts and the real game screenshots together.
