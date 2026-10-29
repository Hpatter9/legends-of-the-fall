## The hero bar hides a locked ultimate (HEROBAR-LOCK)

The owner: "In the battle screen, the units have LV 30 on them in the bottom section if they don't have the ultimate yet and that doesn't need
to be there. The bar for the ultimate doesn't need to exist until they have it unlocked."

**What changed.** A hero below level 30 (`ULT_LEVEL`) has no ultimate yet (`ultimateOf(u)` is null). Its tile in the fight's hero bar used to
show the empty ultimate ring, a "Lv 30" plate over the portrait, and a dimmed portrait. Now it shows none of that: the ring's SVG is not drawn,
there is no plate, and the portrait is not dimmed. The portrait grows to fill the ring's 44px place (34px in the two-row bar) inside a plain
brass frame (the tile's own border colour), so the tile keeps the same shape and height as an unlocked hero's, with no gap where the ring was.
A tap on such a tile no longer shakes it (there is no meter to point at); its title and aria label are just the hero's name. An unlocked hero's
tile is unchanged: the violet ring fills, glows gold and says TAP when full, and turns while queued.

The Last Stand's pause sheet (`standView.ts`) listed "★ <ultimate>  Lv 30" under a hero without it; that line now shows only once the ultimate
has unlocked (skill 2's "Lv 10" there is left as it was). The board's own small bars over each fighter (`render/unitView.ts`) already drew the
ultimate sliver only once it had unlocked. The deploy bench shows the hero's own level, not the ultimate lock, and is unchanged; the Heroes menu's
"Unlocks at level 30" in a hero's skill list is a description, not the fight UI, and is unchanged.

**Where it shows.** The one `HeroBar` class serves every fight: ordinary fights and the daily (`#heroBar` in `main.ts`), the Calamity (the
two-row bar), and the Last Stand's own tray (`.stHeroes`).

**Files.** `src/heroBar.ts` (`refresh`: no plate when locked; the tap skips the nudge), `src/battleUi.css` (`.hb.locked`), `src/standView.ts`
(the pause sheet's ultimate line). Render only; no sim change.

**Checks.** `tools/herobar-lock/shots.mjs` (after `npm run web`) boots a save with a mixed party (knight 34, paladin 31, samurai 30; the rest
below 30), runs an ordinary fight, the daily, the Calamity and the Last Stand at 393x852, 360x780 and 412x915, and checks no tile shows a "Lv"
plate, locked tiles have no ring, unlocked ones keep it, a tap on a locked tile does nothing, and the tiles share a height. (The Calamity's test
save is a run whose own heroes are all below 30, so its shots show only locked tiles.) `tools/kits/shots.mjs`'s locked check now expects no plate
and no ring. Shots: `docs/samples/herobar-lock-*.png`.
