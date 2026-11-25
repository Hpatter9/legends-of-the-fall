# The castle's goat: a picture drawn before it had loaded

**The fault.** Some loads of the page threw `Failed to execute 'drawImage' on 'CanvasRenderingContext2D'` from
`CastleScene.paintGreatHall` (found by the aura's photographing runs, `docs/notes/auras-blender.md`).

**The cause.** The goat's eight pictures are loaded each in its own time into one list, each put at its own place as it arrives
(`CrownTerracePainter`, `this.duchess[i] = await loadImage(...)`). The hall painted her when `duchess.length === 8`. A list is
eight long the moment its LAST picture arrives, with earlier places still empty, so on a load where picture 7 came in before
the one her pose wanted, the hall drew an empty place.

**The fix.** `src/render/framesReadyRules.ts` (pure): `framesReady(frames, n)` says whether the first n places are all filled,
and `frameAt` gives a frame or undefined. The hall paints her only when all eight are in, and never draws a frame it does not
have. Nothing is lost: the painter calls the hall back when all its loading is done, and the hall is painted again with her in
it. `test/frames-ready.test.ts` holds the rule and that the castle asks it, not the list's length.

**The other pictures of the scene** were checked for the same pattern: the background, the landmarks, the works, the ruler, the
guards and the hay are each read from a map by name and drawn only when found; the tavern, the hall and the camp fill a record
by name and wait for all of it before they use it. Only the goat's list was asked by its length.

**Measured.** `LOADS=30` on `tools/blender-fx/ult-shots.mjs` loads the page thirty times, each in a fresh context, and leaves it
three seconds on the home screen: main (0.615.0) threw the error in 2 of 30 loads, the fix in 0 of 30. (In the aura's
photographing runs, which go on into a fight, it showed more often: about one run in three.)
