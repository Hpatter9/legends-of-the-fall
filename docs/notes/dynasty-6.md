# Dynasties, phase 6: Heirs and the Mantle

Phase 6 of the expansion in `docs/design/legends-expansion.md` (section 9, "Phase 6: Heirs and the Mantle"), built to sections 3.0, 3.3 to
3.5, 3.7, 5.2 and 7 of the design, on top of phase 5's seasons and Houses (`docs/notes/dynasty-5.md`) and the Nemesis War's phases 1 to 4.
The owner's answers hold throughout: **retirement is never forced** outside the Oath, **the game always says "heir"**, and the Oath (phase
7) is per run.

Phase 6's list is:

- naming an heir from a Sworn pair, its training, and the two candidates;
- Passing the Mantle with the birthright, the heirloom, the Blood Grudge and the Heir's Promise;
- the elder's honour (Mentor with the kind kept, tavern regular at the Elders' table, the guest, Shade);
- fielding the elder;
- the cadets in the tavern;
- the first batch of ten heir scenes;
- the one-time note to the Hall's old mentors;
- the Houses' "With heirs" filter;
- the camp's roaming heroes in their looks, which phase 5 left out.

The Oath, the fallen, the Shades' horn call, the ghosts and Legend renown belong to phase 7. The cadets leading hero parties belong to the
Calamity Rises (phases 8 and 9).

**The promise holds: no power is lost, and no hero is lost.** Every lasting thing stays keyed by the hero's kind: XP and level, ranks,
awakening, talents, books, gear and skill use. The heir *is* the kind now, so nothing is reset and nothing is copied. A test passes the
mantle and finds every one of those fields unchanged, byte for byte.

## What it plays as

### Naming an heir (`src/sim/heirs.ts`)

- **Who can:** a Veteran or an Elder bearer (6 seasons served or more) of kind level 60 or more (`HEIRS.LEVEL`, the Hall's retiring level;
  a test holds them equal), with a kindred partner at bond level 3 (Sworn) or more. All 45 heroes are in at least one kindred pair, so
  every line can go on. The partner may be at any stage.
- **The Hall's mentors from before** may name an heir whatever their seasons. A mentor cannot serve seasons in the Hall, so its honour
  stands for them. This is the design's promise that the Hall's mentors "may now name an heir".
- **Naming starts 7 real days of training** (`HEIRS.TRAIN_MS`). The heir is a ward at the castle, shown on the bearer's card, the line's
  page and the hero sheet ("An heir with Minh trains at the castle: 4 days left").
- **Two candidates** are drawn once the training is done. The draw is on its own side stream (`HEIR_SALT`), seeded by the kind, the
  partner, the Dynasties' start and the generation, so they are the same every time they are read. They are kept on the line.
  - **A name** each, from the kind's bank of six in its first bearer's heritage (`src/sim/heirNames.ts`, 270 names). A name already borne
    in the line is passed over. Kwame's line has Kofi, Ama, Yaw, Efua, Kwesi and Abena; Ravi's has Asha.
  - **A look** each: one of six steady tints of the kind's own sheet (below).
  - **A birthright** each: the first has the **partner's** legacy perk (`PERKS` in `legacy.ts`), the second the **parent's own**.

### Passing the Mantle (`passMantle`)

The bearer's card's **Pass the Mantle** opens a card with:

- the two candidates, as `menuChoice` rows with their look, name and birthright;
- the heirloom: one of the elder's worn pieces, or none;
- the elder's honour.

A second tap confirms on the card ("Pass the Mantle to Asha? Tap again"). Then:

- **The heir takes the slot**, at generation +1. Same kind, so the same level, ranks, talents, books, gear and skills. Its season starts
  from nothing (the waves so far were the elder's).
- **The birthright**: the perk at its first band, for this bearer alone. It is the only one: a heir never has two. For example, Ama, heir
  of Kwame and Minh, has *Harvest Hands*, +3% health. It counts wherever talents do:
  - in **the armies**, through the run's snapshot (`Run.legacy`, `legacyBoost`, the mentors' own path; a mentor's perk on the same hero
    adds to it, `addSnapshots`);
  - in **the Last Stand**, through `setupFromMeta`'s boost.
