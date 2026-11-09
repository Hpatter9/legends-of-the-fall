# The castle remake (Castle tab)

**Historical layout:** superseded by the owner-approved [Castle tab renewal](castle-tab-renewal.md), which uses Throne Hall / Buildings views and supplies painted scene thumbnails for all sites. The courtyard and pending cutout art described below are retired.

The owner: "Let's also remake the castle scene and page. It doesn't match the rest of the game anymore. The castle tab."
This changes only how the tab looks and is laid out. Every castle rule is unchanged: costs, levels, build times, the builders' works,
rooms, the Chapel, the Sparring Yard, the Hall's plinths, Duchess and the trophy wall. `src/sim/` is untouched.

## What didn't match (before, at 393x852; `docs/samples/castle-remake/before-*.png`)

The reference screens are `before-camp`, `before-tavern`, `before-spells`, `before-armies` and `before-menu`. They are painted backdrops
under a panel head, painted plate buttons and medallions, and the standard ornate menu. Against them, the castle tab had:

- **Pixel art beside paintings.** The scene was the pixel throne room (`throne_room.png`) in a brass frame, and each chamber card showed
  a half-size isometric pixel building from Chronos's kits. Every other tab is a painting.
- **Code-drawn panels and emoji.** The "ROYAL CITADEL" crest was a CSS box with ◆ glyphs, the frame had 👑 and ⚔️ emoji pennants, and
  the hint read "✨ Tap heroes to salute". The six bonus pills used emoji (🪙 ⚔️ ❤️ 💧 🐎 📜), the upgrade buttons were green CSS boxes
  with "▲" and a 👑 cost, and the "Build Town" chip had a 🏰 emoji.
- **The building card wasn't the standard ornate menu.** It was the old `hsheet bcard`: no crest, eyebrow or filigree rule, ◆◇ text
  pips, and a Build button whose "Build · 180 · 20:00" broke over two lines.
- **Names differed between the two views.** "High Treasury" and "Crown of Minted Vaults" on the grid became "Treasury" on the card.
- **Two doors for one thing.** Each building had a chamber card with its own one-tap Upgrade button, plus a separate card behind it.
- **No life.** Apart from the throne room's own canvas, the castle had no torches, banners or smoke from the ambient toolkit.
- **An overflow.** The frame's rays ran past the right edge at every size (the before check reports `ctRays` at 463 to 530 px).

## The design (after: `docs/samples/castle-remake/after-*.png`)

