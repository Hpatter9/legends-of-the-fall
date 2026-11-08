# Twenty heroes: audit of `feat/twenty-heroes-vampire`

The owner built a branch in another tool, `feat/twenty-heroes-vampire` (commits `c6f7560` and `b2316dd`, no PR). It adds 20 heroes
(five of a new Vampire origin, fifteen across the twelve old origins), a 3-skill engine, Vampire traits and a ninth Last Oath, the
Crimson Court. Its own note is `docs/notes/twenty-heroes.md` on that branch. This note is the audit asked for before anything is
brought onto main: what clashes with main, what is worth keeping, and what the art really is. The contact sheet is
[twenty-heroes-audit.png](../samples/twenty-heroes-audit.png); the prompts for the missing art are in
[twenty-heroes-art-prompts.md](twenty-heroes-art-prompts.md).

## Where the branch stands

- It was cut from `7c651cf` (0.262.0). Main is now 0.345.0: 50 squashed merges later, among them every hero's third skill (0.306.0),
  skills with cooldowns and ranks (0.304.0), three skill buttons in battle (0.311.0), skills that grow with use (0.313.0), three skill
  book slots (0.315.0), D&D scores (0.316.0 onwards), the great rebalance (0.328.0), seven gear slots (0.338.0) and the ultimate
  showcases (0.335.0 to 0.345.0).
- 425 files, about 20k lines added and 11k deleted. **Almost all the "deleted" lines are reformatting**: `sheets.json`,
  `awakened/manifest.json` and `spell-parts.json` were rewritten from one-space to two-space indents. Parsed, every one of them only
  adds keys (40 sheets, 20 forms and 40 layouts, one spell session); nothing is removed or changed. The same holds for
  `catalogue.json` (40 rows added, but see atlas 8 below).
