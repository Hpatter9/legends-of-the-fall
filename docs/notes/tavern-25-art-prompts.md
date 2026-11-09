# Tavern life: the 25 new heroes (art prompts)

The pixel tavern (`src/tavern.ts`, `src/tavernLifeDraw.ts`) gives every hero an activity sheet at
`art-source/tavern-life/heroes/<key>.png`, brought in by `python3 tools/tavern-life/bring.py`. The first 33 have landed. These prompts
cover the 20 heroes who joined later and the five Mythics. Every one of them already has a spot, an activity and a reason in
`src/render/tavernLife.ts` (`LIFE`) and `tavernSpots.ts` (`SPOTS`). All 25 spots are standing spots, so none of these sheets has a seat.

**It drops in with no code change.** `bring.py` takes any `heroes/<key>.png`. The tavern looks every name in `ALL_HEROES` up in
`src/art/tavern/life/` through an esbuild glob (`urlOf` in `tavernLifeDraw.ts`). A sheet that lands there replaces the placeholder.
The two new props (Carmilla's wine glass and Tenzin's river stone) are already wired by name: `prop-goblet` and `prop-pebble` in
`LIFE_PROPS`, and `PROPS` in `bring.py`. Until their paintings land, the tavern draws a few pixels of each in code.

**Note.** Since 0.392.0 the Heroes tab shows the painted tavern (`src/paintedTavern.ts`), and those paintings already exist for all 70
heroes (`src/art/tavern/guests/<key>-activity.webp`). These sheets are for the pixel tavern, which is still in the code. Twelve of the
first 45 (arcBlade, beastmaster, dragoon, gunslinger, illusionist, kunoichi, lancer, sage, satyr, timeWitch, wizard, wolfBard) have
no sheet in `art-source/tavern-life/heroes/` either. Their brief is `tavern-art-prompt.md`.

Two prompts. Send the first in one ChatGPT chat. The second (two props) is short and can go in the same chat afterwards, onto the same
branch and pull request.

## 1. The 25 activity sheets (one task)

