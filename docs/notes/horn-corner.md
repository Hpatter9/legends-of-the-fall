# HORN-CORNER: the War Horn in the fight's bottom-left corner

Branch `claude/horn-corner`, from main 0.477.0. The owner: "Let's move the horn location in the battle screen. Bottom left seems free."
The version is unchanged.

## What changed

- **Where it is.** In an army's, the daily's and a quest battle's fight the War Horn is no longer the first thing in the spell row
  (`#hudSpells`). The same button (`HornView`, `.ehFight`, `src/eidolonCall.ts`) is now a child of `#panel` and rides on the panel's top
  edge at the left (`left: 8px; bottom: calc(100% + 10px)`, `src/eidolons.css`), exactly as the tactic button rides on it at the right. So
  it sits over the board's lower-left, just above the hero rows, however many heroes there are. It shows only in a fight
  (`body[data-phase='fight']`), as the row it left did.
- **Kept as it was.** Its paintings, the fill, the glow, the ready aura and sheen, the "Blown" look, the words on its foot, the motes on a
  gain, hidden until the first Eidolon is bound (`hornHeld`), the tap (a note while it fills, the confirm the first time, the blow), and
  put away in a duel (`body.inDuel .ehHorn`). Nothing in the sim changed.
- **A thumb target.** 56 x 56 px (it was 44 in the row); the art is 52 px. The words' pill is centred on its foot.
- **The note** a tap shows while the horn fills (`.ehNote`) used to open under the button. With the button in the lower half of the screen
  it opens just above it, so it never lies over the hero rows.
- **The call's cinematic.** The great horn that swings up as the call begins (`.ecHorn`) now starts on the button: small, at the
  button's middle, and it swings up to rest just above the button (`.ecHorn.fromBtn`, `--hx`, `--hy`). With reduced motion it only fades
  in, there, as before. The Eidolon's pass, the circle and the strike are placed from the board and the foes, not from the horn, and are
  unchanged. A horn in a top row (the Last Stand's) keeps the old place.
- **The camera.** The horn's corner is registered as a cover (`registerCamCover(HORN_CORNER)`, `'#panel > .ehFight'`, `src/hudClear.ts`).
  A button in a corner trims the room's foot, and the tactic button on the other side had already trimmed it to the same line (its top is
  10 px above the horn's), so the horn costs the fight no room. A toast and a quip keep clear of it too (`FIGHT_HUD`).
- **Phone Back.** Nothing to change: the button's element and class are the same, it is not a layer, and its confirm sheet is as it was.

## What else is in that corner (what I chose)

| Part | Where it is | Against the horn |
| --- | --- | --- |
| Tactic button and its word | on the panel's top edge at the right | the other corner; the horn mirrors it |
| Combo bar | left edge, under the top bars | far above; no overlap measured |
| Synergy column | not drawn (`display: none`) | nothing |
| Boss's bar, a duel's bar, a twist's banner, the phase banner, the auto-replay bar | the top of the board | nothing |
| The heroes' skill banners (`.fhCutStack`) | **the left edge just above the hero rows: the horn's corner** | they covered the horn. While the horn shows they come in beside it (from x 70, `eidolons.css`), stopping short of the tactic button; with no horn, and in a duel, they keep the edge |
| Formation button, the rune bench's pull bar, Fight and the deploy's buttons | deploy only | the horn shows only in a fight |
| The result card | over the whole screen | covers the horn, as it covers the tactic button |
| A duel | the spells and the horn are put away | no horn (unchanged) |
| The Assault | has no War Horn (it does not build an `EidolonCall`) | nothing to move; its Auto lever is not touched |
| The Last Stand (hidden) | its horn is still in its own orbs row (`.stOrbs`) | code untouched; say if it should move too when the mode returns |

One thing was already there: a hero's skill banner slides in at the left edge just above the rows. The horn was not stacked above the
banners (three of them would lift it 90 px up the board, over the fighters); the banners move beside it.

## The spell row

With the horn gone, the mana, four orbs and the SPELL and ULT buttons are one line at all three sizes:

| Size | Before (four spells and the horn) | After |
| --- | --- | --- |
| 393x852 | two lines, 105 px | one line, 53 px |
| 360x780 | two lines, 105 px | one line, 53 px (it no longer wraps) |
| 412x915 | one line, 53 px | one line, 53 px |

So at 393 and 360 the camera's room is 52 px taller at the top (it starts at 182, not 234; with a boss's bar 220, not 272).

## Checks (`tools/horn-corner/shots.mjs`, shots in `docs/samples/horn-corner/`)

`npm run web && node tools/horn-corner/shots.mjs` plays, at 393x852, 360x780 and 412x915: a beasts army's wave 5 with four spells and the
horn ready, charging (430/1000) and locked (no Eidolon bound: no horn), wave 8 with the Alpha Werewolf's bar, and a duel. It checks that
the horn is out of the row, is at least 48 px, sits in the bottom-left above the panel, lies over no other part, that a skill's banner comes in beside it and stops short of the tactic button, that the camera's room
ends above it, that the row is one line at 393 and 412, that the action's centre sits at the middle of the room, that the note opens above
the horn on the screen, and that the call's horn rises from the button's corner. `ROOT=<a build of main> TAG=before` takes the "before"
shots with the same script.

