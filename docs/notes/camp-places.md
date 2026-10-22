# The war camp's places and bottom bar

The owner's words: "The text for tower run and daily challenge don't fit inside the boxes. Also, give them a spot to click inside the camp instead of a text box. It's more
immersive. Move the big battle banner, it covers too much. And it doesn't need to show what wave I'm continuing on twice on that screen."

## Places in the scene (`campSpots.ts` `places`, `camp.ts`, `home.ts` `drawBattle`, `campPlaces.css`)
- The two signposts and their `.cpPlank` cards are gone. The **Tower** is a stone watchtower at the camp's left edge, the **Daily** a signboard with papers and ribbons at the right
  edge, the **Calamity** the portal in the road inside the gate. Each has one tap box (`Place.box`: the picture and its plate together, at least 96 x 96 scene pixels) and a small
  **name plate** under it (108 x 52, the war table's chip look, 12px type, up to three lines, kept on screen at 360px; a test checks the plates are on screen and apart).
- Plate lines: Tower "best 9" / "not climbed yet" / "Floor 7 · continue" / locked "opens after Orcs"; Daily "one run today" / "today's best 320" / "done today"; Calamity "one hero, a climb" /
  "best 3 of 6 maps" / "Map 2/6 · continue".
- The Tower is **shut** until the first army is beaten (or a climb is begun): its picture is dimmed with chains and a padlock (`tower_locked.png`) and the plate says when it opens.
- The Daily keeps its red "new" dot (still) and the green done tick, now on the board's picture.
- The standard and the weapon rack came out of the camp to make room. Ids kept for the tips: `#hmTower`, `#hmCalamity`, `#hmBattle`, `#hmParty`.

## Bottom bar
- The page's Battle! area is a bar **below** the scene (`--hmBar`, 100px): the scene is 100px shorter, so the war table, cart and props are all visible. In the bar: a slim ribbon, then
  Party | Battle! | Continue. Battle! is 24px, much smaller than before, with the red "new army" dot when an army is new; the "Choose an army" line went.
- The wave is shown once: with a run going the ribbon names the army alone ("Undead Legion") and Continue carries "wave 4/15"; with no run the ribbon reads "Orc Warband · next".
  The Calamity pill is gone (the portal replaces it).

## Art
`tools/camp/places.py`: the Knights watchtower (as the castle uses it) and the Fae ribbon signpost of Chronos's isometric kits, halved; the locked tower is the first drained of
colour with a chain and padlock drawn on it. Credited in CREDITS.md. Shots: `tools/camp/places-shots.mjs` (`docs/samples/camp-places-*.png`: no run, a run going, locked Tower, Daily done).
