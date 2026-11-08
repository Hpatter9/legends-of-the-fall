# Painted announcements and battle reports

Continues the accepted painted HUD and popup direction on `design/painted-combat-hud`, `/workspace/legends-of-the-fall`.

## Changes

- Added a dark crimson leather variant of the approved brass panel. Source: `art-source/ui/painted-combat/crimson-source.png`; runtime: `src/art/ui/combat-crimson.png`. The existing import script reproduces it and the existing UI asset loop serves and precaches it.
- `src/paintedBattleReports.css` applies the painted green/brass and crimson materials to boss signatures, small hero cast banners, victory/defeat headings, result/XP/MVP/spoils panels, company statistics, recap actions, replay/route summaries and Last Stand end cards.
- Boss bands retain their entrance/exit timing and reduced-motion fades. The painted frame replaces the old generated stripe/edge decoration; warnings remain non-blocking and take no taps. Hero cast timing is retained.
- Replay totals now use explicit label/value columns, correcting a legacy flex style that expected a different row structure.
- Reports retain live numbers, progress fills, count-ups, reward settlement, comeback links and onward actions. Short passing cards stay transparent over the battlefield. The reporting components and simulation are unchanged.
- Existing painted portrait frames and leather action buttons are reused. Credits updated; no version or release-note change, merge or deployment.

## Validation

Typecheck, web build and 35 relevant tests (`jrpg-recap`, `recap-spoils`, `wave-recap`, `boss-big`) passed. Final browser validation passed all 146 checks: 50 at 393×852, 48 at 360×780 and 48 at 412×915, with zero page errors or horizontal overflow. Boss, victory/defeat and replay captures were visually inspected at all three sizes. The boss band clears the spell row; replay labels and values share a row. The 393px pass verified precaching and service-worker access to the crimson panel with networking disabled.

`node tools/battle-hud/shots.mjs painted-reports reports` runs the focused review at all three portrait sizes. Boss/cast appearances, forced wave outcomes, long/old-save recaps, replay/route summaries and Last Stand outcomes are explicitly labelled fixtures in the screenshots. The production view functions and navigation handlers are exercised; full campaigns are not claimed. Transient achievement toasts are suppressed only in review captures so the reports remain visible. The established-player fixture marks the first-win Calamity reveal as seen so onboarding does not obscure report captures.

The completed checks include a running battle under the boss warning, reduced motion, short-wave onward navigation, defeat-to-recap, comeback links, long-report scrolling, unchanged totals while viewing, replay/summary closure, Last Stand Home and offline access to the new crimson art.

## Related completion

The initial painted HUD, popup and report material passes are complete and ready for owner review. Deployment chrome, current hero/king-spell coverage, battle trait badges and wave/result-note marks are completed in [deployment and combat icons](painted-deployment-icons.md). Related abilities share painted motifs. Full cinematic and battlefield artwork replacement is outside this UI scope.