- `before-*` and `after-*`: `wave5-ready`, `wave5-charging`, `wave5-charging-note`, `wave5-locked`, `wave5-call`, `wave8-ready`, `duel`,
  each at the three sizes.
- The action against the middle of the room, after: within 2 px across and 6 px down at every size and case (before: within 9 and 6).
- The shots in the repo are halved to one pixel a point to keep them small; the script takes them at two.
- `tools/cam-safe/shots.mjs` now finds the horn wherever it is and outlines its corner as a cover.

## Tests

`test/safe-rect.test.ts`: the horn's box in the bottom-left trims the room's foot (not a strip down the side), costs no more room than the
tactic button already did, and is among the camera's covers and the parts a toast keeps clear of.

## HORN-RIGHT: the horn moves to the bottom right (after 0.480.0)

Branch `claude/horn-right`, from main 0.480.0. The owner, having seen the bottom-left: "Let's move the horn again. Maybe we make it bottom
right then." The version is unchanged. Everything above still holds except where the horn stands; this section says what changed.

### The pair: the horn just left of the tactic button, on the same line

Two layouts were weighed against the measured boxes (the tactic button is 58 x 66 px, 10 px above the panel, 8 px from the right):

| Layout | The pair's box over the board | The camera's room | The right thumb |
| --- | --- | --- | --- |
| Horn above the tactic button, right-aligned, 6 px gap | 58 wide, 128 tall: it stands 138 px above the panel | the foot is cut 62 px higher (at 360 the room is only 265 px tall: it would lose near a quarter) | the horn is the higher of the two, a longer reach |
| **Horn left of the tactic button, same line, 6 px gap (chosen)** | 120 wide, 66 tall: no taller than the tactic button alone | **unchanged**: the tactic button had already cut the foot to that line | both on the bottom line; the horn a thumb's width further in |

The side-by-side pair hides less of where the fight is (the board's lower-right corner strip is cliff and trees in most layouts, and the
fighters stand above it), costs the camera nothing, and keeps both buttons on the line the thumb already rests on. Stacked, the horn would
stand over the right-hand fighters and the camera would have to back the fight away from it.

- `#panel > .ehFight`: `right: 72px; bottom: calc(100% + 15px)` (`src/eidolons.css`), so it is centred on the tactic button's height. With
  no tactic button it takes the corner itself (`right: 8px`).
- 56 x 56 px, the paintings, the fill, the ready, charging and blown looks, hidden until an Eidolon is bound, hidden in a duel, the tap: all
  as before.

### What moved with it

- **The skill banners** are back at the left edge, as before 0.480 (the rule that set them beside the horn is gone). At their widest
  (200 px, or 56 % of the screen) they stop short of the horn at every size (at 360 the horn starts at x 232).
- **The tactic button's word** ("Hold", "Advance", after a tap) used to rise just left of the button, where the horn now is. While the
  horn shows it rises over the button instead (right-aligned with it, 4 px above). With no horn, and in a duel, it is where it was.
- **The note** by the horn opens above it, kept on the screen (it ends at the right edge at 360).
- **The call's cinematic**: the great horn rises out of the button and rests just above it against the right edge, turned to face left
  (`--sx: -1`), so it is blown across the field. From a button on the left it would still face right.
- **The camera's cover** (`HORN_CORNER`, `'#panel > .ehFight'`) and the toasts' and quips' clear area (`FIGHT_HUD`) are the same selector,
  so they follow the button. The room is exactly what the tactic button alone leaves.

### The right side in every state

| State | What is there | Against the horn |
| --- | --- | --- |
| A fight, a boss wave | the tactic button; the boss's bar at the top | 6 px between the horn and the button; nothing else |
| The tactic button tapped | it cycles the order (no menu in a fight) and shows its word | the word rises over the button, clear of both |
| The deploy | the Formation button under the top bar, the rune bench's pull bar in the bench | the horn is not drawn outside a fight; the bench is not drawn in one |
| A duel | the tactic button | the horn is put away |
| The result card | over the whole screen | covers both |
| The Last Stand (hidden), the Assault | as before | untouched |

### Checks

`tools/horn-corner/shots.mjs` now checks the right corner: the horn beside the tactic button with a gap and no taller than it, over no
other part, the skill banners at the left edge and short of the horn, the camera's room ending exactly where the tactic button alone cut
it, the action at the room's middle, the note on the screen above the horn, the call's horn rising at the right, and the tactic's word
clear of the horn and the button. Shots in `docs/samples/horn-right/` (`before-*` is main 0.480.0 with the horn at the left), the same
cases as above plus `wave8-tactic-word`, at 393x852, 360x780 and 412x915, halved to one pixel a point.

`test/safe-rect.test.ts`: the horn's box beside the tactic button leaves the room as the button alone does; alone in the corner it still
trims the foot, not a strip down the side.

