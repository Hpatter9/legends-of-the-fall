# Painted hero weapon repairs

The owner confirmed the painted-art findings and requested redraws. Six full illustrations and two transparent menu cutouts are repaired on `audit/painted-hero-weapons` in `/workspace/legends-of-the-fall`.

## Second pass — Mercenary and Peasant

The owner correctly identified residual bends in the first repairs. The earlier claim of fully straight axes was too strong. Both scenes were regenerated with complete replacement weapons and permission for the hands to follow the new geometry. Mercenary grip/pommel moved down to continue the blade axis; Peasant shaft replaced from butt to socket, with both hands repositioned. Original character identities, scenes and dimensions retained. Other six repaired assets are unchanged.

The second-pass PNGs are `exec-e046c33f-043a-4dcd-a250-eb87fcca6bba.png` (Mercenary) and `exec-fed41d7c-b6e7-47eb-987e-f226cc871ae3.png` (Peasant), retained under `/workspace/generated_images/`. The provenance JSON now maps to these sources and retains the first-pass source paths. Pre-second-pass WebPs are retained under `/workspace/art-audit/before/*-first-repair.webp`.

Typecheck and web build passed again. Both replacement paintings were inspected in the live gallery at 393×852, 360×780 and 412×915, with fitting dialogs and no page errors; both also decoded offline. [Second-pass browser results](../samples/hero-weapon-audit/second-pass-checks.json). The linked Peasant/Mercenary screenshots below now show this second pass. Existing test results below refer to the initial integration; no executable logic changed in this follow-up.

## Changes

- Peasant: one straight spear shaft through both hands and the spearhead socket.
- Mercenary: blade, guard and handle aligned on a continuous straight axis; sharpening pose retained.
- Harpooner: straight stowed harpoon, with visible leather attachments; held rope remains flexible.
- Samurai Commander: exposed belt-hung blade enclosed in a fitted lacquer scabbard with belt supports, in both scene and menu cutout.
- Samurai: one guard and a continuous wrapped handle gripped by both hands, in both scene and menu cutout. Intentional katana curvature retained.
- Ranger: connected upper and lower drawn bowstring segments meeting at the arrow nock.

Character identities, outfits, scene settings and poses retained. The other four menu cutouts were separately inspected and already had coherent weapons, so were preserved. No battle sprites, awakened artwork, simulation, saves, version or deployment changed.

All edits used the original individual assets as image-generation references. Generated PNG originals remain in `/workspace/generated_images/`; source mapping is retained in `/workspace/art-audit/redraw-provenance.json`. The complete source mapping is also retained in [redraw-provenance.json](../samples/hero-weapon-audit/redraw-provenance.json). The two additional cutout originals are `exec-e825a1d8-b7b1-4e1b-91dc-10c089c06623.png` (Samurai) and `exec-c937c937-3e08-432a-9faa-81b760bb30bd.png` (Samurai Commander). Pre-edit assets remain in Git and in `/workspace/art-audit/before/`.

Packed WebP files retain their exact original dimensions and paths. Scenes use quality 88; cutouts use quality 94, lossless alpha quality and the existing interior-opacity threshold of 145. Build already copies all hero WebPs and includes them in the offline manifest.

## Validation

- Source redraws inspected for straight pole/blade construction, coherent hilt and hand connections, scabbard support and bowstring continuity.
- `npm run typecheck` and `npm run web` passed.
- `npm test -- hero-kits-looks hero-art`: four tests passed.
- `node tools/anime-heroes/validate.cjs`: 45 scenes and 45 transparent cutouts, resolution, alpha and offline manifest checks passed (covers the original 45-hero catalogue). Harpooner is in `PENDING_HEROES`, so its repaired scene is reviewed as an asset preview in the existing gallery frame, not as an enabled roster hero. It remains outside the playable roster.
- At 393×852, 360×780 and 412×915: five playable heroes reviewed in the real gallery, two repaired transparent cutouts reviewed in their dossiers, and Harpooner reviewed as an unreleased asset preview at each size. All eight repaired assets present in the browser cache; Peasant gallery artwork decoded while offline at 393×852. All dialogs fit and no page errors occurred. [Browser results](../samples/hero-weapon-audit/browser-checks.json).
- All eight packed files preserve exact original dimensions, match their built copies byte-for-byte and are listed in the offline manifest. Documentation links and `git diff --check` passed.

Browser evidence: [Peasant](../samples/hero-weapon-audit/fixed-peasant-393.png), [Mercenary](../samples/hero-weapon-audit/fixed-mercenary-393.png), [Commander cutout](../samples/hero-weapon-audit/fixed-commander-cutout-393.png).

No merge or deployment. See the [initial painted-art evidence](../samples/hero-weapon-audit/painted-findings.jpg) and [audit](hero-weapon-audit.md).
