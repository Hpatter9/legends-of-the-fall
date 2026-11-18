# ART-GAPS: the missing art audit

The owner's ask: "Check for missing art so I can get a prompt out to fix it. I know some of the army tab art is still missing."

This page is the audit. The prompts are in [art-gaps-prompt.md](art-gaps-prompt.md).

## How it was checked

- **On screen.** The built game (`npm run web`, 0.612.0) was played in Playwright at 393x852 with a well-progressed save: all 45 old heroes, every army open and cleared, and plenty of crowns and stones. The walk covered:
  - the War Room, every army card, its info and its lower half;
  - the five tabs (Recruit, Heroes, Battle, Castle, Spells);
  - the Tavern and its services, the hero list, the Dark Council, Quests, the Pact Gallery, the Codex, Achievements, Settings, the Assault war table and the Ruler.

  No image failed to load on any of them. The Shop, the Daily and the trophy wall were not opened: the scripted taps on their buttons missed.
- **In the code.** Every data table was checked against the art it looks up:
  - **fight side:** `UNITS`, `FOES`, the elites, the Calamity bosses, summons and trait perks, Eidolons, skills, ailments, the king's spells and traits;
  - **meta side:** relics, runes, gear, rulers, the Council and the nemesis, achievements, the Codex, quests, the shop, the camp, the Calamity, the Last Stand and the Assault.

  All 1,174 image imports and URL strings in `src/` point at files that exist. Every gap below is art that was never made: a stand-in, a tinted copy, a glyph, or nothing.
- **Screenshots** are in `docs/samples/art-gaps/`:
  - `armies-beasts.jpg` and `armies-wildwood.jpg` show the gap;
  - `armies-orcs.jpg` shows a card with its art, for comparison.

**The counts:**

- **Gaps in the three prompts:** 82 new pieces, plus the 4 already pending.
  - Round 3: 27 new pieces, 7 of them trophies, plus the 4 pending (31 in its prompt).
  - Round 4: 35 pieces.
  - Round 5: 20 awakened forms, two sheets each.
- **The Armies page itself:** 2 gaps, the trophies on two army cards. Five more trophies belong to the same armies' mid-bosses, and two of their mid-bosses have no battle sheet of their own: 9 pieces in the Armies group in all.
- **Natsu's portrait fix:** a separate prompt.
- **Not in a prompt:** about twenty further gaps that need a design decision first (listed at the end).

## The Armies page (the War Room)

The army's card is a painting of its final boss's mounted trophy (`trophyPicture(bossOf(a))`, `src/armiesView.ts:72`). Two final bosses have no trophy. Their open, cleared armies therefore show `locked.webp`, the empty plaque a sealed army shows, so they read as still locked.

| Piece | Where it shows | What shows now | Screenshot | The file the code will load |
| --- | --- | --- | --- | --- |
| Boar King trophy (`boarKing`) | The Beast Packs card; the trophy wall | The empty locked plaque | `armies-beasts.jpg` | `src/art/trophies/boarKing.webp`, 256 x 256 |
| Grove Spearlord trophy (`forestBoss3`) | The Wildwood card; the trophy wall | The empty locked plaque | `armies-wildwood.jpg` | `src/art/trophies/forestBoss3.webp`, 256 x 256 |
| Orc Chieftain trophy (`orcChieftain`, Orc Warband mid-boss) | The trophy wall | Missing from the wall | (code) | `src/art/trophies/orcChieftain.webp` |
| Alpha Werewolf trophy (`alphaWolf`, Beast Packs mid-boss) | The trophy wall | Missing from the wall | (code) | `src/art/trophies/alphaWolf.webp` |
| Thorn Warden trophy (`forestBoss1`, Wildwood boss 1) | The trophy wall | Missing from the wall | (code) | `src/art/trophies/forestBoss1.webp` |
| Wood Raider trophy (`forestBoss2`, Wildwood boss 2) | The trophy wall | Missing from the wall | (code) | `src/art/trophies/forestBoss2.webp` |
| Devil Leader trophy (`devilLeader`, Infernal Host mid-boss) | The trophy wall | Missing from the wall | (code) | `src/art/trophies/devilLeader.webp` |
| Alpha Werewolf battle sheet | The Beast Packs' wave 8 boss | The common `werewolf_black` sheet scaled 1.05 (`src/sim/foes.ts:102`) | (code) | `src/art/units/alpha_werewolf.png` |
| Nine-Tailed Fox battle sheet | The Yokai Night Parade's mid-boss | The common `kitsune` sheet scaled 0.95 (`src/sim/foes.ts:112`) | (code) | `src/art/units/nine_tails.png` |

