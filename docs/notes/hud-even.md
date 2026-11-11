# HUD-EVEN: the spell row across the whole screen, the tactic button in the Formation button's corner

Branch `claude/hud-even`, from main 0.482.0, with main 0.484.0 merged in. The owner: "Let's even out the spell bar across the whole screen. No gap that way. And move
the tactics button up to where the formation button usually is in between waves." The version is unchanged.

## 1. The spell row spans the screen

The fight's top row (`#hudSpells`: the mana box, the spell orbs, then the SPELL and ULT Auto buttons) was packed to the left, with what
was left over as a gap at the right (88 px at 393 with three spells, 233 px with one).

- **One evenly spaced line.** The row's pieces keep their size (the mana 54 px, an orb 44, an Auto button 48) and stand evenly spaced,
  the row centred, so the margin is the same at both sides. The groups that held the pieces (`#spells`, `#spellCards`, the Auto pair)
  step aside (`display: contents`, `src/fightHud.css`), so the mana, each orb and each button are spaced as equals.
- **The rule** (`spellRowGap`, `src/fightHudRules.ts`, pure and tested): the gap that spreads the pieces edge to edge is used when it is
  no more than 40 px (`MAX_GAP`); if it would be wider, the pieces stand close (24 px apart, `GROUP_GAP`) as one centred group. Never
  under 3 px (a full row at 360). The page measures the pieces as drawn and sets the gap (`laySpellRow`, `src/spellRow.ts`), at layout
  and whenever a piece comes or goes: an orb added, ULT's Auto showing once a hero has an ultimate (`watchSpellRow`, a MutationObserver
  on the pieces only, not on what changes inside one each tick).

What each count gives (the gap between pieces, px; "group" is the centred group at 24 px):

| Pieces in the row | 393 | 360 | 412 |
| --- | --- | --- | --- |
| mana, 4 orbs, SPELL, ULT (7) | 8, edge to edge | 3, edge to edge | 11, edge to edge |
| mana, 4 orbs, SPELL (6) | 19, edge to edge | 13, edge to edge | 23, edge to edge |
| mana, 3 orbs, SPELL, ULT (6) | 19, edge to edge | 12, edge to edge | 22, edge to edge |
| mana, 3 orbs, SPELL (5) | 35, edge to edge | 27, edge to edge | 40, edge to edge |
| mana, 2 orbs, SPELL, ULT (5) | 34, edge to edge | 26, edge to edge | (the same rule) |
| mana, 2 orbs, SPELL (4) | group | group | group |
| mana, 1 orb, SPELL, ULT (4) | group | group | group |
| mana, 1 orb, SPELL (3) | group | group | group |
| mana, ULT (2) | group | group | group |
| mana alone (1) | centred | centred | centred |

Edge to edge the margins are 8 to 10 px at both sides (the px lost to whole-number gaps are shared by the two sides). A save always knows
its three starting spells, so three or four orbs is what a player has: those rows always run edge to edge. The smaller counts are shown
for the rule's sake (the shots make them by taking orbs off the page).

## 2. The tactic button in the Formation button's corner

