## BATTLE-HUD: mock-ups of a richer fight bar (awaiting the owner's pick)

The owner asked for more detail on the fighters at the bottom of the fight screen: each hero's name, health, mana or stamina, its two skills
by name with cost and cooldown, an ultimate gauge that fills behind the hero as a pearlescent glow, a tap on a skill's name for more about it,
a better look when a skill goes off, and the king's spells moved elsewhere. Three trial layouts are built in the real game behind an address
flag; **without the flag nothing changes** (the hero bar, `heroBar.ts`, is as it was). Not a finished build: the owner picks one first.

- **Flag:** `?hud=a`, `?hud=b` or `?hud=c` (`hudVariant()`); the page sets `body[data-hud]`.
- **Files:** `src/hudMock.ts` (the `HudMock` class), `src/hudMock.css` (added to `build.mjs`'s CSS list), small hooks in `src/main.ts`
  (built beside the hero bar at the fight's start, refreshed each frame, given each tick's events, and the fight held while a skill's sheet
  is open: `hudMock?.holding` beside `sceneHold`). `tools/battle-hud/shots.mjs` takes the screenshots.
- **What every layout shows:** name; health and pool bars with numbers; skill 1 and 2 chips (the name, the cost, a pack icon from the Pixel
  Effects atlas in the skill's element, an element-coloured edge, a cooldown sweep from the kit's gap since the last cast, a thin line filling
  towards the cost; greyed while it cannot be paid, grey and "Lv 10" while locked); the ultimate's meter as a pearly gradient (pink, cyan,
  lilac, gold, mint) rising behind the card, its colours drifting, brighter the fuller it is; full, it brightens, a sheen sweeps across it and
  the card says TAP (a tap fires it through `orderUltimate`, as now). Every name, cost and gap is read from the kit data (`heroKitOf`,
  `costOf`, `RES.GAP_*`, `slot.gap`), so renamed skills show their new names.
- **The skill's sheet:** a tap on a chip opens what it does (`skill.text`), its cost (and blood cost), cooldown, strength (`tune`) and cast
  time, and its tier versions (`TIER_SKILLS`: the tiers reached are lit, the current one marked "now"; for the other skill, "Tier 3 and up:
  costs 15% less"). **Proposal: pause**, not slow: the fight is held while the sheet is open ("Fight paused · tap outside to resume"), so a
  read never costs a hero.
- **The cast moment:** the card lights in the skill's element colour (`GLOW[skillElement(key)]`) and the skill's name rises over it; the chip
  that went off lights up. A: plus a trail drawn from the card to the hero on the board. B: plus a cut-in banner (portrait, name, skill) by
  the caster. C: both. Eased in and out, nothing blinks; with reduced motion the trail is skipped and the rest holds still. (The pearl's
  drift and the sheen move position only, so `no-flicker.test.ts` holds.)
- **A, five tall cards:** skills under each portrait; the king's spells on a rail at the right edge above the bar (Auto, mana, three spell
  tiles). Visible board +41 px at 393x852. Skill names wrap to two lines on the narrow cards (a long one breaks mid-word at 360 wide).
- **B, five rows:** portrait, name and bars, two wide skill chips; the glow fills along the row. The spells fan out from a crown above the
  bar (its ring is the mana; Auto under it). Visible board -25 px (the only one that costs room).
- **C, chosen hero + mini row:** a full card for one hero (its skills and ultimate as three chips, a dial cooldown) over five small tiles; a
  tap on a tile chooses it, a second tap fires its ultimate. The spells are round orbs under the top bar with the mana beside them. Visible
  board +32 px.
- **Board room:** the visible board is the room between the top bar's row and the panel's top; today 533 px of camera area at 393x852
  with the panel's top at 649 px. A puts it at 690, B 624, C 681 (the same differences at 360x780 and 412x915). The camera's fit scale
  is unchanged in all (it is set from the deploy screen's panel).
- **Not covered yet:** the Last Stand's eight (a party over five keeps today's bar); the spell's drag-to-cast from the new homes works but
  dropping onto the rail itself casts at the tile under it; the sheet's layout for an ultimate opened from A or B (only C has an ult chip).
- **Screenshots:** `docs/samples/battle-hud-{now,a,b,c}-393.png` (and `-360`, `-412`), plus `-popover-393`, `-cast-393` and `-spells-393`
  for each layout.
