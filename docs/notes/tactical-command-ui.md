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
