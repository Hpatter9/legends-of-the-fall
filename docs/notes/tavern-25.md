# TAVERN-25: the new heroes' tavern sheets, and three paintings wired

Branch `claude/tavern-25`, from main 0.432.0. Two jobs from the director.

## 1. Prompts for the 25 new heroes' tavern sheets

`docs/notes/tavern-25-art-prompts.md` has two prompts.
- **Prompt 1** is one ChatGPT task for all 25 sheets: branch `art/tavern-25`, `art-source/tavern-life/heroes/<key>.png`, PR "Tavern life: the new heroes". If one task can't hold them all, it does the 20 and then the five Mythics as a second commit.
- **Prompt 2** is short: two props, Carmilla's wine glass (`goblet`) and Tenzin's river stone (`pebble`). Same chat, same branch.

The prompts group the 25 by activity, using the tavern's existing activities: leaning (5), cleaning a weapon (3), drinking (2), a hot cup (3), flipping a coin (3), a little magic (4), tinkering (3), cheering (1) and eating (1). All 25 already had a spot, an activity and a reason in `LIFE` (`src/render/tavernLife.ts`) and `SPOTS`. Their spots are all standing spots, so none of the sheets has a seat.

Changes to the data:
- Vael now conjures a tiny eclipse (`conjure`, fire), where before she leant.
- Astrax now turns a mote of starfire over one claw (`conjure`, star), where before it leant.
- Orrun now carves a stone talisman (`tinker`, spark), where before he leant.
- A `prop` field on `Life` puts a wine glass in Carmilla's hand in place of the tankard. It also makes Tenzin's flip throw a river stone in place of a coin, which still holds once his sheet lands.
- `LIFE_PROPS` and `bring.py`'s `PROPS` gain `goblet` and `pebble`, with a few code-drawn pixels of each until they are painted.
- Tinkering with the spark tint now gives off sparks in place of zaps. This affects Corvus's censer and Orrun's carving.

**It drops in by key.** `bring.py` takes any `heroes/<key>.png`. The pixel tavern looks up every name in `ALL_HEROES` through its glob (`urlOf`), so no code change is needed when the art lands.

**The live tavern is a different one.** Since 0.392.0 the Heroes tab is the painted tavern (`src/paintedTavern.ts`), and its paintings already cover all 70 heroes (`src/art/tavern/guests/`). The pixel tavern these sheets are for is still in the code, but nothing creates it. Twelve of the first 45 also have no sheet: arcBlade, beastmaster, dragoon, gunslinger, illusionist, kunoichi, lancer, sage, satyr, timeWitch, wizard and wolfBard. Their brief is `tavern-art-prompt.md`.

## 2. Three paintings from PR #464, wired

- **The duel's ring** (`boardView.ring`):
  - `tools/expansion/duel-ring.py` cuts `duel-ring.png` into its twenty stones (a corner and four along each side), makes their alpha hard, and shrinks them to the board. The result is `src/art/duel/ring-stones.png` plus `.json`, which gives each stone's frame, foot and place.
  - The stones are drawn half as big again as the painting's own scale. At that scale they were lost among the graveyard's boulders.
  - Each stone stands between two of the edge's tiles, so none stands in a fighter's way. It stands on the highest ground it touches (the board isn't flat), and it is drawn in the fighters' depth order: a stone on the near side stands in front of the edge's fighters, one on the far side behind them.
  - The ring's floor keeps a faint gilt so the ground reads. The brass outline is gone. It still shows if the stones' art hasn't loaded.
- **Hester's table and the Elders' table** stand in the painted tavern:
  - `tools/expansion/tavern-tables.py` trims both. It takes Hester's back to its own 192 x 128 pixels; the Elders' table is already at its own pixels. They are drawn crisp (`image-rendering: pixelated`), lightly warmed to the room.
  - Hester's table stands in the near corner below the bar, and a tap opens her stall. It glows gold while there is new stock or a trader visits, as the shop button does.
  - The Elders' table stands before the hearth, by the ghosts of the House, and a tap opens the Elders' table. It shows only while the Elders' button does.
  - Both are buttons with labels, and the buttons under Tavern services are unchanged.
  - There was no big painted stall to replace: that was the pixel tavern's (`hester-stall.webp`), which the Heroes tab no longer shows.
- All three are bundled into game.js, so the service worker's list is unchanged. They are credited in `CREDITS.md` (Expansion art 2).

## Checks

- `npm run typecheck` and `npm run web`.
- `npm test -- tavern duel hester elders ui-standard`: 54 of 54 pass.
- `node tools/tavern-25/shots.mjs` writes `docs/samples/tavern-25/` at 393x852, 360x780 and 412x915:
  - `ring-*`: the duel's fight in its ring.
  - `tavern-*`: both tables in the room.
  - `stall-*`: Hester's table opens her stall.
  - `elders-*`: the Elders' table opens its card.
  - `services-*`: the buttons are still there, and the Elders' button still opens its card.
- No page errors.

## Not sure about

- Hester's table is plainly pixel art in a painted room, so it sits a little apart from the painting. The Elders' table, smaller and further back, sits better. If the owner wants it to match, a painted version for the painted tavern would need a new prompt.
- The stones were made bigger by eye (`STONE` in the cut tool).
