# Legends of the Last Keep

(The game was called Legends of the Fall until 0.134.0; the repo, the web address and the save keys (`legends.*`) keep the old name, so existing saves and the installed app carry on.)

A King God Castle style auto-battler: place five heroes on the near rows of an FF Tactics style height grid, then
they fight a band of foes on their own in real time. Played as a phone web app (a PWA on GitHub Pages).
TypeScript + PixiJS, the same stack as Chronos Settlement (`hpatter9/little-town`); the owner may fold this game into
Chronos later, so keep its conventions.

## How to work

1. Work on a branch of your own; never push to `main` directly (the owner merges).
2. Read a file and its neighbours before editing it, and copy their style: plain-English comments, British spelling
   in the game's text.
3. Check your work: run `npm run typecheck` and `npm run web` for implementation changes, and run only the tests
   relevant to the changed behaviour and its affected callers (for example, `npm test -- party suggest`). Full test
   suites and unrelated balance sweeps are not required. For page or renderer changes, also inspect the affected
   screens at upright phone sizes 393x852, 360x780 and 412x915. Documentation-only changes need diff, link and
   consistency checks, not runtime tests or builds. Report what actually ran. Never skip, delete or loosen a test
   merely to get it to pass; when an owner-approved requirement changes, update the affected coverage to match.
4. Add a test in `test/` for any new rule in the simulation.
5. Write a short note of what you built in `docs/notes/<topic>.md`.
6. Never put a model name or ID in code, comments or docs.
7. **The version (the owner's ask):** the page shows "Version <package.json version> · <commit>" (top right).
   Every merge into the working branch bumps the minor version in `package.json`
   (0.2.0, 0.3.0, ...), done by whoever merges (the director); workers never change it. The same merge adds the
   release's entry at the top of `UPDATES` in `src/updates.ts` (Settings, Updates and notes; a test checks it).

## Rules that are easy to break

- **The simulation is deterministic** (`src/sim/`): no `Math.random()`, `Date.now()` or DOM. Randomness comes from
  the fight's stream (`b.rng`, through `Rng`) or a side stream of the seed (`new Rng(mixSeed(seed, <salt>))`). A new
  system takes its own side stream, so existing fights play out the same.
- **The renderer never changes the battle** except through the sim's own functions (`place`, `unplace`, `fight`,
  `stepBattle`). Modules the tests import must not import Pixi or touch the DOM.
- **Visual effects.** Flashy effects, glows, pulses, flicker and flourishes are all allowed; there is no "no flashing"
  rule (the owner withdrew it, 2026-11-08). Preserve reduced-motion support.
- **Upright phone only.** The game is played upright only (the owner's call): design and check every change at 393x852 (and 360x780, 412x915). There is no sideways layout to keep: a phone held sideways is asked to turn upright (`#turnUp`), and the manifest asks for portrait.
- **Use the asset packs, not code-drawn art**, wherever a pack has the thing. The packs are in the private repo
  `hpatter9/chronos-assets` (clone it next to this one). Copy only the sprites used into `src/art/`, credit them in
  `CREDITS.md`, and never change the assets repo. Chronos's cut sheets (`src/renderer/art/creatures/packs/` and
  `packs.json` there) can be copied as they are.
