# The battle screen

What changed on the fight screen (upright phone only; checked at 393x852, 360x780 and 412x915; shots in `docs/samples/battle-ui-*.png`,
made by `tools/battle-ui/shots.mjs`, `fullfight.mjs` and `duchess.mjs`).

1. **Speed.** The speed picked in a fight (x1, x2, and x3 where a tier is cleared) now carries on from wave to wave and fight to
   fight, and the last choice (x1 or x2) is saved in the settings, so the next visit starts there. The settings row's hint says so.
   The button sits in the top bar beside sound and settings in the deploy as well as the fight (it was fight only).
2. **Drag a spell onto the grid.** Press a spell card and drag: the card's icon follows the finger and the tiles the spell would hit
   show on the grid (red for the spells that hurt, as with a tap). Let go over the grid to cast; let go back on the panel (or on the
   cards) to cancel. The tile is read a little above the finger, as when a hero is dragged. Tap-to-arm stays as the fallback (tap the
   card, then a tile). Spells that go everywhere (Rally and the like) are still cast by a tap on the card.
3. **Spells in the Calamity.** They were not off: the bar, the mana (the castle's Mage Tower and the traits still apply through
   `stage.mana`) and the casting all work there; a Calamity fight was cast in (tap and drag) with the mana drawn down. Nothing to
   turn on, so no rule changed; the Calamity has no mana of its own. If the owner meant something else (a Calamity-only spell list, or
   its own mana pool) that wants a design call.
4. **A smaller bench in a fight.** In a fight the bench is a slim strip of small portraits with hp bars (`src/battleUi.css`, new,
   built in after `levels.css`); the full cards come back at the deploy. The bench's bars also move on a heal now, not only on a hit.
5. **The gate.** No gate is drawn on the fight itself: all six lands' backdrops, boards and the long map's sections were looked at, and
   there is none. The gates in the game are the war camp's castle gate on the Battle tab (`camp.ts`) and the Tower map's boss gate
   (`towerView.ts`), both outside this lane and left alone. **For the owner:** which gate did you mean? If the camp's, the portal sits
   "inside" a gate the camp stands outside of, and it can be removed or moved.
6. **Werewolf clipping.** The bench portrait cut a square the height of the figure from the middle of the frame, and the Werewolf
   (long and low) lost its nose and tail. `portrait` now widens the square to take in a figure that is wider than tall (not a long
   weapon's sweep: the Samurai stays as it was). Every sheet's idle frames were measured; the Werewolf was the one that was cut.
   On the board the sprite is not cut (checked in the Calamity with a full roster).
7. **Duchess wanders.** She is in about one fight in four or five (`VISIT_CHANCE` 0.22, `rollVisit`): she walks in from the left edge a
   few seconds into the fight, stays 22 to 50 seconds, and walks out. Renderer randomness only (`Math.random` in `duchess.ts`, no
   sim). She is still on at once on the tavern and camp pages, which draw her their own way. Tests in `test/duchess.test.ts`.

Nothing flashes or blinks; no sim rule changed; no file loaded by URL was added.
