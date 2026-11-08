# Painted buttons: the ChatGPT prompts (paste-ready)

Step 2 of the painted-buttons plan. The inventory is [painted-buttons.md](painted-buttons.md) (73 entries). Nine sheets paint all of it, in
one matching style. The image budget is about 100 a day: nine sheets plus a re-roll or two each is **under 20 images**.

Branch for the finished art: **`art/painted-buttons`**. Files go under **`art-source/ui/buttons/`**. (This plan branch,
`claude/painted-buttons-plan`, changes no game code.)

## Before you start (once)

1. In ChatGPT, attach these **reference images** to the first prompt of every new chat and say "match this style exactly":
   `art-source/ui/tactics/advance.png`, `charge.png`, `hold.png` (the medallion style), and one screenshot of an ornate menu from the game
   (for the brass and slate: any card from `docs/samples/ui-consistency/`).
2. Do **sheet 1** first and look at it. If the style is right, keep that chat going and ask for the others in it (it holds the style better
   than a fresh chat). If not, re-roll before spending the rest.
3. **Transparent background.** ChatGPT sometimes gives an opaque background even when asked. If it does, reply: "Redo it on a flat
   pure magenta #FF00FF background, nothing else magenta in the art." We key the magenta out afterwards (the builder's job).
4. **No text.** No letters, numerals or words anywhere, in any cell. Speed is shown by chevrons, not numerals. If words appear, re-roll.
5. Save each result to its path below (PNG), exactly the canvas size given; if ChatGPT returns another size, say so in the commit and the
   builder rescales (the grid proportions are what matter).

## The style block

Every prompt below begins with this block (it is repeated in each so that each can be pasted on its own).

