# ART-ASCEND — Upgraded forms and combat tier auras

Branch: `art/ascended-hero-forms`. Implementation in progress, not merged or deployed.

## Owner-approved direction

Awakening permanently upgrades each hero's equipment and appearance. The owner approved new legendary weapons/armour, glowing eyes for mages, and compact bodies and capes. The first step unlocks the evolved form; the second retains it and keeps its existing mechanical bonuses. The owner-approved painted class atlas from `art/painted-ascension-auras` (`a5ebb152`) now follows combat tier, on either form: tier 1 none, tier 2 light, tiers 3 and 4 strong. Tier 4 retains main's additional size, colour grading and promotion flourishes.

References: [initial concept](../samples/ascended-heroes/concept.png), [legendary gear](../samples/ascended-heroes/concept-legendary-gear.png), [approved compact direction](../samples/ascended-heroes/concept-compact.png). These are concepts, not game screenshots.

The owner also asked to distinguish the soldier/Knight from the Paladin, then supplied [the heritage art brief](heritage-art-prompt.md). The brief supplies the character identities and painting requirements; its separate artwork-only branch/PR procedure does not supersede the ongoing awakening implementation. Kwame (Knight) and Karim (Paladin) now have distinct appearances. The brief's fifteen identities are being applied to the awakened sheets and their base gallery illustrations. The existing `claude/heritage-looks` base sprite/name work is integrated, preserving all 45 personal names and its original 23 re-toned sprite assets.

## Current implementation

- All 45 heroes plus the Werewolf Brute and three Treants have newly generated front/rear artwork, each with eight walking poses and four idle/attack/hurt/death/ability frames. Both mirror directions remain available. Source atlases are ignored under `tools/ascended/source/`; production PNGs, metadata, briefs and packing/validation tooling are retained.
- Permanent forms resolve through `awakenLook.ts`, separately from `combatAuraStep`. Borrowed druid/werewolf shapes upgrade, while enemy disguises remain unchanged. No balance values, costs, save keys, or RNG rules change.
- Unit sprites, hero bar, bench and drag ghosts, Last Stand, camp/tavern/hall, party tableau, awakening cutscene/preview, run gear picker and recaps use the equipment look. Home scenes have no combat aura. Reduced motion and battery-saver handling remain in the existing aura renderer.
- Newly awakened sheets decode for saved awakened heroes and on demand before the first awakening preview; the whole additional roster is not decoded at startup. Their PNG files stay outside the script and are explicitly copied and cached by the service worker for offline use.
- Awakened menu portraits are extracted from actual production idle poses. The full-art viewer retains the painted illustration and offers an awakened-form toggle, so the new gear and the paintings can both be inspected.
- Current main through 0.226.0 (`e4a22a52`) is integrated, retaining four-tier combat, manual/Auto pair merges and the new short wave cards. `claude/heritage-looks` (`73db30af`) is integrated on this feature branch. No release version was bumped.

## Art packaging and review

`node tools/ascended/pack.cjs [ids...]` packages sources without repainting pixels: connected-component selection, hard alpha, uniform nearest-neighbour scaling and paired frame dimensions/ground line. `pose-selection.json` records conservative intact-pose substitutions; `extra-clips.json` supplies separately generated Peasant action poses where the original long polearm overlapped neighbouring cells. Knight shield defence aliases the physical ability row. `validate.cjs` checks emitted frames and writes actual-animation review contact sheets and an asset report.

The fifteen heritage paintings are being generated as scene/cutout pairs under ignored `art-source/heritage-heroes/`, following the provided identities, class equipment and cultural accents. The paintings are being checked against the existing anime gallery rendering before importing with `tools/heritage/import-art.py`. Final source and production validation is outstanding.

## Validation so far

- Typecheck passed after integrating main and the heritage branch.
- 49 targeted tests passed for awakening, auras/materials, permanent equipment selection, transformations/facings, original art rules, heritage looks/names and four-tier pair merging. Subsequent alias/viewer changes require the final targeted pass.
- Before the latest heritage artwork replacement, all 2,744 emitted animation cells across 98 sheets passed hard-alpha, dimensions, nonempty-frame and safety-margin checks, with no remaining automated review flags. The updated heritage sheets must be revalidated.
- Final build, browser review at 393x852, 360x780 and 412x915, actual first/second awakening, tier promotion, live combat, reduced motion, saved-state and offline checks remain outstanding. Tooling: `tools/ascended/checks.mjs`.

## Handoff

Continue packaging and reviewing the fifteen updated awakened sources, finish the fifteen gallery pairs (the selected anime revisions have `-anime` in the ignored source filename), run the importer, then complete validation and actual browser review. Do not claim this work is complete until those checks finish. No merge/deployment requested.
