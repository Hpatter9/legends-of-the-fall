# The Assault, phase 0: the engine spike and bench

Phase 0 of `docs/design/assault-mode.md` (branch `claude/assault-design`, section 10, "Phase 0: The engine spike"), built to its
section 7 (the engine). It plays as nothing in the game. It proves the engine's budget before any content is built:
**3 ms a sim tick and 60 fps on a mid-range phone** (design 7.2).

Chronos Settlement's conquest code (`hpatter9/little-town`, `src/shared/sim/conquest/`) could not be read. This session was not allowed
to attach that repository, so nothing here is borrowed from it. Phase 1 should still read it, as the design asks.

## What was built

### The field, behind `Battle.field` (`src/sim/assault/field.ts`)

- `Battle.field?: FieldState` is a new optional field on `Battle`. It is absent on every other fight.
- Nothing outside `src/sim/assault/` reads it, and no existing function was changed. The only edits to existing sim files:
  - `walkNear` was added to `path.ts`;
  - `relief` in `board.ts` was exported;
  - the type field was added to `Battle`.
- **The occupancy grid** is an `Int32Array` of the tiles, holding the id standing on each (-1 for none). It is kept as fighters step,
  change places and fall. "Who stands here" is one read.
- **The buckets** are 8 x 8-tile squares, 13 x 13 of them. They are rebuilt each tick by a counting sort, and each lists its living
  fighters in id order. `forNear` looks only at the buckets within reach.

### Long walks: the sector graph (`src/sim/assault/sectors.ts`)

- The field is cut into **25 x 25 sectors of 4 x 4 tiles**, with a graph for each jump class (1, 2, 3, 4 and fly).
- **One change from the design.** The design's graph has one node a sector. The spike showed that a sector holding both the wall's top
  and the bailey below it let the long walk "pass through" the stone wall. So each sector is split into its **regions**: the tiles a
  walker of that class can walk between both ways without leaving the sector.
  - Most sectors are one region; a wall's sectors are two or three. There are about 650 to 690 regions a class.
  - A one-way drop between regions is a one-way edge.
- **Long walks** are an A* over the regions (a heap, ties by the lowest region). Each route is cached for every region along it until
  the graph changes.
- **A breach rebuilds only what it touched**: the broken tiles' sectors are flooded again, and the ways out of those sectors and their
  neighbours are found again. That takes 0.2 to 0.6 ms; a whole rebuild takes about 15 ms. A test checks that the partial rebuild finds
  the same ways as a whole rebuild.

### Short walks: `walkNear` (`src/sim/path.ts`)

- `walkNear` is the existing Dijkstra bounded to a **16 x 16 window** round the walker, with a binary heap.
- It pops in the same order as `walkFrom`'s straight look: the lowest cost, ties by the lowest board index. A test checks that it gives
  exactly `walkFrom`'s costs and ways on the board cut to its window, on the field and on two ordinary boards.
- `walkFrom` is unchanged.
- Its arrays and heap are reused scratch: they hold until the next call. Reusing them cut the garbage-collection pauses.

### Leaders walk; soldiers steer (`src/sim/assault/spike.ts`)

- **Leaders walk real walks.** These are the five heroes and each post's leader. A leader asks the sector graph for the region after
  next, runs one `walkNear`, and takes one step towards the window's tile nearest that point.
  - A leader may change places with its own side's soldier in its way.
  - A leader of ours waits up to 3 s for stragglers, then goes on.
- **Soldiers steer to their slot.** The slots are two ranks of five behind the leader, turned to its heading. Each step is a greedy step
  to the free neighbour nearest the slot: four checks.
  - A soldier engages a foe within its reach plus 2, on a leash of 6 tiles from its leader.
  - A soldier with no step for 2 s asks for one bounded walk.
- **Sleeping posts.** A post that is not awake does not decide at all.
  - Each post checks once a second, through the buckets, for ours within 8 tiles. When it wakes, it calls the posts within 12.
  - The once-a-second jobs are spread over the ten ticks of a second by group id.
- **Blows** are plain: `canStrike` and `blowMult`, a blow landing 300 ms after the swing, no kits.
  - Phase 1 puts the heroes' whole minds on the field.
  - For scale: today's full 5 v 5 fight costs about 0.17 ms a tick in Node, with every kit.
