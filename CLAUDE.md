# Legends of the Fall

A King God Castle style auto-battler: place five heroes on the near rows of an FF Tactics style height grid, then
they fight a band of foes on their own in real time. Played as a phone web app (a PWA on GitHub Pages).
TypeScript + PixiJS, the same stack as Chronos Settlement (`hpatter9/little-town`); the owner may fold this game into
Chronos later, so keep its conventions.

## How to work

1. Work on a branch of your own; never push to `main` directly (the owner merges).
2. Read a file and its neighbours before editing it, and copy their style: plain-English comments, British spelling
   in the game's text.
3. Check your work: `npm run typecheck`, `npm test`, and `npm run web` plus a look at the upright phone sizes (393x852, 360x780
   and 412x915) when the page or the renderer changes. Never skip, delete or loosen a test to get it to pass.
4. Add a test in `test/` for any new rule in the simulation.
5. Write a short note of what you built in `docs/notes/<topic>.md`.
6. Never put a model name or ID in code, comments or docs.
7. **The version (the owner's ask):** the page shows "Version <package.json version> · <commit>" (top right).
   Every merge into the working branch bumps the minor version in `package.json`
   (0.2.0, 0.3.0, ...), done by whoever merges (the director); workers never change it.

## Rules that are easy to break

- **The simulation is deterministic** (`src/sim/`): no `Math.random()`, `Date.now()` or DOM. Randomness comes from
  the fight's stream (`b.rng`, through `Rng`) or a side stream of the seed (`new Rng(mixSeed(seed, <salt>))`). A new
  system takes its own side stream, so existing fights play out the same.
- **The renderer never changes the battle** except through the sim's own functions (`place`, `unplace`, `fight`,
  `stepBattle`). Modules the tests import must not import Pixi or touch the DOM.
- **Upright phone only.** The game is played upright only (the owner's call): design and check every change at 393x852 (and 360x780, 412x915). There is no sideways layout to keep: a phone held sideways is asked to turn upright (`#turnUp`), and the manifest asks for portrait.
- **Use the asset packs, not code-drawn art**, wherever a pack has the thing. The packs are in the private repo
  `hpatter9/chronos-assets` (clone it next to this one). Copy only the sprites used into `src/art/`, credit them in
  `CREDITS.md`, and never change the assets repo. Chronos's cut sheets (`src/renderer/art/creatures/packs/` and
  `packs.json` there) can be copied as they are.
- **It must play offline** (the owner plays on planes). The service worker (`build.mjs` writes `out/web/sw.js`) caches
  every file the game needs on the first visit. A new file the page loads by URL (backdrops, music, anything not
  bundled into game.js as a data URL) must be added to its `FILES` list, or the game breaks offline.
- **When unsure what the owner wants, ask.**

## Layout

- `src/sim/board.ts`: the grid (7 across, 9 deep), heights, `canStep`, `sightClear`, `makeBoard(seed)`.
- `src/sim/starter.ts` / `src/starter.ts`: the starter pick (three packs of three heroes for a new save). Heroes have no rarity; every hero is as strong as any other (`docs/notes/no-rarity.md`).
- `src/sim/unlock.ts` / `unlockRules.ts` / `contentHeroes.ts`: heroes are collected by shards (`Meta.unlock`) or, for ten of them, earned by a milestone (`docs/notes/hero-shards.md`; `npm run unlock-pace` models the pace).
- `src/sim/daily.ts`: the daily's shape (ten waves, the boss of the day, `dailyArmy`), with `modes.ts` (`settleDaily`, `dailyLine`) and `docs/notes/daily-goal.md`.
- `src/sim/units.ts`: `UNITS` (the five heroes; the foes come from `foes.ts`), `HEROES`. `src/sim/foes.ts`: `FOES`, `FOE_BANDS`.
- `src/sim/ultimates.ts`: every hero's ultimate (the eight old ones are in `abilities.ts`; the other 37 unlock at level 15; `docs/notes/ultimates.md`).
- `src/sim/battle.ts`: deploying (`canPlace`, `place`, `unplace`), `fight`, `stepBattle` (100 ms ticks), the AI,
  `blowMult`, `shotReach`, `canStrike`.
- `src/sim/path.ts`: `walkFrom` (cheapest walks round the others), `firstStep`.
- `src/render/`: `iso.ts` (projection), `boardView.ts` (columns, tile marks), `unitView.ts` (animated fighters),
  `fx.ts` (shots, sparks, numbers, shake), `sheets.ts` (frames and portraits).
- `src/render/sound.ts`: the page's sound (the API: `play`, `playEvents`, `duck`, `setAct`); `audioProcessors.ts` (the audiorective
  processors: cue synth, music player, bus mixer), `audioRules.ts` (pure: pan, ducking, adaptive music), `soundRules.ts` (which cues
  an event calls for). See `docs/notes/audio-engine.md`.
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
