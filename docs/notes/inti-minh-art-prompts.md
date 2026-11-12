# Inti and Minh: battle sprite art prompts

The owner: "Inti and Minh don't really fit the art style of the rest." It is their **battle sprites** only; their
portraits are fine and stay. What is wrong, with pictures, is in [inti-minh-art.md](inti-minh-art.md).

**One ChatGPT task makes both.** One prompt, one branch (`art/inti-minh`), one pull request ("Inti and Minh battle
sprites"), two files. If one task proves too much, run the same prompt twice, adding "Do Inti only" to the first run and
"Do Minh only" to the second; both use the same branch and pull request.

| # | File (replaces the one there) | Size | Background | What it is |
| --- | --- | --- | --- | --- |
| 1 | `art-source/hero-remakes/ranger.png` | 2048 x 1792 | transparent | Inti, the Ranger: 8 columns x 7 rows, 56 poses, front and back |
| 2 | `art-source/hero-remakes/peasant.png` | 2048 x 1792 | transparent | Minh, the Peasant: the same layout |

The two files sit where the remakes' packer already reads them, so when the pull request is merged one command packs
both, front and back, and the Carter (who borrows Minh's sheet) follows:

```sh
python3 tools/inti-minh-art/pack.py
```

**If you use an ordinary chat instead of a task** (no access to the repository), attach these six files to the chat as
the style references and the two portraits as the characters, then paste the prompt and save the two pictures under the
names above:

- Style: `src/art/units/hero_res_samurai.png`, `hero_res_samurai_back.png`, `hero_res_gunslinger.png`,
  `hero_res_gunslinger_back.png`, `hero_res_barbarian.png`, `hero_res_barbarian_back.png`
- Characters: `src/art/heroes/ranger-portrait.webp` (Inti), `src/art/heroes/peasant-portrait.webp` (Minh)

## The prompt (both heroes)

```text
You are drawing pixel-art battle sprites for Legends of the Last Keep, a fantasy auto-battler played as an upright phone
web app (repository hpatter9/legends-of-the-fall). Heroes fight on a tilted tile board and are seen small, about 45 to 60
pixels tall on a phone, so every hero must read at a glance. Two heroes, Inti the Ranger and Minh the Peasant, look weaker
than the rest of the cast and are being redrawn. You will draw one animation sheet for each.

Rules for this task:
- Branch: art/inti-minh. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Replace exactly these two files and change no other file:
    art-source/hero-remakes/ranger.png    2048 x 1792, RGBA PNG, fully transparent background
    art-source/hero-remakes/peasant.png   2048 x 1792, RGBA PNG, fully transparent background
- Open one pull request into main titled "Inti and Minh battle sprites". In its body say, for each file, what is in it.
- Do not run any packer and do not touch src/. Never write a model's name in any file.

STYLE: match these sheets exactly. Open them first and keep them beside you.
    src/art/units/hero_res_samurai.png and hero_res_samurai_back.png        (Kenji, the Samurai)
    src/art/units/hero_res_gunslinger.png and hero_res_gunslinger_back.png  (Maeve, the Gunslinger)
    src/art/units/hero_res_barbarian.png and hero_res_barbarian_back.png    (Eirik, the Barbarian)
What makes that style, and what the two old sheets (the files you are replacing) lack:
- Heroic tactical-RPG proportions: a large head, about a quarter of the figure's height (roughly four heads tall), big
  hands and feet, a sturdy body. NOT a slim, realistic, small-headed figure.
- A wide, low battle stance even when idle: knees bent, feet apart, weapon held ready and out from the body. The idle
  figure is about as wide as it is tall, counting weapon and cloth. NOT standing upright with arms at the sides.
- A bold silhouette built from big shapes: a large weapon, cloth that flies out behind (cloak, scarf, sash, banner).
- A strong, near-black outline one to two pixels thick round the whole figure and round each big shape inside it.
- Deep shading: four or five steps on every surface, from a bright highlight down to a very dark shadow, hard-edged
  pixel clusters, no soft airbrush and no flat fills.
- Rich, saturated accent colours (the Samurai's crimson and gold on navy; the Gunslinger's red hair and oxblood coat)
  set against darker cloth, so parts separate clearly. No muddy mid-browns blurring into each other.
- Crisp pixel art at one pixel size throughout; a clear face with eyes that read.

CHARACTERS: keep who they are. The portraits are right and must be matched: src/art/heroes/ranger-portrait.webp and
src/art/heroes/peasant-portrait.webp.

1. INTI, the Ranger, "Warden of the Snares" (art-source/hero-remakes/ranger.png). A Quechua woman of the Peruvian
   Andes, brown skin, a long dark-brown braid over one shoulder that swings as she moves. A deep emerald woodland cloak
   with a broad woven Andean border in crimson, cream and gold (stepped diamond patterns), flying out behind her. A
   dark leather cuirass and bracers with brass studs, a crimson woven sash with tassels, cream trousers, tall dark
   boots. A big recurved wooden bow, nearly her own height, with a bright string; a full quiver of white-fletched
   arrows on her back; a coil of snare rope and a steel jaw-trap hanging at her belt. Make the emerald, the crimson
   and the cream each large and clearly separate; the old sheet's greens and browns ran together.
   Attack: draw the big bow, loose an arrow to the right, follow through, recover.
   Ability: drop to one knee and set a snare on the ground, rise.

2. MINH, the Peasant, "Banner of the Commons" (art-source/hero-remakes/peasant.png). A young Vietnamese village
   militiaman, warm tan skin, short straight black hair, a wide woven conical hat (non la) with a red chin cord. A
   mustard-yellow tunic with rolled cream sleeves and a dark indigo collar, a thick rope belt with a red cloth knot,
   loose dark indigo trousers, cream shin wraps, rope sandals. His weapon is a BANNER-SPEAR: a stout wooden spear with
   a broad leaf-shaped steel head and, tied below it, a long crimson war pennon with a gold edge that streams out
   behind and is the biggest shape on him. He is humble, not armoured, but he must look as bold and finished as the
   Samurai: a wide braced stance, the pennon flying, strong outline, deep folds in the tunic and trousers.
   Attack: a two-handed spear thrust to the right (never a sword swing), follow through, recover.
   Ability: plant the spear's butt, raise the banner high and call the rally with the free hand.

LAYOUT of each file: a strict grid of EIGHT COLUMNS by SEVEN ROWS, 56 separate full-body poses, each cell 256 x 256.
No text, no borders, no grid lines, no ground shadows, no effects (no arrows in flight, no sparkles, no dust).
- Columns 1 to 4: the FRONT view, three-quarter, facing RIGHT. Columns 5 to 8: the BACK view of the same pose,
  three-quarter from behind, facing AWAY and to the RIGHT (we see the back of the head, the quiver or hat, the cloak or
  the pennon). Each group of four columns is a four-frame sequence, left to right.
- Row 1: idle, breathing (four frames).
- Row 2: walk, first half: left foot contact, weight down, right leg passing, right leg lifted.
- Row 3: walk, second half: right foot contact, weight down, left leg passing, left leg lifted. Rows 2 and 3 together
  are one real eight-frame stride; all eight frames must differ.
- Row 4: attack: wind-up, strike, follow-through, recover.
- Row 5: hurt: recoil, strong recoil, settle, recover.
- Row 6: death: stagger, fall, land, and LAST the whole body LYING FLAT on its side (wider than it is tall).
- Row 7: ability: prepare, do it, hold, recover.
Rules the packer depends on:
- Every figure is whole inside its own cell with at least 12 pixels of empty space on every side; no figure, weapon or
  cloth touches or crosses into a neighbouring cell or row. Angle the spear or bow to fit rather than crop it.
- One figure per cell, all in one piece: no loose parts floating away from the body.
- The same character, face, costume, weapon and SIZE in all 56 poses; feet on the same ground line along each row.
- The standing figure is about 200 pixels tall in its cell. In the FIRST idle frame (row 1, column 1, and row 1,
  column 5) the top of the head or hat is the highest point: hold the bow or the banner-spear slanted so its tip does
  not rise above the head in that one frame. (The game sizes the hero from that frame's height; a tip above the head
  makes the whole hero smaller on screen.)
- Hard pixel edges against the transparent background: no glow, no soft halo, no coloured backdrop.

Before you finish, compare your two sheets side by side with the Samurai's and the Gunslinger's: the head size, the
width of the stance, the darkness of the outline and the depth of the shading should match. If Inti or Minh still looks
slimmer, flatter or plainer than they do, redraw.
```

## When the art lands

1. Merge the pull request into the working branch.
2. `python3 tools/inti-minh-art/pack.py` (needs Pillow, NumPy and SciPy). It checks each source and says what is wrong
   in plain words (an opaque background, a missing or merged figure, figures too small), then packs, bundles, validates
   and redraws the contact sheets.
3. Look at `docs/samples/inti-minh-art/front.png` and `back.png` (Inti and Minh among the whole cast) and at
   `docs/samples/hero-remakes/ranger-0.png`, `ranger-1.png`, `peasant-0.png`, `peasant-1.png` (every packed frame).
4. `npm run typecheck`, `npm test -- heritage-looks resonance-facing hero-art hero-kits-looks quest-battle`,
   `npm run web`, and look at a fight with both heroes at 393x852, 360x780 and 412x915.
