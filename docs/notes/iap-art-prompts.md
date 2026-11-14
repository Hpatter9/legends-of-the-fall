# IAP art prompts

The art the Shop (`docs/notes/iap.md`) needs that neither the packs nor `src/art/` have. Until each lands the Shop uses plain stand-ins
(the menu's stone, crown and coin icons, and a glyph for each cosmetic), and **every cosmetic stays "Coming soon", unsellable, until its
art is in the game**. All for `hpatter9/legends-of-the-fall`, branch `art/iap`, files under `art-source/iap/`. Style throughout: the
game's dark-fantasy painted pixel art (the Keep & Kingdom menus: brass, slate and parchment, warm candlelight), crisp edges, no text, no
logos, no watermark.

## The Shop's pictures

```text
Paint four summoning-stone treasure piles for the shop of Legends of the Last Keep, as one sheet. Output art-source/iap/stone-tiers.png,
1024 × 256, transparent background, four cells of 256 × 256 side by side, each pile centred with a little air round it. The stones are the
game's violet-blue mana crystals (faceted, glowing softly from within). Left to right, growing: a small leather pouch spilling three
crystals; a satchel with a dozen; an iron-bound coffer, lid open, heaped; a great hoard of crystals over a stone plinth with brass
candlesticks. Dark-fantasy painted pixel art, crisp edges, warm candle rim light, soft drop shadow under each, no text.
```

```text
Paint three crown-coin treasures for the shop of Legends of the Last Keep, as one sheet. Output art-source/iap/crown-tiers.png, 768 × 256,
transparent background, three cells of 256 × 256. The coins are the game's gold crowns (a small crown stamped on each). Left to right: a
drawstring purse with coins tumbling out; a brass-bound wooden chest of coins; a vault door ajar on stacked gold and a jewelled crown.
Dark-fantasy painted pixel art, crisp edges, warm candlelight, soft drop shadow, no text.
```

```text
Paint three bundle crests for the shop of Legends of the Last Keep, as one sheet. Output art-source/iap/bundle-icons.png, 768 × 256,
transparent background, three cells of 256 × 256. Left: the Starter pack, a red wax-sealed parcel tied with gold cord, a violet crystal
and two gold crowns tucked under the cord, a green ribbon tag. Middle: the Recruit's bundle, a soldier's knapsack with crystals and a coin
purse. Right: the Warlord's bundle, a war chest under a crimson banner with crossed swords, crystals, gold and two thick leather tomes.
Dark-fantasy painted pixel art, brass and crimson, crisp edges, no text.
```

```text
Paint a wide banner for the one-time Starter pack in Legends of the Last Keep. Output art-source/iap/starter-banner.png, 1024 × 384,
transparent background. A crimson cloth banner with brass finials hung across the top, below it the sealed parcel of the bundle crest with
crystals, crowns and two tomes laid out on a slate ledge, warm candlelight from both sides. Leave the left third plain cloth for the game
to write on. Dark-fantasy painted pixel art, crisp edges, no text.
```

```text
Paint the Shop's round medallion button for the home screen of Legends of the Last Keep, matching the painted trophy and settings
medallions (a brass rim with rivets round a dark enamel face). Output art-source/iap/shop-medallion.png, 192 × 192, transparent
background: the face shows a small stack of gold crowns beside a violet crystal. Also art-source/iap/shop-medallion-lit.png, the same with
the face glowing a little brighter. Painted pixel art, crisp edges, no text.
```

## Duchess's three costumes

Duchess's sheet is `src/art/units/duchess_goat.png` (512 × 640, her frames on a grid of 64 × 64 cells; whtdragon's white goat, scaled 2x,
with her PixelLab headbutt and fall rows). Each costume is an overlay sheet on exactly that grid, drawn to sit on her in every frame, so
the game lays it over her.

```text
Draw a costume overlay for Duchess, the white court goat of Legends of the Last Keep. Output art-source/iap/duchess-regalia.png,
512 × 640, transparent background, on exactly the grid and frames of the reference sheet src/art/units/duchess_goat.png (64 × 64 cells):
in every frame, only the costume, placed where it sits on her: a short ermine cape (white with black tips) fastened at her chest with a
gold clasp, and a small jewelled gold crown between her horns. Nothing of the goat herself. Pixel art at the sheet's own scale, hard
edges, her palette's light, no anti-aliased halo.
```

```text
Draw a costume overlay for Duchess, the white court goat of Legends of the Last Keep. Output art-source/iap/duchess-knight.png, 512 × 640,
transparent background, on exactly the grid and frames of src/art/units/duchess_goat.png (64 × 64 cells): in every frame only the
costume where it sits on her: a little steel helm with a red plume, her horns out through holes in it, and a crimson tabard with a gold
goat's head over her back. Nothing of the goat herself. Pixel art at the sheet's scale, hard edges, no halo.
```

```text
Draw a costume overlay for Duchess, the white court goat of Legends of the Last Keep. Output art-source/iap/duchess-lantern.png, 512 × 640,
transparent background, on exactly the grid and frames of src/art/units/duchess_goat.png (64 × 64 cells): in every frame only the costume:
a small brass lantern hung from her left horn by a chain, a pale blue ghost-light inside, swinging a little with her steps, and a dark
hooded mantle over her shoulders. Nothing of the goat herself. Pixel art at the sheet's scale, hard edges, no halo.
```