- **The bench's auto plan.**
  - Each platoon crosses at its ford or the bridge, then makes for the keep.
  - While the stone wall's gates are shut, it makes for the nearest gate's front. A leader there batters it, and it breaks in 10 s.
  - At its goal, the platoon marches on the nearest foe still standing, one it can walk to first.
  - A platoon whose hero falls follows its first soldier.

### The 100 x 100 test map (`src/sim/assault/stencil.ts`)

The map is placeholder generation from a **zone stencil**: 50 x 50 characters, each covering 2 x 2 tiles (design 2.1). The placeholder
stencil is drawn by rule here; phase 1 replaces it with Bloodtusk Hold's hand-drawn stencil.

From south to north, it holds:

- the Landing;
- a river with two fords and a bridge;
- the rolling fields, with the board's own `relief` on an 8-tile lattice, eased to a single step;
- a ditch, an earth bank and a palisade with two gates;
- the outer bailey;
- a stone wall 6 steps above the bailey, with two gates shut until broken and a stair up its inner face;
- the inner bailey and a stepped mound with a staircase;
- the Warpath.

The flesh (boulders, bushes, tall grass) is drawn from a side stream: `mixSeed(seed, ASSAULT_SALT)`.

**The forces: 55 against 200.**

- **Ours**: five platoons, each a hero and ten soldiers. The pairs are:
  - Knight with Shieldguard (`cls_paladin_1`);
  - Samurai with Blades (`cls_barbarian_1`);
  - Archer with Archers (`samurai_archer`);
  - Fire Wizard with Battlemages (`cls_warlock_1`);
  - Kunoichi with Skirmishers (`cls_illusionist_1`).
- **Theirs**: 30 posts of orcs (grunts, archers, brutes, chieftains, the warlord), plus war-wolves on the Beastmaster's `wolf_black`
  sheet. Every sprite is an existing sheet.

### The renderer (`src/render/fieldView.ts`, `fieldDetail.ts`)

- **Chunks.** The field is baked in **chunks of 10 x 10 tiles** with Canvas 2D, at half resolution.
  - Each tile's top is its land's ground texture, laid onto the diamond by an affine transform. Its two visible sides use the land's
    side texture, down to its front neighbours.
  - Highland art is used outside the palisade, war camp art inside. All of it comes from the packs (`AREA_URLS`, `TERRAIN_URLS`, the
    camp's gate, the fx pack's impact and arrow).
  - Chunks are baked on demand, at most two a frame, nearest the middle first. They are kept in a cache of 36, and chunks in view are
    never let go.
  - A breach drops the chunk so it is baked again.
- **Tall things** (boulders, bushes, palisade ruins, the gates) are sprites sorted with the fighters.
- **Three levels of detail** by zoom:
  - **Near** (0.35 and up): fighters animated on their sheets, team rings, hit sparks, arrows.
  - **Mid** (0.15 to 0.35): sprites a little smaller, with no effects.
  - **Far** (below 0.15): one 1,024 px overview baked at the start, a 3-pixel dot a fighter, and a count over each group about 14 px
    tall. Far draws no chunks.
  - The levels change only 5% past each threshold (a 10% band), so a pinch at the edge does not flicker. A test checks this.
- **Fighters out of view** have no sprite; theirs goes back to a pool.

### The benches

- **`?bench=assault`** (`src/assaultBench.ts`; `main.ts` starts it instead of the game, and it touches no save).
  - It plays the fight live and shows, on screen:
    - the sim's ms a tick (mean and p95 over the last 600 ticks, and the worst);
    - the frame rate;
    - the frame time (mean and p95), and the frame's own work (sim, view update and render call).
  - **The camera** starts close in over the Landing and drifts to the fiercest fight: the most blows of the last 3 s in one bucket, at
    most 30 tiles a second.
  - **Controls**:
    - drag to pan, pinch or the wheel to zoom;
    - the buttons Near, Mid, Far, Follow and Next;
    - `&lod=mid|far`, `&speed=2` and `&seed=N`.
  - When a fight ends, the next seed starts.
  - It is bundled into `game.js`, so it works offline with no new files.
- **`npm run assault-bench`** (`tools/assault/bench.mjs`).
  - It plays whole fights headless (`--seeds N`, `--seed N`).
  - It prints the sim's ms a tick (mean, p95, worst), the walks and decisions a tick, the rebuilds and A* searches, and a checksum.
  - It also prints today's 5 v 5 fight for scale.

## The numbers

### Headless (Node, this container's CPU)

Three seeds, each played to the 12-minute limit (7,200 ticks):

