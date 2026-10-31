# The Sanctum tidied: the Summoner's stale plaque, and the room uncovered (SANCTUM-TIDY)

Two owner asks about the summon screen (the Summoning Sanctum, `src/hall.ts`). Branch `claude/sanctum-tidy` (from main 0.289.0).

## 1. "I already bound the Cinderhound but the message is still on the summon screen"

**The cause was CSS, not the save.** The Summoner's plaque (`.hlChain`) and the Pact Gallery's button (`.hlGallery`, both in
`eidolonChains.css`) set `display: flex`, and neither had a `[hidden]` rule, so `hidden` did nothing to them. The rules were right:
`hallPlaque` gave nothing after the binding, `summonerWaiting` was false, and the Recruit tab's dot cleared. But the page still showed the
plaque with the last words written into it ("Bind Askel, the Cinderhound · Every piece is on the altar · 3 of 3"). After a reload it
showed as an empty brown bar over the shards' scroll, because the plaque was hidden before anything was written into it. The same
missing rule showed the Pact Gallery's button on a save before any chain.

Reproduced in the browser (`tools/sanctum-tidy/flow.mjs`: a save with Askel's three pieces in, the plaque tapped, the binding played
through with its horn card, the gallery closed, then a reload). Before the fix the plaque still read "Bind Askel…" after the binding and
was an empty bar after the reload (`samples/sanctum-before-bound-flow.png`). After the fix nothing shows and the dot is off
(`samples/sanctum-after-bound-flow.png`).

- **The fix:** `.hlWrap [hidden] { display: none !important; }` in the hall's CSS, so nothing the Sanctum hides can be shown again by a
  class's own `display`.
- **Old saves already bound** need no repair: their save was right all along (the chain marked `bound`, Askel in `eidolons.bound`), so they
  show nothing from the first load. A test loads one as an earlier release wrote it.
- **After the binding, while Nivra's chain is unwritten** (its `parts` are empty), the Summoner shows nothing: no plaque, no dot. Once the
  next chain is written and its opening holds, the plaque offers it again ("The Summoner beckons · tap to listen").
- **The plaque's words are pure now:** `hallPlaque` moved from `eidolonChainView.ts` (which re-exports it) to `sim/eidolonChains.ts`, so
  `test/hall-plaque.test.ts` can say what the Summoner shows through the chain, for a bound save, after a reload, for a save bound some
  other way (the dev flag, the chain part-way), and that every row stays short.

## 2. "The shop and Pact Gallery should be small buttons at the top left"

- **The corner** (`.hlCorner`, inside `.hlHead` under the heroes' ledger, top left): the chest shop (the stone icon, "Shop") and the Pact
  Gallery (the horn, "Pacts") as 54 x 52px buttons with a label under the icon. Each has its full name as `title` and `aria-label`
  ("Chest shop: buy stones with crowns", "Pact Gallery: the Eidolons bound"). The gallery shows only once the chains have begun, as before
  (`chainsShown`). Their old row over the summon buttons (`.hlRow2`) is gone.
- **The plaque is one short row** (title and line side by side, 13px and 11px, at least 44px tall, slightly see-through), with shorter
  words: "The Summoner beckons · tap to listen", "Askel · 1 of 3 pieces · Part 2: The Kennel Fires", "Bind Askel · every piece is on the
  altar". It may wrap to two lines at 360 wide.
- **The shards' scroll folds** to one row (Hero shards, the nearest hero, the count and ▾) over its bar. A tap on the row (`.hlFold`,
  `aria-expanded`) opens the hint and the pity and lucky lines, and a second tap folds it again. The choice is kept in the browser
  (`localStorage` `lotf-hall-open`, read safely; folded at first).
- **Tap targets:** "View heroes →" is 44px tall now (it was 32), with the ledger's padding taken in to match. Every button on the page is at
  least 44 x 44.

**What covers the room** (the lower panel's height, measured up from the bottom of the Sanctum by `shots.mjs`): at 393x852, **153px**
with no chain going (206px with the plaque), against about 310px before (the plaque, the full scroll and the shop row, estimated from
`sanctum-before-going.png`). At 360x780 it is 140px (191px); at 412x915, 153px (206px). The altar, the rings, the stained glass and the Summoner are now in view.

## Files

`src/hall.ts` (the corner, the fold, the CSS), `src/eidolonChains.css` (the plaque's row, the gallery's corner look), `src/sim/eidolonChains.ts`
(`hallPlaque`), `src/eidolonChainView.ts` (re-exports it); `test/hall-plaque.test.ts`; `tools/sanctum-tidy/shots.mjs` (three saves, bound,
going and fresh, at the three sizes, checking the plaque, the dot, the corner, 44px targets and no sideways overflow, which they now read
from what is really visible) and `tools/sanctum-tidy/flow.mjs` (the binding played through). Screenshots `samples/sanctum-before-*.png`,
`samples/sanctum-after-*.png` (`-360`, `-412` for the other sizes; `-open` with the scroll opened).
