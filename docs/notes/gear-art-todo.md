# Gear art still to make

The OpenAI image account is out of credits for now, so the new pieces show a clear placeholder (their slot's outline, faint, with their
name on it: `itemIcon` in `src/equipView.ts`). This list is every painting still to make; a test (`test/equipment.test.ts`) checks that
every base without an icon is on it. Tick a piece off (remove its line) when its painting is in `src/art/` and its atlas.

The house prompt and the style references are in [gear-art-prompt.md](gear-art-prompt.md); the tool is planned as
`tools/gear/gen-icons.mjs` (the design's section 12). Paint a slot at a time, about 20 to a batch, head first.

## New bases (129): one painting each; a Mythic is the same painting in the Mythic glow frame

### Head (25)

- `frostCirclet`: Circlet of the Winter Court (Winter Court)
- `stormHood`: Stormcaller's Hood (Stormcaller)
- `vanguardHelm`: Vanguard Helm (Vanguard)
- `radiantHalo`: Radiant Circlet (Radiant Order)
- `wyrmHelm`: Wyrmcrest Helm (Wyrmblood)
- `peakHood`: Peakwarden's Hood (Peakwarden)
- `tideCrown`: Coral Crown (Tidecaller)
- `windCap`: Windrunner's Cap (Windrunner)
- `ashMitre`: Ashen Mitre (Scholar of Ash)
- `nightCowl`: Nightblade Cowl (Nightblade)
- `shogunKabuto`: Shogun's Kabuto (Shogun)
- `kettleHelm`: Iron Kettle Helm
- `rangerHood`: Ranger's Hood
- `sallet`: Sallet of the Watch
- `oniMask`: Oni Mask
- `plagueBeak`: Plague Doctor's Beak
- `hornedHelm`: Horned Helm
- `thornCrown`: Crown of Thorns
- `featherCap`: Feathered Cap
- `monkHeadband`: Monk's Headband
- `tinkerGoggles`: Tinker's Goggles
- `witchHat`: Witch's Hat
- `greatHelm`: Great Helm
- `laurelWreath`: Laurel Wreath
- `mourningVeil`: Veil of Mourning

### Torso (7)

- `brigandine`: Brigandine
- `gambeson`: Padded Gambeson
- `wandererCoat`: Wanderer's Coat
- `wyvernJerkin`: Wyvernhide Jerkin
- `inquisitorRobe`: Inquisitor's Robe
- `coatOfPlates`: Coat of Plates
- `battleKimono`: Battle Kimono

### Right hand (8)

- `tideTrident`: Tidecaller's Trident (Tidecaller)
- `peakAxe`: Peakwarden's Ice Axe (Peakwarden)
- `warHammer`: War Hammer
- `falchion`: Falchion
- `handCannon`: Hand Cannon
- `shortbow`: Shortbow
- `boneWand`: Bone Wand
- `oakStaff`: Oak Staff

### Left hand (21)

- `frostMirror`: Winter Court Mirror (Winter Court)
- `wyrmShield`: Wyrmscale Shield (Wyrmblood)
- `huntersQuiver`: Hunter's Quiver (Hunter's Kit)
- `emberCenser`: Ember Censer (Emberforged)
- `nightDirk`: Night Dirk (Nightblade)
- `graveTotem`: Grave Totem (Gravewalker)
- `shellBuckler`: Tideshell Buckler (Tidecaller)
- `buckler`: Buckler
- `kiteShield`: Kite Shield
- `towerShield`: Tower Shield
- `spikedTarge`: Spiked Targe
- `quiverBarbs`: Quiver of Barbs
- `wardenLantern`: Lantern of Wardens
- `prayerBeads`: Prayer Beads
- `emberTome`: Tome of Embers
- `parryingDagger`: Parrying Dagger
- `boneFetish`: Bone Fetish
- `crystalFocus`: Crystal Focus
- `signalHorn`: Signal Horn
- `handMirror`: Hand Mirror
- `bladedFan`: Bladed Fan

### Feet (26)

