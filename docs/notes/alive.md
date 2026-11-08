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
| Summoning Sanctum (Recruit, `hall.ts`) | some thirty candles | done: found in the painting (`SceneLife.find`), each gutters |
| | the four green banners | done: stir |
| | the shards floating over the altar | done: float |
| | the rose window's and the altar's green light | done: breathe |
| | the circle's glow (steady at rest) and the braziers' and crystals' glow (steady) | done: breathe and gutter |
| | green wisps over the altar, dust over the floor | done |
| Spellbook study (`library.ts`) | seven candles | done: gutter |
| | the book's blue magic winding up | done: wavers, glows and sends up wisps (the CSS wisps stay) |
| | moonlight through the window | done: breathes slowly |
| | the ivy, the lectern's cloth | done: stir |
| | dust in the candlelight | done |
| Castle (the throne card, `castle.ts`) | four red banners, the curtain behind the throne | done: stir |
| | light through the two windows, the four sconces | done: breathe and gutter, dust in the windows' light |
| | the braziers, the dais's glow, the king | already alive |
| The altar (`towerView.ts`, the Calamity's Altar of Ascension) | the two torches | done: lick, gutter, embers |
| | the banners | done: stir |
| | the green gems, the shaft of light from above | done: breathe; dust turns in the shaft |
| Hester's stall (`stallView.ts`) | her shelf is plain wood: nothing painted moves | done: her lamp's light breathes over it, dust drifts |
| The castle's chamber cards (the small building pictures) | the glow in each card's diorama (steady) | done: it breathes in the chamber's colour, out of step card to card, with motes rising |
| Hero cards (the roster) | the motes round each hero (only the casters' moved) | done: every class's drift, out of step card to card |
| A hero's sheet | the halo behind the hero, its motes | done: the halo's rays turn slowly, the motes rise |
| The Houses' and the Dark Council's painted menus (`menuBackdrops.ts`) | candelabras; braziers and violet light | done: light only (the paintings lie under the card's veil): they gutter, embers and wisps rise |
| The nemesis's taunt cut-in | the foe's band, the frame round its face | done: embers drift up the band, the frame smoulders |
| The ultimate's showcase, the boss's arrival, the duel's challenge | already alive (staged effects, flashes, shakes) | — |
| Ornate menu frames (every `ornateMenu`) | the gilt | done: a light sweeps the header now and then, the corner studs glint in turn, the rule's gem glows |
| Loading screen | its beacon swelled at a steady brightness | done: it gutters as it swells (embers, mist and the slow push were already there) |
| Rift Sanctuary | already alive (`sanctuaryView.ts`, `hubMotion.ts`) | — |
| Cinematics | already alive (weather, rays, motes; `sceneView.ts`) | — |

## Cost

Measured with `node tools/alive/perf.mjs <scene ...>` (a copy of `tools/audit/perf.mjs` on the alive helpers' Chromium: CPU slowed
4x, 393x852, two device pixels a css pixel, software GL, 8 seconds), against main's build (`ROOT=<main's out/web>`):

| Scene | main: frames in 8 s | this branch, after all three batches |
| --- | --- | --- |
| tavern | 463 | 456 |
| camp (Battle tab) | 385 to 442 | 448 |
| recruit (Summoning Sanctum) | 432 | 421 |
| spells (study) | 459 to 467 | 429 to 438 |
| castle | 424 to 465 | 411 to 426 |
| fight (software GL: only the comparison means anything) | 9 | 9 |

(Runs differ by a few per cent from one to the next.)

The first tavern layer redrew its whole painting every frame and halved the frame rate on that slowed CPU; it now leaves the
`<img>` alone and draws only what moves (the regions on a transparent canvas, the light on a second canvas at one css pixel a
pixel, screened over the room), and rows pushed alike are drawn as one strip. Under reduced motion two frames a second apart are
identical.

## Batch 1 (camp, tavern, fight boards)

The camp draws its life on its own canvas, in its scene pixels (crisp: every strip moves a whole pixel). The tavern's painting
is drawn by an `AmbientLayer` laid just over its `<img>`, under Gwen, the guests and the tables. The fight adds a sprite per
still-water, lava or shrine tile and moves a few properties a frame (no new textures beyond one shared ripple picture).

Samples: `docs/samples/alive/` (three frames each, before and after, at 393x852).

## Batch 2 (the Sanctum, the study, the throne room, the altar, the stall)

The Sanctum and the throne card draw their life on their own canvases (crisp, as the camp's); the study, the altar and the stall
use an `AmbientLayer` each. The Sanctum is lit by dozens of candles, too many to place by hand: its scene asks the painter to find
them (`SceneLife.find`: the painting's bright spots, looked for once in a 256 px copy as it is laid out).

The home's pages are all on the screen at once, the ones not on show hidden by `visibility`, which an `IntersectionObserver`
does not see: so a layer also asks its page whether it can be seen (`checkVisibility`, every 300 ms), and while none can be the
loop only looks again every 300 ms. (Before this the tavern's and the study's layers drew on every tab, and cost the castle a
third of its frames on the slowed CPU.) A layer made with a card (the altar's, the stall's) goes when its card is thrown away.

Samples: `sanctum`, `study`, `throne` and `stall` in `docs/samples/alive/`.

## Batch 3 (menus, hero cards, cut-ins, loading)

CSS only, transform, opacity, background and box-shadow animations on small elements: the ornate menu's sheen, glints and gem;
the hero cards' motes and the sheet's halo (its rays turned by a registered `--haloTurn` angle, as the halo is arched and cannot
spin); the taunt's embers and smouldering frame; the loading beacon's gutter. All are stilled for reduced motion and on a battery
saver (`main.ts` sets `html.lowPower` from the setting). The Houses' and the Council's painted menus take an `AmbientLayer` of
light alone, under the card's content (`.paintedMenu` is isolated, the layer at `z-index: -1`). The castle's chamber cards' dioramas
breathe and send up motes (two pseudo-elements a card). A home page not on show pauses its cards' animations (CSS runs on a page
hidden by `visibility`): without that the study lost a tenth of its frames to the castle's and the roster's cards behind it.

Samples: `menu-houses`, `hero-sheet` and `castle-chamber` in `docs/samples/alive/`.

## Not done

- The small building pictures themselves (a forge's fire, a chapel's candles) are a few dozen pixels high: their dioramas breathe
  instead of the pictures being cut up.
- The Calamity's map, the daily's and the armies' screens were not audited picture by picture in this pass.
- The cut-ins that already move (the ultimate's showcase, a boss's arrival, the duel) were left as they are. The altar is not sampled: it is reached only in a
Calamity run; its masks were placed with `tools/alive/masks.mjs`.
