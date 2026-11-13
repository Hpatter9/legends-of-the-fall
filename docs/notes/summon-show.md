# SUMMON-SHOW: shards first, then the new heroes; the summoning's show in Blender

The owner: "The draw ten summoning screen needs to be reorganized. Have the tarot cards, shards only show first. Then after that the
unlocked heroes can show. The summon effect needs to be redone too. Use blender to make a better effect."

Branch `claude/summon-show`. Part 1 (the order) was pushed on its own so it could go out first; part 2 (the show in Blender) follows.

## Part 1: the order

The rule is pure, in `src/render/summonRules.ts` (`drawOrder`, `cardTimes`, `shardTotals`; `test/summon-show.test.ts`):

1. **Every shard card first.** A draw's pulls that are not a new hero are tarot cards (`tarotFace`, as before), laid five to a row and
   turned by themselves one after another (`FIRST_CARD_MS` 260 ms, then `CARD_GAP_MS` 140 ms apart: ten cards in under two seconds).
   A tap turns one at once; "Reveal all" turns every card. A new hero has **no card in the spread** any more (it used to sit first, as
   a dark figure two cards wide, which showed that a hero had come before the shards were read).
2. **The totals.** Once every card is turned, "Shards gained" lists a line a hero (`shardTotals`): its name (with ×N for more than one
   card), the unlock shards and its bar ("+2 shards · 9/15 to join"), rank shards and the rank bar, crowns from a hero with nothing
   left to buy, and "joins!" for a hero whose shards are in the draw and who joins in it. While the cards are turning the line above
   them says how many shard cards there are and how many sealed summons wait ("7 shard cards · 3 sealed summons wait").