| | Seed 1 | Seed 2 | Seed 3 |
| --- | --- | --- | --- |
| Sim ms a tick, mean | 0.134 | 0.156 | 0.134 |
| p95 | 0.400 | 0.400 | 0.406 |
| Worst | 3.94 | 1.47 | 8.77 |
| Bounded walks a tick (most) | 1.16 (13) | 1.75 (12) | 1.26 (17) |
| Decisions a tick (most) | 12.8 (50) | 13.3 (50) | 10.5 (50) |
| Sector rebuilds | 2 | 1 | 2 |
| Ours left / foes left | 13 / 59 | 19 / 72 | 9 / 32 |

- The design's desktop target is 0.75 ms (3 ms at a 4x phone factor). The mean is about **0.14 ms, a fifth of it**.
- The worst ticks are not tied to work. A 5 ms tick had 2 walks and 18 decisions. They are the first, cold tick (all 50 of ours decide
  and the first A* searches run while the code is still being compiled) and garbage-collection pauses.
- Building the map and placing the 255 takes 35 to 70 ms.

### Browser (Chromium at 393 x 852, `Emulation.setCPUThrottlingRate` 4, 45 s each)

| Level | Sim ms a tick (mean / p95 / worst) | fps | Frame ms (mean / p95) | Work a frame | Drawn |
| --- | --- | --- | --- | --- | --- |
| Near (0.5) | 1.40 / 3.7 / 25.6 | 29 to 32 | 32.0 / 50 | 3.1 ms | ~57 fighters, 23 chunks |
| Mid (0.22) | 1.45 / 4.0 / 10.7 | 28 to 32 | 34.4 / 50 | 5.7 ms | ~150 fighters, 55 chunks |
| Far (0.06) | 1.39 / 3.6 / 12.2 | 58 to 60 | 17.0 / 16.8 | 2.7 ms | 239 dots |
| Near, unthrottled | 0.35 / 0.8 / 8.5 | 52 | 18.5 / 33 | 0.5 ms | ~60 fighters |

The 360 x 780 and 412 x 915 layouts were checked by screenshot: the readout wraps, the buttons fit, and Far shows the whole hold.

### Is the budget met?

- **Sim: yes.**
  - The mean is 1.4 ms a tick at 4x throttling against a 3 ms budget, and 0.14 ms in Node against 0.75.
  - The worst-tick budget (8 ms on the phone) is **not proven**. Single outliers of 10 to 26 ms show at 4x in the browser, and up to
    8.8 ms in Node. They come from cold compiles and garbage collection, not from the work: p95 is 3.6 to 4 ms.
  - The design's fallback (the sim in a Web Worker) would hide them from the frame.
- **Frames: not shown here, and this stand-in cannot show them.**
  - This container's Chromium has no GPU. WebGL is SwiftShader (`ANGLE … SwiftShader Device`), a software rasteriser.
  - The frame's own JavaScript is small: 0.5 ms unthrottled, 3 to 6 ms at 4x, inside a 16.7 ms frame.
  - Near and Mid run at 30 fps, while Far, which fills far fewer pixels, holds 60. The limit is the software filling of pixels, which
    CPU throttling does not even touch.
  - A real phone's GPU does that fill in hardware. **The owner's phone is the real gate**: open `?bench=assault` on it after release,
    and read the fps at Near, Mid and Far.
- **Things the spike does not yet carry**, which phase 1 will add:
  - the heroes' full kits (about 0.17 ms a tick for five heroes today, in Node);
  - the hold's mind;
  - structures as units;
  - damage numbers.

## Tests

`test/assault-engine.test.ts` checks:

- `walkNear` equals `walkFrom` inside its window;
- the sector graph keeps the inner bailey shut to every walker until a gate breaks, and open after;
- the partial rebuild equals a whole rebuild;
- the placeholder map is the same for its seed, and every outside tile is walkable from the Landing at jump 1;
- 55 against 200, with every post asleep on the first tick;
- the grid and buckets match the fighters;
- **the same seed plays the same fight** (checksum, `b.rng` and every fighter, part-way and to the end), and another seed another;
- the budget, counted: bounded walks a tick ≤ 8, decisions a tick ≤ 60, a rebuild for each break;
- no other fight has a `field`;
- the levels of detail's band.

The existing fights are untouched: `nemesis-regression`, `stand-regression`, `spells-identity` and `ailments-identical` pass. The full
suite has the same 33 failures as `main` had before this branch, all in hero and skill content tests and none in the battle engine; no new
failure.
