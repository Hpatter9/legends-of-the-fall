# Keep & Kingdom UI

Hero management now uses the owner's chosen stone, brass and green direction. The Heroes destination opens a searchable company roster. A hero opens a detail sheet with a horizontal hero selector and Overview, Progression and Equipment tabs; switching heroes keeps the selected tab, and Back returns to the roster when entered from it. Visit tavern retains access to the animated tavern. All five existing main destinations remain available below hero sheets.

Equipment keeps its three existing slots: weapon, armour and trinket. Each slot now names its category, worn item and level, with an accessible picker label. Existing comparison, equip/unequip, salvage, equip-best, equip-all, transfer policy, set bonuses and combine actions remain. Locked heroes retain their unlock requirements. Rank-up, awakening and talents remain accessible through the header and Progression tab.

`src/keepKingdom.css` provides the shared surfaces and controls and is inlined by `build.mjs` after the legacy CSS. It replaces the earlier inline navy styling block. The battle toolbar uses a compact grid so the speed control stays with the other controls on a narrow phone. Existing art and local fonts are reused; no new network resources or service-worker entries are needed. Simulation rules, save formats and save keys are unchanged. The director integrated the manager setup from main into the UI branch, resolving the overlapping instruction and task-board additions. Following the merge-time version rule, package.json and root lockfile metadata are 0.158.0. The UI itself has not been merged into main.

## Validation

- `npm run typecheck`: passed.
- `npm test`: all 103 test files passed; no tests skipped or loosened.
- `npm run web`: passed.
- `tools/keep-kingdom-checks.mjs`: passed at 360×780, 393×852 and 412×915. Covers search, locked hero details, hero switching, tab keyboard navigation, equip/unequip, comparison visibility, combining, gear sets, main destinations, horizontal bounds, navigation clearance and persisted equipment after reload.
- `tools/keep-kingdom-release-checks.mjs`: passed at all three portrait sizes, with no browser errors. Covers both board sizes, active combat, control fit, a result screen, all 17 land fits at the middle size, service-worker installation and offline reload. This is smoke coverage, not a playthrough of every mode and progression state.

To reproduce browser checks, serve `out/web` at `http://localhost:8000` and install Playwright with Chromium as a developer tool. Use `PLAYWRIGHT_MODULE` to point to it if it is not on the normal module path; `PLAYWRIGHT_BROWSERS_PATH` may select its browser installation. Then run:

```bash
node tools/keep-kingdom-checks.mjs
node tools/keep-kingdom-release-checks.mjs
```

Outputs go to `out/ui-checks` and `out/ui-release`; these are ignored build artifacts. Selected real browser screenshots: [roster](../samples/keep-kingdom-roster-393x852.png), [equipment](../samples/keep-kingdom-equipment-393x852.png), [deployment](../samples/keep-kingdom-deploy-393x852.png), and [combat](../samples/keep-kingdom-fight-393x852.png). Machine-readable results are in [hero checks](../samples/keep-kingdom-checks.json) and [release checks](../samples/keep-kingdom-release-checks.json). Screenshot inventory is test data, not a change to the player's starting items.

## Review

Keep PR #118 draft until the owner approves the actual visuals. Device-specific touch behaviour and a full manual pass through every mode, overlay and progression state remain acceptance work; headless browser checks cannot establish those. Do not merge or deploy without the owner's request.