3. **Then the new heroes**, `HEROES_AFTER_MS` (1.1 s, time to read the totals) after the last card turns, each with its own full
   reveal (`firstReveal`: the charge, the arrival, the full art, the battle sprite's attack and its plate), in the order drawn. Every
   hero but the last goes on by itself `HERO_ONWARD_MS` (1.8 s) after it stands in full view (a tap goes sooner); **the last is held**
   until a tap. As each reveal closes, the hero's card (its figure in the gold frame, its name and "Joined your company") joins a row
   "New allies join" under the totals, and the row is brought into view.

The other shapes of a draw:

- **Shards only:** the cards and the totals; nothing follows, and the screen is free as soon as the last card turns.
- **All new heroes** (ten lucky stones, say): no cards and no totals; the line says "10 new allies answer the call…" and the first
  reveal starts after `HEROES_AT_ONCE_MS` (0.35 s). Nine go on by themselves, the tenth is held.
- **A single stone:** a shard is one large card that turns, as before. A new hero goes straight to its reveal (there is no dark card
  to turn first any more), held until a tap, and its large card is left on the screen after.
- **Skip:** a tap on a reveal still goes to the hero in full view (never past it; `SKIP_GUARD_MS` lets the first moments' taps go).
  A skipped hero that is not the last then goes on by itself after `HERO_ONWARD_MS`, so a run of taps moves a ten-draw along.
- **Reduced motion:** the cards fade instead of turning, the reveals are the calm fade they were, the new allies' row comes in
  without its rise, and the scroll to it is instant.

Also fixed on the way: **each reveal took 2.6 to 5.8 seconds to start** on the test page (a slow graphics path): `revealSprite` read
back every frame of the hero's sheet from the shown canvas, which lives on the graphics card, to find the crop. It now reads them on a
scratch canvas kept in memory (`willReadFrequently`): about 50 ms. A ten-draw's heroes now follow one another at once.

Checked in the real page (`node tools/summon-show/film.mjs`, which films a ten-draw and a single new hero from the page's own
screencast and checks that every shard card turned before the first reveal opened; `strip.py` makes a filmstrip of a take).

## Part 2: the summoning's show, rendered in Blender

The old show was the pack's sigil and burst strips (Pixel Effects) and code-drawn pieces: a CSS gathering glow, a blurred beam, a ring,
18 spark dots and a canvas of drawn rays. It is now a show rendered in Blender, in the game's pixel finish, in the sanctum's emerald and
gold, built only from what the pipeline does well (light, a sigil, rings, motes, shards and rays of light; nothing modelled as an
object, so no ChatGPT prompt was needed).

**The pieces** (`tools/blender-fx/summon/show.py`, seen front on and a little from above, as the reveal's stage is):

| Piece | When (ms) | What |
|---|---|---|
| charge | 0 to 1400, 14 frames | a summoning circle (double ring, a band of runes, an eight-pointed star, rings at its points) burns onto the floor round from the top and inward, emerald heating to gold; a rune band turns against it; 64 motes of light spiral in off the dark to its heart; a thread of light starts up from it |
| rift | 1400 to 1900, 6 frames | a seam of light tears up out of the circle and splits wide, its edges torn by a climbing noise, white at its heart and gold to emerald at its edges, a faint column round it; three rings race up it, streaks rush past |
| burst | 1900 to 2710, 9 frames | the arrival: a ball of light seen as light (bright where it faces you, gone at its rim, its edge torn), two shock rings racing out over the floor, 40 shards of light and 14 rays thrown out, the rift collapsing into it; a softer white flash over the screen goes with it |
| after | from 2410, a loop of 1.2 s | the circle glowing low, its rune band turning a twelfth of a turn a loop (so the loop meets itself), embers and motes rising off it; it fades in under the end of the burst and stays while the hero is held |
| flourish | 600 ms, 8 frames | a shard card's turn, seen straight on: a gold ring breaking out round the card and a white one inside it, a four-pointed glint at its heart, slivers of light spun outward |

A new hero's whole show is 2.7 s to its aftermath, inside the reveal's 3.1 s to its plate; with the plate a hero is about 3 to 4 s. The
pieces' times are a pure rule (`heroShowAt`, `skipShowTo`, `flourishAt` in `src/render/summonRules.ts`, tested). A tap that skips the
build-up still plays the arrival's burst.

**The finish** (`tools/blender-fx/summon/finish.py`): each frame shrunk from twice its size by a box filter, its colours cut to one
palette of 32 shared by every piece, its alpha hard (bright pixels there or not; dim ones one of three flat steps), each piece cut to
the smallest box that holds all its frames and laid out as a sheet (lossless WebP), with a glow sheet a quarter the size under the four
lit pieces. The manifest is `src/render/summonFxData.ts` (generated). `test/summon-show.test.ts` checks it against the files.

**How the page plays it** (`src/summonFx.ts`):
- The sheets load by URL (`fx/summon/*.webp`) when the sanctum opens (`SummoningHall.start`, `Gacha.open`), fetched and decoded off the
  page's own thread (`createImageBitmap`), and the service worker keeps them (`SUMMON_FX_FILES` in `build.mjs`'s `FILES`).
- A reveal whose sheets are in (`.tarotReveal.bfx`) lays a `HeroShow` between the painting and the battle sprite, sized so the circle's
  heart is under the hero's feet and the frame as wide as the stage; the old strips, beam, sparks and rays are hidden (the rays' canvas
  is not even made). Two small canvases: the hard pixels (176 x 240, scaled up pixelated) and the glow (44 x 60, smoothed, screen-blended).
  Nothing is drawn again while the frame is the same (10 to 12 a second). One animation loop serves every show and stops when none plays.
- Each shard card lays its flourish over itself as it turns (`cardFlourish`), and takes it away when it ends.
- Until the sheets are in (a first visit offline, or a failed load), the reveal plays its older look.
- **Reduced motion:** no show at all: the calm fade as before, and the cards fade with no flourish.

**What it costs:** 9 files, about 107 KB to download; **about 4.9 MB decoded** (4,860,396 bytes); on a page with its CPU throttled four
times, the sheets load in about 0.2 s, and a reveal's first frame of the show is on the screen about 0.4 s after it is called (most of
that is the reveal's own scene: the painting, the sprite). `node tools/summon-show/measure.mjs` measures it.

**Touched under `tools/blender-fx/`:** only the new folder `tools/blender-fx/summon/` (`show.py`, `finish.py`, `README.md`). It imports
helpers from `eidolons/askel.py` and changes nothing there, nor `effects.py`, `scenes.py`, the shared atlases or `blenderFxData.ts`.

**Samples** (`docs/samples/summon-show/`):
- `after-hero-stills-393x852.webp`: a new hero's show at exact moments (0.1 to 3.8 s), the scene held at its beat and the show pinned
  (`tools/summon-show/stills.mjs`); `before-hero-steps-393x852.webp` is the old show the same way, a picture every 200 ms on the
  page's own virtual clock (`steps.mjs`).
- `after-ten-<size>.webp` (393x852, 360x780, 412x915) and `before-ten-393x852.webp`: a real ten-draw filmed from the page's screencast
  (`film.mjs`, `strip.py --count`): the shard cards turning with their flourishes, the totals, then the first new hero's show. Frames
  are in order but the screencast falls behind on a busy software-drawn page, so the later heroes are cut from these; each frame's corner
  carries the page's own clock. `after-single-<size>.webp` and `before-single-393x852.webp` are a single lucky stone filmed the same way.
- The page held 60 frames a second through a reveal with the show (58 with the old one) on the same software-drawn page.

**What still looks weak, honestly:** the arrival's ball of light reads as a pale yellow egg round the hero for about two frames; the
rift is close to a plain bright tube once it is wide (its torn edges show while it opens, less once it is open); the aftermath is faint
next to the burst (a dim circle and a few motes); and the circle burns white more than gold.

## Second pass (the director's four points)

1. **No egg round the hero.** The arrival's ball of light is gone. The rift snaps shut in two frames into a hot point on the floor
   (one frame), and a fast gold ring races out over the floor from the circle with a white one behind it, a third ring **rises off
   the floor as it widens** (a hoop the hero steps out of), 56 shards of light are flung outward and up off the circle's rim, and
   streaks of light run out flat over the floor. The screen's flash with it is softer and shorter (0.4 for 0.35 s).
2. **The rift stays alive once wide.** Its noise takes a big step every frame (its torn edges flicker and shift rather than drift),
   its width jitters frame to frame, the soft column round it is dimmer, and 34 streaks run up inside the seam (14 more outside).
3. **The aftermath is stronger.** The circle burns gold at a higher strength, its rune band glows gold and turns, and 96 motes rise
   round the hero (from the inner rings to the rim, not over it) through the whole name card.
4. **The circle is gold.** Its colour ramp tops out in rich gold (pale gold only at the very front of its drawing-on), and its
   strength no longer clips it to white.

The show is now 105,460 bytes; decoded memory about the same (the sheets' sizes barely moved). Stills, the same format as before:
`docs/samples/summon-show/pass2-hero-stills-393x852.webp` beside `after-hero-stills-393x852.webp` (the first pass).

Still weak: once fully open the rift is still close to a bright tube in a single still (it reads better moving, with the edges and
streaks flickering); the motes of the aftermath sit partly behind the name plate.
