# The in-app Credits page (STORE-CREDITS)

Google Play readiness (`docs/notes/store-readiness.md`) found that the game had no credits players could see, though several licences
ask for one: the CC-BY music (Matthew Pablo, Alexandr Zhelanov), DawnLike's CC-BY 4.0 icons, the LPC sprite's CC-BY-SA 3.0 and the fonts'
SIL Open Font Licence. Settings, About also promised "the game's credits list". This page is that list.

## What it is

- **Settings, Credits** (the row under About), and a **Credits** button on About's credits line, open the page: a standard ornate menu
  (`ornateMenu`, a sheet) with "‹ Back" (or Escape) back to Settings.
- **Made from CREDITS.md itself.** `src/credits.ts` imports the file as text (`import md from '../CREDITS.md' with { type: 'text' }`,
  esbuild's import attribute), so each build carries the file as it is and the page cannot drift from it. `build.mjs` is untouched.
- **`src/creditsRules.ts`** (pure) reads the file: each `##`/`###` heading is a section, each bullet (with the bullets under it) or
  paragraph an entry, Markdown's marks taken out. It names the licences each entry mentions: CC-BY, CC-BY-SA and GPL (with their
  version), the SIL Open Font Licence, CC0, the Craftpix free licence. Each one that asks for credit is tagged "credit required" in
  brass. The page opens with a note listing those licences.
- **"Licence unconfirmed".** While the owner decides on them, CREDITS.md marks the assets with no known licence: the batareya golems and
  the treant, whtdragon's goat (Duchess) and wolves, and the eight recorded combat sounds of PR #150. The page tags them in grey italics.
  The phrase is what the rules look for, so a new doubtful entry is marked the same way.

## Test

`test/store-credits.test.ts`: the bundled text is CREDITS.md as it is; every bullet, sub-bullet and paragraph of the file (read
independently of the page's parser) is on the page word for word; every heading is a section; licences are named (the music's CC-BY
3.0 on Blackmoor Colossus, CC-BY-SA and GPL on the LPC sprite, the font licence, CC0 without "credit required"); the five unconfirmed
groups are tagged.

## Checked

`npm run typecheck`, `npm test -- store-credits ui-standard settings updates store`, `npm run web`, and
`node tools/store-ready/credits-shots.mjs`. That script took the pictures in `docs/samples/store-credits/` at 393 x 852, 360 x 780 and
412 x 915: Settings' list, the page's top, the music, the unconfirmed marks, and About. At each size the card fits the screen with no
sideways scroll (238 entries), "‹ Back" returns to Settings, and there were no page errors.
