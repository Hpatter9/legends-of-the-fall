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

## Still to repaint (after round 1; round 2 below answers it)

- `keg-blast.travel`: one keg that looks like a keg (staves, hoops, a lit fuse), rolling a little each frame, not a quarter turn.
- `reign-of-terror.ground`: in blood red and black-violet, a dark crown-shaped wave, not pink.
- `storm-cloud.ground`: a roiling cloud mass lit from within (lightning flickers inside), not a flat lozenge with twinkles.
- `tidal-wave.travel`: a tall curling wave seen side-on, cresting to the right (now a round blob).
- `summon-beast.cast`: the paw-print runes and a wolf's howl of light the brief asks for.
- The G impacts listed above: each its own burst (leaves, bark, coins, glass, stone cracking, a fear flash, a gory burst), filling more
  of the cell.

## Round 2 (SPELL-ART-REPAINT-2)

The owner's second repaints, PR #234 (`art/spell-fx-repaint-2`), 17 sheets painted to the round-2 brief (a hand-painted look, one
distinct burst per impact, the other rows kept as they were): **E** `keg-blast.travel`, `tidal-wave.travel`; **B** `storm-cloud.ground`;
**G** `reign-of-terror` (`ground` and `impact`), `summon-beast.cast`, and the `impact` rows of `wild-shape`, `conjure-treant`, `pilfer`,
`mirror-image`, `pipes`, `irresistible-dance`, `battle-hymn`, `plant-standard`, `war-banner`, `stone-curse`, `devour`; **U**
`ult-speedlines.beam`. Branch `claude/spell-art-repaint-2` merges them and re-imports. **No game code changed.**

**The other rows are untouched, as the brief asked:** every row not named (the 13 impacts, casts and grounds left alone in these sheets)
is pixel for pixel the same as on main (checked by comparing the decoded rows of the old and new PNGs). Every sheet keeps its size and
every row its frame count (the twelve G impacts now paint a sixth, nearly empty frame where the old ones faded below alpha 8 there).

### The import

`python3 tools/spell-fx/import-spell-art.py art-source/spell-fx` (cell 96): 144 of 144 sheets pass the check.

| Atlas | Before | After |
| --- | --- | --- |
| `b-auras.webp` | 260 KB | 258 KB |
| `e-moves.webp` | 222 KB | 233 KB |
| `g-spells.webp` | 753 KB | 870 KB |
| `u-ultimate.webp` | 235 KB | 232 KB |
| **All eight** | **3.28 MB** | **3.39 MB of the 5 MB cap** |

### The fixes, measured again

Each repainted row measured frame by frame (cover at alpha 24 and up, alpha-weighted brightness, the mean difference from the frame before,
and for the loops the difference from the last frame back to the first):

- **Dropped** `keg-blast.travel` (`[0, 2, 0, 2]`): the new keg is one barrel seen from the side (staves, two riveted hoops, a lit fuse at
  its back) that hardly turns: frames differ by 1 to 3 and the loop closes with 0.9, so all four frames play as painted. No strobe.
- **Kept** every other fix (the round-1 ones, and the ultimate bursts' `[1, 2, 3, 4, 5, 6]`, whose sheets were not repainted).
- **No new fix.** The loops are full from their first frame and change a little each frame: the tidal wave (cover 42-44%, difference 6,
  its spray moving), the storm cloud (18-20%, difference 3-6, its flicker of lightning moving about), Reign of Terror's ground (39-42%,
  difference 2), the speed lines (38% every frame; seamless, left and right columns within 1.4 to 3.9 of 255). The twelve impacts grow from
  a bright first hit (cover 8-17%) to their widest at frame 5 (27-45% of the cell, the brief's "most of the cell" by its bounding box: 180
  to 230 px of 256) while thinning (mean alpha of the painted pixels from about 200 down to 55-73), then frame 6 is faint wisps (under 1.3%
  cover): a fade, not a hard cut, so no `fade` is needed. Call of the Wild's cast runs from full (46%) to 3.5%.

### Pictures

Made with a small page script that paints each part through the game's own `Fx.paintOnce` / `paintLoop` at a foe in a held army fight (the
effects stepped by hand to fixed moments: 35, 140 and 280 ms into a burst, about frames 1, 3 and 5; 300 to 480 ms into a loop), so main
and this branch show the same moments. Before (main) on the left, after on the right, 393x852, no page errors:

