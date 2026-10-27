# Summoning Sanctum

UI-003 implements the owner's approved ornate Royal Arcane concept on branch `design/summoning-sanctum` in `/workspace/legends-of-the-fall`. The chamber now has gilded gothic vaults, emerald stained glass, guardian statues, embroidered banners and candlelight. Its ceremonial summoner wears green and ivory, and the rebuilt stepped altar has griffin guardians, brass astrolabe rings and emerald crystals.

The original generated chamber artwork is bundled into game.js as a data URL, including when reused behind the result screen. The existing service-worker game.js cache therefore includes the artwork without an extra network resource. Credits are in CREDITS.md. The priest, architecture and altar are one static scene; the live casting trail, orbiting runes, sparks, beam and hero arrivals are rendered over it. The priest and brass apparatus are not separate animated sprites.

The hall has a brass-and-green title crest, collection control, real nearest-recruit progress and framed summon buttons. Casting hides those panels to show the whole chamber. The canvas fits the exact phone width rather than clipping a fixed 384px surface. Hero arrivals share the artwork's altar position. Existing save keys, recruit rules, costs, pity, sound settings, skip and reduced-motion behaviour are preserved.

The result screen has brass-and-emerald cards, an enlarged single-result showcase and a three-column ten-result gallery. Results appear before the summon controls. Rules and collection are expandable; opening the collection from the hall expands its catalogue. New heroes have a steady gold surround. Cards also reveal with Enter or Space. No rarity tiers were introduced.

## Validation

- `npm run typecheck`: passed.
- `npm test`: all 103 test files passed, zero failed/cancelled/skipped. The later result-layout refinements were checked with the browser suite and the two relevant `no-flicker` and `summon-fx` test files, both passed.
- `npm run web`: passed.
- `tools/sanctum-checks.mjs`: passed at 360×780, 393×852 and 412×915, with no browser errors. Checks include layout and touch-target bounds, altar clearance, single summons, repeated rituals, ten summons, keyboard reveal, an uninterrupted full ritual, reduced motion, low funds and offline reload with the chamber present. Test-only crowns and fixtures are confined to the browser session.
- The first browser run caught the inherited fixed-width canvas overflow; fixed and all three sizes rerun. Offline verification uses localhost, matching the game's existing service-worker registration condition.
- Real browser screenshots inspected: all three idle layouts, single result at 360px, ritual at 393px and ten-result gallery. [Check data](../samples/sanctum-checks.json).

Real implementation screenshots: [360×780](../samples/sanctum-360x780.png), [393×852](../samples/sanctum-393x852.png), [412×915](../samples/sanctum-412x915.png), [result](../samples/sanctum-result-360x780.png), [ritual](../samples/sanctum-ritual-393x852.png), [ten summons](../samples/sanctum-ten-pull.png), [offline](../samples/sanctum-offline.png).

To reproduce: build and serve `out/web` on port 8000, then run `node tools/sanctum-checks.mjs`. Set `PLAYWRIGHT_MODULE` to a separately installed Playwright package if necessary; `CHROMIUM_PATH` selects Chromium (default `/usr/bin/chromium`).

## Handoff

Ready for owner review; no merge, version bump or deployment performed. Changed scope: hall renderer/styles and artwork, gacha presentation/accessibility, result markup, credits, browser checks and coordination notes. No simulation changes. This chat can be archived by the owner once review and release handoff are complete.