- **The heirloom**: the chosen piece gains a generation mark, +3% of its main stats (`HEIRLOOM_STEP`), three marks at most (+9%,
  `HEIRLOOM_MAX`). It stays worn, now by the heir. Its card reads "Yaw's Iron Sword, an heirloom of the House of Kwame · +3% of its stats
  (1 generation)". Like a named legend, **an heirloom is never sold or combined**: the stall and the gear sheet do not offer it, the bulk
  sale skips it, and `salvageItem`, `sellPiece` and `combineItems` refuse it.
- **The Blood Grudge**: if a living nemesis slew either parent (it holds a Grudge from either kind, phase 3), the heir bears **+15%
  against it** (`BLOOD_GRUDGE` in `nemesisTraits.ts`). If more than one did, it is the one with the most Grudge steps, the oldest on a tie.
  - It reaches the fight through the run's frozen snapshot of the nemesis (`NemSnap.blood`, set in `decorate`).
  - The Nemesis board marks the pair on the nemesis's card ("Blood Grudge · Yaw, heir of Kwame and Minh: +15% against it").
- **The Heir's Promise**: +25% XP for the heir's first season, 14 days (`promiseXp`, in the page's XP chain beside Elder's Counsel). It
  is XP only, so a favourite at the level cap gains nothing from it.
- **The cadet line**: the passed-over candidate joins the tree, in grey, beside the heir.
- **The farewell and the arrival**: a short card. The elder hands over the heirloom (or the House), with its honour's place behind the
  words: the Hall, the long table, or the horn. Then what passes, in one list.

### The elder's honour (`changeHonour`)

| Honour | Where | What |
|---|---|---|
| **Mentor** | a Hall of Legends seat (the Hall's own rules: one a calling, the seats by the Hall's level, the recall's week) | catch-up XP and the legacy perk to the calling. **New: the kind stays in the party through the heir** (`Meta.mentors[c].heir`, so `retired()` is false). The gear stays the heir's |
| **Tavern regular** | the Elders' table | a story a day (a Codex page and 50 crowns), and a free ride as the guest once a day while its heir is not in the party |
| **Shade** | the War Horn's card, beside the Eidolons | open at kind level 100. **Its horn call comes with the Legend Oath (phase 7)**: today it is the honour and its words only |

- An honour can be changed again after **7 days** (`HEIRS.HONOUR_MS`), as recall works. Leaving the Hall *is* a recall: the perk stops and
  the seat stays empty for seven days.
- A mentor with an heir recalled from the Hall's own page loses its honour (the Dynasties see the seat empty), and may choose another at
  once.
- The Hall's mentors from before keep their seats when they pass the mantle as Mentor. Their kind **comes back to the party** if there is
  room, with the mentor still seated.

### Fielding the elder (`bannerChoices`, `fieldBearer`)

- Each line with an honoured elder has a **banner** on the party picker's card ("⚑ Yaw"). A tap opens a card to choose who takes the
  field: the heir (the default) or an elder. The company roll and the cards show the fielded bearer's name.
- **An elder fielded** fights at the kind's full power, with its own birthright (or none), and in its own looks.
  - Its honour **lapses for the run**: a mentor's perk is left out of the run's snapshot (`lapsedLegacy`), but no cooldown starts.
  - The Heir's Promise and a Blood Grudge are the heir's, so they do not ride with the elder.
- **The twin rule holds as it always has**: the line is the kind, so only one of its bearers can be on the field.
- A season's waves are the bearer's who fought them (`Dynasty.served[kind].at`). Changing the banner mid-season starts the count again
  for the one now fielded.

### The Elders' table (`openEldersTable`) and the cadets

- The tavern's button column gains **Elders' table** while anyone sits there or a cadet line exists. The design's tap on a table in the
  scene is left out (below).
- **Six seats**: with more regulars, they take turns, one a day (`seatedToday`).
- **Today's story**: once a day, one regular tells a page of the Codex (a foe the player has met, by the day; its own story before any
  are met) for **50 crowns**.
