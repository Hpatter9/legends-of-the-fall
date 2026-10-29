# Two fixed starter packs, and the classic king (STARTER-KING)

The owner's asks: "The 3 starter packs should be reduced to 2 starter packs that are always the same and are simple characters." and
"The default king should be the stereotypical man king."

## The starter packs (`src/sim/starter.ts`, `src/starter.ts`)

A new save (and one after Start over) is offered **two fixed packs**, the same for every save, no longer drawn from the seed:

| Pack (`FIXED_PACKS`) | Front-liner | Striker | Back-liner | Chips |
| --- | --- | --- | --- | --- |
| **Sword and Shield**: "Steel up front, a bow behind: hold the line and shoot past it." | Knight | Samurai | Archer (shooter) | Shield, Sword, Bow, and the Samurai synergy (Samurai and Archer) |
| **Blade and Spell**: "Pikes to hold them, a quick blade to cut them, fire to finish them." | Peasant | Kunoichi | Fire Wizard (caster) | Pike, Blade, Spell |

All six are plain classic heroes from the owner's list, none earned by content. (The Cleric was left out: six slots for seven names; the
packs measured with her in place of the Archer or the Fire Wizard came out a little stronger, not weaker, so either way is fine if the owner
prefers her.) The Sword and Shield pack is also the opening cinematic's trio (`OPENING_TRIO`).

- `FIXED_PACKS` (`id`, `name`, `line`, `chips`, `heroes`), `STARTER_PACKS` (now 2, from the list), `starterPacks()` (fresh copies; no seed),
  `packNamed(heroes)` (the fixed pack with exactly these heroes, which names a pack on the page).
- The pick screen shows each pack's name, its line, its chips and the synergies the three wake (`countTraits`, as the party screen counts
  them; a green chip with the bonus as its tooltip). An old save's seeded pack would just be numbered.
- **Old saves (`readStarter(raw)`, the seed argument dropped):** a save from before the pick (no record) keeps the old five, as before. A save
  still waiting for its pick (pick null or not a whole number) is offered the two fixed packs whatever it was offered before, so a save
  that stopped mid-pick on three seeded packs moves to the two. A save that has picked keeps its record as saved, three old packs and
  all, and so its heroes. A damaged record whose pick was made stays picked (moved onto the fixed packs, the pick kept in range), so a
  load never asks for a second pick, which would swap the heroes it has for a pack.

### The packs on the first army (`node tools/starter-packs/run.mjs`, new)

A brand-new save takes the pack (level 1, no talents, no castle) and plays the Orc Warband's Normal tier as the autoplay does (it hires
with the run's gold from the pack, fields the squad and fights each of the 15 waves). 80 saves a pack:

| Pack | Mean waves won, first run | Won the first 3 / 5 waves | Cleared on the first run | Runs to a first clear (XP carried) | Pack level then |
| --- | --- | --- | --- | --- | --- |
| Sword and Shield | 14.64 | 100% / 100% | 64% | 1.4 (all cleared) | 7.5 |
| Blade and Spell | 14.59 | 100% / 100% | 59% | 1.4 (all cleared) | 7.7 |

The early waves are never lost by either pack; a first run falls, when it falls, at the boss at the end. The two are level (5 points apart
on a first-run clear, the same runs to clear), so no pick was changed. Other packs tried at 30 saves: Knight, Samurai, Cleric 77% and 1.2
runs; Peasant, Kunoichi, Cleric 83% and 1.2; Knight, Kunoichi, Fire Wizard 57% and 1.5; Peasant, Samurai, Archer 73% and 1.3.

### Tests changed (the owner's new requirement)

- `test/starter.test.ts`: "the same seed offers the same three packs", "three packs of three ... over 300 seeds" and "every pullable hero is
  offered now and then" are replaced by: every new save is offered the same two fixed packs; two packs of three different heroes, a
  front-liner, a striker and a back-liner each, named, back-liners of different classes; only plain classic pullable heroes. The new-save
  check expects 2 packs; "a bad pack changes nothing" tries pack 2 (out of range now) instead of 3; the reload test picks pack 1 instead of
  2. "A damaged starter record is mended from the seed" became "... one still waiting gets the fixed packs, one already picked stays
  picked" (a damaged record with pick 7 now stays picked rather than being asked again). New: old saves mid-pick on three seeded packs
  move to the two; one that picked its third old pack keeps it and its heroes.
- `test/hero-shards.test.ts`: the "no content hero in the packs" check reads the fixed packs instead of 100 seeds.
- `test/new-heroes.test.ts`: "a team of new heroes is about as strong as the starting five" built its six mixed teams from the seeded packs
  of seeds 1 to 6; those six teams are now written out as they were, so the test checks exactly what it did.

## The King (`src/rulerRules.ts`, `src/art/rulers/the_king.png`)

A ninth ruler, **The King, "The Classic"** ("A crown, a beard, an ermine robe and a sceptre. Exactly as advertised."), first in the picker
and the **default** (`DEFAULT_RULER = 'the_king'`; `rulerOf` falls back to him). He speaks the original king's Last Stand lines (no entry in
`rulerSpeech.ts`), and the title words stay "king".

