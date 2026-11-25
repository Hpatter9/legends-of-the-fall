# PIXELLAB-ART: the missing art, made with PixelLab

The owner: "PixelLab is connected. What do you need for art, it can provide it." This round fills the gaps that
[art-gaps.md](art-gaps.md) found, in the order a player sees them. Every picture is made from the game's own art, so it sits
among its neighbours. Every request is logged in `tools/pixellab/requests.jsonl` (the endpoint, the prompt, the seed and the
reference files), and the raw frames and candidates are kept in `art-source/pixellab/`, so any piece can be remade.

## How

- **Battle sheets: a reskin, frame by frame** (`tools/pixellab/reskin.py`, its pieces in `pieces.json`). A piece names a soldier's
  sheet (its *kin*) and says what changes. The steps:
  1. One key frame: `/edit-images-v2` on the kin's first idle frame.
  2. Every frame of every row: `/transfer-outfit-v2` with the key as the reference (three frames a call at these cell sizes).
     Each frame therefore keeps the kin's pose, motion, place and size in the cell, and faces right.
  3. A frame that slipped back to the kin's colours or weapon gets a second pass: `/edit-animation-v2` over the frames together
     (`fix.py`; the frame before it is kept as `.pre.png`).
  4. A fade-out frame that shows only an effect (the foxfire a kitsune melts into) keeps the kin's own drawing (`keepSource`),
     turned to the new colour where needed (`keepHue`).

  The sheet is written on the kin's grid. `wire.py` registers it in `sheets.json` and `render/sheets.ts`, and `KIN_SHEET` names
  the kin, so every rule that reads a look (a foe's family, its home army, a quest's family of foes) reads exactly what it did.
- **Painted pieces: the neighbour edited.** The seven trophies are the empty mount `locked.webp` with the keepsake painted on
  (`trophies.py`), so the shield, the brass and the blank plate are the same as on every other trophy. The pause medallion is the
  speed medallion with its chevron painted out and two bars painted in (`pause.py`), fitted to its 94 px box.
- **Icons, marks and tiles** (`icons.py`, `icons.json`): `/generate-image-v2` with a neighbour as the style image. It returns four
  (or sixteen) candidates; the picks are made by eye on `candidates.py`'s board and laid in place by `place.py`. Each mark's glint
  frame is its own picture with its reds or golds lifted (`marks.py`). The Cursed icon goes into its own cell of the status atlas
  (`curse.py`).

## What landed, and where

| Piece | Files | Wired |
| --- | --- | --- |
| 7 trophies: Boar King, Grove Spearlord, Orc Chieftain, Alpha Werewolf, Thorn Warden, Wood Raider, Devil Leader | `src/art/trophies/*.webp` | `TROPHY_ART`, `BOSS_TROPHIES` (the wall's words); the Beast Packs and Wildwood cards show them |
| Alpha Werewolf, Nine-Tailed Fox | `alpha_werewolf.png`, `nine_tails.png` | `foes.ts` `sheet:`, `KIN_SHEET`, `FOE_EMIT` |
| The Undead's risen skeletons | `summon_grave_warrior/_spear/_archer.png` | `units.ts`; no grave tint (`perkLookRules.ts`) |
| The 12 named elites, the Fox Witch, the Crow Seer | `elite_*.png`, `yokai_witch.png`, `yokai_seer.png` | `eliteFoes.ts` (through `from()`'s tweak), `foes.ts` |
| The Wanted and crown marks | `src/art/fx/marks/*.png` (two 64 px frames) | `perkMark` and `markFrame` (`perkLookRules.ts`), drawn over the head by `UnitView`, still under reduced motion; no tint |
| The Cursed status icon | `src/art/fx/status/atlas.png` cell [6, 9] | its tint is dropped (`statusStyles.ts`) |
| Council News: hunt, plot, spared | `src/art/council/*.png` | `NEWS_ICON` |
| The eight temperaments | `src/art/nemesis-traits/temper-*.png` | `TEMPER_ICON` |
| The nine weaknesses, the hunted badge | `weak-*.png`, `hunted.png` | `weakIcon` (the card's Weaknesses well), `.nmHuntMark` on the quarry's seat |
| Calamity floor and wall top | `src/art/calmap-dungeon/floor.png`, `walltop.png` | `calMap.ts` |
| Quest faces: spoils, rift, Duchess | `src/art/quests/*-face.png` | `FACES`, `PAINTED` |
| The pause medallion | `src/art/ui/buttons/pause.webp` | as it was |

Large sheets are files the build lists in the service worker by itself (`ART_FILES`). Small pictures go into game.js. Nothing new
is loaded by a hand-written URL.

## Left for ChatGPT

- **The twenty awakened forms (round 5): 40 sheets.** A reskin costs about 110 generations a sheet, about 4,400 in all, more than
  the plan had left. The director's call: they stay with the round-5 prompt.
- **The assault icons**: skipped, because the Assault is being removed.
- **The ghost ship, the sentry turret, Voltara's aftermath, the king's tent, Duchess's costumes and Natsu's portrait**: not tried in
  this round. Their prompts in [art-gaps-prompt.md](art-gaps-prompt.md) stand.

## Checks

- `test/pixellab-art.test.ts`: each reskinned sheet the game uses is on its kin's grid, registered, and read as its kin; every
  army's bosses have a trophy and a place on the wall.
- Tests changed for the new requirements:
  - `test/trait-card.test.ts`: the grave skeletons, the crowned and the Wanted wear art, not a tint.
  - `test/emit-points.test.ts`: the perk summons and the named elites that shoot are read too.
- Pictures: `node tools/pixellab/shots.mjs` puts them in `docs/samples/pixellab-art/`, beside the contact sheets (each new
  sheet's rows under its kin's).
