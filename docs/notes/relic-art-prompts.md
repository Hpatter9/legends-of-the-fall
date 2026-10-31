# Prompts for the painted relic icons (RELICS-2)

The owner's call: the 48 relics get painted icons, in the painted equipment icons' style (`art-source/gear/`, `docs/notes/gear-icons.md`).
The image tool is not connected yet, so until the paintings come the game uses the DawnLike tiles (`src/art/items/`, every relic its own
tile; `tools/relics/relic-icons-2.py` cut the three new ones). These are the prompts to paint them with.

## How to use them

- One painting a relic, **256 x 256**, transparent background, saved as `art-source/relics/<id>.png` (the relic's id from
  `src/sim/relics.ts` / `relicSets.ts`, e.g. `art-source/relics/banner.png`). The Storied six also get a second, brighter painting,
  `<id>-storied.png`, as gear's Mythic does.
- Each prompt is the **shared prompt** with the two bracketed parts filled in: the chapter's glow colour and the relic's subject.
- The page draws the rarity frame (grey Common, blue Rare, gold Storied), so no frame is painted.
- When the paintings are in, an importer copied from `tools/gear/import-gear-icons.py` cleans the edges and packs them into
  `src/art/relics/relics-128.webp` and `-64.webp` (loaded by URL and added to `build.mjs`'s `FILES`, so the game stays playable offline);
  `relicIcon` (`src/render/items.ts`) then reads the atlas, and the DawnLike tiles stay as the fallback.

## The shared prompt

> A single fantasy relic, painted game item icon, centred on a plain transparent background, three-quarter view, rich saturated colour,
> soft painted highlights, crisp clean silhouette, in the same style as a set of hand-painted RPG equipment icons. The object is old and
> treasured, an artefact of a besieged keep's long history: worn gilding, patina, small chips and scratches, a wax seal or a scrap of
> ribbon where it fits, lit warmly as if by candlelight in a reliquary, with a faint **[GLOW]** glow behind it. Subject: **[SUBJECT]**.
> No text, no letters, no frame, no hands, no background scene, no other objects. 256 x 256.

For a Storied relic's second painting, add: *"Its glow is stronger and gold-white, with a few drifting motes of light; the object
itself looks the same."*

## The glow colours

| Chapter or group | [GLOW] |
|---|---|
| I, The Founding | warm gold-white |
| II, The Long Winter | pale icy blue |
| III, The Burning | ember red-orange |
| IV, The Night Watch | deep violet |
| V, The Hunt | moss green |
| VI, The Treasury | rich coin gold |
| Storied | bright gold |
| Askel, the Cinderhound | smouldering orange |
| Nivra, the Rime Wyrm | frost white-blue |
| Aurelan, the Lion of Dawn | sunrise gold-pink |
| Voltara, the Copper Goddess | crackling copper and electric blue |
| Gorm, the Quarry Titan | earthy amber-brown |
| Vaelkhar, the Dragon King | dark crimson and black |

## The subjects

### Chapter I: The Founding

| id | Relic | [SUBJECT] |
|---|---|---|
| banner | The First Banner | a small tattered square war banner on a short broken wooden pole, stitched from patched cloaks, embroidered with a green hill and nine small stars, its edges frayed |
| scholarScroll | The Founder's Ledger | a thick leather-bound ledger with brass corners and a cracked clasp, pages stuffed with tiny tabs, a quill feather tucked in the spine |
| holyChalice | St Oswin's Cup | an oversized plain silver chalice, slightly dented, a small saint's halo engraved on it, a drop of red wine on the rim |
| saintMedal | The Warden's Medal | a round bronze medal on a faded red ribbon, its face crowded with tiny engraved names, most of them scratched out |

### Chapter II: The Long Winter

| id | Relic | [SUBJECT] |
|---|---|---|
| ironShield | The Gate Boss | a heavy round iron boss torn from a gate, studded rivets, rusted edges, a few bent nails still sticking out of its rim |
| hourglass | The Stopped Hourglass | a brass-and-oak hourglass with frost on its glass, its pale sand frozen mid-fall in a thin column |
| frostSapphire | Rime Sapphire | a large faceted blue sapphire crusted with white rime and tiny icicles, set in a simple silver claw |
| winterCloak | The Sentry's Cloak | a folded thick grey wool cloak with a fur collar and a bronze clasp, dusted with snow |

### Chapter III: The Burning

| id | Relic | [SUBJECT] |
|---|---|---|
| phoenix | Phoenix Feather | a single long flame-coloured feather, its tip glowing like a live coal, a few sparks lifting from it |
| warDrum | The Siege Drum | a small battered war drum with a scorched hide head and rope lacing, one drumstick crossed over it |
| emberRuby | Ember of the Great Hall | a glowing coal in an iron hearth-cage the size of a fist, orange light leaking through the bars, a thin curl of smoke |
| dragonScale | Scorched Scale | a single huge dark-red dragon scale, edge singed black, with a faint heat shimmer |

### Chapter IV: The Night Watch

| id | Relic | [SUBJECT] |
|---|---|---|
| featherCharm | The Watchman's Charm | a small charm of three black feathers bound with silver wire around a tiny bell, on a leather thong |
| hawkEye | The Hawk's Eye | a glass eye with a gold-flecked amber iris, resting in a worn velvet-lined falconer's case |
| shadowCloak | The Cutpurse's Cloak | a folded dark hooded cloak with many small hidden pockets, one coin peeking out, frayed hem |
| viperFang | The Poisoner's Fang | a long curved snake fang set as a pendant, a green drop of venom at its tip, a thread of moss from a well |

### Chapter V: The Hunt

| id | Relic | [SUBJECT] |
|---|---|---|
| whetstone | The Old Whetstone | a sharpening stone worn down to a thin dished sliver, grey with a dark oiled stripe, on a strip of leather |
| swiftBoots | The Courier's Boots | a pair of worn, mud-spattered leather riding boots with small wings stitched on the cuffs, one lace broken |
| wolfFang | The Wolf-Tooth Necklace | a long necklace of many wolf teeth threaded on sinew, coiled in a loop |
| beastHarness | The Huntmaster's Harness | a leather hunting harness with brass rings and a torn strap, claw marks across it |

### Chapter VI: The Treasury

| id | Relic | [SUBJECT] |
|---|---|---|
| luckyCoin | The Coronation Crown-Piece | one large gold coin with a crowned profile, its date half struck, standing on its edge |
| gildedIngot | The Tax Ingot | a single heavy gold ingot stamped with a seal, slightly lumpy where it was melted down in a hurry |
| jewelCrown | The Pawned Crown | a small gold crown with two of its jewels missing, a pawnbroker's paper tag tied to it with string |
| spyglass | The Watchtower Glass | a brass spyglass, extended, with a cracked leather grip and a small chip in the lens |

### The Storied relics

| id | Relic | [SUBJECT] |
|---|---|---|
| sunCrown | The Crown of the First King | a massive old gold crown, too heavy-looking, set with a single large sunstone, its band worn smooth inside |
| dragonHeart | Vaelkhar's Heart | a dark-red crystallised dragon's heart, faceted like a gem, with a slow ember glow at its core, bound in a black iron cage |
| stormRing | Voltara's Wedding Ring | a copper ring with a storm-blue stone, tiny arcs of lightning crawling over it |
| voidLens | The Calamity's Eye | a jagged lens-shaped shard of black-violet glass with a pale iris-like swirl in its depths, rimmed in tarnished silver |
| bookOfNames | The Book of Names | a tall narrow black-bound book, its pages edged in red, a long list of names visible as tiny scribbles on the open last page, half the page still blank |
| unfinishedChronicle | The Unfinished Chronicle | a great illuminated chronicle lying open, rich painted margins on the left page, the right page blank but for a single fresh drop of ink and a resting quill |

### The Eidolons' reliquaries (step 2, the Calamity)

| id (new) | Relic | [SUBJECT] |
|---|---|---|
| cinderCollar | Cinder Collar (Askel) | a too-small spiked iron hound collar glowing with embers at its seams |
| ashTooth | Hound's Ash-Tooth (Askel) | one huge grey-black canine tooth with an ember-red root, chipped at the tip |
| emberBrand | Ember Brand (Askel) | a clump of scorched earth shaped like a sleeping hound's outline, still smoking, on a flat stone |
| rimePearl | Rime Pearl (Nivra) | a pale blue-white pearl the size of an egg, wrapped in curling frost |
| breathVial | Wyrm's Breath Vial (Nivra) | a stoppered crystal vial holding swirling white mist, its wax seal cracked with frost |
| glacierStep | Glacier Step (Nivra) | a clear block of ice with a giant clawed footprint frozen in it |
| maneThread | Mane-Gold Thread (Aurelan) | a single long shining golden hair wound on a small wooden spindle |
| dawnChart | The Dawn Chart (Aurelan) | a rolled star chart tied with gold ribbon, a rising sun painted on its visible edge |
| oathRing | Lion's Oath-Ring (Aurelan) | a heavy gold signet ring with a roaring lion's head, a ruby in its mouth |
| thunderHorn | Thunder Horn (Voltara) | a copper herald's horn with lightning-shaped engraving, one small dent |
| copperTorc | Copper Torc (Voltara) | an open copper neck torc, green-patinated, with blue sparks at its two ends |
| tempestRing | Tempest Ring (Voltara) | a thin copper ring humming with a tiny swirling storm cloud above it |
| graniteHeart | Granite Heart (Gorm) | a heart-shaped lump of grey granite with a faint amber vein that glows like a slow pulse |
| quarryGauntlet | Quarry Gauntlet (Gorm) | a huge stone-and-iron gauntlet, cracked, dust falling from its knuckles |
| mossBell | Moss Bell (Gorm) | an old bronze bell covered in soft green moss, a small fern growing from its crown |
| voidShard | Void Shard (Vaelkhar) | a sharp splinter of night sky, black with tiny stars inside, in a crimson setting |
| kingSigil | Dragon-King's Sigil (Vaelkhar) | a heavy black wax seal bearing a dragon's head, on a torn letter edge |
| doomHelm | Doom Helm (Vaelkhar) | a black horned rider's helm with crimson trim, never worn, gleaming |

(The step-2 ids are proposals; the Calamity relics keep their old ids where the design keeps them, as `thunderHorn` and `doomHelm` do.)
