# Dynasties, phase 5: Seasons and the Houses

Phase 5 of the expansion in `docs/design/legends-expansion.md` (section 9, "Phase 5: Seasons and the Houses"), built to sections 3.0 to
3.2, 3.7, 5.2 and 7 of the design, on top of the Nemesis War's phases 1 to 4 (`docs/notes/nemesis-1.md` to `nemesis-4.md`). It is the start
of Dynasties. Phase 5's list is the season clock and its icon, bearers and their ages, the life stages, Elder's Counsel, the family tree
with generation I, and the veteran's and elder's looks.

Heirs, the Mantle, the honours and fielding the elder belong to phase 6. The Oath, the Shades and the fallen belong to phase 7. The
Seasons' War flavour (Winter's Feasts, Spring's Recruits) belongs to phase 10. None of them is here.

The promise holds throughout: **ageing is an honour, never a loss.** Every lasting thing stays keyed by the hero's kind: XP and level,
ranks, awakening, talents, books, gear and skill use. A stage changes words and looks, and never a fight.

## What it plays as

### The seasons (`src/sim/dynasty.ts`)

- **A season is 14 real days** (`DYNASTY.SEASON_DAYS`), counted from the day the Dynasties open for the save (`Dynasty.start`). They turn
  Spring, Summer, Autumn and Winter, and four make a **Year of the War** (56 days). The page passes in the day key, and the sim reads no
  clock.
- **The Dynasties open** the first time the camp opens on a save that has heroes (`openDynasty`, from `Home.open`). Each later visit
  gives a line to every kind that has joined since. It also settles any season that has ended, which is safe to repeat.
- **A season's turn is told once**, as a toast ("Summer has come: Year 1 of the War", `takeSeasonNews`). Each stage reached at the turn
  is told with it.

### Bearers and ageing

- **The bearer** is the person in a kind's slot. The first is the hero as written (`HERO_NAMES`: Kwame is Kwame), at generation I. A
  bearer holds a name, a generation, its seasons served, a fate, and up to 8 memory lines. A Hall of Legends mentor is bearer I with the
  fate `mentor`, kept in step with `Meta.mentors`: a recalled mentor's fate is cleared.
- **A bearer ages only by serving.** A season counts for a bearer if it fought **20 waves or more** in it (`DYNASTY.SEASON_WAVES`).
  - The waves are counted where the waves fought already are: each hero placed on the board in a settled wave, with an auto-replayed wave
    counting half (`noteServed`, called in `main.ts` beside `settleWear`). A run that levels its own heroes counts nothing, as with wear.
  - Each season's count is its own (`Dynasty.served`: the season's index and its waves). It is settled lazily when the next season is
    read: 20 or more is a season served, and fewer simply passes.
  - **The bench never ages**, so collecting forty-five heroes never means watching forty-five clocks.
- **The stages**, by seasons served:

  | Stage | Seasons served | What it means |
  |---|---|---|
  | Youth | 0 to 1 | — |
  | Prime | 2 to 5 | — |
  | Veteran | 6 to 9 | the touch of the years: a streak of grey, or a dulled shell |
  | Elder | 10 or more | grey with honour; **Elder's Counsel** |

- **The pace.** A favourite played every day is a Veteran on day 84 and an Elder on day 140. That is the design's pace exactly, and a
  test holds it.
