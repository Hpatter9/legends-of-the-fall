# Hero power on the roster

The owner asked to see each hero's power on the Heroes tab without opening the hero. Each roster card (`drawRoster` in
`src/menuHeroes.ts`) now shows "Power 3,258" under its stars: the dossier's own number (`kindPower`, `powerText` in
`src/sim/power.ts`: level, rank, equipment and talents), styled in `src/keepKingdom.css` (`.heroCardPower`). Checked at
393x852, 360x780 and 412x915 (`tools/heritage/shots.mjs`, which shoots the roster).
