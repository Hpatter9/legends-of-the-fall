# The Assault, phase 2: the polish round

Built on 1b (`docs/notes/assault-1.md`), on `claude/assault-2`. The director's notes from the screenshots, after 1b was released as 0.409.0:

- **Tall grass** (`fieldView.ts`, the bake's low pass). The tufts are dried to the ground's straw (a darker tint), fewer (two a tile inside a
  patch, one or two at its edge), each its own size, and lean in from a patch's open sides, so a patch has no hard outline. The ground under
  tall grass is the heath's, which fringes into the grass round it.
- **The river** (`fieldLooks.ts`, `fringesOf`). The water takes its fringes from the bank above it too (up to four steps), so every bank
  is fringed: the bank's shingle laid over the water's edge, then the foam line, and the same as rounded corners where only the diagonal is
  land, so the shore no longer reads as a stair of diamonds. The deep water is the sheet's water texture darkened to a blue-green (the
  land's bright blue water is gone, and the land beyond carries the same). The banks keep the orc-04 river-bank face; the shingle beside the
  water takes reeds, pebbles and wet boulders (two in five of its tiles), and the fords their stepping stones.
- **The map edge.** Already gone in the last 1b push (`45377c6`, which the 0.409.0 release did not include): the land runs on ten tiles past
  the edge into a haze that is also the page's colour (`drawSkirt`, `FIELD_FOG`). The river beyond now matches the river within.
- **Near-zoom frames** (`drawChunks`). The chunk bake was measured on the bench (`bake worst` on its readout): about 3 to 6 ms a frame at
  worst. Baking is now held to a budget of 6 ms a frame (and two chunks at most), and once every chunk in view is baked, one chunk of the
  ring just outside the view is baked ahead each frame (prewarmed, hidden until wanted), so a pan finds it ready. The steady frame rate in
  the container's headless Chromium (software drawing) is about 38 to 45 fps at Near and 48 to 50 at Mid on 411 x 915; it is the drawing,
  not the bake. A fresh phone bench is asked for.
- **Liveliness** (`src/render/fieldLife.ts`, new). Embers rise and drift off the fires (the bonfires, the braziers, the gates' torches, the
  drums), and rings spread now and then on the deep water, at Near only, pooled (sixty embers, eight rings at most), and none for reduced
  motion. The firelight already flickers (1b). The motion is now the shared ambient module's (`ambient.ts`): each ember is `emberAt` and
  each ring a slot hashed by `hash01` over the river, pure functions of the battle's clock, so a fixed pool of sprites is set in place
  each frame and holds still across a pause; `motionPlan` gives the amount (none for reduced motion, read live; half for the battery
  saver).

## Checks

- `npm run typecheck`, `npm run web`; the assault tests (74) pass; `assault-looks` covers the new fringes (every edge names the sheet's cell).
- Screenshots: `docs/samples/assault-2/` (Near, Mid, Far, the river, a ford, the edge at 411 x 915; Near and the river at 393 x 852 and
  360 x 780).

## Phase 2's remaining items

### The battle resume (`src/sim/assault/snapshot.ts`, `src/assaultSave.ts`)

- Every twenty seconds of battle time (`snapshotDue`) the page clones the whole battle into IndexedDB (`legends.assault`, about 700 KB: too big
  for the save's local storage) and notes in the save that an assault is under way (`AssaultMeta.live`: the army, the battle time, the day,
  and whether it is the Warband regrouped). A `Battle` is plain data: a structured clone stepped on plays out exactly as the original
  (`assault-resume` checks it, siege works and all), so the design's "snapshot plus the log since" needs no log: the snapshot is taken on
  the tick itself, and the orders after it are simply lost with the page.
- The army card then offers **Resume the assault · m:ss** (from that moment) or **Abandon it**, which asks twice and counts as a withdrawal
  (the try counts, the fallen stay fallen, nobody earns marks, the siege works are not paid back). With no snapshot to be had (a private
  window, a cleared store) Resume abandons it the same way.
- While an assault is under way the save keeps its fallen in their places (as -1; `readAssault` drops them otherwise), so the survivors'
  marks go to the right soldiers when it is settled; and the battle is the truth then: a soldier the save struck off after the snapshot, who
  stands again in the resumed battle, keeps his place.

### The weekly re-storm (`economy.ts` `regrouped`, `weekOf`, `RESTORM_TIER`; `assaultMode.ts`)

- Once a week (Monday to Sunday, read from the day key, never the clock) a conquered hold's army card offers **The Warband regroups · storm
  at Mythic**. The garrison, its officers, the structures and the Council take the Mythic tier (`AssaultInput.tier`, threaded through
  `garrisonBoosts` as `holdBoosts`); the muster says so.
- A win pays **half a Conquest chest** (a Mythic chest, its crowns and stones halved), the hero XP at the Mythic tier, no Spoils, and spends
  the week's re-storm (`conquered[army].regrouped`); a loss can be tried again within the week.
- `npm run balance -- --assault orcs --tier 4` (8 seeds): at level 75 Auto wins 13%, Tactical 75%, Siege 75%; at level 100 Auto 38%,
  Tactical 100%, Siege 100% (losing 92%, 67% and 51% of the host). It is a level-100 fight, as the design meant.

### Tests

`assault-resume` (the clone plays out the same; the fallen kept while under way and the settling after a resume; abandoning),
`assault-restorm` (the week from the day key; only a conquered hold regroups, once a week; the Mythic garrison, half a chest, the week
spent). Screenshots: `docs/samples/assault-2/regroups-393.jpg`, `resume-393.jpg`.

The heavy works and the camp's burning followed (below).

## The simulation's cost, and the Web Worker

The owner's phone (0.410.0, Mid): 60 fps, but the simulation at 2.56 ms a tick (p95 6.40, worst 18.2) against its 3 ms budget.

**What grew.** A profile of the bench fight (`--cpu-prof`, Node) shows the reactive mind and the siege works do not appear in it: `react.ts`,
the smoke, the suppression and the ladders together are under 1%. A tick's time is the walking (the field's bounded walks, 20 to 25%; the
whole minds' own window walks, a quarter of theirs), the foes' and soldiers' cheap minds, and the battle's own per-fighter upkeep
(statuses, kits). Per tick, Node measures the same as 1a (about 0.5 ms a tick over whole fights, 0.62 against 0.69 over the first two
minutes); the growth the phone sees is the fights being busier earlier (the horn's wolves, the sallies, the bands marching) and longer.

**The cuts** (`assault.ts`, `path.ts`):

- a walk keeps the next four steps of its search and takes them without searching again while they stay free (`PATH_STEPS`);
- a cheap mind in its place with nothing near looks again after 700 ms, not every 300 (`IDLE_MS`);
- the big field's window walk clears only the tiles its last walk wrote, not all 10,000 twice.

**The Web Worker** (`src/assaultWorker.ts`, `src/assaultSim.ts`, `src/sim/assault/mirror.ts`, `src/sim/assault/calls.ts`). The design's
fallback: the assault's simulation runs in a worker (its own bundle, `assault-worker.js`, built beside `game.js` and kept by the service
worker), so a slow tick never holds up a frame. The page keeps a copy of the battle to draw and read, merged after each batch (the fighters
by id and the platoons item by item, so every reference the page holds stays good; the tiles a breach or a ladder touched replaced). The
player's orders are made on the copy (for the answer shown at once) and sent to the worker, whose battle is the truth; the result is
settled from the worker's own battle; the worker keeps the snapshots for a resume itself. With no worker (or one that does not start in
eight seconds) it all runs on the page as before. `assault-mirror` checks that the copy, brought up batch by batch, stands exactly where
the worker's battle does.

**The numbers** (the bench fight, Mid, 393 x 852, Chromium headless with the CPU throttled 4x, the first two minutes at x2; two runs each):

| | page's share of the simulation | p95 | worst |
| --- | --- | --- | --- |
| before (0.411.0, on the page) | 5.35 ms a tick | 10.3 | 42.6 |
| the cuts, on the page (`&worker=0`) | 3.5 ms a tick | 6.5 | 26 |
| the cuts, in the worker | 1.27 ms a batch (the copy) | 2.2 | about 10 |

In the worker a tick takes about 0.8 ms (p95 1.4); the throttle does not reach the worker, so that is its own thread's time, not the page's.
The page's share is now within the asked 1.5 ms mean and 3 ms p95 at 4x. The bench's readout shows both (`Sim (worker)` and `Page's copy`),
and `&worker=0` runs it on the page for comparison. The owner's phone should be re-tested.

## The heavy works (`src/sim/assault/works.ts`; the design's 5.2)

- **The trebuchet.** One a battle, free, standing in our camp at the Landing (the siege park, `blueprint.park`, a tent's place drawn as the
  hold sheet's trebuchet). The **Volley** button in the spell row arms it, like a spell; the next tap on the field calls a 3 x 3 strike
  there, within sixty tiles of the park. It is told three seconds before it lands (the nine tiles marked on the ground, pulsing faster as
  it comes, and the stone flying in its arc from the trebuchet), deals 3,000 at the garrison's toughness to each structure under it and a
  fifth of their health to the foes under it, and reloads in forty-five seconds (the button counts it down; the first is ready twenty
  seconds in). The Tactical bot looses at the Iron Gate when a platoon nears it.
- **The stone wall breaches.** Each volley is a hit on each stretch of the stone wall under it (a stretch is three tiles along, the wall's
  thickness through); the third hit breaks it to a ramp of rubble a step above the baileys, so any walker crosses, and the sector graph is
  rebuilt. Its crenels fall to rubble piles and its braziers go (`lookOf`).
- **Sappers' kegs.** The **Keg** order (the works row, one platoon chosen) and a tap on the stone wall or a gate: the platoon fetches the
  nearest powder barrel still standing (the bridge fort's, the forge's), carries it over its leader's head at half its pace, sets it at the
  outer foot of the wall, lights it and runs back five tiles. Five seconds later (the fuse fizzing faster as it runs out) it goes off: the
  stretch breaks, or a structure within two tiles of it, and whoever stands beside it takes a quarter of their health. One keg at a time.
- **Burning the Warpath camp.** Every Reserve tent burnt (by fire arrows, as in 1b) stops the bands as holding the camp does
  (`react.ts`, `campBurnt`; the owner's answer: either stops them).
- **The worker.** The page's copy now drops what the worker's battle no longer has (a volley landed, a keg gone off: the mirror's nested
  objects lose their missing keys), and takes the barrels still standing and the tiles a keg changed.

Tests: `assault-heavy` (the volley told, landing and reloading; three volleys breach a stretch to a walkable ramp; the keg fetched,
carried, set and going off; the burnt camp stops the bands), and a second `assault-mirror` test (the volley and the keg leave the copy, the
lifted barrel leaves its tile).