- **Story age.** A season served is a year (`BASE_AGE` in `src/sim/dynastyWords.ts`), so Kwame is 26 at the start and 36 as he
  reaches Elder.
  - The **ageless** kinds tell their seasons in their own words (`AGELESS`): the Kitsune "300 years a fox", the bots by "service year",
    the Reaper by "the long watch", the Mummy by "since the waking", the Kraken by "tides on land".
  - The beasts and the tengu have their own greying words (`BEAST_LOOK`: "grey in Vuk's muzzle", "Kazan's beard is white as mountain
    snow").
- **Memory.** Each stage reached adds a line to the bearer's memory ("Became a Veteran · Year 2, Autumn").

### Elder's Counsel (`counselXp`)

While an Elder is fielded (placed on the board in the fight), every other hero's lasting XP from that fight is **+5%**. That includes the
bench's share. The Elder does not take its own Counsel, but it does take another Elder's. It never stacks: one Elder or five give the same
+5%.

Counsel is applied in `main.ts` before the apprentices' catch-up (`mentoredXp`). It is XP only, and the fight never reads it.

### The looks (`AGE_LOOKS` in `src/sim/heroLooks.ts`, `ageFilter` in `src/render/unitView.ts`)

- A Veteran's and an Elder's battle sprite wear a **steady colour grade of the existing sheet**: part of the saturation taken out towards
  silver, the darks lifted a little (so dark hair reads as grey), and a touch of cool. **No new art.**
- The people grey more than the beasts, spirits and machines (`NOT_HUMAN` take `AGE_LOOKS_NOT_HUMAN`).
- The page tells the sprites each kind's stage (`setAgeLooks`). The grade is drawn at the screen's own resolution, so the pixel art stays
  as sharp as a plain sheet (`docs/samples/dynasty-5/looks-*.png`: Youths on the left, the same squad aged on the right).
- It is only on the player's own heroes, never on a summon, and it never moves. The Houses' portraits wear the same grade in CSS.
- The camp's roaming heroes on the cliff keep their plain looks for now.

### The Houses (`src/housesView.ts`, `src/houses.css`)

All of it is built with the standard ornate menu. Full pages say "‹ Back", cards say "Close", and nothing glows or pulses.

- **The season's chip** on the camp's top bar, beside the stones: the season's icon alone, so the bar still fits on one row at 360 px.
  It is redrawn only when the season changes, so its picture never blinks.
- **The Seasons' card** (tap the chip) shows:
  - the season, its Year of the War and its days left, with a line of what the season is like;
  - **At the turn of the season**: the heroes who have already fought their 20 waves, and what they will reach ("Natsu, 5 seasons
    served: Veteran at the turn");
  - **On the road**: the party's other heroes and their waves so far ("Kenji, 12.5 of 20 waves");
  - the promise, in one line: ageing takes nothing away;
  - **The Houses** as the gilded button.
- **The Houses** (full page): the eyebrow "Dynasties" and the sub "Year 1 of the War · Summer".
  - A filter: All · Veterans · Elders. The design's "With heirs" and "The fallen" come with phases 6 and 7.
  - **The line picker**, four across: every owned kind's current bearer, as its portrait in its stage's grade with the generation (I) on
    the corner, its name and stage, and a mentor's scroll.
- **A House's page** (full page, "The House of Kwame") shows:
  - its generations top to bottom: phase 5 has only generation I, and later phases grow the page downwards;
  - each bearer as a full-width row: a 64 px portrait, name, stage and age ("Elder · 37"), seasons served, and the Counsel line;
  - **Kindred Houses**: the gold threads to the lines it has a kindred bond with, with the bond's name. A tap goes to that House; a kind
    not yet met is greyed;
  - **The years**: the four stages, its own lit, and this season's waves.
- **A bearer's card** shows its face in its look with the look's words ("The years show: hair gone grey with honour"), the seasons served
  and to go, this season's waves, its honours (Elder's Counsel, Mentor) and its memory.
- **The hero sheet's House row**, on the Overview under the legacy block, reads "Kwame's line · Gen I · 1 bearer", then the stage, age,
  seasons served, this season's waves and the look. **Open the House ›** goes to its page.

## Save data and migration (`Meta.dynasty`, `readDynasty`)

```ts
interface Dynasty { v: 1; start: number; lines: Record<string, Line>; served?: Record<string, { season: number; waves: number }>; told?: number }
interface Line { bearers: Bearer[]; current: number }
interface Bearer { name: string; gen: number; served: number; fate?: 'mentor' | 'regular' | 'shade' | 'fallen'; memory?: string[] }
```

- **Optional, with its own reader** in `loadMeta`. A save from before has none, and it plays on unchanged until the camp opens the
  Dynasties.
- **Lazy seeding.** Each owned kind gets a line with one bearer, its `HERO_NAMES` hero. Seasons count from that day, so **nobody is made
  old by an update**.
- **Credit for long-time favourites:** `served = min(5, floor(wavesFought / 250))`. A favourite of many months is in its Prime and
  reaches Veteran in about one season of play. It is never instantly a Veteran, and the update tells no ageing.
- **The reader:**
  - It drops unknown kinds, nameless bearers and unknown fates.
  - It clamps generations (1 to 99), seasons (0 to 999) and the current bearer.
  - It cuts the bearers to 40 and the memory to 8.
  - It drops a season's count for a kind with no line, and a start that is not a real day key.
- The design's later fields (`heir`, `mourning`, `birthright`, `heirloom`, `grudge`, `parents`, `look`, `legend`, `cadet`, `regulars`,
  `slainBy`) are left for the phases that use them.
