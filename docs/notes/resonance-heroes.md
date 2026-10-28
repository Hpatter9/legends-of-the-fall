# Resonance hero pilot — ART-001

Owner approved the pixel direction on 2026-10-28 after supplying Final Fantasy Resonance references, then accepted the implemented appearance and requested integration. The approved concept is [here](../samples/resonance/approved-concept.png); the [actual game portraits](../samples/resonance/in-game-preview.png) show the implemented result. Branch: `art/resonance-heroes`. Implementation accepted; prepared for the owner's merge through a pull request.

The soldier is the existing **Knight** (`knight`); the samurai archer is the existing **Archer** (`archer`). Both now use original generated pixel artwork: larger expressive heads, compact heroic proportions, strong outlines, rich highlights and saturated colours. Names, abilities, statistics and save identifiers are unchanged. The Knight has one shared design across grades, with the existing grade and awakening filters/glows providing progression, as with the previously remade heroes. The Archer keeps one design too.

## Assets and integration

- `src/art/units/hero_soldier.png`: four frames each of idle, walk, attack, hurt, dead and defend.
- `src/art/units/hero_samurai_archer.png`: four frames each of idle, walk, attack, hurt, dead and attack2.
- Both sheets have 192 × 128 cells, four columns and six rows. Figures face right, have hard alpha, and stand at the bottom of the cell. Death ends lying on the ground. The source art is generated; the packing step does not paint pixels.
- `src/render/sheets.ts` imports the new sheets as bundled data URLs. `src/sim/units.ts` changes only art mappings, Knight forms and draw scales. Soldier body height is about 50 world pixels; Archer body is about 50 with the bow extending higher. Existing Craftpix sheets and credits remain available.
- `CREDITS.md` records provenance. No reference screenshots or franchise sprites ship in the game.

The source atlases are preserved in `tools/resonance/source/`, and the approved concept is preserved with the evidence. Regenerate from the repository root:

```sh
node tools/resonance/pack.cjs soldier tools/resonance/source/soldier.png
node tools/resonance/pack.cjs archer tools/resonance/source/archer.png
```

Packing crops connected figures rather than blindly cutting at a column boundary: an extended sword can cross a nominal cell. The Archer uses measured horizontal gutters to preserve the tall bow and boots. Pixels are sampled with nearest-neighbour scaling and alpha is thresholded to 0/255. The Soldier's generated follow-through touched its neighbour; its last two attack frames instead use intact lowered-blade and ready poses from the same atlas. Source variations between poses remain visible; these are a first production art pass, not hand-polished animation.

## Validation

- `npm run typecheck` passed.
- `npm run web` passed, including a rebuild after the final animation selection.
- `npm test -- hero-art awaken class-heroes` passed all three affected files.
- `node tools/resonance/checks.mjs` passed: all 48 cells nonempty, within frame bounds, hard alpha, and sheet dimensions match metadata.
- Actual game roster, both dossiers, deployment and combat checked at 360 × 780, 393 × 852 and 412 × 915. Both new heroes were deployed at each size. No page errors or dossier horizontal overflow. Reduced-motion mode exercised. Portrait and combat screenshots are in `docs/samples/resonance/`; machine-readable results are in `checks.json` there.
- `git diff --check` passed.

The browser required execution outside the process sandbox because the sandbox blocks sockets; the local server and Chromium ran successfully with the approved escalation. New assets use the existing bundle/offline path; a fresh offline reload was not separately exercised.

## Accepted implementation integration

Integrated current main `587191f7` (0.179.0), preserving its hero kits, role descriptions, winding battle maps, castle, menus, chest changes and battle command HUD. Resolved the unit-definition conflict by retaining current main's complete definitions and changing only the two sheets/scales and Knight forms. Preserved both task-board histories. The new `hasSheet` renderer export remains intact.

Typecheck, web build, `hero-art`, `awaken`, `class-heroes` and `hero-kits-looks` test files passed on the integrated tree. The portrait, deploy and combat evidence was refreshed against 0.179.0 at all three supported sizes, with zero page errors. The version remains 0.179.0 so the director can select the release number at merge time under CLAUDE.md. No deployment has been performed by this chat.

Pull request: [#144](https://github.com/Hpatter9/legends-of-the-fall/pull/144). The second integration brought in the newly released battle command HUD without conflicts; typecheck/build were repeated and phone checks refreshed for that HUD.
