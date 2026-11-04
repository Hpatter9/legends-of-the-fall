# The painted equipment icons

The heroes' equipment is shown with the owner's painted icons instead of the 16x16 DawnLike tiles, wherever equipment is drawn:
the hero sheet's three slots, the picker (what is worn and the spare pieces), the gear sets' combine list, a chest's reward cards,
the wave report's gain chips and the Calamity clear card. All of them go through one function, `itemIcon` in `src/equipView.ts`,
so the unit info card or any later screen that uses it gets the paintings too. The run's own simple gear (the road's `weapon1..3`
tiles) and the relics keep their pixel icons: they are not equipment bases and have no paintings yet.

## The art

`art-source/gear/` (merged from `art/gear-icons-2`, PR #242): `weapons/`, `armour/`, `trinkets/` each hold `<id>.png` (the standard
painting, used for Common to Legendary) and `<id>-mythic.png` (the Mythic relic) for the 60 bases of `src/sim/equipBases.ts`, 256 x
256; `grade/glow-rare|epic|legendary|mythic.png`; `wear/` (the wear overlays and the repair and selling buttons, not used yet: the
wear and shop systems are not built). From the closed first set (`art/gear-icons`, PR #241) only the pieces a review passed are kept:
`grade/frame-common|rare|epic|legendary|mythic.png` and `wear/badge-worn.png`, `badge-broken.png`, `durability-bar.png`,
`repaired.png`, `buy-back.png`.

## The import: `tools/gear/import-gear-icons.py`

Run it whenever the paintings change (about three minutes; `--contact <png>` draws every painting with what it dropped in red).

- **Stray bits.** The paintings were cut from larger sheets and many carried a piece of the neighbouring painting at an edge (under
  the mail shirts, breastplates, staffs, bows, the headsman's axe, the lyres and bells...). The visible pixels (alpha over 8) are
  split into islands; one that is not the largest, is under 30% (`STRAY`) of its size and reaches the outer edge of all the
  painting's pixels is dropped. A second pass does the same with only the solid pixels (alpha over 64, `SOLID`), for a bit joined
  to the painting by faint glow (under the lamellar, the Mythic boots, the Mythic amulet). Sparks and motes inside a Mythic's glow
  don't reach that edge and stay. 78 of the 120 paintings lost a bit (some only a few pixels); all 120 were checked by eye on the contact sheet afterwards.
- **Re-centring.** The standard and Mythic of a base are scaled and centred together (one box round both, so they still swap in
  place) to fill the square inside a 6% margin. Many were letterboxed small (the bows, staffs, guns); they now fill their slot.
- **Atlases.** `src/art/gear/gear-128.webp` and `gear-64.webp` (all 120 cells, 12 a row, quality 80) and `grade-128.webp`,
  `grade-64.webp` (the five frames, then the four glows). The glows were painted wide and low (a 3:2 strip with a hard bottom
  edge), so they are cropped to their light, feathered to nothing at every edge and stretched to the square. `index.json` says
  where each cell is. Sizes: 710 + 247 + 35 + 13 KB, about 1 MB in all.
- **Offline.** The atlases load by URL (`gear/...`), so game.js stays small; `build.mjs` copies them into `out/web/gear/` and adds
  them to the service worker's `FILES`.

## How an icon is drawn: `src/gearIcons.ts`

`paintGearIcon(box, base, rarity, px)` fills an `.eqIcon` with three layers, each a CSS background on an atlas placed by
percentages (so one icon works at any size): the grade's glow behind (`.eqGlow`, none for Common, at 78% opacity), the painting
(`.eqArt`, inset 9% so it sits inside the frame's band; a Mythic 7%), and the grade's painted frame on top (`.eqFrame`). Mythic
(rarity 5) takes the `-mythic` painting. An empty slot shows the slot's standard painting faded in a faint plain frame. The 128 px
atlas is used unless the icon's pixels on screen (size x devicePixelRatio) fit the 64 px one, which only happens on a desktop
screen. A base the atlas does not hold keeps its old pixel icon on the rarity-coloured border (`itemIcon`'s old path). In the wave
report's 20 px chips only the painting is shown (the chip's own border gives the grade). The atlases are decoded as the page loads
(`warmIcon`), so a slot redrawn after an equip never shows an empty frame.

## Checks

`tools/gear/shots.mjs` (after `npm run web`; PORT=8811 by default) shoots, at 393x852, 360x780 and 412x915 at a phone's density
(2.625): the sheet's Equipment tab (Mythic, Legendary and Epic worn), the picker for the weapon and the armour (every grade), and a
gold chest that drops a Legendary piece: `docs/samples/gear-icons-{sheet,picker-weapon,picker-armour,chest}-<w>x<h>.png`. On
screen the slots are 60 px, the picker's and the chest's icons 40-48 px. `docs/samples/gear-icons-all-40px.png` is every painting
at the size it has inside a 40 px slot (shown doubled).

Paintings that still read badly small (40 px): the two bows (`huntersBow`, `sunfireLongbow`: a thin arc, almost lost), the thin
sticks (`ashenSpear`, `stormStaff`, `emberWand`), the standard `katana` and `reapersScythe` (thin and dark), the standard
`circlet` (a thin ring), and `swiftElixir` (a slim bottle). Some read alike at that size: `ironSword`, `runedBlade` and `claymore`
(three grey straight swords); `chainMail` and `mithrilMail`; `plateCuirass` and `bastionPlate`. A repaint of those with chunkier
shapes would help; at 60 px on the hero sheet all of them read.