- **A ride as the guest**: once a day, free, a regular may ride with the next march (an army or the daily) as the guest sixth hero
  (`guest.ts`), while its line's heir is not in the party. Asked at the table, it joins as that run begins (`takeRide` in `startRun`). A
  ride asked on another day lapses. As any owned guest, it brings the kind's own level, ranks, talents and gear, and earns nothing lasting.
- **A cadet visits** now and then (`cadetVisiting`; some days nobody does): "Kwesi, passed over for Yaw, of the House of Kwame. Stops for a
  drink, and asks after the family."

### The heir scenes (`src/sim/heirScenes.ts`)

- When a pair names an heir, its scene plays the next time the player is at the camp (`Dynasty.scenes`, played beside the Vengeance
  scenes).
- **Batch 1 is ten pairs**: the eight duo-combo pairs, then Knight and Paladin, and Archer and Ranger. Each is in the bond scenes' shape
  and voices.
- The pair's own writing decides what the heir is: Kwame and Minh's daughter (who has already taken Margaret off the rack), Kenji and
  Ayame's ward, the archer's and the storm mage's apprentice, the two bots' successor unit. The word is always **heir**.
- The other thirty follow in batches of ten for the owner to read. A pair without one yet names its heir with no scene.
- The lines are in `docs/lines/new-lines.json` with the other scenes, as the test there asks.

### The Houses (`src/housesView.ts`)

All of it is built with the standard ornate menu. Full pages say "‹ Back" and cards say "Close". Nothing glows or pulses.

- **The filter**: All · With heirs · Veterans · Elders. "With heirs" is a line with an heir named, or a second generation. The design's
  "The fallen" comes with phase 7.
- **A line with a trained heir** wears a steady gold frame on the picker ("Heir ready").
- **A line's page** grows downwards, one generation after another:
  - between the generations, the **partner** who shared the heir sits on a gold thread (a tap goes to that House);
  - each bearer shows its fate's line, its birthright and an **heirloom chip**;
  - the **cadet** hangs to the side in grey;
  - an heir in training or ready has its own row;
  - a line deeper than six generations folds its oldest into **The founders (n)**, in a well.
- **A bearer's card** adds:
  - **Born with**: the birthright, the heirloom, the Blood Grudge and the Promise;
  - its honours;
  - **The line**: for the current bearer, Name an heir (with what stands in the way), the training, or Pass the Mantle; for an elder,
    Change honour (its cooldown in `.omLock`) and Field this bearer.
- **The hero sheet's House row** adds the heir's line, with the elder fielded in its place if one is, and the birthright. Its button
  ("Name an heir", "The heir" or "Pass the Mantle") opens the bearer's card.
- **The one-time note**: a save whose Hall had mentors before the heirs is told once, "The Hall's mentors may now name an heir…"
  (`takeHeirNote`).

### The looks (`HEIR_LOOKS` and `lookMatrix` in `src/sim/heroLooks.ts`)

- **An heir's look is a steady tint of its kind's existing sheet**: ember, moss, dusk, tide, gilt or ash. Each is a weight on the three
  colour channels and a little more or less colour. **No new art.**