- `docs/samples/spell-repaint2-sheets.png`: the five reworked rows (keg, tidal wave, storm cloud, Reign of Terror's ground, Call of the
  Wild's cast) at play size.
- `docs/samples/spell-repaint2-impacts-1.png`, `-2.png`: the twelve impacts, cropped round the foe at twice the size.
- `docs/samples/spell-repaint2-ult-speedlines.png`: the ultimate's band (`tools/ult-epic/shots.mjs`, Issen and Meteor Swarm), moving and
  with reduced motion (the lines held still), before and after.
- `docs/samples/spell-repaint2-sources.png`: the sources, old row above new, each frame on dark stone and on grass.

The fight shots of `tools/spell-fx/shots.mjs` were run too, but at their fixed hold they mostly catch the cast or the ground, not these rows
(Treeform, Plant the Standard, Pilfer, Pied Piper and Stone Curse were again not cast in the minute a shot allows), so the pictures above
are the record.

### How each reads now (honest)

The look is still not the brief's "hand-painted": most rows are again clean shapes with soft glows, and several carry a fine diamond
halftone pattern inside the shapes (the tidal wave, the storm cloud, Call of the Wild's glow, Reign of Terror's pool and first hit) that
reads as texture at 96 px but is not brushwork. What is much better is shape and variety.

- **Keg (travel): good.** At last a keg: round staves, dark riveted hoops, a sparking fuse, one drawing turning gently. Small at its 0.6
  tile, as before. It has a soft drop shadow under it, which the brief said not to paint (faint; left as is).
- **Tidal wave (travel): better, odd details.** A wave rising from the left and curling over to the right, with foam and spray off the lip:
  the right shape. But the lip is a hard white chevron, the body a halftone blob, and a thin dashed white line runs along its base (it
  reads as a strip of foam at play size, as a rule line close up).
- **Storm cloud (ground): not fixed, arguably worse.** A soft halftone blob with a thin lightning tick that moves about: not a heavy,
  churning thundercloud, no billowing masses, and it is smaller than the old one (18-20% of the cell against 27-40%), so it is a small
  pale smudge over the caster. Its lightning is a few pixels at play size.
- **Reign of Terror (ground): good.** A dark violet pool crowned with tall red-glowing spikes, blood red and black-violet as asked; no
  pink. Dark in the middle, but its glowing rim reads on dark stone.
- **Reign of Terror (impact): weak.** Distinct (violet-red tendrils from a dark core), but dim (brightness 34-60) and violet more than
  blood red: it nearly vanishes on a dark board.
- **Call of the Wild (cast): bad.** There is a ring with paw marks (white dots at play size) and a rising glow, but the "wolf" is two
  stilt-like legs, a blob and a paper-dart head with sound arcs: it does not read as a wolf, or a howl.
- **The impacts: every one now its own, and two to three times bigger.** Treeform throws a ring of leaves; Call Treant bark chips round a
  green flash; Pilfer gold coins; Mirror Image violet glass shards (the best of them); Stone Curse grey shards with green light in the
  cracks; War Banner a ring of orange flame-puffs; Battle Hymn a gold flash with rays; Plant the Standard a lance-shaft of light with a fan
  of flame rays bursting up from the ground (it stands on the ground: its foot is measured, so the game plants it there); Pied Piper a
  whirl of coloured ribbons; Devour two rows of white teeth snapping shut over a red-green spray (clear, but flat white triangles); Pipes a
  green swirl with no notes to be seen (the faintest of them). None is a dotted ring any more.
- **Speed lines (beam): fixed.** One even band of white through the middle (fully even across every cell) with thin streaks round it;
  tiled along the ultimate's band it is one streak, moving or held still (reduced motion), no more beads. The band is thinner and harder
  than the old blobs' glow, but the band's own CSS streak keeps the soft light.

### Still to repaint (round 3, if the owner wants)

- `storm-cloud.ground`: a big, heavy, dark cloud mass filling the cell's width, billowing, with bright lightning inside (not a halftone).
- `summon-beast.cast`: a wolf of light that reads as a wolf (body, head thrown back), and bold paw runes.
- `reign-of-terror.impact`: brighter, blood red rather than violet, so it shows on dark stone.
- `pipes.impact`: bold notes that can be seen, and brighter.
- Lesser: the tidal wave's dashed base line and white chevron lip; the keg's shadow; the halftone pattern across several rows.
