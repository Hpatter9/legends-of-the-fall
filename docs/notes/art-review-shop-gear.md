## Art review: skill books, the shop and the equipment icons

A review of the two art deliveries for systems not built yet: "Skill books and shop art" (`art/books-shop`, 31 images in
`art-source/books-shop/`) and "Painted equipment icons" (`art/gear-icons`, 149 images in `art-source/gear/`). Both are merged into
this branch as source art only; nothing is wired into the game. The briefs were the books-and-shop prompt (31 images) and the gear
prompt (cut to 140 images, without the run-gear section); the design they serve is `docs/notes/books-shop-gear-design.md` on
`claude/shop-books-design`.

### The contact sheets (`docs/samples/`)

- `art-review-gear-weapons.png`, `art-review-gear-armour.png`, `art-review-gear-trinkets.png`: every piece, the current 16 px
  icon (x2) beside the standard and the Mythic painting at 40, 64 and 96 px in dark slots on the camp's wood panel.
- `art-review-gear-grades.png`: the five grade frames and four glows laid round six icons (Mythic uses the `-mythic` painting), at
  96, 64 and 40.
- `art-review-gear-wear.png`: six icons whole, worn (the overlay cut to the icon's shape, with the worn badge) and broken (greyed,
  cracks, the broken badge) at 96, 64 and 40; the raw overlays; the repair and sell pieces at 64 and 40; the durability bar filled
  green, amber and red; the extra run-gear set.
- `art-review-books.png`: the 14 covers at 128 and 64; studying, learned, the three mastery medallions, the three standing seals and
  the coin purse at 96 and 48.
- `art-review-people.png`: the three merchants beside five hero portraits (knight, priestess, sage, time witch, mercenary) at the
  same height.
- `art-review-stall.png`: the stall scaled to a camp building's size (about 110 art px wide) among the camp's buildings
  (`src/art/castle/`), shown at 2x.
- `art-review-shelves.png`: both shelves with books, gear, price tags and the sold-out ribbon set on them.

### Keys, sizes and transparency

- **Every expected key is present and named exactly.** All 60 gear ids in `src/sim/equipBases.ts` have `<id>.png` and
  `<id>-mythic.png` in the right folder (weapons 40, armour 40, trinkets 40); grade 9, wear 11, books 14, study 5, people 3, stall 1,
  ui 8. Nothing missing.
- **Extra:** `gear/run-gear/` (9 files: `armour-1..3`, `charm-1..3`, `weapon-1..3`). That section was cut from the brief (the owner
  chose real gear in runs); they are recoloured copies of other icons. Don't import them; they can be deleted from the source.
- **Sizes all as briefed:** item icons, frames, glows, overlays and the wear pieces 256 x 256; badges 128; the durability bar
  512 x 64; covers and portraits 512; the stall 384; the shelves 1024 x 512, opaque RGB as asked; tags 256 x 128. Every
  transparent image has clear corners; the frames' centres are fully clear.
- **Margins:** two weapons break the 6% margin (`headsmanAxe` and its Mythic touch the top edge, `dragonboneAxe` 4%). Many items go
  the other way and are far too small in the square (see below).

### The verdict

**Books and shop: mostly usable, with the people and the stall repainted. Gear: the grade frames, the badges, the bar and a few
wear pieces are usable; the 120 item icons are not, and should be repainted as a whole.**

The item icons, the three portraits and the stall are not hand-painted. They are flat code-drawn shapes (polygons, ellipses, lines)
with a noise texture and a blur, and many share one template recoloured: the brief's "soft painterly brushwork, strong readable
silhouettes" isn't there, and next to the hero portraits and the camp's buildings they look like placeholders. The books, study
icons, seals and frames are drawn the same way, but as clean UI pieces they hold together and read well, and they sit fine with the
glow style of the spell effects.

### What's good

- **Book covers:** the four kinds are clearly distinct by colour at 64 px (brown manual, violet grimoire, white-gold hymnal, red
  and green bestiary), and the rarity steps are plain: plain corners, then silver clasps, a ribbon and an inlaid emblem, then gold
  trim, chains and a glowing emblem. One consistent set.