- The age grade (phase 5's) and the tint are one 4x5 colour matrix (`lookMatrix`), laid on everywhere a bearer is drawn:
  - **the battle sprite** (`ageFilter`, a Pixi `ColorMatrixFilter` at the screen's resolution, so the pixels stay sharp);
  - **the camp's roaming heroes**: the matrix laid on the shrunk figure's pixels once, as it is cut (`gradeSmall`), never in a frame. A
    new look re-cuts it. **These are the roaming heroes tinted by age that phase 5 left out**;
  - **the Houses' portraits**: the same matrix as an SVG `feColorMatrix` filter, made once a look.
- The age grade is unchanged from phase 5 (a test holds its numbers), so a Veteran and an Elder look exactly as they did.

## Save data and migration

```ts
interface Dynasty { …phase 5…; regulars?: string[]; story?: number; guest?: { kind: string; day: number }; guestDay?: number; heirNote?: 1; scenes?: string[] }
interface Line { bearers: Bearer[]; current: number; heir?: { doneAt: number; partner: string; picks?: HeirPick[] }; field?: number }
interface Bearer { …phase 5…; parents?: [string, string]; partner?: string; look?: string; birthright?: string; heirloom?: number; grudge?: number; cadet?: true; promise?: number; honourAt?: number }
interface HeirPick { name: string; look: string; birthright: string }
// Equipment.heirloom?: { marks: 1..3; house: string; bearer: string }     Meta.mentors[c].heir?: true
```

- **Every new field is optional.** A phase 5 save reads exactly as it did (a test holds it), and a save with none plays on unchanged.
- **The readers** drop what they do not know:
  - an unknown look, perk or kind;
  - an heir named with itself;
  - a cadet holding the slot;
  - a `field` that is not an honoured elder before the current bearer;
  - an unknown regular or guest.
  An heirloom's marks are clamped to 1 to 3. The phase 5 caps still hold (40 bearers, 8 memory lines).
- `HEIR_SALT` is the design's own name for the candidates' stream. Nothing else in phase 6 draws at all.

## Determinism and old fights

- **A fight with no heir plays out exactly as before**: a birthright, a Blood Grudge or an elder fielded are the only ways phase 6 reaches
  a fight, and a save without one has none of them. `battle.ts`, `run.ts`, `armies.ts`, `ailments.ts` and `blow.ts` read neither the
  heirs nor the Dynasties (a test checks).
- The birthright rides on the run's own snapshot (`Run.legacy`), fixed as the run starts, so a run replays. The Blood Grudge rides on the
  nemesis's frozen snapshot (`Run.nemesis`). The Last Stand reads the birthright as it reads the talents, from the save.
- `heirs.ts`, `heirNames.ts` and `heirScenes.ts` use no clock, DOM or `Math.random`: the page passes `now` and the day key.
- The identity and regression fixtures hold (`nemesis-regression`, `stand-regression`, `spells-identity`, `ailments-identical`), in the
  full suite below.

## The numbers

See "Checks" for the commands. The balance bar is no army's mean tries rising by more than 1.

- **The fights.** `npm run balance -- --no-tables --deep --levels 30,60 --attempts 6 --only orcs,undead,beasts --talents` gives phase 5's
  table digit for digit. On Legendary at level 30: Orc Warband 1.7, Undead Legion 2.0, Beast Packs 5.3. Everything on Elite is 1.0.
- **The birthright** (the new `--birthright` flag: every hero of the party an heir with its own House's perk at its first band, the
  strongest a party can be by birthrights): BIRTHRIGHT_TABLE
- **The heirloom** (the new `--heirloom` flag of `npm run gear-balance -- --kits-only`: every hero's first piece an heirloom at its cap,
  +9%): HEIRLOOM_TABLE
- **The Heir's Promise against the level pace** (`npm run level-pace -- --seeds 10`, and the new `--promise 91`: the mantle passes on day
  91, the earliest a favourite can, a Veteran on day 84 with 7 days of training): PACE_TABLE

## Art: placeholders and the images to make

Phase 6 uses existing art only, bundled into game.js, so the service worker's list does not change.

- The item icons stand in:
  - the holy chalice for the tavern regular (`FATE_ICON.regular`);
  - the shadow cloak for the Shade;
  - the gold band for the heirloom chip.
- The heirs' looks are tints of the existing sprites: no re-toned sheets and no painted heir portraits. The hero sheet's large art shows
  the kind's painting, as the design allows until painted heirs are made.

The images that would replace them, as ChatGPT prompts:

1. **Fate icons** (the design's row 12; phase 5's note has the full sheet of five). The two phase 6 uses, alone: "Two 24x24 pixel-art icons
   on a transparent background for a dark fantasy game, 1 px dark outline, muted gold and parchment palette, no text: (1) tavern regular,
   a pewter tankard with a clay pipe resting against it; (2) Shade, a pale spectral hood with a faint blue glow inside."
2. **The heirloom frame for gear cards** (row 13): "A square ornate frame for an item icon in a dark fantasy pixel-art game, 64x64 pixels,
   transparent centre, aged gold filigree with a small family crest at the top and three empty notches along the bottom for generation
   marks, 1 px dark outline, no text."
3. **The heirloom chip icon**: "A 16x16 pixel-art icon on a transparent background for a dark fantasy game: a small gold signet ring with
   a red stone, 1 px dark outline, muted palette, no text."
4. **The Elders' table, for a scene fixture** (the design counts it as no new art: the tavern's own table and chairs). If the owner wants
   it in the tavern's picture: "A side-view pixel-art long oak table for a dark fantasy tavern scene, 160x56 pixels, transparent
   background, six empty high-backed chairs behind it, three candles and a clay pipe on the table top, warm lamplight palette, crisp 1 px
   outline, matching a 16-bit tavern interior, no people, no text."

