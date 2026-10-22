# The boss card shows the whole boss

The owner: the boss warning card's picture was often clipped. The portrait was a square of the figure's height cut from the
middle of the frame, so a wide boss (an axe, wings, a long club, a fox's tails) lost its sides.

- `wholeFigure(sheet, maxW, maxH, mirror)` in `src/render/sheets.ts`: finds the box round every pixel of the sheet's idle
  frames (`idleBounds`, scanned once per sheet and kept), draws the first idle frame cropped to it with a pixel of room, and
  scales it by the largest whole number that fits. Mirroring is drawn into the canvas, so the slide-in animation (which
  sets `transform`) no longer fights a CSS flip.
- `startIntro` in `src/main.ts` fits it in 80% of the width and 38% of the height.
- The name on the ribbon is sized to fit: the largest of 48, 36 and 24px whose longest word fits the ribbon, on two lines
  at most (three at 24px), else 12px. "Vorgrath the Hellbringer" was cut off at 360px wide. The ribbon has 12px of room
  above and below.
- The card's white flash is now 0.45 alpha over 120 ms (it was 0.55 over 250 ms), within the no-flashing rule.