```text
You are painting pixel art for the game "Legends of the Last Keep", in the GitHub repository hpatter9/legends-of-the-fall.
Original art for this game only: not based on any other game.

WHAT TO DO
1. Make a new branch art/tavern-25 from main.
2. Paint the 25 activity sheets below. Save each one at art-source/tavern-life/heroes/<key>.png, with <key> exactly as given.
3. Make one commit that changes only files in art-source/tavern-life/. Do not change game code, CREDITS.md or package.json.
4. Open one pull request into main titled "Tavern life: the new heroes". Do not merge it.
If one task cannot hold all 25, do the 20 heroes first (one commit), then the five Mythics (a second commit) on the same branch and
pull request.

WHERE THEY GO
The Heroes tab has a side-view pixel-art tavern with three rooms: the bar room, the hearth hall and the games room. Every hero the player
owns spends the evening at one fixed spot doing one fixed thing. These 25 all stand.

THE LOOK
- Copy each hero from their battle sheet's idle row (the top row). The path is given for each hero below. The hero must be
  instantly recognisable: the same design, colours, armour, hair, horns, wings, weapon and proportions. Just repaint them larger.
- Clean pixel art: clear pixel clusters, a 1 px dark outline, no blur, no soft brushwork, and no anti-aliased edges against the
  background.
- Tavern light: warm lamplight and firelight from above, with amber highlights and deep brown shadows. For the room's palette and scale,
  see the furniture in src/art/tavern/ (bar.png, table.png, stool.png). The sheets already painted in art-source/tavern-life/heroes/
  (for example knight.png, mercenary.png, mummy.png) show the exact style, scale and layout to match.
- A straight side view, the figure turned a little towards the viewer.
- Transparent background: no floor, no shadow under the feet (the game draws it), and no text.

THE SHEET RULES (every sheet)
- Square cells of exactly 256 x 256 px. Exactly two rows, so the sheet is 512 px tall. Each row has 4 to 8 frames, running left to
  right. The sheet is as wide as its longest row (4 to 8 cells, so 1024 to 2048 px). The first empty cell ends a shorter row.
- Row 1 is the LOOP: the steady activity, played round and round. It must loop smoothly back to its first frame.
- Row 2 is the BEAT: the occasional action that breaks the loop, played once every few seconds. It starts and ends close to row 1's
  first frame.
- The figure FACES RIGHT. The game mirrors it for heroes who face left.
- Size: a standing figure is 192 px from the top of the head to the soles of the feet. For a winged, horned or four-legged hero, the
  tallest point (wing tip, horn, ears) is at most 200 px. The feet stand on a line 16 px above the cell's bottom edge, centred across
  the cell. Use the same scale in every frame and both rows (no zooming), with the feet always on that line.
- Leave the four corner pixels of every cell fully transparent, and keep a few px of clear space at the cell edges.
- NO SEAT: these 25 all stand.
- Props held in the hands are painted in the sheet: the cup, glass, coin, stone, book, tool or weapon. The game adds anything that
  leaves the hand or floats free (steam, sparks, a coin or stone in mid-flip, the small magic light over a palm), so leave those out.
  The hand still makes the gesture.

THE 25 SHEETS, by activity. Under each activity heading: what row 1 and row 2 show, then each hero with what to paint, and the battle
sheet to copy them from.

LEANING, ARMS CROSSED (5)
Row 1: arms crossed, weight on one leg, watching the room. Row 2: a slow look round the room and back.
- vampireLord.png: Vladislav, Red Keep Voivode (Vampire Lord). In crimson velvet, lordly and still; he lets the room come to him.
  Look: src/art/units/hero_res_vampire_lord.png
- nightstalker.png: Sorin, Wing of the Crypt (Strigoi). Winged, leaning where the lamplight stops, wings folded, watching the door.
  Look: src/art/units/hero_res_nightstalker.png
- bloodGargoyle.png: Gavril, Sentinel of the Fane (Blood Gargoyle). A stone sentinel against the wall, as still as the masonry. Only
  the eyes and a slow breath move in row 1. Look: src/art/units/hero_res_blood_gargoyle.png
- banneret.png: Isolde, Voice of the Rampart (Banneret). Her standard is planted upright beside her (painted in, its pole in the same
  place in every frame); her arms are crossed. Look: src/art/units/hero_res_banneret.png
- inquisitor.png: Soraya, Scales of the Sun (Inquisitor). She weighs the room and says nothing yet. Look: src/art/units/hero_res_inquisitor.png

SHARPENING OR CLEANING A WEAPON (3)
Row 1: the weapon held low, a rag or whetstone drawn along it. Row 2: holds it up to the light and checks it.
- dhampir.png: Klara, Silver-Bolt Hunter (Dhampir). Cleans her crossbow with a rag; row 2 sights along it.
  Look: src/art/units/hero_res_dhampir.png
- falconer.png: Aisling, Wing of the Glen (Falconer). Oils her bowstring (or the jesses) with her falcon perched on her shoulder; the
  falcon shifts and blinks. Row 2 holds the bow up and plucks the string. Look: src/art/units/hero_res_falconer.png
- seaReaver.png: Nakoa, Breaker of Hulls (Sea Reaver). Polishes the flukes of his anchor with a rag; its foot rests on the floor line.
  Row 2 lifts it to look along the fluke. Look: src/art/units/hero_res_sea_reaver.png

DRINKING (2)
Row 1: holding the drink at the chest, breathing, a small sway. Row 2: raises it, a long sip or swig, lowers it with a contented sigh.
- hemomancer.png: Carmilla, Chalice Countess (Hemomancer). A stemmed silver wine glass of dark red wine, swirled gently in row 1, sipped
  in row 2. Look: src/art/units/hero_res_hemomancer.png
- corsairSurgeon.png: Tariq, Sawbones of the Reef (Corsair Surgeon). A squat dark rum bottle (the rum he swears is for the patients); row 2
  is a swig and a grin. Look: src/art/units/hero_res_corsair_surgeon.png

A HOT CUP (3)
Row 1: both hands round a cup held at the chest. Row 2: blows on it and takes a careful sip.
- bellWarden.png: Kavi, Keeper of the Toll (Bell Warden). A small cream earthenware cup of tea; calm and still.
  Look: src/art/units/hero_res_bell_warden.png
- mirageDancer.png: Zahara, Veil of the Dunes (Mirage Dancer). A small tall glass of mint tea (green leaves in it) between dances; row 1
  sways a little. Look: src/art/units/hero_res_mirage_dancer.png
- seraph.png: Gabriela, Wing of the Reliquary (Seraph). A plain clay cup of cool spring water, wings folded. Row 2 is a sip without the
  blow. Look: src/art/units/hero_res_seraph.png

FLIPPING A COIN (3)
Row 1: idle, the thing turned in the fingers. Row 2: flicks it up with the thumb and catches it (the hand moves; the game draws the flying
object, so the hand is empty between the flick and the catch).
- geomancer.png: Tenzin, Shaper of Crags (Geomancer). A smooth grey river stone instead of a coin. Look: src/art/units/hero_res_geomancer.png
- astrologer.png: Cyra, Keeper of the Astrolabe (Astrologer). A gold coin, flipped to read what the stars say.
  Look: src/art/units/hero_res_astrologer.png
- nyxara.png: Nyxara, Queen of the Unwritten (Fateweaver, a Mythic). A small silver token, the weaver watching the threads align.
  Look: src/art/units/mythic_nyxara.png

A LITTLE MAGIC (4)
Row 1: one palm (or paw, or claw) open and up, idly watched; the game draws a small light dancing over it, so paint the hand open and
empty. Row 2: closes the hand on the light and opens it again.
- astralSphinx.png: Nenet, Riddle of the Stars (Astral Sphinx). A star-lioness on four legs, one forepaw lifted and turned up.
  Look: src/art/units/hero_res_astral_sphinx.png
- ilyra.png: Ilyra, the Unburied Saint (Mythic). Serene, in gentle luminescence, one hand raised as if in blessing.
  Look: src/art/units/mythic_ilyra.png
- astrax.png: Astrax, the Last Star (Mythic dragon). On four legs, its chest glowing as on the sheet; one foreclaw lifted and turned up,
  head lowered to watch it. Keep the whole dragon inside the cell. Look: src/art/units/mythic_astrax.png
- vael.png: Vael, the Eclipse Sovereign (Mythic). Regal and still, one palm up (the game draws the little eclipse over it).
  Look: src/art/units/mythic_vael.png

TINKERING (3)
Row 1: fiddling with something held in both hands, a tool in one. Row 2: a spark or chip jumps (the game draws it); shakes the hand.
- plagueDoctor.png: Corvus, Censer of Ash (Plague Doctor). Beaked mask; tends the censer on its chain, opening its lid and poking the coals
  with a little rod. Look: src/art/units/hero_res_plague_doctor.png
- bombardier.png: Soren, Iron Alchemist (Bombardier). Fiddles with a round iron shell's fuse; row 2 yanks the hand back as it fizzes.
  Look: src/art/units/hero_res_bombardier.png
- orrun.png: Orrun, the Worldroot (Mythic guardian). Carves a small stone talisman with a knife. Look: src/art/units/mythic_orrun.png

CHEERING THE BARD (1)
Row 1: beats time on his thigh with one hand, nodding to the music. Row 2: a fist raised with a cheer.
- warDrummer.png: Raiden, Thunder of the Keep (War Drummer). Keep his drum on his back or at his side as on the sheet.
  Look: src/art/units/hero_res_war_drummer.png

EATING (1)
Row 1: chewing, food in hand. Row 2: tears off a big bite.
- harpooner.png: Siku, Whaler of the Floes (Harpooner). A strip of dried fish. Look: src/art/units/hero_res_harpooner.png

CHECK BEFORE YOU COMMIT
Write and run a small script (Python with Pillow) over art-source/tavern-life/heroes/ and fix anything it finds:
- exactly these 25 new files: vampireLord, nightstalker, bloodGargoyle, banneret, inquisitor, dhampir, falconer, seaReaver, hemomancer,
  corsairSurgeon, bellWarden, mirageDancer, seraph, geomancer, astrologer, nyxara, astralSphinx, ilyra, astrax, vael, plagueDoctor,
  bombardier, orrun, warDrummer, harpooner (each .png). Leave the 33 already there untouched.
- each is a PNG in RGBA mode with real transparency, 512 px tall, and a width that is a multiple of 256 between 1024 and 2048.
- in every cell of both rows, the four corner pixels have alpha 0.
- each row has 4 to 8 non-empty cells, filled from the left with no gap; an empty cell is fully transparent.
- in every frame, the lowest solid pixel of the feet sits on the row 16 px above the cell's bottom (y = 239 within the cell, give or
  take 2 px), and a standing figure's head is about 192 px above that.
- also run: python3 tools/tavern-life/bring.py --check   (it must list no fault for these files).
Then look at every sheet next to its battle sheet: is it the same character, facing right, at the same scale in every frame?
```

## 2. Two small props (same chat, same branch)

```text
Two more small pictures for "Legends of the Last Keep" (repository hpatter9/legends-of-the-fall), on the same branch art/tavern-25 and
in the same pull request "Tavern life: the new heroes". Original art for this game only.

Save them at:
- art-source/tavern-life/props/goblet.png: a stemmed silver wine glass, a dark red wine in the bowl, upright, seen from the side.
- art-source/tavern-life/props/pebble.png: one smooth grey river stone, a little flattened, with a lighter top and a darker underside.

Rules: each exactly 64 x 64 px, RGBA, transparent background, the object centred and filling most of the picture. Pixel art matching the
props already there (art-source/tavern-life/props/tankard.png, coin.png): the game shows them at 16 px, so use a bold simple shape, a 1 px
dark outline, two or three tones and warm tavern light. No text, no shadow.
Check before you commit: both 64 x 64, RGBA, the four corner pixels clear, and python3 tools/tavern-life/bring.py --check lists no
fault for them. Commit only files in art-source/tavern-life/.
```

## When it lands

The director runs `python3 tools/tavern-life/bring.py`, credits the art in `CREDITS.md`, and checks the tavern at 393x852, 360x780 and
412x915.