## The two new rulers

Each ruler is three pictures, as the eight painted rulers are (`src/art/rulers/<id>.png` and `provenance.json`; `src/art/crown-terrace/`):
the action atlas, the Crown Terrace figure and the ruler's domain. Paint them to match the eight (reference: `docs/samples/ruler-roster-personalities.png`
and `src/art/rulers/iron_stag.png`).

```text
Paint a ninth ruler for Legends of the Last Keep, the Ember Sovereign (male, The Tyrant King): a broad-shouldered king in blackened gold
plate, a mantle whose hem smoulders with embers, a crown of black iron spikes tipped with fire, a greatsword with a molten edge, a short
grey-streaked beard. Output art-source/iap/ruler-ember.png, 896 × 1792, transparent background: an action atlas of 4 columns by 8 rows of
224 × 224 cells, the rows in order idle, walk, strike, cast, hurt, dead, seated, command (four frames each), the figure facing right,
feet on the same baseline in every cell, the seated row on a throne as the other rulers' are. Match the eight existing ruler atlases in
scale, proportions, outline and painted pixel style. No text.
```

```text
Paint a tenth ruler for Legends of the Last Keep, the Starlit Empress (female, The Visionary): tall and calm, night-blue robes sewn with
tiny silver stars, a silver circlet with a crescent, long black hair with a streak of white, an astrolabe sceptre, a faint starlight halo.
Output art-source/iap/ruler-starlit.png, 896 × 1792, transparent background: an action atlas of 4 columns by 8 rows of 224 × 224 cells,
rows idle, walk, strike, cast, hurt, dead, seated, command (four frames each), facing right, feet on one baseline, seated on a throne in the
seated row. Match the eight existing ruler atlases in scale, proportions, outline and painted pixel style. No text.
```

```text
Paint the Ember Sovereign standing full length for the Crown Terrace of Legends of the Last Keep, matching the eight ruler figures there
(src/art/crown-terrace/ruler-iron_stag.webp). Output art-source/iap/terrace-ruler-ember.png, 360 × 470, transparent background, three-
quarter view, greatsword planted point down, ember mantle stirring. Painted pixel art, crisp edges, no text.
```

```text
Paint the Starlit Empress standing full length for the Crown Terrace of Legends of the Last Keep, matching the eight ruler figures there
(src/art/crown-terrace/ruler-sun_viper.webp). Output art-source/iap/terrace-ruler-starlit.png, 360 × 470, transparent background, three-
quarter view, astrolabe sceptre raised, robes catching starlight. Painted pixel art, crisp edges, no text.
```

```text
Paint the Ember Sovereign's domain for the Crown Terrace of Legends of the Last Keep, matching the eight domains
(src/art/crown-terrace/iron_stag.webp): a black basalt throne terrace over a sea of cooling lava, iron braziers, ash drifting under a red
sky. Output art-source/iap/terrace-ember.png, 800 × 1200, an opaque full painting with the lower middle clear for the ruler to stand.
Painted pixel art, no figures, no text.
```

```text
Paint the Starlit Empress's domain for the Crown Terrace of Legends of the Last Keep, matching the eight domains
(src/art/crown-terrace/moon_oracle.webp): an observatory terrace of pale marble under a deep night sky thick with stars and a slow comet,
brass orreries, blue lanterns. Output art-source/iap/terrace-starlit.png, 800 × 1200, opaque, the lower middle clear for the ruler.
Painted pixel art, no figures, no text.
```

## Starfall summons

The summoning's card is `src/art/ui/tarot-frame.png` (128 × 192, pixel art) with the arcana sheet `src/art/tarot/arcana.png`; its burst
is the Blender sheets in `src/art/fx/summon/`. Starfall replaces the card's frame and back; the burst can be recoloured violet and gold in
code from the same sheets, so it needs no new art.

```text
Draw a premium summoning card frame for Legends of the Last Keep, the Starfall variant of src/art/ui/tarot-frame.png. Output
art-source/iap/starfall-frame.png, 128 × 192, transparent centre and background: the same shape and border width as the reference frame,
in deep violet enamel with gold filigree, small eight-pointed gold stars at the corners, a falling star across the top edge. Pixel art,
hard edges, no text.
```

```text
Draw the back of a premium summoning card for Legends of the Last Keep, the Starfall variant. Output art-source/iap/starfall-back.png,
128 × 192, transparent background outside the card: a violet night-sky card back with a gold eight-pointed star at its heart, a ring of
small stars round it and a thin gold border, symmetrical. Pixel art, hard edges, no text.
```

## Cosmetic previews for the Shop

```text
Paint seven square shop previews for Legends of the Last Keep's cosmetics, as one sheet. Output art-source/iap/cosmetic-previews.png,
1792 × 256, transparent background, seven cells of 256 × 256 in this order: Duchess the white goat in the Royal Regalia (ermine cape,
jewelled crown); Duchess as the Little Knight (plumed helm, crimson tabard); Duchess with her ghost-light lantern; the three costumes
together on a wardrobe rail; the Ember Sovereign's head and shoulders; the Starlit Empress's head and shoulders; a Starfall summoning card
fanned with a falling star. Each on a dark round vignette. Painted pixel art matching the game, crisp edges, no text.
```
