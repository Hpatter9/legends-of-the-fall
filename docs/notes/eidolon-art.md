# Eidolon art: parts 1 and 2 brought in, the quest pieces wired, the rest reviewed

The owner's art assistant delivered two pull requests: #238 "Eidolon art: part 1" (`art/eidolons-1`, 14 images) and #237 "Eidolon
art: part 2" (`art/eidolons-2`, 63 images), painted to the briefs for the quests and Eidolons design
([quests-summons-design.md](quests-summons-design.md)). Both are merged into this branch under `art-source/eidolons/`. Only the
quest givers and the board papers are used now; the horn, the calling and the Eidolons wait for their batches.

## What came in (`art-source/eidolons/`)

- `horn/`: the War Horn (`horn-empty`, `horn-light`, `horn-ready`, `horn-blast`, 512 x 512) and its effect sheets (`horn-fill`,
  `horn-ready-fx`, `horn-blast-fx`, `horn-shine`). **Renamed on merge:** both parts named a file `horn-ready.png` and `horn-blast.png`
  (part 1 the horn pictures, part 2 the effect sheets). The pictures keep the names; part 2's sheets are `horn-ready-fx.png` and
  `horn-blast-fx.png`.
- `call/`: `eid-circle`, `eid-rift`, `eid-motes` (256 px cells).
- `givers/`: `gwen-tallow`, `pedlar`, `pilgrim`, `messenger`, `hunter` (512 x 512). `board/`: `notice`, `notice-sealed` (384 x 512).
- One folder per Eidolon (`cinderhound`, `rimewyrm`, `liondawn`, `voltara`, `quarrytitan`, `dragonking`): `<id>-body`, `-limbs`,
  `-glow` (1024 x 1536), `<id>-card` (512 x 512), and the attack beats `eid-<id>-<beat>.png` (256 px cells).
- `bosses/`: `boss-<id>.png` for the five fought (2048 x 2048, 8 x 8 cells of 256).

## Wired now

- **The givers' faces** (`FACES` in `src/questArt.ts`): `src/art/quests/<giver>-face.webp`, 192 px squares cropped to the head and
  shoulders from the 512 px busts (WebP 85), shown at 64 px on a giver's card and 40 px in the log's rows. Gwen, the pedlar and the
  pilgrim replace the pack placeholders (the LPC face and the Tiny RPG Town faces, now removed); the messenger's and the hunter's are
  in `FACES` already (typed `GiverId | 'messenger' | 'hunter'`) for the quests that bring them. `.qFace img` no longer draws pixelated.
- **The board's papers** (`PAPERS` in `src/questArt.ts`: `notice.webp`, `notice-sealed.webp`, 96 px across): in the tavern a painted
  notice is pinned over one of the pack board's own papers for each offer (up to three, `BOARD_PINS`), drawn smooth. The sealed one is
  kept for the Eidolon chains' steps.
- Gwen's figure behind the bar stays the LPC sprite: the busts are head and shoulders, with no bust spot in the bar room.
- `tools/quests/import-art.py` makes the WebPs (run by hand); `tools/quests/cut.py` no longer writes the placeholder faces. The WebPs
  are data URLs in game.js, so nothing goes in `build.mjs`'s offline list. Credited in CREDITS.md (original art made with AI image
  generation for this game).
- Screenshots (393x852, 360x780, 412x915): `docs/samples/eidolon-art-1-{tavern,card,log-active,log-board}-<width>.png`.

## The review

