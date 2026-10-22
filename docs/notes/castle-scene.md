# The castle courtyard (Castle tab)

## What it is
- The Castle tab is a pixel-art courtyard (`src/castle.ts`, data in `src/render/castleSpots.ts`): sky and hills, a stone wall with a
  gate, a lawn with a cobbled path and a well. One canvas drawn at a whole-number scale with nearest neighbour, panned by native
  scroll. **Two arrangements of the same pieces** (`Layout`, picked in `fit()` by `layoutFor(width < height)`):
  - `TALL` (upright): 196 x 352 scene pixels, so at scale 2 it is exactly a phone wide and opens with all four buildings and their
    tags in view, nothing clipped, no panning (it only pans down a little on a page shorter than about 310 scene rows). Tower and
    treasury side by side under the wall, barracks and armoury side by side below them (the grand pair overlap by a corner, the nearer
    in front), the heroes on the lawn at the bottom.
  - `WIDE` (sideways, big screens): 384 x 340, scale 2 or more, pans both ways, opens on the lower middle.
  A layout also names its wall, gate, pennants, cobbled patches, props, where heroes walk and the row to open on.
- **Four upgrades, four plots** (`PLOTS`): Mage Tower and Treasury at the back, Barracks and Armoury in front. Each has
  four looks (`stageOf(id, level)`): 0 an empty plot (stakes, rope, stones; the tower's is a ruined ring with a faint rune circle),
  1 small, 2 bigger, 3 grand, reached in order and always at the top level (Treasury, Barracks and Armoury have 5 levels, the
  Mage Tower 4). The grand ones: a gold-heaped vault with banners, a twin-towered barracks with a target and a sentry, a smithy
  with a big chimney and weapon racks, a tall tower with glowing runes and crystals.
- **Tap a building** (or its name tag, which says the level and shows a green arrow when you can afford the next one) and its card
  opens over the scene: picture, level pips, what it gives, the effect now and at the next level (`effectText`), the cost and a Build button.
  Build does exactly what the old list's button did (`upgrade`, `saveMeta`, `refresh`), after closing the card.
- **Everything the list offered stays**: Achievements and Settings chips and a "Reset tips" chip sit in a slim bar under the top bar (above the scene, so they cover nothing); the card repeats
  "each level" and "upgrades last for every run you start from now on". The old list (`buildingRow`) is gone.

## Life
- Flags wave on the wall's end towers (cloth ripples a pixel at a time); the armoury's chimney smokes; the tower pulses with
  cyan and violet light and sheds floating runes; the treasury glints; the forge glows. Up to five of the strongest unlocked
  heroes (`strongest`) stroll the lawn using their sheets (rank decides the form, as in the tavern) and pass behind buildings
  (everything is sorted by its foot line). Randomness is `Math.random`, renderer only.
- **Build effect**: when `update` sees a level go up it plays 1.5 s: the old look inside scaffolding with dust, a warm flash at
  0.8 s as the new look swaps in (it settles three pixels), the scaffolding comes down, and sparkles rise.
  A level that keeps the same look (level 1 to 2 of five) still gets the scaffolding, dust and flash.
- **Cost**: it draws only while the Castle tab shows (not under a card, not when the page is hidden). Battery saver caps it at
  30 fps. Reduced motion: no smoke, runes, strolls or scaffolding; flags and glow stand still, and a bought level swaps with a few sparkles.
- Name tags are real buttons over the canvas (`.ctTag`), set in percentages so they follow the scale. They are rebuilt only when
  their text changes, and their `:active` rule keeps the centring transform (the global `button:active` would have moved the tag
  out from under a finger).

## Art
- Generated with PixelLab (`/create-image-pixflux`, final pixel size, side/gentle 3/4 view, black outline, medium shading;
  `tools/castle/gen.py`, picks in `tools/castle/pick.py`, samples in `docs/samples/castle-*.png`). The sprites are trimmed to their
  pixels; the grass is the battleground tile already in `src/art/ground/`; the cobbles are the middle of a generated tile.
  The Craftpix village tilesets in the assets repo are large smooth art (and the tropical city set is not pixel art), so none fit.
- Two armoury sprites had a painted smoke wisp; `pick.py` clears it so only the animated smoke shows.
- Generations: 53 successful requests (16 buildings x 2 seeds, plus background, wall, gate, props, 3 seeds of the redone
  grand armoury and the crates) plus a few 502s; the account balance went 1959.75 to 1554.75 over the session, but other workers draw
  from the same balance at the same time, so that drop is not all this job's.
- **Offline**: the pictures are bundled into game.js as data URLs, so the service worker's `FILES` is unchanged.

## Tests
- `test/castleScene.test.ts`: in both layouts every upgrade has a plot inside the courtyard, the grand buildings fit inside it, and they overlap at most by a corner; the tall yard is no wider than a phone at scale 2 and its buildings fit one phone screen; each building has plot, small,
  bigger and grand looks, reached in order, grand at the top level; vents lie inside the picture; the card words grow with the level.
- `node tools/castle/shots.mjs` (needs `npm run web`; `CARD=1` also takes the card and the build frames) makes the samples at 393x852 and
  852x393 with every upgrade at 0, part-built and maxed.

## Mock-ups for a coherent look (not built yet)
The owner found the first courtyard "off": side-on wall, 3/4 buildings, noisy top-down lawn and large heroes did not share one view or scale.
Two stills (upright 393x852, middle level of every building, five heroes) and a stage chart for each, made by `tools/castle/mock.py`:
- **A, side view** (`docs/samples/castle-mock-A.png`, `-A-stages.png`): Craftpix *Medieval Field Work* platformer pieces (`Building`, `Environment`,
  `Platformer`, `Background`), each shrunk by 7 (whole number) into a 40-colour palette so a door is 18x37 px like a hero. Houses are built from
  wall, roof-half, door, window, chimney, canopy, banner pieces; looks are an empty scaffold, an open timber shed, a house, a two-storey house; the
  tower is stacked brick pieces with stone windows; the barracks dummy is pillar, barrel and bucket pieces. Gold piles are the only generated art
  (3 PixelLab generations, side view). A tiered yard: wall and terrace behind, courtyard in front, 196 px wide at scale 2.
- **B, 3/4 view** (`castle-mock-B.png`, `-B-stages.png`): Chronos's own village art at native size: Craftpix village houses (`house1`..`house4`, `gb_shop`, `gb_house`),
  awnings and tents, `su_*` towers and castle, props (`v_anvil`, `v_rack`, `v_well`, gold and chest clutter), palisade tiles, the road-sheet cobbles,
  the village ground green and tufts and flowers, Tiny RPG Town trees. Scale 1, a 393x657 yard, nothing generated.