- **Study icons:** studying and learned read at 48; the bronze, silver and gold medallions show one, two and three stars clearly.
- **Standing seals:** a clear step from plain red wax to the gold seal with a jewel.
- **Shelves:** both fill the image as asked; the rare one's velvet and gold read as grander. The price tag is clean and blank.
- **Grade frames:** they line up exactly with the icons, the centre is clear, and the five colours (grey, blue, violet, gold,
  crimson) separate well even at 40 px. Usable as they are.
- **Badges:** the worn (amber, cracked shield) and broken (red, snapped sword) badges read at 40 px on a corner. Usable.
- **The durability bar**, **repaired** (the sparkle burst) and **buy-back** (sand-timer and return ribbon) are clean and readable.
- **No real text** anywhere, apart from the letter-like marks listed below.

### Repaint list

**Gear item icons (`gear/weapons`, `gear/armour`, `gear/trinkets`, all 120): repaint the whole set**, painted by hand as briefed.
The problems across the set:
- Not painted: flat vector shapes with a noise fill, no rim light, no inner shading, no material (steel, leather and cloth look the
  same).
- Shared templates: `ironSword`, `runedBlade`, `claymore`, `frostbrand` and `katana` are one sword in five colours (the claymore is
  no bigger, the katana not curved); `chainMail`, `scaleHauberk`, `lamellar`, `mithrilMail`, `dragonscaleMail` one T-shirt shape;
  `plateCuirass`, `thornplate`, `sunforgedAegis`, `boneArmour`, `bastionPlate` one cuirass with round "ear" pauldrons; `mageRobe`,
  `sageVestments`, `silkenRobe`, `emberRobe` one robe; `leatherJerkin` and `monkGi` one vest; `rangerCloak` and `shadowcloak` one
  cloak; `ironRing`, `rubyRing`, `sapphireRing`, `emeraldBand` one ring. At 40 px the pieces in each group can't be told apart, and
  today's 16 px pixel icons are more distinct.