- **It also rewrites 212 existing image files**, none of them for the new heroes:
  - all 45 old portrait cutouts are upscaled 2x (320x480 to 640x960, 240x480 to 480x960); nothing new is painted;
  - 104 awakened battle sheets, 31 awakened icons and 23 recoloured battle sheets are re-encoded (mean pixel change under 0.5 of 255;
    the awakened Druid and Time Witch icons change a little more, 2.6 and 1.0);
  - `fx/abilities/atlas-8.png` (main's 256 px Starfall cell) becomes a 768 px atlas of 16 cells;
  - 13 `docs/samples/heritage-*.png` are re-rendered.

  Main has since changed 23 of these files itself (the recoloured `hero_res_*_<tone>.png` sheets). **None of the 212 should come over.**

## Code: what main has since done differently

| Area | The branch | Main now | Keep from the branch |
| --- | --- | --- | --- |
| Third skill | `s3?` on `HeroKit`, `SKILL3_LEVEL` 20, `SKILL3_PACE_MANA` 2.0 / `_STAM` 1.35, cast order `[3, 2, 1]`, `at3`/`idle3` | `s3` and `slots[2]` from `kits/table.ts` (`THIRD`, `TUNE3`, `THIRD_KINDS`), casts in `kits/third.ts`, `RES.SKILL3_PACE` 1.1, jab hold rule (`holdsFor`), guards with `emergency`, skill books choose the slots (`books.ts`), cooldowns, ranks; `test/skill3.test.ts` | **Nothing of the engine.** Main's is the owner-approved design (`skills-overhaul-design.md`, `skills-4.md`). Only the 20 heroes' casts are kept, re-expressed as main's rows. |
| Fight HUD | three chips (`.fhChips.three`), four dossier tabs | three skill buttons already (0.311.0), tabs fill by count | Nothing. |
| The 20 kits | `kits/twentyNew.ts` (80 casts: the old charge skill, s1, s2, s3 and the ult per hero), rows in `kits/table.ts` in the 0.262 format (no cooldown, class or cost) | rows carry pool, cost, cooldown, cast time, class and words; ults in `ultimates.ts` | The cast functions (they are deterministic, built on the toolkit) and the words, rewritten into main's `HERO_TABLE`, `THIRD` and `ultimates.ts`; their `tune` numbers set by main's tuner, not copied. |
| Tier skills | 100 lines added to `tierSkills.ts` | **the file is gone** (0.304.0: ranks give stats) | Nothing. |
| Units | 20 `UnitDef`s, `ALL_HEROES` 65 | 45 heroes; every hero also needs a D&D row in `stats.ts`, a book, gear looks, a face, a codex story, tavern spot, etc. (about 70 test files read `ALL_HEROES`) | The defs (hp, atk, range, jump, `flies`, `shot`) as a starting point; stats rebuilt from D&D rows like the other 45. |
| Traits | every trait gets a 4 and a 5 tier; `leech` and `vampireSwarm` effects; Vampire origin (6/12/18% leech); every trait ends with exactly five heroes | tiers retuned in the great rebalance (2 and 4 on some traits); 45 heroes, two to four a trait | The `vampire` origin, the `leech` trait effect, the `HERO_TRAITS` rows. **The new 5 tiers on every trait are a balance change that needs the owner's word**, and must be retuned against main's numbers, not copied. |
| Vampire swarm | a block in `hurt()` (blink to the safest tile, mend 15%, once a fight) | `hurt()` has grown (saving throws, armour) | Yes, as its own rule with a test; uses no stream. |
| Crimson Court | ninth combo `bloodCourt` | eight combos; `combos.test.ts` asserts 5 to 8 | Yes if the owner approves a ninth Oath; the test's bound then moves to 9 as an owner-approved requirement change, not a loosening. |
| Awaken | 5 extra abilities (`AWAKEN_EXTRA_ABILITIES`) so 65 heroes have distinct ones | `equipBases.ts` reworked (seven gear slots) | The five abilities' ideas, fitted to main's gear. |
| Talents, quips, lore, names, revive faces, starter classes, daily plurals, relic leech | additive rows | unchanged in shape | Yes, after the names are settled (below). |
| Render tables (`signatures`, `movePaints`, `fxRules`, `kitLooks`, `resonanceArt`, `individualReleases`, `skillFx`) | additive rows for the 20, plus reformatting | grown since | Only the 20 heroes' rows, re-keyed to main's skill names. |

### Tests the branch changes

No test is deleted, but eight are rewritten to fit the branch, and two of those would hide a rule:

- `combos.test.ts`: 5 to 8 combos becomes 5 to 9 (needs the owner's approval of the ninth Oath).
- `traits.test.ts`: "two to four heroes a trait" becomes "exactly five, and a 5 tier" (needs the owner's approval of the 5 tiers).
- `individual-ability-fx.test.ts`: the rule that atlas 8 is a single 256 px cell is replaced by "every atlas is 768"; this exists only
  because the branch overwrote atlas 8. On main the new icons go into new atlases and the test keeps its rule.
- `hero-kits.test.ts` (17/28 mana/stamina to 25/40), `awakened-forms.test.ts` (49 to 69 forms), `spell-fx.test.ts` (sheet and row
  counts), `tavern.test.ts` (15 a room to 21/22/22), `hero-kits-looks.test.ts` and `skill-keys.test.ts` (read `s3`): counts that
  follow the roster, updated in step when the heroes land. Main's own versions of these tests have moved on, so they are redone on
  main's text, not taken from the branch.
- `test/twenty-heroes.test.ts` (new, 161 lines): kept in spirit, rewritten against main's engine.

### The words disagree with each other

The branch's own files give different names, sexes and origins for the same heroes, so a canon is needed before any art is painted:

- The note's roster table matches neither the code's traits (e.g. War Drummer is Wild/Support in the note, Samurai/Support in
  `traits.ts`; Dhampir Trickster vs Gunner; Seraph Royal/Blade vs Holy/Guardian; 14 of the 20 differ). `traits.ts` is consistent
  (every trait five heroes), so it is the one to keep.
- Names: `heroNames.ts` (Vladislav, Carmilla, Sorin, Gavril, Klara, Raiden, Isolde, Tenzin, Kavi, Aisling, Nenet, Zahara, Corvus,
  Soren, Cyra, Soraya, Gabriela, Tariq, Siku, Nakoa), `codexLore.ts` (Vladislaus, Lady Genevieve for the Banneret, "Sorin" for the
  Dhampir) and the note (Morbius, Malakor, Alistair, Kaelen, Sir Valerius ...) all differ. The note's **"Morbius" is a Marvel
  character's name** and must not ship.
- Sexes: the lore calls the Nightstalker, Geomancer and Bombardier "she" and the Astrologer, Inquisitor and Astral Sphinx "he";
  `heroNames.ts` names are Sorin, Soren (male names) and Cyra, Soraya, Nenet (female names). The Dhampir's unit name is "Dusk
  Inquisitor", next to a separate Inquisitor.
- `heroLooks.ts` puts the Geomancer, Bombardier, Seraph and Sea Reaver in `NOT_HUMAN`, though `heroNames.ts` gives them a human
  heritage.

**Proposed canon** (used in the prompts, to be confirmed): `heroNames.ts` for name, title and heritage; sex from the name (Sorin,
Gavril, Raiden, Kavi, Corvus, Soren, Tariq, Siku, Nakoa, Vladislav men; Carmilla, Klara, Isolde, Tenzin, Aisling, Nenet, Zahara,
Cyra, Soraya, Gabriela women); the lore's pronouns fixed to match; the Dhampir's unit name "Dhampir"; `NOT_HUMAN` only the
Nightstalker, Blood Gargoyle, Bell Warden (a yokai), Astral Sphinx and Plague Doctor (undead).

## Art: what is real and what is a placeholder

Measured on every file (size, mode, transparency, MD5) and looked at by eye; see the contact sheet.

| Piece (each x20) | Format on the branch | Main's format | Verdict |
| --- | --- | --- | --- |
| Battle sheet, front `hero_res_<id>.png` | 592x707, cells 148x101, 4x7 | about 576-640 x 777-812, cells 144-160 x 111-116, figure 96 px inside the cell, feet on the cell's bottom | **All placeholder.** There are only three figures (Vampire Lord, Hemomancer, Nightstalker), each re-coloured for six or seven heroes (e.g. the Banneret, Falconer, Inquisitor and Harpooner are the Vampire Lord in other colours; the War Drummer, Bell Warden and Corsair Surgeon the Nightstalker). On all 20, **the figures cross the cell edges**: the 101 px rows cut each figure, heads in one row and skirts and feet in the next, so every frame the game cuts is broken. |
| Battle sheet, back `hero_res_<id>_back.png` | as the front | a true back three-quarter view of the same figure | **All placeholder.** Exactly three files shared by the 20 (MD5 `128c49fc` Hemomancer, `34aca609` Vampire Lord, `882d8b91` Nightstalker), each a copy of one of the three fronts, still facing the camera; not back views. |
| Awakened battle sheet front `awakened_<id>.png` | 608x812 | each hero's own awakened figure in main's grid | **All placeholder**: the same three figures re-coloured, the same grid fault. |
| Awakened battle sheet back | 608x812 | as above | **All placeholder**: three shared blobs, as the plain backs. |
| Full scene `<id>.webp` | 1024x1536 RGB | 1024x1536 painting | **Real for 2** (Vampire Lord, Hemomancer: finished gothic paintings in the gallery's style). The other 18 are the pixel sprite pasted on black. |
| Portrait cutout `<id>-portrait.webp` | 640x960 **RGB, opaque** | at most 320x480, **transparent RGBA** cutout | **Placeholder for all 20.** The two real ones are the scene shrunk, background and all; the 18 others are the sprite on black. |
| Awakened icon `awakened-<id>.webp` | 596x560 RGB, opaque | 596x560 transparent full-body awakened figure | **Placeholder for all 20**: crops of the scene or the sprite, opaque. |
| Painted spell sheets `art-source/spell-fx/v-vampire/*.png` (8) and `fx/spells/v-vampire.webp` | 1536x512, 256 px cells, transparent | the BRIEF's format | **Real, finished paint**, a good match for the house style. Several cells keep a faint rectangular box edge (plague cloud, harpoon and anchor, mirage sand, sonic drum); those must be cleaned or repainted before import, since the importer's corner test only checks corners. |
| Skill icons `fx/abilities/atlas-9/10.png` and the rewritten atlas 8 (40 rows) | 768 atlases, 4x4 cells | one painted icon per skill | **Partly placeholder**: every icon is a frame cut from the 8 spell sheets above, so 40 skills share 8 looks (the anchor appears three times, the gold rings four). Several keep the box edges. They cover only skill 1 and the ultimate; the other 40 moves have none. Atlas 8 overwrites main's Starfall atlas. |

So for the 20 heroes, **the only finished art is two scenes and eight effect sheets.** Everything a fight shows (battle sheets) and
everything the menus show before a hero is opened (cutouts, awakened icons) has to be made.

### Who makes what

- **ChatGPT** (prompts in [twenty-heroes-art-prompts.md](twenty-heroes-art-prompts.md)): 18 scenes, 20 transparent cutouts,
  20 awakened icons, the 8 effect sheets cleaned of their box edges, and one painted icon per skill once the kits are settled.
- **PixelLab** (as [hero-art.md](hero-art.md), `tools/pixellab/`): the battle sheets, which need exact pixel grids. For each of the
  20: front and back plain sheets and front and back awakened sheets, 80 sheets. The three original vampire figures are not worth
  saving: re-cutting them would mend the grid, but they would still have no back views or awakened forms.
- **PixelLab balance: 0.75 generations left** (of 9,839 on the Tier 3 plan; the credit balance is slightly negative), read from
  `GET /v2/balance` today. At hero-art.md's measured costs (about 15 a base and 11 a 4-frame clip, two facings, six rows, plus the
  awakened forms) the 80 sheets need roughly 3,000 to 4,000 generations. **Nothing can be generated until the plan renews or is
  topped up.** No PixelLab call has been made beyond reading the balance.

## Integration plan (step 2, after the director replies)

Work on `claude/twenty-heroes`, merging `origin/main` with merge commits. No version bump, no `src/updates.ts`.

1. **Batch 0, the canon and the rules** (no new heroes yet in `ALL_HEROES`): the Vampire origin and the `leech` trait effect, the
   Vampire swarm rule, the Crimson Court (if approved), each with a test; the 5 tiers only if the owner approves them.
2. **Batches 1 to 4, five heroes each** (Vampires first, then by origin): for each hero its `UnitDef`, traits, D&D row, `HERO_TABLE`
   row (s1, s2 with main's cooldowns and classes), `THIRD` row and cast in `kits/third.ts`, ultimate, book, talents, codex story and
   lore, tavern spot, starter class, looks (borrowed signatures until its icons come), and the counts in the roster tests moved in
   step. Tuned with main's tuner (`tools/kits/tune.ts`) so each kit meets `skills-4.md`'s income rules. Each batch also needs its
   art; a hero is only added to `ALL_HEROES` when its battle sheets are in, since the game must not ship code-drawn or broken
   sprites. Until then its kit is tested on its own.
3. Art PRs from ChatGPT are imported per batch (`tools/anime-heroes/pack.cjs` for scenes and cutouts, the spell importer for effects),
   credited in `CREDITS.md`, and every new URL added to the service worker's `FILES`.
4. Nothing of the branch's engine, HUD, reformatting or 212 rewritten images is taken. The branch is read from, not merged.

## Decisions for the director and owner

1. The canon above (names, sexes, heritages, traits as in `traits.ts`).
2. Whether every trait gains a 5-hero tier (a balance change), or only the Vampire origin gets tiers.
3. Whether the Crimson Court becomes a ninth Last Oath.
4. The PixelLab top-up, and leave to spend about 3,000 to 4,000 generations on the 80 battle sheets.
5. Whether a batch may land with its kit tested but its heroes held out of the roster until their sheets arrive.

## The decisions (the director, 4 November)

1. The canon as proposed: names, titles and heritages from `heroNames.ts`, sex from the name, origins and classes from `traits.ts`,
   the Dhampir's unit name "Dhampir", `NOT_HUMAN` only the five named above. No "Morbius" anywhere.
2. Five-hero tiers for the Vampire origin only (2, 4 and 5); every other trait keeps main's rules.
3. The Crimson Court becomes a ninth Last Oath.
4. The battle sheets are painted by ChatGPT, not PixelLab (the owner's choice): one prompt a hero, every frame its own transparent
   PNG, packed into main's grid by `tools/heroes-20/pack-sheets.py`. The prompts are in
   [twenty-heroes-art-prompts.md](twenty-heroes-art-prompts.md). No PixelLab generations are needed.
5. A batch may land with its kits tested while its heroes stay out of `ALL_HEROES` until their sheets arrive.
