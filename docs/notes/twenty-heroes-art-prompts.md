# Twenty heroes: prompts for the missing art

The audit ([twenty-heroes-audit.md](twenty-heroes-audit.md), contact sheet
[twenty-heroes-audit.png](../samples/twenty-heroes-audit.png)) found that of the twenty new heroes' art only the Vampire Lord's and the
Hemomancer's full scenes and the eight painted effect sheets are finished. This note holds a ready-to-paste prompt for every piece
ChatGPT (Codex with its image tool) should paint, modelled on [heritage-art-prompt.md](heritage-art-prompt.md),
[anime-hero-gallery.md](anime-hero-gallery.md) and the effects brief `art-source/spell-fx/BRIEF.md`.

**Before pasting:** the director confirms the canon in the audit (names, sexes, heritages). The descriptions below use it. If it
changes, edit the hero's lines here first.

Each prompt stands alone: paste everything inside its fence into a new Codex conversation. Each one branches from `main`, adds PNGs
under `art-source/heroes-20/` only, and opens one pull request. Nothing is imported by ChatGPT; the builder imports and packs the
PNGs afterwards (`tools/anime-heroes/pack.cjs` for scenes and cutouts, `tools/fxlab/import-ability-art.py` for icons,
`tools/spell-fx/import-spell-art.py` for effect sheets), credits them and adds them to the service worker.

| Prompt | Pieces | PR branch |
| --- | --- | --- |
| 1 | Scenes and cutouts: the five Vampires (3 scenes, 5 cutouts) | `art/heroes-20-vampires` |
| 2 | Scenes and cutouts: War Drummer, Banneret, Geomancer, Bell Warden, Falconer | `art/heroes-20-portraits-2` |
| 3 | Scenes and cutouts: Astral Sphinx, Mirage Dancer, Plague Doctor, Bombardier, Astrologer | `art/heroes-20-portraits-3` |
| 4 | Scenes and cutouts: Inquisitor, Seraph, Corsair Surgeon, Harpooner, Sea Reaver | `art/heroes-20-portraits-4` |
| 5 | Awakened icons, all 20 | `art/heroes-20-awakened` |
| 6 | The eight effect sheets cleaned of their box edges | `art/heroes-20-fx` |
| 7 | One painted icon a move, 80 moves (only once the kits are settled on main) | `art/heroes-20-icons` |

**Not for ChatGPT: the battle sheets.** These need exact pixel grids, which ChatGPT does not keep. They are made with PixelLab, as in
[hero-art.md](hero-art.md) (`tools/pixellab/`, the proxy for `api.pixellab.ai` is connected), after the director confirms and the
PixelLab plan has generations again (0.75 left today). For each of the 20 heroes:

