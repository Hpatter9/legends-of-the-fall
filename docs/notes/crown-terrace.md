# Crown Terrace

The owner selected the fourth mockup, Crown Terrace, and authorised all necessary art, selectable animated heroes, complete ruler-specific scene changes, background buildings that grow with construction, and a PR. No merge or deployment was requested.

Branch: `art/crown-terrace`. Approved concept: `art-source/crown-terrace/approved-concept.png`. This is a concept, distinct from the real browser evidence under `docs/samples/crown-terrace/`.

## Implementation

- Eight entirely distinct painted environments: Crown Terrace, Serpent Palace, Crystal Citadel, Ember Bastion, Thorn Gallery, Star Observatory, Tempest Quarterdeck and Gilded Necropolis. Architecture, heraldry, landscape, lighting and atmosphere change with the existing global ruler setting. New seated ruler cutouts match each realm.
- Seventy portrait-referenced transparent court companions. Four owned heroes can be selected independently of battle parties, with duplicate selections swapping places. Automatic mode follows the strongest owned heroes and leaves genuinely empty places when fewer than four are owned. The optional `courtHeroes` setting survives reloads and malformed preferences are repaired at display time.
- Painted companion mesh animation keeps feet planted while the upper body breathes, cloth shifts and tapped companions bow in greeting. Ambient cloth, light, weather and Duchess bring the scene to life; no combat sheets or battle rules change. Reduced motion holds the scene still; hidden tabs, menus and documents pause continuous painting; saver caps painting at 30 FPS.
- All eleven kingdom sites have independent positions and three architectural art stages. Every completed level also increases its silhouette scale. Unbuilt sites are absent, active works display scaffold art alongside the old completed structure, and the target level appears only after the existing construction completion logic applies it. Building taps open the same standard ornate card as Buildings.
- The existing Buildings ledger, construction status, bonuses, Codex, trophies and Duchess's daily treat remain available. The ruler and companion selectors use the standard ornate menu.
- Production assets are copied into the service worker's file list. Original generation sheets, portrait references and packing script are retained; no remote image service is needed at runtime.

## Validation

In progress: focused tests, typecheck/build, three portrait browser runs, all-ruler/roster coverage, construction completion, reduced motion and offline reload. Final results and PR will be recorded before handoff.
