# Art wire 9: four holds' gates, keeps and drums, and the Council's burning hall

The owner's new art, merged into `claude/art-wire-9` from `origin/main` (0.469.0) and brought into the game. Pictures:
`docs/samples/art-wire-9/`, at 393 x 852.

## The holds

| Hold | Branch | New sheets |
| --- | --- | --- |
| Moonlit Shrine | `art/assault-yokai` | yok-07 (the keep), yok-09 (the drums and landmarks), on top of yok-01 to 03 |
| Bonefire Crag | `art/assault-ogres` | ogr-02 (the gates), ogr-03 (the Skull Gate), ogr-07 (the keep), ogr-09 |
| Brimstone Gate | `art/assault-infernal` | inf-02, inf-03 (the Infernal Gate), inf-07, inf-09 |
| Iron Foundry | `art/assault-golems` | gol-02, gol-03 (the Furnace Gate), gol-07, gol-09 |

The ogres, infernal and golems branches carry yok-01 to 03 too, the same files, so their merges brought nothing twice.

`tools/assault/cut-sheets.py <hold>` for each of the four. No code had to change:

- **Sheets 02, 03 and 07** are painted cell for cell as the Orc set (the gates in three states, the gate towers, the great gate in three
  states, the postern, the corner towers; the keep, the throne, the great banner). They are cut by the Orc slots.
- **Sheet 09** is cut by the holds' own layout (`hold_layouts`, `docs/notes/art-wire-8.md`). Checked against each prompt and each
  painting, it is the same in all four: the war drum sounding and silenced (cells 1 and 2, 2 x 2), then two 2 x 2 landmarks and two
  3 x 3 ones. The field now draws each hold's own drums:
  - the Moonlit Shrine's great war drum;
  - Bonefire Crag's great bonefire;
  - Brimstone Gate's fire circle;
  - the Iron Foundry's steam hammer.
- The Orc names sheet 09 does not paint (the war tent, the bonefire) come from the Orc sheet, recoloured, as before.
- Everything else still stands in, recoloured from the Orc sheets: the rings' walls (sheet 01), the faces, ground, dressing, props, ruins,
  water and decals. The Moonlit Shrine has its own wall (yok-01).

**Foot points.** The cut raised two notes on the painted pieces:

- the four holds' corner towers (3 x 3, sheet 03) stand about 33 px inside their footprints, centred;
- the Infernal's two 3 x 3 landmarks do the same.

Both are within the cutter's tolerance and centred, so they are left as painted (the field places no landmark). Every other note is the
recoloured Orc stand-ins' own, the same as Bloodtusk Hold's.

**Looked at** on the Assault bench (`?bench=assault&army=<hold>&worker=0`, each gate struck through `__benchStrike`):

- the South Gate and the great gate whole, battered and broken;
- the keep;
- a drum post.

Each hold's sheet in `docs/samples/art-wire-9/<hold>-393.jpg` has the South Gate's three states, then the great gate's, then the keep and
the East drum post.

## The Council's burning hall

`art/assault-war-end`: `art-source/expansion/council-fallen-backdrop.png`, 1024 x 1536, opaque. This is the owner's painting of the prompt
in `docs/notes/assault-5-art-prompts.md`: the Council's chamber with every seat burning and the warchief's high seat empty.

- `tools/dynasty-art/import.py` brings it down beside the Council backdrop, to 768 x 1152: `src/art/dynasty/council-fallen-backdrop.webp`.
  Re-run, it leaves the other backdrops and paintings as they were.
- `menuBackdrop` (`src/menuBackdrops.ts`) takes `councilFallen`, and the Council board (`openNemesisBoard`) shows it once `War.end` is set.
  Until then the board keeps the chamber.
- **ALIVE.** The hall has its own life (`councilFallen` in `src/render/ambientScenes.ts`), light only, under the board's veil, and still
  for reduced motion as every scene is:
  - the ten seats down the table and the near seat gutter with low fire, and send up embers;
  - a sconce burns on each wall;
  - ash drifts through the smoke.
- It is imported into `game.js` as a data URL, as the Council backdrop is, so it plays offline with nothing added to the service worker.

Pictures: `council-fallen-393.jpg`, `-360.jpg` and `-412.jpg` (the War over), and `council-live-393.jpg` (the War going on, the chamber).

`CREDITS.md` credits it beside the Council backdrop, and the four holds' new sheets in their sections.

## What looks off (for the owner)

- **The rings' walls** of Bonefire Crag, Brimstone Gate and the Iron Foundry are still the Orc palisade, recoloured, beside their painted
  gates, until their sheet 01 lands.
- **The camps' tents** in the three holds are the Orc war tents, recoloured, until their sheet 11 lands. The red Orc tents show plainly in
  Brimstone Gate's and the Iron Foundry's camps.
- **The burning hall** reads dark under the board's veil, which is as dark as the chamber's (the words sit over it). Its fire shows
  mostly round the edges.

## Checks

- `npm run typecheck`: clean.
- `npm test`: the full suite, 3093 pass.
- `npm run web`: builds.
- The four holds' fields and the Council board looked at at 393 x 852 (the board also at 360 x 780 and 412 x 915).