The rest of the War Room is painted: the room, the arrows, the tier chips, the chests, the ores and the Assault's line.

## Everything else, in the prompts

| Piece | Where it shows | What shows now | The file the code will load | Prompt |
| --- | --- | --- | --- | --- |
| Risen Skeleton, Spearman, Archer (Undead III) | The board | The foe skeleton sheets tinted green (`src/render/perkLookRules.ts:4`) | `src/art/units/summon_grave_warrior.png`, `summon_grave_spear.png`, `summon_grave_archer.png` | 3 |
| Wanted mark (Frontier) | Over the marked foe | An amber tint and the word "Wanted" (`perkLookRules.ts:9`) | a 2-frame sprite, like the crown mark | 3 |
| Council News: hunt, plot, spared | The Council's News list | Duel's blades, betrayal's dagger, the oath's hands (`src/councilArt.ts:29-34`) | `src/art/council/hunt.png`, `plot.png`, `spared.png`, 96 x 96 | 3 |
| Assault: Send scouts, the ram, the roles main, cover and flank, the Line formation | The war table, the siege works, the Parts and Battle pickers | The glyphs 👁 ⛏ ⚔ ⛰ ↪ ━ (`src/assaultView.ts:304, 348, 373, 446`) | 6 new 128 px cells beside `src/art/ui/release/assault-icons.webp` | 3 |
| Quest givers: spoils, rift, Duchess | The quest card and log | 16 px DawnLike item tiles; a 64 px pixel crop of Duchess (`src/questArt.ts:27-28, 44`) | `src/art/quests/spoils-face.png`, `rift-face.png`, `duchess-face.png` | 3 |
| Cursed status icon | Over a cursed fighter | The only status icon still tinted, 0xc79aff (`src/render/statusStyles.ts:111`) | cell [6, 9] of `src/art/fx/status/atlas.png`, 96 x 96 | 3 |
| Voltara's aftermath | Voltara's Eidolon show | Reuses `voltara-extra` (`src/eidolonFx.ts:106`) | `src/art/eidolons/fx/voltara-after.webp`, 960 x 160, 6 frames | 3 |
| Sentry turret, ghost ship, crown mark | Trait perks | Stand-ins | (already requested) | 3, pending |
| The eight temperaments | Council seats, nemesis card | Borrowed symbols (`src/temperArt.ts`) | (already requested) | 3, pending |
| 12 named elites (Gorrak, Ysolde, the Hollow Knight, Sethra, Brakka, Cindra, Vexor, Thrum, Nyssa, the Iron Warden, Kuro, Silenus) | The board, the codex | A common foe's sheet, untinted; Cindra and Vexor share one (`src/sim/eliteFoes.ts:14-27`) | `src/art/units/elite_<name>.png` | 4 |
| Quest guests: the Carter, the Pilgrim, the Bosun, the Envoy, the Prisoner | Quest battles (protect rule) | Drawn as the peasant, wanderer, buccaneer, priestess and druid heroes (`src/sim/units.ts:168-172`) | `src/art/units/guest_<name>.png` plus `_back.png` | 4 |
| Fox Witch, Crow Seer | The Yokai army | The Fox Spirit's and the Karasu Tengu's sheets (`foes.ts:108, 110`) | `src/art/units/yokai_witch.png`, `yokai_seer.png` | 4 |
| Nemesis weaknesses (dread, fire, frost, storm, venom, heights, glutton, craven, vain) | The nemesis card's Weaknesses well | Words only (`src/nemesisView.ts:542`) | `src/art/nemesis-traits/weak-<kind>.png`, 128 x 128 | 4 |
| Hunted quarry mark | A Council seat | A CSS red ring (`src/nemesis.css:193`) | a 128 x 128 badge | 4 |
| The king's tent | The player's camp on the Assault field | The orc conical tent tinted blue (`src/render/fieldLooks.ts:525`) | a sprite in each hold's atlas (cut by `tools/assault/cut-sheets.py`) | 4 |
| Calamity dungeon floor and wall | The Calamity map | The retired Last Stand tiles `stand/floor1.png` and `walltop.png` (`src/calMap.ts:15-18`) | two 64 x 64 tiles beside `src/art/calmap-dungeon/` | 4 |
| Duchess's costumes: crown, wizard's hat, quiver | Duchess in the camp, castle and tavern | Pixels drawn with `fillRect` (`src/render/duchessRules.ts:246-300`) | overlays on `src/art/duchess/goat.png`'s six 48 px frames | 4 |
| Awakened forms of the twenty newer heroes (the Vampires and the rest of the twenty) | The board and every menu at awakening steps 1 and 2 | The base sheet (`awakenedSheet` returns it unchanged, `src/render/awakenLook.ts:19`) | `src/art/awakened/awakened_<kind>.png` plus `_back.png`, by `tools/ascended/pack.cjs` | 5 |
| Natsu (`archer`) portrait | Hero pages, the Summon reveal | Shows one leg | `src/art/heroes/archer.webp` (512 x 1024) and `archer-portrait.webp` (480 x 960) | its own |

