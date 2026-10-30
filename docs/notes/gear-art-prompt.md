# Equipment: new painted icons (140 images)

For Antigravity, working in the repo hpatter9/legends-of-the-fall.

The heroes' equipment (a weapon, an armour and a trinket each) is drawn today with tiny 16 x 16 pixel icons. They are getting
painted icons of their own. Gear is also about to **wear out with use, be repaired, and be bought and sold** at a new shop stall at
the camp, so this set includes the pieces for worn and broken gear, repairs and selling.

There are 60 kinds of equipment, five grades each (Common, Rare, Epic, Legendary, Mythic). The grades are **not** painted 300
times. Instead:

- each kind gets **one standard painting**, used for Common to Legendary;
- each kind gets **one Mythic painting**: a Mythic piece has its own name (the Iron Sword becomes "Kingsbane"), and its painting
  is that same object transformed into a legendary relic;
- the grade is shown by the game laying a **grade frame** and a **grade glow** (section D) round the standard painting;
- worn and broken pieces are shown by the game laying a **wear overlay** (section E) over the painting;
- the simple gear found during a run shows the icon of the piece it will become when it comes home, so it needs no icons of its own.

So the standard paintings must be neutral about grade: a good, well-made object, never plain junk and never glowing.

**The rule for everything here:** original art for this game, not based on any other game.

## What to do

