# Deployment and remaining combat icons

Final agreed deployment/icon pass after the painted HUD, popups and reports. Branch: `design/painted-combat-hud`; worktree: `/workspace/legends-of-the-fall`.

## Implementation

- `src/paintedDeployment.css` carries the approved materials onto deployment's header, panel, Fight/Hire/Pack/Auto/Home, Formation, bench selection and merge/recycle cues. Hidden/unearned controls remain hidden. Auto merge now has a 44px target in the bench flow instead of overlapping the synergy line.
- Replaced the Auto/recycle SVG placeholders and bench rank glyphs with painted artwork. Battle synergy badges use painted motifs via `battleTraitArt.ts`; roster badge styling remains unchanged.
- Added 64 new painted motifs, bringing the combat library to 76. Related abilities intentionally share a motif rather than claiming 220 unique paintings. All 54 current hero kits, 220 distinct skill/ultimate/revive names and 312 name/key aliases have explicit assignments in `combatIconRules.ts`. Unknown future/custom skills have a painted elemental fallback.
- The original 21 king spells use painted motifs; the existing 14 painted school emblems are preserved. Wave/result-note marks are painted icons with the existing written labels.
- Removed the effect-atlas thumbnail paths from `fightHud.ts` and `spellIcons.ts`; battlefield animation/effect art itself is unchanged.
- New artwork is credited and copied/precached by the existing UI asset loop. Existing horn/repair art is reused. No simulation rules, save keys, version or reward settlement changed.

## Reproduction and coverage

`bash tools/painted-combat/import.sh` reproduces the materials and all 76 motifs, then regenerates the reviewed skill-name table. Source sheet order is in `tools/painted-combat/icon-sheets.json`; per-kit slots and trait assignments are in neighbouring JSON files. Review those assignments when changing a kit. The coverage test checks actual kit/spell/trait data against existing, square painting files.

Typecheck, web build and 60 relevant tests passed (`combat-icon-coverage`, `fight-hud`, `king-spells-b5`, `bench-drop`, `merge`, `recycle`, `featureUnlocks`, `wave-recap`, `jrpg-recap`). All 116 browser checks passed: 40 at 393×852, 38 at 360×780 and 38 at 412×915, with zero page errors or horizontal overflow. Deployment, selection, combat and icon galleries were visually inspected across the three sizes. Checks cover keyboard focus, 44px deployment targets, touch Pack access, hidden helpers, recycle confirmation/refund, Hire, merge, placement, real board-to-bench drag, Formation, skill/ultimate and king spell controls, reduced motion, all 76 decoded motifs and offline new artwork.

Browser command: `node tools/battle-hud/shots.mjs painted-finish finish`. The isolated review profile uses a duplicate bench and earned helpers to exercise selection, confirmation, Hire, merging, placement, return drag, Pack/Formation, Fight, skill/ultimate and king spell controls. Motif/king/note galleries are explicitly labelled review fixtures, not new product screens. Offline checks cover the new motif files.

## Handoff

No merge, PR or deployment performed. The agreed remaining deployment/icon scope is complete and ready for owner review; shared motifs are deliberate, and this does not claim a unique illustration for each skill or a replacement of battlefield/cinematic artwork. The roster keeps the owner's preferred earlier presentation.

## Authorised main integration

Owner requested merging the completed battle UI into main before tavern work. Integrated main 0.389.0, preserving its equipment, traveller and battle animation artwork. Release metadata is 0.390.0 with matching player-facing Updates notes. Shared painted materials and motifs are in `src/art/ui/combat-*.png`; source/import mappings remain under `art-source/ui/painted-combat/` and `tools/painted-combat/`. Standard ornate menus remain the basis for future tavern menus.

Integrated-release validation: typecheck, web build and 88 relevant tests passed. All 40 focused browser checks passed again at 393×852 with zero page errors, including the integrated artwork, real deployment interactions, reduced motion and offline access. Evidence: `docs/samples/painted-release-*`. Owner-authorised main merge: [PR #425](https://github.com/Hpatter9/legends-of-the-fall/pull/425), version 0.390.0.