Each would be credited in `CREDITS.md` when it is made.

## Questions for the owner

1. **The Elders' table in the tavern's picture.** It is a button in the tavern's column for now. The Hearth Hall's floor is full (every
   hero has a spot there), and a table drawn with six elders would show each regular's kind twice: the heir at its own spot, and the
   elder at the table. Should the table be drawn in, with the elders at it in their grey, and where?
2. **The heir's name everywhere.** The heir's name shows in the Houses, the hero sheet's House row, the party picker and the Elders'
   table. The battle, the quips, the War's memory and the scenes still say the kind's first name ("Kwame"), as they are written. Should
   the heir's name reach those too? The written lines would then need a pass.
3. **The Shade.** It can be chosen at kind level 100, but its horn call is phase 7's. Should it be greyed ("comes with the Oath") until
   then?
4. **The heirs' looks.** The six tints recolour the whole sprite, skin included, gently. The design's re-tone tool could instead give
   people heirs the other parent's skin tone (two new sheets a human hero, as phase 5's note said for grey hair alone).

## Tools

- **The screenshots:** `node tools/dynasty/shots6.mjs [scene ...]` (after `npm run web`) writes `docs/samples/dynasty-6/` at 393x852,
  360x780 and 412x915. Its saves are in `tools/dynasty/saves6.ts`. The script fails if any page scrolls sideways. The scenes are:
  - the camp, the heir among the roaming heroes in her tint;
  - the Houses' "With heirs";
  - Kwame's House (two shots);
  - the heir's card, and the elder's card;
  - the honour card;
  - naming an heir;
  - the Mantle, its foot, and its confirm;
  - the farewell;
  - the Elders' table;
  - the party picker and its banner;
  - the hero sheet (an heir, and an heir ready);
  - a deploy with the heir, and with the elder fielded in her place.
- **`npm run balance -- … --birthright`**, **`npm run gear-balance -- --heirloom`** and **`npm run level-pace -- --promise <day>`** are
  new flags (above).

## Checks

- `npm run typecheck`: clean. `npm run web`: built.
- **The full `npm test`:** FULL_TESTS
  - `test/heirs.test.ts` (14 new tests) covers:
    - naming (the stage, the level and the Sworn partner) and the 7 days of training;
    - the candidates (their stream, their names, one birthright each);
    - no lasting progress changing on passing (XP, shards, stars, ranks, talents, books, skill use, worn gear, awakening, the party);
    - one birthright, and its snapshot;
    - the heirloom's cap at three marks (+9%), never sold or combined, read back;
    - the twin rule with the elder fielded, and a mentor's lapse with no cooldown;
    - the old mentors' migration, its one-time note, and the kind back in the party;
    - the honours and their week;
    - the Blood Grudge to the fight's snapshot;
    - the Heir's Promise;
    - the Elders' table, its story and its ride;
    - the reader's round trip and caps, with a phase 5 save as it was;
    - the names, the scenes and the looks;
    - no fight file reading the heirs.
  - `test/ui-standard.test.ts` gains a test that the heirs' six cards are standard menus that say Close.
- **The screenshots:** `docs/samples/dynasty-6/`, SHOT_COUNT shots at 393x852, 360x780 and 412x915, with no page scrolling sideways.
- **The balance:** above.
