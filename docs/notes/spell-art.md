# The painted spell effects brought into the game (SPELL-ART)

The owner's ask: "Prioritise using the ChatGPT effects visuals." ChatGPT painted the first two sessions of the brief
([BRIEF.md](../../art-source/spell-fx/BRIEF.md), the RPG-spells art prompt): session A, the movement toolkit (#210, `art/spell-fx`,
[note](spell-fx-art.md)), and session C, the healers and revives (#211, `art/spell-fx-c`, [note](spell-fx-art-c.md)). This branch
merges both, with their source PNGs, originals, notes and credits, and brings them into the game. **No sim changes**: the
identity test (`test/spells-identity.test.ts`) is unchanged and passes.

## The importer

`python3 tools/spell-fx/import-spell-art.py [<folder>] [cell=96] [--check] [--contact <png>]` (the folder is
`art-source/spell-fx` by default).

- **The manifest**, `tools/spell-fx/spell-parts.json`: every one of the brief's 131 sheets (258 rows), by session, each row as
  `[part, kind, fewest frames, most frames, size in tiles]`. The ranges come from the brief's format table (cast 6-8, travel and
  beam 4-6, impact 6-8, ground 6-8, rise and break 6-8, stand 4-8, motes 4-6, trail 6-8; the smoke bomb's impact is a ground loop).
- **The checks**, for every sheet that is there: rows of square 256 px cells, the width whole cells, no empty row, each row's frames
  (to the first empty cell) in range, no frame after an empty cell, and the four corners of every used cell transparent (alpha under
  8). It names the sheet and row of each fault, and leaves a faulty sheet out (its placeholder stays). It lists missing sheets, PNGs
  the manifest does not know, and sessions not painted yet.
- **The atlases:** the passing cells scaled to 96 px (Lanczos), one WebP a session (quality 85), 16 cells a row, no strip split.
  `src/art/fx/spells/index.json` maps each session to its cell, size, bytes and parts:
  `"<key>.<part>": [column, row, frames, size in tiles, 1 if it loops, foot]`. `foot` is how far down the cell the row's painting
  reaches, so an effect that grows from the ground is stood on the ground. (The brief's per-session `<session>.json` is folded into
  this one index, so a new session needs no code change to be bundled.)
- **The cap:** it prints each atlas and the total, and stops, writing nothing, over 5 MB.
- **Re-runnable:** a session that lands is a folder dropped into `art-source/spell-fx/`, then the same command. An atlas whose session
  has no passing sheet is removed. `--check` writes nothing; `--contact` draws every packed strip on one picture.

**This run:** all 25 sheets pass (15 of A, 10 of C; none failed). `a-toolkit.webp` 36 parts, 1536x1632, 780 KB;
`c-healers.webp` 19 parts, 1536x864, 447 KB; **1.20 MB in all**. Contact sheet: `docs/samples/spell-art-contact.png`.

**For later sessions:** A and C come to 1.2 MB for 55 of the 258 rows, so all seven sessions at 96 px would be about 5.6 MB, over
the cap. The importer will stop when it gets there; run it with `cell=80` then (about 3.9 MB), as the brief says.

## In the game

- `src/render/spellLooks.ts` (pure, tested): reads `index.json`; `spellPart(key)`, `spellScale(key)` (the brief's size in tiles,
  64 px a tile), `footed` and `spellAnchorY` (walls and the throw, burrow and revive bursts stand on their foot; the rest are centred).
- `src/render/spellArt.ts`: loads each session's atlas by URL (`fx/spells/<session>.webp`), like `statusArt.ts` cuts its atlas,
  but without holding up the start (`loadFx` starts it and does not wait). `spellFrames(key)` is empty until it has loaded, or for a
  part no atlas has, and the caller keeps its placeholder. `build.mjs` copies the atlases to `out/web/fx/spells/` and lists them
  in the service worker's `FILES` (offline).
- `src/render/toolkitLooks.ts`: each look names its painted part as `paint` (`MOVE_LOOKS`, `WALL_LOOKS`, and `auraLook` naming the
  session B sheet for each aura); `PAINT` lists the painted parts that had no strip of their own.
- `src/render/fx.ts`: `lookOnce` and `lookLoop` draw the painted part first, and helpers draw the rest: `paintOnce`, `paintAlong`
  (a streak stretched along a line), `paintLoop`, `paintBeam` (whole seamless segments squeezed to fit), `paintWall`, `paintShove`,
  `paintAura`. What session A now paints:
  - **launch:** the throw (`launch.cast`), rock chunks spinning with the flier (`launch.motes`), the landing (`launch.impact`);
  - **shove:** the burst of air and the skid; **pull:** the tether from the dragged foe to the puller and the grip;
  - **slam:** the impact star;
  - **burrow:** the dig, the painted mound running along the tunnel (in place of the drawn one), the eruption;
  - **walls:** each of the six kinds rises, stands and breaks in one sprite (no gap between the parts); the stone prop is not drawn
    under a painted stone wall; an ice wall that shatters plays its own break;
  - **swap:** the twist at both ends and the ribbon between them;
  - **dash:** the speed smear and the stop dust (the after-images stay);
  - **blink:** vanish and appear; **a blink that strikes** (a teleport slash's hops, or any blink then a skill blow, found in the
    tick's events by `slashesOf`) also gets the slash streak and the crossed cut on the foe, each hop `SLASH_HOP_MS` after the last.
- **Not yet painted, placeholders kept:** the auras (session B); the wind wall's gust (`wall-wind.impact`), which has no event of
  its own to hang on. Session C is loaded and keyed (`revivify.cast`, `death-ward.stand`, `guiding-bolt.travel`...) for the healers'
  batch to use by key.
- **The rules:** normal blending (the brief's); a painting over a fighter's body is thinned (FX-CLEAR: `particles.ts` takes a
  `half` so a 96 px cell is measured as itself, and beam segments are thinned the same way); loops fade in and out but never blink
  off; reduced motion holds each loop's first frame; battery saver draws fewer rock chunks, aura motes and skids.
- Walls, like the placeholder's prop, are drawn in the effects layer, above the fighters.

## Checks

- `npm run typecheck`; the full `npm test`: 1599 tests, 0 failures; `npm run web`.
- `test/spell-fx.test.ts`: the manifest is the brief's 131 sheets and 258 rows; every entry of a painted session names a real sheet
  with one 256 px row a part; every packed part is in the manifest, in range, inside its atlas, with no overlaps; the atlases are
  there, the size the map says (read from the WebP header), within 5 MB; the build copies them and lists them in the service worker;
  every painted key the toolkit asks for is a manifest part and painted; sizes and anchors.
- `PORT=8881 PREFIX=spell-art SIZES=393x852 node tools/spells/shots.mjs`: the launch, walls, aura, burrow and teleport slash staged
  in a real fight (`docs/samples/spell-art-*-393x852.png`, side by side in `spell-art-all-393x852.png`); the launch also at 360x780
  and 412x915. No page errors.
