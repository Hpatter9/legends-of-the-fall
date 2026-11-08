# Painted battle popups

Continuation of the owner-approved painted battle HUD, on `design/painted-combat-hud` in `/workspace/legends-of-the-fall`.

## Changes

`src/paintedBattlePopups.css` applies the approved panel and skill-button paintings to the existing skill/ultimate sheet, formation sheet, between-wave event and equipment cards, relic sheet, March orders, Spell Lectern/Field Anvil, and Last Stand pause sheet. Existing components and callbacks are retained. Standard menus continue to use `ornateMenu`; no new menu component was introduced.

The skill sheet uses readable body text, a serif title, 44px tabs and a labelled Close button. Its maximum height is measured against the viewport and the HUD dock so the dock is not subtracted twice. Large content can still scroll. Pause retains its independently scrolling hero list and fixed Resume control. Selected, disabled, focus and fallen states remain intact.

No additional artwork or remote URLs are needed: this pass reuses the first HUD pass's credited, precached paintings. Simulation, saves, roster, version and release notes are unchanged.

## Validation

Typecheck, web build and 24 relevant tests (`fight-hud`, `ui-standard`, `formations`) passed. The final browser pass completed 132 checks (44 at each phone size), with zero page errors and no horizontal overflow. The rendered skill, formation and pause sheets were visually inspected at all three sizes. All core skill facts fit before the scrollable upgrade tiers; the narrower pause view scrolls the hero list while Resume stays visible. Entrance animations are allowed to settle before captures.

`node tools/battle-hud/shots.mjs painted-popups popups` exercises the production controls at 393×852, 360×780 and 412×915. Screenshots and JSON checks are written to `docs/samples/painted-popups-*`. Skill and Last Stand pause interactions use real game views. Event, relic, March orders and anvil data are isolated review fixtures passed through the production view functions; they are not claimed as naturally reached campaign rewards. The development-only fixture bundle lives under ignored `out/shots/`.

The browser check covers skill/ultimate switching and closing, formation selection, disabled and paid event choices, equipment and relic close behavior, March orders callback, disabled anvil payment, Last Stand pause/resume, scrolling and reduced motion. No new simulation tests were needed because no game rule changed.

## Follow-up

Boss/cast announcements and victory/defeat/run summaries are covered by [painted battle reports](painted-battle-reports.md). Deployment chrome and current combat icon coverage are completed in [deployment and combat icons](painted-deployment-icons.md). No merge, deployment or PR was requested or performed.