- `frostBoots`: Rimewalker Boots (Winter Court)
- `stormBoots`: Stormstrider Boots (Stormcaller)
- `vanguardGreaves`: Vanguard Greaves (Vanguard)
- `radiantSandals`: Sandals of the Radiant Order (Radiant Order)
- `wyrmTalons`: Wyrmclaw Boots (Wyrmblood)
- `peakCrampons`: Peakwarden's Crampons (Peakwarden)
- `tideBoots`: Tidewalker Boots (Tidecaller)
- `stalkerBoots`: Stalker's Boots (Hunter's Kit)
- `ashSlippers`: Ashen Slippers (Scholar of Ash)
- `nightTabi`: Nightblade Tabi (Nightblade)
- `graveBoots`: Gravewalker Boots (Gravewalker)
- `leatherBoots`: Leather Boots
- `ironGreaves`: Iron Greaves
- `wadingBoots`: Wading Boots
- `climberBoots`: Climber's Boots
- `sabatons`: Sabatons
- `softSlippers`: Soft Slippers
- `ironshodBoots`: Ironshod Boots
- `roadSandals`: Sandals of the Road
- `furBoots`: Fur Boots
- `spurredBoots`: Spurred Boots
- `tabi`: Tabi
- `emberTreads`: Ember Treads
- `windSandals`: Windborne Sandals
- `bogStriders`: Bog Striders
- `stiltBoots`: Stilt Boots

### Belt (24)

- `frostSash`: Sash of the Winter Court (Winter Court)
- `stormGirdle`: Stormcaller's Girdle (Stormcaller)
- `vanguardBelt`: Vanguard Girdle (Vanguard)
- `radiantCord`: Cord of the Radiant Order (Radiant Order)
- `wyrmBelt`: Wyrmhide Belt (Wyrmblood)
- `tideSash`: Kelp Sash (Tidecaller)
- `peakRope`: Peakwarden's Rope (Peakwarden)
- `windSash`: Windrunner's Sash (Windrunner)
- `emberGirdle`: Emberforged Girdle (Emberforged)
- `shogunObi`: Shogun's Obi (Shogun)
- `graveChain`: Gravewalker's Chain (Gravewalker)
- `leatherBelt`: Leather Belt
- `strengthGirdle`: Girdle of Strength
- `alchemistSash`: Alchemist's Sash
- `bandolier`: Bandolier
- `herbPouch`: Herb Pouch
- `coinPurse`: Coin Purse
- `championBelt`: Champion's Belt
- `studdedGirdle`: Studded Girdle
- `dancerSash`: Sash of the Dancer
- `flaskBelt`: Flask Belt
- `sapperBelt`: Sapper's Belt
- `wolfBelt`: Wolf-Pelt Belt
- `gamblerBelt`: Gambler's Belt

### Accessory (18)

- `stormRing`: Stormcaller's Ring (Stormcaller)
- `vanguardSignet`: Vanguard Signet (Vanguard)
- `radiantAmulet`: Radiant Amulet (Radiant Order)
- `peakCharm`: Peakwarden's Charm (Peakwarden)
- `windFeather`: Windrunner's Feather (Windrunner)
- `ashQuill`: Ashen Quill (Scholar of Ash)
- `shogunSeal`: Shogun's Seal (Shogun)
- `boneRing`: Bone Ring
- `sunBrooch`: Sun Brooch
- `keepSignet`: Signet of the Keep
- `owlFeather`: Owl Feather
- `hagStone`: Hag Stone
- `wishbone`: Wishbone
- `locket`: Locket
- `blackPearl`: Black Pearl
- `toothNecklace`: Tooth Necklace
- `opalEye`: Opal Eye
- `thiefRing`: Thief's Ring


## Still to come in later batches

- The 21 named legends (batch 2): their own painting each, a little grander.
- The 8 rune stones, the 5 rune frames and the merge spark (batches 4 and 5).
- The 5 remedies (batch 6).
- The 14 set emblems, the 7 empty-slot outlines of the paper doll, the doll's backing and the 3 glyph stones (batches 1 to 3).
