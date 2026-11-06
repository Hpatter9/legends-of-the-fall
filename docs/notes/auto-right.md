# Auto right of the spells (AUTO-RIGHT)

The owner's words: "The auto spell button should be to the right of the spells. This way the boss health bar doesn't get pushed so far
down. It's in the way."

## The cause

The fight's spell row (`#hudSpells`) holds the War Horn (once an Eidolon is bound), the mana box, up to four spell orbs and the Auto switch
(`FightHud.autoEl`). With the horn and four spells it was 378 px wide (horn 46 + 2, mana 62, four 48 px orbs with 4 px gaps, Auto 50 + 2,
and the gaps between), more than the 344 px a 360 phone has and the 377 px a 393 one has, so it wrapped (`flex-wrap: wrap`, BOSS-BAR) and
Auto dropped to a second line under the horn. The boss's bar is laid out under the row's measured bottom (`placeTopHud`, `main.ts`), so it
went down with it: 52 px lower than with one line.

## The fix: one line at every size

The row is sized to fit on one line at 360 across with everything in it (336 px), and no longer wraps:

| Part | Before | After |
|---|---|---|
| War Horn | 46 px, 2 px margin | 44 px, no margin (its art 42 px) |
| Mana box | 62 px wide | 54 px wide (the word, the bar and the number as before) |
| Spell orbs | 48 px, 4 px apart | 44 px, 3 px apart (the icon zoomed 0.55 rather than 0.6) |
| Auto | 50 px, "AUTO", the switch and "ULT+SPELL" in 9 px | 44 px, upright: "AUTO" over the switch |
| Gaps in the row | 4 px | 3 px |

- Every tap in the row stays 44 px or more (the orbs, the horn and Auto), and every word in it 11 px or more ("ULT+SPELL" was 9 px; what
  Auto covers is still in its title and its label, "Auto: ultimates + spells").
- Auto keeps its brass rim and green lacquer (gold when on), the mana its frame and the orbs their gold rings: the look is the same, only
  tighter.
- The wrap path is gone: `#hudSpells` is `flex-wrap: nowrap`, its parts `flex: none`. `placeTopHud` still measures the row's real bottom,
  so the bar follows it if a part ever grows.
- The Last Stand's own row (`#stand .stOrbs`) is not changed, except that its Auto is the same slimmer switch.

## Quips on a short phone

The probe's 360x640 cases found a quip's bubble on the tactic button, on main as well (8 on main at 0.375.0, 2 left after the row change; `claude/boss-bar-auto`, merged here, had its own fixes for these too: a fading bubble set clear, and a bubble with no clear spot steps off):
with a toast in the lane there is no row between the lane and the button tall enough for a bubble. Two changes in `quipView.ts` and
`main.ts`:

- A bubble with no clear spot above or below moves sideways just clear of a part (beside the tactic button, for one); a move up or down is
  still tried first. With no clear spot at all, the line is let go rather than laid on the HUD (`keepClear` returns `null`).
- The top parts' watcher (`watchTopHud`) also watches the hero panel and the tactic button, so a bubble said at the deploy is set clear
  again when the panel changes size or the button comes in as the fight begins.

## The probe

`tools/combat-hud/probe.mjs` now also fails a case when Auto is not on the orbs' line to the right of the last orb, runs past the screen's
edge, or a tap in the row (Auto, the horn, an orb) is under 44 px, and prints each boss case's bar top.

## Before and after (the boss cases, `KITS=boss`)

The boss bar's top, in px from the top of the screen:

| Case | Before (0.375.0) | After |
|---|---|---|
| 393x852, army, 4 spells + horn | 200 | 148 |
| 393x852, Nivra's trial, 4 spells + horn | 200 | 148 |
| 393x852, Calamity, 4 spells + horn | 217 | 165 |
| 360x780 and 360x640, the same three | 200 / 200 / 217 | 148 / 148 / 165 |
| 393x852 with a 24 px inset, the same three | 224 / 224 / 241 | 172 / 172 / 189 |
| 412x915, and every case without the horn or with fewer spells | 148 (165 in the Calamity) | the same |

So the bar sits 52 px higher wherever the row used to wrap, and right under one line everywhere. The old build, measured by the new probe,
fails 12 cases with Auto off the orbs' line (and has a quip on the tactic button at 360x640); the new one fails none.

Shots (2x, 256 colours): before is BOSS-BAR's `docs/samples/combat-hud/bossbar-after-<case>-boss-<w>.png` (the row as 0.375.0 draws
it), after is `autoright-<case>-boss-<w>.png` (`<w>x640` for the short phone, `<w>s` for the inset). The owner's case:
`bossbar-after-5-4sp-horn-boss-393.png` (Auto under the horn, the bar at 200 px) against `autoright-5-4sp-horn-boss-393.png` (Auto right
of the fourth orb, the bar at 148 px).

## Checks

- `npm run typecheck`, `npm run web`.
- `npm test -- hud boss fight` (62 pass), `npm test -- hud boss fight quip toast ui-standard` after the merge of `claude/boss-bar-auto`
  (111 pass), and the full `npm test` (2537 pass).
- `KITS=boss node tools/combat-hud/probe.mjs --shots autoright`: every boss case at all five sizes, 0 overlaps, Auto on the line.
- The full probe (`node tools/combat-hud/probe.mjs`, after the merge): every case at all five sizes (85), 0 overlaps.
