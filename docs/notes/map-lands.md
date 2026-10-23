# More lands, each army on its own ground, and weather

The owner's ask: "more variety on the battle maps". Looks only: the rules of the grid are `claude/map-layouts`'s.

## Seventeen lands

`AREAS` (`src/sim/board.ts`) is now seventeen; the first six (`CLASSIC_AREAS`) are the old ones and keep their files, their
seeds (new lands are appended, and `layGround` salts by the land's index) and their jobs. The eleven new ones:
**Meadows** (`plains`), **Autumn Wood** (`autumn`), **Mire** (`swamp`), **Graveyard** (`graveyard`), **City Ruins** (`ruins`),
**Ancient Temple** (`temple`), **Crystal Caves** (`crystal`), **Forge** (`forge`), **Moonlit Shrine** (`shrine`),
**War Camp** (`warcamp`) and **Oasis** (`oasis`). The winter land is the old Snowfields.

Each has its own ground tops and column side, boulder set (the props that block a tile: palisades and a yurt in the war camp,
gravestones in the graveyard, a fox statue and a lamp post in the shrine, an anvil and barrels in the forge...), tall growth,
a parallax backdrop and a tint (`areaArt.ts`, `boardView.ts` `LIP`, `backdrop.ts`). The art is cut by `tools/lands-prep.py`
(credits in CREDITS.md). Every backdrop layer is a file, so `build.mjs` copies it and the service worker caches it (checked:
77 of 77 are in `sw.js`'s list).

Ground patches per land are in `TERRAIN` (board.ts): a default of mine (swamp and oasis wet, crystal icy, forge with lava).
`claude/map-layouts` owns that table now.

## Which land when

- **Armies** (`Army.lands`, `landOf(army, wave)`, `armies.ts`): each army has one or two lands that alternate by wave, the first on
  wave 1. `waveBoost` passes the wave's land in `Stage.area`, and `chainOf` lays each wave's section of the long map on its own
  land. Orc Warband: War Camp, Highlands. Undead Legion: Graveyard, Dungeon (the crypt). Beast Packs: Meadows, Autumn Wood (wild
  plains, forest edge). The Wildwood: Greenwood, Mire. The Labyrinth: Ancient Temple, City Ruins. Ogre Clans: Highlands, Snowfields.
  Infernal Host: Ashlands, Dunes (scorched). Yokai Night Parade: Moonlit Shrine, Greenwood. Golem Forge: Forge, Crystal Caves.
  `Army.area` is the first land (the card's backdrop); the Armies card lists them all. The daily is one land for all its waves.
- **The spire** (`spireArea`, `lands.ts`): a land for each five floors, drawn from all seventeen by the run's seed, never the same
  land twice running.
- **The daily** (`dailyArea`) already drew from `AREAS`, so it draws from all seventeen now.
- **The Calamity** keeps its six maps on the six old lands (`CLASSIC_AREAS`, by floor as before); so does the old endless climb
  (`areaFor`).

## Weather (looks only)

- **Data the sim can read: `weatherOf(board)`** in `src/sim/weather.ts` (also `weatherFor(seed, area)`): one of `clear`, `rain`, `snow`,
  `fog`, `leaves`, `embers`, `ash`, `night`, rolled from a side stream of the board's seed (`mixSeed(seed, 0x3ea7, landIndex)`), so
  it is the same every time and no fight's own stream is touched. Each land's odds are in `LAND_WEATHER` (clear is common
  everywhere; the graveyard and swamp are foggy, autumn has falling leaves, the shrine is mostly night, the forge and ashlands
  have embers and ash...). **Nothing in the sim reads it.** For a fog rule (shorter bow range, say), read `weatherOf(b.board) === 'fog'`.
- **The look** (`weatherRules.ts` pure data, `weatherView.ts` Pixi): one capped particle layer (at most 80 sprites of one white
  texture, one batch), a steady tint over the screen that fades in over 700 ms (never heavier than 0.4 alpha, no flashing, no blinking),
  soft fog banks that drift, and at night warm (or in the graveyard ghostly green) glows at the lit props (`LIT_PROPS`: shrine lamp
  posts, war camp yurts, the forge's anvils, graveyard stones) plus a few wandering fireflies. Battery saver halves the counts; reduced
  motion shows no particles and leaves the fog still. The page sets it on every `newBattle`; `__game.previewWeather('rain')` shows one.

## Decisions for the owner

- Armies alternate land **every wave** (as asked). On the long map this puts two grounds side by side as the road turns; it looks fine
  in the shots, but alternating in blocks of two or three waves is a one-line change in `landOf`.
- Infernal Host got Dunes as its second land (nothing else scorched fit); the Ogres got the Snowfields (a highland pass).
- The Wildwood's second land is the Mire; the Yokai's second is Greenwood. The shrine is night in most (not all) fights: say if it should be night every time.
- The new lands' ground patches (`TERRAIN`) change how those fights play a little (the Mire has more shallows, the Crystal Caves ice).
- The sim reads no weather. The director should tell `claude/map-layouts` the name: `weatherOf(board)`.

## Checks

`test/lands.test.ts` (the art exists, every army's lands, the spire's draw, weather tables and caps, the side stream); the shots are
`tools/map-lands/shots.mjs` and `sheet.py` -> `docs/samples/map-lands-*.png`. An old save and a new save both start and a full fight
plays with no page errors.
