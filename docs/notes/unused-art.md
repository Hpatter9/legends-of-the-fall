# UNUSED-ART: finished paintings that nothing drew

Branch `claude/unused-art`, from main 0.446.0. The Castle tab and the hidden modes (`src/sim/hiddenModes.ts`) are untouched, and the
version is unchanged. Before and after shots at 393x852, 360x780 and 412x915 are in `docs/samples/unused-art/`
(`tools/unused-art/shots.mjs`; the "before" shots come from a build of main).

## How the unused art was found

- **`src/art/`**: every picture's name looked for in the code (`src/`, the CSS, `index.html`, `build.mjs`). Then each family the code
  builds names for was checked by hand: the heroes' portraits, the tavern's guests, the effect frames, the Eidolons' cards and figures,
  the books, the standing seals, the backdrops' layers, and the tab medallions (`` `tab-${id}` ``).
- **The painted button cells**: each name in `PB_ICONS` and `PB_PLATES` (`src/paintedButton.ts`) looked for, quoted or as its
  `ui/buttons/<name>.webp`, anywhere else in the code.
- **`art-source/expansion/`**: the three pieces named in `art-wire-5.md`.

## Wired in

### Painted button cells that were cut but never shown

Each is put on the button it was painted for. The button keeps its plate and its words, with the medallion before them, as Hire, Fight
and Merge already have theirs (`paintedButtons.css`, the UNUSED-ART section):

| Cell | Button | Was |
| --- | --- | --- |
| `next-stage` | the result card's Next stage (`#next`) | words only |
| `reveal-all` | the Summoning screen's Reveal all (`#revealAll`) | words only |
| `pull-1`, `pull-10` | Use 1 stone, Use 10 stones (`#pull1`, `#pull10`) | words only |
| `return` | Return to sanctum (`#gachaClose`), Return to Armies (`#asumOk`) | words only |
| `retain` | the dismiss dialog's Retain Hero (`#askNo`); its Recycle for Gold takes the deploy's own `recycle` medallion, so the two match | words only |
| `march-battle` | the War Council's March to battle (`#ptGo`) | the plain `march` medallion |
| `g-cross` | the Calamity map's and the Sanctuary's Return home (`.dmClose`) | a bare × |
| `g-info` | the altar's help (`.altarInfo`) | a bare ⓘ |
| `g-minus`, `g-plus` | the War Council satchel's one fewer and one more (`.ptStep`, `src/party.ts`), each with words for a reader ("One Bandage Roll more") | − and + in stretched slate plates |

- The dismiss dialog's two buttons have smaller medallions (22 px) and tighter sides, so "Recycle for Gold" stays on one line at 360.
- Shots: `gacha-*` (the pull buttons and Return), `party-*` and `party-satchel-*` (March to battle, the satchel's steppers), `ask-*` (the
  dismiss dialog). `buttons-*` shows Next stage, Return to Armies, Return home and the altar's help. A fresh save cannot reach those four
  screens, so the script builds each button as its screen does, in a frame of the page's own CSS.

## Already in use (no change)

- **`elders-table.png`**: drawn at the head of the Elders' table's card since TAVERN-25 (0.433, `tools/expansion/tavern-tables.py`,
  `.hsEldersArt`). The header 0.433 uses is this painting. Shots: `docs/samples/tavern-25/elders-*`.
- **`duel-ring.png`**: also in use since TAVERN-25. `tools/expansion/duel-ring.py` cuts it into its twenty standing stones, which make up
  the duel's ring (`boardView.ring`, `src/art/duel/ring-stones.png`). The "stones" the ring is drawn with are this painting, so there is
  nothing more to use. Shots: `docs/samples/tavern-25/ring-*`.
- `art-wire-5.md`'s "not wired" line was out of date for these two (it was written before TAVERN-25); it now points here.

## Left unused, and why

| Art | Why |
| --- | --- |
| `art-source/expansion/hester-table.png` (Hester's merchant table, PR #464) | It was painted for the pixel tavern's stall (`src/tavern.ts`), which nothing creates any more. It was tried on the counter of her stall's scene and taken back out, the director's call: the pixel-art table clashes with her painted portrait scene (as TAVERN-25 had found). It stays as source art. |
| `src/art/shop/hester-sign.webp` (a hanging "Hester's Books & Gear" sign) | The stall's scene has no room for it beside Hester and her line. In the head it would rival the page's own title, "Hester's Stall", with other words. It would fit a hanging sign over a stall in a scene, should one come back. |
| `ready-ring` (an empty gold ring) | Not a button; nothing marks a "ready" thing with a ring now (the tavern's ready buttons light their plate). |
| `horn-lit` | The War Horn has its own painting, filled and glowing as it charges (`eidolonCall.ts`). The medallion would be a second, plainer horn. |
| `orb-silver` (an empty silver ring) | The spell orbs use the gold, bronze and lit ones; no spell state calls for a fourth. |
| `g-help`, `g-up`, `g-down` | No help (?) or move-up/move-down button stands in a menu or HUD. The ? marks in the game mean "unknown", not help. |
| `src/art/loading/demon-attack.png`, `knight-attack.png` | The old loading screen's attack rows. The painted keep (`last-keep.webp`) replaced that screen. |
| `src/art/calmap/planet_{red,blue,tan,white}.png` | The old Calamity islands' moons. The map's sky was repainted since. |
| `src/art/hall/summoner1.png`, `summoner2.png`, `fx_fire-flame.png` | The first summoning hall's pixel summoner and flame. The painted summoner (`summoner-active.png`) replaced them. |
| `src/art/fx/bone_arrow.png`, `hit_fire.png` | The first packs' skeleton arrow and fire hit. The painted effects atlases replaced both. |

The old pieces in the last four rows are credited already and harmless to keep. They could be deleted in a clean-up, but that is the
owner's call, so this branch keeps them.

## Checks run

- `npm run typecheck`: clean. `npm run web`: builds.
- `npm test -- painted-buttons ui-standard stall hester party shop`: 31 of 31 pass.
- The screens above at 393x852, 360x780 and 412x915, before and after, with 0 page errors.
