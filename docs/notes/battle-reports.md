# Battle reports and remaining combat screens — UI-007

Owner: Codex. Branch: `design/battle-reports`. Worktree: `/workspace/legends-of-the-fall`.

The owner accepted the battle HUD, requested its merge, and asked to carry that treatment across all battle screens, including after-action recaps. The accepted HUD merged in [PR #143](https://github.com/Hpatter9/legends-of-the-fall/pull/143) as **0.179.0**. The owner subsequently requested completion against the newer game; this follow-up is completed as release 0.190.0.

## Changes

`src/battleReports.css` loads after the existing battle command theme. It reuses the crest, brass frame, stone texture and existing reward art, all already cached offline.

- Wave victory/defeat: crest-led header, framed stars/rewards, matching XP cards and a clearer after-action performance table. The between-wave march remains visible until it finishes; Next stays available at the foot of a long report.
- Full run recap: an explicit After-action report heading, readable headline figures, company performance with an MVP marker and distinct damage/healing/kills bars, and experience/level gains. The existing comeback guidance keeps its 24px/12px regular typography and working destination buttons.
- Daily completion, daily defeat and empty recap history from an old save use the same report layout.
- Auto-replay totals, equipment and event cards, Tower summaries, Calamity map recaps and full-clear rewards use matching materials.
- Last Stand: matching top/bottom HUD, shop/relic/spell controls, hero tiles and king-fall summary. Its own two-row ultimate layout, resource bars and Auto remain intact.
- Boss/phase/replay/twist overlays and the revive line receive matching framing.

Only three labels/heading elements change in `src/recapView.ts`. No simulation, rewards, saves or handlers change. No new art or runtime asset URLs are introduced.

## Validation

- `npm run typecheck` and `npm run web` passed.
- `npm test -- battle-flow comeback cal-recap cal-reward heart-revive`: the three matching files (battle-flow, comeback and heart-revive) passed. The two `cal-*` filters do not match repository filenames; no Calamity simulation test is claimed.
- `tools/battle-ui/report-shots.mjs`: real army entry, equipment allocation, event choice, wave victory, defeat, result → run recap → comeback destination, and real Last Stand entry/king-fall/end navigation. All 23 report/flow checks completed at each portrait size: 393×852, 360×780 and 412×915, with zero page errors and no horizontal overflow.
- Labelled view fixtures exercise long successful recaps, Tower/Calamity summaries, replay totals, Calamity map rewards and full-clear gear/chest/title rewards through the actual view builders. These are UI fixtures, not claimed full campaign playthroughs.
- `report-variants.mjs`: daily victory/defeat and missing recap history at all three sizes. All passed with no page errors or horizontal overflow.
- `report-offline.mjs`: the real service worker cached 160 files, including the crest; offline reload and opening a recap passed at 393×852 with no page errors. The initial offline harness used 127.0.0.1, where the game deliberately does not register a worker; it was corrected to localhost without changing the game.
- `report-scroll.mjs`: the final Calamity facts remain above the action button at all sizes; the 393px/360px cards reach their scroll end and the 412px card fits without scrolling.
- Reduced-motion recap and Last Stand captures inspected. Scrolling company/XP reports and the persistent Continue action checked.

Evidence: `docs/samples/battle-reports-*.png`, `battle-reports-checks.json`, `battle-reports-variants.json` and `battle-reports-offline.json`. Filenames containing `fixture` use sample report data; other report captures come from the browser's temporary real run. The harness disables cinematics solely in its disposable save.

The first review exposed an inherited ribbon border/height overriding the result header; fixed with explicit banner resets. An invalid gear ID in a victory fixture was corrected to `ironSword`. The initial 412px forced-loss case timed out; its repeat explicitly marks the temporary heroes fallen before the real simulator settles the defeat. These changes affect only review fixtures.

The owner subsequently asked to finish the pass after checking intervening updates. Final integration is recorded below.

## Final integration

Owner asked to finish after subsequent updates. Integrated main `decef2e9` (0.188.0) cleanly, preserving the army roads/hazards, awakening auras, earned spells, recorded combat audio and shared-theme updates. Final release version is 0.189.0. Integrated checks and merge outcome are recorded below.

Integrated validation passed on 0.189.0: typecheck and web build; the eight matching test files for battle-flow, comeback, heart-revive, events, army roads, hazards, awakening auras and hero-kit looks; all 23 report/flow checks at each of the three portrait sizes; daily/old-save variants; real service-worker offline reload/recap; and final-facts/action-button checks on all three sizes. Zero browser page errors. Screenshots and JSON evidence refreshed from the integrated build. No changes to gameplay, rewards or save rules were needed.

Final fetch also brought STAND-003 (main `b53b0e3e`, 0.189.0), the castle-room Last Stand overhaul. Removed all older Last Stand overrides from `battleReports.css`: its newer crest, hero colour stripes, king bars, pause sheet and end-card materials now come exclusively from `stand.css`. This avoids duplicate crests and competing card styles. Release updated to 0.190.0; recheck targets the changed Last Stand path and inherited combat/report callers.

Final 0.190.0 checks passed: typecheck/build, eight matching affected test files (including all three Last Stand test files), and the castle-room Last Stand at 393×852, 360×780 and 412×915. Auto toggle, pause/resume, king-fall/end navigation, reduced motion and exactly one native end-card crest passed with zero page errors. The check found directional-arrow tips extending the document width; `.stFinds` now clips its paint to the viewport. No older Last Stand decorative overrides remain. Evidence: `battle-reports-stand-integration.json` and refreshed `battle-reports-stand-*.png`.
