# The ended Council board's veil

A follow-up to `docs/notes/art-wire-9.md`, at the director's ask. The burning hall was under the same dark veil as the Council's chamber,
from 62% to 82% black, so only a little of its fire showed round the edges. Pictures: `docs/samples/council-veil/`. They show the board at
393 x 852 before and after, scrolled to its foot, at 360 x 780 and 412 x 915, and the board while the War goes on, unchanged.

- **A lighter veil.** `menuBackdrop` (`src/menuBackdrops.ts`) now takes each painting's veil from `VEILS`. The burning hall's runs from 16%
  to 42%; the Houses' and the chamber's keep 62% to 82%.
- **A darker band behind the words.** The ended board's card takes `.nmEnded` (`openNemesisBoard`), and `nemesis.css` gives it:
  - the board's head on a darker band;
  - each section's title on a band that fades out to the right;
  - its wells a touch darker (86%);
  - the closing note on a band of its own.

  The fire and the banners show round and between them, and every word reads as before.
- Nothing else on the board changes, and the board while the War goes on is as it was.

## Checks

- `npm run typecheck`: clean.
- `npm test`: the full suite.
- `npm run web`: builds.
- The ended board looked at at 393 x 852, 360 x 780 and 412 x 915, at its top and its foot; the live board at 393 x 852.