> STYLE: Painted fantasy game UI art, the same hand as the three attached tactic icons: a round **medallion** with a **gold-brass ring**
> set with a few small round studs, a dark **lacquer enamel field** (deep forest green, oxblood red, midnight slate or aged parchment,
> chosen per cell), and one bold painted **emblem** in the middle with a soft shadow. Warm light from the top left, soft painted highlights
> on the brass (#f5e4ba), mid brass #dbc18b, shadow brass #5c4e33, never pure white or pure black. The emblem fills about 60% of the field and
> reads at 32 pixels. Smooth painterly shading, not pixel art, not flat vector, not 3D render. Every medallion is a complete piece with its
> own ring (this is the button itself). **Transparent background (PNG with alpha), no text, no letters, no numerals.** Nothing touches the
> cell edges: leave at least 12 px of transparent margin inside every cell. Identical ring thickness and stud count across all cells.

## Cutting the sheets (for the builder)

Medallion sheets are 1024 x 1024: a 4 x 4 grid of **256 x 256** cells, read left to right, top to bottom (cell 1 is top left, cell 4 top right,
cell 16 bottom right). Cell n sits at x = ((n-1) mod 4) x 256, y = floor((n-1) / 4) x 256. Cut each to 192 px (and 96 px for small slots)
as `tools/painted-combat/import.sh` does. Plate sheets are 1536 x 1024: a 3 x 4 grid of **512 x 256** cells (column x = 0, 512, 1024;
row y = 0, 256, 512, 768).

## Sheet 1: top bar and chips

- Branch `art/painted-buttons`. File `art-source/ui/buttons/top-bar.png`. Canvas **1024 x 1024**, grid **4 x 4**, cells 256 x 256.
- Covers inventory A1 to A10.

```
STYLE: Painted fantasy game UI art, the same hand as the three attached tactic icons: a round medallion with a gold-brass ring set with a few small round studs, a dark lacquer enamel field (deep forest green, oxblood red, midnight slate or aged parchment, chosen per cell), and one bold painted emblem in the middle with a soft shadow. Warm light from the top left, soft painted highlights on the brass (#f5e4ba), mid brass #dbc18b, shadow brass #5c4e33, never pure white or pure black. The emblem fills about 60% of the field and reads at 32 pixels. Smooth painterly shading, not pixel art, not flat vector, not 3D render. Every medallion is a complete piece with its own ring (this is the button itself). Transparent background (PNG with alpha), no text, no letters, no numerals. Nothing touches the cell edges: leave at least 12 px of transparent margin inside every cell. Identical ring thickness and stud count across all cells.

Make ONE image, exactly 1024 x 1024 pixels, as a sprite sheet of 16 medallions in a 4 x 4 grid. Each cell is exactly 256 x 256 pixels, one medallion centred in each, no gaps drawn between cells, no grid lines, no labels. Branch art/painted-buttons, file art-source/ui/buttons/top-bar.png.

Cell order, left to right, top to bottom:
1. Settings: a brass cog with a keyhole-shaped hole, on slate.
2. Achievements: a gold laurel-wreathed victory cup, on green.
3. Season Spring: a budding branch with blossoms and a small green leaf, on pale green enamel.
4. Season Summer: a golden sun above wheat ears, on warm blue-green enamel.
5. Season Autumn: an oak leaf and an acorn, on burnt orange and brown enamel.
6. Season Winter: a snowflake over a bare branch, on icy blue slate.
7. Crowns: a gold royal crown with three jewels, on oxblood red.
8. Summoning stones: a glowing violet crystal shard, on midnight blue.
9. Gold: a stack of two stamped gold coins, on dark green.
10. Sound on: a brass horn-shaped speaker with three curved sound waves, on green.
11. Sound off: the same speaker with a diagonal brass slash across it and no sound waves, on dull grey slate.
12. Speed one: a single bold brass chevron pointing right, on slate.
13. Speed two: two stacked brass chevrons pointing right, on slate.
14. Speed three: three stacked brass chevrons pointing right, on slate with a faint ember glow.
15. Lives: a ruby heart held in a brass cradle, on oxblood red.
16. Clock: a brass hourglass with golden sand, on slate.
```

## Sheet 2: the bottom tabs and their badges

- Branch `art/painted-buttons`. File `art-source/ui/buttons/tabs.png`. Canvas **1024 x 1024**, grid **4 x 4**, cells 256 x 256.
- Covers inventory B1 to B6. A "lit" tab is the same emblem as its unlit twin, brighter, with a warm glow behind it and a gold ring;
  an "unlit" one is the same emblem with a darker, duller, desaturated ring (still readable).

```
STYLE: Painted fantasy game UI art, the same hand as the three attached tactic icons: a round medallion with a gold-brass ring set with a few small round studs, a dark lacquer enamel field (deep forest green, oxblood red, midnight slate or aged parchment, chosen per cell), and one bold painted emblem in the middle with a soft shadow. Warm light from the top left, soft painted highlights on the brass (#f5e4ba), mid brass #dbc18b, shadow brass #5c4e33, never pure white or pure black. The emblem fills about 60% of the field and reads at 32 pixels. Smooth painterly shading, not pixel art, not flat vector, not 3D render. Every medallion is a complete piece with its own ring (this is the button itself). Transparent background (PNG with alpha), no text, no letters, no numerals. Nothing touches the cell edges: leave at least 12 px of transparent margin inside every cell. Identical ring thickness and stud count across all cells.

Make ONE image, exactly 1024 x 1024 pixels, as a sprite sheet of 16 pieces in a 4 x 4 grid. Each cell is exactly 256 x 256 pixels, one piece centred in each, no gaps, no grid lines, no labels. Branch art/painted-buttons, file art-source/ui/buttons/tabs.png.

UNLIT tabs are the medallion with a dulled, darker brass ring and muted enamel. LIT tabs are the same emblem with a brighter polished gold ring, richer enamel and a soft warm glow just outside the ring (the glow stays inside the cell margin).

Cell order, left to right, top to bottom:
1. Recruit, unlit: a summoning circle with a rising crystal.
2. Heroes, unlit: a knight's helmet in front of two crossed swords.
3. Battle, unlit: two crossed swords over a shield. This one is the main tab: make it a little bolder, with a double ring.
4. Castle, unlit: a stone keep with two towers and a banner.
5. Spells, unlit: an open spell tome with a small star above it.
6. Recruit, lit.
7. Heroes, lit.
8. Battle, lit (double ring, brightest of all).
9. Castle, lit.
10. Spells, lit.
11. New badge: a small round brass dot with a red enamel centre (a notification pip), simple.
12. Quest seal: a small gold wax-style seal with a scroll emblem, to sit on a corner.
13. Shop coin badge: a small gold coin with a leaf mark, to sit on a corner.
14. Lock: a brass padlock on slate, closed.
15. Count seal: a small round brass seal with an empty dark enamel centre (no numeral: a blank plate to put a number on later).
16. Ready ring: only a thin glowing gold ring with an empty transparent centre, soft outer glow, to lay behind any button that is ready.
```

## Sheet 3: the camp places, portals and stat marks

- Branch `art/painted-buttons`. File `art-source/ui/buttons/camp.png`. Canvas **1024 x 1024**, grid **4 x 4**, cells 256 x 256.
- Covers inventory C1 to C11, D4 (home).

```
STYLE: Painted fantasy game UI art, the same hand as the three attached tactic icons: a round medallion with a gold-brass ring set with a few small round studs, a dark lacquer enamel field (deep forest green, oxblood red, midnight slate or aged parchment, chosen per cell), and one bold painted emblem in the middle with a soft shadow. Warm light from the top left, soft painted highlights on the brass (#f5e4ba), mid brass #dbc18b, shadow brass #5c4e33, never pure white or pure black. The emblem fills about 60% of the field and reads at 32 pixels. Smooth painterly shading, not pixel art, not flat vector, not 3D render. Every medallion is a complete piece with its own ring (this is the button itself). Transparent background (PNG with alpha), no text, no letters, no numerals. Nothing touches the cell edges: leave at least 12 px of transparent margin inside every cell. Identical ring thickness and stud count across all cells.

Make ONE image, exactly 1024 x 1024 pixels, as a sprite sheet of 16 medallions in a 4 x 4 grid. Each cell is exactly 256 x 256 pixels, one medallion centred in each, no gaps, no grid lines, no labels. Branch art/painted-buttons, file art-source/ui/buttons/camp.png.

Cell order, left to right, top to bottom:
1. Daily: a small treasure chest with a sunrise behind it, on dark green.
2. Last Stand: a stone watchtower with a banner and a torch, on slate.
3. Calamity: a dark jagged citadel under a red moon, on oxblood red.
4. March orders: a rolled map scroll with a brass pin, on parchment-brown.
5. Tavern: a foaming brass tankard, on warm brown.
6. Spells: a closed spell tome with a clasp and a spark, on midnight blue.
7. March: a marching banner on a spear, on green.
8. Trophies: a gold chalice, on slate.
9. Continue: a bold brass right-pointing arrowhead on a banner ribbon, on green.
10. Choose your battle: two crossed swords under a crown, on oxblood red (the grandest of the set, slightly bigger emblem).
11. Quest: a rolled scroll tied with red ribbon and a gold quill feather laid across it, on parchment-brown.
12. Armies: three small banners on poles, on slate.
13. Stat Gold: a single gold coin, on dark green.
14. Stat Attack: a single upright brass sword, on oxblood red.
15. Stat Health: a ruby heart, on dark green.
16. Home: a small brass-roofed cottage with a hearth glow in the window, on warm brown.
```

## Sheet 4: the fight HUD

- Branch `art/painted-buttons`. File `art-source/ui/buttons/fight.png`. Canvas **1024 x 1024**, grid **4 x 4**, cells 256 x 256.
- Covers inventory E1 to E9, E12, D7. The tactic icons (Advance, Charge, Hold) are **already painted: do not redo them.**
- Cells 9 to 12 are **rings only**: the whole centre must be fully transparent so a spell's icon shows through them.

```
STYLE: Painted fantasy game UI art, the same hand as the three attached tactic icons: a round medallion with a gold-brass ring set with a few small round studs, a dark lacquer enamel field (deep forest green, oxblood red, midnight slate or aged parchment, chosen per cell), and one bold painted emblem in the middle with a soft shadow. Warm light from the top left, soft painted highlights on the brass (#f5e4ba), mid brass #dbc18b, shadow brass #5c4e33, never pure white or pure black. The emblem fills about 60% of the field and reads at 32 pixels. Smooth painterly shading, not pixel art, not flat vector, not 3D render. Every medallion is a complete piece with its own ring (this is the button itself). Transparent background (PNG with alpha), no text, no letters, no numerals. Nothing touches the cell edges: leave at least 12 px of transparent margin inside every cell. Identical ring thickness and stud count across all cells.

Make ONE image, exactly 1024 x 1024 pixels, as a sprite sheet of 16 pieces in a 4 x 4 grid. Each cell is exactly 256 x 256 pixels, one piece centred in each, no gaps, no grid lines, no labels. Branch art/painted-buttons, file art-source/ui/buttons/fight.png.

Cell order, left to right, top to bottom:
1. Auto-cast OFF: a brass spark-and-arrow "auto" emblem (a lightning bolt circled by a looping arrow), dull slate field, dim ring.
2. Auto-cast ON: the same emblem, bright, on green enamel, a warm glow behind the ring.
3. Formation Shield Wall: three round shields side by side with two more behind, on slate.
4. Formation Spearhead: a spear tip made of five small figures in a wedge, on green.
5. Formation Hollow Square: a square of small figures round a central archer, on slate.
6. Formation Skirmish: four small scattered figures with spread arrows, on green.
7. War Horn, empty: a curved brass war horn, dull, dark enamel.
8. War Horn, full: the same horn blazing gold with light rays, on deep red.
9. Spell orb ring, ready: a gold-brass ring with studs and a thin inner bevel; the entire centre fully transparent.
10. Spell orb ring, cooling: the same ring, dulled and darker, with a dark smoky translucent wash over the ring only; centre fully transparent.
11. Spell orb ring, armed: the same ring blazing with a bright warm glow and a faint extra outer halo; centre fully transparent.
12. Spell orb ring, short of mana: the same ring tinted cold blue-grey and dimmed; centre fully transparent.
13. Ultimate seal: a golden starburst seal with a small brass flame, on oxblood red.
14. Mana drop: a glowing blue teardrop drop in a brass cradle, on midnight blue.
15. Formation button: a small banner pennant over four tiny dots in a diamond, on slate.
16. Stop: a brass open hand held up (a halt sign), on oxblood red.
```

## Sheet 5: deploy, party and dialog actions

- Branch `art/painted-buttons`. File `art-source/ui/buttons/actions.png`. Canvas **1024 x 1024**, grid **4 x 4**, cells 256 x 256.
- Covers inventory D1 to D3, D5, D6, D8, E11, G6, H1 to H3. These are icons that sit beside a button's word on a plate (sheet 8).

```
STYLE: Painted fantasy game UI art, the same hand as the three attached tactic icons: a round medallion with a gold-brass ring set with a few small round studs, a dark lacquer enamel field (deep forest green, oxblood red, midnight slate or aged parchment, chosen per cell), and one bold painted emblem in the middle with a soft shadow. Warm light from the top left, soft painted highlights on the brass (#f5e4ba), mid brass #dbc18b, shadow brass #5c4e33, never pure white or pure black. The emblem fills about 60% of the field and reads at 32 pixels. Smooth painterly shading, not pixel art, not flat vector, not 3D render. Every medallion is a complete piece with its own ring (this is the button itself). Transparent background (PNG with alpha), no text, no letters, no numerals. Nothing touches the cell edges: leave at least 12 px of transparent margin inside every cell. Identical ring thickness and stud count across all cells.

Make ONE image, exactly 1024 x 1024 pixels, as a sprite sheet of 16 medallions in a 4 x 4 grid. Each cell is exactly 256 x 256 pixels, one medallion centred in each, no gaps, no grid lines, no labels. Branch art/painted-buttons, file art-source/ui/buttons/actions.png.

Cell order, left to right, top to bottom:
1. Hire: an open hand offering a gold coin, on green.
2. Pack: a brass-buckled leather satchel, on warm brown.
3. Auto-place: a small brass chess-like marker moving across four dots with a curved arrow, on slate.
4. Fight: two crossed swords with a spark where they meet, on oxblood red (bold).
5. Auto merge: two small hero medals joining into one larger one, with two inward arrows, on green.
6. Auto-pick: a magic wand with three sparkles over a small party of five dots, on midnight blue.
7. March to battle: a banner-bearer's pennant over a road, on green.
8. Next stage: a brass double-arrowhead pointing right through a gate, on green.
9. Leave: a brass door ajar with an arrow going out, on slate.
10. Reveal all: an open eye over a star, on midnight blue.
11. Return: a curved brass arrow returning to a banner, on slate.
12. Retain hero: a small shield with a heart, on green.
13. Recycle for gold: a circle of two arrows around a gold coin, on oxblood red.
14. Pull one: a single glowing crystal, on midnight blue.
15. Pull ten: a cluster of ten tiny glowing crystals in a fan (do not draw numerals), on midnight blue.
16. Skip: a brass fast-forward double chevron with a bar, on slate.
```

## Sheet 6: the tavern and the stall

- Branch `art/painted-buttons`. File `art-source/ui/buttons/tavern.png`. Canvas **1024 x 1024**, grid **4 x 4**, cells 256 x 256.
- Covers inventory G1 to G3. The tavern buttons are shown at about 48 px, bigger than their 23 px icons now.

```
STYLE: Painted fantasy game UI art, the same hand as the three attached tactic icons: a round medallion with a gold-brass ring set with a few small round studs, a dark lacquer enamel field (deep forest green, oxblood red, midnight slate or aged parchment, chosen per cell), and one bold painted emblem in the middle with a soft shadow. Warm light from the top left, soft painted highlights on the brass (#f5e4ba), mid brass #dbc18b, shadow brass #5c4e33, never pure white or pure black. The emblem fills about 60% of the field and reads at 32 pixels. Smooth painterly shading, not pixel art, not flat vector, not 3D render. Every medallion is a complete piece with its own ring (this is the button itself). Transparent background (PNG with alpha), no text, no letters, no numerals. Nothing touches the cell edges: leave at least 12 px of transparent margin inside every cell. Identical ring thickness and stud count across all cells.

Make ONE image, exactly 1024 x 1024 pixels, as a sprite sheet of 16 medallions in a 4 x 4 grid. Each cell is exactly 256 x 256 pixels, one medallion centred in each, no gaps, no grid lines, no labels. Branch art/painted-buttons, file art-source/ui/buttons/tavern.png.

Cell order, left to right, top to bottom:
1. All heroes: three knight helmets in a row (a hero roster), on slate.
2. Talk to Gwen: a wooden ale keg with a brass tap, on warm brown.
3. Upgrades: a gold star over a small anvil, on green.
4. Quests: an open book with a ribbon marker, on parchment-brown.
5. Hester's shop: a brass-clasped bag with a coin, on warm brown.
6. Elders' table: a gold chalice between two candles, on slate.
7. Quest board: a wooden notice board with two pinned scrolls, on warm brown.
8. Trophies: a gold victory cup, on slate.
9. Stall: Books: two stacked books, on midnight blue.
10. Stall: Gear: a sword and a breastplate, on slate.
11. Stall: Tomes: a thick ornate tome with a gem clasp, on oxblood red.
12. Stall: Chests: a small iron-banded chest, on warm brown.
13. Stall: Sell: a hand dropping coins into a palm, on green.
14. Stall: Repair: a hammer and a mending needle crossed, on slate.
15. Stall: Enchant: a glowing runestone with sparks, on midnight blue.
16. Stall: Caravan: a covered wagon with a lantern, on warm brown.
```

## Sheet 7: menu glyphs

- Branch `art/painted-buttons`. File `art-source/ui/buttons/glyphs.png`. Canvas **1024 x 1024**, grid **4 x 4**, cells 256 x 256.
- Covers inventory C9, F6 to F10. These are the small marks used inside menus: **thinner** ring (about two thirds of the other sheets), calmer
  and simpler, they must stay readable at 24 px.

```
STYLE: Painted fantasy game UI art, the same hand as the three attached tactic icons, but a smaller, simpler version for tiny controls: a round medallion with a THIN gold-brass ring (about two thirds as thick as the tactic icons) with no studs, a dark lacquer enamel field, and one bold, very simple painted symbol in the middle in polished brass. Warm light from the top left, soft painted highlights on the brass (#f5e4ba), mid brass #dbc18b, shadow brass #5c4e33. The symbol fills about 55% of the field and must stay readable at 24 pixels. Smooth painterly shading, not pixel art, not flat vector, not 3D render. Every glyph is a complete round piece with its own ring. Transparent background (PNG with alpha), no text, no letters, no numerals. Nothing touches the cell edges: leave at least 12 px of transparent margin inside every cell. Identical ring thickness across all cells.

Make ONE image, exactly 1024 x 1024 pixels, as a sprite sheet of 16 glyph medallions in a 4 x 4 grid. Each cell is exactly 256 x 256 pixels, one medallion centred in each, no gaps, no grid lines, no labels. Branch art/painted-buttons, file art-source/ui/buttons/glyphs.png.

Cell order, left to right, top to bottom (all on dark slate enamel unless said):
1. Back: a brass left-pointing chevron.
2. Close: a brass X made of two crossed strokes.
3. Chevron right: a brass right-pointing chevron.
4. Plus: a brass plus sign.
5. Minus: a brass minus bar.
6. Lock: a brass padlock, closed.
7. Star, filled: a solid gold five-point star.
8. Star, empty: the same star as an outline only, on dimmer enamel.
9. Check: a brass tick, on green enamel.
10. Cross: a brass cross-mark, on oxblood red enamel.
11. Info: a brass lowercase-i shape made of a dot and a bar (a symbol, not a letter), on midnight blue.
12. Search: a brass magnifying glass.
13. Up: a brass upward chevron.
14. Down: a brass downward chevron.
15. Alert: a small brass bell, on oxblood red enamel.
16. Help: a brass question-mark shaped curl and dot (a symbol, not a letter), on midnight blue.
```

## Sheet 8: stretchy text-button plates (nine-slice)

- Branch `art/painted-buttons`. File `art-source/ui/buttons/plates-buttons.png`. Canvas **1536 x 1024**, grid **3 columns x 4 rows**, cells **512 x 256**.
- Covers inventory F1 to F4, C1, C2, D1 to D5, D8, E3, E10 to E12, G5 to G9, H1 to H6 and the sweep rule.
- **Nine-slice margins (at this cell size, 512 x 256):** left 72 px, right 72 px, top 64 px, bottom 64 px. Everything ornamental (rim, corner studs,
  filigree) lives inside those margins. The middle (368 x 128) is a **plain** field: no emblem, no gradient banding, no ornament, so it
  can stretch to any width and height. In CSS: `border-image: url(...) 64 72 64 72 fill / 12px 14px / 0 stretch;` (to be tuned in the build).
- Columns: **normal, pressed, disabled**. Rows: **primary (gold)**, **secondary (dark)**, **danger (crimson)**, **choice row (unchosen, chosen, locked)**.

```
STYLE: Painted fantasy game UI art, brass and lacquer, the same hand and palette as the three attached tactic icons and the attached ornate menu screenshot: gold-brass #dbc18b with highlights #f5e4ba and shadows #5c4e33, lacquer enamel fields, warm light from the top left, smooth painterly shading, not pixel art, not flat vector, not 3D. Transparent background (PNG with alpha), no text, no letters, no numerals.

Make ONE image, exactly 1536 x 1024 pixels, as a sheet of 12 stretchable button plates in a grid of 3 columns by 4 rows. Each cell is exactly 512 x 256 pixels, with one plate filling the cell with an 8 px transparent margin. No gaps drawn between cells, no grid lines, no labels. Branch art/painted-buttons, file art-source/ui/buttons/plates-buttons.png.

CRITICAL: each plate is a NINE-SLICE: all ornament (the brass rim, corner studs, small filigree at the corners) must sit inside the outer 72 px left and right and the outer 64 px top and bottom of its cell. The middle area (the inner 368 x 128 px) must be a perfectly plain, flat, evenly lit field with NO ornament, emblem, text, stripe or gradient banding, so it can be stretched in any direction. The left and right edges of the rim between the corners must be a simple repeating plain brass band. All plates have identical outline shape (a rectangle with softly cut corners) and identical size.

Columns, left to right: NORMAL, PRESSED (the plate looks pushed in: darker, the rim shadow inverted, the highlight moved to the bottom edge, a touch smaller field), DISABLED (desaturated, dull grey-brass rim, flat dim field, no highlights).
Rows, top to bottom:
Row 1, PRIMARY: bright polished gold-brass rim, and a rich warm gold-amber lacquer field (the main call-to-action).
Row 2, SECONDARY: mid-brass rim, and a dark slate-green lacquer field (a quiet button).
Row 3, DANGER: gold-brass rim, and a deep oxblood crimson lacquer field.
Row 4, CHOICE ROW, which is a taller list-row plate: column 1 UNCHOSEN: thin dim brass rim over a dark slate field; column 2 CHOSEN: bright #f2dc9f rim over a green field #444c38 fading to #293021, with a soft warm glow just inside the rim; column 3 LOCKED: dull grey rim over a very dark flat field.
```

## Sheet 9: chips, tabs, plaques and switches

- Branch `art/painted-buttons`. File `art-source/ui/buttons/plates-frames.png`. Canvas **1536 x 1024**, grid **3 columns x 4 rows**, cells **512 x 256**.
- Covers inventory A4 to A7, A10, B (the tab plate), C3 to C8, E6, E8, F5, D9 (drop-zone), G2 to G4.
- **Nine-slice margins (at 512 x 256):** chip plates (row 1): left 64, right 64, top 56, bottom 56. Tab plates (row 2): left 56, right 56, top 64,
  bottom 40 (the top carries the lip, the bottom meets the bar). Plaques (row 3): left 72, right 72, top 64, bottom 64. **The switch (row 4)
  is not sliced: it is a whole piece, 2:1.**
- Columns: normal, lit or ready, then a third state as listed.

```
STYLE: Painted fantasy game UI art, brass and lacquer, the same hand and palette as the three attached tactic icons and the attached ornate menu screenshot: gold-brass #dbc18b with highlights #f5e4ba and shadows #5c4e33, lacquer enamel fields, warm light from the top left, smooth painterly shading, not pixel art, not flat vector, not 3D. Transparent background (PNG with alpha), no text, no letters, no numerals.

Make ONE image, exactly 1536 x 1024 pixels, as a sheet of 12 pieces in a grid of 3 columns by 4 rows. Each cell is exactly 512 x 256 pixels, one piece filling the cell with an 8 px transparent margin. No gaps drawn between cells, no grid lines, no labels. Branch art/painted-buttons, file art-source/ui/buttons/plates-frames.png.

Rows 1 to 3 are NINE-SLICE plates: all ornament sits inside the margins given, and the middle is a perfectly plain flat field (no emblem, no banding) so it can stretch.
Row 1, CURRENCY CHIP: a slim pill-shaped brass-rimmed well on dark slate lacquer, with an empty left end (an icon will sit there). Margins: left 64, right 64, top 56, bottom 56 px. Column 1 NORMAL; column 2 LIT (gold rim, a faint warm glow, field a touch greener); column 3 WARNING (the rim reddened, field oxblood).
Row 2, TAB PLATE: a tab-bar button, brass lip along the top, and the lower edge open (it sits flush on a bar). Margins: left 56, right 56, top 64, bottom 40 px. Column 1 UNLIT (dull dark brass, dark slate field); column 2 LIT (polished gold lip with a bright inner line, warmer field, soft warm glow along the top edge); column 3 PRESSED (as lit, but darker and pushed in).
Row 3, CAMP PLAQUE: a hanging wooden-and-brass name plate with small corner studs and a slightly arched top, an empty dark centre. Margins: left 72, right 72, top 64, bottom 64 px. Column 1 NORMAL; column 2 READY (gold rim and a soft pulsing-style glow painted into the rim, no animation needed); column 3 LOCKED (dull grey rim, darker field, a plain small brass padlock plate NOT drawn: leave the field empty).
Row 4, SWITCH (NOT sliced: a whole piece, a horizontal toggle exactly filling the cell's middle 400 x 200 px): a brass-rimmed track with a round brass knob. Column 1 OFF (the knob at the left, dark slate track); column 2 ON (the knob at the right, green lacquer track with a faint glow); column 3 DISABLED (knob at the left, desaturated grey, no highlights).
```

## What serves what (the build pass's map)

| Inventory | Served by |
|---|---|
| A1 to A10 | sheet 1 (medallions), sheet 9 row 1 (chip plate) |
| B1 to B6 | sheet 2, sheet 9 row 2 (tab plate) |
| C1, C2, C8, C9 | sheet 8 (primary, secondary), sheet 3 (icons), sheet 7 (chevron) |
| C3 to C7, C10, C11 | sheet 3, sheet 9 row 3 (plaque) |
| D1 to D6, D8 | sheet 5 (icons), sheet 8 (plates) |
| D7, E4 | sheet 4 (formations) |
| D9 | sheet 9 row 3 (plaque as the drop-zone frame) |
| E1 to E3, E5 to E9, E12 | sheet 4; E3's rows use sheet 8 row 4 |
| E10, E11 | sheet 8, sheet 9 row 2 |
| F1 to F4 | sheet 8 |
| F5 | sheet 9 row 4 |
| F6 to F10 | sheet 7 (glyphs), sheet 8 |
| G1 to G4 | sheet 6, sheet 9 row 2 |
| G5 to G7, G9, H1 to H6 | sheet 8 (the sweep rule), sheet 5 (icons) |
| G8 (item icons) | not in this plan |

## Quick checklist when a sheet comes back

- Exact canvas size, 16 (or 12) distinct cells in the listed order, nothing in the margins.
- Transparent background (or flat magenta to key out). No text, letters or numerals.
- Same ring thickness, stud count and light direction in every cell, and the same hand as the tactic icons.
- Plates: plain middle, ornament inside the margins, identical outline across states.
- Commit to `art/painted-buttons` as `art-source/ui/buttons/<file>.png`; the builder cuts and credits them (`CREDITS.md`) and adds them
  to the service worker's list so the game still plays offline.
