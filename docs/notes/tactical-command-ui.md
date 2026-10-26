# Tactical Command UI rollout

## Direction

Modern tactical RPG: dark navy surfaces, blue primary actions, readable hero cards and restrained gold accents. Keep the isometric board prominent and reuse the existing art packs.

## Phase 1 — shared skin

`src/index.html` adds a presentation-only override block for the existing battle HUD and common controls. No game state, simulation, save keys, or interaction handlers have been changed. The CSS is appended after existing rules so that existing markup and handlers remain intact.

## Remaining work

- Audit and unify the home, lands, modes, heroes, codex and settings views without removing features.
- Check placement touch interactions and viewport fit for normal and Calamity boards.
- Verify 360×780, 393×852 and 412×915 upright viewports.
- Run `npm run typecheck`, `npm test`, and `npm run web` in a checked-out workspace. These commands have **not** been run for this commit.
- Confirm the offline service worker still precaches all resources; this phase introduces no external resources.

Do not merge until visual review and validation are complete.

## Phase 2 — shared secondary-screen skin

Added a second CSS override block for the Keep hub, navigation tabs, party/hero surfaces, recruitment, settings and shared dialogs. This is a visual-only pass; existing DOM IDs, event handlers and game logic remain intact.

### Review required

The existing stylesheet is large and contains older ornate selectors. Verify the final CSS cascade on actual rendered screens before merging, especially `#hmTabs`, `.hmTab`, `#hmSub`, `.hmPanel`, `.setting`, and the portrait layouts. The changes have not been built or visually tested in a browser in this environment. Follow up with a CSS consolidation after approval.

## Phase 3 — deployment and combat HUD

The deployment action row now uses four compact secondary actions with the existing Fight button spanning the next row. The bench has a smaller height cap on short viewports, and the active battle speed, mana and result surfaces use the Tactical Command palette. Existing button IDs and event handlers were preserved.

**Validation is still pending:** run the required typecheck, tests and web build and inspect both 8×11 and 10×13 boards at all required portrait sizes. Check that a two-row action area does not obstruct placement tiles or cause camera-fit regressions. No browser or build execution has been performed as part of this phase.
