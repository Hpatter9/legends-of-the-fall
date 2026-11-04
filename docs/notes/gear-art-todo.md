# Gear art still to make

The OpenAI image account is out of credits for now, so the new pieces show a clear placeholder (their slot's outline, faint, with their
name on it: `itemIcon` in `src/equipView.ts`). This list is every painting still to make; a test (`test/equipment.test.ts`) checks that
every base without an icon is on it. Tick a piece off (remove its line) when its painting is in `src/art/` and its atlas.

**The tool** is `tools/gear/gen-icons.mjs` (the design's section 12): one prompt a piece from its name and slot in the house style of
the 120 paintings already in the game, through the connected image API, saved at 256 x 256 to `art-source/gear/<slot>/<id>.png` (the
legends to `legends/`); then `python3 tools/gear/import-gear-icons.py --contact <png>` cleans, centres and packs them (it now reads all
210 bases, and a new base needs only its standard painting: its Mythic is the same painting in the Mythic frame). Paint a slot at a
time, about 20 to a batch, head first: `node tools/gear/gen-icons.mjs --slot head --limit 20` (`--dry` prints the prompts and sends
nothing). It has not been run: the image account was out of credits when it was written.

**The pack audit** (batch 7, `hpatter9/chronos-assets`): the packs have no equipment icons in the paintings' style. `Helm/` and
`Shield/` are worn layers for 1024 x 1024 character sheets (a few pixels of helm or shield on a body), not item icons;
`Magic_Items_01_Pack_FREE` is 16 to 48 px pixel art (wands, staves, rings, amulets, tomes, scrolls) that would sit badly beside the
painted icons; `pixelvault-rpg-weapons-armor` holds ten weapon sprites, no armour. So no pack sprite is used for the gear; the
placeholders stay until the paintings come. **The rune stones were found in the packs**: the 16px rune discs of the 5000 Pixel Effects
pack, one element a kind (`src/runeArt.ts`, credited in `CREDITS.md`).

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


## The 21 named legends: their own painting each, a little grander (no Mythic frame: a legend is always Legendary)

- `crownLastKing`: Crown of the Last King (head)
- `maskLaughingFox`: Mask of the Laughing Fox (head)
- `helmSevenWinters`: Helm of Seven Winters (head)
- `ferrymansCoat`: The Ferryman’s Coat (torso)
- `wyrmhideVaelkhar`: Wyrmhide of Vaelkhar (torso)
- `aegisOdile`: Aegis of Saint Odile (torso)
- `lastLight`: Last Light (right hand)
- `gravesong`: Gravesong (right hand)
- `widowsBow`: The Widow’s Bow (right hand)
- `shieldHundredNames`: Shield of a Hundred Names (left hand)
- `unwrittenBook`: The Unwritten Book (left hand)
- `bellOfEnding`: Bell of Ending (left hand)
- `sevenLeagueBoots`: Seven-League Boots (feet)
- `ashwalkerSabatons`: Ashwalker Sabatons (feet)
- `moonSlippers`: Slippers of the Moon Court (feet)
- `girdleGiantKing`: Girdle of the Giant-King (belt)
- `rookBandolier`: Captain Rook’s Bandolier (belt)
- `pilgrimsCord`: The Pilgrim’s Cord (belt)
- `ringReturning`: Ring of Returning (accessory)
- `timeHourglass`: Time Witch’s Hourglass (accessory)
- `gorgonEye`: Eye of the Gorgon (accessory)

## Still to come in later batches

- The 5 rune frames and the merge spark (batches 4 and 5); the 8 rune stones are the pack's rune discs, so they need no painting.
- The 5 remedies (batch 6): the rogue pack's potion and elixir sprites stand in (`src/remedyArt.ts`).
- The 14 set emblems, the 7 empty-slot outlines of the paper doll, the doll's backing and the 3 glyph stones (batches 1 to 3); the
  stall's Enchant tab shows a Rare book until its glyph-stone icon is made.
