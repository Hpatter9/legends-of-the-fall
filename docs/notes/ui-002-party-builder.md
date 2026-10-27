# UI-002 — Balanced party builder

Issue: #125. Owner-approved concept A; Keep screen remains unchanged.

## Assignment

- Owner: dedicated party-builder worker, reviewed by the Game Director.
- Branch/worktree: `codex/ui-002-party-builder`, `/workspace/ui-002-party-builder`.
- Base: current main `ca8142ac`; locally reconstructed text snapshot because shell Git proxy is unreachable.
- Scope: party editor, its scoped styles/markup, optional narrow expedition context hook, browser validation and handoff.
- Reserved: Keep/home presentation, simulation, progression/save rules, SIM-001 and WORLD-001.
- Completion: selected-hero strip and role/trait overview, search/role filters, three-column portrait cards, fixed confirm action; preserve details/locked explanations/long press and cancel/save; validate three portrait sizes and required checks; open unmerged PR.
- No version bump, merge, main push or deployment.

## Implemented

The approved A hierarchy is applied to the existing party editor. The party still selects the hero kinds a run may hire; it is not a formation or a new combat system.

- A compact selected-hero strip uses the real unlocked slot count, clear remove controls and the existing long-press hero details.
- Role coverage comes from existing roles; actual trait counts, effects and tiers remain available in selectable summaries. Trait focus clears if its final contributor is removed, so no invisible filter persists.
- Search and role filters leave the input/caret intact and restart filtered lists at the top. Selection redraws preserve list position and keyboard focus.
- A three-column roster uses existing credited hero sprites, decorative role backgrounds, selected outlines/checks and real names/levels. Locked names stay concealed where the existing unlock rule requires it; requirements remain accessible.
- Detail buttons have 44px targets and are siblings of selection buttons, avoiding nested controls. Hero information retains the existing rank, power, equipment/progression and abilities sheets.
- The confirmation footer remains visible, with incomplete/full-party status. Start run and edit/Done preserve the original draft/cancel/save semantics and save keys. A narrow optional context label supplies the actual army/tier on normal Army Start.
- Styles are scoped to the party editor, with a conditional deployment-tip hide while the editor is open. The Keep/home UI and shared hero-management styling are unchanged.

## Validation

- `npm run typecheck`: passed on final source.
- `npm test`: 103 test files passed, zero failures (347.04 seconds). No tests were changed, deleted or weakened.
- `npm run web`: passed, version 0.159.0 unchanged; `git diff --check`: passed.
- `tools/ui-002/checks.mjs`: passed at 360×780, 393×852 and 412×915 with zero page errors/overflow. Covers search/caret, scroll resets, role filters, party limits, add/remove/suggest, hidden trait-focus regression, details/locked requirements, long press and subsequent selection, cancellation/save/reload and dynamic three-slot starter parties.
- The usable roster regions are 280px, 311px and 374px respectively, with three columns and confirmation controls within the viewport. The roster scrolls independently while the selected party and action remain in view.
- Independent reviewer confirmed unchanged Keep DOM (normalising only tutorial emphasis), computed styles and bounding rectangles, plus all three portrait layouts and keyboard/detail/locked-name cases.
- Independent real-control entry passed: Home → Armies → Orc Warband → party confirmation starts the actual Normal army at stage 1 on an 8×11 board. The real starter party persists. After service-worker-controlled offline reload, Home → Party opens the three-slot editor with three columns, visible footer, no overflow and zero page errors. See [entry/offline results](../samples/ui-002-entry.json).
- The existing unmodified Keep & Kingdom hero/equipment/navigation checks passed at all three portrait sizes: roster search, locked hero details, hero switching, keyboard tabs, equip/unequip, combining/sets, navigation/bounds and save reload. See [regression results](../samples/ui-002-regressions.json).

## Screenshots and reproduction

The screenshots show actual existing hero art and fixture player data, not the AI concept art or a real player's save. No new art assets or network-loaded resources were introduced; the new CSS is inlined into the already cached HTML.

- [360×780](../samples/ui-002-party-360x780.png)
- [393×852](../samples/ui-002-party-393x852.png)
- [412×915](../samples/ui-002-party-412x915.png)
- [Interaction results](../samples/ui-002-checks.json)
- [Real Army Start and offline editor](../samples/ui-002-entry.json)
- [Existing hero/equipment regression results](../samples/ui-002-regressions.json)

```sh
npm run web
PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_PATH=/path/to/chromium node tools/ui-002/checks.mjs out/web
PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_PATH=/path/to/chromium node tools/ui-002/regressions.mjs out/web
PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_PATH=/path/to/chromium node tools/ui-002/entry.mjs out/web
```

Playwright is a separate development tool, not a new game dependency. Module/browser overrides are optional when Playwright and its bundled browser are installed normally. Ports are configurable with `UI_CHECK_PORT` (`UI_ENTRY_PORT` for the entry/offline script). Browser/server cleanup is in `finally`.

## Review and limits

Keep/home rendering, pure simulation, economy, save keys, game version and existing battle modes are unchanged. SIM-001 and WORLD-001 are separate unmerged work. No merge, deployment or main push is performed. The owner approves final merge. Browser checks are not physical-device touch validation or an exhaustive playthrough of every mode.
