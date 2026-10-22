# The war camp (Battle tab)

The Battle tab is a living scene now: the party round a campfire outside the castle gate at dusk (`src/camp.ts`, plan in `src/render/campSpots.ts`,
tests in `test/camp.test.ts`, samples `docs/samples/camp-{before,after}-*.png`, taken by `node tools/camp/shots.mjs <tag>`).

## What is in it
- **View**: the castle courtyard's isometric 2:1 view, so the two scenes agree. One canvas holds the scene one to one; a scene pixel is `k` device pixels
  (`k = round(devicePixelRatio)`, about a css pixel) and the page stretches the canvas by exactly that, pixelated. 360x780, 393x852 and 412x915 give scenes
  of about 360-412 x 616-751 pixels; nothing scrolls.
- **Sky and gate**: the cloud-and-sky pack (dusk sky, pink clouds drifting, a night sky showing through at the top in steps), stars that come out over nine
  seconds and twinkle, the Knights' gatehouse with the castle's wall cells running off both edges, skull torches at the door.
- **Ground**: grass tiles and trampled earth round the fire and along the way from the gate.
- **The fire**: the Knights' campfire cut in two at load (`cutFlame`): the logs and stones, and the flame, which waves row by row and breathes. Sparks rise
  and cool, a warm additive glow flickers over the ground, and the dusk is a multiply layer that leaves the firelit ground warm.
- **Props**: two tents (the Nomads' felt and striped roofs), the war banner, the Orcs' weapon stall, barrels, crates, hay, a woodpile, water skins, pines,
  a bush and rocks. All from the kits, halved by `tools/camp/prep.py` like the castle's; some are the castle's own pictures.
- **The party**: `meta.party`, the strongest in front in the middle, in their rank's form. A hero's idle, walk and attack rows are shrunk by a whole number
  (or doubled when tiny). They idle at random like the tavern's (turn, emote bubbles, a short stroll, a flourish); `Math.random` is renderer-only.
  A tap on a hero opens the hero sheet.
- **War table**: a code-drawn table (no pack has one) with a map and a figurine of the next army's boss (the army in the run, else the first open army not
  yet cleared). Its plate reads "Army / led by boss"; the plate and the table open the party. The Party link stays under Battle!.
- **Signs**: the Daily and Tower cards hang on two notice boards on posts under the wall.
- **Chest stash mount**: `CampScene.stashMount`, an absolutely positioned div over the cart's bed on the left (the cart is the Knights'), placed and sized
  by the scene (`camp.stash`, 56 x 34 scene pixels). `drawChestStash` fills it (home.ts mounts its `.csStash` there); the chests lie in a row along the cart (`.cpStash .csStash` in index.html), keep their tap-to-open, and the stash sample is `camp-after-chests-*.png` (`STASH=1`).
- **Cost**: draws only while the Battle tab shows and no hero sheet is open, stops when the page is hidden; battery saver caps it at 30 fps; reduced
  motion stops strolls, sparks, drifting clouds, the flame's wave and the star fade.
- **Offline**: all pictures are bundled into game.js as data URLs, so the service worker's `FILES` is unchanged.

## PixelLab
None used (0 generations). The shared account's balance read 0 generations (the director's floor is 150), so the table is drawn in code.

## Home.ts
Only the Battle tab changed: `drawBattle` now feeds the camp and hangs the cards in its boards; `MenuScene` (`src/menuScene.ts`) and its CSS are gone.
