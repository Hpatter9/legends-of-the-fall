# Hearts resume the existing fight

HEART-001, branch `fix/heart-resume`, owner Codex.

A heart now raises fallen roster heroes to full health at their current tiles. It keeps the
same battle, enemy health and deaths, clock, random streams, charges, spent abilities,
terrain and combat statistics. Summoned creatures are not raised. Living heroes at a
timeout retain their health. A timeout grants another time allowance without rewinding
the clock. The existing heart cost and retry gold remain unchanged.

Fallen heroes hold their final death frame on the battlefield instead of fading away.
The existing heart burn, line and light pillars accompany revival, followed by the same
fight resuming automatically. Tapping still skips the pause; reduced motion is retained.
The recap records the continued fight once, so damage and kills are not counted twice.
Battle music resumes when the heroes rise. No save keys or assets changed.

Scope: `src/sim/battle.ts`, `src/main.ts`, `src/render/unitView.ts`,
`test/heart-revive.test.ts`, task board and this handoff.

Validation: `npm run typecheck` and `npm run web` pass. The full `npm test` suite passes: 103 test files, zero failures or skipped files, including the new heart regression tests and both existing hero-balance sweeps. Browser checks at 393×852, 360×780 and 412×915 pass: fallen hero sprites remain visible, the battle object, positions, clock and enemy health/deaths remain unchanged, and the heroes rise to full health. No page errors. Before/after screenshots: `docs/samples/heart-resume-{fallen,risen}-{393x852,360x780,412x915}.png`. Screenshots use a controlled defeat in the real browser.

Owner authorised the version bump and merge. Initially merged only into local `work` as 0.160.0. After fetching GitHub, preserved the already merged dialogue release 0.160.0 and prepared this fix for GitHub merge as 0.161.0. Package and lockfile versions updated together. The main-branch Pages workflow publishes the release.

Integration validation: the incoming dialogue change only modifies `src/quips.ts`; simulation and renderer code match the fully tested revival fix. Targeted revival/dialogue tests, typecheck and release build re-run after integration.
