# Menus and extras

## 1. A check on the daily
Once today's daily is done, its camp signboard (`home.ts`) shows a green pixel check tile on the corner (`i.dailyDone`, in
`pixel.css`) and the line "done today", instead of the red badge. A new daily keeps the badge.

## 2. Flicker pass
Method: Playwright at 393x852 (and 360x780), `document.getAnimations()` for every looping animation on each menu, a
MutationObserver for DOM rebuilt on a timer (none found: 0 mutations in 2 s on every menu), and 20 frames 100 ms apart
diffed pixel by pixel (home, armies, recruit, heroes, castle, spells, settings, achievements, tower). What was left once
the scene animations that are meant to move (camp folk, troops idling, torches) were set aside:

- **Armies carousel particles** (`.asP`): they faded in and out on an opacity loop under `steps(18)` and jumped between
  frames, so the little squares blinked. Now each mote moves a whole pixel at a time (`steps(480)` up or down, and a
  separate `asDrift` across), at one steady strength, and enters and leaves past the scene's clipped edge.
- **Armies fog** (`.asFog`): a `steps(50)` jump of a soft gradient; now a smooth ease (a soft gradient has no edges to shimmer).
- **Armies figures** (`armiesView.ts`): placed by percentage and `translateX(-50%)`, so scaled pixel art sat between
  pixels. `snapFigures` puts each canvas on whole pixels (left and bottom in px, no half-width translate).
- **Looping glint** on every gold button (`pxGlint`): now plays once when a button appears, not every 3.4 s.
- **Chest bob** on the camp's stash (`asChestBob`): `steps(2)` made 1.5 px positions; now a two-position, whole-pixel bob.
- **Castle "ready" arrow** (`ctbob`, eased sub-pixel bob of text) and **result stars** (`twinkle`, scale and rotate of
  text on a loop): held still.
- **Tower rest fire and "new best" line** (`rtFlame`, `rtGlowText`, `steps(2)` blinks): held still.
- Not touched: the camp, castle, tavern, hall and library canvases (integer scale, resized only on layout, cleared and
  redrawn in one task, no gap), sprite animations, and the one-shot chest opening (the flash stays small and brief).
- After the pass the only loops running on those menus are the camp chest bob, the armies motes and fog, and the tower
  torch sprite.

## 3. Loading screen
`#loading` in `index.html` is now a Knight against the Demon Lord on a dusk battlefield, pure CSS and DOM sprites: banded
sky, moon, two ridges, lava-lit ground, rising embers, the title and a "Loading" line with a marching bar. The two fighters
loop a 2.8 s duel on their own attack rows (stepped frames, whole-pixel lunges); a slash arc and an impact burst
(`moon_slash.png`, `impact.png` from the fx pack) and a few sparks play at each blow. Nothing fades or flashes full-screen.
`build.mjs` inlines the four small strips as data URLs (`tools/loading-art.py` cuts the two attack rows into `src/art/loading/`),
so it shows before the 14 MB `game.js` arrives; the page grew by about 85 KB and the game starts as fast as before.
Reduced motion shows the still pose. The title uses a system serif so no web font can swap under it.

## 4. First-clear chests
The first time an army is cleared on a tier it pays a chest into the stash, on top of the crowns and the star-milestone
chests: **Normal bronze, Hard silver, Elite silver, Legendary gold** (`FIRST_CLEAR_CHEST` in `armyStars.ts`; the silver and
gold ones also get the tier's own quality and crown tilt). `ArmyRecord.first` is a bitmask of tiers already paid;
`StashChest.first` marks the chest (told apart by its seed, like tower chests, so it never merges with a milestone chest of
the same size). The camp cart labels such a chest with its tier; the result screen says "First Hard clear!".
**Old saves:** no back-dated chests. On load, a record without `first` takes the tiers it has already cleared as paid
(Normal from `clears`, harder tiers from `hard[tier].clears`). Tests: `test/armyStars.test.ts` (the last two).

## 5. Ten new spells
All crowns-unlocked in the Chapel's book like the existing ones; powers 1 to 5 fit the budget (9, up to 11 with the Mage Tower).
Mana / cooldown / power / price:

| Spell | | Effect |
|---|---|---|
| Cleanse | 2 / 8s / 1 / 90 | heroes in a 3x3 lose burns, bleeds, curses, slows, holds, charms, and heal 15% |
| Blink | 3 / 12s / 2 / 110 | the most wounded hero leaps to the tapped free tile, untargetable 1.5 s |
| Hex | 3 / 10s / 2 / 130 | foes in a 3x3 strike 30% weaker for 8 s (`weakUntil`, reverted like Rally) |
| Light Lance | 4 / 9s / 3 / 140 | 85 raw to every foe in the tapped column |
| Renewal | 4 / 14s / 3 / 150 | 8% health a second for 8 s (the existing `hot`) |
| Deep Freeze | 4 / 12s / 3 / 170 | sturdiest foe in a 3x3 held 4 s and takes 30% more per blow (`brittleUntil`, hooked in `onStrike`) |
| Battle Cry | 4 / 14s / 3 / 180 | every hero's skill meter +40 (no tile) |
| Bulwark | 5 / 16s / 4 / 220 | every hero shielded for 30% of health, 6 s (no tile) |
| Call the Wolves | 5 / 20s / 4 / 240 | two Dire Wolves on free tiles in a 3x3; refused with no room; no XP of their own |
| Meteor Shower | 7 / 18s / 5 / 300 | five 55-raw meteors in a plus, 300 ms apart, each blasting a 3x3 (overlaps stack) |

Hooks: `Fall.power`, `Unit.weakUntil`, `Unit.brittleUntil`, the existing `blink` event, `addUnit`. Every spell has a
`SPELL_ELEMENT`, cast, touch, glow and sound entry (typed `Record<SpellId, ...>`, so a missing one fails the build), and a
pixel icon cut from the effects atlas (`spellIcons.ts`; the old spells got icons too, on the book's cards and the fight's
spell bar). Balance: the average mana cost stays about 4 (the old "two to six casts" test still holds); Lance beats Smite's
160 only against crowds, Shower's peak (110) equals a Meteor's but over a wide area for 7 mana. Tests: `test/spells-more.test.ts`.
