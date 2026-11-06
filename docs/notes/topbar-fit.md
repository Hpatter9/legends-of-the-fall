## The camp's top bar on one line (TOPBAR-FIT)

The owner's phone showed the settings gear wrapped onto a second line under the crowns, below the trophy. That happens once the War Horn and the season chip join the
crowns and stones on the top row. Now the top row is always one line, at 360, 393 and 412 wide, even with 5-digit crowns and 2- or 3-digit stones:

- The trophy and the gear are 44 px rounds side by side (`#hmTop #hmTrophy, #hmTop #hmGear` in `src/index.html`; their icons 28 px). The gaps are 4 px, and the money chips are no wider than their numbers
  (smaller type at 380 px and below).
- The season chip moved to the second row, before "Armies n/9 · ★ n" (`home.ts` puts it in `#hmBest`; `.hbText` holds the line). It is 26 px tall, shows its icon and the
  season's name, and an invisible margin makes its tap 44 px tall (`src/houses.css`).
- Counts from 100,000 up are shown short, "999k" or "1.2M" (`chipNumber` in `src/topbarRules.ts`). The chip's title and spoken label keep the full number.

Test: `test/topbar-fit.test.ts`.
