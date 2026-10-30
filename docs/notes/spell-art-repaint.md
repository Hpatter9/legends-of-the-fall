# The spell effects repainted (SPELL-ART-REPAINT)

The owner's repaints of the 26 sheets that read worst at play size ([spell-art-bde.md](spell-art-bde.md), "What looks bad"), PR #230
(`art/spell-fx-repaint`), painted to the repaint brief (bold, filling the cell, bright edges for dark boards, one drawing a loop, grounds
lying flat). This branch merges them over the old sources in `art-source/spell-fx/` and imports them. **No sim changes.**

The sheets: **B** `aura-protection`, `aura-rot`, `cloud-of-daggers`, `storm-cloud`, `bardic-notes`; **E** `tidal-wave`, `keg-blast`,
`grappling-hook`; **F** `gore`, `metamorphosis`, `rapid-shot`, `snare`, `iaido`; **G** `wild-shape`, `summon-beast`, `plant-standard`,
`conjure-treant`, `pilfer`, `devour`, `mirror-image`, `pipes`, `irresistible-dance`, `battle-hymn`, `stone-curse`, `war-banner`,
`reign-of-terror`.

## The import

`python3 tools/spell-fx/import-spell-art.py art-source/spell-fx` (cell 96): all 131 sheets pass the format check.

| Atlas | Before | After |
| --- | --- | --- |
| `b-auras.webp` | 268 KB | 254 KB |
| `e-moves.webp` | 201 KB | 217 KB |
| `f-martial.webp` | 441 KB | 508 KB |
| `g-spells.webp` | 546 KB | 735 KB |
| **All seven** | **2.80 MB** | **3.05 MB of the 5 MB cap** |

The repaints fill their cells, so they pack bigger; the atlases' shapes are unchanged.

## The fixes, measured again

Each repainted row was measured frame by frame (the painting's cover at alpha 24 and up, its brightness, and the mean difference from
the frame before), the way the last import found its fixes. Painted cover went up two to ten times: e.g. `bardic-notes.motes` 1% to
40%, `grappling-hook.travel` 1.8% to 12%, `gore.cast` 7% to 46%, the dotted-ring grounds 11-19% to 25-34%.

- **Dropped** `aura-rot.ground` (frames 2-5 back and forth): the new stain is full from its first frame (cover 24.8% every frame,
  bubbling within); played as painted.
- **Dropped** `storm-cloud.ground` (frames 3-5): the new cloud is a solid mass from frame 1 (27-40% cover every frame, a pulse of its
  lit rim); played as painted.
- **Changed** `keg-blast.travel`: the new sheet is one keg, but it turns a quarter each frame, so its staves flip between across and
  upright every frame (a mean difference of 21 a frame, a strobe at play speed). It now plays frames 1 and 3 (from 1), the staves across
  and the fuse going round (`[0, 2, 0, 2]`, a difference of 6).
- **Kept** the fixes of sheets not repainted (`healing-mist`, `mana-font`, `spirit-guardians`, `quivering-palm`, `tentacles`).
- Every other repainted loop is full from its first frame and changes a little each frame (turning, bubbling, pulsing; no swap); every
  once row runs from full to nearly nothing (the last frame under 1% cover), so no other fix was needed.

**The Aura of Protection** now lies flat (a ring of shield-runes as a 2:1 ellipse, no dome), so it is drawn at the normal `AURA_ALPHA`
(0.7): its 0.42 is gone from `AURA_ALPHA_OF` (`src/render/movePaints.ts`). The storm cloud stays at 1 and `HANG_MULT` 1.5.

## Screenshots

`tools/spell-fx/shots.mjs` gained the repainted moves (group `r`: Gore Charge, Iaido, Demon Form, Burst Fire, Call Treant, Treeform,
Call of the Wild, Mirror Image, Plant the Standard, Pilfer, Pipes of Pan, Pied Piper, Battle Hymn, Stone Curse, Reign of Terror; shot only
when asked for with `ONLY=` or `PICK=r`) and a `PREFIX` for the pictures' names, so before and after can be shot side by side (the
"before" from a `main` checkout with this script copied in).

