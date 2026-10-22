> Hero rarity was removed later (see `no-rarity.md`): where this note gives a hero a tier, rarity frame or tier bonus, that no longer applies.

# The summoning hall (Recruit tab) and the library (Spells tab)

The last two tabs are places now, like the tavern and the courtyard. Both are side views in the tavern's style (so the Heroes,
Recruit and Spells tabs agree), one canvas each at a whole-number scale (2 on a phone, 3 on a wide screen), nearest neighbour.

## Summoning hall (`src/hall.ts`, plan and timing in `src/render/hallSpots.ts`)
- A dark stone hall: wall picture with arches and banners, flagstone floor, two arcane pillars, two braziers (the pack's `fire-flame-16`
  sheet for the flames), a robed summoner, and the glowing circle on the floor with runes orbiting its rim and sparks lifting off it.
  The room is 192 pixels wide (a phone at scale 2) and as tall as the page lets it be (`hallLayout(h)` puts the circle in the upper
  middle of the floor, clear of the buttons). On a phone narrower than 384 css pixels the room is centred and its edges (pillars) are trimmed.
- Over it, in DOM: a pill "N of 25 heroes", a small "Odds · heroes" button (opens the old collection screen), a **parchment scroll** with the
  pity counters (Legendary and Mythic pulls to go) and the odds by tier, and the **Summon x1 / x10 pixel buttons** at the bottom with their crown costs.
- **A pull**: the gacha does the pull at once (`Gacha.summon`, same `recruit`, same saved result, same odds, pity, costs). Then the hall plays it
  (`SummoningHall.play(got)`): the circle charges (the summoner raises both arms, sparks shower), flares (rings of light across the floor and a tint
  over the room), a beam climbs to the ceiling (blue for Common and Rare, violet Epic, gold Legendary, crimson Mythic by the best pull), and the heroes step
  out of the circle one after another (a ten pull in two rows; each stands in a ring in its tier's colour). Then the existing card-flip reveal opens over
  the page exactly as before. A Mythic holds the charge a beat longer. `pullTimeline` is pure and tested.
- **Cost**: it draws only while the Recruit tab shows and the collection screen is shut (not when the page is hidden); battery saver caps it at 30 fps.
  Reduced motion: no sparks, the runes stand still, and a pull is a short flash with the heroes at once (about 0.9 s). Leaving
  the tab in the middle of a pull ends it at once and the reveal still opens (the pull is already saved).
- The old `#gacha` overlay stays as the reveal and collection screen; its own Pull buttons and every gacha test are untouched.

## Library (`src/library.ts`, layout in `src/render/libraryLayout.ts`)
- Spells is a tab of its own now: `Home.show('spells')` just switches to it, so the tab lights up, and the castle's Chapel goes to it.
- A chapel library: the wall picture (stained-glass window between shelves, four candles) and the lectern with the open book in front. The
  candles flicker (opacity of a glow layer) and motes of light drift off the book; reduced motion keeps the candles still and drops the motes.
- Under it, a **parchment page** with the spellbook exactly as before (`spellbookView()` in `src/spellbook.ts`: power meter 9, three slots, 11 spell
  cards, equip, unequip, unlock for crowns, locked ones dashed), restyled in parchment colours, scrolling inside its panel with the header
  ("Spellbook", crowns) kept on top. The overlay (`openSpellbook`) still exists and uses the same view.

## Art and offline
- Pieces are generated with PixelLab (see `tools/scenes/README.md`) or copied from the effects pack; all are bundled into game.js as data URLs, so the
  service worker's `FILES` list is unchanged and both tabs work offline. Nothing is scaled except by whole numbers.
- PixelLab budget: 9 generations used out of the 250 allowed (the balance endpoint reports in dollars and read the same before and after).

## Tests and samples
- `test/scenes.test.ts`: hall layout, fan of heroes, beam colours, pull timeline (normal and reduced), library layout. All gacha and spellbook tests are unchanged.
- `docs/samples/scenes-*.png` (393x852; the rest also at 360x780 and 412x915), made by `node tools/scenes/shots.mjs`.
