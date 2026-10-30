# KNIGHT-SPRITE — Kwame before awakening is the same man as after it

Branch: `claude/knight-sprite`. The owner: "We need to redo the soldier too. His sprite was just repainted and doesn't
look good. The original sprite vs the awakened one are very different. The awakened one is what I want."

## What changed

- **The Knight's plain battle sheets are made from his awakened ones**, frame for frame: `src/art/units/hero_soldier.png`
  and `hero_soldier_back.png` (and their `_deep` copies, which the game bundles) are `src/art/awakened/awakened_knight.png`
  and `_back` with the finery taken off. The face, the short curly hair, the skin, the body, the poses, the sword and the
  shield are the awakened sheets' own pixels; only the gear's colours change:
  - the gold (trim, pauldrons, belt, hilt, the shield's rim) becomes plain steel, each pixel keeping its own lightness;
  - the red cape and the green inlays become the dark blue cloth of a plain surcoat and cloak (the cape cannot simply be
    taken off: from behind it is most of the figure, and nothing is painted under it);
  - the blade's glowing blue core becomes plain steel;
  - the gold lion on the shield is painted over with the field's blue and a plain steel cross put in its place (the cross
    of his painted portrait, `src/art/heroes/knight.webp`).
- **The grid follows the awakened sheet**: `hero_soldier` and `hero_soldier_back` in `src/art/units/sheets.json` are now
  152 x 116 cells (were 184 x 113), with the same rows, frame counts, `figure` (96), `facesRight` and `lies`; the figure
  is 96 tall with its feet on the cell's bottom in both, so he stands the same size on the board. No code changed.
- **Heritage**: the awakened sheets are already drawn in Kwame's deep tone, so the `_deep` sheets are byte copies of the
  plain sheets, and `tools/heritage/recolour.py` now skips the Knight (`DRAWN_IN_TONE`) so a later run cannot darken his
  skin twice. His heritage entry, name and the bundling through `tools/heritage/sheets.json` are unchanged.
- **The painted portrait** (`knight.webp`, `knight-portrait.webp`) already shows this man (short curly hair, blue
  surcoat with a cross, blue shield with a cross) and is left as it is. Its red cape is the one difference.

## The tool

`python3 tools/knight/plain.py` (numpy + Pillow) writes the four sheets; `--preview DIR` also writes before/after strips.
It finds by colour and shape, per frame: the face (the largest solid patch of skin colour, kept untouched with the hair
round it), gold (hue 8 to 72), the cape (red and purple), the inlays (green), the blade's core (a long, bright patch of
blue edged in pale steel) and the lion (the largest solid gold inside the convex outline of the shield's blue field, on
the shield's side of the figure, grown to the rim). Alpha is untouched and nothing is blurred.
`python3 tools/knight/contact.py` makes the review sheets; `node tools/knight/shots.mjs [port]` the in-game shots.

Known leftovers: on three turned-shield frames (idle 4, defend 4, dead 2) part of the lion's head stays as a steel relief
rather than being replaced by the cross, as the turned shield shows too little of its blue field to find the whole lion.

## Review

- Every row, front and back, old plain vs new plain vs awakened: [front](../samples/knight-sprite-front.png),
  [back](../samples/knight-sprite-back.png).
- In the game at 393x852: [awakening card, before and after](../samples/knight-sprite-awakening-393.png),
  [hero sheet](../samples/knight-sprite-sheet-393.png), [tavern](../samples/knight-sprite-tavern-393.png),
  [deploy](../samples/knight-sprite-deploy-393.png), [fight](../samples/knight-sprite-fight-393.png),
  [defeated](../samples/knight-sprite-late-393.png), and
  [close-ups on the board](../samples/knight-sprite-board-closeups.png) (deployed, attacking from both facings, hurt,
  falling and lying down).
- Test: `test/knight-sprite.test.ts` (the plain sheets use the awakened grid and size, front and back; the `_deep` copies
  are the plain sheets).
