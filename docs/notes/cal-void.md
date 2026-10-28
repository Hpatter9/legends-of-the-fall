# CAL-VOID: the Calamity map, small and branching (phase A: proposal and mock-ups)

The owner's ask (fix list): scrap the current Calamity map for a **small void-dimension map with branching paths**. Design and mock-up first.

Branch `claude/cal-void`. Phase A only: nothing in `src/` has changed. The mock-ups are drawn over the real Calamity screen (its header,
party and footer are the game's own) by `tools/cal-void/mock.ts`, using the map's own pack art (the landmark atlas, the Undead Tileset
rock, the stars, nebulae, moons and the PVFX rift) and its island and stone drawing (`render/calRealm.ts`). Every picture is stamped MOCK-UP.

- Contact sheet: `docs/samples/cal-void-mock-sheet.png` (the three layouts; top a fresh map, bottom a few spots in).
- Each shot at 393x852: `docs/samples/cal-void-mock-{a,b,c}-{fresh,mid}.png`; the same at 360x780 and 412x915 with `-360` / `-412`.
- Remake them: `npm run web`, then `node tools/cal-void/shots.mjs` (`SIZES=393,360,412` for all three sizes).

## What is wrong with the map now (the history)

1. Countryside lands (`calamity-map.md`), then floating islands in a starfield (`calamity-void.md`, the "interdimensional" ask).
2. Free exploration (`calamity-explore.md`, the "go to all the spots, backtrack" ask): every spot of a map can be cleared in any order.
3. `cal-map.md`: one campfire and one recruit spot a map (hubs), islands further apart, a recap.

The result is a **tall scrolling map** (6 to 8 floors, about 11 spots and 0.7 hidden detours a map, `ROW_A` 11 cells between floors),
with big islands (a landmark about 120px across on screen), so only two or three spots show at a time. Because every spot can be
taken, a fork is not a choice, only an order: a thorough player clears all of it (about 80 stops a run). That is the "unsatisfying".

## What "small" and "branching" mean here

- **Small**: a map is **8 spots plus the portal and the boss**, and the whole map **fits the screen with no scrolling** (the box under the
  header is 393x606 on the reference phone; the layouts spread to fit 360x780 and 412x915). The islands are drawn at the art's own
  pixel size on the phone's screen (one art pixel to one device pixel, so half the size they are now: a landmark about 60px across),
  which is what makes eight of them fit and still read.
- **Branching**: a **route** through a map is **4 spots, then the boss** (layers: two spots, three, two, the campfire). Every layer is a
  fork; which spots you take decides what the map gives you (a shop or a mystery, a mini-boss or a chest). A run of six maps is then
  about **24 stops and 6 bosses**, against about 80 stops now: close to the climb before free exploration (about 30).

## The rule: branching against backtracking (a question for the owner)

The two asks pull against each other: a fork is only a choice if taking one side gives up the other, and the earlier ask was to reach
every spot and walk back. Three ways to settle it:

1. **Your road (recommended).** Each fork closes the way you did not take: those spots *drift away* (drawn drained and sunk into the
   void, "Drifted away"). You can still **walk back along your own road** at any time, so the shop you passed is still there to visit
   again with more gold (the practical reason for the backtracking ask, kept). Rule: the next spots are those the furthest cleared spot
   leads to (`t.at`'s `next`, as the climb used to be), and the party may walk to any cleared spot. No new save field is needed: what
   has drifted is everything not on the road and not ahead of it.
2. **Free roam, small.** Keep today's rule on the small map: every spot can be cleared, the forks only set the order. Simple and keeps
   the old ask to the letter, but the branches are not choices (a thorough player clears all 8).
3. **A budget.** Every spot can be reached and walked back to, but the rift lets the party clear only **5 of the 8** before the boss
   wakes: the choice is which five. Keeps both asks literally; less of the "road" feel, and harder to read on the map.

## The three layouts (pick one)

All three: one screen, 8 spots, the portal at the foot, the boss's lair at the head with a "Boss" tag, the campfire last before it.
Lit (takeable) spots wear a gold ring and a **name tag** under them (Fight, Shop, Mini-boss...), so the map reads without tapping;
cleared spots show their spent picture and the green tick; the party's leader stands on its spot. The whole map is visible from the
start (planning a road needs it); no fog.

### A · The rift ladder (recommended)
Layers like Slay the Spire's map, small: portal, then 2, 3, 2 spots, the campfire, the boss, each spot linked to one or two above. Many
different roads cross the map (in the mock-up: six), and every layer is a real choice. Links are the current lines of rune stones.
The recruit stands in the middle of the second layer, reachable from both first spots, so it is always on offer but costs a road
(here: the recruit, or the mystery, or the shop). **Why recommended**: the clearest forks, the most roads for the fewest spots, reads at
a glance, and many shapes can be made (several ladder templates, mirrored), so maps differ.

### B · The orbit
Two arcs of spots round a great rift in the middle (the PVFX portal, large, behind the recruit's island); the recruit floats in the rift
and joins the arcs, so you can **cross over** from one arc to the other. Each arc has a character (the mock-up: the shop side and the
mini-boss side). The most striking and most "interdimensional" of the three, but every map has the same shape, with fewer different
roads (four).

### C · The spine and its pockets
One winding road up the screen with **pockets** off it (a dead-end spot: a chest, a shop, a mystery) and one fork. A pocket must be
taken while you stand beside it, or it drifts off when you move on (today's hidden side-spot rule, made visible). Links are thin threads
of starlight. Most like a journey; the fewest real forks (one), the choice is mostly "take the pocket or not".

## Spot kinds: an open list (for the peculiar encounters)

Today a spot's kind is a closed union (`NodeKind` in `sim/tower.ts`) and each kind is wired into the map generator, the art picker in
`calMap.ts` and an `if` chain in `towerView.ts` (`cur.kind === 'shop' ... 'campfire' ...`). Phase B makes it a **registry**, so the
other AI's bard, gambler forge and haunted mirror (and any later kind) slot in without touching the map:

- **`src/sim/calSpots.ts`** (pure): `SPOT_KINDS: Record<string, SpotKind>`, one entry a kind:
  `{ id, name, tag (the map's label), button ('Go to the shop'), line (the footer's line), art, spentArt?, fights?: boolean,
  revisit?: boolean (a shop can be entered again), slot: 'fight' | 'event' | 'fixed', weight?, layers?: [first, last], perMap?: [min, max] }`.
  The built-in kinds (fight, elite, shop, recruit, treasure, campfire, mystery, boss) are entries like any other.
- **The generator** fills each template's slots: fixed slots (portal, recruit, campfire, boss) by their kind; **event slots** by weight
  from every kind whose `slot` is `'event'` and whose layers and per-map counts allow it (its own stream, so adding a kind does not
  change the fights' draws). A new kind with `weight` 0 is off until tuned.
- **The card**: `src/calSpotCards.ts` maps a kind's id to the function that opens its card (`shop: (view) => view.shopCard()` ...);
  `towerView.ts` calls `SPOT_CARDS[kind] ?? SPOT_CARDS.mystery` instead of the `if` chain. A new kind adds its card function here.
- **The art**: a kind names its atlas pictures (`art`, `spentArt`); `tools/calmap/prep.py` adds them to the atlas. A kind with no picture
  yet shows the mystery's moon shrine.
- **Saves**: `MapNode.kind` stays a string in the save; a kind the page does not know (a newer save on an older build, or a kind
  withdrawn) is treated as a mystery, so a run never breaks.
- **To add a peculiar encounter**: one `SPOT_KINDS` entry, its card function, its sim rule (with a test) and its art. Nothing in the map,
  the layouts or the route rules changes.

## Rules and numbers (phase B, for the chosen layout; A shown)

- **Templates, not a free generator**: a small set of hand-made shapes (`CAL_SHAPES`, each a list of spots with layer, place as a share of
  the box, and links), picked per map from the seed on its own stream (`mixSeed(seed, 0xc0a1, act)`) and mirrored at random. A template
  can never overlap or clip, and a test checks every one (connected, every spot on a road to the boss, the forks real).
- **Kinds per map**: layer 1 two fights (one may be a mystery); the recruit in the middle of layer 2; one shop and one mini-boss, on
  **different roads**; one chest; the campfire before the boss. Hidden detours (the hoard and the side mini-boss) are dropped in A and B
  (the mini-boss is now a spot on a road, paying what the detour paid); C keeps them as pockets.
- **Difficulty** by layer as now (`spotFloor`), a layer counting as a floor; the same spot is the same fight.
- **Balance**: a run is about 30 stops, not 80, so XP and gold must be re-tuned (`CALAMITY_XP` back up from 10, `CAL_SCALE`), aiming at
  today's boss shares (91 / 81 / 60 / 44 / 32 / 15 %) with `npm run balance -- --no-tables --calamity --attempts 300`; the bot's policy
  (`tools/autoplay.ts`) learns to choose a road (the shop when gold is high, the campfire's side when hurt, the mini-boss when hale).
- **The screen**: `calMap.ts` drops the scroll and the camera (the whole map shows); the islands are smaller (radius about 48 to 84 art
  pixels against 46 to 72 screen pixels now), baked once as now; the leader walks the stones as now (shorter walks). The "Drifted away"
  look is a still, drained picture (one fade when it happens; none under reduced motion). No flashing.
- **The spire** (the endless tower) keeps its own map; only the Calamity changes.

## Save fields

- `TowerState.shape?: string`: the template of the current map (absent on runs from before).
- **Runs under way**: a calamity saved before keeps its current map in the **old** form until that map's boss falls; its next map is
  small. (Keeping the old renderer for one map means `calMap.ts` stays until no old run can be left; or, simpler and recommended if the
  owner agrees, an old run is moved to the small map at the start of its current map, keeping its party, gold and relics.)
- No other new field: the road, the drifted spots and the choices are derived from `path` and `at`.

## Files (phase B)

`src/sim/tower.ts` (the Calamity's map and choices), new `src/sim/calShapes.ts` (templates) and `src/sim/calSpots.ts` (the kinds),
`src/sim/calLand.ts` (positions from the template; the side spots for C only), `src/calMap.ts` and `src/render/calRealm.ts` (the one-screen
map, smaller islands, drifted look, tags), `src/towerView.ts` (the card registry call), new `src/calSpotCards.ts`, `src/calmap.css`,
`src/sim/calamity.ts` (re-tune), `tools/autoplay.ts`, tests (`test/calShapes.test.ts`, updates to `calExplore`, `calLand`,
`calMapRewards`), shots in `tools/cal-void/`, this note.

## Risks

- **Balance**: the run gets much shorter; the numbers must be measured again (and the starter's level at the end will drop unless XP rises).
- **Old saves**: a run in progress (see above).
- **The other AI's encounters**: they will want `SPOT_KINDS` before their phase B; until it lands they should add their kinds as
  mysteries' outcomes, or wait.
- **Overlap with `claude/awaken-auras`** (merged): the leader's aura on the map is drawn by `calMap.ts`; kept.
- **Small screens**: at 360x780 the box is 360x529 and the spots close up (checked in the mock-ups: they still read, the tags do not
  collide). Phones with a device pixel ratio below 2 would show the art at twice the size (it is drawn at one art pixel to one device
  pixel); the map then draws at a whole-number scale that fits.

## Questions for the owner (each with my recommendation)

1. **Which layout: A (ladder), B (orbit) or C (spine and pockets)?** Recommended: **A**, with B's great rift kept as the backdrop behind
   the boss.
2. **Branching or backtracking?** Recommended: **"your road"**: a fork closes the way not taken; you can walk back along your own road
   (to the shop) at any time. (Or: free roam on the small map; or a budget of 5 of 8.)
3. **Size: 8 spots a map, a road of 4 and the boss, six maps (about 30 stops a run, against 80 now)?** Recommended: **yes**.
4. **Show the whole map from the start (no fog), so a road can be planned?** Recommended: **yes**.
5. **The recruit: one a map, reachable from both first spots, but taking it costs the other spots of its layer?** Recommended: **yes**
   (the campfire stays the one spot every road passes, before the boss).
6. **The hidden detours (the hoard and the side mini-boss): drop them, the mini-boss becoming a spot on a road?** Recommended: **yes**
   (for A and B; C keeps them as pockets).
7. **A run already under way: move it to the small map at the start of its current map (party, gold and relics kept)?** Recommended:
   **yes** (simpler than keeping the old map alive for one map).
8. **Name tags under the spots you can take?** Recommended: **yes**.
