# The living Rift Sanctuary (CALAMITY-HUB)

The owner: "We should make the main room in the Calamity more alive. When a rift is selected, the room moves and that rift is the
middle one they walk into, in a bright flash that zooms in and fades back in to the next battleground." And: "When coming back into
the room after winning a battle in the Calamity, the heroes walk out of the portal to stand in the middle of the room, then turn back
to face the portals again. The options show up while the hero is walking in ... a separate card for each portal, that come up from the
bottom from left to right, as the camera slowly zooms in on the hero walking in."

Only the page changed (`src/sanctuaryView.ts`, `src/sanctuary.css`, new `src/hubMotion.ts`). The simulation is as it was: a rift is
still entered through `TowerView.goTo` → `enterNode` (committed and saved before any animation), and `depart(done)` still hands over
to the battle or the crossing's card when it finishes. Runs saved before the sanctuary (the dungeon map) are untouched.

## The room
- **A ring of rifts.** Each offer of the crossing is its own rift, standing on a ring on the floor in front of the great gate: the
  credited emerald-and-gold arrival portal (`art/calmap-dungeon/arrival-portal.webp`), its world's picture turning slowly in the swirl,
  the PVFX Foundry rift strip (`art/calmap/portal.png`) spinning over it, a soft glow behind it in the world's colour (`WORLD_GLOW`).
  The chosen rift stands in the middle, nearest and biggest; three share the whole ring (`ringStep`), so the other two stand back on
  either side, and the left card is the left rift. A rift can be tapped as well as its card.
- **Choosing turns the room.** Tapping a card or rift turns the ring the short way round (`nearestTurn`, 520 ms, eased) until it is in
  the middle, while the room slides behind it (`roomPan`, up to 6% of the width) with parallax: the far mist (the Cloudscape nebula,
  `nebula_2.png`, screen-blended) moves less, the motes in front more (`PARALLAX`). The great gate shows the chosen world, as before.
- **Life.** Motes drift out of each rift in its world's colour, sparks rise off the room's crystals and the gate's gems, and dust
  floats in the air: the packs' sparkle strips (`fx/vfx/sparkle_white.png`, `sparkle_light.png`), tinted once, on one half-resolution
  canvas (28 at most; 12 on battery saver; 10, slower, with reduced motion). The crystals and gems flicker by size; the camera drifts
  a few pixels; the party plays its idle frames. Points on the painting are found with `coverPoint` (where `object-fit: cover` draws
  them), so everything stands in place at every phone size.
- **Cost.** One `requestAnimationFrame` loop draws it all: 30 frames a second in the idle room (20 on battery saver, 10 with reduced
  motion), every frame during a move; nothing is drawn while the page is hidden. Looping CSS changes only size, turn or frame
  (the no-flicker test holds). `release()` cancels the loop, the listeners and any half-made flash.

## Into a rift (`WALK_IN`, about 2.2–2.7 s; a tap skips to the flash)
The ring turns the rift to the middle if it is not there (520 ms), the party walks up and into it (950 ms, the walk frames, getting
smaller and fading into the light), the rift flares: a white-and-world-coloured bloom grows out of its swirl while the camera zooms
into it (to 3.4x, eased in), and a full-screen flash (`.rsFlash`, a radial white bloom centred on the rift) rises smoothly to full
(640 ms). At the peak the room is left (`done()`: the battle is set up, or the crossing's card shown, under the flash), and the flash
fades off it (650 ms) and removes itself (with a fallback timer, so it is never left over the screen). The flash belongs to the page,
not the room, so nothing of the room is left over the battle. Reduced motion: a 220 ms cross-fade through the rift's colour, then 300 ms
off. Sounds: `steps`, `cineSwell` at the flare, `cineWhoosh` at the flash; `windGust` when the ring turns.

## Back out of a rift (`WALK_OUT`)
The page remembers the rift the party went in by (`entered`: the run's seed, the rift's place on the ring, its world and the crossings
made). When the room is next opened on the same run with one crossing more (`isReturn`), the ring is turned so that place is in the
middle (`exitIndex`), and that rift still shows the world they are coming back from. The party steps out of its light and walks down to
the middle of the floor (1.6 s) facing away from the rifts while the camera slowly closes in on them (to 1.12x), then turns round to
face the rifts, and the camera eases back (0.9 s). Meanwhile the cards rise from the bottom one by one, left to right (`cardRise`: from
420 ms, 240 ms apart, 520 ms each, eased with a small overshoot, moved by the frame loop on the same clock as the walk), each edged in its rift's colour with its world, name and what lies
beyond; the details and the Enter button fade in after. Each card can be tapped once it is up; a tap anywhere earlier settles the room
at once (and is not also taken as a tap on what is under it). With reduced motion the room is there at once and the cards fade in
together (260 ms). A reload just opens the room settled.

## Checks
- `test/calamity-hub.test.ts`: the ring (middle nearest and biggest, one each side whichever is chosen, the short way round, a whole
  turn back to the start), the room's slide, `coverPoint`, the walk-in's timings (2–3 s, the turn only when needed, the flash rising
  without a dip and only after the walk, the fade to nothing), the reduced plan, the walk-out (which rift, the camera in and back, the
  turn), the cards' stagger, and that a won crossing counts as a return.
- `node tools/calamity/hub-shots.mjs [port]` (after `npm run web`): the room, the turn, the walk-in and the battle, the win and the
  walk-out, at 393x852, 360x780 and 412x915, then with reduced motion. It holds the room's own clock still (`window.__hubTime`, read
  only by `sanctuaryView.ts`; unset, the room runs on `performance.now()`) and steps it 150 ms a frame, so the frames are true to the
  timings however slow the machine. It checks the chosen rift is centred, no flash or room is left over the battle, the room comes back
  with one stage, the walk-out comes out of the rift gone into, a tap skips it without also picking a rift, and the cards settle.
  `python3 tools/calamity/hub-strip.py` makes the strips from its frames (`docs/samples/calhub-frames/`, not kept in git).
- Screenshots: `docs/samples/calhub-idle-{393,360,412}.png` (the idle room), `calhub-pan.png` (mid-turn), `calhub-turned-393.png`,
  `calhub-battle-393.png` (the battle faded in), `calhub-walkout.png`, `calhub-cards.png`, `calhub-settled-{393,360,412}.png`, the
  reduced-motion `calhub-*-calm-393.png`; strips `calhub-strip-in.png`, `calhub-strip-out.png`, `calhub-strip-calm-in.png`,
  `calhub-strip-calm-out.png`.
- The older `tools/calamity/sanctuary-shots.mjs` keeps its selectors (`.rsScenery`, `.rsHero canvas`, `.rsDestination`, `.rsEnter`).
