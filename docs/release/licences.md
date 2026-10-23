# Licence audit of what the game ships

Written for the owner, 23 October 2026, against `main` at 0.133.0. **This is a working audit, not legal advice.** Where it says "clears", it
means "removes the question"; a lawyer should read the final list once before a paid release (see `store-plan.md`).

## How this was checked, and what could not be

- Read: `CREDITS.md`; the licence files kept in the private `hpatter9/chronos-assets` repo (Craftpix `License.txt`s, Gigapack, Tiny RPG
  Music, 5000 Pixel Effects, PVFX Foundry, Himeko Sutori terms, DawnLike README); which files the build really ships (esbuild's bundle
  list plus `build.mjs`'s copy lists, see "What ships" below).
- **Not reachable from the work environment** (the fetch tool could not resolve these hosts): craftpix.net, untiedgames.com, pixellab.ai. For those
  I used web-search snippets of their own pages or of the creators' replies. They are marked "confirm". **Before launch, open each page,
  save the licence text as a PDF with the date, and keep it in the (private) assets repo.** That dated copy is your proof.
- Every Craftpix `License.txt` in the assets repo is only the one line `https://craftpix.net/file-licenses/`; the terms live on the website and can change.

## What ships (so the table below is complete)

464 pictures are bundled into `game.js` as data URLs, plus the files `build.mjs` copies (area and mountain backdrops, UI frames, icons,
three music tracks, five fonts). 539 art/audio files in `src/art` and `src/audio` before the clean-up; 13 unused pictures were deleted
(branch `claude/assets-audit`, one separate commit). By folder: units 101 files, castle 59, equip 60, areas 65, fx 55, items 35, calmap 13, camp 14,
twists 14, tavern 15, tower 12, ground 8, hall 9, rogue 9, ui 40, duchess 2, library 2, loading 2, backdrop 5, icons 2.
Sound effects are synthesised in code (no files). The Chronos code borrowed (rng, board rules) is the owner's own.

## The table

Legend. **Comm.** = commercial use allowed. **Credit** = attribution required. "In-game" = the credit must be shown inside the shipped app, not only in the repo.

| # | Asset (where) | Source, author | Licence (as found) | Comm.? | Credit | Limits | Risk |
|---|---|---|---|---|---|---|---|
| 1 | Craftpix hero and foe sheets: Knight 1-3, Samurai, Samurai Archer, Samurai Commander, Kunoichi, Ninja Monk/Peasant, Fire/Lightning/Wanderer wizards, Skeletons x3, Werewolves, Gorgons, Minotaurs, Satyr (`src/art/units/`) | Craftpix.net free packs (Free Knight, Samurai, Ninja, Wizard, Skeleton, Werewolf, Gorgon, Minotaur, Satyr sprite sheets; Free Yokai Character Sprites) | Craftpix free-file licence (`craftpix.net/file-licenses/`); not on disk | Yes (Craftpix replies: free files carry a commercial licence) | Appreciated, not clearly required. **Confirm** | Raw files may not be resold or redistributed. Our sheets are cut/rearranged but still derived from them. Craftpix says some art is by third parties it bought rights to | Low. Fine inside a game; the exposure is "raw files in a public repo". Keep the repo private |
| 2 | Craftpix bosses: Forest Bosses 1-3, Boar King, Devil Leader, Shaman King (now remade with PixelLab, row 14); robots and pirates (`robot_*`, only `robot_*` still shipped) | Craftpix Free Forest Bosses; Free Fantasy RPG Top-Down Boss Creatures; Free Robot Pixel Art Sprite Sheets | Craftpix free licence | Yes | As row 1 | As row 1 | Low |
| 3 | Terrain, rocks, bushes, ground tops, backdrops (`ground/`, `areas/`, `backdrop/`, `home` deleted) | Craftpix: Fantasy 2D Battlegrounds, Free Undead Tileset, Free Fields Tileset, Free Mountain Backgrounds, Forest and Trees, Winter, Desert Oasis, Crystal Cave, Free Rocks, Cave Objects, Autumn (icon source) | Craftpix free licence | Yes | As row 1 | As row 1. The **app icon** (`icon-192/512.png`) is cut from a Craftpix background: store icons are very visible, so make a fully original icon (see risks) | Low-medium (icon) |
| 4 | Tower and camp skies/walls/chests: Dungeon pack, Clouds, Mountain Peaks, Platformer Tileset chest, Cloud and Sky, Moon backgrounds, Cloudscape (`tower/`, `camp/`, `ui/chest-*`, `calmap/`) | Craftpix free packs | Craftpix free licence | Yes | As row 1 | As row 1 | Low |
| 5 | Item/equip/relic/map icons, UI `wood.png`/`page.png` tile (`equip/`, `items/`, `rogue/`, `twists/`, `ui/`) | **DawnLike** v1.81 by DragonDePlatino, palette by DawnBringer | **CC-BY 4.0** (OpenGameArt listing) | Yes | **Yes, required.** Author, licence, link, say if changed. Also asks to credit DawnBringer | None on engine; must show a licence link and "changed" notice (we cut and recolour) | **Medium: the credit must be in the shipped app** (currently only in the repo's `CREDITS.md`) |
| 6 | Combat/skill effects: 22 + 27 sheets and a 225-strip atlas (`fx/magic`, `fx/vfx`, `fx/pack`) | **5000 Pixel Effects** by blueberry (itch.io) | Own licence, on disk (`pixel-effects/LICENSE.txt`, v1.0): unlimited personal and commercial use, modify OK, **no resale/redistribution as assets, no use as AI training data**. Credit "appreciated". The author states the effects were generated by code written by an AI (no image model) | Yes | Not required (give anyway: "Assets by blueberry") | Non-exclusive. Source repo must stay private. Bundled in a public `game.js` as a data URL, so they are extractable by a player: that is normal for games, but check the "redistribute as assets" line does not worry you | Low |
| 7 | Hit sparks, fire hit, brazier flame (`fx/impact.png`, `hit_fire.png`, `hall/fx_fire-flame.png`) | **Super Pixel Effects Gigapack (Free Version)** v2.9.0, Will Tice / unTied Games | unTied Games licence (summary on disk; full text at `untiedgames.com/files/license.txt`, **confirm**) | Yes | **Yes, "please" give attribution** in credits | No re-uploading as assets; must not be bundled with a game *engine/tool*; no AI training | Low. Credit needed in-game |
| 8 | Portal and rift (`calmap/portal.png`) | **PVFX Foundry Thirteen** (Pixel VFX Studio) | **CC0 1.0** (on disk) | Yes | No | None. (CC0 applies to the sprite sheets only, not the studio's marks) | None |
| 9 | Music: town, battle, boss (`src/audio/*.ogg`) | **Tiny RPG Music**, Luis Zuno (@ansimuz) | Own licence on disk: personal or commercial, modify, redistribute; credit "not required but appreciated" | Yes | Appreciated; give it | None | Low |
| 10 | Fonts: Cinzel Decorative, Alegreya Sans, Press Start 2P, Pixelify Sans | `@fontsource` npm packages of the Google Fonts families | **SIL Open Font Licence 1.1** | Yes | Not required for use; the OFL text must travel with any redistributed font file. Keep the `.woff2` files with the licence text in the app's licences page | Can't sell the fonts on their own; if modified, can't keep the reserved name | Low |
| 11 | Sound effects | Synthesised in `src/render/sound.ts` | Our own code | Yes | No | None | None |
| 12 | The pixel UI frames, buttons, ribbons, chips (`ui/*.png`) | Drawn by our own scripts (`tools/ui/`) | Ours | Yes | No | None | None |
| 13 | Castle, camp, Calamity ground and props: Chronos "iso kits" (`castle/`, `camp/`, `calmap/atlas.png`) | Chronos Settlement (`hpatter9/little-town`), kits **drawn with ChatGPT's image generation** from the owner's prompts, then cut and cleaned | Owner's; OpenAI's terms let the user own and commercially use outputs. **Copyright in purely AI-made images is weak or absent in many countries** (US Copyright Office: no protection for the AI-made parts without enough human authorship) | Yes | No | You can use them, but you may not be able to stop others copying them; store AI-content questions apply (row 14) | **Medium**: ownership is thin, and the stores' AI-disclosure forms ask about it |
| 14 | **PixelLab-generated art**: the class heroes (`cls_*`, 24 sheets and treant), 16 remade heroes (`hero_*`), orcs/imps/demons/ogres (`hk_*` except ghost), Lich King, Oni King, remade bosses and satyrs, tavern, hall, library, UI icons (`tab-*`, `ic-*`), fountain and benches | pixellab.ai, with Craftpix frames used as *style references* for the figures | PixelLab Terms of Service (search snippet of s.1.3, 3.3, 2.2, v. 23 Nov 2025; **confirm**): you keep ownership of what you create, for commercial and non-commercial use, except training other models; API use only through the official API | Yes (per snippet; the page is not read here) | No | Same thinness-of-copyright point as row 13. The references are Craftpix art (derivative-look risk is small but not zero). Google/Apple/Steam-style AI disclosure applies | **Medium**: legal (copyright is weak) and policy (disclosure). See risk R6 |
| 15 | **Golems**: `golem_stone/iron/crystal/magma/sapphire/forge.png` and the treant base `cls_treant.png` | **Golems and elementals** pack by *batareya* (itch.io) | **No licence file.** The itch page states the pack was made with the help of **Stable Diffusion**; the author replied "Yes, sure" in a comment when asked about commercial use (informal) | Informal yes | Unknown | None written | **High**: no written licence, AI origin, and a forge boss and a Druid hero depend on it. R2 |
| 16 | Ghost / Reaper (`hk_ghost.png`) | **Himeko Sutori** sprite share, Rockwell Studios LLC (via Showkaizer, Aleesa Tana) | Terms on disk: free for commercial and non-commercial, **attribution required** (exact three lines), edits may be shared with attribution, **do not re-post originals**, usable in any engine | Yes | **Yes, required, in the project** | Exact wording below | Medium: the credit lines must appear in-game |
| 17 | **Duchess the goat** (`duchess/goat.png`, `goat-half.png`) | **whtdragon**'s RPG Maker MV animals (`whtdragons_MVanimals_ALL_4-1-2025`), via Chronos cutscenes | No licence file in the folder. Terms quoted by third parties (not the original post): commercial and non-commercial use, edit/recolour OK, credit appreciated, **"a legal copy of RPG Maker MV is required"**. | Unclear | Appreciated | **The "must own RPG Maker MV" wording and RPG Maker resource licences are the classic engine-locked limit.** | **High** (R1). Easy to fix |
| 18 | Mining icons, LPC sprites, Alenia Star Magic, Robot Warfare, spaceships, Holy VFX, Magic Items, PackMonsters, Pixel Champions v3 (assets repo only) | Other packs that sit in the assets repo | **Not shipped.** The 8 Pixel Champions heroes and the Himeko Juggernaut/Tyrant/Mummy/zombies were replaced (`CREDITS.md` "Superseded") | n/a | n/a | **LPC is CC-BY-SA/GPL and would force the game under those licences if it ever came in. Do not add.** | None now (guard: never add LPC) |
| 19 | Game name, logo, any word art | Ours | n/a | | | See trademarks in `store-plan.md` | Medium |

### Himeko Sutori: the exact lines the terms require (row 16)

> Half-Kaizer sprite template created by Showkaizer.
> Additional Half-Kaizer poses by Aleesa Tana.
> Armor, weapon, shield, helmet, hair, skeleton, zombie, demon, fairy, mecha, wolf, boar, pumpkin, turkey, slime, skullbird, dragon, cactus, and
> other sprites are from Himeko Sutori and Septaroad Voyager by Rockwell Studios, LLC.

Only the Ghost still uses it, but the terms ask for the whole block. Either show it, or replace the Ghost (cheaper: PixelLab one-off).

### DawnLike credit (row 5), ready to paste

> DawnLike tileset by DragonDePlatino (palette by DawnBringer), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Tiles were cut out, recoloured and combined for this game.

## The risks, in order, with the fix for each

**R1. Duchess (whtdragon, RPG Maker MV): High, easy.** There is no licence on disk; the terms third parties quote mention needing a legal
RPG Maker MV copy, which reads as an RPG-Maker-only limit, and "must you own MV" is exactly what a store reviewer or the author could point to.
Fix, cheapest first: (a) replace her with a PixelLab goat in the same animation grid (a few credits, same method as the other generated sheets,
`tools/pixellab/`); (b) buy/choose a goat from a pack with an engine-free licence (Craftpix has free farm-animal packs; check the licence); (c)
ask whtdragon in writing and keep the reply. Until then do not ship Duchess to a store. She appears in the camp, the tavern and the battlefield, but all from one sheet
(plus a half-size copy), so the swap is two files.

**R2. batareya golems and the treant: High.** No written licence, a one-line "Yes, sure" comment, and the pack says it was made with Stable
Diffusion. Fix: ask the author for a short written grant (a message through itch.io is enough: "commercial use in a paid app OK, no credit needed") and keep it, **or** regenerate the six golems
and the treant with PixelLab the way the other bosses were made (`tools/pixellab/foes/`). The second is under your control and consistent
with the rest of the game. Also note: there are 7 files, a boss line and one Druid form.

**R3. Craftpix (about 40 free packs): Low-Medium, confirm once.** The licence is a web page, not a file; the Craftpix replies say free files are commercially usable, redistribution/resale of
the raw files is not. Our use (cut sheets in a closed game) fits. Steps: save the page, record the date, and keep the packs' download pages (some free
packs say third-party art; read that line on the three or four packs with the most visible art: Knight, Samurai, Werewolf, Minotaur). Do not make `chronos-assets` public and do not
publish sprite sheets as files (sheet images in `game.js` can be extracted by players; that is accepted practice but is the one real "redistribution" exposure; a lawyer can bless it).
The app icon and any store graphic made from a Craftpix background should be redrawn.

**R4. Credits that are required and not yet in the app: Medium, easy.** CC-BY 4.0 (DawnLike), Himeko, and unTied Games each ask for in-product credit. Today credits are only in `CREDITS.md`. Build the in-game
Credits screen (see `store-plan.md`), and also ship the OFL texts.

**R5. LPC, GPL or CC-BY-SA art: not present. Keep it that way.** A guard: add a one-line check to the asset workflow ("never copy from
`Universal-LPC-spritesheet-master`"). If LPC ever came in, SA would force your edits of it to be shared under SA.

**R6. AI-made art (ChatGPT iso kits, PixelLab, Stable Diffusion golems): Medium.** (a) Ownership: you can use the outputs commercially under the tools' terms, but in the US
(and many countries) purely AI-generated images are not copyrightable without real human authorship, so you may not be able to stop a copier; mixed work (hand clean-up, selection, arrangement) is stronger, so keep the
generation prompts and the clean-up scripts in the repo (already done in `tools/` and `docs/notes`). (b) Disclosure: Google Play and the App Store ask about AI-generated content or
ask you to describe it; answer honestly. (c) PixelLab's terms: read the current page and note which plan the credits were bought on, then keep the receipts. The terms
ban *training* models on outputs, not using them in a game. (d) The Craftpix references used for style are an input, not copied pixels.
Fix: keep records; no code change.

**R7. Fonts: Low.** All OFL. Ship the licence text on the Credits screen.

**R8. "Free tier is personal use only": none found among what ships.** Craftpix, Gigapack free version, Tiny RPG Music and 5000 Pixel Effects all allow commercial use. The only "free version" with a possible catch is the Gigapack:
re-read `untiedgames.com/files/license.txt` for any line that limits the *free* version (confirm).

**R9. The name and the icon.** The game is now **Legends of the Last Keep**; see the trademark section of `store-plan.md` (5.5); the Craftpix-derived icon should be redrawn.

## What I changed in this branch

- Deleted 13 unused pictures (`fx/blast.png`, `hall/fx_star-pillar.png`, `home/castle.png` 450 KB, nine unused UI frames, two trims), one superseded tool and 5
  tracked `.pyc` files: **about 0.5 MB**, in one commit (`Delete unused art, tracked pyc files and a superseded hero tool`).
- Fixed `CREDITS.md` (removed the deleted art, the old tool's mention) and `docs/notes/home.md`.
- No game code changed.

## Still to do (owner decisions)

1. Duchess: replace or get written permission (R1).
2. Golems and treant: written grant or regenerate (R2).
3. Redraw the app icon without Craftpix pixels (R3).
4. Build the Credits screen with the CC-BY, Himeko and unTied lines and the OFL texts (R4).
5. Save dated copies of Craftpix, unTied, PixelLab and OpenAI/ChatGPT output terms (R3, R6).