1. **The head**, as the tavern's: the `combat-panel` frame, "The Keep" in display type, "Castle rank 10 of 48" under it, and a painted
   **Trophies** plate (the boss trophy wall, the castle's one door that has no tab).
2. **The courtyard**, one painting at its own 2:3 across the full width (`.crYard`). The keep is at the top, eleven plots run down to the
   gate, and an `AmbientLayer` over the painting (`SCENE_LIFE.courtyard`) moves the keep's banners, the gate and wall torches, the lit
   windows, the fountain, chimney smoke, bats and fireflies. Each **building stands on its plot** (`PLOTS` in `src/castleArt.ts`) and
   is one button with a **painted plaque** under it (`pbPlaque`):
   - "Build · 120" on an empty plot (the plaque dulled, the building a grey ghost or, once painted, the building site);
   - "Lv 2/5", plus "· ▲" and a lit plaque and a soft glow in the building's own colour when the next level is affordable and the
     builders are free;
   - "Building 2:13:42" with the builders' clock swinging over the site while the works go on (ticked each second by the home screen);
   - "Lv 5 · Full" at the top.

   A tap opens the building's card. The keep has its own plaque ("The Keep · throne hall"), and tapping it scrolls down to the hall.
   When a build starts, its place rises with a warm flash and the hall's guards salute.
3. **What the castle gives**: the six bonuses on painted chips, each with its medallion (gold, sword, heart, mana, speed, star). A chip
   is lit once its building is built.
4. **The Throne Hall**, under its own heading: the same canvas scene (the ruler, four guards, Duchess and her haystack, the trophy
   rack, salutes and decrees) in its brass frame, now at its true aspect, with the crest, emoji pennants and rays removed.
5. **Every card is the standard ornate menu** (`ornateMenu`, id `castleCard`). The eyebrow reads "The Keep", then the building's name
   and "level 2 of 5" / "not built yet" / "building level 4". The body opens with the building over its level in painted stars, then
   the blurb; a well with "Now" and "Level N"; the Rooms, the Sparring Yard and the Hall's plinths as sections; and the hints. The
   footer has the painted Close and the primary plate "Build · ⚜180 · ⏱20:00" (Building · clock while it goes up, Full at the top, greyed
   while too dear or the builders are elsewhere, with a note saying where). The chapel card is the same shell.
6. The **Codex** chip above the page keeps its painted chip, now with a medallion in place of the pixel icon (Build Town has moved to
   Settings › Developer).

### Design calls (what I recommend, and why)

- **One painted courtyard rather than a grid of cards.** The tavern and the camp are places you look at and tap, and the castle should
  be one too. The buildings are separate cut-outs over a painting of empty plots, not painted into it. Then an unbuilt plot can show
  a building site, a build in progress can show scaffolding, and a future building only needs one more cut-out.
- **One look per building, not one per level.** Eleven buildings at four looks each would be 44 paintings (several chats); the plaque,
  the stars and the glow carry the level. The watchtower keeps its grander old sprite at its top level until it is painted.
- **The one-tap Upgrade button on the grid is gone. A tap on a building opens its card, and the card's Build is one more tap.** On a
  crowded painting, a tap that spends crowns at once is too easy to make by accident. The card shows exactly what the crowns buy.
  (The `onDirectUpgrade` hook is kept in the constructor so the home screen's wiring is unchanged.)
- **The throne hall stays a canvas scene.** Its taps (decree, salutes, Duchess's hop and treat, the trophy rack) are features, so its
  drawing is unchanged. Only the backdrop is to be repainted (`throne-hall.png`, empty dais: the rulers bring their own throne).
  Phase 2, not done here: draw the four guards from the tavern's painted guest art instead of pixel sheets.
- **Section order: courtyard, then bonuses, then hall.** The buildings are what a player comes to the tab for.
- **"Build Town" moved to Settings › Developer** (the director's follow-up after 0.437.0). It is a testing tool, not a castle door. It
  works as before: every upgrade one level up (one at its top goes back to 1), the Chapel built, and at least 5000 crowns. The rule is
  `buildTown` in `src/sim/devGrant.ts` (`devGrant(m, 'town', 0)`), and it is the full-width painted button under the grants on the
  Developer page, which says what it did. The Castle tab's bar keeps only the Codex chip. Tests are in `test/dev-grant.test.ts`; the
  shots are `after-dev-*.png` and `after-dev-town-*.png`, with `after-scene-*.png` taken again.

## Files

- `src/castle.ts`: `CastleScene`'s layout (head, courtyard, places, bonuses, hall) and `update` (plaques, the build flourish). The
  hall's canvas code is unchanged apart from drawing the painted hall when it lands (`SCENE_LIFE.throneHall`). `lookPicture` returns
  a building's painting once it lands.
- `src/castleArt.ts` (plain data, tested): the picture names, `isPainted`, `castleArtUrl`, `buildingArt`, `PLOTS`, `KEEP_SPOT` and
  `plaqueState`.
- `src/home.ts`: the castle cards moved onto `ornateMenu` (`castleCard`, `cardArt`, `cardSection`, `buildButton`). `closeSheet` and
  `show` close an open castle card, and `tickWorks` redraws it as before.
- `src/castleRemake.css` (built into the page after `alive.css`); `src/render/ambientScenes.ts` (`courtyard`, `throneHall`).
- `src/revealCard.ts`: a building's reveal uses `lookPicture`, so it picks up the painting too.
- `build.mjs`: copies `src/art/castle-remake/*.webp` to `ui/castle/` and lists each in the service worker's `FILES`.
- `tools/castle-remake/cut.py`: the cutter (below). `tools/castle-remake/shots.mjs`: the shots and checks.

## Royal hall follow-up

Release 0.439.0 completes the previously approved stone throne hall inside this layout. The `throne-hall` painting is now packed and active; live ruler, guard, Duchess and trophy interactions remain. See [royal hall handoff](castle-royal-hall.md). The courtyard and two building sheets below are still pending.

## Original art handoff (`docs/notes/castle-remake-art-prompts.md`, one prompt)

Four files under `art-source/castle-remake/`: `courtyard.png`, `buildings-a.png`, `buildings-b.png` and `throne-hall.png`. Until they
land:

- the courtyard is a **plain stand-in** made by the cutter (dusk, stone, kerbed plots where the painting's will be);
- the buildings are the old pixel sprites (greyed when unbuilt), and there is no building-site picture;
- the hall originally used the old pixel throne room; the royal hall follow-up now supplies its painting.

When the pull request is merged, run `python3 tools/castle-remake/cut.py`. It writes the paintings and the twelve trimmed cut-outs to
`src/art/castle-remake/` and lists them in `manifest.json`, and the page then uses each painting by name with no code change. Add the
credit line it prints to `CREDITS.md`, then check `SCENE_LIFE.courtyard`'s spots against the painting
(`node tools/alive/masks.mjs <dir>`). A dry run against made-up sheets cut all the cells and the manifest correctly.

## Checks

- `npm run typecheck`, `npm run web`: clean.
- `npm test -- castle rooms building ui-standard painted-buttons ambient`: 84 pass, 0 fail. This includes the new
  `test/castle-remake.test.ts`: every site has one plot, apart from the others and inside the painting; the prompt asks for a plot at
  every point the page uses; the cutter, manifest, stand-ins, build and service worker are wired by name; and the plaques' words. No
  test read the old castle classes, so none needed changing.
- `node tools/castle-remake/shots.mjs before|after` at 393x852, 360x780 and 412x915. The scenes are scene, chambers (scrolled to the
  bonuses and hall), card, rooms (the Hall of Legends), chapel (unbuilt), works and built (the Barracks at level 5 with the Sparring
  Yard). Before also covers the camp, tavern, spells, armies and an ornate menu. After: 0 page errors, nothing past the right edge,
  and no button under 44 x 32. Before: the rays overflowed on every castle shot.
- The old shot tools that click `.ctChamberCard` (`tools/depth/shots.mjs`, `tools/castle/room-art-shots.mjs`,
  `tools/ui-consistency/shots.mjs`) now need `.crSpot[data-site=…]`. They are old one-off tools and were left as they were.
- `docs/notes/castle-scene.md` describes the older isometric yard and the throne-room page; this note replaces it for the Castle tab.
