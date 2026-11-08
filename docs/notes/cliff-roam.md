# The heroes roam the cliff; Hester moves into the tavern (CLIFF-ROAM)

The owner's two asks about the Battle Overlook: "I want the heroes on the battle screen to be able to wander anywhere on the cliff", and
"The shop should be moved. It feels too out of place. Maybe we make it a tavern thing?" (the director's recommendation, which the owner
took: Hester's Stall leaves the cliff and sets up in a corner of the tavern).

## The heroes wander the ledge

- **The ledge** is a polygon in fractions of the scene, `CLIFF` in `src/render/cliffRoam.ts`, fitted to the painted overlook
  (`art/camp/overlook.png`, stretched over the whole scene, so a fraction of the scene is a fraction of the picture). It runs from the
  rock's far rim (0.63 of the scene down; behind it the valley and the enemy camp) round the cliff's lip on the right (0.835 across at
  most, following its rock pillars) to a front edge at 0.835, above the "Enemy below" plate and the Daily icon. On the left it keeps
  off the war table, the crates and the fire's own picture: a hero walks by the fire, never through it, and the notch there means a
  walk cannot cut across its corner either.
- **The step picking** is in the same pure module: `pickSpot(from, ledge, others, rand)` tries a stroll of 24 to 120 scene pixels in any
  direction (squashed front to back, as the ledge is shallow), keeps it only when `walkInside` says the straight walk stays on the rock
  (both ends inside and no edge crossed: the ledge is not convex) and it is not on top of another hero (where they stand or are going).
  No spot in 24 tries: the hero idles a while longer. `onLedge` brings a hero back onto the rock after a resize.
- **The behaviour** (`src/camp.ts`): a hero idles where they stand, and when their time comes (every 2.5 to 7 seconds) they stroll to a
  new spot (half the time), turn, say something in a bubble, or swing their weapon. They walk at 20 scene pixels a second with their
  walk frames, facing the way they go, then idle 2 to 6.5 seconds on arrival. The random is plain `Math.random` (renderer only; the
  sim's streams are never touched, and nothing played depends on it).
- **Depth:** every hero sorts by where their feet are now, with the fire and Duchess, so the nearer is drawn in front. Duchess only
  goes to nibble heroes standing near her strip of the ledge.
- **Reduced motion:** the heroes stay at their five spots, as before (no walking at all).
- **Taps:** a tap picks the hero nearest the finger where they are this frame, so a walking hero is as easy to tap as a standing one; a
  held press still does nothing. `tools/cliff-roam/check.mjs` taps a hero mid-walk in the page and sees the sheet open.
- **The scene is one canvas again:** the front-ground canvas of CAMP-DEPTH (drawn over the stall) is gone with the stall.

## Hester's corner in the tavern

- **Where:** the hearth hall's right end, against the wall by the doorway to the back room (`HESTER` in `src/render/tavernSpots.ts`):
  her stall's picture, Hester standing at its left behind a crate of her wares (a new `crates` prop), and a visiting trader at its
  right behind the crates already there. No hero's spot is in the corner's tap box (`test/tavern.test.ts`).
- **The art** is the stall and the portraits we already had (`art-source/books-shop/stall/shop-stall.png` and
  `art-source/books-shop/people/`), cut and sized by `tools/cliff-roam/tavern-art.py` at three screen pixels a room pixel into
  `src/art/tavern/hester-stall.webp`, `hester.webp`, `trader-caravan.webp`, `trader-dealer.webp`. They are paintings, so the tavern
  draws them smoothly at its scale (`Tavern.painted`). Bundled into game.js as data URLs, so offline needs nothing new in `FILES`.
- **A tap** anywhere on the corner opens the same stall page (`openStall`), and its Back returns to the tavern. The Recruit tab's
  Chest shop button still opens it on its Chests tab.
- **Visitors:** the Gloaming Dealer (first) or Rustam Saffar's caravan stands at the stall while he is in camp (`hesterNews`, as the
  stall's own page shows them).
- **The marks** moved to where the tavern is reached from: a small gilded coin on the **Heroes** tab while the day's stock is unseen or
  a trader visits (dusk violet for the Dealer), a dot on the room bar's **Hearth**, and a gold coin bubble over Hester while her
  stock is new. Steady, no pulse. The Heroes tab's spoken label says so too.
- **Tips:** no tip or tutorial pointed at the stall on the camp. The dev tools that clicked `#hmStall` now open the stall through
  `__game.home.tavern.shop.onStall()`.

## Choices

- The heroes start each visit at their old five spots (so the camp opens as it always has, and reduced motion keeps them there).
- Hester and the traders are their painted portraits, cut at the knee and stood behind crates, rather than new walking sprites: the
  owner asked for the art we have, and Gwen behind the bar is painted the same way.
- The corner went to the hearth hall rather than a new room: it is the middle room, one swipe from the bar, and the only stretch of
  floor with no hero's spot in it.
- The CAMP-DEPTH test of the stall set back behind the heroes is replaced by the roaming tests in `test/overlook.test.ts` (every
  picked spot and every step of every walk on the ledge, the ledge clear of the fire, the chests, the plate and the Daily at the test
  sizes and the three phones' own, and the heroes reaching the whole ledge).

Shots in `docs/samples/cliff-roam/` (`node tools/cliff-roam/shots.mjs` after `npm run web`): `camp-<w>-1..3.png` are three moments of
the wander at 393, 360 and 412 wide, `camp-reduced-<w>.png` with motion reduced, `tavern-<w>.png` Hester's corner with new stock and
`tavern-dealer-<w>.png` with the Gloaming Dealer visiting.
