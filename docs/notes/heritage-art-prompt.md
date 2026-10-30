# Prompt: painted artwork for a more varied cast (HERITAGE-LOOKS, part 2)

The owner pastes everything below the line into ChatGPT, which paints the artwork and opens a pull request. Background:
[heritage-looks.md](heritage-looks.md) (the battle sprites were re-toned and every hero was named; these paintings are
the menus' half of that change).

---

You are painting new character artwork for **Legends of the Last Keep**, a fantasy auto-battler played as a phone web app
(repository `hpatter9/legends-of-the-fall`). The owner wants more cultures represented among the heroes. Fifteen heroes
need a new painting each, so that their menu artwork matches their (already updated) pixel battle sprite and their new
personal name. Please paint them with care and respect: real, dignified people with authentic features, skin and hair; no
caricature, no costume stereotypes, nothing comic. Each keeps their class gear and colours; cultural detail is a tasteful
accent in the clothing, jewellery or scene, never a costume.

## What to make, for each hero below

Two PNG images per hero, the same character in the same outfit:

1. **The scene**, `<id>.png`: a full painted illustration of the hero in the scene described, upright **2:3, 1024 x 1536
   pixels or larger** (it is shrunk to fit 1024 x 1536). Painted background, no text, no logo, no frame, no watermark,
   one character only (a companion animal where described). It opens full screen when a player taps the hero.
2. **The cutout**, `<id>-cutout.png`: the same character alone, **whole body standing**, on a **fully transparent
   background** (RGBA PNG, no backdrop, no shadow box), upright **2:3** (1:2 is also accepted), the figure centred and
   filling at least 60% of the height, **the head in the top quarter**. The menus show only the **top half** of the
   cutout (face and shoulders) until the hero is opened, so the face must be clearly visible, well lit and uncovered in
   the top half. It is shrunk to fit 320 x 480.

**Style:** match the existing hero gallery exactly: ornate, painterly anime fantasy character art (gacha splash-art
quality), gothic high fantasy, rich gold filigree and detailed armour, dramatic warm-and-cool lighting, clean confident
line work, expressive adult faces. Look at the files already in the repo before you start, and keep the same rendering:
`docs/samples/anime-heroes/cutouts-contact.jpg` (every cutout), `docs/samples/anime-heroes/scenes-contact.jpg` (every
scene), and the current `src/art/heroes/<id>.webp` and `src/art/heroes/<id>-portrait.webp` of each hero below (same pose
idea, same gear, same colours; only the person changes, plus the accents described).

**Skin tones** are given as the battle sprite's ramp (shadow to highlight) so the painting matches the pixel hero beside
it in the menus; paint natural, luminous skin in that range, not a flat fill.

## The heroes

### 1. `knight`: Kwame, the Knight (Ghanaian, Akan)
- **Role:** the front-line guardian: "a wall of a man: draws the foes and bashes them back". Sword and shield.
- **Sprite gear and colours:** silver steel plate with gold trim, royal-blue scarf and tabard with an ivory panel and a
  blue cross, burgundy cape, round blue shield with a gold cross, broad steel sword, brown boots.
- **The person:** a young adult Ghanaian man, deep brown skin (sprite ramp `#2a150d` `#4a2617` `#6b3c25` `#84522f`
  `#9a6640`), short black tightly coiled hair with a little height on top, dark eyes, broad noble determined face.
- **Accent:** a narrow kente-woven strip (gold, green and black) as the sword belt or the cape's lining.
- **Scene:** kneeling on one knee behind his shield at a breached castle gate, sword braced diagonally, shielding a small
  lantern from drifting embers at dawn.

### 2. `wizard`: Ravi, the Fire Wizard (Indian, Tamil)
- **Role:** a pyromancer: fire that runs from foe to foe. Staff caster.
- **Sprite gear and colours:** tall pointed red wizard hat with a gold band, long burgundy coat with gold borders over
  charcoal robes, wooden staff topped with an amber flame crystal, leather belt and boots.
- **The person:** a young adult Tamil man, brown skin (ramp `#4a2a18` `#6e4026` `#92593a` `#ad7148` `#c2875a`), thick dark
  brown hair with warm auburn lights falling over his brow, dark eyes, a focused, lively face.
- **Accent:** the coat's gold border worked in a temple-border (kolam-like) pattern.
- **Scene:** leaning into a sweeping staff cast in a ruined library, a spiral of controlled flame rising round levitating
  scorched books.

### 3. `peasant`: Minh, the Peasant (Vietnamese)
- **Role:** formation militia who closes ranks and braces pikes. Long spear.
- **Sprite gear and colours:** wide conical straw hat (paint it as a Vietnamese nón lá), simple ochre padded tunic, navy
  trousers, white leg bindings, rope belt, wooden spear with a red tassel.
- **The person:** a young adult Vietnamese man, warm tan skin (ramp `#6a4127` `#8f5d3c` `#ad7752` `#c48d63` `#d6a57a`),
  short dark brown-black hair, cheerful determined face. Humble, practical, proud.
- **Accent:** none beyond the nón lá; keep the clothes plain and honest.
- **Scene:** bracing his spear diagonally across a narrow bridge over flooded rice terraces at sunrise, hat tilted into
  the wind.

### 4. `paladin`: Karim, the Paladin (Lebanese)
- **Role:** a martyr who takes his friends' wounds on himself. Mace and shield.
- **Sprite gear and colours:** silver-white plate with ornate gold trim, ivory and royal-blue tabard, heavy golden mace,
  blue kite shield marked with a gold sun.
- **The person:** an adult Lebanese man, olive skin (ramp `#5e4429` `#86643f` `#a88259` `#bf9a6e` `#d2b083`), short dark
  brown hair, dark eyes, clean-shaven or light stubble, a calm protective face.
- **Accent:** a small cedar-tree emblem engraved on a pauldron or the shield's rim.
- **Scene:** stepping forward with shield raised and mace lowered through a broken cathedral doorway, golden morning light
  striking the sun emblem.

### 5. `cleric`: Selam, the Cleric (Ethiopian, Amhara)
- **Role:** a battle priest whose smites heal. Mace and prayer book.
- **Sprite gear and colours:** ivory hood and white robes, teal stole with gold trim, leather boots, compact mace, small
  prayer book at the belt.
- **The person:** an adult Ethiopian woman, deep brown skin (ramp `#2a150d` `#4a2617` `#6b3c25` `#84522f` `#9a6640`),
  dark brown hair in soft curls or fine braids framing her face under the hood, warm determined eyes.
- **Accent:** a woven tibeb border (the patterned hem of a habesha dress) on the white robe, and an Ethiopian processional
  cross motif in the stole's gold embroidery.
- **Scene:** kneeling beside a wounded traveller's discarded shield in a field hospital, prayer book open on a crate, one
  hand extended with gentle teal healing light.

### 6. `ranger`: Inti, the Ranger (Quechua, Peruvian Andes)
- **Role:** a trapper: snares and fields of caltrops, and a longbow.
- **Sprite gear and colours:** deep green hooded cloak with a gold clasp, leather armour, tan leggings, high boots, plain
  wooden longbow, back quiver, belt snares.
- **The person:** a young adult Quechua woman, brown skin (ramp `#4a2a18` `#6e4026` `#92593a` `#ad7148` `#c2875a`), long
  dark brown hair in a braid, dark eyes, a keen, steady face.
- **Accent:** an Andean woven belt with geometric patterns at her waist, and a woollen lining to the cloak.
- **Scene:** half kneeling in fern cover on a forest ridge, bow drawn low through the foliage as dawn breaks through
  ancient trees.

### 7. `illusionist`: Luana, the Illusionist (Afro-Brazilian)
- **Role:** a trickster: decoys, and friends swapped out of danger. Wand and hand mirror.
- **Sprite gear and colours:** purple feathered tricorn with gold trim and white and purple plumes, ornate purple and gold
  corseted longcoat dress with white lace sleeves, dark stockings, purple and gold boots, white gloves, slender wand,
  ornate hand mirror with a glowing violet gem.
- **The person:** an adult Afro-Brazilian woman, brown skin (ramp `#4a2a18` `#6e4026` `#92593a` `#ad7148` `#c2875a`),
  long voluminous chestnut-brown curls, a charming confident smile.
- **Accent:** fine Bahian-style white lace (renda) at the sleeves and collar.
- **Scene:** taking a theatrical bow on a candlelit enchanted theatre stage, one gloved hand flourishing the wand, the
  other raising the jewelled mirror, violet illusion ribbons spiralling through floating playing cards.

### 8. `buccaneer`: Tiago, the Buccaneer (Cape Verdean)
- **Role:** a gambler: hooks, and the dice. Cutlass and grappling hook.
- **Sprite gear and colours:** brown tricorn over a red bandana, open ivory shirt, red sash, weathered brown short coat,
  curved silver cutlass, iron grappling hook, knee boots and belts.
- **The person:** an adult Cape Verdean man, brown skin (ramp `#4a2a18` `#6e4026` `#92593a` `#ad7148` `#c2875a`), short
  dark curly hair under the bandana, light stubble, a dashing grin.
- **Accent:** the sash or a coat lining in panu di terra, the indigo-and-white woven cloth of the islands.
- **Scene:** swinging from a ship's rigging above a sunlit harbour, cutlass held out and hook catching the rope, coat and
  sash flying.

### 9. `timeWitch`: Adaeze, the Time Witch (Nigerian, Igbo)
- **Role:** a time-bender: hastes, slows, and turns back a friend's clock. Hourglass staff.
- **Sprite gear and colours:** wide crooked midnight-blue witch hat with gold clock faces and gears, ornate midnight-blue
  and gold star-patterned corseted robe dress with split skirts and pale silk lining, black stockings, gold-trimmed boots,
  hanging gold pocket watches and clockwork chains, tall staff topped with a golden hourglass of glowing blue sand.
- **The person:** an adult Igbo woman, deep brown skin (ramp `#2a150d` `#4a2617` `#6b3c25` `#84522f` `#9a6640`), long
  flowing silver hair (keep it: it is her magic), violet eyes, an elegant, confident face.
- **Accent:** coral bead jewellery, and uli-style flowing line patterns in the gold embroidery.
- **Scene:** suspended above the floor of a shattered clock tower, one hand turning a floating golden clock ring while her
  hourglass staff holds falling fragments in mid-air.

### 10. `dragoon`: Tiziri, the Queen Dragoon (Amazigh, Moroccan)
- **Role:** a dragon knight who breathes fire and leaps. Lance.
- **Sprite gear and colours:** horned dragon-crest helm, ornate teal and gold dragon-scale plate, small leathery dragon
  wings on her back, purple waist cape, long silver-tipped lance, armoured boots.
- **The person:** an adult Amazigh woman, olive skin (ramp `#5e4429` `#86643f` `#a88259` `#bf9a6e` `#d2b083`), long teal
  hair (keep it), strong regal features, a fierce, proud face. Human, not a dragon.
- **Accent:** Amazigh geometric motifs (the ⵣ yaz among them) engraved in the gold trim, and a silver fibula brooch at
  the cape.
- **Scene:** landing from a leap on a ruined battlement, one knee bent, lance braced into the stone and wings spread, teal
  hair streaming against a violet mountain sky.

### 11. `sage`: Seydou, the Great Sage (Malian)
- **Role:** a mana battery: falling stars, and his friends' mana pools filled. Staff.
- **Sprite gear and colours:** deep-blue star-patterned robes, broad pointed blue wizard hat with a gold band, gnarled
  wooden staff topped with a small golden star orb, book at the belt, brown shoes.
- **The person:** an elderly Malian scholar, deep brown skin (ramp `#2a150d` `#4a2617` `#6b3c25` `#84522f` `#9a6640`), a
  long white beard, kind, knowing eyes.
- **Accent:** bogolan (mud-cloth) patterns on the robe's lining, and old manuscripts among the star charts, recalling the
  libraries of Timbuktu.
- **Scene:** seated cross-legged on a floating stone in an open celestial observatory, star staff across his lap, beard
  and robes drifting among luminous star charts.

### 12. `lightningMage`: Malia, the Lightning Mage (Samoan)
- **Role:** a storm marker: lightning that marks, then sets the marks off. Crystal staff.
- **Sprite gear and colours:** deep purple-blue robes with gold lightning patterns, short pointed violet hat, staff tipped
  with a blue crystal, bright cyan eyes.
- **The person:** a young adult Samoan woman, brown skin (ramp `#4a2a18` `#6e4026` `#92593a` `#ad7148` `#c2875a`), long
  silver-white hair (keep it), an energetic, confident face.
- **Accent:** Polynesian-inspired geometric patterns in the gold trim of the robes only (on the cloth, not tattooed on her
  skin), and a small shell or flower ornament in her hair.
- **Scene:** landing on one knee on a storm-battered observatory balcony, staff touching the stone as branching cyan
  lightning crackles across a shattered astrolabe.

### 13. `beastmaster`: Itzel, the Beastmaster (Maya, Mexico)
- **Role:** a summoner who calls the pack and sets it on a foe. Whip and hunting knife, a grey wolf.
- **Sprite gear and colours:** fur-trimmed brown leather armour, coiled leather whip, small curved hunting knife, rugged
  boots, long dark braids with a small feather (the sprite has one).
- **The person:** an adult Maya woman, brown skin (as she is now), long black braids, strong calm features.
- **Accent:** replace the current war paint and bone charms (they read as a generic "tribal" costume): no face paint;
  instead a jade bead necklace and a sash embroidered in the bright floral and geometric style of a Yucatec huipil, ribbons
  woven into the braids.
- **Scene:** kneeling on a ridge above a misty tropical forest with a gloved hand resting near the muzzle of her loyal grey
  wolf, whip at her hip, distant pyramid-shaped hills under storm clouds.

### 14. `lancer`: Bataar, the Lancer (Mongolian)
- **Role:** momentum cavalry who hits harder the further he rides. Mounted, lance.
- **Sprite gear and colours:** steel plate and a blue-plumed helmet with the face visible, royal-blue saddle cloth, brown
  leather tack, a compact sturdy brown armoured horse, long silver-tipped lance. Show the entire horse, rider and lance.
- **The person:** an adult Mongolian man, light warm skin, black hair, dark eyes, a weathered, cheerful horseman's face.
- **Accent:** a blue silk scarf (a khadag) tied to the lance below the tip, and the high collar of a deel under the armour.
- **Scene:** his horse rearing on a grassy steppe ridge above battle banners, blue saddle cloth flying, lance held
  diagonally skyward.

### 15. `mercenary`: Kian, the Mercenary (Persian, Iranian)
- **Role:** a bounty hunter who marks the strongest and is paid for it. Broadsword.
- **Sprite gear and colours:** worn leather armour over steel chainmail, charcoal travelling cloak, notched broadsword,
  coin purse, leather boots.
- **The person:** a grizzled middle-aged Persian man, olive-tan skin (as now), short dark hair with a grey streak,
  stubble, a scar, a grounded veteran's face.
- **Accent:** a girih (Persian geometric) pattern on the sword's guard, and a paisley (boteh) lining to the cloak.
- **Scene:** seated on a broken camp cart at dusk, broadsword across his knees while he sharpens its edge, his face lit by
  a low campfire.

## Putting them in the game

The game loads `src/art/heroes/<id>.webp` (the scene) and `src/art/heroes/<id>-portrait.webp` (the cutout) for each hero
id; `build.mjs` copies every `.webp` in that folder and adds it to the offline cache, so **no code changes are needed**:
replace the existing files, keeping their names.

1. Save your two originals per hero as `art-source/heritage-heroes/<id>.png` and `art-source/heritage-heroes/<id>-cutout.png`
   (that folder is git-ignored: do not commit the originals).
2. Run `python3 tools/heritage/import-art.py --check`, fix anything it reports, then `python3 tools/heritage/import-art.py`.
   It writes the two WebPs per hero at the gallery's sizes and settings (scene fitted inside 1024 x 1536, WebP quality 88;
   cutout fitted inside 320 x 480, WebP quality 85 with lossless alpha). If you cannot run it, produce those WebPs
   yourself to exactly that spec (the scene RGB, the cutout RGBA with a transparent background).
3. If Node is available, run `npm install`, `npm run web`; it must build without errors.

## The pull request

- Branch **`art/heritage-heroes`** from the latest `main`, **one commit**, then open a pull request into `main` titled
  "Painted artwork for a more varied cast (HERITAGE-LOOKS part 2)".
- The commit holds only the 30 replaced files in `src/art/heroes/` (two per hero above) and one added line in
  `CREDITS.md`, at the end of the "## Anime hero gallery" section:
  `- Fifteen heroes repainted for a more varied cast (Knight, Fire Wizard, Peasant, Paladin, Cleric, Ranger, Illusionist, Buccaneer, Time Witch, Queen Dragoon, Great Sage, Lightning Mage, Beastmaster, Lancer, Mercenary): original artwork generated with OpenAI image generation for the owner's heritage request (docs/notes/heritage-art-prompt.md), replacing their earlier scenes and cutouts; same file names and sizes.`
- **Change nothing else:** no code, no other art, no version number, no other notes.
- In the pull request's description, put a contact sheet of the fifteen new cutouts (an image in the description is
  enough; do not commit it), and list the heroes.