1. **Paint each image below** and save it at `art-source/gear/<folder>/<key>.png` (each section names its folder). Keys are exact
   (they are the game's own ids): `weapons/ironSword.png`, `weapons/ironSword-mythic.png`, and so on.
2. **Make one commit per section** (A to E) on a new branch **`art/gear-icons`**, branched from `main`. Change only files in
   `art-source/gear/`.
3. **Open a pull request** into `main`, titled **"Painted equipment icons"**. Don't merge it, and don't change any game code,
   `CREDITS.md` or `package.json`. The director brings the art into the game and merges.

## The look

Hand-painted, in the style of a high-end mobile RPG's item icons: soft painterly brushwork with visible texture, rich colour,
strong readable silhouettes, warm rim light from the upper left, a soft shadow inside the object (no cast shadow on the
background). Everything is seen on a phone, often small, so: **bold shapes, strong contrast, fill the frame** inside a 6% margin,
and each object must still read clearly shrunk to **40 px** (the game shows them at 40 to 96 px). No text, no real letters or
numbers anywhere (runes and engravings are suggested, never readable). No frames or backgrounds painted on the item icons (the game
adds the frames).

**Every item icon (sections A, B and C):** 256 x 256 px, transparent background, one object, centred.

- **Weapons:** laid diagonally, hilt or grip at the bottom left, tip or head at the top right (bows and crossbows upright, slightly
  turned; a grimoire as a book turned a little to show its spine; knuckles as a pair, overlapping).
- **Armour:** the piece on its own as if on an invisible stand, seen from the front, turned slightly (a body piece with its
  shoulders; cloaks and robes hanging, their shape clear).
- **Trinkets:** the object a little larger than life in the frame, turned to show its best side (a ring tilted to show its stone, a
  boot as a pair).

**Standard paintings:** fine, well-made, battle-ready, in natural materials and colours (steel, iron, leather, wood, cloth, gems in
their own colours). A little character and a clear shape of their own; no magic glow, no aura.

**Mythic paintings (`<key>-mythic`):** the same object, recognisably the same shape and silhouette, remade as a relic of legend:
richer materials (gold, starmetal, dragonbone, living flame, moonlight), ornate detail, and **a soft glow of its own** in the colour
named below, contained within the object (light from its runes, its gem, its edge). Bigger than the standard, but in the same
pose and the same margin, so the two can be swapped in place. Still no glow spilling to the edges of the image (the game adds the
grade glow behind it).

---

## A. Weapons (`weapons`, 40 images)

Each line: **key**, the standard piece; then **`key-mythic`**, its Mythic name and look.

1. **ironSword**: a plain, well-forged straight sword, leather grip, round pommel. **ironSword-mythic**, *Kingsbane*: a royal blade
   with a crowned crossguard and a gold-chased fuller, glowing pale gold along the edge.
2. **runedBlade**: a longsword with a line of carved runes down the blade, a wrapped hilt. **runedBlade-mythic**, *Runeking's Edge*:
   the runes blazing blue-white, a crossguard of carved stone and silver.
3. **claymore**: a huge two-handed greatsword, long grip, broad crossguard. **claymore-mythic**, *Titan's Cleaver*: wider and heavier,
   dark steel with bronze bands, a cracked-earth amber glow in its fuller.
4. **frostbrand**: a pale steel sword with a frosted edge and a blue-wrapped hilt. **frostbrand-mythic**, *Winterbane*: a blade of
   clear ice in a silver hilt, frost crystals on the guard, glowing icy blue.
5. **katana**: a curved katana with a dark-blue wrapped hilt and a round guard. **katana-mythic**, *Tsukuyomi*: a moon-silver blade with
   a crescent-moon guard, glowing soft moonlight white-violet.
6. **dragonboneAxe**: a one-handed axe with a head of pale carved bone, a wrapped haft. **dragonboneAxe-mythic**, *Wyrmfall*: a great
   dragon-skull axe head, ember-red cracks glowing inside the bone.
7. **headsmanAxe**: a broad, heavy executioner's axe, a long dark haft. **headsmanAxe-mythic**, *Doom's Verdict*: a black-steel blade
   engraved with a scales-of-judgement motif, glowing dull crimson.
8. **spikedMace**: a flanged iron mace with spikes, a leather grip. **spikedMace-mythic**, *Skullcrusher*: a heavy mace head shaped
   like a horned skull, glowing bone-white in its eyes.
9. **stonebreakerMaul**: a two-handed hammer, a great square stone-and-iron head. **stonebreakerMaul-mythic**, *Worldbreaker*: a head
   of carved granite bound in gold, amber light in the cracks.
10. **ashenSpear**: a long spear with a leaf-shaped head and an ash-wood shaft. **ashenSpear-mythic**, *Phoenix Lance*: a gold lance
    with a head like a flame, red and gold feathers at the socket, glowing fire orange.
11. **vampireFang**: a curved dagger like a long fang, a dark-red grip. **vampireFang-mythic**, *Nightblood Fang*: a bone-white fang
    blade with a bat-wing guard, glowing deep blood red.
12. **reapersScythe**: a war scythe, a long curved blade on a dark staff. **reapersScythe-mythic**, *Harvest of Souls*: a black blade
    with wisps of pale souls in the steel, glowing ghostly green-white.
13. **ironKnuckles**: a pair of iron knuckle-dusters over wrapped leather. **ironKnuckles-mythic**, *Fists of the Fallen*: gauntlet
    knuckles of dark steel and gold, glowing warm white at the knuckles.
14. **huntersBow**: a recurved wooden hunting bow with a leather grip, strung. **huntersBow-mythic**, *Windpiercer*: a pale-wood bow
    with swept limbs like wings, glowing soft green-white along the string.
15. **sunfireLongbow**: a tall yew longbow with gold-coloured tips. **sunfireLongbow-mythic**, *Sunhawk Bow*: a gold bow shaped like
    spread hawk wings, glowing sunlight gold.
16. **ironwoodCrossbow**: a dark-wood crossbow with iron fittings, loaded with a bolt. **ironwoodCrossbow-mythic**, *Siegebreaker*: a
    heavy crossbow with bronze gears and a ram's-head stock, glowing hot orange at the bolt.
17. **blunderbuss**: a short flared-barrel gun, a brass barrel and a wooden stock. **blunderbuss-mythic**, *Dragon's Roar*: its barrel
    a dragon's open jaws, glowing fire red inside the mouth.
18. **stormStaff**: a wooden staff topped with a forked iron crown holding a grey stone. **stormStaff-mythic**, *Thunderlord's Reach*:
    a silver staff, a storm-cloud crystal in a crown of forks, glowing electric blue-white.
19. **emberWand**: a short wand of dark wood tipped with a red stone. **emberWand-mythic**, *Sunspark Rod*: a gold rod tipped with a
    small sun, glowing bright orange-gold.
20. **grimoire**: a thick spellbook bound in dark leather with metal corners and a clasp. **grimoire-mythic**, *Tome of Endings*: a
    black-and-silver tome with a closed-eye sigil, chained shut, glowing violet between the pages.

## B. Armour (`armour`, 40 images)

1. **leatherJerkin**: a fitted brown leather jerkin with laces. **leatherJerkin-mythic**, *Windrunner's Jerkin*: pale leather with
   swirling wind tooling and feather trim, glowing soft sky blue.
2. **hideVest**: a rough fur-trimmed hide vest. **hideVest-mythic**, *Behemoth Hide*: a great beast's scaled hide with tusks at the
   shoulders, glowing earthy amber.
3. **rangerCloak**: a hooded green travelling cloak with a leaf clasp. **rangerCloak-mythic**, *Cloak of the Wild Hunt*: a cloak of
   living leaves and antler clasps, glowing forest green.
4. **shadowcloak**: a dark hooded cloak, ragged at the hem. **shadowcloak-mythic**, *Nightveil*: a cloak of black night sky with tiny
   stars in its folds, glowing deep blue-violet.
5. **chainMail**: a mail shirt of riveted rings, short sleeves. **chainMail-mythic**, *Mail of a Thousand Rings*: rings of silver and
   gold in a pattern, glowing pale silver.
6. **scaleHauberk**: a long coat of overlapping steel scales. **scaleHauberk-mythic**, *Leviathan Hauberk*: sea-green scales like a sea
   serpent's, pearl trim, glowing sea teal.
7. **plateCuirass**: a polished steel breastplate with pauldrons. **plateCuirass-mythic**, *Dawnforged Cuirass*: white-gold plate with
   a rising-sun emblem, glowing dawn gold.
8. **thornplate**: a dark steel breastplate covered in short thorns. **thornplate-mythic**, *Thornking's Bulwark*: black plate grown with
   briar and thorns, glowing poison green in the thorns.
9. **bastionPlate**: massive heavy plate, wide pauldrons, a thick gorget. **bastionPlate-mythic**, *Citadel Eternal*: plate like castle
   stonework with battlement pauldrons, glowing steady gold in its arrow slits.
10. **mageRobe**: a long blue-violet mage's robe with a high collar. **mageRobe-mythic**, *Archmage's Raiment*: deep robes embroidered
    with constellations, glowing arcane violet.
11. **sageVestments**: layered cream and brown scholar's vestments with a sash. **sageVestments-mythic**, *Vestments of the Oracle*:
    white and gold vestments with an eye motif on the sash, glowing soft white.
12. **silkenRobe**: a flowing pale-blue silk robe. **silkenRobe-mythic**, *Starsilk Robe*: silk woven from starlight, glowing silvery
    blue.
13. **dragonscaleMail**: a coat of large red dragon scales. **dragonscaleMail-mythic**, *Ancient Wyrmscale*: huge dark scales edged in
    gold, glowing ember red between them.
14. **monkGi**: a belted martial-arts gi, sleeves rolled. **monkGi-mythic**, *Gi of a Thousand Fists*: a gi with gold embroidery of
    fists and clouds, glowing warm gold.
15. **lamellar**: Japanese-style lamellar armour of laced plates. **lamellar-mythic**, *Shogun's Lamellar*: black-and-red lacquered
    plates with gold lacing, glowing red-gold.
16. **mithrilMail**: a fine, light silver mail shirt. **mithrilMail-mythic**, *Dwarflord's Mithril*: mithril with dwarven knotwork and
    gems, glowing bright silver-white.
17. **sunforgedAegis**: a breastplate with a round sun boss at its heart. **sunforgedAegis-mythic**, *Aegis of the Sun*: gold armour
    with a blazing sun at the chest, glowing sunlight gold.
18. **boneArmour**: armour of bones bound with cord, a ribcage chest. **boneArmour-mythic**, *Ossuary Plate*: carved, polished bone
    with skull pauldrons, glowing ghostly green.
19. **gladiatorHarness**: a leather harness with one shoulder guard and studs. **gladiatorHarness-mythic**, *Champion's Harness*: a
    gilded harness with a laurel-wreath shoulder, glowing triumphant gold.
20. **emberRobe**: a dark-red robe with singed hems. **emberRobe-mythic**, *Robe of Cinders*: a robe whose hem is living embers,
    glowing fire orange.

## C. Trinkets (`trinkets`, 40 images)

1. **luckyCharm**: a four-leaf clover in a little brass charm on a cord. **luckyCharm-mythic**, *Fortune's Wheel*: a gold charm shaped
   like a wheel of fortune, glowing lucky green-gold.
2. **ironRing**: a heavy plain iron ring. **ironRing-mythic**, *Ring of Ages*: a ring of dark metal with turning rings of runes,
   glowing pale amber.
3. **bootsOfHaste**: a pair of light leather boots with small wings at the ankles. **bootsOfHaste-mythic**, *Windstep Boots*: white and
   silver boots with feathered wings, glowing sky blue.
4. **phoenixFeather**: a long red and gold feather. **phoenixFeather-mythic**, *Heart of the Phoenix*: a burning feather round a
   glowing ember heart, glowing fire gold.
5. **warDrum**: a small war drum with a leather head and cords. **warDrum-mythic**, *Drums of Conquest*: a drum of dark wood and gold
   with a war-banner, glowing battle red.
6. **healerLyre**: a small wooden lyre. **healerLyre-mythic**, *Lyre of the Mending Dawn*: a white-gold lyre with strings of light,
   glowing soft gold-white.
7. **silverBell**: a silver hand bell. **silverBell-mythic**, *Bell of Sanctuary*: a bell with a dove handle, glowing pure white.
8. **emberAmulet**: an amulet with a red stone on a chain. **emberAmulet-mythic**, *Sunfire Amulet*: a sun-shaped gold amulet round a
   flame, glowing orange-gold.
9. **moonPendant**: a pendant holding a pale moonstone. **moonPendant-mythic**, *Lunar Heart*: a crescent pendant cradling a full
   moon, glowing moonlight silver-blue.
10. **sapphireRing**: a silver ring with a blue sapphire. **sapphireRing-mythic**, *Tidecaller Ring*: a ring of curling waves round a
    great sapphire, glowing sea blue.
11. **rubyRing**: a gold ring with a red ruby. **rubyRing-mythic**, *Bloodmoon Ring*: a dark ring round a blood-red moon of ruby,
    glowing deep crimson.
12. **emeraldBand**: a band set with green emeralds. **emeraldBand-mythic**, *Evergreen Band*: a band of living vine and emerald
    leaves, glowing fresh green.
13. **scryingOrb**: a clear glass orb on a small claw stand. **scryingOrb-mythic**, *All-Seeing Orb*: an orb with an eye of light in
    its heart on a silver stand, glowing violet-white.
14. **scholarScroll**: a rolled parchment scroll tied with a ribbon. **scholarScroll-mythic**, *Scroll of Forbidden Lore*: a dark scroll
    on black rods, half open, glowing violet from within.
15. **vialOfVigor**: a round glass vial of red liquid with a cork. **vialOfVigor-mythic**, *Elixir of the Eternal*: an ornate gold-caged
    flask of shining crimson, glowing warm red.
16. **swiftElixir**: a tall thin bottle of green-blue liquid. **swiftElixir-mythic**, *Draught of Gales*: a winged bottle with a
    swirling wind inside, glowing pale cyan.
17. **relicShard**: a jagged shard of a broken relic, carved. **relicShard-mythic**, *Heart of a Fallen Star*: a fallen star's
    crystal heart, glowing starlight white-gold.
18. **stoneIdol**: a small squat carved stone idol. **stoneIdol-mythic**, *Idol of the Colossus*: a carved giant's head of stone and
    gold, glowing amber in its eyes.
19. **seerSpectacles**: round brass spectacles. **seerSpectacles-mythic**, *Lenses of Truth*: gold spectacles with crystal lenses,
    glowing clear blue-white.
20. **circlet**: a thin silver circlet with one small gem. **circlet-mythic**, *Crown of Kings*: a slender royal crown, glowing regal
    gold.

## D. Grade frames and glows (`grade`, 9 images)

The game lays these round every item icon to show its grade. Both kinds are **256 x 256 px, transparent**, the same size as the
icons so they line up exactly.

**Frames** (`frame-common`, `frame-rare`, `frame-epic`, `frame-legendary`, `frame-mythic`): a square slot frame with softly rounded
corners, about 14 px thick at 256 px, **its centre fully transparent** (the item shows through) and a dark inner bevel. A clear step
up in richness:
- **frame-common**: plain dark iron, grey.
- **frame-rare**: blued steel with silver corners, blue.
- **frame-epic**: violet enamel with silver filigree corners, violet.
- **frame-legendary**: gold with small set gems at the corners, warm gold-orange.
- **frame-mythic**: crimson and gold, ornate corners with a small jewel at the top centre, crimson.

**Glows** (drawn behind the item, inside the frame): soft light only, no hard shapes, strongest at the centre and fading to fully
transparent well before the frame. They must look good **still** (the game may pulse them gently).
- **glow-rare**: a faint blue haze.
- **glow-epic**: a violet glow with a few soft sparkles.
- **glow-legendary**: a warm gold radiance with soft rays.
- **glow-mythic**: a crimson-gold radiance with rays and a ring of light motes.

(Common has no glow.)

## E. Wear, repair and selling (`wear`, 11 images)

Gear loses durability as it is used in fights. Below a quarter it is **worn**; at nothing it is **broken** (it gives nothing until
it is repaired). Repairs and selling happen at the shop stall. (The shop's shelves, price tag, sold-out stamp, standing seals and
coin purse are already in the books-and-shop set: don't repeat them.)

**Overlays** (256 x 256, transparent; the game lays them over an item icon and cuts them to the icon's shape, so paint them
across the **whole** square):
- **wear-worn**: scuffs, scratches, small dents and spots of rust and dirt, scattered evenly, in greys and browns. Light: the item must
  still read clearly under it.
- **wear-broken**: heavy cracks running across the square from one point near the upper right, chips knocked out along them, the
  cracks dark with a thin light edge. Strong and clear at 40 px (the game also greys the item out under it).

**Badges** (128 x 128, transparent; sit on an icon's corner or a hero's portrait):
- **badge-worn**: a small round amber shield-badge with a cracked-shield symbol.
- **badge-broken**: a small round red badge with a snapped-sword symbol.

**Repair pieces:**
- **repair** (256 x 256, transparent): a smith's hammer resting on a small anvil, a few sparks. The repair button's icon.
- **repair-all** (256 x 256, transparent): the same anvil and hammer with a sword, a helmet and a ring piled beside it, more sparks.
  The "repair everything" button.
- **repaired** (256 x 256, transparent): a burst of bright white-gold sparkle and a gleam streak, centred, for the moment a piece is
  made whole (shown over the item, then fades).
- **durability-bar** (512 x 64, transparent): an empty, slim bar frame of dark iron with rivets at each end and a dark hollow inside
  (the game fills the hollow with colour: green, amber, red).

**Selling pieces:**
- **sell** (256 x 256, transparent): an open hand offering a small stack of gold coins. The sell button's icon.
- **sell-bundle** (256 x 256, transparent): a bundle of plain weapons and armour tied with rope, a coin on top. The "sell all
  commons" button.
- **buy-back** (256 x 256, transparent): a small sand-timer with a coin and a curved return arrow drawn as a ribbon (no letters).
  The "sold today, buy back" shelf's sign.

---

## Checklist

- 140 PNGs: `weapons` 40, `armour` 40, `trinkets` 40, `grade` 9, `wear` 11.
- Every item icon 256 x 256, transparent, centred in a 6% margin, no frame, no text; standard and Mythic of a key in the same pose.
- Frames and glows 256 x 256 with clear centres; overlays painted edge to edge.
- One commit per section (A to E) on `art/gear-icons`, a PR titled "Painted equipment icons", nothing outside `art-source/gear/`.