- Too thin and too small to read at 40 px (they don't fill the frame): every sword, `ashenSpear`, `emberWand` (a hairline),
  `stormStaff`, `reapersScythe`, both bows (also off-centre: 28% margin left, 45% right), `ironKnuckles` (a tiny row of spikes in the
  middle third), `circlet` (a thin arc), `seerSpectacles`, `moonPendant`.
- Mythic versions are recolours, not transformations: the same outline in gold or a brighter hue, with none of the briefed detail
  (no crowned guard on Kingsbane, no crescent guard on Tsukuyomi, no dragon-skull on Wyrmfall, no horned skull on Skullcrusher, no
  gears or ram's head on Siegebreaker, no dragon jaws on Dragon's Roar, no battlements on Citadel Eternal, no skull pauldrons on
  Ossuary Plate, no thorns on Thornking's Bulwark, no dove on the Bell of Sanctuary, no banner on the Drums of Conquest). Several
  look poorer than the standard: `rubyRing-mythic` is a dull grey ring, `emberAmulet-mythic` an orange blob, `scholarScroll-mythic` a
  violet rectangle, `relicShard-mythic` a plain cream polygon, `silverBell-mythic` a white cone. Most Mythic glows are missing or a
  small spot.
- Not what the brief named: `luckyCharm` is a gold disc (no four-leaf clover), `stoneIdol` a grey slab (no carved idol),
  `relicShard` an uncarved polygon, `blunderbuss` reads as a yellow club (no barrel or flare), `dragonboneAxe` and `headsmanAxe` are
  flags on sticks, `warDrum` a brown cylinder with a zigzag.
- The pendants' cords (`emberAmulet`, `moonPendant`, `luckyCharm` and their Mythics) float as a separate arc above the pendant.
- `sageVestments`: the brown mark on the sash reads as a letter **T**.
- `headsmanAxe`, `headsmanAxe-mythic`, `dragonboneAxe`, `dragonboneAxe-mythic`: break the 6% margin at the top.

**Gear grade (`gear/grade`):**
- `frame-*`: keep. (Optional: a little more bevel and the corner gems larger, as they vanish below 64 px.)
- `glow-rare`, `glow-epic`: too small and faint (the light ends about 30% in from each edge, behind the icon, so a cuirass or a
  robe hides it completely). Spread the light to about 10% from the frame; the epic's sparkles don't show.
- `glow-legendary`, `glow-mythic`: same, a little larger; acceptable otherwise.

**Gear wear (`gear/wear`):**
- `wear-worn`: invisible below 64 px; the brief asked for light, but it should still show at 40 (a few larger scuffs and rust
  patches).
- `wear-broken`: the cracks are thin black lines that vanish at 40 px; thicker cracks with the light edge and chips, as briefed.
- `repair`, `repair-all`: the anvil and hammer fill only the middle 60% and are flat; paint them larger. `repair-all` lacks the
  helmet and the pile.
- `sell`: the hand is a flat beige polygon; repaint.
- `sell-bundle`: reads as crossed sticks and a box, not a tied bundle of weapons and armour; repaint.
- `badge-worn`, `badge-broken`, `repaired`, `buy-back`, `durability-bar`: keep.
- `gear/run-gear/*` (9): extra, not needed; drop.

**Books and shop (`books-shop`):**
- `people/hester-vane`, `people/caravan-master`, `people/gloaming-dealer`: **repaint all three.** Flat geometric shapes with blank
  faces, blurred blobs for hair and beard (the beard is a checkerboard), nothing like the detailed anime-style hero portraits they
  sit beside (`art-review-people.png`). The concepts are right (Hester's green coat and ledger, the caravan master's turban and box,
  the hooded dealer's chained book); the painting isn't.
- `stall/shop-stall`: **repaint, or better build it from the packs.** It is a smooth, blurred, front-on drawing; the camp's
  buildings are crisp isometric pixel art from the Chronos building kits, seen from the 2:1 three-quarter view
  (`art-review-stall.png`), and it doesn't sit among them. Under the project's rule (pack art over drawn art) the stall could be
  put together from the kit's pieces the way `src/render/castleSpots.ts` builds the others (the `anvil_stall` awning frame, crates,
  barrels, chests), with only a painted sign added.
- `books/manual-*`: the brief asked for steel grey and leather brown; it's brown only, and at 64 px `manual-rare` and
  `universal-rare` (amber) are close enough to confuse. Add the steel grey (a grey cover with brown leather, or steel corners and
  bands), or push the universal books to a brighter bronze.
- `books/hymnal-legendary`: its glow washes the whole cover out to a white blob at 64 px; tone the light down so the gold trim
  shows.
- `books/bestiary-common`, `bestiary-rare`: the three claw marks read as the Roman numeral **III** at small sizes; slant them or
  make them a claw.
- All covers: one silhouette for every kind (the brief asked for "one strong shape and one strong colour per kind"). Colour carries
  it; a different shape per kind (a thick strapped manual, a tall grimoire, a small rounded hymnal, a hide-bound bestiary with
  rough edges) would make them readable at a glance. Worth doing if the covers are repainted; not a blocker.
- `ui/standing-1`: the mark in the wax reads as a letter **T**; make it a plain stamp.
- `ui/sold-out`: the ribbon with an X in a ring reads as "cancelled" more than "sold out"; acceptable, could be a stamp.
- `ui/shelf`, `ui/shelf-rare`: keep. (The brass brackets are big and the ledge only takes the top third; the game can crop.)
- `study/*`, `ui/price-tag`, `ui/coin-purse`, `ui/standing-2`, `ui/standing-3`, `books/grimoire-*`, `books/universal-legendary`,
  the other covers: keep.

### Summary

Usable now: the 14 covers (with the four fixes above), the 5 study icons, the shelves, the price tag, 2 of the 3 seals, the coin
purse, the 5 grade frames, the 2 badges, the bar, `repaired`, `buy-back` (about 35 of 171). To repaint: the 120 gear icons, the 4
glows (larger), 2 overlays, 4 repair and sell pieces, the 3 portraits, the stall and `standing-1`. To drop: the 9 run-gear files.
