# ALIVE: every screen and scene feels alive

The owner's ask: "Make sure all menus, screens and scenes feel alive. I want torches to flicker, fire to wave and flicker, trees
to sway, water to flow or ripple, etc." (The no-flashing rule was withdrawn in 0.408.0; reduced motion is still honoured.)

## The shared tools

One set of tools moves everything, so a torch gutters the same way on every screen:

- `src/render/ambient.ts`: the motion, as pure functions of the clock and a seed (no state, no page, no Pixi): `flicker` (a
  slow breath under a quick gutter, by kind of light: fire, torch, candle, lantern, magic, window, lava), `sway` (a lean that
  gusts), `rowShift` (how far each row of a region is pushed: water ripples, foliage and cloth bend about their anchor, a
  flame licks, clouds slide), `flameRise`, `floatLift`, `flashAt` (a storm's or a spell's flash now and then), the particles
  (`emberAt`, `puffAt`, `moteAt`, `birdAt`, `glintAt`), polygons (`inPoly`, `polyBox`, `polyArea`), `hotSpots` (finds a
  picture's own fires), `placeIn` (where a painting lies in its box: fill, cover, contain), and `motionPlan` (how much moves:
  nothing while hidden; held still for reduced motion; half the frames and particles on a battery saver).
- `src/render/ambientScenes.ts`: where each painting's life is, as data in shares of the painting (`SCENE_LIFE`): its
  lights, its moving regions (polygons: water, falls, foliage, cloth, flames, clouds, floating things), its spouts (embers,
  smoke, steam) and its drifts (motes, fireflies, wisps, birds, bats). `SCENE_ART` names each painting's file.
- `src/render/ambientPaint.ts` (`LifePainter`): draws a scene's life on a 2D canvas. Each region is cut from the painting once
  along its polygon, its edge feathered, and redrawn each frame as strips pushed by `rowShift` (or with streaks running down
  it, for a waterfall). The lights are additive glows that flicker; then embers, smoke, glints on water, motes, fireflies and
  birds. Nothing is made in a frame.
- `src/render/ambientLayer.ts` (`AmbientLayer`): a canvas over a DOM painting that draws the painting and its life. Every
  layer shares one loop, which runs only while a layer is on the screen (an `IntersectionObserver`) and the page is in sight;
  with reduced motion a layer is drawn once, lit at rest; on a battery saver it draws at most 30 frames a second.
- Pixi boards use the same `flicker` and `sway` (`boardView.ts`, `weatherView.ts`).
- `test/ambient.test.ts` checks the motion's bounds, the plan, and that every scene's painting is there and all its life lies
  on it. `node tools/alive/masks.mjs <dir>` draws each scene's masks over its painting, to place them by eye.

## The audit

What was painted still and should move, screen by screen. Done means it moves in this branch.

| Where | What should move | State |
| --- | --- | --- |
| Camp overlook (`camp.ts`) | campfire flame (leaned, height held still) and its glow (steady) | done: the flame licks and rises, the glow flickers |
| | sunset clouds | done: slide slowly either side of the citadel |
| | the Calamity citadel in the sky | done: floats; violet glow breathes, with a lightning flash now and then |
| | the lake, the river and its bend | done: ripple, with glints of sun |
| | the two waterfalls | done: streaks run down them |
| | the green banners on their poles | done: wave from the top |
| | the pines below the drop, the sapling by the chests | done: sway |
| | the lantern on the table, the sun | done: glow and gutter (the sun breathes slowly) |
| | the enemy camp's fires (a different picture per army) | done: found in the picture (`hotSpots`), each flickers, the three strongest send up smoke |
| | birds in the sky, fireflies on the ledge | done |
| | the watchtower's lights, embers and crows, the mist | already alive (`standTowerLife.ts`, `mist`) |
| Tavern (`paintedTavern.ts`) | the hearth's flame | done: licks and rises; embers go up the chimney |
| | the hearth's light and the pool of it on the floor | done: breathe and gutter (the old CSS warmth pulse stays) |
| | the chandelier's and the mantel's candles, the bar candles | done: each gutters on its own |
| | three lanterns | done |
| | the hanging herbs, the ivy in the corners, the banner over the hearth | done: stir |
| | dust in the light | done: motes |
| | supper's steam, the dice, the guests' breathing | already alive (CSS) |
| Fight boards (`boardView.ts`) | tall grass | done: bends in the wind |
| | highland bushes | done: sway |
| | still water (shallow and deep) | done: light shimmers and drifts on it (running water already had streaks) |
| | lava and coals | done: a seething glow |
| | shrines | done: the crystal's glow pulses (it was still) |
| | lights on the road (lanterns, braziers) | already flickered; now by the shared `flicker` |
| | night's glows at the lit props (`weatherView.ts`) | done: they gutter (they were steady) |
| | running water, falls, swaying growth, birds on the road, Calamity zones | already alive |
| Summoning Sanctum (Recruit) | candles, the green crystal flames, the brazier fires, the stained glass light | batch 2 |
| Spellbook study | candles, the glowing book, moonlight through the window, dust | batch 2 |
| Castle (throne room card) | braziers and candles, the banners, light through the glass | batch 2 |
| The chapel and the altar | candles, the altar's glow, motes | batch 2 |
| Hester's stall | lanterns, cloth awning | batch 2 |
| The castle's rooms (great hall, forge, barracks, stable ...) | forge fire, braziers, banners | batch 2 |
| Hero sheets and backdrops | motes or embers by land, a slow light | batch 3 |
| Cut-ins and showcases | embers and a glow behind the hero | batch 3 |
| Ornate menu frames | a gentle sheen on the gilt, a few embers where it suits | batch 3 |
| Loading and title screens | already alive (embers, a beacon, mist in CSS) | check in batch 3 |
| Rift Sanctuary | already alive (`sanctuaryView.ts`, `hubMotion.ts`) | — |
| Cinematics | already alive (weather, rays, motes; `sceneView.ts`) | — |

## Cost

Measured with `node tools/alive/perf.mjs <scene ...>` (a copy of `tools/audit/perf.mjs` on the alive helpers' Chromium: CPU slowed
4x, 393x852, two device pixels a css pixel, software GL, 8 seconds), against main's build (`ROOT=<main's out/web>`):

| Scene | main: frames, mean ms | this branch: frames, mean ms |
| --- | --- | --- |
| tavern | 463, 17.2 | 440, 18.1 |
| camp (Battle tab) | 442, 18.1 | 436, 18.2 |
| fight (software GL: only the comparison means anything) | 9, 648 | 9, 657 |

The first tavern layer redrew its whole painting every frame and halved the frame rate on that slowed CPU; it now leaves the
`<img>` alone and draws only what moves (the regions on a transparent canvas, the light on a second canvas at one css pixel a
pixel, screened over the room), and rows pushed alike are drawn as one strip. Under reduced motion two frames a second apart are
identical.

## Batch 1 (camp, tavern, fight boards)

The camp draws its life on its own canvas, in its scene pixels (crisp: every strip moves a whole pixel). The tavern's painting
is drawn by an `AmbientLayer` laid just over its `<img>`, under Gwen, the guests and the tables. The fight adds a sprite per
still-water, lava or shrine tile and moves a few properties a frame (no new textures beyond one shared ripple picture).

Samples: `docs/samples/alive/` (three frames each, before and after, at 393x852).