- **Where.** The Formation plaque in the deploy is at the board's upper right: 8 px from the right edge, y 96 to 167, 95 x 71 px. In a
  fight the spell row is at y 121 to 174, and now that it spans the screen its SPELL and ULT buttons stand exactly where that plaque was.
  So the two asks cannot both be met to the pixel. **What I chose:** the tactic button is a plaque in the same corner, with the same right
  edge, the same size (95 x 71) and the same plate, hanging just under the spell row (4 px under it: y 178 to 249 at every size, 82 px
  lower than Formation). The corner holds Formation while placing and the tactic in the fight; the hand-over is the same corner, one row
  down. (The other ways, if the owner wants a true swap in place: lower the Formation plaque in the deploy to that spot too; or keep the
  tactic at Formation's exact spot and stop the spell row short of it.)
- **How.** The button and its word left `#panel` for a fixed dock (`#tacticDock`, `src/tacticsView.ts`, `src/tactics.css`). The page
  sets its top from the spell row's real bottom (`placeTopHud`, `--dock-top`), so it moves down with the row under a twist's banner. It
  shares the Formation plaque's rules (`#formBtn, #tacticBtn` in `ornateMenus.css`, the painted plate in `paintedButtons.css`), and is
  made the same way: its icon, a small label ("Tactic"), the word in the display face ("Advance", "Hold", "Charge"). The old medallion's
  rules (`#panel .fhTactic`) are gone. Only in a fight; hidden in the Last Stand as before (`canChangeTactic`).
- **The boss's bar** is under the spell row too. It now stops 6 px short of the plaque (`bar.style.right`), so the plaque does not move
  when a boss comes; without the plaque it runs to 12 px from the edge as before. A duel's bar is the same bar and does the same.
- **Its word** after a tap rises just under the plaque, right-aligned with it (the boss's bar is at its left, the spell row above). The
  plaque itself now also names the tactic in full, where the medallion had only a small label.

## 3. The War Horn has the bottom-right corner

The horn (`#panel > .ehFight`) is at `right: 8px`, 10 px above the hero rows, alone (the rule for a horn beside the tactic button is
gone). 56 x 56 px, its looks and its tap unchanged. Its note opens above it, and the call's great horn rises out of it at the right edge,
turned to face the field, as HORN-RIGHT made them (`tools/horn-corner/shots.mjs`, re-run here, checks both).

## 4. The camera, the toasts and the quips

- The covers are the same selectors (`#hudSpells`, `#tacticBtn`, `#bossBar`, `#panel > .ehFight`), measured where they now are; the
  dock is watched for size (`watchTopHud`). The room is cut from the top to the plaque's foot and from the foot to the horn's top.
- **A corner cover hides a corner, not a band** (`isCorner`, `SAFE.CORNER`, `src/render/safeRectRules.ts`; the director's ask: "trim only
  what it truly hides, not a full-width band"). The room is a rectangle, so a cover in a corner used to cost a band across the whole
  room as deep as the cover. Now a cover against a side edge and no wider than a third of the screen (the plaque, the War Horn, the combo
  bar) is cut only half way into from the top or the bottom. The fight is centred and framed in the room with its own padding, so what
  can stand in that corner of the room is the far edge of the frame: at most 27 px of the room's corner lies under the plaque and 20 px
  under the horn. A bar across the top or the foot, and a column cut from the side, are cut in full as before.
- **The room, measured** (px tall; 0.482 is main before this branch, with the tactic button at the bottom):

| Size | 0.482, no boss / boss | HUD-EVEN, any wave | Change |
| --- | --- | --- | --- |
| 393x852 | 337 / 299 (y 182 or 220 to 519) | 335 (y 222 to 557) | −2 / +36 |
| 360x780 | 265 / 227 (to 447) | 263 (y 222 to 485) | −2 / +36 |
| 412x915 | 400 / 362 (to 582) | 398 (y 222 to 620) | −2 / +36 |

  Without the corner rule the plaque would have cost a full band: the room was 272, 200 and 335 px (65 px less than 0.482 with no boss).
  With it the room starts under the plaque's middle (which is where a boss's bar ends too, so a boss no longer changes the room) and
  ends at the horn's middle. A duel's room is taller than before (its foot was cut by the tactic button, which is now up beside the
  duel's bar): y 258 to 787 at 393, where it ended at 711.
- The action sits at the room's middle: within 6 px across and 5 px down in every case and size. (One duel reading at 393 in the full
  run was 12 px down: the shot caught the camera still easing. Three re-runs of that case gave 2, 3 and 5 px.)
- A toast's lane in a fight starts under the plaque too (`fightToastTop`), and a quip keeps clear of it (`FIGHT_HUD`).

## Checks (`tools/hud-even/shots.mjs`, shots in `docs/samples/hud-even/`)

`npm run web && node tools/hud-even/shots.mjs`, at 393x852, 360x780 and 412x915: the hand-over (the deploy with Formation, then the
fight), every count of orbs from none to four with and without ULT, a boss wave, the tactic's word after a tap, a twist's banner (shown
by hand: the modes with twists are hidden), and a duel. It checks: the gaps even to 1 px, the margins equal, edge to edge or a centred
group of four pieces or fewer, one line; the plaque out of the panel, on Formation's right edge, at Formation's size, under the row,
over no other part; the boss's bar short of it; the horn in the corner over nothing; the camera's room from the plaque's middle to the
horn's middle (corner covers); the action at the room's middle; the word under the plaque clear of it, the bar and the row. 651 checks,
no page error; 650 passed in the full run and the one duel reading above passed on each of three re-runs.
`ROOT=<a build of main> TAG=before` takes the "before" shots.

- `before-*`, `after-*`: `handover-deploy`, `handover-fight`, `spells-0` to `spells-4`, `spells-0-noult` to `spells-4-noult`, `boss`,
  `boss-word`, `twist`, `duel`, each at the three sizes, halved to one pixel a point (the `spells-*` shots keep only the top 300 px,
  where the row is).
- `tools/horn-corner/shots.mjs` no longer expects the tactic button beside the horn; `tools/cam-safe/shots.mjs` needed no change (it
  outlines `#tacticBtn` wherever it is).

## Tests

- `test/fight-hud.test.ts`: `spellRowGap` and `spellRowSpans` at the three sizes: three or four orbs run edge to edge, one or none stand
  as a group, a full row at 360 fits at 3 px, a row too full keeps the least gap.
- `test/safe-rect.test.ts`: the plaque and the horn are corner covers and each trims the room only half way into itself (63.5 px less
  than two full bands), a boss's bar beside the plaque is a bar and is cut in full, a cover as wide as a bar or away from the sides is
  not a corner cover, and the room stays centred across.