- **New art gets a ChatGPT prompt.** Whenever a change needs art that the packs and `src/art/` don't have, write a ChatGPT image
  prompt for it (in `docs/notes/<topic>-art-prompts.md`: one fenced prompt per image or sheet, naming the repo, an `art/<topic>`
  branch, the file under `art-source/`, the canvas size, a transparent background and the game's style), and tell the director,
  rather than spending time on code-drawn art. A plain stand-in until the art lands is fine.
- **It must play offline** (the owner plays on planes). The service worker (`build.mjs` writes `out/web/sw.js`) caches
  every file the game needs on the first visit. A new file the page loads by URL (backdrops, music, anything not
  bundled into game.js as a data URL) must be added to its `FILES` list, or the game breaks offline.
- **Every menu is built with the standard ornate menu** (the owner's standing instruction): a new card, sheet or menu uses
  `src/ornateMenu.ts` (`ornateMenu`, `menuSection`, `menuPick`, `menuWell`, `menuFoot`) and its classes in `ornateMenus.css`, never a
  card drawn by hand. Full pages say "‹ Back", cards "Close". See `docs/notes/ui-standard.md`; `test/ui-standard.test.ts` checks it.
- **When unsure what the owner wants, ask.**

## Layout

- `src/sim/board.ts`: the grid (8 across, 11 deep: `W`, `D`; the Calamity's is 10 x 13), heights (hills, platforms with a staircase, pits; `docs/notes/height.md`), the terrain (shallow and deep water, ice, lava, tall grass, shrines, ruined walls, powder barrels; `docs/notes/map-layouts.md`), `canStep` (each unit's own `jump`), `sightClear`, `makeBoard(seed)`.
- `src/sim/layouts.ts`: the battlefield shapes (river, hill, pass, ruined fort, islands, ring, ravine, plain, rolling land), picked by land and seed (`layoutFor`) and laid over the land (`applyLayout`); `src/sim/terrainInfo.ts` is the codex's words for each.
- `src/sim/lands.ts` / `weather.ts`: the seventeen lands (`AREAS`; `CLASSIC_AREAS` are the first six), which land each army's waves and the Last Stand use, and each fight's weather (`weatherOf(board)`, looks only; `docs/notes/map-lands.md`).
- `src/sim/fieldTraps.ts`: LIVING-FIELDS, the traps and hazards of the ordinary battlefields by land (spike traps, snares, rune wards, brambles, deep mud, poison bogs, thin ice, totems, braziers, and timed strikes run by `hazards.ts`), laid by one side stream behind one switch (`FIELD_HAZARDS`); `src/render/floorRules.ts` / `floorArt.ts` are each land's floor from the painted hold sheets, `trapLooks.ts` / `trapArt.ts` the traps' looks, `boardLifeRules.ts` / `boardLife.ts` the battlefield's life (creatures that scatter, decals, falls, light, smoke, dust; looks only) (`docs/notes/living-fields.md`).
- `src/render/landRimRules.ts` / `holdSprites.ts`: LAND-IDENTITY, what stands round and on each land's battlefield (the rim outside the two far edges: cavern walls, open water; set pieces from the hold sheets; reeds on the board's water; a dark layer with pools of light), looks only; `boardView.ts` `layRim` and `boardLife.ts` draw it (`docs/notes/land-identity.md`).
- `src/sim/landTerrain.ts`: LAND-IDENTITY's terrain proposal: a land's own ground laid thicker at a fight's start (`FLOODS`, each land with its own `on`: the mire floods and the snows ice over; the ashlands' lava and the highlands' boulders are built but off, by their measure), a rule of the fight behind its own switch (`LAND_TERRAIN`, on, as `FIELD_HAZARDS` is: the owner's call) and side stream; `node tools/land-identity/flip.mjs` measures the two switches together; `node tools/land-identity/mire.mjs` measures it (`docs/notes/land-identity.md`).
- `src/armiesView.ts` / `src/armySwipeRules.ts`: the Armies page (the War Room). ARMIES-SWIPE: only the strip of army cards slides (the centred card, its neighbours peeking in dimmed at the sides), with the finger, an arrow or a dot; the information under it changes once the card has settled (the rules are pure: `settleOn`, `dragShift`, `infoArmy`; `docs/notes/armies-swipe.md`).
- `src/sim/starter.ts` / `src/starter.ts`: the starter pick (two fixed packs of three simple heroes for every new save, `FIXED_PACKS`; `docs/notes/starter-king.md`). Heroes have no rarity; every hero is as strong as any other (`docs/notes/no-rarity.md`).
- `src/sim/lives.ts`: TEN-LIVES, a run's ten lives in place of its two hearts (`LIVES`, `REVIVE_MS`, `REVIVE_HP`): a fallen hero rises after five seconds of the fight for one life, a party all down rises at once for a life each, and with none left the fallen stay down (`Battle.lives`, `tickLives`, `partyFell`, `outOfTime`); `run.ts` keeps the run's count (`livesLeft`, `settleLives`, `partyFalls`); `node tools/ten-lives/run.mjs` measures it against the old hearts (`docs/notes/ten-lives.md`).
- `src/sim/spellSlots.ts`: SPELL-SLOTS, how many of the king's four spell slots a save has open (one at the start, then by army stars: `SLOT_STARS`), what an old save keeps (`Loadout.slots`) and the unlock's notice (`docs/notes/spell-slots.md`).
- `src/sim/unlock.ts` / `unlockRules.ts` / `contentHeroes.ts`: heroes are collected by shards (`Meta.unlock`) or, for ten of them, earned by a milestone (`docs/notes/hero-shards.md`; `npm run unlock-pace` models the pace).
- `src/sim/stand.ts` / `src/standView.ts`: the Last Stand, the camp's endless mode (guard the ruler on the keep wave after wave; it took the place of the old endless tower/spire climb). `src/sim/tower.ts` is no longer a mode of its own: its map engine (`run.tower`, `towerRun` for tools and tests) runs the Calamity's maps, and `migrateOldClimb` settles a very old saved climb. A player cannot start a tower climb.
- `src/sim/daily.ts`: the daily's shape (ten waves, the boss of the day, `dailyArmy`), with `modes.ts` (`settleDaily`, `dailyLine`) and `docs/notes/daily-goal.md`.
- `src/sim/nemesis.ts` / `nemesisTraits.ts` / `nemesisLog.ts` / `nemesisNames.ts`: the Nemesis War (phase 1 of `docs/design/legends-expansion.md`): foes named by what they did, read from the battle log, their traits and the fight's hooks (each a no-op without `Unit.nem`), `Meta.war`, `Run.nemesis`; the board is `src/nemesisView.ts` (`docs/notes/nemesis-1.md`). Phase 2, the Dark Council: `src/sim/council.ts` (the turns between runs on `COUNCIL_SALT`, loyalty, the warchief's seat, `noteWar`, the War Trophies and the Spoils) and `src/sim/muster.ts` (the Warchief's Muster, a `muster` run in its own slot); `npm run war-sim` (`docs/notes/nemesis-2.md`) Phase 3, revenge, trophies and taunts: `src/sim/revenge.ts` (Grudges, the Avenger and Vengeance, humiliation, trophies, `planRun`), fleeing in `nemesisTraits.ts` and `battle.ts` (a hash of the moment, behind `Unit.nem`), the taunts in `src/sim/nemesisLines.ts` and the cut-in in `src/tauntCutRules.ts` / `src/tauntCut.ts` (`docs/notes/nemesis-3.md`). Phase 4, duel waves: `src/sim/duel.ts` (the challenge, `startDuel`, the shares, the outcomes; one a run, `Run.duel`) and `src/sim/duelRing.ts` (`Battle.duel`: the ring, its end), the challenge's card in `src/duelView.ts` and its words in `src/duelRules.ts`; `npm run balance -- --duel` (`docs/notes/nemesis-4.md`).
- `src/eidolonStage.ts` / `src/render/groundSheet.ts` / `src/stageSheet.ts`: EIDOLON-BLENDER, an Eidolon's ground show staged in Blender (`tools/blender-fx/eidolons/`) round its painting: a sigil, cracks and scorch laid on the tiles' ground under the fighters; a pillar, an explosion with a wall of fire, tile fires, smoke and embers over them, laid with the painted strike by `eidolonCall.ts` (`STAGED`: all six, Askel's fire, Nivra's ice, Gorm's stone, Voltara's lightning, Aurelan's light and Vaelkhar's shadow, each its own sheets in the same places; `docs/notes/eidolon-blender.md`).
- `src/render/summonRules.ts` / `src/summonFx.ts`: SUMMON-SHOW, a draw's shard cards first, then each new hero's full reveal (`drawOrder`, `shardTotals`), and the summoning's show rendered in Blender (`tools/blender-fx/summon/`, its own sheets in `src/art/fx/summon/` and manifest `summonFxData.ts`; `heroShowAt`, `cardFlourish`; `docs/notes/summon-show.md`).
- `src/sim/units.ts`: `UNITS` (the five heroes; the foes come from `foes.ts`), `HEROES`. `src/sim/foes.ts`: `FOES`, `FOE_BANDS`.
- `src/sim/tiers.ts`: the five army tiers (Normal, Hard, Elite, Legendary, Mythic); which hero level each is for, and how the Last Stand and Calamity answer the castle, is in `docs/notes/difficulty.md` (`npm run balance -- --no-tables --deep ... [--talents]` measures it).
- `src/sim/ultimates.ts`: every hero's ultimate (the eight old ones are in `abilities.ts`, the other 37 here; each unlocks at `ULT_LEVEL`, level 30; `docs/notes/ultimates.md`).
- `src/ultStageRules.ts`: ULT-EPIC 2, the three stages of a show as data (a wind-up, the strike, an aftermath): each ultimate's length by its weight (4 to 6 s by hand, its showcase on every use; about 7 s for one with a salvo to land after it) and each Eidolon's (4 to 10 s), where a frame sheet is hung on a stage (`STAGE_ART`); `ultMomentRules.ts` (`UltQueue`) plays them, `ultMoment.ts` draws them, and the fight's speed is only ever read (`momentSpeed`), never written (`docs/notes/ult-epic.md`).
- `src/ultCameraRules.ts`: ULT-CAMERA, where the camera looks through a show (pure): on the caster for the casting, a timed travel to where the effect lands, a strike frame that holds every struck spot and the strike sheet's real box inside the safe rectangle (stepping between bursts too wide to fit), held through the aftermath, then back to the fight's follow; an Eidolon's strike framed on the board's picture (`pictureFrame`) and a king's spell's glance (`spellView`). `ultMoment.ts` (`camOf`, `focus`), `main.ts` and `eidolonCall.ts` (`frameShot`) ask it (`docs/notes/ult-camera.md`).
- `tools/freeze-fix/soak.mjs`: FREEZE-FIX, the soak that plays whole runs four ways and flags a fight that stops or a wave's end that shows nothing (`context.mjs` beside it takes the graphics context away). The rules that keep a wave's end from waiting: one full show at a time (`oneShow`), no show outliving the fight (`UltQueue.fightOver`, `EidolonCall.fightOver`), a deadline on every moment (`momentLimit`) and on the call's wait for its strike (`strikeOverdue`), the page's belt (`waveEndStuck`), and a lost context's reload (`src/contextRules.ts`) (`docs/notes/freeze-fix.md`).
- `tools/wave-delay/delays.mjs`: WAVE-DELAY, what stops or slows a fight mid-wave, measured over whole runs (every stretch of 250 ms or more with the battle's clock still, and what held it; `--work` names the pictures handed to the graphics card in a fight). The rules: a fall's slow moment is a boss's alone (`fallSlowMs`), an ultimate's short version never slows the fight (`ultCastBeat`, both in `render/fxRules.ts`), and the large sheets a fight draws from are kept ready (`render/texReadyRules.ts`, `texReady.ts`); a board's painted columns are kept for three boards and the next board's are painted ahead a few a frame (`render/boardWarmRules.ts`, `BoardView.prewarm`); `profile.mjs` beside it profiles the main thread on a real, throttled clock (`node build.mjs --plain` keeps names); Settings, Diagnostics lists the stops the game has seen on the device (`src/diagRules.ts`, `diag.ts`); the picture's loop is watched from a timer of its own (`src/loopRules.ts`, `Game.watchLoop`: a stopped loop started again, a drawing that keeps faulting has the board built afresh, else the page is loaded again) (`docs/notes/wave-delay.md`).
- `src/render/marchStayRules.ts`: MARCH-STAYS, the hand-over from the march between two waves to the next deploy (pure): a marcher leaves the stage only when the next fight's fighters are made (`marcherAfter`, `fightersTakeOver`; `ChainView.release`, called from `syncSprites`), a board's build makes the new before it takes the old down (`BUILD_ORDER`), and between two waves the host on show is the section marched to (`hostOnShow`); the rim's pieces go before its picture (`BoardView.dropRim`: a sprite left with a dead picture made every drawing of the march throw), the fallen and a duel's watchers march too and each walks to the tile the deploy will give it (`marches`, `squadTiles`), and the deploy's camera starts from the picture on the screen (`sameView`); `node tools/march-stays/film.mjs` films the hand-overs and fails on a picture short of a hero or a settled tile, a turn of the loop with nothing drawn, or a fault written (`docs/notes/march-stays.md`).
- `src/sim/battle.ts`: deploying (`canPlace`, `place`, `unplace`), `fight`, `stepBattle` (100 ms ticks), the AI,
  `blowMult`, `shotReach`, `canStrike`.
- `src/sim/path.ts`: `walkFrom` (cheapest walks round the others), `firstStep`; `walkNear` (the same walk in a 16 x 16 window, with a heap: the Assault's field only).
- `src/sim/assault/`: the Assault's engine (phase 0 of `docs/design/assault-mode.md` on `claude/assault-design`): `field.ts` (`Battle.field`: the occupancy grid and 8 x 8 buckets), `sectors.ts` (the 25 x 25 sector graph, split into regions, for long walks), `stencil.ts` (the zone stencil and the 100 x 100 field it lays), `spike.ts` (the 55 against 200 bench fight). `src/render/fieldView.ts` draws the field in chunks at three levels of detail; `?bench=assault` (`src/assaultBench.ts`) and `npm run assault-bench` measure it (`docs/notes/assault-0.md`).
- `src/sim/assault/devTrial.ts` / `src/devAssaultView.ts`: ASSAULT-DEV, Settings › Developer › Try an Assault: any hold, its Last Hold or its Warband regrouped, stormed by the force a player has there (the level, rank, talents, skills, castle and host of the game's own paces; As expected, Strong, Weak) on a throwaway copy of the save (`trialMeta`; nothing saved, no snapshot kept); `node tools/assault-dev/run.mjs` plays every storming by Auto (`docs/notes/assault-dev.md`).
- `src/render/ambient.ts` / `ambientScenes.ts` / `ambientPaint.ts` / `ambientLayer.ts`: ALIVE, the life of every painted scene (flicker, sway, ripple, embers, motes, birds; each painting's masks as data; drawn on a scene's own canvas or by a layer over a DOM painting, paused when hidden, still for reduced motion; `docs/notes/alive.md`).
- `src/render/`: `iso.ts` (projection), `boardView.ts` (columns, tile marks), `unitView.ts` (animated fighters),
  `fx.ts` (shots, sparks, numbers, shake), `sheets.ts` (frames and portraits).
- `src/render/sound.ts`: the page's sound (the API: `play`, `playEvents`, `duck`, `setAct`); `audioProcessors.ts` (the audiorective
  processors: cue synth, music player, bus mixer), `audioRules.ts` (pure: pan, ducking, adaptive music), `soundRules.ts` (which cues
  an event calls for). See `docs/notes/audio-engine.md`.
- `src/render/holdSound.ts`: the Assault's sound, pure (each hold's ambience bed and what its drums beat with, the war table's and the field's music, the cue for each of the field's events, the drums' beat, the music as an assault ends); `sound.ts` plays it (`setHold`, `setHoldDrums`, `playHold`, `endAssault`). `docs/notes/hold-sound.md` has the audit of what plays where.
- `src/render/epicMusic.ts`: the music the page plays: original tracks built on one main theme (`tools/epic-music/theme.mjs`, `docs/notes/music-theme.md`; every battle plays its one `battle` arrangement and a boss its `boss` one, `docs/notes/battle-music-2.md`; every file levelled to -18 LUFS by `tools/epic-music/level.mjs`) plus the gothic-symphonic place and scene tracks (`src/audio/*.opus`, rendered offline by `tools/epic-music/`; `npm run music` re-renders them; `docs/notes/epic-music.md`), which track each place takes (`placeOf`) and the loader; `src/render/battleMusic.ts` picks the track (`trackOfRun`: the battle track, kept wave to wave, the boss track for a boss's wave) and its victory music (`docs/notes/battle-music.md`). `build.mjs` copies the files and lists them in the service worker.
- `src/main.ts`: the page: input (drag or tap to place), camera fit, the bench and buttons. `window.__game` is the game.
- `src/index.html`: the page and its CSS; `build.mjs` builds `out/web`.

## Commands

```bash
npm install
npm run typecheck
npm test -- party suggest # affected test files; arguments match filename substrings
npm test                 # optional full suite
npm run web     # out/web
npm run dev     # serve on :8000 with rebuilds
```
