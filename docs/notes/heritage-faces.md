# HERITAGE-FACES: repainting the recoloured faces

The owner saw muddy, glitched faces on the heroes given new skin tones in 0.227.0 (docs/notes/heritage-looks.md), Tiago
the Buccaneer first. The painted portraits were fine; only the sprite sheets were wrong.

## What was wrong

The 0.227.0 tool found each hero's skin with a tight colour window and a nearest-colour test, then spread it 3 px. It
missed whole families of the original skin's shades, so the face was a patchwork of old light skin and new dark skin:

- **Pale highlights** run cream-yellow (hue 37 to 52), outside the old window (hue up to 36): the cheek and nose
  highlights stayed light (the white speckles on Malia's and Tiago's faces).
- **Deep shadow** under the hairline and chin, and **saturated chest shades** (saturation over 0.7), were outside it too:
  orange specks on Tiago's neck and chest.
- Highlights were also squashed: the tone ramp was fitted to the 3rd to 99th percentile of the *taught* pixels only.

## The repaint (`tools/heritage/recolour.py`, still from the untouched original sheets)

Same inputs and the same deterministic run: the originals stay in `src/art/units/<sheet>.png` (never changed), the repaint
is written next to them as `<sheet>_<tone>.png`. The skin mask is now:

1. the taught core, as before;
2. **spread** into the deeper and warmer shades a wider window takes in (saturation to 0.98, value down to 0.2, so the
   darkest shadow is skin but the outline, value under 0.2, is not), up to 3 px; into the pixels the old window already
   called skin-like (cream cloth and cuffs share them) only 1 px (`spreadLit`);
3. **pale highlights** (hue to 56, or white) join when skin has at least 3 of their 8 neighbours on a pass (`ring`), or 6
   for a bare white (`sparkle`; the Lightning Mage's cheeks needed 3 pale and the default is 4).

**Kept exactly as drawn:** eyes, brows, outline, hair, clothing, and the mouth: hot saturated reds and the rose of a
lip or blush (`LIP`, plus red hue 9 or less with saturation 0.45 or more) are never skin.

Each skin pixel then takes the tone ramp at its own lightness, so the light-to-dark order is kept; the ramp now spans the
1st to 99.5th percentile of the whole mask, so the shadows and highlights are included.

`tools/heritage/faces.py` writes the comparison sheets: `docs/samples/heritage-faces-<hero>.png` (rows idle, idle,
walk, walk, attack, attack; columns original, the 0.227.0 re-tone, the repaint; each crop 6x).

## The heroes

Ten sheets are repainted by the tool: Fire Wizard (Ravi), Cleric (Selam), Ranger (Inti), Illusionist (Luana), Buccaneer
(Tiago), Time Witch (Adaeze), Queen Dragoon (Tiziri), Great Sage (Seydou), Peasant (Minh), Lightning Mage (Malia). The
Knight and the Paladin are drawn in their tone by `tools/knight/plain.py` and `tools/paladin/plain.py`; their faces were
checked and are clean, so they are unchanged (the owner counted eleven; the table holds twelve, of which ten were
recoloured by this tool). Their sheets are not in the comparison set.

## Known imperfections (not fixed; no new art made)

- **Buccaneer, attack row:** the cream shirt cuff beside the hand is partly tinted tan, and in the hit pose a few pale
  cheek pixels stay light. The cuff shares its colours with highlight skin.
- **Ranger:** a pale pink knuckle on the bow hand in one attack frame is not recoloured.
- **Queen Dragoon:** a few pale-mauve cheek pixels remain in the side-on attack frame.
- **Illusionist, Time Witch:** the faces are only 6 to 10 px across, so the eyes are single pixels; they are kept but
  read faintly against the darker skin.
- **Paladin:** a flat blue-grey disc shows on the cheek in some frames of his source sheet (the same in the original).
  It is outside this task, so I left it; worth asking the owner.

## Also: the summon card's title line

`trTitle` in `src/summonTarot.ts` read "Buccaneer · XXX · Pirate · Assassin". The Roman numeral is out of that line
(now "Buccaneer · Pirate · Assassin"); it is still on the tarot card itself (`tarotNum`). `earnedArrival.ts` has no
numeral, and no other plate uses one. No test pinned the line.

## Checks

`npm run typecheck`; `npm test -- heritage summon` (42 pass); full `npm test` (2254 pass, 0 fail); `npm run web`.
