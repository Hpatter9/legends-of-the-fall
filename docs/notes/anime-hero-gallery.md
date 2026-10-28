# ART-003 — Anime hero gallery

Branch: `art/anime-hero-gallery`. Owner requested all 45 collectible heroes in the approved ornate anime direction, with transparent overview portraits and full artwork on click. Kitsune, Gorgon, Illusionist and Time Witch use the owner's supplied redesign concept. The follow-up request gives every hero an individual pose and situation.

## Result

The company cards, hero strip, locked catalogue rows and dossier use transparent anime cutouts. The dossier portrait is a button labelled “View full artwork”; it opens the hero's individual scene in a native modal. Close, Escape and backdrop dismissal restore focus to the portrait; Tab and Shift+Tab stay on the viewer's close control. Dossier tabs, equipment, progression, ranks and save keys retain their existing handlers. The illustration replaces the menu's animated sprite; battle sprites and their awakening effects are unchanged. Existing rank stars and awakening gems remain visible in the menu.

All 45 full scenes have distinct briefs, recorded in `tools/anime-heroes/scenes.json`: for example, the Knight guards a breached gate, the Cleric heals in a field hospital, Kunoichi crouches above a moonlit city, the Satyr plays beside a stream, and Time Witch suspends a shattered clock tower. Full art preserves each character's outfit and colours. Most cutouts are extracted from the matching scene; Kitsune retains the separately generated standing cutout with the same redesign and colours.

## Assets and rebuilding

`src/art/heroes/` holds 45 full-scene WebPs and 45 smaller transparent portrait WebPs, approximately 13 MiB combined. Full scenes are either 1024×1536 individual paintings or 512×1024 cells from generated production atlases. Portraits are at most 320×480. All 90 URLs are copied and explicitly cached by the service worker, without enlarging `game.js`.

Raw originals remain in the workspace's `/workspace/generated_images/` and ignored `tools/anime-heroes/source/` and `scenes/` directories. `extract.cjs` splits scene panels and assigns whole transparent components to cutout actors, retaining their antialiased outlines and excluding detached neighbouring fragments. Touching figures use the original cell division. `pack.cjs` transcodes shipping files. Rebuild from the local originals with:

```sh
node tools/anime-heroes/extract.cjs
node tools/anime-heroes/pack.cjs
npm run web
node tools/anime-heroes/validate.cjs
node tools/anime-heroes/checks.mjs
```

Artwork is original generated material credited in `CREDITS.md`. The owner's four-character mockup supplies visual inspiration. No third-party art pack files were added.

## Validation

- Typecheck and web build passed.
- `npm test -- hero-art rankUp awaken`: all five matching test files passed.
- Asset validation passed for all 45 scenes, 45 nonempty transparent cutouts and 90 copied offline cache entries.
- Contact sheets reviewed: [full scenes](../samples/anime-heroes/scenes-contact.jpg), [cutouts](../samples/anime-heroes/cutouts-contact.jpg).
- Full browser gallery checks passed at 393×852 (all 45 heroes), 360×780 and 412×915 (the four redesigns and mounted Lancer), with no page or console errors. Close, Escape, focus restoration, Tab containment, search, Skills and reduced motion passed. A real service-worker offline reload opened the cached full artwork. Results: `docs/samples/anime-heroes/checks.json`. The initial keyboard-focus finding was corrected before this passing run.

- Existing dossier browser regressions also passed at all three portrait sizes: atmosphere and reduced motion, all four tabs, equipment/unequip, talents, locked portraits, keyboard tab navigation, hero switching, long names and back navigation. Results: `docs/samples/anime-heroes/dossiers/results.json`. Locked catalogue thumbnails retain their dimmed styling.
- Final diff and JavaScript syntax checks passed.

No merge, version bump or deployment requested. Real-phone performance remains unmeasured.
