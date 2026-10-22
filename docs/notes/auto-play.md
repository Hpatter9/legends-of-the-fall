# Auto-deploy, auto-replay and x3 speed (auto-play)

Quality of life for the battle screen, the run flow and the armies screen.

## Auto-deploy (the Auto button)

A small **Auto** button (a sparkle icon and the word) sits in the deploy bar between Pack and Home; the four buttons share the
row evenly, and Fight! keeps its own row above. It chooses the squad (heroes already placed stay; the strongest owned heroes fill
the rest, up to five) and sets them out. The player can still drag anyone afterwards, and the next wave starts from the places the
heroes stand, as before.

The rules live in `src/sim/autoplay.ts` (pure and deterministic, no random numbers, no DOM), which the balance tool
(`tools/autoplay.ts`, `playArmy`) now uses too, so what the tool plays and what the button does are the same:

- `autoFormation(board, heroes)`: fighters and tanks (range 1, no shot) take the front row, the toughest in the middle;
  shooters and casters (a shot, or range over 1) take the back, the longest reach furthest back. High ground scores up (more for a
  shooter), tall growth scores down (it hides a shooter's line), water and lava are skipped unless the rows have too few other
  tiles, boulders are never used, and a hero next to another loses score, so a splash blow does not catch the whole team.
- `pickSquad`, `autoEvent` (the best **free** pick: relic, gear, blessing, coin; never a cursed path or anything dear),
  `dressSquad` (gear to whoever's piece is weakest), `autoRound` (event, summons while the gold lasts, squad, gear) and
  `autoDeploy(battle, run, meta)`, which takes back placed heroes and places the squad.
- Placements go through the page's `boostFor` (talents, equipment, tower carry), passed to `autoDeploy`.
- The old "remember the last manual formation per hero" idea was left out: the page already puts a hero back where it stood
  from wave to wave.

## Auto-replay

On an army card whose tier is **already cleared** (Normal: the army's clears; a harder tier: its own `hard` clears) an **Auto**
toggle sits beside Fight!. Tapping it shows run counts **1 / 3 / 5 / 10** and turns Fight! into "Auto-fight ×N". Nothing is
offered on armies or tiers not yet beaten, nor while a run of that army is in progress (Continue/Restart show instead), so it
cannot skip new content (`canAutoReplay`).

The rules are in `src/sim/autoReplay.ts` (`startAuto`, `afterFight`, `stopAuto`, `maxSpeed`); the page plays it from its frame
loop (`Game.autoTick`), so a hidden tab, which draws no frames, **pauses** it and it carries on when the tab returns (the banner
reads "Paused" meanwhile).

- Each wave: the greedy player's `autoRound`, a fresh board, `autoDeploy`, a short pause to show the formation, then the fight at the
  **current speed** (it keeps the speed from wave to wave). No result screens: the fight's crowns, XP, chests (on a clear) and
  gear (found over the run, worn or in the pack) go into the totals. Boss title cards are skipped.
- When a run is cleared the next one starts, up to the count. It stops when the count runs out, on **a loss** (the run's wave is
  noted), or when **Stop** is tapped. Stop hands the board back as an ordinary run where it stands.
- A banner under the top bar shows "Auto 2/5", the army and wave, and **Stop**; the deploy buttons are hidden meanwhile.
- The end shows a **summary card**: runs cleared, crowns, XP, chests, gear found. Its button goes to the armies (done), home (a
  loss) or back to the board (stopped).
- It keeps the screen awake for the whole replay (`keepAwake`, so the Settings choice still applies). It does not change the
  battery saver's 30 fps cap, and skips the result animations altogether.

## x3 speed

The top bar's speed button cycles x1, x2 and x3. **x3** is allowed only on a tier already cleared, or during an auto-replay
(`maxSpeed`); elsewhere it stays x1/x2. The fight loop already scales its ticks by the speed, so the battle is unchanged
beyond running faster; the sound hush at speed x2 and up applies to x3 as well.

## Checks

`test/autoplay.test.ts`: auto-deploy legal and deterministic over 60 boards; fighters in front and shooters behind (a flat board);
high ground, water, lava and boulders; the event picks; offered only when cleared; x3 only when allowed; the replay stops on
its count, on a loss and on Stop, both on the state machine and played through the sim with a strong and a weak party.
Screenshots at 393x852, 360x780 and 412x915 are in `docs/samples/autoplay-*.png`
(`node tools/ui/autoplay-shots.mjs out/web docs/samples`). PixelLab was not used.
