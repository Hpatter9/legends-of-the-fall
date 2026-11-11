# Armies swipe: only the card slides

The owner: "in the armies tab, just the army card should swipe and the info changes under it after it moves. also make sure the left and
right buttons look right".

Pictures: `docs/samples/armies-swipe/` (`before/` and `after/`, at 393 x 852, 360 x 780 and 412 x 915). The check:
`tools/armies-swipe/shots.mjs`.

## How it was

The Armies page (Battle tab, **Choose your battle**; `src/armiesView.ts`, the War Room of `army-war-room.md`) was a row of whole pages, one
an army, scrolled sideways with scroll-snap. Each page held the room's painting, three banners (the army and its two neighbours) and that
army's information. So a swipe moved everything: the room, the title, the banners and the whole information panel
(`before/mid-swipe-*.jpg`).

The two arrows were not a pair (`before/arrows-*.jpg`). The War Room's sheet gave them a box, a border and a background of its own. That
rule outranked the painted chevron for the left arrow, so the left one showed a small dark "‹" in a box, and the right one its gold orb in
the same box. They sat in the room's bottom corners, not beside the card.

## How it is

- **The room stays still.** The painting, "THE WAR ROOM / Armies", Back, the arrows and the dots do not move.
- **One card, in a window.** The army's card is its boss's painted keepsake on a banner, with its name and its stars (a sealed army: what
  opens it and how far along that is). The cards stand in a strip inside a window between the two arrows (`.asTrack`, `.asStrip`); only
  the strip moves, by a transform. The window stops short of the arrows, so a card never slides under one, and its edges fade.
- **The card follows the finger.** A touch anywhere on the room that goes sideways takes the card with it; one that goes up or down is
  left to the page. Pulled before the first army or past the last, the card drags stiffly and springs back.
- **Where it settles** (`settleOn`): let go past half of the window's width, on the army beside it; short of that, back where it was. A
  flick (0.5 px a millisecond or faster, over at least 24 px) also turns it, as a flick turned the old page.
- **The information changes after the card rests** (`infoArmy`). While the card is dragged or sliding the panel shows the army it showed.
  Once the card has settled on another army, the new army's panel fades in over the old one (160 ms) and the old is removed. A card that
  sprang back changes nothing.
- **No jump in height.** The information is one well in a host that takes the rest of the page (`.asInfoHost`); the well fills it and
  scrolls inside, so the host is the same height for every army and the tab bar under it never moves.
- **The arrows and the dots do the same move**: the card slides to the army, then the information changes. Taps in a row go on from the
  army the card is heading for.
- **Reduced motion**: nothing slides and nothing fades. The card does not follow the finger; a swipe of 40 px or more, an arrow or a dot
  swaps the card and the information at once.
- Back and the popup guard are untouched: Back is the same button in the same place, and the page raises no popup.

## The arrows

- The painted chevron orbs from the painted buttons' set (`ui/buttons/g-back.webp` and `g-right.webp`, mirror images of each other): no
  new art, nothing drawn in code.
- Both 44 x 44, 8 px in from each edge, centred on the card (they stand in the card's stage, `.asStage`, at half its height).
- Clear of the card at every size: the card's window ends where the arrows begin.
- Pressed: the orb sinks (to 88%) and lights; with reduced motion it only lights. A pressed button's general rule sets a whole
  background, which took the left orb away while held: the press names its picture again.
- At the first army the left arrow is dimmed and off, at the last the right one. They are dimmed, not hidden, so the pair stays even.
- The rules are in `paintedButtons.css` (still the last sheet), and name the War Room so its sheet cannot outrank them again; the War
  Room's own box for them is gone.

## The dots

The War Room had hidden the page's dots. They are back under the card as small round pips (gold for the army showing, dark for a sealed
one), since the neighbours' banners no longer show where you are in the list. A tap on one goes to its army.

## The rules (`src/armySwipeRules.ts`, `test/armies-swipe.test.ts`)

Pure, no DOM: `swipeAxis` (a swipe or a scroll), `dragShift` (how far the card is drawn for a drag), `settleOn` (the army a drag settles
on), `stepTo` (an arrow or a dot, kept on the list), `infoArmy` (the information's army: unchanged while the card moves), `arrowsAt` (which
arrow is off).

## For the owner to decide

1. **The neighbours' banners are gone.** The War Room showed three banners (the army and the one on each side). With the card alone
   sliding, and an arrow on each side of it, there is one larger card and the dots. If the neighbours should peek in at the sides again,
   say so.
2. **A flick turns the card** though it is short of half-way. A slow drag short of half-way always springs back. If only half-way should
   count, set `FLICK_SPEED` out of reach.

## Run

- `npm run typecheck`: clean.
- `npm test` (the full suite): 3,249 pass, none fail.
- `npm run web`: builds.
- `node tools/armies-swipe/shots.mjs`: 48 checks pass (16 at each size): the arrows' size, mirror, centring, clearance and pressed
  state; a short drag moves the card and not the information, and springs back; half-way held, the information is unchanged; past
  half-way, the card settles and the information changes, the host's place and height the same throughout; an arrow waits for the card;
  the first and last army; reduced motion; Back.
