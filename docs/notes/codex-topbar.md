# CODEX-TOPBAR: the Castle's header over the Codex and the Achievements

The owner, with a shot from their phone (0.475.0, about 412 wide): "The top bar doesn't stay where it needs to on the codex and
achievements screen". They had opened the Codex from the Castle tab. The Codex's own head ("Codex", "‹ Back") was at the top, where it
belongs, but the Castle tab's header (the medallion, "The Keep", the rank bar, the Codex and Trophies buttons, the "Throne Hall" and
"Buildings" tabs) lay over the Codex's reward list part-way down the screen. The Achievements page (the trophy in the top bar) did
the same whenever it was opened from the Castle tab.

## The cause

The Codex and the Achievements are the home screen's full page, `#hmSub`: `position: absolute; inset: 0; z-index: 5` inside `#home`.

The Castle tab's remade header (`.crNavigation`, `castleRemake.css`, from the living Castle tab) is `position: sticky; top: 0;
z-index: 6`, so that the Castle's own content scrolls under it. Nothing between it and `#home` made a stacking layer: not its scroller
(`.crScroll`), not the tab's page (`.hmPage`), not `#hmPages`. So its `z-index: 6` was weighed against the whole home screen, where it
beat the full page's 5. The header was never moved: it stayed exactly where it sits on the Castle tab (just under the top bar, which is
"part-way down" a page that starts at the top of the screen), painted over the page above it, and it took the taps there too (a tap
on the Codex's reward list could land on the Castle's "Trophies").

It only showed from the Castle tab, because a tab that is not showing is `visibility: hidden`. No other tab has a z-index that high.

## The fix

`castleRemake.css`: `.crPage .crScroll` takes `isolation: isolate`. The Castle's scroller is now a layer of its own, the header's
z-index counts only inside it, and the whole Castle sits under whatever opens over the tabs. One line; the header itself, and how the
Castle scrolls under it, are unchanged.

(`isolation` on `#hmPages` would say the same for every tab at once, but the Castle's Trophies wall, `.twOverlay`, is a `position:
fixed` card kept inside the Castle's own page; a layer round all the pages would put it under the top bar and the tab bar. So the layer
goes round the scroller, where the sticky header lives.)

`#hmSub`'s own head was always right: the page is a column, the head does not scroll and `#hmSubBody` does. The check holds that too.

## The Codex's tabs

Six tabs in one row gave each about 52 px at 360 wide, and `overflow-wrap: anywhere` broke the words ("Bestiar / y", "Terrai / n",
"Legend / s"). The tabs now always stand in two rows: three and three, or four and three with the Assault's Holds tab (which already
did this). Labels keep to one line (`white-space: nowrap`) at the standard's 13 px display type (`codex.css`).

## The other pages

`tools/codex-topbar/check.mjs` opens, at 393x852, 360x780 and 412x915: the Codex from the Castle (top, scrolled, the Buildings view),
each of its tabs and an entry's sheet; the Achievements from every tab; the Castle's Trophies wall; Settings and the quest log from
every tab; the hero sheet, All heroes and Upgrade; the armies page, the Council board, the Daily and the enemy's plate; the Recruit
tab's View heroes, stall, Pacts and Summoner; a building's card. Over each it hit-tests a 10 px grid of the open page's box: every
point must land in the page, never in the tab beneath or the bars. It also checks that the Codex's and the Achievements' head stays
put while the content scrolls, that each Codex tab's label is whole on one line (with six tabs and with seven), that "‹ Back" closes
the page, and that the Castle's header is back at the top of the tab, tappable, afterwards.

Before the fix it fails on the Codex and the Achievements from the Castle (every size, every Castle position) and on the tabs'
labels; nothing else showed the fault. After it, every check passes.

```bash
npm run web && node tools/codex-topbar/check.mjs          # exits 1 on a failed check
SIZES=412x915 node tools/codex-topbar/check.mjs before    # one size; the word names the shots
```

Shots: `docs/samples/codex-topbar/` (`before-*` and `after-*`, each size): the Codex from the Castle at its top and scrolled, the
Codex's page scrolled, the Codex with six tabs, the Achievements from the Castle and from the Battle tab, the Trophies wall.

## Back

`#hmSub` is still the `BACK_LAYERS` entry it was (`backRules.ts`); nothing about how it opens or closes changed.
`tools/phone-back/check.mjs` passes.