Before (main) above, after (this branch) below, real army fights at 393x852 cropped to the board, no page errors:
`docs/samples/spell-repaint-auras.png` (Protection, rot, daggers, storm cloud), `-e.png` (Powder Keg, Tidal Wave, Grappling Hook,
Snare Trap, War Banner), `-f.png` (Gore Charge, Iaido, Demon Form, Burst Fire, Battle Hymn), `-g.png` (Call Treant, Call of the Wild,
Mirror Image, Pipes of Pan). Treeform, Plant the Standard, Pilfer, Pied Piper, Stone Curse and Reign of Terror were not cast in the minute
a shot allows, on either side (the sim's own "has something to do" checks); they were judged from the sheets (contact sheets made by
the same measure script, old row above new, each frame on dark stone and on grass).

## How each group reads now (honest)

Every repaint is bolder, bigger and brighter than what it replaces, and none blinks or swaps drawing (but the keg, fixed). The style,
though, is not the brief's "hand-painted": most are clean vector shapes with soft glows (rings of dashes, grids of lines, star bursts),
which read well at 96 px but look more drawn-by-code than painted.

- **B, the auras: good.** The Aura of Protection is now a flat ring of shield-runes on the ground (back to the normal alpha), its motes a
  bold gold shield. The rot is a bright bile-green pool with a pale rim that shows on the dark swamp. The cloud of daggers' pale violet
  blades read on dark stone (small at its reach of 1). The bardic notes' note fills its cell; the ring's staff lines are bold. The storm
  cloud is solid now, but it is a flat dark lozenge with cross-shaped twinkles, not a roiling cloud lit from within, and has no lightning
  of its own (its strikes come from the `impact` row, a thin zigzag bolt).
- **E: mixed.** The grappling hook is big and clear, with a bold rope. The tidal wave is a big blue ball with a crest of foam beads on
  its right: it points right and reads as water at play size, but it is a rolling blob, not a tall curling wave. The keg is **bad**:
  it is drawn as a grid of lines over a brown blur (it does not read as a keg) and turned a quarter a frame (fixed at import to two
  frames); its explosion is fine.
- **F: good.** Gore's red horns of force point right with speed lines; Demon Form is a red winged silhouette that fills its cell; Iaido's
  streak is bold and bright; Burst Fire is a bright cyan bolt; the snare is a bold green-toothed ring. Gore's impact is a plain spoked
  star.
- **G: better, uneven.** The casts now show their things: a bark-and-leaf tree (Treeform), roots and leaves (Call Treant), a planted
  standard, a moonlit flame in a ring (Call of the Wild, no paw runes or wolf shape), two blue after-images (Mirror Image), violet
  feather-blades swirling (Pilfer), a toothed maw (Devour). The grounds are bold rings (pipes, the dance, the hymn, the curse, the
  banner). But nearly every G impact is the same small starburst growing into a thin ring (`wild-shape`, `conjure-treant`, `pilfer`,
  `mirror-image`, `pipes`, `irresistible-dance`, `battle-hymn`, `plant-standard`, `war-banner`, `reign-of-terror`, `stone-curse`,
  `devour`): bright, but small and the same for every move. **Reign of Terror's ground is hot pink**, not the brief's blood and shadow
  (a dark crown of dread).

## Still to repaint

- `keg-blast.travel`: one keg that looks like a keg (staves, hoops, a lit fuse), rolling a little each frame, not a quarter turn.
- `reign-of-terror.ground`: in blood red and black-violet, a dark crown-shaped wave, not pink.
- `storm-cloud.ground`: a roiling cloud mass lit from within (lightning flickers inside), not a flat lozenge with twinkles.
- `tidal-wave.travel`: a tall curling wave seen side-on, cresting to the right (now a round blob).
- `summon-beast.cast`: the paw-print runes and a wolf's howl of light the brief asks for.
- The G impacts listed above: each its own burst (leaves, bark, coins, glass, stone cracking, a fear flash, a gory burst), filling more
  of the cell.