- **The art is the old king, brought back** (`tools/rulers/the-king.py` builds the atlas in the rulers' layout, 4 x 8 cells of 224):
  seated and command are the castle's enthroned king (`king_throne.png`: crown, golden beard, ermine-trimmed red robe, blue-orbed sceptre)
  as it is: seated alternates its two idle frames, command holds its decree frame. The standing rows are the Last Stand's old Himeko
  Sutori king (lordly plate, crown), given the same pack's blond beard (the enthroned king's colour) and its Radiant staff as a sceptre
  (a gold rod with a blue orb, like his), drawn twice up.
- **Frames the old art did not have** (closest frames used, nothing code-drawn): one standing idle pose (repeated, so his idle does not
  breathe as the other rulers' do); strike is the arm raised then the lunge; cast is the pack's two casting poses (the staff is not drawn
  in them); hurt is the kneel, then up; the fall is the kneel, then the kneel turned 90 degrees (as `tools/pixellab/lie.py` does). There is
  no empty throne of his, so when he rises in the Last Stand he stands before the Iron Stag's (red velvet, gold and fur; `THRONE_CELL` in
  `rulerArt.ts`). His standing figure fills less of its cell than the new rulers' do (the pack's 75 px figure at 2x), so in cinematics
  and the Last Stand he stands a little shorter than they would, about the heroes' size. His picker portrait is his throne frame.
- **Old settings:** a setting with no ruler (saved before 0.202.0, or never saved) or an unknown one gets The King. A saved `iron_stag`
  is kept: `setSetting` writes every setting, so anyone who changed any setting since 0.202.0 has `ruler: 'iron_stag'` saved whether
  they chose him or not, and the two cannot be told apart. Those players (the owner's phone very likely among them) pick The King once in
  Settings.

## The thrones held still (the owner's later ask)

"The animations for the kings on the throne is weird. The thrones move around too much. Make them stable and give them a simple idle
animation." The eight painted rulers' seated and command frames were each painted afresh, throne and all (between any two of a ruler's
seated frames half to three quarters of the pixels differ, the throne's legs and base included), so cycling them made the throne swim, and
a decree swapped to a smaller throne. The empty thrones of `thrones.png` are a different painting, so the ruler cannot be lifted off the
throne either.

- **A painted ruler on the throne holds its first seated frame** (`seatFrame` in `src/rulerRules.ts`), seated or commanding: the cell, and
  the throne in it, never changes, and nothing bobs, shifts or scales it (the castle draws it at a fixed spot and size, the Last Stand's
  sprite keeps its size and place).
- **The idle is a slow breath of the head alone:** every `BREATH_MS` (1.4 s) the ruler's head and headdress box (`SEAT_BREATH`, a box per
  ruler in atlas pixels) is drawn `BREATH_PX` (2 atlas pixels, about one screen pixel at the throne's size) higher over the frame, then
  back. The breath frame is made once at load (`rulerArt.ts`, a canvas for the castle and a texture for the Last Stand); nothing is cut out
  of the throne. Where the throne's back shows inside a head box, that sliver rises with the head (about a pixel on screen).
- **The King** keeps his own frames: the old enthroned king's two idle frames and decree share one throne pixel for pixel, so his idle
  is his two frames at the breath's slow pace, and his decree gesture plays.
- The decree (command) of the painted rulers is now the still seated frame and its breath, the throne kept; the castle's decree glow and
  burst still play. The standing actions (strike, cast, hurt, fall) keep their frames, with the empty throne behind as before.
- Reduced motion: the still seated frame, no breath.
- Tests (`test/rulers.test.ts`): a painted ruler's seat is row seated, column 0 at every time, seated or commanding; no breath under
  reduced motion; the breath's timing; each head box inside the cell; The King's own frames.
- Before and after (`tools/rulers/seat-strip.mjs` and `seat-montage.py`): `docs/samples/starter-king-throne-still-393x852.png`, the
  Iron Stag, Sun Viper and The King in the castle and on the Last Stand's dais, four frames each (before 350 ms apart, a frame of the old
  cycle each; after 700 ms apart, so a breath shows).

## Checks

- `npm run typecheck`; `npm test -- starter rulers settings hero-shards new-heroes`; the full `npm test` (1377 of 1377 before the
  throne change, 1379 of 1379 after it); `npm run web`.
- `node tools/starter-packs/shots.mjs`: the pick at 393x852, 360x780 and 412x915 (two packs, no scrolling, the button on screen), a pack
  chosen, and an old mid-pick save with three seeded packs loading onto the two; no page errors.
- `PORT=8261 node tools/rulers/check.mjs` (updated for nine; its frame and throne waits now wait for the frame rather than a fixed time,
  as software rendering is slow): picker, castle, cinematic actions and the Last Stand for all nine at 393x852 and The King at all three
  sizes, saved choice, offline reload.

Screenshots: `docs/samples/starter-king-pick-{393x852,360x780,412x915}.png`, `starter-king-chosen-393x852.png`,
`starter-king-old-midpick-393x852.png`; `rulers-settings-393x852.png` (the picker, The King chosen), `ruler-the_king-393x852.png` (the
castle), `ruler-stand-the_king-393x852.png` and `ruler-stand-the_king-cast-393x852.png` (the Last Stand, seated and risen),
`ruler-scene-the_king-393x852.png` (a cinematic).