- The design's one-time note that "the Hall's mentors may now name an heir" is left to phase 6, as naming an heir does not exist yet.

## Determinism and old fights

- The Dynasties never reach a fight. `battle.ts`, `run.ts`, `armies.ts`, `ailments.ts` and `blow.ts` do not read them (a test checks
  this), and nothing in the fight or its streams changes.
- `dynasty.ts` uses no randomness at all, so it needs no side stream (`HEIR_SALT` waits for phase 6's candidates). It uses no clock, DOM
  or `Math.random` either: the page passes the day.
- The identity and regression fixtures hold (`test/nemesis-regression.test.ts`, `stand-regression.test.ts`, `spells-identity`,
  `ailments-identical`), in the full suite below.

## Art: placeholders and the images to make

Phase 5 uses existing art only, bundled into game.js, so the service worker's list does not change.

- The item icons stand in for the four season icons (`SEASON_ICON`): the moss bell for Spring, the sun crown for Summer, the copper torc
  for Autumn and the rime pearl for Winter.
- The scholar's scroll stands in for the mentor's fate icon (`FATE_ICON`), and the founders' ledger for the House (`HOUSE_ICON`).
- The looks are tints of the existing sprites: no re-toned sheets.

The images that would replace them, as ChatGPT prompts (the design's rows 10 to 13):

1. **Season icons, four, 24 and 48 px** (row 10). "A sheet of four square pixel-art icons on a transparent background for a dark fantasy
   strategy game, each 48x48 pixels, crisp pixel art, 1 px dark outline, a brass ring round each, muted gothic palette, no text: (1) Spring,
   a budding hawthorn sprig with two pale blossoms; (2) Summer, a golden sun over a ripe wheat ear; (3) Autumn, a russet oak leaf with an
   acorn; (4) Winter, a frosted holly sprig under a snowflake."
2. **The Houses backdrop, upright 2:3** (row 11; the page is an ornate sheet today and has no backdrop of its own). "An upright 2:3 painting
   for a dark fantasy pixel-art game's menu backdrop: a great woven tapestry of a family tree hung in a stone hall, gold thread branches
   spreading from one root to many small empty shield-shaped frames, candles in iron sconces either side, warm amber light, darkened at the
   edges so text reads over it, painterly pixel art, no people, no text."
3. **Fate icons, five, 24 px** (row 12). "A sheet of five 24x24 pixel-art icons on a transparent background for a dark fantasy game, 1 px
   dark outline, muted gold and parchment palette, no text: (1) mentor, an open book with a quill; (2) tavern regular, a pewter tankard with
   a pipe beside it; (3) Shade, a pale spectral hood with a faint blue glow; (4) fallen, a single lit candle on a stone; (5) Legend, a small
   gold laurel wreath."
4. **The heirloom frame for gear cards** (row 13; it is for phase 6): "A square ornate frame for an item icon in a dark fantasy pixel-art
   game, 64x64 pixels, transparent centre, aged gold filigree with a small family crest at the top and three empty notches along the bottom
   for generation marks, 1 px dark outline, no text."

Each would be credited in `CREDITS.md` when it is made. The backdrop, if it is loaded by URL, goes into the service worker's `FILES` in
`build.mjs`.

**For the owner, on the looks:** the design names the re-tone tool (`tools/heritage/recolour.py`) for the elder tones. Phase 5 uses
runtime tints instead, as the brief asked: no new sheets, and every hero has its look at once. If the owner would rather have grey hair
alone, with the skin and the armour untouched, that is the re-tone tool's hair rows. It would need two new sheets for each human hero,
about 60 in all.

## Tools

- **The screenshots:** `node tools/dynasty/shots5.mjs [scene ...]` (after `npm run web`) writes `docs/samples/dynasty-5/` at 393x852,
  360x780 and 412x915. Its saves are in `tools/dynasty/saves5.ts`. The scenes are:
  - the camp's top bar with the chip;
  - the Seasons' card;
  - the Houses, and its foot and the Elders filter;
  - Kwame's House, and its foot;
  - Kwame's card;
  - the hero sheet's House row;
  - a deploy with the Elder and the Veteran on the board.

  The script also fails if any page scrolls sideways. `python3 tools/dynasty/looks.py <w>` crops the deploy beside the same squad as
  Youths (`looks-<w>.png`).
- **`npm run level-pace -- --counsel 140`** (new flag): the pace of a hero who marches beside an Elder from day 140 (below).

## Checks

The results are filled in below as they run.
