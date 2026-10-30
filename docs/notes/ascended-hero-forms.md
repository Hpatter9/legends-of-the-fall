# ART-ASCEND — Upgraded forms and combat tier auras

Branch: `art/ascended-hero-forms`. Implemented and validated; ready for owner review. Not merged to main or deployed.

## Owner-approved direction

Awakening permanently upgrades each hero's equipment and appearance. The owner approved new legendary weapons/armour, glowing eyes for mages, and compact bodies and capes. The first step unlocks the evolved form; the second retains it and keeps its existing mechanical bonuses. The owner-approved painted class atlas from `art/painted-ascension-auras` (`a5ebb152`) now follows combat tier, on either form: tier 1 none, tier 2 light, tiers 3 and 4 strong. Tier 4 retains main's additional size, colour grading and promotion flourishes.

References: [initial concept](../samples/ascended-heroes/concept.png), [legendary gear](../samples/ascended-heroes/concept-legendary-gear.png), [approved compact direction](../samples/ascended-heroes/concept-compact.png). These are concepts, not game screenshots.

The owner also asked to distinguish the soldier/Knight from the Paladin, then supplied [the heritage art brief](heritage-art-prompt.md). The brief supplies the character identities and painting requirements; its separate artwork-only branch/PR procedure does not supersede the ongoing awakening implementation. Kwame (Knight) and Karim (Paladin) now have distinct appearances. The brief's fifteen identities are applied to the awakened sheets and their base gallery illustrations. The existing `claude/heritage-looks` base sprite/name work is integrated, preserving all 45 personal names and its original 23 re-toned sprite assets.

## Current implementation

- All 45 heroes plus the Werewolf Brute and three Treants have newly generated front/rear artwork, each with eight walking poses and four idle/attack/hurt/death/ability frames. Both mirror directions remain available. Source atlases are ignored under `tools/ascended/source/`; production PNGs, metadata, briefs and packing/validation tooling are retained.
- Permanent forms resolve through `awakenLook.ts`, separately from `combatAuraStep`. Borrowed druid/werewolf shapes upgrade, while enemy disguises remain unchanged. No balance values, costs, save keys, or RNG rules change.
- Unit sprites, hero bar, bench and drag ghosts, Last Stand, camp/tavern/hall, party tableau, awakening cutscene/preview, run gear picker and recaps use the equipment look. Home scenes have no combat aura. Reduced motion and battery-saver handling remain in the existing aura renderer.
- Newly awakened sheets decode for saved awakened heroes and on demand before the first awakening preview; the whole additional roster is not decoded at startup. Their PNG files stay outside the script and are explicitly copied and cached by the service worker for offline use.
- Awakened menu portraits are extracted from actual production idle poses. The full-art viewer retains the painted illustration and offers an awakened-form toggle, so the new gear and the paintings can both be inspected.
- Current main through 0.230.0 (`58d38bc8`) is integrated, retaining four-tier combat, manual/Auto pair merges, short wave cards, tier-skill fixes and the foreground summon reveal. `claude/heritage-looks` (`73db30af`) is integrated on this feature branch. No release version was bumped.

## Art packaging and review

`node tools/ascended/pack.cjs [ids...]` packages sources without repainting pixels: connected-component selection, hard alpha, uniform nearest-neighbour scaling and paired frame dimensions/ground line. `pose-selection.json` records conservative intact-pose substitutions; `extra-clips.json` supplies separately generated Peasant action poses where the original long polearm overlapped neighbouring cells. Knight shield defence aliases the physical ability row. `validate.cjs` checks emitted frames and writes actual-animation review contact sheets and an asset report.

The fifteen heritage paintings are imported as scene/cutout pairs under ignored `art-source/heritage-heroes/`, following the supplied identities, class equipment and cultural accents. `prepare-heritage.py` preserves the raw paintings and restores transparent 2:3 margins before the existing importer creates the 30 production WebPs. `heritage-sources.json` records selected source hashes. The uploaded fifteen-person brief includes Karim; it is retained here rather than the fourteen-person prompt later merged on main. Gallery contacts: [1](../samples/ascended-heroes/heritage-gallery-1.jpg), [2](../samples/ascended-heroes/heritage-gallery-2.jpg), [3](../samples/ascended-heroes/heritage-gallery-3.jpg).

## Validation

- Typecheck and web build passed after integrating main 0.230.0; the release version is inherited, not bumped by this worker.
- 105 affected tests passed: awakening/forms, painted auras, transformations/facings, original art rules, heritage looks/names, four-tier merging, party/scenes, battle flow, tier skills, recap and identical ailment logs.
- All 2,744 animation cells across 98 sheets passed hard-alpha, dimensions, nonempty-frame and safety-margin checks, with no remaining automated review flags. Total decoded upgraded art is 166.92 MiB if every form is loaded; runtime loads the owned awakened forms and supporting transformations only.
- The final integrated-build three-size browser pass verified 45 hero dossiers at 393x852, representative dossiers at 360x780 and 412x915, 1,760 facing/walk checks, 26 class/step combinations, both awakening steps, tier promotion, four supporting transformations, base/awakened auras, live combat, Last Stand, reduced motion and offline reload. The fresh-save check confirmed no upgraded sheets are requested on startup, exactly two Knight sheets load for the first awakening, and the purchase survives reload. No page or console errors occurred. See [results](../samples/ascended-heroes/browser/checks.json), [awakening](../samples/ascended-heroes/browser/awakening-393.png), [combat](../samples/ascended-heroes/browser/combat-393.png), and [offline gallery](../samples/ascended-heroes/browser/offline-393.png).

## Handoff

All fifteen illustrated scene/cutout pairs are imported, including Kian's final illustrated revision. No known implementation blockers remain. Review the compact equipment forms and the three gallery contacts for aesthetic acceptance. Tooling: `node tools/ascended/checks.mjs`; outputs are in `docs/samples/ascended-heroes/browser/`. No merge to main or deployment requested.