- `hero_res_<snake id>.png` and `hero_res_<snake id>_back.png`: the plain figure, front and true back three-quarter view, in main's
  grid (4 cells a row; rows idle 4, walk 8, attack 4, hurt 4, dead 4 ending lying, attack2 4; figure about 96 px tall in a cell of
  about 144-160 x 111-116, feet on the cell's bottom, facing right; `sheets.json` as `hero_res_tyrant`);
- `awakened_<id>.png` and `awakened_<id>_back.png`: the awakened figure in the same grid, as the 45 in `src/art/awakened/`.

That is 80 sheets. Every sheet on the branch is a placeholder (three re-coloured figures, backs that are fronts, figures across the
cell edges), so none is kept. Each hero's PixelLab description is its "Look" line below, so the sprite and the paintings match.

## The heroes (the canon used below)

| id | Name, title | Heritage | Origin / class | Look |
| --- | --- | --- | --- | --- |
| `vampireLord` | Vladislav, Voivode of the Red Keep | Romanian (Wallachian) | Vampire / Blade | Tall pale nobleman, long silver-white hair, red eyes; black and gold filigree plate under a high-collared crimson cape; a long rapier-like sword with a red edge. |
| `hemomancer` | Carmilla, Countess of the Chalice | Austrian (Styrian) | Vampire / Caster | Pale countess, black hair piled high with red pins, red eyes; crimson and black brocade gown with gold trim; a gold chalice in one hand, ribbons of blood magic from the other. |
| `nightstalker` | Sorin, Wing of the Crypt | a Transylvanian strigoi | Vampire / Assassin | Not human: a lean winged strigoi with violet-grey skin, white spiky hair, large bat wings, red claws and fangs, dark leather straps. |
| `bloodGargoyle` | Gavril, Stone Sentinel of the Fane | a cathedral gargoyle | Vampire / Bulwark | Not human: a hulking gargoyle of dark basalt with red veins, stone bat wings, horns, a cracked crimson heart-gem in the chest. |
| `dhampir` | Klara, Silver-Bolt Hunter | Czech (Bohemian) | Vampire / Gunner | Young woman, half vampire: pale, one red eye and one grey, dark braided hair; long black hunter's coat with silver buckles, wide hat; a repeating crossbow and silver stakes at the belt. |
| `warDrummer` | Raiden, Thunder of the Keep | Japanese | Samurai / Support | Broad-shouldered man with a topknot and a headband; open dark-blue happi coat over lacquered red samurai shoulder guards; a great oxhide taiko drum on a frame on his back, two heavy bachi sticks. |
| `banneret` | Isolde, Voice of the Rampart | Norman French | Knightly / Warden | Woman knight with a short fair braid, open-faced helm; steel plate with a blue and gold surcoat; a lance carrying a long silk guidon of the keep and a kite shield. |
| `geomancer` | Tenzin, Shaper of Crags | Tibetan | Mystic / Bulwark | Woman with a calm weathered face and long black braids with turquoise and coral beads; layered maroon and saffron robes over stone-plated bracers; a staff of carved slate with a floating ring of rock. |
| `bellWarden` | Kavi, Keeper of the Bronze Toll | a yokai temple-bell guardian | Yokai / Bulwark | Not human: a towering bronze-skinned oni-like guardian with small horns and green patina markings, a monk's straw rope belt; a great bronze temple bell carried on his shoulders, its striker beam in hand. |
| `falconer` | Aisling, Wing of the Glen | Scottish Gaelic | Wild / Marksman | Woman with wind-tossed copper hair, freckles; green and brown tartan plaid over a leather jerkin, a gauntlet; a white gyrfalcon on her arm and a recurve bow. |
| `astralSphinx` | Nenet, Riddle of the Stars | Egyptian myth | Arcane / Beast | Not human: a winged lioness sphinx with a woman's serene face, deep blue star-flecked fur, gold and lapis nemes headdress and collar, feathered wings of night sky. |
| `mirageDancer` | Zahara, Veil of the Dunes | Nubian (Sudanese-Egyptian) | Frontier / Trickster | Woman with deep brown skin and long black braids with gold cuffs; flowing sand-gold and white silk veils over a fitted dancer's top, many bangles; twin curved scimitars. |
| `plagueDoctor` | Corvus, Censer of Ash | Venetian undead lore | Undead / Arcanist | Not human: an undead physician, grey skin, a long black beaked plague mask with glowing green lenses, wide-brimmed hat, waxed black coat; a smoking brass censer on a chain and green vials. |
| `bombardier` | Soren, Iron Alchemist | Danish | Machine / Gunner | Man with a singed blond beard and soot-smudged goggles; leather apron over riveted iron armour, a backpack of fuses and a small rocket pack; a short iron mortar-gun. |
| `astrologer` | Cyra, Keeper of the Astrolabe | Alexandrian Greek | Royal / Arcanist | Woman with dark curled hair bound with a gold star diadem; deep violet and white chiton with gold meander borders, a starry mantle; a large brass astrolabe and a long quill. |
| `inquisitor` | Soraya, Scales of the Sun | Persian (Iranian) | Holy / Arcanist | Woman with dark eyes and black hair under a white and gold hood; ivory robes with sun embroidery, a gold breastplate; balance scales hanging from her belt and a sun-blazoned arbalest. |
| `seraph` | Gabriela, Wing of the Reliquary | Castilian Spanish | Holy / Guardian | Woman with dark wavy hair and a halo; six golden wings; white and gold reliquary armour with red enamel; a gleaming halberd. |
| `corsairSurgeon` | Tariq, Sawbones of the Reef | Moroccan | Pirate / Support | Man with a trimmed black beard, a red head-wrap; a stained surgeon's coat over a striped sash, rolled sleeves; a bone saw, a bandolier of tonic bottles and a flintlock pistol. |
| `harpooner` | Siku, Whaler of the Floes | Inuit (Greenlandic) | Pirate / Gunner | Man with a broad wind-burnt face and short black hair; sealskin parka with fur trim and bone toggles; a heavy barbed iron harpoon on a coiled hemp line. |
| `seaReaver` | Nakoa, Breaker of Hulls | Hawaiian (Polynesian) | Pirate / Vanguard | Big man with long black hair in a topknot and Polynesian tattoos on his arms and chest; a sailcloth wrap and a barnacled leather harness; a huge barnacle-crusted ship's anchor on a chain. |

## Prompt 1: scenes and cutouts, the five Vampires

```text
You are painting character artwork for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). Five new heroes, the Vampires, need menu artwork.

Rules for this task:
- Branch from main as art/heroes-20-vampires. Add PNG files under art-source/heroes-20/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes art: the Vampires' scenes and cutouts". In its body list every file and
  say which are new paintings.
- No text, logos, frames, watermarks or signatures in any image. Original work only: no existing characters, no trademarked designs.
- Style: match the existing hero gallery exactly: ornate, painterly anime fantasy character art (gacha splash-art quality), gothic
  high fantasy, rich gold filigree and detailed armour, dramatic warm-and-cool lighting, clean confident line work, expressive adult
  faces. Look first at docs/samples/anime-heroes/scenes-contact.jpg, docs/samples/anime-heroes/cutouts-contact.jpg and a few files in
  src/art/heroes/ (the <id>.webp scenes and <id>-portrait.webp cutouts) and keep that rendering.

For each hero make two PNGs of the same character in the same outfit:
1. The scene, art-source/heroes-20/<id>.png: a full painted illustration, upright 2:3, 1024 x 1536 px or larger, painted
   background, one character only.
2. The cutout, art-source/heroes-20/<id>-cutout.png: the same character alone, whole body standing, on a fully transparent
   background (RGBA PNG; no backdrop, no shadow box, no ground), upright 2:3, figure centred and filling at least 60% of the height,
   the head in the top quarter. The menus show only the top half of the cutout until the hero is opened, so the face must be clear,
   well lit and uncovered in the top half.

Two of the five already have a finished scene on the branch feat/twenty-heroes-vampire (src/art/heroes/vampireLord.webp and
src/art/heroes/hemomancer.webp). For those two, paint only the cutout, matching that scene's character, outfit and colours exactly
(git show origin/feat/twenty-heroes-vampire:src/art/heroes/vampireLord.webp > ref.webp to look at it). Do not repaint their scenes.

The heroes:

1. vampireLord: Vladislav, Voivode of the Red Keep (Vampire, Blade). A tall pale nobleman, long silver-white hair, red eyes; black
   and gold filigree plate under a high-collared crimson cape; a long rapier-like sword with a red edge. Cutout only.
2. hemomancer: Carmilla, Countess of the Chalice (Vampire, Caster). A pale countess, black hair piled high with red pins, red eyes;
   crimson and black brocade gown with gold trim; a gold chalice in one hand, ribbons of blood magic from the other. Cutout only.
3. nightstalker: Sorin, Wing of the Crypt (Vampire, Assassin). Not human: a lean winged strigoi with violet-grey skin, white spiky
   hair, large bat wings, red claws and fangs, dark leather straps; menacing but not gory. Scene: crouched on a cathedral belfry
   ledge under a blood moon, wings half open, about to drop on the lantern-lit street below.
4. bloodGargoyle: Gavril, Stone Sentinel of the Fane (Vampire, Bulwark). Not human: a hulking gargoyle of dark basalt with thin red
   veins, stone bat wings, curled horns, a cracked crimson heart-gem in the chest. Scene: landing in a burst of rubble on a ruined
   chapel's flagstones, wings spread to shield a doorway, red light through stained glass behind him.
5. dhampir: Klara, Silver-Bolt Hunter (Vampire, Gunner). A young Czech woman, half vampire: pale, one red eye and one grey, dark
   hair in a long braid; a long black hunter's coat with silver buckles and a wide-brimmed hat; a repeating crossbow, silver stakes at
   her belt. Scene: kneeling on a snowy rooftop in old Prague-style streets at dusk, crossbow levelled, a silver bolt glinting.
```

## Prompt 2: scenes and cutouts, War Drummer, Banneret, Geomancer, Bell Warden, Falconer

```text
You are painting character artwork for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). Five new heroes need menu artwork.

Rules for this task:
- Branch from main as art/heroes-20-portraits-2. Add PNG files under art-source/heroes-20/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes art: scenes and cutouts 2". In its body list every file.
- No text, logos, frames, watermarks or signatures. Original work only. Paint every person with care and respect: real, dignified
  people with authentic features, skin and hair; no caricature, no costume stereotypes, nothing comic. Cultural detail is a tasteful
  accent in the clothing, jewellery or scene, never a costume.
- Style: match the existing hero gallery exactly: ornate, painterly anime fantasy character art (gacha splash-art quality), gothic
  high fantasy, rich gold filigree and detailed armour, dramatic warm-and-cool lighting, clean confident line work, expressive adult
  faces. Look first at docs/samples/anime-heroes/scenes-contact.jpg, docs/samples/anime-heroes/cutouts-contact.jpg and a few files in
  src/art/heroes/ and keep that rendering.

For each hero make two PNGs of the same character in the same outfit:
1. The scene, art-source/heroes-20/<id>.png: a full painted illustration, upright 2:3, 1024 x 1536 px or larger, painted
   background, one character only (a companion animal where described).
2. The cutout, art-source/heroes-20/<id>-cutout.png: the same character alone, whole body standing, on a fully transparent
   background (RGBA PNG; no backdrop, no shadow box, no ground), upright 2:3, figure centred and filling at least 60% of the height,
   the head in the top quarter. The menus show only the top half until the hero is opened, so the face must be clear and well lit.

The heroes:

1. warDrummer: Raiden, Thunder of the Keep (Samurai, Support). A broad-shouldered Japanese man with a topknot and a headband; an
   open dark-blue happi coat over lacquered red samurai shoulder guards; a great oxhide taiko drum on a wooden frame on his back, two
   heavy bachi sticks. Scene: on a grassy ridge in a thunderstorm, mid-strike on the taiko, a visible ring of sound rolling out over
   marching soldiers below.
2. banneret: Isolde, Voice of the Rampart (Knightly, Warden). A Norman French woman knight, short fair braid, open-faced helm;
   steel plate with a blue and gold surcoat; a lance carrying a long silk guidon and a kite shield. Scene: planting the standard on a
   broken castle rampart at sunrise, guidon streaming, rallying unseen soldiers with a raised hand.
3. geomancer: Tenzin, Shaper of Crags (Mystic, Bulwark). A Tibetan woman with a calm weathered face and long black braids with
   turquoise and coral beads; layered maroon and saffron robes over stone-plated bracers; a staff of carved slate with a ring of rock
   floating round its head. Scene: on a high mountain pass with prayer flags, striking her staff down as granite spires burst up.
4. bellWarden: Kavi, Keeper of the Bronze Toll (Yokai, Bulwark). Not human: a towering bronze-skinned guardian spirit with small
   horns and green patina markings, a monk's straw rope belt; a great bronze temple bell carried on his shoulders, its striker beam
   in his hand. Scene: before a mountain shrine at dusk, swinging the striker into the bell, a golden shockwave rippling out.
5. falconer: Aisling, Wing of the Glen (Wild, Marksman). A Scottish woman with wind-tossed copper hair and freckles; green and brown
   tartan plaid over a leather jerkin, a falconer's gauntlet; a white gyrfalcon and a recurve bow. Scene: on a heather hillside under
   a racing sky, arm raised as the gyrfalcon stoops past her, bow in the other hand.
```

## Prompt 3: scenes and cutouts, Astral Sphinx, Mirage Dancer, Plague Doctor, Bombardier, Astrologer

```text
You are painting character artwork for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). Five new heroes need menu artwork.

Rules for this task:
- Branch from main as art/heroes-20-portraits-3. Add PNG files under art-source/heroes-20/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes art: scenes and cutouts 3". In its body list every file.
- No text, logos, frames, watermarks or signatures. Original work only. Paint every person with care and respect: real, dignified
  people with authentic features, skin and hair; no caricature, no costume stereotypes, nothing comic.
- Style: match the existing hero gallery exactly: ornate, painterly anime fantasy character art (gacha splash-art quality), gothic
  high fantasy, rich gold filigree and detailed armour, dramatic warm-and-cool lighting, clean confident line work, expressive adult
  faces. Look first at docs/samples/anime-heroes/scenes-contact.jpg, docs/samples/anime-heroes/cutouts-contact.jpg and a few files in
  src/art/heroes/ and keep that rendering.

For each hero make two PNGs of the same character in the same outfit:
1. The scene, art-source/heroes-20/<id>.png: a full painted illustration, upright 2:3, 1024 x 1536 px or larger, painted
   background, one character only.
2. The cutout, art-source/heroes-20/<id>-cutout.png: the same character alone, whole body standing (the sphinx: whole body seated
   upright, facing three-quarters), on a fully transparent background (RGBA PNG; no backdrop, no shadow box, no ground), upright 2:3,
   centred and filling at least 60% of the height, the head in the top quarter, the face clear and well lit in the top half.

The heroes:

1. astralSphinx: Nenet, Riddle of the Stars (Arcane, Beast). Not human: a winged lioness sphinx with a woman's serene face, deep blue
   star-flecked fur, a gold and lapis nemes headdress and collar, feathered wings like the night sky. Scene: reclining on a desert
   temple's steps under a vast starfield, one paw raised as constellations bend round her.
2. mirageDancer: Zahara, Veil of the Dunes (Frontier, Trickster). A Nubian woman with deep brown skin and long black braids with
   gold cuffs; flowing sand-gold and white silk veils over a fitted dancer's top, many bangles; twin curved scimitars. Scene:
   spinning on a dune crest at noon, veils whirling into a sand haze, two shimmering mirage copies of her fading at the sides.
3. plagueDoctor: Corvus, Censer of Ash (Undead, Arcanist). Not human: an undead physician, grey skin at the wrists, a long black
   beaked plague mask with glowing green lenses, a wide-brimmed hat, a waxed black coat; a smoking brass censer on a chain, green
   vials on a bandolier. Scene: walking through a fog-bound Venetian-style canal lane at night, censer swinging, green miasma
   curling round lanterns. Eerie, not gory.
4. bombardier: Soren, Iron Alchemist (Machine, Gunner). A Danish man with a singed blond beard and soot-smudged goggles pushed up;
   a leather apron over riveted iron armour, a backpack of fuses with a small rocket pack; a short iron mortar-gun. Scene: launching
   off the ground on a burst of rocket fire above a smoking battlefield, grinning, mortar-gun aimed down.
5. astrologer: Cyra, Keeper of the Astrolabe (Royal, Arcanist). A Greek woman of old Alexandria with dark curled hair bound in a
   gold star diadem; a deep violet and white chiton with gold meander borders and a starry mantle; a large brass astrolabe and a long
   quill. Scene: on an observatory terrace above a lighthouse harbour at night, raising the astrolabe as a comet falls.
```

## Prompt 4: scenes and cutouts, Inquisitor, Seraph, Corsair Surgeon, Harpooner, Sea Reaver

```text
You are painting character artwork for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). Five new heroes need menu artwork.

Rules for this task:
- Branch from main as art/heroes-20-portraits-4. Add PNG files under art-source/heroes-20/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes art: scenes and cutouts 4". In its body list every file.
- No text, logos, frames, watermarks or signatures. Original work only. Paint every person with care and respect: real, dignified
  people with authentic features, skin and hair; no caricature, no costume stereotypes, nothing comic. Cultural detail is a tasteful
  accent, never a costume.
- Style: match the existing hero gallery exactly: ornate, painterly anime fantasy character art (gacha splash-art quality), gothic
  high fantasy, rich gold filigree and detailed armour, dramatic warm-and-cool lighting, clean confident line work, expressive adult
  faces. Look first at docs/samples/anime-heroes/scenes-contact.jpg, docs/samples/anime-heroes/cutouts-contact.jpg and a few files in
  src/art/heroes/ and keep that rendering.

For each hero make two PNGs of the same character in the same outfit:
1. The scene, art-source/heroes-20/<id>.png: a full painted illustration, upright 2:3, 1024 x 1536 px or larger, painted
   background, one character only.
2. The cutout, art-source/heroes-20/<id>-cutout.png: the same character alone, whole body standing, on a fully transparent
   background (RGBA PNG; no backdrop, no shadow box, no ground), upright 2:3, centred and filling at least 60% of the height, the head
   in the top quarter, the face clear and well lit in the top half. Wings may spread to the sides but must stay inside the image.

The heroes:

1. inquisitor: Soraya, Scales of the Sun (Holy, Arcanist). A Persian woman with dark eyes and black hair under a white and gold
   hood; ivory robes embroidered with suns over a gold breastplate; balance scales at her belt and a sun-blazoned arbalest. Accent: a
   fine Persian arabesque in the gold work. Scene: standing on a sunlit courtyard's blazing sigil, arbalest raised, chains of light
   uncoiling from it.
2. seraph: Gabriela, Wing of the Reliquary (Holy, Guardian). A Castilian woman with dark wavy hair and a golden halo; six golden
   wings; white and gold reliquary armour with red enamel; a gleaming halberd. Scene: descending through cathedral smoke in a pillar
   of morning light, wings spread, halberd lowered over a fallen comrade's shield.
3. corsairSurgeon: Tariq, Sawbones of the Reef (Pirate, Support). A Moroccan man with a trimmed black beard and a red head-wrap; a
   stained surgeon's coat over a striped sash, sleeves rolled; a bone saw, a bandolier of tonic bottles, a flintlock pistol. Accent:
   zellige-tile pattern on the sash. Scene: swinging in on a rigging rope across a ship's deck at sunset, pistol out, a tonic bottle
   in his other hand.
4. harpooner: Siku, Whaler of the Floes (Pirate, Gunner). An Inuit man from Greenland with a broad wind-burnt face and short black
   hair; a sealskin parka with fur trim and carved bone toggles; a heavy barbed iron harpoon on a coiled hemp line. Scene: braced on
   an ice floe in a grey sea, hauling the line taut as something huge pulls beneath the water.
5. seaReaver: Nakoa, Breaker of Hulls (Pirate, Vanguard). A big Hawaiian man with long black hair in a topknot and Polynesian
   tattoos on his arms and chest; a sailcloth wrap and a barnacled leather harness; a huge barnacle-crusted ship's anchor on a chain.
   Scene: riding a cresting wave onto a reef, swinging the anchor overhead, spray everywhere.
```

## Prompt 5: awakened icons, all 20

```text
You are painting character artwork for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). Each hero has an awakened form, shown as a full-body figure on a transparent background in the menus.
Twenty new heroes need theirs.

Rules for this task:
- Branch from main as art/heroes-20-awakened. Add PNG files under art-source/heroes-20/awakened/ only, named <id>.png. Change no
  other file.
- Open one pull request into main titled "Twenty heroes art: awakened icons". In its body list every file.
- No text, logos, frames, watermarks or signatures. Original work only.
- Format: RGBA PNG, 1192 x 1120 px (it is halved to the game's 596 x 560), fully transparent background, no ground and no shadow
  box. One figure, whole body, standing in a three-quarter battle stance facing right, filling about 85% of the height and centred.
- Style: match the 45 existing awakened icons exactly: look at src/art/heroes/awakened-knight.webp, awakened-tyrant.webp,
  awakened-kraken.webp and the rest of src/art/heroes/awakened-*.webp. They are crisp, high-detail chibi-proportioned pixel-painted
  figures (large head, compact body), bold dark outlines, rich gold trim, saturated colour.
- The awakened form is the same character as its plain art, upgraded: grander armour and trim, a glowing version of the signature
  weapon, the hero's colours kept. If the plain cutout art-source/heroes-20/<id>-cutout.png already exists on main, match it.

The heroes (id: who they are; then the upgrade):
1. vampireLord: Vladislav, a pale silver-haired vampire nobleman in black and gold plate and a crimson cape with a red-edged
   sword. Upgrade: a crown of thorns in gold, a cape lined with flowing blood light, the sword glowing red.
2. hemomancer: Carmilla, a pale countess with black hair piled high, crimson and black gown, gold chalice. Upgrade: a taller
   lace collar, the chalice overflowing with glowing blood ribbons.
3. nightstalker: Sorin, a winged strigoi with violet-grey skin, white spiky hair, bat wings, red claws. Upgrade: wings edged with
   red light, bone-and-silver armour plates.
4. bloodGargoyle: Gavril, a basalt gargoyle with red veins, stone wings and horns. Upgrade: the heart-gem blazing, molten red cracks
   across the stone, cathedral-iron bands on his arms.
5. dhampir: Klara, a pale half-vampire hunter with one red eye, black long coat, wide hat, repeating crossbow. Upgrade: silver
   filigree on the coat, the crossbow's bolts glowing silver-white.
6. warDrummer: Raiden, a Japanese taiko drummer in a dark-blue happi coat and red lacquered guards, taiko on his back. Upgrade:
   lightning crackling round the drum, gold mon crests on the coat.
7. banneret: Isolde, a Norman woman knight in steel and a blue and gold surcoat, lance with a silk guidon. Upgrade: gilded plate,
   the guidon glowing with the keep's sigil in light (no lettering).
8. geomancer: Tenzin, a Tibetan woman in maroon and saffron robes with beaded braids and a slate staff. Upgrade: a halo of floating
   rocks and turquoise stones, glowing amber runes on the bracers.
9. bellWarden: Kavi, a bronze-skinned horned temple-bell guardian carrying a great bronze bell. Upgrade: the bell engraved and
   ringing with golden sound rings, a monk's prayer-bead garland.
10. falconer: Aisling, a Scottish woman with copper hair in green and brown tartan, gyrfalcon and bow. Upgrade: the falcon wreathed
    in wind, silver-feathered pauldrons.
11. astralSphinx: Nenet, a blue star-furred winged lioness sphinx with a woman's face and a gold and lapis headdress. Upgrade: wings
    of open starfield, a ring of constellations round her.
12. mirageDancer: Zahara, a Nubian dancer in sand-gold and white silk veils with twin scimitars. Upgrade: veils of shimmering heat
    light, gold-inlaid scimitars.
13. plagueDoctor: Corvus, an undead plague doctor with a black beaked mask, hat and brass censer. Upgrade: the censer pouring green
    flame, a raven-feather mantle.
14. bombardier: Soren, a Danish alchemist with goggles, iron armour and a rocket pack, short mortar-gun. Upgrade: brass and iron
    exoskeleton plates, the rocket pack lit.
15. astrologer: Cyra, a Greek astrologer in violet and white with a gold star diadem and a brass astrolabe. Upgrade: the astrolabe
    rings floating and orbiting her, a mantle of stars.
16. inquisitor: Soraya, a Persian inquisitor in ivory and gold with scales and a sun arbalest. Upgrade: a radiant sun disc behind her,
    the scales glowing.
17. seraph: Gabriela, a six-winged seraph in white and gold armour with a halberd. Upgrade: wings of flame-gold light, a brighter
    double halo.
18. corsairSurgeon: Tariq, a Moroccan pirate surgeon in a stained coat and red head-wrap, bone saw and pistol. Upgrade: a captain's
    coat with brass buttons, glowing green tonic bottles.
19. harpooner: Siku, an Inuit whaler in a sealskin parka with a barbed harpoon. Upgrade: an ice-blue glowing harpoon head, a white
    bear-fur mantle.
20. seaReaver: Nakoa, a big tattooed Hawaiian warrior with a barnacled anchor. Upgrade: the tattoos glowing sea-green, the anchor
    trailing water.
```

## Prompt 6: the eight effect sheets, cleaned

```text
You are fixing painted spell effects for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall).

Rules for this task:
- Branch from main as art/heroes-20-fx. Add PNG files under art-source/heroes-20/fx/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes art: effect sheets cleaned". In its body list every file.
- Read art-source/spell-fx/BRIEF.md first and follow its format exactly: square 256 px cells, a fully transparent background, one row
  a part, frames left to right, no ground plane, no backdrop, no drop shadow, no text, no frame borders. No flashing: a loop never
  fades to nothing and back.

The branch feat/twenty-heroes-vampire holds eight painted sheets in art-source/spell-fx/v-vampire/ (astral-star, blood-ritual,
harpoon-anchor, mirage-sand, plague-cloud, sanguine-lance, sonic-drum, vampire-bats; read them with
git show origin/feat/twenty-heroes-vampire:art-source/spell-fx/v-vampire/<key>.png > <key>.png). Their painting is good, but many
cells keep a faint rectangular box or edge line round the effect (most visible in plague-cloud, harpoon-anchor, mirage-sand and
sonic-drum), and in blood-ritual a small second element sits under the first row's first cell.

For each of the eight, produce art-source/heroes-20/fx/<key>.png: the same sheet, same size (1536 x 512), same rows, same frames and
same look, with every box edge, frame line and stray fragment removed, so that each cell's effect fades softly into full
transparency on every side and all four corners of every cell are fully transparent (alpha 0). Repaint any frame that cannot be
cleaned rather than leaving a hard edge. Do not change the motifs or colours.
```

## Prompt 7: one painted icon a move (after the kits are settled)

Paste this only once the twenty kits are on main (step 2 of the audit's plan): the move names below are the branch's, and some may
change when the kits are rebuilt on main's skill system. Update the lists from main's `kits/table.ts` and `ultimates.ts` first.

```text
You are painting ability art for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). Every hero move has its own lead painting, shown when the move is cast. Twenty new heroes need theirs:
four moves each, eighty paintings.

Rules for this task:
- Branch from main as art/heroes-20-icons. Add PNG files under art-source/heroes-20/icons/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes art: move paintings". In its body list each sheet and its sixteen moves in
  cell order.
- Read docs/notes/individual-ability-effects.md and look at src/art/fx/abilities/atlas-0.png to atlas-7.png first: every painting is
  one recognisable, individual shape (not a recolour of another), a bold silhouette that reads small, rich colour with a bright core,
  painted, on a fully transparent background, no text, no characters, no frames, no box edges.
- Five sheets, art-source/heroes-20/icons/sheet-1.png to sheet-5.png, each 1536 x 1536 px: a 4 x 4 grid of 384 px cells, read left
  to right, top to bottom, one move a cell, each painting inside a 10% clear margin of its cell, every cell's four corners fully
  transparent. Sheet n holds heroes 4n-3 to 4n below, in order, their four moves in order.

The moves (hero: skill 1, skill 2, skill 3, ultimate; each with what it does, for the motif):
1. Vampire Lord: Crimson Lunge (a dash through a line of foes in a red arc), Impaling Thrust (a rapier impaling and lifting), Mist
   Step (a blink in crimson mist), Red Eclipse (a blood moon eclipsing, a slash across five foes).
2. Hemomancer: Sanguine Lash (a blood whip tethering two foes), Blood Chalice (a gold chalice pouring healing blood), Crimson Mist
   (a gliding blood mist leaving a boiling pool), Exsanguinate (veins of blood drawn out of many foes into one point).
3. Nightstalker: Dusk Dive (a winged swoop from above), Abduct (claws snatching a foe into the air), Echolocation (rings of a bat
   shriek), Midnight Hunt (a storm of bat silhouettes over a moonlit field).
4. Blood Gargoyle: Gargoyle Crash (a stone body slamming down, rubble burst), Stone Slumber (turning to granite, a stone shell),
   Wing Buffet (stone wings beating a gust), Cathedral Perch (a gothic spire rising, the gargoyle atop).
5. Dhampir: Silver Stake (a silver crossbow bolt pinning to stone), Grapple Vault (a grapple line and a backward vault), Consecrated
   Trap (a silver snare circle with holy sparks), Judgement of Dusk (a rain of silver bolts at twilight).
6. War Drummer: Thunder Beat (a taiko strike, a ring of sound), Marching Cadence (rhythm lines urging forward), Resonant Leap (a leap
   landing in a sound wave), Storm of Ten Thousand Drums (a storm cloud of drum strikes and lightning).
7. Banneret: Standard Charge (a lance charge with a streaming guidon), Rampart Drop (a stone rampart wall dropping), Phalanx Sweep (a
   sweep of shield edges), Oriflamme of the Keep (a great flame-red banner over the field).
8. Geomancer: Tectonic Shove (a stone pillar erupting), Earthglide (a burrow trail through earth), Lodestone Pull (a magnetic stone
   dragging iron), Mountain's Embrace (a ring of crags and falling rocks).
9. Bell Warden: Bronze Slam (a bell slammed down, cracked ground), Echoing Toll (bronze sound rings), Sanctuary Vault (a golden dome
   of chimes), Midnight Knell (a huge dark bell tolling, a shock ring).
10. Falconer: Falcon Stoop (a falcon diving in a streak), Gale Vault (a whirl of wind lifting), Talon Snare (talons and a cord snare),
    Sky Hunt (a flock of hunting falcons spiralling).
11. Astral Sphinx: Rift Pounce (a lion paw through a star rift), Riddle of Repulsion (a glowing glyph ring pushing out), Constellation
    Swap (two stars linked, trading places), Celestial Convergence (constellations collapsing to one point).
12. Mirage Dancer: Whirling Veils (a spin of silk and blades), Dune Swap (a sand mirage switching places), Sirocco Leap (a leap on a
    hot desert wind), Dance of Seven Mirages (seven shimmering dancer silhouettes in a ring, no faces).
13. Plague Doctor: Censer Swing (a swinging censer, green smoke), Crow Step (a burst of black feathers), Quarantine Line (a line of
    green miasma), Black Miasma (a towering black and green plague cloud).
14. Bombardier: Blast Jump (a rocket blast launching upward), Concussion Mortar (a mortar shell and shock ring), Firebomb Line (a row
    of fire bombs), Carpet Bombardment (a rain of shells over a field).
15. Astrologer: Gravity Well (a collapsing star pulling inward), Retrograde Orbit (a planet looping backward on its orbit), Starlight
    Bridge (a bridge of starlight), Supernova Alignment (planets aligning into a supernova).
16. Inquisitor: Chains of Judgement (solar chains), Blazing Edict (a sealed scroll bursting into flame, no writing), Purging Scales
    (golden balance scales with fire), Solar Tribunal (a ring of sun discs judging the field).
17. Seraph: Halo Dive (a diving halo of light), Sanctuary Wings (golden wings folding round as a shield), Mercy's Ascent (a rising
    column of feathers and light), Descent of the Host (a host of golden wings from the sky).
18. Corsair Surgeon: Boarding Swing (a rope swing and a pistol flash), Sawbones Triage (a bone saw and bandages, green heal), Grappling
    Extraction (a grapple hook pulling free), Crimson Dispensary (a burst of red tonic bottles).
19. Harpooner: Barbed Harpoon (a barbed harpoon on a line), Floe Slide (sliding ice floes), Whaler's Reel (a coiled line reeling in),
    Leviathan Line (a vast sea serpent's shadow on a taut line).
20. Sea Reaver: Breaker Rush (a cresting wave charge), Anchor Slam (an anchor smashing down), Riptide Undertow (a swirling undertow),
    Wrath of the Reef (coral and surf erupting round an anchor).
```
