# Legends of the Fall

A King God Castle style auto-battler: place five heroes on the near rows of an FF Tactics style height grid, then
they fight a band of foes on their own in real time. Played as a phone web app (a PWA on GitHub Pages).
TypeScript + PixiJS, the same stack as Chronos Settlement (`hpatter9/little-town`); the owner may fold this game into
Chronos later, so keep its conventions.

## How to work

1. Work on a branch of your own; never push to `main` directly (the owner merges).
2. Read a file and its neighbours before editing it, and copy their style: plain-English comments, British spelling
   in the game's text.
3. Check your work: `npm run typecheck`, `npm test`, and `npm run web` plus a look at phone sizes (393x852 upright,
   852x393 sideways) when the page or the renderer changes. Never skip, delete or loosen a test to get it to pass.
4. Add a test in `test/` for any new rule in the simulation.
5. Write a short note of what you built in `docs/notes/<topic>.md`.
6. Never put a model name or ID in code, comments or docs.

## Rules that are easy to break

- **The simulation is deterministic** (`src/sim/`): no `Math.random()`, `Date.now()` or DOM. Randomness comes from
  the fight's stream (`b.rng`, through `Rng`) or a side stream of the seed (`new Rng(mixSeed(seed, <salt>))`). A new
  system takes its own side stream, so existing fights play out the same.
- **The renderer never changes the battle** except through the sim's own functions (`place`, `unplace`, `fight`,
  `stepBattle`). Modules the tests import must not import Pixi or touch the DOM.
- **Phone first.** Design every change for the upright phone first.
- **Use the asset packs, not code-drawn art**, wherever a pack has the thing. The packs are in the private repo
  `hpatter9/chronos-assets` (clone it next to this one). Copy only the sprites used into `src/art/`, credit them in
  `CREDITS.md`, and never change the assets repo. Chronos's cut sheets (`src/renderer/art/creatures/packs/` and
  `packs.json` there) can be copied as they are.
- **When unsure what the owner wants, ask.**

## Layout

- `src/sim/board.ts`: the grid (7 across, 9 deep), heights, `canStep`, `sightClear`, `makeBoard(seed)`.
- `src/sim/units.ts`: `UNITS` (the five heroes and the skeletons), `HEROES`, `FOE_BAND`.
- `src/sim/battle.ts`: deploying (`canPlace`, `place`, `unplace`), `fight`, `stepBattle` (100 ms ticks), the AI,
  `blowMult`, `shotReach`, `canStrike`.
- `src/sim/path.ts`: `walkFrom` (cheapest walks round the others), `firstStep`.
- `src/render/`: `iso.ts` (projection), `boardView.ts` (columns, tile marks), `unitView.ts` (animated fighters),
  `fx.ts` (shots, sparks, numbers, shake), `sheets.ts` (frames and portraits).
- `src/main.ts`: the page: input (drag or tap to place), camera fit, the bench and buttons. `window.__game` is the game.
- `src/index.html`: the page and its CSS; `build.mjs` builds `out/web`.

## Commands

```bash
npm install
npm run typecheck
npm test
npm run web     # out/web
npm run dev     # serve on :8000 with rebuilds
```
