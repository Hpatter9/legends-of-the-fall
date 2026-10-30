# The Ultimate's Kit paintings — Session U

Thirteen source sheets for the hero's ultimate effects kit.
These sheets make a hero's ultimate feel epic: when an ultimate fires, the fight pauses, a band slashes across the screen with the hero's portrait and the ultimate's name, the board darkens, and then the ultimate lands. These paintings are the **speed lines** in that band, its **glowing edge**, the **power gathering** on the hero, and a **huge impact burst** for each of the ten elements, played where the ultimate lands.

This batch is independent and adds no game code or simulation changes.

### The band and the gathering (3 sheets):
- `ult-speedlines` (white with a pale gold tint; game tints per element): `beam` (loop, 6 frames, 4 wide, tall 0.9): dense horizontal speed lines and streaks rushing to the right, thicker and brighter through the middle, thinning to top and bottom edges, seamless at left and right edges. *Light*.
- `ult-edge` (white-gold; game tints): `beam` (loop, 4 frames, 4 wide, tall 0.25): razor-bright glowing slash line with sparks flaking off it, seamless at left and right edges. *Light*.
- `ult-gather` (white-gold; game tints): `cast` (once, 8 frames, 2.5 wide): power gathering on the hero: streaks and motes of light rushing inward to chest height (128, 138), tightening 2:1 ground ring at feet, building to bright climactic flare in the last frames. Stands on cell's bottom edge. *Light*.

### The impact bursts, one for each element (10 sheets):
Each: `impact` (once, 8 frames, 4 wide, centred): huge burst where the ultimate lands: white-hot flash in the first frames, elemental burst exploding outward with shock ring along ground (flattened 2:1 ellipse), dying away to faint wisps in the final frame. *Light* at the core.

- `ult-burst-fire` (flame orange `#ff8a2a`, yellow-white `#fff0a0`, ember red `#d03a10`): roaring explosion of flame with a shock ring and flying embers.
- `ult-burst-ice` (ice blue `#7fd4ff`, white frost `#e8f8ff`, deep blue `#2a6aa8`): burst of ice shards and frost mist bursting outward, crystals catching the light.
- `ult-burst-lightning` (electric blue `#77cfff`, yellow-white `#fff27a`): blinding discharge: forked bolts radiating out from a white-hot core.
- `ult-burst-light` (warm gold `#ffd36a`, white-gold `#fff6d0`, soft amber `#e0a030`): holy starburst: rays of golden light and a ring of radiance.
- `ult-burst-dark` (black-violet `#3a1050`, sickly violet `#b060ff`): void burst: dark sphere tearing open with violet rim and shadow tendrils (bright violet edges so it reads on dark ground).
- `ult-burst-forest` (leaf green `#5aa83a`, bark brown `#6a4a2a`, blossom `#ffb0c8`): explosion of leaves, petals and green light, vines whipping outward.
- `ult-burst-poison` (bile green `#8aa83a`, grey-green `#5a6a40`, bruise violet `#6a4a7a`): toxic blast: bursting cloud of bright green venom and droplets.
- `ult-burst-earth` (warm grey `#9a8a78`, sand `#d8c49a`, dark rock `#4a3e34`): ground erupting: rock slabs and dust thrown outward in a ring.
- `ult-burst-wind` (pale teal `#b8f0e8`, white, sky blue `#9ad0ff`): cyclone burst: spiralling gusts and streaks blasting outward.
- `ult-burst-blood` (blood red `#e0403a`, crimson `#7a0e14`, highlight `#ff9a9a`): crimson burst: ring of blood-red energy and droplets with dark core.

All sheets are structured as square 256x256 px cells with an 8% clear margin on fully transparent backgrounds.
Validated against `python tools/spell-fx/import-spell-art.py art-source/spell-fx --check` specifications.
