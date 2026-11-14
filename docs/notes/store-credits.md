# The in-app Credits page (STORE-CREDITS)

Google Play readiness (`docs/notes/store-readiness.md`) found that players could not see any credits, though several licences ask for
them: the CC-BY music (Matthew Pablo, Alexandr Zhelanov), DawnLike's CC-BY 4.0 icons, the LPC sprite's CC-BY-SA 3.0, the Himeko Sutori
sprites' attribution and the fonts' SIL Open Font Licence. Settings, About also promised a credits list that did not exist.

## What it is

- **Settings, Credits** (the row under About) opens the page. So does the **Credits** button on About's credits line, which now says
  the sources are named there. The page is a standard ornate menu (`ornateMenu`, a sheet) with "‹ Back" (or Escape) back to Settings.
- **Written for players** (`src/data/credits.ts`, `PLAYER_CREDITS`): one entry per creator or pack, grouped as Art, Characters and
  monsters, Music, Sound and Fonts. Each entry gives the work or pack, its maker and its licence. Where the licence asks for credit, the
  entry has a brass "Credit required" tag and a link to the source. The game's own art is one line ("Original art made for Legends of
  the Last Keep."), and so are its own music and sound. A pack used in many places is one entry: the Craftpix packs are two (scenery,
  and characters and monsters), each listing its packs.
- No file paths, pull requests, branches or build notes. **CREDITS.md stays the developers' record** of which file came from where,
  untouched apart from the "licence unconfirmed" marks.
- **"Licence unconfirmed"**: the batareya golems (with the treant, the wraith and the decoy), whtdragon's animals (Duchess, the wolves,
  the wild dogs, and Duchess's PixelLab frames made from hers), and the eight recorded combat sounds of PR #150. CREDITS.md marks every
  use; the page shows a dashed grey tag until the owner decides.

## Keeping the two in step

`src/creditsRules.ts` (pure) reads from CREDITS.md the third-party names it gives: packs in bold or named "Free ..." (as Craftpix's
are), each author after "by", and a work in bold with its maker in brackets. It also reads every licence the file names.
`test/store-credits.test.ts` then checks:

- every name is covered by an entry on the page (all its words in one entry), or is on the test's short list of names that are not
  third-party work in the game, each with its reason (Chronos Settlement, Pixel Champions and Tiny RPG Town, which are no longer
  shipped);
- the reader finds the names that matter, so a broken reader cannot pass;
- every licence in the file is on the page;
- each CC-BY, CC-BY-SA, GPL, OFL or "with attribution" licence is tagged "credit required", and the music, DawnLike and LPC entries have
  links;
- every use of the unconfirmed packs is marked in the file, and the page tags them;
- no entry carries a file path, file name, pull request, branch or build note.

Taking out an entry, such as Extenz or the Free Forest Bosses, fails the first check with the missing names. So a new pack or author
added to CREDITS.md fails it until it is on the page.

The links could not be opened from the machine this was made on: the network does not reach those sites. They are the source pages
named in CREDITS.md (blueberry, Craftpix's licence page, matthewpablo.com) and the well-known homes of DawnLike (OpenGameArt), the LPC
spritesheet (GitHub), Alexandr Zhelanov's OpenGameArt page and the Open Font Licence. They are worth a tap on the phone.

## Checked

- `npm run typecheck`, `npm test -- store-credits ui-standard settings`, `npm run web`.
- `node tools/store-ready/credits-shots.mjs` took the pictures in `docs/samples/store-credits/` at 393 x 852, 360 x 780 and 412 x 915:
  Settings, the page's top (Art), Characters and monsters, Music, Fonts, and About.
- At each size the card fits with no sideways scroll (26 entries), "‹ Back" returns to Settings, and there were no page errors.
