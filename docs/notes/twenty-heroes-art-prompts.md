# Twenty heroes: prompts for the missing art

The audit ([twenty-heroes-audit.md](twenty-heroes-audit.md), contact sheet
[twenty-heroes-audit.png](../samples/twenty-heroes-audit.png)) found that of the twenty new heroes' art only the Vampire Lord's and the
Hemomancer's full scenes and the eight painted effect sheets are finished. This note holds a ready-to-paste prompt for every piece
ChatGPT (Codex with its image tool) should paint, modelled on [heritage-art-prompt.md](heritage-art-prompt.md),
[anime-hero-gallery.md](anime-hero-gallery.md) and the effects brief `art-source/spell-fx/BRIEF.md`.

**The canon** in the audit (names, sexes, heritages) was confirmed by the director on 4 November: names, titles and
heritages from `heroNames.ts`, sex from the name, origins and classes from `traits.ts`. If it changes, edit the hero's lines here first.

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
| Battle 1 to 20 | Every battle frame of one hero: front and back, plain and awakened (112 PNGs); Vampires first | `art/heroes-20-sprites-<id>` |

**The battle sheets** are ChatGPT's too (the owner's choice, over PixelLab): twenty more prompts, one a hero, the Vampires first, at
the end of this note. ChatGPT does not keep an exact pixel grid, so each prompt asks for every animation frame as its own
transparent PNG on a fixed canvas, and `tools/heroes-20/pack-sheets.py` packs them into main's grid. For each hero that is four
sheets (front and back, plain and awakened), 80 in all. Every sheet on the old branch is a placeholder (three re-coloured figures,
backs that are fronts, figures across the cell edges), so none is kept.

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

## Battle sheets: one prompt a hero (frames for the packer)

The owner chose ChatGPT for the battle sheets. Because ChatGPT does not keep an exact pixel grid, each prompt asks for every
animation frame as its own transparent 1024 x 1024 PNG, with the feet on a fixed ground line (y = 900), the figure centred (x = 512)
and facing right, and the back view a true back three-quarter view. `tools/heroes-20/pack-sheets.py` then crops, scales, aligns and
packs them into main's grid:

- the four folders a hero (`front`, `back`, `awakened-front`, `awakened-back`), 28 frames each, become `hero_res_<snake id>.png`,
  `hero_res_<snake id>_back.png`, `awakened_<id>.png` and `awakened_<id>_back.png`;
