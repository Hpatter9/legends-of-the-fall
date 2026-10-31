# The loss's word off the plates; the Last Stand in the watchtower (OVERLOOK-STAND)

Two of the owner's asks about the Battle tab's overlook (`docs/notes/battle-overlook.md`).

## 1. "Losing to a wave leaves a message up on the overlook. That covers daily and Last Stand."

**What it was.** A run that ends comes home with a line (`Home.open(note)`: "The Orc Warband stopped you at wave 1/15. Heroes keep their
levels: go again.", the daily's "Daily over at wave …", a quest battle's line, the climb's crowns). The Battle page drew it as `.hmNote` in
the bottom bar, lifted just above the bar (`.hmFront .hmNote { bottom: calc(100% + 6px) }`): exactly where the overlook's plaque row is, so it
lay over the Daily board's and the Last Stand's plates and took their taps. `Home.note` was cleared only by `go()` (entering a mode), so it
stayed through every redraw and tab change until the player went into a fight. Reproduced in the browser by losing the first wave of an army
run with no heart left and going through the result and the recap back home: [before](../samples/overlook-loss-before.png).

**The fix** (`src/home.ts`, `showDispatch`; CSS in `src/campPlaces.css`). The line is now a dispatch over the enemy's camp, 30% down the page:
below the heading and the Calamity, above the stall and the party, clear of every place at all three phone sizes. It never takes a tap
(`pointer-events: none`), fades in, holds about five seconds and fades out, then removes itself (`animationend`, or 8 s as a backstop);
reduced motion keeps the fade without the rise. `Home.note` is spent when the dispatch is shown, so a later redraw does not bring it back
(the crowns tip `open()` offers still uses the note it was given). [After](../samples/overlook-loss-after-393.png),
[360](../samples/overlook-loss-after-360.png), [412](../samples/overlook-loss-after-412.png).

## 2. The Last Stand's own place: the watchtower on the overlook's left

The owner meant the Calamity's place on the overlook (the citadel painted on the horizon with its plate under it), and asked for "the tower
off to the left in the overlook screen" as the Last Stand's way in.

- **The place** (`src/render/overlookLayout.ts`: `STAND_TOWER`, `STAND`, `standPlace`). The tower is part of the overlook painting
  (`art/camp/overlook.png`), so, as with the Calamity's citadel, no new picture: `STAND_TOWER` gives its body, lit window, doorway and the lamp
  at its foot as fractions of the scene, and `places.tower` is a 108-wide tap box from just above its battlements to its foot with a 40px plate
  under it. The old Last Stand plaque in the bottom row is gone (one way in); the Daily board has the row to itself, centred, up to 240 wide.
  The button keeps its id `#hmTower`, so every tool that opens the Stand still works.
- **Its plate** (`.cpTowerSlot` in `campPlaces.css`): an ember-dark ribbon, the warm twin of the Calamity's violet one: "Last Stand" over the
  record line it always had (`best wave N · ♛ Throne room`, or "not tried yet", or the run going, or what opens it).
- **Its life** (`src/render/standTowerLife.ts`, `TowerLife`, drawn on the camp's canvas from `camp.ts`): the window and doorway breathe with
  firelight (a slow swell, never off), embers lift off the lamp, and three crows wheel round the battlements. Shut, the lights are out, the
  crows gone, and the tower greys and darkens under its plate as the shut Calamity does. Reduced motion stills the crows and the breath and drops
  the embers.
- **The way in** (`src/standGate.ts`, `playStandGate`; `Home.enterStand`): a tap sounds the horn; the scene leans in towards the tower
  (`scale(2.8)` about the tower's middle, `Camp.standFocus()`) as the places and the heading fade and an ember-lit dusk closes round it; "HOLD
  THE KEEP · The Last Stand" rises with the record line, then the screen goes dark and the Stand opens as before (`onTower`, `openStand`).
  About a second (`GATE_MS`); a tap skips it; reduced motion is a 0.35 s fade with no zoom. Nothing after the entry changed.

Screenshots: the tower [393](../samples/overlook-tower-393.png), [360](../samples/overlook-tower-360.png),
[412](../samples/overlook-tower-412.png), close up [393](../samples/overlook-tower-zoom-393.png); shut
[393](../samples/overlook-tower-shut-393.png); the way in [1](../samples/overlook-entry-1.png), [2](../samples/overlook-entry-2.png), and the
Stand it opens [3](../samples/overlook-entry-3.png).

## Tests and checks

- `test/overlook.test.ts`: the portrait layout test's rule "the Daily plaque stands left of the Last Stand's" is replaced, with the owner's
  ask, by "the tower and the Calamity at opposite sides, the tower high on the left, far above the Daily board"; a new test checks the tower's
  place covers the painted tower top to foot and side to side, its plate is the box's foot, it is clear of the stall, and the Daily board is
  centred.
- `tools/overlook-stand/check.mjs` (browser, 393x852, 360x780, 412x915): loses an army run for real and comes home; the dispatch shows, covers
  no place, and the Daily, Last Stand, Calamity and stall places are what a finger lands on (centre and plate corners); it is gone after its
  fade and a redraw; a real tap opens the Daily. Then the tower with a record, its plate, its moment, and the Stand opening; and the tower shut.
  `--quick` plays the loss at 393 only.
