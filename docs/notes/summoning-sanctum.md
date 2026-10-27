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

## Follow-up: ceremonial summon results

The owner requested a fuller results redesign after the chamber implementation. This continues the previously approved ornate reveal direction. Both single and ten-summon results now use a dedicated transparent pixel-art frame with brass columns, emerald banners, a heraldic crest and griffin guardians. Game sprites stand on an emerald ritual circle against the chamber. The single reward has a large showcase and role description; the ten-result gallery uses two columns so each frame and reward remains readable.

The screen has a ceremonial heading, a reward summary and a fixed footer with Continue and repeat-summon controls. Rules and collection stay available in the scrollable body. Cards distinguish newly recruited heroes, recruitment shards, rank shards and crown overflow. Recruitment labels use the pull's `unlock` value rather than its rank `shards` value, and retain the per-pull saved progress. Long hero names use smaller type to fit the ornamental plaque. These changes do not alter any reward rules or saved data.

A Reveal all control completes a ten-result batch immediately. Enter/Space and automatic reveals remain supported. Reveal timers are cancelled when leaving or starting another batch, preventing an old reveal from affecting the next result. Repeat controls become available when all rewards are revealed. Continue remains available during the reveal because the rewards were already saved.

The new frame is `src/art/ui/summon-reveal-frame.png`, credited in CREDITS.md. The build's existing UI-file copy and service-worker manifest include it automatically; real-browser offline image decoding was verified.

Validation for this follow-up:

- Typecheck and web build passed.
- Full `npm test`: 103 test files passed, zero failures, cancellations or skips. After the final typography/reward-label refinements, both relevant no-flicker and summon-fx files passed again (14 individual assertions).
- Existing `tools/sanctum-checks.mjs` passed with the redesigned screen: three phone sizes, actual single/ten summons, uninterrupted ritual, keyboard, low funds, reduced motion and offline reload.
- Dedicated `tools/summon-result-checks.mjs` exercises controlled presentation fixtures for new heroes, recruitment shards, rank shards and crowns at 360×780, 393×852 and 412×915. It also verifies long-name fit, footer bounds, ten-result/reveal-all behaviour, early-close timer cancellation, returning to collection, reduced motion and cached frame decoding offline. Fixtures do not recruit heroes or change simulation rules. See [results](../samples/summon-results-checks.json).
- The initial local server stopped responding after the interrupted tool call; restarted the local server with logs redirected to a file. This was a preview-server issue, not a game failure.

Real screenshots of the follow-up: [new hero, 393×852](../samples/summon-results-new-393x852.png), [new hero, 360×780](../samples/summon-results-new-360x780.png), [new hero, 412×915](../samples/summon-results-new-412x915.png), [recruitment progress](../samples/summon-results-recruitment-360x780.png), [rank shards](../samples/summon-results-rank-393x852.png), [crowns](../samples/summon-results-crowns-393x852.png), [ten summons](../samples/summon-results-ten-top-393x852.png), [gallery lower section](../samples/summon-results-ten-bottom-393x852.png).

Run either browser script with `GAME_URL=http://localhost:8010` to select another local preview port. The follow-up stays on `design/summoning-sanctum`; no version bump, merge or deployment is authorised by this implementation request.

## Follow-up: celebrate new allies, tarot for shards

The owner asked for more excitement around recruiting a new character and a quieter tarot-card reveal for shard rewards. `SummoningHall.play` now immediately returns for a batch containing no new hero; the existing home callback still stops the chamber renderer before results open. A batch with a new ally retains the full grand ritual. The pure legacy plain-show plan remains unchanged for callers/tests, but normal shard-only recruiting no longer plays it.

New allies retain the griffin stage and receive a one-shot gold-ray expansion, rising character entrance and one reveal stinger per batch. Mixed batches show small tarot cards for shard/crown rewards and a full-width stage for each new ally. Shards reveal quickly, then new allies appear last with a longer interval and automatic scrolling to each spotlight. Reveal all skips the stagger and brings the first new ally into view. Motion preferences disable the entrance/ray animation and smooth scrolling. There is no looping brightness change or flash.

Tarot cards reuse the already credited, offline-cached company brass frame, with a subdued parchment portrait, compact reward label and readable recruitment progress. They have no griffin stage, ritual circle, rays or celebration cue. Recruitment shards, owned-hero rank shards and overflow crowns all use this quieter presentation. No simulation, cost, rarity or save changes were made.

Validation includes the four reward states and mixed batches at all three portrait sizes, explicit tarot/stage classification, shard ritual bypass, multiple new-ally spotlights, all-shard batches, early close, keyboard, Reveal all, reduced motion and offline frame loading. The sanctuary flow check now accepts direct tarot results for real shard pulls and explicitly verifies a guaranteed-new-hero ritual as a presentation fixture. Final results are recorded in the two browser-check JSON files. The linked result screenshots above are regenerated for this distinction.

Final validation for the tarot refinement: `npm run typecheck` and `npm run web` passed. The full 103-file `npm test` run completed with 1,103 individual tests passed, zero failures, cancellations or skips. Both real-browser scripts passed; the dedicated result checks also cover multiple new-hero spotlights and all-shard batches. Browser errors: none. The branch is ready for owner review; no merge or deployment performed.