- four cells a row; rows idle 4, walk 8 (two rows, the second `_walk`), attack 4, hurt 4, dead 4, attack2 4; the idle figure 96 px
  tall (one scale for front and back, from the front's `idle-1`); the canvas's centre and ground line land on the cell's centre and
  bottom row, so lunges and falls keep their shifts; alpha made hard (0 or 255) and stray specks dropped, as main's sheets;
- the entries in `src/art/units/sheets.json` and `src/art/awakened/manifest.json` (`rear`/`front` links, the awakened form), in
  those files' own formatting.

```sh
python3 tools/heroes-20/pack-sheets.py --check vampireLord   # only check the frames (size, transparency, ground line, edges)
python3 tools/heroes-20/pack-sheets.py vampireLord           # pack every pair that is complete; contact images in docs/samples/heroes-20/
```

Checked by exploding main's Tyrant sheets (plain and awakened, front and back) into 1024 px frames and packing them back: the four
sheets came out in the same grid, figures whole in their cells, feet on the bottom row.

The prompts are in the order to paste them: the Vampires first.

## Battle prompt 1: Vladislav (`vampireLord`)

```text
You are painting battle sprites for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). This task is one new hero: Vladislav, Voivode of the Red Keep (Vampire, Blade).

Rules for this task:
- Branch from main as art/heroes-20-sprites-vampireLord. Add PNG files under art-source/heroes-20/sprites/vampireLord/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes battle frames: Vladislav". In its body say which frames are complete.
- No text, logos, frames, watermarks or signatures. Original work only.

The game's battle sprites are small (about 96 px tall in a fight), drawn on a sunny painted board in a three-quarter view. You will
paint each animation frame of this hero as its own large PNG; a script (tools/heroes-20/pack-sheets.py) shrinks the frames and packs
them into the game's sheet, so you do NOT make a sprite sheet and do NOT draw any grid.

Every frame:
- RGBA PNG, exactly 1024 x 1024 px, a fully transparent background: no ground, no shadow, no backdrop, no glow cloud, no border.
- The ground line is y = 900: the soles of the standing feet rest exactly on it in every standing or walking frame (in the jump or
  fall frames the body may lift off it or lie along it). The figure's standing centre is x = 512. Nothing comes within 24 px of the
  canvas edge.
- The same scale in every frame: standing upright the figure is about 600 px from the soles to the top of the head (wings, weapons
  and hair may go higher). Do not zoom in or out between frames.
- Facing right. The "front" frames are a three-quarter view from the front (we see the face and chest, turned to the right). The
  "back" frames are a true back three-quarter view: we see the back of the head and body, turned away from us towards the right,
  as if the camera stood behind the hero's left shoulder. A mirrored front view is not a back view.
- Style: crisp game-sprite rendering that survives being shrunk to a sixth: a bold dark outline about 6 px thick, clean cel shading
  in two or three tones, strong colour, no soft airbrushed glow, no motion blur, no speed lines, no blurry edges, no detached sparks
  or particles. Look at src/art/units/hero_res_tyrant.png and hero_res_tyrant_back.png, src/art/units/hero_res_wizard.png and
  src/art/awakened/awakened_tyrant.png on main: the frames should shrink to that look.
- Paint the idle-1 front frame first and keep it open as the reference for every other frame, so the hero stays the same person with
  the same outfit, colours and proportions throughout. Make each new frame as an edit of a previous one where you can.

The frames, in four folders (112 PNGs in all):
- art-source/heroes-20/sprites/vampireLord/front/  the plain hero from the front
- art-source/heroes-20/sprites/vampireLord/back/   the plain hero from the back
- art-source/heroes-20/sprites/vampireLord/awakened-front/  the awakened form from the front
- art-source/heroes-20/sprites/vampireLord/awakened-back/   the awakened form from the back
Each folder holds 28 files named <row>-<n>.png:
- idle-1 .. idle-4: standing ready, a gentle breathing loop (idle-4 flows back into idle-1).
- walk-1 .. walk-8: one full walk cycle to the right in place (the figure does not travel across the canvas), legs clearly
  alternating, the body bobbing; walk-8 flows back into walk-1.
- attack-1 .. attack-4: the basic attack: a fencer's lunge: draw back, thrust the sword far forward to the right, hold, recover.
- hurt-1 .. hurt-4: struck: recoil backwards (to the left), wince, recover towards the idle pose.
- dead-1 .. dead-4: dying: stagger, collapse, fall backwards (to the left), and in dead-4 lie flat on the back on the ground line,
  head to the left, completely still.
- attack2-1 .. attack2-4: the skill cast: a sweeping crimson slash: the sword raised high, cut down and across, the cape whirling.
The back folders hold the same 28 moments as the front ones, seen from behind. The awakened folders hold the same 28 moments again,
for the awakened form.

The hero:
- Look: a tall pale vampire nobleman, long silver-white hair, red eyes; black and gold filigree plate under a high-collared crimson cape; a long rapier-like sword with a red edge.
- Back view: the cape fills most of the back view; his silver hair falls over it; the sword arm is seen from behind.
- Awakened form: the same hero, upgraded: a gold crown of thorns, the cape lined with flowing red light, the sword glowing red. Keep the pose, scale and colours; only the gear grows grander.

For the character, use its finished painting on the branch feat/twenty-heroes-vampire, scene src/art/heroes/vampireLord.webp (git show origin/feat/twenty-heroes-vampire:src/art/heroes/vampireLord.webp > ref.webp), and the canon below. For the family look of the new heroes, see the two finished Vampire paintings on that branch: src/art/heroes/vampireLord.webp and src/art/heroes/hemomancer.webp (git show origin/feat/twenty-heroes-vampire:<path> > ref.webp). If art-source/heroes-20/vampireLord-cutout.png is on main, match it as well.
```

## Battle prompt 2: Carmilla (`hemomancer`)

```text
You are painting battle sprites for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). This task is one new hero: Carmilla, Countess of the Chalice (Vampire, Caster).

Rules for this task:
- Branch from main as art/heroes-20-sprites-hemomancer. Add PNG files under art-source/heroes-20/sprites/hemomancer/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes battle frames: Carmilla". In its body say which frames are complete.
- No text, logos, frames, watermarks or signatures. Original work only.

The game's battle sprites are small (about 96 px tall in a fight), drawn on a sunny painted board in a three-quarter view. You will
paint each animation frame of this hero as its own large PNG; a script (tools/heroes-20/pack-sheets.py) shrinks the frames and packs
them into the game's sheet, so you do NOT make a sprite sheet and do NOT draw any grid.

Every frame:
- RGBA PNG, exactly 1024 x 1024 px, a fully transparent background: no ground, no shadow, no backdrop, no glow cloud, no border.
- The ground line is y = 900: the soles of the standing feet rest exactly on it in every standing or walking frame (in the jump or
  fall frames the body may lift off it or lie along it). The figure's standing centre is x = 512. Nothing comes within 24 px of the
  canvas edge.
- The same scale in every frame: standing upright the figure is about 600 px from the soles to the top of the head (wings, weapons
  and hair may go higher). Do not zoom in or out between frames.
- Facing right. The "front" frames are a three-quarter view from the front (we see the face and chest, turned to the right). The
  "back" frames are a true back three-quarter view: we see the back of the head and body, turned away from us towards the right,
  as if the camera stood behind the hero's left shoulder. A mirrored front view is not a back view.
- Style: crisp game-sprite rendering that survives being shrunk to a sixth: a bold dark outline about 6 px thick, clean cel shading
  in two or three tones, strong colour, no soft airbrushed glow, no motion blur, no speed lines, no blurry edges, no detached sparks
  or particles. Look at src/art/units/hero_res_tyrant.png and hero_res_tyrant_back.png, src/art/units/hero_res_wizard.png and
  src/art/awakened/awakened_tyrant.png on main: the frames should shrink to that look.
- Paint the idle-1 front frame first and keep it open as the reference for every other frame, so the hero stays the same person with
  the same outfit, colours and proportions throughout. Make each new frame as an edit of a previous one where you can.

The frames, in four folders (112 PNGs in all):
- art-source/heroes-20/sprites/hemomancer/front/  the plain hero from the front
- art-source/heroes-20/sprites/hemomancer/back/   the plain hero from the back
- art-source/heroes-20/sprites/hemomancer/awakened-front/  the awakened form from the front
- art-source/heroes-20/sprites/hemomancer/awakened-back/   the awakened form from the back
Each folder holds 28 files named <row>-<n>.png:
- idle-1 .. idle-4: standing ready, a gentle breathing loop (idle-4 flows back into idle-1).
- walk-1 .. walk-8: one full walk cycle to the right in place (the figure does not travel across the canvas), legs clearly
  alternating, the body bobbing; walk-8 flows back into walk-1.
- attack-1 .. attack-4: the basic attack: a cast: she raises her free hand and flings a ball of blood magic to the right, the chalice held close.
- hurt-1 .. hurt-4: struck: recoil backwards (to the left), wince, recover towards the idle pose.
- dead-1 .. dead-4: dying: stagger, collapse, fall backwards (to the left), and in dead-4 lie flat on the back on the ground line,
  head to the left, completely still.
- attack2-1 .. attack2-4: the skill cast: a ritual: the chalice lifted high, ribbons of blood magic spiralling up round her.
The back folders hold the same 28 moments as the front ones, seen from behind. The awakened folders hold the same 28 moments again,
for the awakened form.

The hero:
- Look: a pale vampire countess, black hair piled high with red pins, red eyes; a crimson and black brocade gown with gold trim; a gold chalice in her left hand.
- Back view: the back of the piled hair and its red pins, the gown's laced back and train; the chalice just visible at her side.
- Awakened form: the same hero, upgraded: a taller lace collar, the chalice overflowing with glowing blood ribbons. Keep the pose, scale and colours; only the gear grows grander.

For the character, use its finished painting on the branch feat/twenty-heroes-vampire, scene src/art/heroes/hemomancer.webp (git show origin/feat/twenty-heroes-vampire:src/art/heroes/hemomancer.webp > ref.webp), and the canon below. For the family look of the new heroes, see the two finished Vampire paintings on that branch: src/art/heroes/vampireLord.webp and src/art/heroes/hemomancer.webp (git show origin/feat/twenty-heroes-vampire:<path> > ref.webp). If art-source/heroes-20/hemomancer-cutout.png is on main, match it as well.
```

## Battle prompt 3: Sorin (`nightstalker`)

```text
You are painting battle sprites for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). This task is one new hero: Sorin, Wing of the Crypt (Vampire, Assassin).

Rules for this task:
- Branch from main as art/heroes-20-sprites-nightstalker. Add PNG files under art-source/heroes-20/sprites/nightstalker/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes battle frames: Sorin". In its body say which frames are complete.
- No text, logos, frames, watermarks or signatures. Original work only.

The game's battle sprites are small (about 96 px tall in a fight), drawn on a sunny painted board in a three-quarter view. You will
paint each animation frame of this hero as its own large PNG; a script (tools/heroes-20/pack-sheets.py) shrinks the frames and packs
them into the game's sheet, so you do NOT make a sprite sheet and do NOT draw any grid.

Every frame:
- RGBA PNG, exactly 1024 x 1024 px, a fully transparent background: no ground, no shadow, no backdrop, no glow cloud, no border.
- The ground line is y = 900: the soles of the standing feet rest exactly on it in every standing or walking frame (in the jump or
  fall frames the body may lift off it or lie along it). The figure's standing centre is x = 512. Nothing comes within 24 px of the
  canvas edge.
- The same scale in every frame: standing upright the figure is about 600 px from the soles to the top of the head (wings, weapons
  and hair may go higher). Do not zoom in or out between frames.
- Facing right. The "front" frames are a three-quarter view from the front (we see the face and chest, turned to the right). The
  "back" frames are a true back three-quarter view: we see the back of the head and body, turned away from us towards the right,
  as if the camera stood behind the hero's left shoulder. A mirrored front view is not a back view.
- Style: crisp game-sprite rendering that survives being shrunk to a sixth: a bold dark outline about 6 px thick, clean cel shading
  in two or three tones, strong colour, no soft airbrushed glow, no motion blur, no speed lines, no blurry edges, no detached sparks
  or particles. Look at src/art/units/hero_res_tyrant.png and hero_res_tyrant_back.png, src/art/units/hero_res_wizard.png and
  src/art/awakened/awakened_tyrant.png on main: the frames should shrink to that look.
- Paint the idle-1 front frame first and keep it open as the reference for every other frame, so the hero stays the same person with
  the same outfit, colours and proportions throughout. Make each new frame as an edit of a previous one where you can.

The frames, in four folders (112 PNGs in all):
- art-source/heroes-20/sprites/nightstalker/front/  the plain hero from the front
- art-source/heroes-20/sprites/nightstalker/back/   the plain hero from the back
- art-source/heroes-20/sprites/nightstalker/awakened-front/  the awakened form from the front
- art-source/heroes-20/sprites/nightstalker/awakened-back/   the awakened form from the back
Each folder holds 28 files named <row>-<n>.png:
- idle-1 .. idle-4: standing ready, a gentle breathing loop (idle-4 flows back into idle-1).
- walk-1 .. walk-8: one full walk cycle to the right in place (the figure does not travel across the canvas), legs clearly
  alternating, the body bobbing; walk-8 flows back into walk-1. This hero flies: in the walk frames it may hover a little above the ground line with wing beats, but the lowest point stays within 40 px of it, and idle-1 stands on it.
- attack-1 .. attack-4: the basic attack: a claw rake: crouch, spring and slash both claws to the right, land.
- hurt-1 .. hurt-4: struck: recoil backwards (to the left), wince, recover towards the idle pose.
- dead-1 .. dead-4: dying: stagger, collapse, fall backwards (to the left), and in dead-4 lie flat on the back on the ground line,
  head to the left, completely still.
- attack2-1 .. attack2-4: the skill cast: a swoop: wings spread wide, a rising lunge with the claws forward.
The back folders hold the same 28 moments as the front ones, seen from behind. The awakened folders hold the same 28 moments again,
for the awakened form.

The hero:
- Look: not human: a lean winged strigoi with violet-grey skin, white spiky hair, large bat wings, red claws and fangs, dark leather straps.
- Back view: the bat wings dominate the back view, their bony struts and membranes; the spine and straps between them.
- Awakened form: the same hero, upgraded: wings edged with red light, bone-and-silver armour plates on the shoulders and forearms. Keep the pose, scale and colours; only the gear grows grander.

For the character, use the canon below. For the family look of the new heroes, see the two finished Vampire paintings on that branch: src/art/heroes/vampireLord.webp and src/art/heroes/hemomancer.webp (git show origin/feat/twenty-heroes-vampire:<path> > ref.webp). If art-source/heroes-20/nightstalker-cutout.png is on main, match it as well.
```

## Battle prompt 4: Gavril (`bloodGargoyle`)

```text
You are painting battle sprites for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). This task is one new hero: Gavril, Stone Sentinel of the Fane (Vampire, Bulwark).

Rules for this task:
- Branch from main as art/heroes-20-sprites-bloodGargoyle. Add PNG files under art-source/heroes-20/sprites/bloodGargoyle/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes battle frames: Gavril". In its body say which frames are complete.
- No text, logos, frames, watermarks or signatures. Original work only.

The game's battle sprites are small (about 96 px tall in a fight), drawn on a sunny painted board in a three-quarter view. You will
paint each animation frame of this hero as its own large PNG; a script (tools/heroes-20/pack-sheets.py) shrinks the frames and packs
them into the game's sheet, so you do NOT make a sprite sheet and do NOT draw any grid.

Every frame:
- RGBA PNG, exactly 1024 x 1024 px, a fully transparent background: no ground, no shadow, no backdrop, no glow cloud, no border.
- The ground line is y = 900: the soles of the standing feet rest exactly on it in every standing or walking frame (in the jump or
  fall frames the body may lift off it or lie along it). The figure's standing centre is x = 512. Nothing comes within 24 px of the
  canvas edge.
- The same scale in every frame: standing upright the figure is about 600 px from the soles to the top of the head (wings, weapons
  and hair may go higher). Do not zoom in or out between frames.
- Facing right. The "front" frames are a three-quarter view from the front (we see the face and chest, turned to the right). The
  "back" frames are a true back three-quarter view: we see the back of the head and body, turned away from us towards the right,
  as if the camera stood behind the hero's left shoulder. A mirrored front view is not a back view.
- Style: crisp game-sprite rendering that survives being shrunk to a sixth: a bold dark outline about 6 px thick, clean cel shading
  in two or three tones, strong colour, no soft airbrushed glow, no motion blur, no speed lines, no blurry edges, no detached sparks
  or particles. Look at src/art/units/hero_res_tyrant.png and hero_res_tyrant_back.png, src/art/units/hero_res_wizard.png and
  src/art/awakened/awakened_tyrant.png on main: the frames should shrink to that look.
- Paint the idle-1 front frame first and keep it open as the reference for every other frame, so the hero stays the same person with
  the same outfit, colours and proportions throughout. Make each new frame as an edit of a previous one where you can.

The frames, in four folders (112 PNGs in all):
- art-source/heroes-20/sprites/bloodGargoyle/front/  the plain hero from the front
- art-source/heroes-20/sprites/bloodGargoyle/back/   the plain hero from the back
- art-source/heroes-20/sprites/bloodGargoyle/awakened-front/  the awakened form from the front
- art-source/heroes-20/sprites/bloodGargoyle/awakened-back/   the awakened form from the back
Each folder holds 28 files named <row>-<n>.png:
- idle-1 .. idle-4: standing ready, a gentle breathing loop (idle-4 flows back into idle-1).
- walk-1 .. walk-8: one full walk cycle to the right in place (the figure does not travel across the canvas), legs clearly
  alternating, the body bobbing; walk-8 flows back into walk-1. This hero flies: in the walk frames it may hover a little above the ground line with wing beats, but the lowest point stays within 40 px of it, and idle-1 stands on it.
- attack-1 .. attack-4: the basic attack: a two-handed stone smash: raise both fists, slam them down in front to the right.
- hurt-1 .. hurt-4: struck: recoil backwards (to the left), wince, recover towards the idle pose.
- dead-1 .. dead-4: dying: stagger, collapse, fall backwards (to the left), and in dead-4 lie flat on the back on the ground line,
  head to the left, completely still.
- attack2-1 .. attack2-4: the skill cast: a wing buffet: wings swept forward hard in a gust, body braced.
The back folders hold the same 28 moments as the front ones, seen from behind. The awakened folders hold the same 28 moments again,
for the awakened form.

The hero:
- Look: not human: a hulking gargoyle of dark basalt with thin red veins, stone bat wings, curled horns, a cracked crimson heart-gem in the chest.
- Back view: the folded stone wings and the ridged stone spine; the horns from behind.
- Awakened form: the same hero, upgraded: the heart-gem blazing, molten red cracks across the stone, cathedral-iron bands round his arms. Keep the pose, scale and colours; only the gear grows grander.

For the character, use the canon below. For the family look of the new heroes, see the two finished Vampire paintings on that branch: src/art/heroes/vampireLord.webp and src/art/heroes/hemomancer.webp (git show origin/feat/twenty-heroes-vampire:<path> > ref.webp). If art-source/heroes-20/bloodGargoyle-cutout.png is on main, match it as well.
```

## Battle prompt 5: Klara (`dhampir`)

```text
You are painting battle sprites for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). This task is one new hero: Klara, Silver-Bolt Hunter (Vampire, Gunner).

Rules for this task:
- Branch from main as art/heroes-20-sprites-dhampir. Add PNG files under art-source/heroes-20/sprites/dhampir/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes battle frames: Klara". In its body say which frames are complete.
- No text, logos, frames, watermarks or signatures. Original work only.

The game's battle sprites are small (about 96 px tall in a fight), drawn on a sunny painted board in a three-quarter view. You will
paint each animation frame of this hero as its own large PNG; a script (tools/heroes-20/pack-sheets.py) shrinks the frames and packs
them into the game's sheet, so you do NOT make a sprite sheet and do NOT draw any grid.

Every frame:
- RGBA PNG, exactly 1024 x 1024 px, a fully transparent background: no ground, no shadow, no backdrop, no glow cloud, no border.
- The ground line is y = 900: the soles of the standing feet rest exactly on it in every standing or walking frame (in the jump or
  fall frames the body may lift off it or lie along it). The figure's standing centre is x = 512. Nothing comes within 24 px of the
  canvas edge.
- The same scale in every frame: standing upright the figure is about 600 px from the soles to the top of the head (wings, weapons
  and hair may go higher). Do not zoom in or out between frames.
- Facing right. The "front" frames are a three-quarter view from the front (we see the face and chest, turned to the right). The
  "back" frames are a true back three-quarter view: we see the back of the head and body, turned away from us towards the right,
  as if the camera stood behind the hero's left shoulder. A mirrored front view is not a back view.
- Style: crisp game-sprite rendering that survives being shrunk to a sixth: a bold dark outline about 6 px thick, clean cel shading
  in two or three tones, strong colour, no soft airbrushed glow, no motion blur, no speed lines, no blurry edges, no detached sparks
  or particles. Look at src/art/units/hero_res_tyrant.png and hero_res_tyrant_back.png, src/art/units/hero_res_wizard.png and
  src/art/awakened/awakened_tyrant.png on main: the frames should shrink to that look.
- Paint the idle-1 front frame first and keep it open as the reference for every other frame, so the hero stays the same person with
  the same outfit, colours and proportions throughout. Make each new frame as an edit of a previous one where you can.

The frames, in four folders (112 PNGs in all):
- art-source/heroes-20/sprites/dhampir/front/  the plain hero from the front
- art-source/heroes-20/sprites/dhampir/back/   the plain hero from the back
- art-source/heroes-20/sprites/dhampir/awakened-front/  the awakened form from the front
- art-source/heroes-20/sprites/dhampir/awakened-back/   the awakened form from the back
Each folder holds 28 files named <row>-<n>.png:
- idle-1 .. idle-4: standing ready, a gentle breathing loop (idle-4 flows back into idle-1).
- walk-1 .. walk-8: one full walk cycle to the right in place (the figure does not travel across the canvas), legs clearly
  alternating, the body bobbing; walk-8 flows back into walk-1.
- attack-1 .. attack-4: the basic attack: a crossbow shot: raise the crossbow, aim right, loose (a small recoil), lower.
- hurt-1 .. hurt-4: struck: recoil backwards (to the left), wince, recover towards the idle pose.
- dead-1 .. dead-4: dying: stagger, collapse, fall backwards (to the left), and in dead-4 lie flat on the back on the ground line,
  head to the left, completely still.
- attack2-1 .. attack2-4: the skill cast: a stake throw: draw a silver stake from the belt and hurl it to the right.
The back folders hold the same 28 moments as the front ones, seen from behind. The awakened folders hold the same 28 moments again,
for the awakened form.

The hero:
- Look: a young Czech woman, half vampire: pale, one red eye and one grey, dark hair in a long braid; a long black hunter's coat with silver buckles, a wide-brimmed hat; a repeating crossbow, silver stakes at her belt.
- Back view: the long coat and its silver buckles from behind, the braid down her back, the hat brim.
- Awakened form: the same hero, upgraded: silver filigree across the coat, the crossbow's limbs and bolt glowing silver-white. Keep the pose, scale and colours; only the gear grows grander.

For the character, use the canon below. For the family look of the new heroes, see the two finished Vampire paintings on that branch: src/art/heroes/vampireLord.webp and src/art/heroes/hemomancer.webp (git show origin/feat/twenty-heroes-vampire:<path> > ref.webp). If art-source/heroes-20/dhampir-cutout.png is on main, match it as well.
```

## Battle prompt 6: Raiden (`warDrummer`)

```text
You are painting battle sprites for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). This task is one new hero: Raiden, Thunder of the Keep (Samurai, Support).

Rules for this task:
- Branch from main as art/heroes-20-sprites-warDrummer. Add PNG files under art-source/heroes-20/sprites/warDrummer/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes battle frames: Raiden". In its body say which frames are complete.
- No text, logos, frames, watermarks or signatures. Original work only.

The game's battle sprites are small (about 96 px tall in a fight), drawn on a sunny painted board in a three-quarter view. You will
paint each animation frame of this hero as its own large PNG; a script (tools/heroes-20/pack-sheets.py) shrinks the frames and packs
them into the game's sheet, so you do NOT make a sprite sheet and do NOT draw any grid.

Every frame:
- RGBA PNG, exactly 1024 x 1024 px, a fully transparent background: no ground, no shadow, no backdrop, no glow cloud, no border.
- The ground line is y = 900: the soles of the standing feet rest exactly on it in every standing or walking frame (in the jump or
  fall frames the body may lift off it or lie along it). The figure's standing centre is x = 512. Nothing comes within 24 px of the
  canvas edge.
- The same scale in every frame: standing upright the figure is about 600 px from the soles to the top of the head (wings, weapons
  and hair may go higher). Do not zoom in or out between frames.
- Facing right. The "front" frames are a three-quarter view from the front (we see the face and chest, turned to the right). The
  "back" frames are a true back three-quarter view: we see the back of the head and body, turned away from us towards the right,
  as if the camera stood behind the hero's left shoulder. A mirrored front view is not a back view.
- Style: crisp game-sprite rendering that survives being shrunk to a sixth: a bold dark outline about 6 px thick, clean cel shading
  in two or three tones, strong colour, no soft airbrushed glow, no motion blur, no speed lines, no blurry edges, no detached sparks
  or particles. Look at src/art/units/hero_res_tyrant.png and hero_res_tyrant_back.png, src/art/units/hero_res_wizard.png and
  src/art/awakened/awakened_tyrant.png on main: the frames should shrink to that look.
- Paint the idle-1 front frame first and keep it open as the reference for every other frame, so the hero stays the same person with
  the same outfit, colours and proportions throughout. Make each new frame as an edit of a previous one where you can.

The frames, in four folders (112 PNGs in all):
- art-source/heroes-20/sprites/warDrummer/front/  the plain hero from the front
- art-source/heroes-20/sprites/warDrummer/back/   the plain hero from the back
- art-source/heroes-20/sprites/warDrummer/awakened-front/  the awakened form from the front
- art-source/heroes-20/sprites/warDrummer/awakened-back/   the awakened form from the back
Each folder holds 28 files named <row>-<n>.png:
- idle-1 .. idle-4: standing ready, a gentle breathing loop (idle-4 flows back into idle-1).
- walk-1 .. walk-8: one full walk cycle to the right in place (the figure does not travel across the canvas), legs clearly
  alternating, the body bobbing; walk-8 flows back into walk-1.
- attack-1 .. attack-4: the basic attack: a stick strike: swing a bachi stick down hard in front to the right like a club.
- hurt-1 .. hurt-4: struck: recoil backwards (to the left), wince, recover towards the idle pose.
- dead-1 .. dead-4: dying: stagger, collapse, fall backwards (to the left), and in dead-4 lie flat on the back on the ground line,
  head to the left, completely still.
- attack2-1 .. attack2-4: the skill cast: a drum beat: swing the drum round to his front and strike it with both sticks, a burst of sound.
The back folders hold the same 28 moments as the front ones, seen from behind. The awakened folders hold the same 28 moments again,
for the awakened form.

The hero:
- Look: a broad-shouldered Japanese man with a topknot and a headband; an open dark-blue happi coat over lacquered red samurai shoulder guards; a great oxhide taiko drum on a wooden frame on his back, two heavy bachi sticks.
- Back view: the great taiko drum and its frame cover his back; the topknot above it.
- Awakened form: the same hero, upgraded: lightning crackling round the drum, gold crests on the coat. Keep the pose, scale and colours; only the gear grows grander.

For the character, use the canon below. For the family look of the new heroes, see the two finished Vampire paintings on that branch: src/art/heroes/vampireLord.webp and src/art/heroes/hemomancer.webp (git show origin/feat/twenty-heroes-vampire:<path> > ref.webp). If art-source/heroes-20/warDrummer-cutout.png is on main, match it as well.
```

## Battle prompt 7: Isolde (`banneret`)

```text
You are painting battle sprites for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). This task is one new hero: Isolde, Voice of the Rampart (Knightly, Warden).

Rules for this task:
- Branch from main as art/heroes-20-sprites-banneret. Add PNG files under art-source/heroes-20/sprites/banneret/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes battle frames: Isolde". In its body say which frames are complete.
- No text, logos, frames, watermarks or signatures. Original work only.

The game's battle sprites are small (about 96 px tall in a fight), drawn on a sunny painted board in a three-quarter view. You will
paint each animation frame of this hero as its own large PNG; a script (tools/heroes-20/pack-sheets.py) shrinks the frames and packs
them into the game's sheet, so you do NOT make a sprite sheet and do NOT draw any grid.

Every frame:
- RGBA PNG, exactly 1024 x 1024 px, a fully transparent background: no ground, no shadow, no backdrop, no glow cloud, no border.
- The ground line is y = 900: the soles of the standing feet rest exactly on it in every standing or walking frame (in the jump or
  fall frames the body may lift off it or lie along it). The figure's standing centre is x = 512. Nothing comes within 24 px of the
  canvas edge.
- The same scale in every frame: standing upright the figure is about 600 px from the soles to the top of the head (wings, weapons
  and hair may go higher). Do not zoom in or out between frames.
- Facing right. The "front" frames are a three-quarter view from the front (we see the face and chest, turned to the right). The
  "back" frames are a true back three-quarter view: we see the back of the head and body, turned away from us towards the right,
  as if the camera stood behind the hero's left shoulder. A mirrored front view is not a back view.
- Style: crisp game-sprite rendering that survives being shrunk to a sixth: a bold dark outline about 6 px thick, clean cel shading
  in two or three tones, strong colour, no soft airbrushed glow, no motion blur, no speed lines, no blurry edges, no detached sparks
  or particles. Look at src/art/units/hero_res_tyrant.png and hero_res_tyrant_back.png, src/art/units/hero_res_wizard.png and
  src/art/awakened/awakened_tyrant.png on main: the frames should shrink to that look.
- Paint the idle-1 front frame first and keep it open as the reference for every other frame, so the hero stays the same person with
  the same outfit, colours and proportions throughout. Make each new frame as an edit of a previous one where you can.

The frames, in four folders (112 PNGs in all):
- art-source/heroes-20/sprites/banneret/front/  the plain hero from the front
- art-source/heroes-20/sprites/banneret/back/   the plain hero from the back
- art-source/heroes-20/sprites/banneret/awakened-front/  the awakened form from the front
- art-source/heroes-20/sprites/banneret/awakened-back/   the awakened form from the back
Each folder holds 28 files named <row>-<n>.png:
- idle-1 .. idle-4: standing ready, a gentle breathing loop (idle-4 flows back into idle-1).
- walk-1 .. walk-8: one full walk cycle to the right in place (the figure does not travel across the canvas), legs clearly
  alternating, the body bobbing; walk-8 flows back into walk-1.
- attack-1 .. attack-4: the basic attack: a lance thrust: couch the lance and drive it forward to the right behind the shield.
- hurt-1 .. hurt-4: struck: recoil backwards (to the left), wince, recover towards the idle pose.
- dead-1 .. dead-4: dying: stagger, collapse, fall backwards (to the left), and in dead-4 lie flat on the back on the ground line,
  head to the left, completely still.
- attack2-1 .. attack2-4: the skill cast: planting the standard: raise the lance high and drive its butt into the ground, the guidon streaming.
The back folders hold the same 28 moments as the front ones, seen from behind. The awakened folders hold the same 28 moments again,
for the awakened form.

The hero:
- Look: a Norman French woman knight, short fair braid, open-faced helm; steel plate with a blue and gold surcoat; a lance carrying a long silk guidon of the keep, and a kite shield.
- Back view: the blue and gold surcoat's back, the shield on her arm seen edge-on, the braid under the helm.
- Awakened form: the same hero, upgraded: gilded plate, the guidon glowing with the keep's sigil in light (no lettering). Keep the pose, scale and colours; only the gear grows grander.

For the character, use the canon below. For the family look of the new heroes, see the two finished Vampire paintings on that branch: src/art/heroes/vampireLord.webp and src/art/heroes/hemomancer.webp (git show origin/feat/twenty-heroes-vampire:<path> > ref.webp). If art-source/heroes-20/banneret-cutout.png is on main, match it as well.
```

## Battle prompt 8: Tenzin (`geomancer`)

```text
You are painting battle sprites for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). This task is one new hero: Tenzin, Shaper of Crags (Mystic, Bulwark).

Rules for this task:
- Branch from main as art/heroes-20-sprites-geomancer. Add PNG files under art-source/heroes-20/sprites/geomancer/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes battle frames: Tenzin". In its body say which frames are complete.
- No text, logos, frames, watermarks or signatures. Original work only.

The game's battle sprites are small (about 96 px tall in a fight), drawn on a sunny painted board in a three-quarter view. You will
paint each animation frame of this hero as its own large PNG; a script (tools/heroes-20/pack-sheets.py) shrinks the frames and packs
them into the game's sheet, so you do NOT make a sprite sheet and do NOT draw any grid.

Every frame:
- RGBA PNG, exactly 1024 x 1024 px, a fully transparent background: no ground, no shadow, no backdrop, no glow cloud, no border.
- The ground line is y = 900: the soles of the standing feet rest exactly on it in every standing or walking frame (in the jump or
  fall frames the body may lift off it or lie along it). The figure's standing centre is x = 512. Nothing comes within 24 px of the
  canvas edge.
- The same scale in every frame: standing upright the figure is about 600 px from the soles to the top of the head (wings, weapons
  and hair may go higher). Do not zoom in or out between frames.
- Facing right. The "front" frames are a three-quarter view from the front (we see the face and chest, turned to the right). The
  "back" frames are a true back three-quarter view: we see the back of the head and body, turned away from us towards the right,
  as if the camera stood behind the hero's left shoulder. A mirrored front view is not a back view.
- Style: crisp game-sprite rendering that survives being shrunk to a sixth: a bold dark outline about 6 px thick, clean cel shading
  in two or three tones, strong colour, no soft airbrushed glow, no motion blur, no speed lines, no blurry edges, no detached sparks
  or particles. Look at src/art/units/hero_res_tyrant.png and hero_res_tyrant_back.png, src/art/units/hero_res_wizard.png and
  src/art/awakened/awakened_tyrant.png on main: the frames should shrink to that look.
- Paint the idle-1 front frame first and keep it open as the reference for every other frame, so the hero stays the same person with
  the same outfit, colours and proportions throughout. Make each new frame as an edit of a previous one where you can.

The frames, in four folders (112 PNGs in all):
- art-source/heroes-20/sprites/geomancer/front/  the plain hero from the front
- art-source/heroes-20/sprites/geomancer/back/   the plain hero from the back
- art-source/heroes-20/sprites/geomancer/awakened-front/  the awakened form from the front
- art-source/heroes-20/sprites/geomancer/awakened-back/   the awakened form from the back
Each folder holds 28 files named <row>-<n>.png:
- idle-1 .. idle-4: standing ready, a gentle breathing loop (idle-4 flows back into idle-1).
- walk-1 .. walk-8: one full walk cycle to the right in place (the figure does not travel across the canvas), legs clearly
  alternating, the body bobbing; walk-8 flows back into walk-1.
- attack-1 .. attack-4: the basic attack: a staff strike: swing the slate staff down and forward to the right.
- hurt-1 .. hurt-4: struck: recoil backwards (to the left), wince, recover towards the idle pose.
- dead-1 .. dead-4: dying: stagger, collapse, fall backwards (to the left), and in dead-4 lie flat on the back on the ground line,
  head to the left, completely still.
- attack2-1 .. attack2-4: the skill cast: a stamp: raise the staff and strike its foot on the ground, rocks jumping up round her.
The back folders hold the same 28 moments as the front ones, seen from behind. The awakened folders hold the same 28 moments again,
for the awakened form.

The hero:
- Look: a Tibetan woman with a calm weathered face and long black braids with turquoise and coral beads; layered maroon and saffron robes over stone-plated bracers; a staff of carved slate with a ring of rock floating round its head.
- Back view: the layered robes and the beaded braids from behind, the staff held upright.
- Awakened form: the same hero, upgraded: a halo of floating rocks and turquoise stones, glowing amber runes on the bracers. Keep the pose, scale and colours; only the gear grows grander.

For the character, use the canon below. For the family look of the new heroes, see the two finished Vampire paintings on that branch: src/art/heroes/vampireLord.webp and src/art/heroes/hemomancer.webp (git show origin/feat/twenty-heroes-vampire:<path> > ref.webp). If art-source/heroes-20/geomancer-cutout.png is on main, match it as well.
```

## Battle prompt 9: Kavi (`bellWarden`)

```text
You are painting battle sprites for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). This task is one new hero: Kavi, Keeper of the Bronze Toll (Yokai, Bulwark).

Rules for this task:
- Branch from main as art/heroes-20-sprites-bellWarden. Add PNG files under art-source/heroes-20/sprites/bellWarden/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes battle frames: Kavi". In its body say which frames are complete.
- No text, logos, frames, watermarks or signatures. Original work only.

The game's battle sprites are small (about 96 px tall in a fight), drawn on a sunny painted board in a three-quarter view. You will
paint each animation frame of this hero as its own large PNG; a script (tools/heroes-20/pack-sheets.py) shrinks the frames and packs
them into the game's sheet, so you do NOT make a sprite sheet and do NOT draw any grid.

Every frame:
- RGBA PNG, exactly 1024 x 1024 px, a fully transparent background: no ground, no shadow, no backdrop, no glow cloud, no border.
- The ground line is y = 900: the soles of the standing feet rest exactly on it in every standing or walking frame (in the jump or
  fall frames the body may lift off it or lie along it). The figure's standing centre is x = 512. Nothing comes within 24 px of the
  canvas edge.
- The same scale in every frame: standing upright the figure is about 600 px from the soles to the top of the head (wings, weapons
  and hair may go higher). Do not zoom in or out between frames.
- Facing right. The "front" frames are a three-quarter view from the front (we see the face and chest, turned to the right). The
  "back" frames are a true back three-quarter view: we see the back of the head and body, turned away from us towards the right,
  as if the camera stood behind the hero's left shoulder. A mirrored front view is not a back view.
- Style: crisp game-sprite rendering that survives being shrunk to a sixth: a bold dark outline about 6 px thick, clean cel shading
  in two or three tones, strong colour, no soft airbrushed glow, no motion blur, no speed lines, no blurry edges, no detached sparks
  or particles. Look at src/art/units/hero_res_tyrant.png and hero_res_tyrant_back.png, src/art/units/hero_res_wizard.png and
  src/art/awakened/awakened_tyrant.png on main: the frames should shrink to that look.
- Paint the idle-1 front frame first and keep it open as the reference for every other frame, so the hero stays the same person with
  the same outfit, colours and proportions throughout. Make each new frame as an edit of a previous one where you can.

The frames, in four folders (112 PNGs in all):
- art-source/heroes-20/sprites/bellWarden/front/  the plain hero from the front
- art-source/heroes-20/sprites/bellWarden/back/   the plain hero from the back
- art-source/heroes-20/sprites/bellWarden/awakened-front/  the awakened form from the front
- art-source/heroes-20/sprites/bellWarden/awakened-back/   the awakened form from the back
Each folder holds 28 files named <row>-<n>.png:
- idle-1 .. idle-4: standing ready, a gentle breathing loop (idle-4 flows back into idle-1).
- walk-1 .. walk-8: one full walk cycle to the right in place (the figure does not travel across the canvas), legs clearly
  alternating, the body bobbing; walk-8 flows back into walk-1. This hero flies: in the walk frames it may hover a little above the ground line with wing beats, but the lowest point stays within 40 px of it, and idle-1 stands on it.
- attack-1 .. attack-4: the basic attack: a beam strike: swing the striker beam forward to the right like a ram.
- hurt-1 .. hurt-4: struck: recoil backwards (to the left), wince, recover towards the idle pose.
- dead-1 .. dead-4: dying: stagger, collapse, fall backwards (to the left), and in dead-4 lie flat on the back on the ground line,
  head to the left, completely still.
- attack2-1 .. attack2-4: the skill cast: a bell slam: lift the bell off his shoulders and slam it down in front of him.
The back folders hold the same 28 moments as the front ones, seen from behind. The awakened folders hold the same 28 moments again,
for the awakened form.

The hero:
- Look: not human: a towering bronze-skinned guardian spirit with small horns and green patina markings, a monk's straw rope belt; a great bronze temple bell carried on his shoulders, its wooden striker beam in his hands.
- Back view: the bronze bell on his shoulders from behind, the rope belt and broad back.
- Awakened form: the same hero, upgraded: the bell engraved and ringing with golden sound rings, a prayer-bead garland. Keep the pose, scale and colours; only the gear grows grander.

For the character, use the canon below. For the family look of the new heroes, see the two finished Vampire paintings on that branch: src/art/heroes/vampireLord.webp and src/art/heroes/hemomancer.webp (git show origin/feat/twenty-heroes-vampire:<path> > ref.webp). If art-source/heroes-20/bellWarden-cutout.png is on main, match it as well.
```

## Battle prompt 10: Aisling (`falconer`)

```text
You are painting battle sprites for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). This task is one new hero: Aisling, Wing of the Glen (Wild, Marksman).

Rules for this task:
- Branch from main as art/heroes-20-sprites-falconer. Add PNG files under art-source/heroes-20/sprites/falconer/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes battle frames: Aisling". In its body say which frames are complete.
- No text, logos, frames, watermarks or signatures. Original work only.

The game's battle sprites are small (about 96 px tall in a fight), drawn on a sunny painted board in a three-quarter view. You will
paint each animation frame of this hero as its own large PNG; a script (tools/heroes-20/pack-sheets.py) shrinks the frames and packs
them into the game's sheet, so you do NOT make a sprite sheet and do NOT draw any grid.

Every frame:
- RGBA PNG, exactly 1024 x 1024 px, a fully transparent background: no ground, no shadow, no backdrop, no glow cloud, no border.
- The ground line is y = 900: the soles of the standing feet rest exactly on it in every standing or walking frame (in the jump or
  fall frames the body may lift off it or lie along it). The figure's standing centre is x = 512. Nothing comes within 24 px of the
  canvas edge.
- The same scale in every frame: standing upright the figure is about 600 px from the soles to the top of the head (wings, weapons
  and hair may go higher). Do not zoom in or out between frames.
- Facing right. The "front" frames are a three-quarter view from the front (we see the face and chest, turned to the right). The
  "back" frames are a true back three-quarter view: we see the back of the head and body, turned away from us towards the right,
  as if the camera stood behind the hero's left shoulder. A mirrored front view is not a back view.
- Style: crisp game-sprite rendering that survives being shrunk to a sixth: a bold dark outline about 6 px thick, clean cel shading
  in two or three tones, strong colour, no soft airbrushed glow, no motion blur, no speed lines, no blurry edges, no detached sparks
  or particles. Look at src/art/units/hero_res_tyrant.png and hero_res_tyrant_back.png, src/art/units/hero_res_wizard.png and
  src/art/awakened/awakened_tyrant.png on main: the frames should shrink to that look.
- Paint the idle-1 front frame first and keep it open as the reference for every other frame, so the hero stays the same person with
  the same outfit, colours and proportions throughout. Make each new frame as an edit of a previous one where you can.

The frames, in four folders (112 PNGs in all):
- art-source/heroes-20/sprites/falconer/front/  the plain hero from the front
- art-source/heroes-20/sprites/falconer/back/   the plain hero from the back
- art-source/heroes-20/sprites/falconer/awakened-front/  the awakened form from the front
- art-source/heroes-20/sprites/falconer/awakened-back/   the awakened form from the back
Each folder holds 28 files named <row>-<n>.png:
- idle-1 .. idle-4: standing ready, a gentle breathing loop (idle-4 flows back into idle-1).
- walk-1 .. walk-8: one full walk cycle to the right in place (the figure does not travel across the canvas), legs clearly
  alternating, the body bobbing; walk-8 flows back into walk-1.
- attack-1 .. attack-4: the basic attack: a bow shot: draw the recurve bow and loose to the right (the falcon flaps on her arm).
- hurt-1 .. hurt-4: struck: recoil backwards (to the left), wince, recover towards the idle pose.
- dead-1 .. dead-4: dying: stagger, collapse, fall backwards (to the left), and in dead-4 lie flat on the back on the ground line,
  head to the left, completely still.
- attack2-1 .. attack2-4: the skill cast: a falcon launch: thrust the gauntlet forward and the falcon flies off to the right, wings wide.
The back folders hold the same 28 moments as the front ones, seen from behind. The awakened folders hold the same 28 moments again,
for the awakened form.

The hero:
- Look: a Scottish woman with wind-tossed copper hair and freckles; green and brown tartan plaid over a leather jerkin, a falconer's gauntlet on her left arm; a white gyrfalcon perched on the gauntlet, a recurve bow.
- Back view: the tartan plaid over her back, the quiver, the falcon on her arm seen from behind.
- Awakened form: the same hero, upgraded: the falcon wreathed in wind, silver-feathered pauldrons. Keep the pose, scale and colours; only the gear grows grander.

For the character, use the canon below. For the family look of the new heroes, see the two finished Vampire paintings on that branch: src/art/heroes/vampireLord.webp and src/art/heroes/hemomancer.webp (git show origin/feat/twenty-heroes-vampire:<path> > ref.webp). If art-source/heroes-20/falconer-cutout.png is on main, match it as well.
```

## Battle prompt 11: Nenet (`astralSphinx`)

```text
You are painting battle sprites for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). This task is one new hero: Nenet, Riddle of the Stars (Arcane, Beast).

Rules for this task:
- Branch from main as art/heroes-20-sprites-astralSphinx. Add PNG files under art-source/heroes-20/sprites/astralSphinx/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes battle frames: Nenet". In its body say which frames are complete.
- No text, logos, frames, watermarks or signatures. Original work only.

The game's battle sprites are small (about 96 px tall in a fight), drawn on a sunny painted board in a three-quarter view. You will
paint each animation frame of this hero as its own large PNG; a script (tools/heroes-20/pack-sheets.py) shrinks the frames and packs
them into the game's sheet, so you do NOT make a sprite sheet and do NOT draw any grid.

Every frame:
- RGBA PNG, exactly 1024 x 1024 px, a fully transparent background: no ground, no shadow, no backdrop, no glow cloud, no border.
- The ground line is y = 900: the soles of the standing feet rest exactly on it in every standing or walking frame (in the jump or
  fall frames the body may lift off it or lie along it). The figure's standing centre is x = 512. Nothing comes within 24 px of the
  canvas edge.
- The same scale in every frame: standing upright the figure is about 600 px from the soles to the top of the head (wings, weapons
  and hair may go higher). Do not zoom in or out between frames.
- Facing right. The "front" frames are a three-quarter view from the front (we see the face and chest, turned to the right). The
  "back" frames are a true back three-quarter view: we see the back of the head and body, turned away from us towards the right,
  as if the camera stood behind the hero's left shoulder. A mirrored front view is not a back view.
- Style: crisp game-sprite rendering that survives being shrunk to a sixth: a bold dark outline about 6 px thick, clean cel shading
  in two or three tones, strong colour, no soft airbrushed glow, no motion blur, no speed lines, no blurry edges, no detached sparks
  or particles. Look at src/art/units/hero_res_tyrant.png and hero_res_tyrant_back.png, src/art/units/hero_res_wizard.png and
  src/art/awakened/awakened_tyrant.png on main: the frames should shrink to that look.
- Paint the idle-1 front frame first and keep it open as the reference for every other frame, so the hero stays the same person with
  the same outfit, colours and proportions throughout. Make each new frame as an edit of a previous one where you can.

The frames, in four folders (112 PNGs in all):
- art-source/heroes-20/sprites/astralSphinx/front/  the plain hero from the front
- art-source/heroes-20/sprites/astralSphinx/back/   the plain hero from the back
- art-source/heroes-20/sprites/astralSphinx/awakened-front/  the awakened form from the front
- art-source/heroes-20/sprites/astralSphinx/awakened-back/   the awakened form from the back
Each folder holds 28 files named <row>-<n>.png:
- idle-1 .. idle-4: standing ready, a gentle breathing loop (idle-4 flows back into idle-1).
- walk-1 .. walk-8: one full walk cycle to the right in place (the figure does not travel across the canvas), legs clearly
  alternating, the body bobbing; walk-8 flows back into walk-1. This hero flies: in the walk frames it may hover a little above the ground line with wing beats, but the lowest point stays within 40 px of it, and idle-1 stands on it.
- attack-1 .. attack-4: the basic attack: a pounce: crouch, leap forward to the right with the forepaws out, land.
- hurt-1 .. hurt-4: struck: recoil backwards (to the left), wince, recover towards the idle pose.
- dead-1 .. dead-4: dying: stagger, collapse, fall backwards (to the left), and in dead-4 lie flat on the back on the ground line,
  head to the left, completely still.
- attack2-1 .. attack2-4: the skill cast: a star cast: rear up on her hind legs, wings wide, a ring of stars round her.
The back folders hold the same 28 moments as the front ones, seen from behind. The awakened folders hold the same 28 moments again,
for the awakened form.

The hero:
- Look: not human: a winged lioness sphinx with a woman's serene face, deep blue star-flecked fur, a gold and lapis nemes headdress and collar, feathered wings like the night sky; she walks on four paws, side-on, facing right.
- Back view: the wings folded over her back, the headdress's back, the tail.
- Awakened form: the same hero, upgraded: wings of open starfield, a ring of constellations round her. Keep the pose, scale and colours; only the gear grows grander.

For the character, use the canon below. For the family look of the new heroes, see the two finished Vampire paintings on that branch: src/art/heroes/vampireLord.webp and src/art/heroes/hemomancer.webp (git show origin/feat/twenty-heroes-vampire:<path> > ref.webp). If art-source/heroes-20/astralSphinx-cutout.png is on main, match it as well.
```

## Battle prompt 12: Zahara (`mirageDancer`)

```text
You are painting battle sprites for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). This task is one new hero: Zahara, Veil of the Dunes (Frontier, Trickster).

Rules for this task:
- Branch from main as art/heroes-20-sprites-mirageDancer. Add PNG files under art-source/heroes-20/sprites/mirageDancer/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes battle frames: Zahara". In its body say which frames are complete.
- No text, logos, frames, watermarks or signatures. Original work only.

The game's battle sprites are small (about 96 px tall in a fight), drawn on a sunny painted board in a three-quarter view. You will
paint each animation frame of this hero as its own large PNG; a script (tools/heroes-20/pack-sheets.py) shrinks the frames and packs
them into the game's sheet, so you do NOT make a sprite sheet and do NOT draw any grid.

Every frame:
- RGBA PNG, exactly 1024 x 1024 px, a fully transparent background: no ground, no shadow, no backdrop, no glow cloud, no border.
- The ground line is y = 900: the soles of the standing feet rest exactly on it in every standing or walking frame (in the jump or
  fall frames the body may lift off it or lie along it). The figure's standing centre is x = 512. Nothing comes within 24 px of the
  canvas edge.
- The same scale in every frame: standing upright the figure is about 600 px from the soles to the top of the head (wings, weapons
  and hair may go higher). Do not zoom in or out between frames.
- Facing right. The "front" frames are a three-quarter view from the front (we see the face and chest, turned to the right). The
  "back" frames are a true back three-quarter view: we see the back of the head and body, turned away from us towards the right,
  as if the camera stood behind the hero's left shoulder. A mirrored front view is not a back view.
- Style: crisp game-sprite rendering that survives being shrunk to a sixth: a bold dark outline about 6 px thick, clean cel shading
  in two or three tones, strong colour, no soft airbrushed glow, no motion blur, no speed lines, no blurry edges, no detached sparks
  or particles. Look at src/art/units/hero_res_tyrant.png and hero_res_tyrant_back.png, src/art/units/hero_res_wizard.png and
  src/art/awakened/awakened_tyrant.png on main: the frames should shrink to that look.
- Paint the idle-1 front frame first and keep it open as the reference for every other frame, so the hero stays the same person with
  the same outfit, colours and proportions throughout. Make each new frame as an edit of a previous one where you can.

The frames, in four folders (112 PNGs in all):
- art-source/heroes-20/sprites/mirageDancer/front/  the plain hero from the front
- art-source/heroes-20/sprites/mirageDancer/back/   the plain hero from the back
- art-source/heroes-20/sprites/mirageDancer/awakened-front/  the awakened form from the front
- art-source/heroes-20/sprites/mirageDancer/awakened-back/   the awakened form from the back
Each folder holds 28 files named <row>-<n>.png:
- idle-1 .. idle-4: standing ready, a gentle breathing loop (idle-4 flows back into idle-1).
- walk-1 .. walk-8: one full walk cycle to the right in place (the figure does not travel across the canvas), legs clearly
  alternating, the body bobbing; walk-8 flows back into walk-1.
- attack-1 .. attack-4: the basic attack: a twin-blade slash: both scimitars cut across to the right in turn.
- hurt-1 .. hurt-4: struck: recoil backwards (to the left), wince, recover towards the idle pose.
- dead-1 .. dead-4: dying: stagger, collapse, fall backwards (to the left), and in dead-4 lie flat on the back on the ground line,
  head to the left, completely still.
- attack2-1 .. attack2-4: the skill cast: a spin: a full whirling turn, veils and blades flying out round her.
The back folders hold the same 28 moments as the front ones, seen from behind. The awakened folders hold the same 28 moments again,
for the awakened form.

The hero:
- Look: a Nubian woman with deep brown skin and long black braids with gold cuffs; flowing sand-gold and white silk veils over a fitted dancer's top, many bangles; twin curved scimitars.
- Back view: the braids and veils trailing down her back, the scimitars at her sides.
- Awakened form: the same hero, upgraded: veils of shimmering heat light, gold-inlaid scimitars. Keep the pose, scale and colours; only the gear grows grander.

For the character, use the canon below. For the family look of the new heroes, see the two finished Vampire paintings on that branch: src/art/heroes/vampireLord.webp and src/art/heroes/hemomancer.webp (git show origin/feat/twenty-heroes-vampire:<path> > ref.webp). If art-source/heroes-20/mirageDancer-cutout.png is on main, match it as well.
```

## Battle prompt 13: Corvus (`plagueDoctor`)

```text
You are painting battle sprites for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). This task is one new hero: Corvus, Censer of Ash (Undead, Arcanist).

Rules for this task:
- Branch from main as art/heroes-20-sprites-plagueDoctor. Add PNG files under art-source/heroes-20/sprites/plagueDoctor/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes battle frames: Corvus". In its body say which frames are complete.
- No text, logos, frames, watermarks or signatures. Original work only.

The game's battle sprites are small (about 96 px tall in a fight), drawn on a sunny painted board in a three-quarter view. You will
paint each animation frame of this hero as its own large PNG; a script (tools/heroes-20/pack-sheets.py) shrinks the frames and packs
them into the game's sheet, so you do NOT make a sprite sheet and do NOT draw any grid.

Every frame:
- RGBA PNG, exactly 1024 x 1024 px, a fully transparent background: no ground, no shadow, no backdrop, no glow cloud, no border.
- The ground line is y = 900: the soles of the standing feet rest exactly on it in every standing or walking frame (in the jump or
  fall frames the body may lift off it or lie along it). The figure's standing centre is x = 512. Nothing comes within 24 px of the
  canvas edge.
- The same scale in every frame: standing upright the figure is about 600 px from the soles to the top of the head (wings, weapons
  and hair may go higher). Do not zoom in or out between frames.
- Facing right. The "front" frames are a three-quarter view from the front (we see the face and chest, turned to the right). The
  "back" frames are a true back three-quarter view: we see the back of the head and body, turned away from us towards the right,
  as if the camera stood behind the hero's left shoulder. A mirrored front view is not a back view.
- Style: crisp game-sprite rendering that survives being shrunk to a sixth: a bold dark outline about 6 px thick, clean cel shading
  in two or three tones, strong colour, no soft airbrushed glow, no motion blur, no speed lines, no blurry edges, no detached sparks
  or particles. Look at src/art/units/hero_res_tyrant.png and hero_res_tyrant_back.png, src/art/units/hero_res_wizard.png and
  src/art/awakened/awakened_tyrant.png on main: the frames should shrink to that look.
- Paint the idle-1 front frame first and keep it open as the reference for every other frame, so the hero stays the same person with
  the same outfit, colours and proportions throughout. Make each new frame as an edit of a previous one where you can.

The frames, in four folders (112 PNGs in all):
- art-source/heroes-20/sprites/plagueDoctor/front/  the plain hero from the front
- art-source/heroes-20/sprites/plagueDoctor/back/   the plain hero from the back
- art-source/heroes-20/sprites/plagueDoctor/awakened-front/  the awakened form from the front
- art-source/heroes-20/sprites/plagueDoctor/awakened-back/   the awakened form from the back
Each folder holds 28 files named <row>-<n>.png:
- idle-1 .. idle-4: standing ready, a gentle breathing loop (idle-4 flows back into idle-1).
- walk-1 .. walk-8: one full walk cycle to the right in place (the figure does not travel across the canvas), legs clearly
  alternating, the body bobbing; walk-8 flows back into walk-1. This hero flies: in the walk frames it may hover a little above the ground line with wing beats, but the lowest point stays within 40 px of it, and idle-1 stands on it.
- attack-1 .. attack-4: the basic attack: a vial throw: hurl a green vial forward to the right.
- hurt-1 .. hurt-4: struck: recoil backwards (to the left), wince, recover towards the idle pose.
- dead-1 .. dead-4: dying: stagger, collapse, fall backwards (to the left), and in dead-4 lie flat on the back on the ground line,
  head to the left, completely still.
- attack2-1 .. attack2-4: the skill cast: a censer swing: swing the smoking censer round on its chain, green smoke trailing.
The back folders hold the same 28 moments as the front ones, seen from behind. The awakened folders hold the same 28 moments again,
for the awakened form.

The hero:
- Look: not human: an undead physician, grey skin at the wrists, a long black beaked plague mask with glowing green lenses, a wide-brimmed hat, a waxed black coat; a smoking brass censer on a chain, green vials on a bandolier.
- Back view: the hat and the waxed coat from behind, the beak's tip past the hat brim, the bandolier's straps.
- Awakened form: the same hero, upgraded: the censer pouring green flame, a raven-feather mantle. Keep the pose, scale and colours; only the gear grows grander.

For the character, use the canon below. For the family look of the new heroes, see the two finished Vampire paintings on that branch: src/art/heroes/vampireLord.webp and src/art/heroes/hemomancer.webp (git show origin/feat/twenty-heroes-vampire:<path> > ref.webp). If art-source/heroes-20/plagueDoctor-cutout.png is on main, match it as well.
```

## Battle prompt 14: Soren (`bombardier`)

```text
You are painting battle sprites for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). This task is one new hero: Soren, Iron Alchemist (Machine, Gunner).

Rules for this task:
- Branch from main as art/heroes-20-sprites-bombardier. Add PNG files under art-source/heroes-20/sprites/bombardier/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes battle frames: Soren". In its body say which frames are complete.
- No text, logos, frames, watermarks or signatures. Original work only.

The game's battle sprites are small (about 96 px tall in a fight), drawn on a sunny painted board in a three-quarter view. You will
paint each animation frame of this hero as its own large PNG; a script (tools/heroes-20/pack-sheets.py) shrinks the frames and packs
them into the game's sheet, so you do NOT make a sprite sheet and do NOT draw any grid.

Every frame:
- RGBA PNG, exactly 1024 x 1024 px, a fully transparent background: no ground, no shadow, no backdrop, no glow cloud, no border.
- The ground line is y = 900: the soles of the standing feet rest exactly on it in every standing or walking frame (in the jump or
  fall frames the body may lift off it or lie along it). The figure's standing centre is x = 512. Nothing comes within 24 px of the
  canvas edge.
- The same scale in every frame: standing upright the figure is about 600 px from the soles to the top of the head (wings, weapons
  and hair may go higher). Do not zoom in or out between frames.
- Facing right. The "front" frames are a three-quarter view from the front (we see the face and chest, turned to the right). The
  "back" frames are a true back three-quarter view: we see the back of the head and body, turned away from us towards the right,
  as if the camera stood behind the hero's left shoulder. A mirrored front view is not a back view.
- Style: crisp game-sprite rendering that survives being shrunk to a sixth: a bold dark outline about 6 px thick, clean cel shading
  in two or three tones, strong colour, no soft airbrushed glow, no motion blur, no speed lines, no blurry edges, no detached sparks
  or particles. Look at src/art/units/hero_res_tyrant.png and hero_res_tyrant_back.png, src/art/units/hero_res_wizard.png and
  src/art/awakened/awakened_tyrant.png on main: the frames should shrink to that look.
- Paint the idle-1 front frame first and keep it open as the reference for every other frame, so the hero stays the same person with
  the same outfit, colours and proportions throughout. Make each new frame as an edit of a previous one where you can.

The frames, in four folders (112 PNGs in all):
- art-source/heroes-20/sprites/bombardier/front/  the plain hero from the front
- art-source/heroes-20/sprites/bombardier/back/   the plain hero from the back
- art-source/heroes-20/sprites/bombardier/awakened-front/  the awakened form from the front
- art-source/heroes-20/sprites/bombardier/awakened-back/   the awakened form from the back
Each folder holds 28 files named <row>-<n>.png:
- idle-1 .. idle-4: standing ready, a gentle breathing loop (idle-4 flows back into idle-1).
- walk-1 .. walk-8: one full walk cycle to the right in place (the figure does not travel across the canvas), legs clearly
  alternating, the body bobbing; walk-8 flows back into walk-1.
- attack-1 .. attack-4: the basic attack: a mortar shot: brace and fire the mortar-gun up and to the right (recoil, a puff of smoke).
- hurt-1 .. hurt-4: struck: recoil backwards (to the left), wince, recover towards the idle pose.
- dead-1 .. dead-4: dying: stagger, collapse, fall backwards (to the left), and in dead-4 lie flat on the back on the ground line,
  head to the left, completely still.
- attack2-1 .. attack2-4: the skill cast: a bomb toss: light a round bomb and lob it to the right.
The back folders hold the same 28 moments as the front ones, seen from behind. The awakened folders hold the same 28 moments again,
for the awakened form.

The hero:
- Look: a Danish man with a singed blond beard and soot-smudged goggles pushed up; a leather apron over riveted iron armour, a backpack of fuses with a small rocket pack; a short iron mortar-gun.
- Back view: the backpack of fuses and the rocket pack fill his back; the apron strings.
- Awakened form: the same hero, upgraded: brass and iron exoskeleton plates, the rocket pack lit. Keep the pose, scale and colours; only the gear grows grander.

For the character, use the canon below. For the family look of the new heroes, see the two finished Vampire paintings on that branch: src/art/heroes/vampireLord.webp and src/art/heroes/hemomancer.webp (git show origin/feat/twenty-heroes-vampire:<path> > ref.webp). If art-source/heroes-20/bombardier-cutout.png is on main, match it as well.
```

## Battle prompt 15: Cyra (`astrologer`)

```text
You are painting battle sprites for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). This task is one new hero: Cyra, Keeper of the Astrolabe (Royal, Arcanist).

Rules for this task:
- Branch from main as art/heroes-20-sprites-astrologer. Add PNG files under art-source/heroes-20/sprites/astrologer/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes battle frames: Cyra". In its body say which frames are complete.
- No text, logos, frames, watermarks or signatures. Original work only.

The game's battle sprites are small (about 96 px tall in a fight), drawn on a sunny painted board in a three-quarter view. You will
paint each animation frame of this hero as its own large PNG; a script (tools/heroes-20/pack-sheets.py) shrinks the frames and packs
them into the game's sheet, so you do NOT make a sprite sheet and do NOT draw any grid.

Every frame:
- RGBA PNG, exactly 1024 x 1024 px, a fully transparent background: no ground, no shadow, no backdrop, no glow cloud, no border.
- The ground line is y = 900: the soles of the standing feet rest exactly on it in every standing or walking frame (in the jump or
  fall frames the body may lift off it or lie along it). The figure's standing centre is x = 512. Nothing comes within 24 px of the
  canvas edge.
- The same scale in every frame: standing upright the figure is about 600 px from the soles to the top of the head (wings, weapons
  and hair may go higher). Do not zoom in or out between frames.
- Facing right. The "front" frames are a three-quarter view from the front (we see the face and chest, turned to the right). The
  "back" frames are a true back three-quarter view: we see the back of the head and body, turned away from us towards the right,
  as if the camera stood behind the hero's left shoulder. A mirrored front view is not a back view.
- Style: crisp game-sprite rendering that survives being shrunk to a sixth: a bold dark outline about 6 px thick, clean cel shading
  in two or three tones, strong colour, no soft airbrushed glow, no motion blur, no speed lines, no blurry edges, no detached sparks
  or particles. Look at src/art/units/hero_res_tyrant.png and hero_res_tyrant_back.png, src/art/units/hero_res_wizard.png and
  src/art/awakened/awakened_tyrant.png on main: the frames should shrink to that look.
- Paint the idle-1 front frame first and keep it open as the reference for every other frame, so the hero stays the same person with
  the same outfit, colours and proportions throughout. Make each new frame as an edit of a previous one where you can.

The frames, in four folders (112 PNGs in all):
- art-source/heroes-20/sprites/astrologer/front/  the plain hero from the front
- art-source/heroes-20/sprites/astrologer/back/   the plain hero from the back
- art-source/heroes-20/sprites/astrologer/awakened-front/  the awakened form from the front
- art-source/heroes-20/sprites/astrologer/awakened-back/   the awakened form from the back
Each folder holds 28 files named <row>-<n>.png:
- idle-1 .. idle-4: standing ready, a gentle breathing loop (idle-4 flows back into idle-1).
- walk-1 .. walk-8: one full walk cycle to the right in place (the figure does not travel across the canvas), legs clearly
  alternating, the body bobbing; walk-8 flows back into walk-1.
- attack-1 .. attack-4: the basic attack: a cast: point the quill to the right and a small star darts from it.
- hurt-1 .. hurt-4: struck: recoil backwards (to the left), wince, recover towards the idle pose.
- dead-1 .. dead-4: dying: stagger, collapse, fall backwards (to the left), and in dead-4 lie flat on the back on the ground line,
  head to the left, completely still.
- attack2-1 .. attack2-4: the skill cast: a star call: raise the astrolabe overhead, its rings spinning.
The back folders hold the same 28 moments as the front ones, seen from behind. The awakened folders hold the same 28 moments again,
for the awakened form.

The hero:
- Look: a Greek woman of old Alexandria with dark curled hair bound in a gold star diadem; a deep violet and white chiton with gold meander borders and a starry mantle; a large brass astrolabe and a long quill.
- Back view: the starry mantle over her back, the diadem's back, the astrolabe held at her side.
- Awakened form: the same hero, upgraded: the astrolabe's rings floating and orbiting her, a mantle of stars. Keep the pose, scale and colours; only the gear grows grander.

For the character, use the canon below. For the family look of the new heroes, see the two finished Vampire paintings on that branch: src/art/heroes/vampireLord.webp and src/art/heroes/hemomancer.webp (git show origin/feat/twenty-heroes-vampire:<path> > ref.webp). If art-source/heroes-20/astrologer-cutout.png is on main, match it as well.
```

## Battle prompt 16: Soraya (`inquisitor`)

```text
You are painting battle sprites for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). This task is one new hero: Soraya, Scales of the Sun (Holy, Arcanist).

Rules for this task:
- Branch from main as art/heroes-20-sprites-inquisitor. Add PNG files under art-source/heroes-20/sprites/inquisitor/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes battle frames: Soraya". In its body say which frames are complete.
- No text, logos, frames, watermarks or signatures. Original work only.

The game's battle sprites are small (about 96 px tall in a fight), drawn on a sunny painted board in a three-quarter view. You will
paint each animation frame of this hero as its own large PNG; a script (tools/heroes-20/pack-sheets.py) shrinks the frames and packs
them into the game's sheet, so you do NOT make a sprite sheet and do NOT draw any grid.

Every frame:
- RGBA PNG, exactly 1024 x 1024 px, a fully transparent background: no ground, no shadow, no backdrop, no glow cloud, no border.
- The ground line is y = 900: the soles of the standing feet rest exactly on it in every standing or walking frame (in the jump or
  fall frames the body may lift off it or lie along it). The figure's standing centre is x = 512. Nothing comes within 24 px of the
  canvas edge.
- The same scale in every frame: standing upright the figure is about 600 px from the soles to the top of the head (wings, weapons
  and hair may go higher). Do not zoom in or out between frames.
- Facing right. The "front" frames are a three-quarter view from the front (we see the face and chest, turned to the right). The
  "back" frames are a true back three-quarter view: we see the back of the head and body, turned away from us towards the right,
  as if the camera stood behind the hero's left shoulder. A mirrored front view is not a back view.
- Style: crisp game-sprite rendering that survives being shrunk to a sixth: a bold dark outline about 6 px thick, clean cel shading
  in two or three tones, strong colour, no soft airbrushed glow, no motion blur, no speed lines, no blurry edges, no detached sparks
  or particles. Look at src/art/units/hero_res_tyrant.png and hero_res_tyrant_back.png, src/art/units/hero_res_wizard.png and
  src/art/awakened/awakened_tyrant.png on main: the frames should shrink to that look.
- Paint the idle-1 front frame first and keep it open as the reference for every other frame, so the hero stays the same person with
  the same outfit, colours and proportions throughout. Make each new frame as an edit of a previous one where you can.

The frames, in four folders (112 PNGs in all):
- art-source/heroes-20/sprites/inquisitor/front/  the plain hero from the front
- art-source/heroes-20/sprites/inquisitor/back/   the plain hero from the back
- art-source/heroes-20/sprites/inquisitor/awakened-front/  the awakened form from the front
- art-source/heroes-20/sprites/inquisitor/awakened-back/   the awakened form from the back
Each folder holds 28 files named <row>-<n>.png:
- idle-1 .. idle-4: standing ready, a gentle breathing loop (idle-4 flows back into idle-1).
- walk-1 .. walk-8: one full walk cycle to the right in place (the figure does not travel across the canvas), legs clearly
  alternating, the body bobbing; walk-8 flows back into walk-1.
- attack-1 .. attack-4: the basic attack: an arbalest shot: level the arbalest and loose to the right.
- hurt-1 .. hurt-4: struck: recoil backwards (to the left), wince, recover towards the idle pose.
- dead-1 .. dead-4: dying: stagger, collapse, fall backwards (to the left), and in dead-4 lie flat on the back on the ground line,
  head to the left, completely still.
- attack2-1 .. attack2-4: the skill cast: a judgement: raise one hand high, chains of light uncoiling from it.
The back folders hold the same 28 moments as the front ones, seen from behind. The awakened folders hold the same 28 moments again,
for the awakened form.

The hero:
- Look: a Persian woman with dark eyes and black hair under a white and gold hood; ivory robes embroidered with suns over a gold breastplate; balance scales at her belt and a sun-blazoned arbalest.
- Back view: the hood and the ivory robe's back with a sun embroidered on it, the scales at her belt.
- Awakened form: the same hero, upgraded: a radiant sun disc behind her, the scales glowing. Keep the pose, scale and colours; only the gear grows grander.

For the character, use the canon below. For the family look of the new heroes, see the two finished Vampire paintings on that branch: src/art/heroes/vampireLord.webp and src/art/heroes/hemomancer.webp (git show origin/feat/twenty-heroes-vampire:<path> > ref.webp). If art-source/heroes-20/inquisitor-cutout.png is on main, match it as well.
```

## Battle prompt 17: Gabriela (`seraph`)

```text
You are painting battle sprites for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). This task is one new hero: Gabriela, Wing of the Reliquary (Holy, Guardian).

Rules for this task:
- Branch from main as art/heroes-20-sprites-seraph. Add PNG files under art-source/heroes-20/sprites/seraph/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes battle frames: Gabriela". In its body say which frames are complete.
- No text, logos, frames, watermarks or signatures. Original work only.

The game's battle sprites are small (about 96 px tall in a fight), drawn on a sunny painted board in a three-quarter view. You will
paint each animation frame of this hero as its own large PNG; a script (tools/heroes-20/pack-sheets.py) shrinks the frames and packs
them into the game's sheet, so you do NOT make a sprite sheet and do NOT draw any grid.

Every frame:
- RGBA PNG, exactly 1024 x 1024 px, a fully transparent background: no ground, no shadow, no backdrop, no glow cloud, no border.
- The ground line is y = 900: the soles of the standing feet rest exactly on it in every standing or walking frame (in the jump or
  fall frames the body may lift off it or lie along it). The figure's standing centre is x = 512. Nothing comes within 24 px of the
  canvas edge.
- The same scale in every frame: standing upright the figure is about 600 px from the soles to the top of the head (wings, weapons
  and hair may go higher). Do not zoom in or out between frames.
- Facing right. The "front" frames are a three-quarter view from the front (we see the face and chest, turned to the right). The
  "back" frames are a true back three-quarter view: we see the back of the head and body, turned away from us towards the right,
  as if the camera stood behind the hero's left shoulder. A mirrored front view is not a back view.
- Style: crisp game-sprite rendering that survives being shrunk to a sixth: a bold dark outline about 6 px thick, clean cel shading
  in two or three tones, strong colour, no soft airbrushed glow, no motion blur, no speed lines, no blurry edges, no detached sparks
  or particles. Look at src/art/units/hero_res_tyrant.png and hero_res_tyrant_back.png, src/art/units/hero_res_wizard.png and
  src/art/awakened/awakened_tyrant.png on main: the frames should shrink to that look.
- Paint the idle-1 front frame first and keep it open as the reference for every other frame, so the hero stays the same person with
  the same outfit, colours and proportions throughout. Make each new frame as an edit of a previous one where you can.

The frames, in four folders (112 PNGs in all):
- art-source/heroes-20/sprites/seraph/front/  the plain hero from the front
- art-source/heroes-20/sprites/seraph/back/   the plain hero from the back
- art-source/heroes-20/sprites/seraph/awakened-front/  the awakened form from the front
- art-source/heroes-20/sprites/seraph/awakened-back/   the awakened form from the back
Each folder holds 28 files named <row>-<n>.png:
- idle-1 .. idle-4: standing ready, a gentle breathing loop (idle-4 flows back into idle-1).
- walk-1 .. walk-8: one full walk cycle to the right in place (the figure does not travel across the canvas), legs clearly
  alternating, the body bobbing; walk-8 flows back into walk-1. This hero flies: in the walk frames it may hover a little above the ground line with wing beats, but the lowest point stays within 40 px of it, and idle-1 stands on it.
- attack-1 .. attack-4: the basic attack: a halberd sweep: a wide cut to the right with the halberd.
- hurt-1 .. hurt-4: struck: recoil backwards (to the left), wince, recover towards the idle pose.
- dead-1 .. dead-4: dying: stagger, collapse, fall backwards (to the left), and in dead-4 lie flat on the back on the ground line,
  head to the left, completely still.
- attack2-1 .. attack2-4: the skill cast: a dive: wings spread, she drops into a downward halberd strike.
The back folders hold the same 28 moments as the front ones, seen from behind. The awakened folders hold the same 28 moments again,
for the awakened form.

The hero:
- Look: a Castilian woman with dark wavy hair and a golden halo; six golden wings; white and gold reliquary armour with red enamel; a gleaming halberd.
- Back view: the six golden wings from behind, folded or half spread, the halo seen from the back.
- Awakened form: the same hero, upgraded: wings of flame-gold light, a brighter double halo. Keep the pose, scale and colours; only the gear grows grander.

For the character, use the canon below. For the family look of the new heroes, see the two finished Vampire paintings on that branch: src/art/heroes/vampireLord.webp and src/art/heroes/hemomancer.webp (git show origin/feat/twenty-heroes-vampire:<path> > ref.webp). If art-source/heroes-20/seraph-cutout.png is on main, match it as well.
```

## Battle prompt 18: Tariq (`corsairSurgeon`)

```text
You are painting battle sprites for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). This task is one new hero: Tariq, Sawbones of the Reef (Pirate, Support).

Rules for this task:
- Branch from main as art/heroes-20-sprites-corsairSurgeon. Add PNG files under art-source/heroes-20/sprites/corsairSurgeon/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes battle frames: Tariq". In its body say which frames are complete.
- No text, logos, frames, watermarks or signatures. Original work only.

The game's battle sprites are small (about 96 px tall in a fight), drawn on a sunny painted board in a three-quarter view. You will
paint each animation frame of this hero as its own large PNG; a script (tools/heroes-20/pack-sheets.py) shrinks the frames and packs
them into the game's sheet, so you do NOT make a sprite sheet and do NOT draw any grid.

Every frame:
- RGBA PNG, exactly 1024 x 1024 px, a fully transparent background: no ground, no shadow, no backdrop, no glow cloud, no border.
- The ground line is y = 900: the soles of the standing feet rest exactly on it in every standing or walking frame (in the jump or
  fall frames the body may lift off it or lie along it). The figure's standing centre is x = 512. Nothing comes within 24 px of the
  canvas edge.
- The same scale in every frame: standing upright the figure is about 600 px from the soles to the top of the head (wings, weapons
  and hair may go higher). Do not zoom in or out between frames.
- Facing right. The "front" frames are a three-quarter view from the front (we see the face and chest, turned to the right). The
  "back" frames are a true back three-quarter view: we see the back of the head and body, turned away from us towards the right,
  as if the camera stood behind the hero's left shoulder. A mirrored front view is not a back view.
- Style: crisp game-sprite rendering that survives being shrunk to a sixth: a bold dark outline about 6 px thick, clean cel shading
  in two or three tones, strong colour, no soft airbrushed glow, no motion blur, no speed lines, no blurry edges, no detached sparks
  or particles. Look at src/art/units/hero_res_tyrant.png and hero_res_tyrant_back.png, src/art/units/hero_res_wizard.png and
  src/art/awakened/awakened_tyrant.png on main: the frames should shrink to that look.
- Paint the idle-1 front frame first and keep it open as the reference for every other frame, so the hero stays the same person with
  the same outfit, colours and proportions throughout. Make each new frame as an edit of a previous one where you can.

The frames, in four folders (112 PNGs in all):
- art-source/heroes-20/sprites/corsairSurgeon/front/  the plain hero from the front
- art-source/heroes-20/sprites/corsairSurgeon/back/   the plain hero from the back
- art-source/heroes-20/sprites/corsairSurgeon/awakened-front/  the awakened form from the front
- art-source/heroes-20/sprites/corsairSurgeon/awakened-back/   the awakened form from the back
Each folder holds 28 files named <row>-<n>.png:
- idle-1 .. idle-4: standing ready, a gentle breathing loop (idle-4 flows back into idle-1).
- walk-1 .. walk-8: one full walk cycle to the right in place (the figure does not travel across the canvas), legs clearly
  alternating, the body bobbing; walk-8 flows back into walk-1.
- attack-1 .. attack-4: the basic attack: a pistol shot: draw the flintlock and fire to the right (a puff of smoke).
- hurt-1 .. hurt-4: struck: recoil backwards (to the left), wince, recover towards the idle pose.
- dead-1 .. dead-4: dying: stagger, collapse, fall backwards (to the left), and in dead-4 lie flat on the back on the ground line,
  head to the left, completely still.
- attack2-1 .. attack2-4: the skill cast: a tonic toss: throw a tonic bottle up and to the right.
The back folders hold the same 28 moments as the front ones, seen from behind. The awakened folders hold the same 28 moments again,
for the awakened form.

The hero:
- Look: a Moroccan man with a trimmed black beard and a red head-wrap; a stained surgeon's coat over a zellige-patterned striped sash, sleeves rolled; a bone saw, a bandolier of tonic bottles and a flintlock pistol.
- Back view: the surgeon's coat's back, the head-wrap's knot, the bandolier across his back.
- Awakened form: the same hero, upgraded: a captain's coat with brass buttons, glowing green tonic bottles. Keep the pose, scale and colours; only the gear grows grander.

For the character, use the canon below. For the family look of the new heroes, see the two finished Vampire paintings on that branch: src/art/heroes/vampireLord.webp and src/art/heroes/hemomancer.webp (git show origin/feat/twenty-heroes-vampire:<path> > ref.webp). If art-source/heroes-20/corsairSurgeon-cutout.png is on main, match it as well.
```

## Battle prompt 19: Siku (`harpooner`)

```text
You are painting battle sprites for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). This task is one new hero: Siku, Whaler of the Floes (Pirate, Gunner).

Rules for this task:
- Branch from main as art/heroes-20-sprites-harpooner. Add PNG files under art-source/heroes-20/sprites/harpooner/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes battle frames: Siku". In its body say which frames are complete.
- No text, logos, frames, watermarks or signatures. Original work only.

The game's battle sprites are small (about 96 px tall in a fight), drawn on a sunny painted board in a three-quarter view. You will
paint each animation frame of this hero as its own large PNG; a script (tools/heroes-20/pack-sheets.py) shrinks the frames and packs
them into the game's sheet, so you do NOT make a sprite sheet and do NOT draw any grid.

Every frame:
- RGBA PNG, exactly 1024 x 1024 px, a fully transparent background: no ground, no shadow, no backdrop, no glow cloud, no border.
- The ground line is y = 900: the soles of the standing feet rest exactly on it in every standing or walking frame (in the jump or
  fall frames the body may lift off it or lie along it). The figure's standing centre is x = 512. Nothing comes within 24 px of the
  canvas edge.
- The same scale in every frame: standing upright the figure is about 600 px from the soles to the top of the head (wings, weapons
  and hair may go higher). Do not zoom in or out between frames.
- Facing right. The "front" frames are a three-quarter view from the front (we see the face and chest, turned to the right). The
  "back" frames are a true back three-quarter view: we see the back of the head and body, turned away from us towards the right,
  as if the camera stood behind the hero's left shoulder. A mirrored front view is not a back view.
- Style: crisp game-sprite rendering that survives being shrunk to a sixth: a bold dark outline about 6 px thick, clean cel shading
  in two or three tones, strong colour, no soft airbrushed glow, no motion blur, no speed lines, no blurry edges, no detached sparks
  or particles. Look at src/art/units/hero_res_tyrant.png and hero_res_tyrant_back.png, src/art/units/hero_res_wizard.png and
  src/art/awakened/awakened_tyrant.png on main: the frames should shrink to that look.
- Paint the idle-1 front frame first and keep it open as the reference for every other frame, so the hero stays the same person with
  the same outfit, colours and proportions throughout. Make each new frame as an edit of a previous one where you can.

The frames, in four folders (112 PNGs in all):
- art-source/heroes-20/sprites/harpooner/front/  the plain hero from the front
- art-source/heroes-20/sprites/harpooner/back/   the plain hero from the back
- art-source/heroes-20/sprites/harpooner/awakened-front/  the awakened form from the front
- art-source/heroes-20/sprites/harpooner/awakened-back/   the awakened form from the back
Each folder holds 28 files named <row>-<n>.png:
- idle-1 .. idle-4: standing ready, a gentle breathing loop (idle-4 flows back into idle-1).
- walk-1 .. walk-8: one full walk cycle to the right in place (the figure does not travel across the canvas), legs clearly
  alternating, the body bobbing; walk-8 flows back into walk-1.
- attack-1 .. attack-4: the basic attack: a harpoon throw: draw back and hurl the harpoon to the right, the line paying out.
- hurt-1 .. hurt-4: struck: recoil backwards (to the left), wince, recover towards the idle pose.
- dead-1 .. dead-4: dying: stagger, collapse, fall backwards (to the left), and in dead-4 lie flat on the back on the ground line,
  head to the left, completely still.
- attack2-1 .. attack2-4: the skill cast: a haul: brace and haul the line in hand over hand.
The back folders hold the same 28 moments as the front ones, seen from behind. The awakened folders hold the same 28 moments again,
for the awakened form.

The hero:
- Look: an Inuit man from Greenland with a broad wind-burnt face and short black hair; a sealskin parka with fur trim and carved bone toggles; a heavy barbed iron harpoon on a coiled hemp line.
- Back view: the parka's hood and fur trim from behind, the coiled line over his shoulder.
- Awakened form: the same hero, upgraded: an ice-blue glowing harpoon head, a white bear-fur mantle. Keep the pose, scale and colours; only the gear grows grander.

For the character, use the canon below. For the family look of the new heroes, see the two finished Vampire paintings on that branch: src/art/heroes/vampireLord.webp and src/art/heroes/hemomancer.webp (git show origin/feat/twenty-heroes-vampire:<path> > ref.webp). If art-source/heroes-20/harpooner-cutout.png is on main, match it as well.
```

## Battle prompt 20: Nakoa (`seaReaver`)

```text
You are painting battle sprites for Legends of the Last Keep, a fantasy auto-battler played as a phone web app (repository
hpatter9/legends-of-the-fall). This task is one new hero: Nakoa, Breaker of Hulls (Pirate, Vanguard).

Rules for this task:
- Branch from main as art/heroes-20-sprites-seaReaver. Add PNG files under art-source/heroes-20/sprites/seaReaver/ only. Change no other file.
- Open one pull request into main titled "Twenty heroes battle frames: Nakoa". In its body say which frames are complete.
- No text, logos, frames, watermarks or signatures. Original work only.

The game's battle sprites are small (about 96 px tall in a fight), drawn on a sunny painted board in a three-quarter view. You will
paint each animation frame of this hero as its own large PNG; a script (tools/heroes-20/pack-sheets.py) shrinks the frames and packs
them into the game's sheet, so you do NOT make a sprite sheet and do NOT draw any grid.

Every frame:
- RGBA PNG, exactly 1024 x 1024 px, a fully transparent background: no ground, no shadow, no backdrop, no glow cloud, no border.
- The ground line is y = 900: the soles of the standing feet rest exactly on it in every standing or walking frame (in the jump or
  fall frames the body may lift off it or lie along it). The figure's standing centre is x = 512. Nothing comes within 24 px of the
  canvas edge.
- The same scale in every frame: standing upright the figure is about 600 px from the soles to the top of the head (wings, weapons
  and hair may go higher). Do not zoom in or out between frames.
- Facing right. The "front" frames are a three-quarter view from the front (we see the face and chest, turned to the right). The
  "back" frames are a true back three-quarter view: we see the back of the head and body, turned away from us towards the right,
  as if the camera stood behind the hero's left shoulder. A mirrored front view is not a back view.
- Style: crisp game-sprite rendering that survives being shrunk to a sixth: a bold dark outline about 6 px thick, clean cel shading
  in two or three tones, strong colour, no soft airbrushed glow, no motion blur, no speed lines, no blurry edges, no detached sparks
  or particles. Look at src/art/units/hero_res_tyrant.png and hero_res_tyrant_back.png, src/art/units/hero_res_wizard.png and
  src/art/awakened/awakened_tyrant.png on main: the frames should shrink to that look.
- Paint the idle-1 front frame first and keep it open as the reference for every other frame, so the hero stays the same person with
  the same outfit, colours and proportions throughout. Make each new frame as an edit of a previous one where you can.

The frames, in four folders (112 PNGs in all):
- art-source/heroes-20/sprites/seaReaver/front/  the plain hero from the front
- art-source/heroes-20/sprites/seaReaver/back/   the plain hero from the back
- art-source/heroes-20/sprites/seaReaver/awakened-front/  the awakened form from the front
- art-source/heroes-20/sprites/seaReaver/awakened-back/   the awakened form from the back
Each folder holds 28 files named <row>-<n>.png:
- idle-1 .. idle-4: standing ready, a gentle breathing loop (idle-4 flows back into idle-1).
- walk-1 .. walk-8: one full walk cycle to the right in place (the figure does not travel across the canvas), legs clearly
  alternating, the body bobbing; walk-8 flows back into walk-1. This hero flies: in the walk frames it may hover a little above the ground line with wing beats, but the lowest point stays within 40 px of it, and idle-1 stands on it.
- attack-1 .. attack-4: the basic attack: an anchor swing: swing the anchor round and forward to the right.
- hurt-1 .. hurt-4: struck: recoil backwards (to the left), wince, recover towards the idle pose.
- dead-1 .. dead-4: dying: stagger, collapse, fall backwards (to the left), and in dead-4 lie flat on the back on the ground line,
  head to the left, completely still.
- attack2-1 .. attack2-4: the skill cast: an anchor slam: heave the anchor overhead and slam it down in front.
The back folders hold the same 28 moments as the front ones, seen from behind. The awakened folders hold the same 28 moments again,
for the awakened form.

The hero:
- Look: a big Hawaiian man with long black hair in a topknot and Polynesian tattoos on his arms and chest; a sailcloth wrap and a barnacled leather harness; a huge barnacle-crusted ship's anchor on a chain.
- Back view: the tattooed broad back and the harness straps, the topknot, the anchor chain over his shoulder.
- Awakened form: the same hero, upgraded: the tattoos glowing sea-green, the anchor trailing water. Keep the pose, scale and colours; only the gear grows grander.

For the character, use the canon below. For the family look of the new heroes, see the two finished Vampire paintings on that branch: src/art/heroes/vampireLord.webp and src/art/heroes/hemomancer.webp (git show origin/feat/twenty-heroes-vampire:<path> > ref.webp). If art-source/heroes-20/seaReaver-cutout.png is on main, match it as well.
```