## What the wiring builder will need to change

The art lands in `art-source/round3/`, `round4/` and `round5/`. Nothing in the game uses it until a builder wires it:

1. **Trophies.** Cut the sheet into seven 256 px WebPs. Do this the way `tools/trophies/import.py` cuts the three-column sheets: crop the full cells, no background removal. Then:
   - import each one in `src/trophyArt.ts` and add it to `TROPHY_ART`;
   - add a `BOSS_TROPHIES` entry in `src/trophyWall.ts` for each of the seven (name, title, origin, accent, blurb, lore, defeat tag), since the wall lists only what is in that table.

   The Armies page then picks them up by itself. A stopgap while the art waits: the Calamity's Thorn Warden (`calBoss2`), Vorgrath (`calBoss5`) and Karnok (`calBoss6`) trophies show the same creatures as `forestBoss1`, `devilLeader` and `boarKing`. Mapping those ids to them would fill the Beast Packs card today, at the cost of a duplicate on the wall.
2. **New battle sheets** (Alpha Werewolf, Nine-Tails, the grave summons, the elites, the guests, the Fox Witch and the Crow Seer). For each:
   - a layout in `src/art/units/sheets.json` (the grids are in the prompts);
   - an import and a `URLS` entry in `src/render/sheets.ts`;
   - the `sheet:` in `foes.ts`, `eliteFoes.ts` (through `from()`'s tweak) or `units.ts`;
   - a `KIN_SHEET` entry (`foes.ts:137`) so the family rules still read the soldier's sheet;
   - the `scale` checked against the new figure height.

   For the guests, a `rear` back sheet as the heroes have. For the grave summons, remove their tint in `perkLookRules.ts`.
3. **Marks** (Wanted, and the pending crown). New code: an over-head sprite in `src/render/unitView.ts` in place of the tint and word.
4. **Council icons.** Three imports in `src/councilArt.ts`. **Weaknesses:** a new map passed as the fourth argument of `secrets()` (`nemesisView.ts:542`). **Hunted:** a new badge beside `.nmTemper`.
5. **Assault icons.** Append the six cells to `art-source/release/assault-icons.png` and rebuild `src/art/ui/release/assault-icons.webp` (12 to 18 cells), then:
   - extend `RELEASE_ICON`;
   - change the hard-coded `/11` in `src/ornateMenu.ts:134` and `1200%` in `src/ornateMenus.css:2114`;
   - give the four `menuChoice` and `menuPick` calls an `art:` in place of their `icon:` glyph.
6. **Quest faces.** Imports and `PAINTED` in `src/questArt.ts`.
7. **Curse icon.** Paste it into cell [6, 9] of the status atlas (`tools/status-fx/import-status-art.py`) and drop the tint at `statusStyles.ts:111`.
8. **Voltara.** Change `after: s('voltara-extra'...)` to `'voltara-after'` (`eidolonFx.ts:106`) and add the file to the FX list.
9. **King's tent.** Add it to each hold's `sprites.webp` with the cutter, then name it in `fieldLooks.ts:525` in place of the tinted `conicalTent`.
10. **Dungeon tiles.** Change the imports at `calMap.ts:15-18`.
11. **Duchess.** Replace `drawDuchessCosmetic` with the overlay frames, which keeps the same fixed points.
12. **Awakened forms.** Put the sources where `tools/ascended/sources.json` expects them and run `node tools/ascended/pack.cjs <kinds>`. It writes `manifest.json` and `src/render/awakenedArt.ts`, and the service worker must list the new PNGs.
13. **Credits.** Every piece goes in `CREDITS.md` as original work made for the game.

## Gaps left out of the prompts (a decision first)

These are real, but each needs the owner's or the director's call before art is asked for:

- **Hero skill effects (the largest gap).** 130 of the 280 hero skills (mostly skills 2 and 3 of every non-Mythic hero) have no painted lead of their own. They show another skill's signature, recoloured (`KIT_LOOKS`, `src/render/kitLooks.ts:9`). Fixing it means deciding a look for each skill. The art would then come as 768 x 768 atlases of sixteen 192 px cells (`src/art/fx/abilities/atlas-14.png` on), about nine atlases.
- **Shared icons:**
  - The fight's skill icons are 76 shared motifs. "Lightning" stands for about ten skills.
  - Four pairs of king's spells share an icon: smite and lance, meteor and starfall, heal and renewal, frost and deepfreeze.
  - Two pairs of traits share a motif: mystic and arcane, caster and arcanist.
- **Hero grades 2 to 4:** a colour filter on the same sheet, not evolved art (`gradeFilter`, `unitView.ts:73`).
- **Trait art:**
  - The trait badges on the party screens are CSS shapes with two letters (`src/traitBadge.ts:48-55`).
  - The trait card and its 78 perk tiers have no art.
- **Eidolons:**
  - The 30 Eidolon chain pieces borrow gear icons, with duplicates (`eidolonChainView.ts:47-60`).
  - The one impact ring is recoloured per Eidolon.
- **Achievements:** all 21 share one medal, greyed until claimed. This is the release art's design.
- **Codex:**
  - Terrain shows 25 CSS swatches. Holds and Legends are text (Legends could use `EQUIP_ICONS`, wiring only).
  - Its ✦ ◇ 🔒 marks are glyphs.
- **Relics:** the six Storied relics have no brighter variant. Their prompt in `relic-art-prompts.md` never came back. Phoenix Ash shows the living phoenix.
- **Hold views:** the Assault's hold minimap is canvas-drawn.
- **Camp:** one overlook painting washed per land; the emote bubbles are drawn pixel maps.
- **The Last Stand:** the "second" variants of its room tiles are the same file twice (`standHall.ts:15-31`).
- **Run gear:** shows nine 16 px DawnLike tiles, and an empty slot shows the letter W, A or C.
- **Bloodtusk:** check whether the weathered palisades and ridge edges of `bloodtusk-weathering-art-prompts.md` arrived. `orc-warcamp-details.png` may have replaced them.
- **Wiring only, no art needed:**
  - the summoning stones count on the pull buttons is ◆ though `ICONS.stones` exists (`hall.ts:407`);
  - the nemesis name plate's ☠ ✕ glyphs (`unitView.ts:276-278`).
- **Small fix:** the Oni King's sheet has no hurt row; it plays idle.
- **By design:**
  - the thrall (the slain foe tinted red) and the mirror image (the caster tinted);
  - the army variants of field foes (pack, grove, maze, clan, hell);
  - the Calamity bosses' battle sheets: their herald paintings were made from those very sprites, so they match;
  - Hester's 23 books on nine covers;
  - the one keepsake painting.
