> Hero rarity was removed later (see `no-rarity.md`): where this note gives a hero a tier, rarity frame or tier bonus, that no longer applies.

> The tavern is now three rooms wide and pans sideways: see `tavern-hall.md`. Where this note gives the room's size, scale or panning, that note wins.

# The tavern (Heroes tab) and no recruiting mid-run

## The tavern
- The Heroes tab is a side-view pixel tavern (`src/tavern.ts`): wall with hearth and shelves, floor, rug, a bar with stools, two
  round tables and a long table, barrels and crates. One canvas, 384x296 room pixels, drawn at a whole-number scale (3 upright, so the floor and heroes
  fill the page and it pans both ways; 2 sideways; up to 4 on a big landscape screen) with nearest neighbour. It is bigger than a phone is wide, so it pans by native scroll
  (drag); it opens centred, and scrolled to the floor.
- **Spots** (`src/render/tavernSpots.ts`, pure data, tested in `test/tavern.test.ts`): every hero in `ALL_HEROES` has one fixed
  `{x, y, depth, facing, seat}`. The starting five sit together at the middle of the bar, so five heroes already look lived-in.
  Props and heroes are sorted by `depth` (their feet line), so a table hides the legs of whoever stands behind it.
- **Locked heroes**: their spot shows an empty stool or chair; a recruited hero stands there (the seat comes back when they
  stroll off). A pill shows "8 of 25 heroes". Tapping a hero, or an empty seat, opens the same hero sheet as the old grid
  (`drawHeroSheet`: rarity, rank stars, level, XP, shards, stats, skills). The grid (`drawHeroGrid`) is gone.
- **Form**: a hero is drawn from their evolved sheet by rank (`gradeOfRank`: rank 2 the second form, rank 4 the third).
- **Life**: each hero keeps a random timer and, when it fires, turns round, shows an emote bubble (mug, music note, Zz, "!"),
  strolls 10 to 26 pixels and back (walk row), or plays the attack row as a flourish. A hero with a single idle frame still
  breathes (a one-pixel rise). Randomness is `Math.random`, renderer only. The fire and lamps flicker by opacity.
- **Rarity**: Rare, Epic and Legendary heroes have a small gem under their feet in the tier's colour; a Mythic's gem alternates
  crimson and gold.
- **Cost**: it draws only while the Heroes tab shows (not under a hero sheet, not when the page is hidden). Battery saver
  caps it at 30 fps. Reduced motion: no strolls and no flourishes (they still turn and show emotes).
- **Offline**: the pictures are bundled into game.js as data URLs, so the service worker's `FILES` is unchanged.

## Recruiting only between battles
- The battle screen's button bar is Fight!, Summon, Pack, Home: the Recruit button and its listener are gone. The gacha is
  reached only from the home Recruit tab. Sideways the three small buttons are Summon on its own row, Pack and Home below.

## Dragging round the room

The town-square work had locked the tavern's scroller to up-and-down (`overflow-x: hidden; touch-action: pan-y`), so the
sides of the room could not be reached. The room now pans by hand: a drag on the canvas moves `.tvScroll`'s scroll both
ways (pointer events with capture, `touch-action: none`), with a finger or the mouse, and a short still press is still a
tap that opens the hero's sheet. The wheel still scrolls too.

## Easier to tap

A tap in the tavern now picks the hero whose body is nearest the finger, within a reach a little wider and taller than
the body (and down past the feet onto the seat), rather than only a tap inside a tight box; on a near tie the one in front
wins (`tap()` in src/tavern.ts). A press may wander 14 px and last 0.7 s and still count as a tap.
