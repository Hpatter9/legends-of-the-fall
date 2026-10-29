# Rift Sanctuary portal expeditions

Owner authorised implementing the illustrated sanctuary concept and portal encounter loop, with complete scenery, distinct arenas and the established ornate UI. Branch: `feat/rift-sanctuary`. This supersedes the dungeon-map direction for new Calamity runs.

## Player flow

New runs begin in a persistent emerald, obsidian and gold sanctuary. The actual starter and recruited heroes gather on its platform. Three illustrated destination cards show the encounter type; selection changes the scene within the portal and reveals rewards, footing, enemies and any twist. Enter the Rift commits the encounter before its crossing flourish. Returning adds a world fragment to the sanctuary and presents the next crossing. Party and starter appearance use current run grade and level.

Regions contain 6, 7 and 8 crossings including a mandatory guardian. Alternatives expire when one is completed; shops cannot be reopened to advance or farm a crossing. The second crossing always offers a free recruitment destination. The penultimate crossing offers recovery, an elite or trade. Guardians open the next region and the existing altar milestones. The full run is 21 encounters rather than a freely traversed graph.

Patron and corruption deterministically influence the worlds offered. Reshape spends 20 run gold once per crossing to expose the other three worlds; it cannot reshape an active encounter, a pending altar choice or a guardian. Existing patron pulses, offering tradeoffs, commandments, corruption, ascension and reward rules remain active. Every resolved destination strengthens the starter, including support destinations: guaranteed regional growth reaches level 12 before the first guardian, 22 before the second, and 30 before the final one. This compensates for the shorter expedition structure; ordinary combat XP can exceed the guarantee. The existing full-run starter progression checks still pass.

## Worlds and battle environments

Six original illustrated worlds share the visual language of the approved concept. The atlas is retained unchanged; SVG viewports select its panels. The sanctuary source and original generated files are retained with provenance and credits.

- **Ashen Keep:** volcanic fortress backdrop, raised flagstone bastion, a lava moat with a narrow bridge, ruined margins and braziers.
- **Rootbound Shrine:** rooted temple backdrop, forest enclosure, shallow pools and a functioning healing shrine.
- **Lost Caravan:** sandstone oasis, tents, campfire, rocks and a sandy open court.
- **Prism Vault:** crystal cathedral, crystal galleries, a raised central dais, arc lamps and an ancient arch.
- **Hollow Court:** moonlit mausoleum, grave gardens, ruined court and ghost lanterns.
- **Frostwatch:** snowy citadel, sheltered court, icy footing, crags and lamps.

Each court has the original 10 playable columns inside a 14×13 board, with two columns of blocked scenery on each side. All three deployment rows remain available, all walkable tiles connect for jump-1 heroes, and large enemy bands retain all their fighters. Every arena includes the arrival portal. Guardians stand in a defined arena centre. The default camera frames the complete court; manual pan and zoom remain available. Scenic support locations retain the actual recruit, shop, rest, train and reforge handlers.

`startStage` now preserves a node's authored board when there is no army-chain board. Arena state and committed world are saved before animation, so resuming does not choose a different world. The new settlement guard prevents replaying an already resolved expedition battle from paying twice.

## Compatibility and files

The optional `rift.expedition` version marker opts only newly created runs into this flow. Existing three-region altar runs and six-map legacy runs retain their graph and dungeon UI. Save keys and unrelated modes are unchanged. All new scenery is bundled through imports; existing service-worker caching of the game bundle covers it offline. Reduced motion removes the crossing flourish and hero/portal animation; background timers are released on leaving the screen.

Main modules: `src/sim/sanctuary.ts`, `src/sanctuaryView.ts`, `src/sanctuaryArt.ts`, `src/sanctuary.css`. Integration: tower/run/modes, TowerView, battle backdrop/road art, main camera/status, recap wording. Legacy graph fixtures now explicitly construct graph saves; roster coverage follows the new crossing and scenic margin dimensions. The headless explorer no longer tries graph-shop backtracking on expeditions.

## Verification

Typecheck and web build passed. All thirteen selected test files passed; the new sanctuary file contains eight regression tests. Reproduce focused simulation checks with `npm test -- sanctuary rift calExplore calLand dungeon-layout modes tower calMapRewards calRoster calamity ascension awaken-mats`; typecheck and build are required. The existing difficulty file was also run for the affected battle setup and passed.

`node tools/calamity/sanctuary-shots.mjs` serves only compiled `out/web` assets on loopback, with a path traversal guard. Browser-only fixtures reach later locations and weaken enemies for UI-flow victories; campaign balance is covered by the existing headless progression checks, not those UI fixtures. The final live flow passed portal previews, real prepared battle settlement/return, altar choices, recruitment, company, fragments, paid reshaping, offline reload and layout at all three phone sizes. Separate checks passed shop/rest actions, guardian victory → offering → recap → next region, full company display, normal-motion crossing interruption/reload and graph-save compatibility, with no page errors. The helper captures live screenshots at 393×852, 360×780 and 412×915, including all six actual destination arenas. Evidence lives in `docs/samples/rift-sanctuary/`. Use `--scenery-only` to refresh the eighteen arena screenshots without repeating progression checks. No merge, release bump or deployment.

## Brought up to main (0.229.0)

The branch was written on 0.204.0 and merged with main up to 0.229.0 (merge commits only). Both sides are kept:

- **The short card (WAVE-RECAP-2).** A won crossing shows main's see-through card, which goes back to the sanctuary by itself or on a
  tap ("Return to sanctuary" is only the button's text when the card is not short). Its heading is `towerHeadline('expedition', ...)`:
  "Crossing made", "Region 2 cleared!", "The party falls". The last guardian ends the run, so it goes straight to the end summary.
- **Per-hero detail.** The region recap ("Region N cleared") takes `closeMapLeg`'s share as each guardian falls (the expedition still
  marks a region's end with `mapDone`), and the end summary and the victory card carry the whole calamity's detail. The summary, the
  victory card, the slot line and the home message say regions and crossings for an expedition, maps and spots for a calamity saved
  before. A test in `test/sanctuary.test.ts` walks all three regions and checks each region's share.
- **Merging (MERGE-TWO).** Still none in a Calamity (`mergesHere`): the PR does not change that.
- **Battle music.** `trackOfRun`: a crossing's fight takes `calbattle`, a guardian `boss` (`isBossRun` reads the node in play).
- **Hero names (HERITAGE-LOOKS).** The starter's name in the old map's header, the altar status line and the sanctuary's hero labels
  use `heroName(kind)`.
- **The no-flicker test.** `dmPortalGlow` and `rsBreathe` looped a change of brightness; they now breathe by size (`transform: scale`).
- **The ailments-off proof** (`test/ailments-identical.test.ts`) was recorded on the old six-map calamity. Its scenario now plays a
  calamity of that shape (`legacyCalamity` in `tools/autoplay.ts`, the new `prep` argument of `playCalamity`): the recorded hash
  still matches, which also shows that a calamity saved before the sanctuary plays exactly as it did.
- **Browser checks.** `tools/calamity/browser.mjs` finds Playwright and Chromium on either machine (`PLAYWRIGHT_DIR`, `CHROMIUM`).
  `sanctuary-shots.mjs` passes the short card instead of pressing Next, and also covers the world preview, the region recap's detail,
  the last guardian and the end summary at the three sizes, and a lost crossing.
- **Size.** The new art is bundled into `game.js` as data URLs (offline needs nothing in `FILES`), which adds about 27 MB to it.