Contact sheets: `docs/samples/eidolon-art-review-givers.png`, `-horn.png`, `-call.png` (the calling's and the horn's sheets),
`-figures.png` (each Eidolon's body, limbs, glow, stacked, limbs moved 12 px over magenta, and the card), `-beats-1.png`,
`-beats-2.png` (every attack-beat sheet, 96 px cells on the dark board colour), `-bosses.png` (every row of the five boss sheets)
and `-bosses-scale.png` (each boss's idle at about three fighters tall on a sunny tile colour).

**The overall finding.** The formats are mostly right (square 256 px cells, transparent, rows as briefed, canvases lined up), but
almost none of it is painted. Nearly every piece is flat vector shapes and soft blobs with a halftone dot texture, the look of
something drawn by code, not the briefed "hand-painted, high-end mobile RPG" style. The Eidolons and the bosses read as stacked
circles and triangles, not a hound, a wyrm, a lion, a goddess, a titan or a dragon. This is what the owner has asked not to have.

### Good, or usable as is

- **The horn set lines up exactly**: the four pictures share one silhouette to the pixel (2 pixels differ between empty and light),
  the same size and angle, mouth up and to the right, so the fill reveal will sit right. The ready horn's halo is good.
- **The formats**: every sheet is 256 px cells on transparent; loops wrap cleanly (`eid-circle` ground, the motes, `horn-fill`
  motes, `horn-ready-fx`, the static, the crack, the marks' ground rows); the one-shot impacts of the marks fade to wisps; the beams
  (`horn-shine`, `liondawn-roar`, `dragonking-breath`) join at their left and right edges.
- **The boss sheets' layout**: 8 rows with 6, 6, 6, 6, 6, 3, 8, 8 frames as briefed, facing right, the baseline steady (the lowest
  pixel on the same row in every frame), the dead row kneels and stays whole.
- **The board papers** are fine: a clean parchment, a nail, unreadable writing, the sealed one with its gold seal and ribbon. Used.

### Repaint list, by file

- **`givers/*` (all five)**: flat cut-paper shapes, not painted anime-style busts; chest-up figures rather than head and shoulders.
  Gwen's grey braid is drawn as a column of plates beside her face; the hunter's furs are rows of triangles. Wired as asked (they read
  at 40 to 64 px), but they should be repainted to the brief, matching the hero portraits (`src/art/heroes/*-portrait.webp`).
- **`horn/horn-light`**: only the rune band and the bell's mouth change from the empty horn; the ivory itself never lights, so a fill
  revealed from mouthpiece to bell shows almost nothing between them. Repaint with the inside glowing along the whole horn. All four
  horn pictures carry a stray small gold rectangle below the horn (about x 130, y 237): remove. `horn-blast` adds only a wisp at the
  mouth, not the briefed cone (that is in `horn-blast-fx`, which is fine if the game layers them).
- **`horn/horn-fill`**: `impact` has 3 frames (6 briefed), from a ring of dots to a blur. **`horn/horn-blast-fx`**: the cone touches
  the cell's right and top edges in frames 3 to 6 (clipped), a stray near-empty eighth cell, `impact` 5 frames (6 briefed).
  **`horn/horn-shine`**: a wavy striped ribbon, not a sheen along a curved surface.
- **`call/eid-circle`**: `impact` opens on a flat solid gold disc with white bars, 4 frames (8 briefed). **`call/eid-rift`**: `impact`
  opens on a flat white-and-violet globe icon, 5 frames (6). The rift `cast` is fine in shape but small and flat.
- **Every Eidolon's figure (`<id>-body`, `-limbs`, `-glow`) and card**: repaint all six. Blobs and polygons, not creatures: the
  Cinderhound a brown blob with an orange chain for a tail; the Rime Wyrm a stack of discs with a triangle head; the Lion a flower for
  a mane over yellow balls; Voltara a pile of orange ellipses; the Quarry Titan floating boxes (the head, the hammer and its arm are
  apart from the body even unmoved); the Dragon King black blobs with two triangle wings. The layers line up (one canvas), but the
  limbs barely overlap the body: moved 12 px, the Cinderhound's tail and the Titan's arm come away.
- **The attack beats** (all 30 sheets): flat and small for "the grandest moment in the game", and:
  - the five `*-mark` sheets are one drawing recoloured (the alpha differs by under 0.2 in 255): each Eidolon needs its own mark
    (scorch, frost, light, static, rubble, black fire);
  - `cinderhound-howl`: the cone points **down**, 5 frames (8), ends on an empty cell after the biggest frame (a hard cut);
  - `cinderhound-ring`: an orange ring and a cluster of flame bulbs, 6 frames (8), not a wall of flame round the field;
  - `cinderhound-embers`, `quarrytitan-rubble`: the mote moves down the cell frame by frame and jumps back on the loop; a mote should
    stay centred (the game moves the copies). The rubble is a flipping triangle, not a rock;
  - `rimewyrm-shatter`: opens on a flat white trapezoid; `rimewyrm-burst` and `-breath`: 6 to 7 frames (8);
  - `liondawn-beam`, `-leap`: 5 frames (8), the pillar a grey ellipse; `liondawn-sunrise`: a ring, frames 2 and 3 and 5 and 6
    identical (it holds, then jumps);
  - `voltara-spin`: ends on an empty cell straight after the brightest frame (a hard cut); `voltara-bolt`: 6 frames (8), a blue blob
    with a line in it; `voltara-lattice`: a dotted zigzag whose left and right edges do not meet (a seam every tile);
  - `quarrytitan-rise`, `-pillars`, `-slam`: a single flat box; 5 to 6 frames (8);
  - `dragonking-eclipse`: 7 frames, the last one full (a "once" row that never fades); `dragonking-void` ends on a white dot, not ash;
    `dragonking-descend`: 5 frames (8).
- **The boss sheets (all five)**: repaint. At fighter scale they don't read as their creatures (the scale sheet), and the motion is
  thin: in idle, walk and attack, frames 2 and 3, and 5 and 6, are the same picture (identical for Voltara and the Titan, all but
  identical for the others), so a 6-frame loop is really 4 poses and stutters. The Titan's head floats above its body; Voltara's face
  is a play-button triangle.

## Left for the later batches

No atlases or game code for the horn, the calling, the Eidolons or the bosses. When repainted art comes, the formats above are what
the importers should expect; keep the `-fx` names for the horn's sheets (or rename both parts' files in one go).
