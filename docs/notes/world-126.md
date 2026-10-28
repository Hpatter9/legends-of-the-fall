# WORLD-126 — cold terrain rendering

Continuation of issue #126 on `codex/world-001`, draft PR #124. Owner confirmed scope on 2026-10-27. Prior local candidate did not survive; implementation reconstructed against published `7426ac5a`.

## Implementation

The original full-resolution painter is unchanged. Per-BoardView column sources are reused through reference-counted, idempotent leases. Cache identity includes area, boss lip/plinth, height, bridge, ground, selected top variation, art-load epoch and the painter's signed/fractional side offset. Decorations, marks and individual falling tile containers remain independent.

Retention is bounded by both 256 entries and 4 MiB of estimated RGBA canvas pixels. Idle least-recently-used sources are evicted; pinned sources are never evicted. Overflow is transient and destroyed after its final lease. Thus the retention bound excludes necessary pinned overflow and GPU/driver overhead, rather than pretending total renderer memory is capped at 4 MiB. Temporary bakes release leases in `finally`, including failed `bakeField`/scenery generation. Existing baked-scenery cap/resolution and offline bundling remain intact.

## Reproduction

Use Node, existing dependencies and Playwright/Chromium. `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` override the helper defaults. Run performance variants sequentially on a quiet host; avoid tests/builds/other browsers during timing.

1. Build a pristine worktree at `7426ac5a` with `npm run web`; preserve its `out/web` separately.
2. Build the candidate with `npm run web`.
3. `node tools/world-001/perf.mjs <baseline-web> docs/samples/world-126-baseline-long-warm.json 5`
4. `node tools/world-001/perf.mjs out/web docs/samples/world-126-candidate-long-warm.json 5`
5. `node tools/world-001/pixels.mjs out/web`
6. `node tools/world-001/lifecycle.mjs out/web`

Each timing sample launches fresh Chromium/ANGLE SwiftShader, a fresh context at 393×852, seed 7, mountain wave 14. RAF intervals use `performance.now()` at callback execution, because browser RAF timestamps can predate a synchronous rebuild. Cold capture includes at least twelve actual callbacks and three seconds. Warm capture waits for destination reveal and scenery baking to complete, settles two seconds, then captures at least 120 callbacks and six seconds. Earlier short-window exploratory samples are retained separately and do not establish the warm gate. Service workers are blocked for both timing variants to avoid cache-install background traffic; offline functionality is checked separately on localhost. Nested attribution durations overlap and must not be summed. RGBA estimates exclude GPU copies, driver allocation and assets.

## Validation status

In progress. Initial five-sample cold comparison: baseline median worst frame 5434.8 ms (4124.4–7286.8), candidate 766.6 ms (705.1–919.6), an 85.9% median reduction. Canvas creation 428 (one sample 429) → 34; active column sources 236 → fewer shared sources, and candidate retained total 69 sources / 1,847,808 estimated bytes. The initial warm window overlapped camera animation and is not accepted as evidence of warm regression or improvement. That initial window was superseded by the settled-window measurements below.

The first default-canvas readback probe found sparse one-channel rounding differences even between two fresh calls to the unmodified painter. A reduced probe reproduced fresh/fresh differences (up to seven channels, each differing by one), while fixing the comparison canvas backend with `willReadFrequently` made those identical calls byte-identical. The strict full pixel test therefore fixes that backend for both cached and original paint, purges idle sources, stops the ticker, and uses exact equality with no tolerance; the product painter is unchanged.

Ownership unit checks and typecheck/web passed. Strict pixel comparisons passed all 3,634 cases. The lifecycle matrix passed at **360×780, 393×852 and 412×915**, with zero page errors: real first-wave wins at simulation 19.5s / 19.0s / 15.6s respectively, actual Next, 24 rapid late-wave/theme cycles per size, failed-bake cleanup, individual drops, saved wave-14 resume, pointer drag-pan, lazy pan-back baking and service-worker offline reload. Parties differ between fresh startup contexts; these are controls-only progression checks, not identical-party pacing comparisons. Results: `docs/samples/world-126-lifecycle.json`; progression/resume PNGs for each width are beside it and were inspected. A user interruption initially left a partial 360-only report; the filtered rerun preserves that completed row and adds both remaining sizes. Full suite passed 106 test files, zero failures/skips, in 429.58 seconds; typecheck and web build passed. After a test-only tuple typing cleanup, typecheck and all five focused ownership cases passed again.

The stage-13/14 rapid lifecycle fixtures assert concealed/late destination presence; the original published strict rendered-bounds reveal matrix remains historical evidence. This continuation does not claim a new exhaustive campaign playthrough or real-device performance approval.


## Settled-window measurements

Five fresh browsers per variant, 600 warm frames each, on a host limited to two CPU cores; Chromium 154.0.8037.57 (Debian 13), ANGLE SwiftShader, no concurrent tests/builds/browser checks. Final reports: `world-126-baseline-long-warm.json` and `world-126-candidate-long-warm.json` in `docs/samples/`.

| Metric | Published baseline | Shared-column candidate |
| --- | ---: | ---: |
| Worst cold frame, median of runs | 2463.0 ms | 402.5 ms |
| Worst cold frame, range | 2319.8–2644.3 ms | 361.6–889.2 ms |
| Synchronous setup, median | 229.3 ms | 76.5 ms |
| Warm median | 96.7 ms | 93.7 ms |
| Warm p95 | 203.5 ms | 201.0 ms |
| Warm p99 | 253.3 ms | 673.9 ms |
| Worst warm interval | 459.3 ms | 1198.1 ms |
| Canvas allocations (all) | 428 (one run 429 incl. other canvas) | 34 (one run 35 incl. other canvas) |
| First source initialisations, including other renderer sources | 434 | 40 |
| Active distinct column sources | 236 | 34 |
| Active column pixel estimate | 9,234,432 B | 1,333,248 B |
| Candidate total retained column pixels | — | 1,847,808 B / 69 sources |

Median worst cold stalls fell 83.7%, exceeding the 50% cold target. Typical warm median/p95 did not regress, but one candidate sample had several large warm outliers, worsening aggregate p99/max. No texture uploads or section rebuilds were introduced during steady state; the root cause of those rare host stalls is not established. **Do not call the entire performance gate unconditionally passed:** warm-tail stability and real-device evidence remain limits. Keep draft. The earlier exploratory reports show substantial host variability and are retained, not substituted for this longer warm distribution.


## Compatibility and handoff — 2026-10-28

Original 8×11 army Hire/Auto-arrange/Fight smoke reached simulation 1.0s without a scenario or page error. The real `bakeField` path baked a 24×24 rendering fixture into 1,213,440 pixels, released all temporary leases (88 active before/after), and left active sources valid. This is a renderer compatibility fixture, not a real Last Stand playthrough. Reproduce with `node tools/world-001/compatibility.mjs out/web`; results: `docs/samples/world-126-compatibility.json`. Full test output is retained in `docs/samples/world-126-tests.txt`.

Checkpoint scope: column reuse/ownership plus tests, reproducible browser scripts, measurements and handoff only. New owner-requested 14×18 per-army maps are **not implemented** by this checkpoint. The nine-theme planning diagram is in `docs/samples/world-001-army-themes-proposal.png`; connected-section versus one-map interpretation and theme confirmation remain with the owner under AGENTS.md's visual-review rule. The temple destination must be on the central lake island.

Next: resolve rare warm-tail stalls/obtain device evidence before approving wider rollout; confirm the revised per-army map design and implement it as a separate bounded step. Keep #126/#123 open and PR #124 draft. No version bump, main push, merge or deployment.
