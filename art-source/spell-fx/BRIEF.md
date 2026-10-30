# Spell and movement effects: the brief and prompts for painted art (RPG-SPELLS)

The owner: "Prioritise using the ChatGPT effects visuals." This brief tells ChatGPT exactly what to paint for every hero move in
the RPG-spells design ([rpg-spells-design.md](rpg-spells-design.md)): **131 sheets in seven sessions**. The importer then brings the
sheets in with no code change, as the ailments' painted art came in (STATUS-FX, [status-fx-art-brief.md](status-fx-art-brief.md),
`tools/status-fx/import-status-art.py`).

Sessions **A to E** (62 sheets) are painted first: the movement toolkit every hero shares, the auras and walls, the healers' revives,
and the signature spells and moves. Sessions **F and G** (69 sheets) give every other move its own strips, so that in the end every
move in the game is painted. Each session is one ChatGPT conversation (or several, since each sheet's prompt stands alone), and one
commit.

## How the paintings come in

1. **ChatGPT paints** each sheet below and saves it as `art-source/spell-fx/<session folder>/<key>.png` (the folders are
   `a-toolkit`, `b-auras`, `c-healers`, `d-casters`, `e-moves`, `f-martial`, `g-spells`).
2. **It opens a pull request** from the branch **`art/spell-fx`** into `main`. The PR is titled "Spell effects art: session <letter>",
   with one commit a session. It touches only `art-source/spell-fx/` and adds one line to `CREDITS.md`, under the painted effects:
   "Spell and movement effects (`src/art/fx/spells/`): original painted effects made with OpenAI image generation for this game."
   A later session adds its commit to the same branch, or opens a new PR from `art/spell-fx` once the last one is merged.
3. **The importer** (built in the design's batch 1) is run on the PR's sheets:
   `python3 tools/spell-fx/import-spell-art.py art-source/spell-fx [cell=96]`. It does these things:
   - It reads the manifest `tools/spell-fx/spell-parts.json`, which lists every key, its session, and its rows in order. Each row has
     its part name, kind (`once` or `loop`) and the frames allowed.
   - It checks every sheet that is there:
     - the height must split into the listed number of rows of square cells;
     - each row's frame count (up to the first empty cell) must be within its range;
     - the four corner pixels of every used cell must be transparent (alpha under 8);
     - a row must not be empty.
     It names the sheet and the row for each fault. A missing sheet is reported, and its placeholder strips are kept.
   - It scales the cells to `cell` px (Lanczos) and packs **one atlas a session**: `src/art/fx/spells/<session>.webp`, quality 85,
     with `<session>.json` holding `{"cell": 96, "parts": {"<key>.<part>": [column, row, frames]}}`. Rows are 16 cells wide, and no
     strip is split across rows.
   - It prints each atlas's size and the total. It **stops if the total is over 5 MB**; run it again with `cell=80`.
   - With `--check`, it only checks the sheets and writes nothing.
   - The painted sources are never changed.
4. **Placeholders until then:** `python3 tools/spell-fx/spell-sheets.py` builds the same seven atlases, under the same keys, from the
   pack strips (`tools/spell-fx/spell-pack.json`), so the game can be built and tested before any painting arrives.
5. **Checks after an import:**
   - `npm test -- spell-fx` (every key has frames, in the manifest's order);
   - `npm run web && node tools/spell-fx/shots.mjs` (real fights with every move, at 393x852, 360x780 and 412x915, with reduced motion
     and battery saver, saved as `docs/samples/spell-fx-*.png`).

   The atlases load by URL, so `build.mjs` lists them in the service worker's `FILES` (offline play).

## The format (every sheet)

- **One PNG a key**, named `<key>.png`, in its session's folder.
- **A grid of square cells, 256 x 256 px each**, on a **fully transparent background**: no ground plane, no backdrop, no drop shadow,
  no text, no characters, no frame borders.
- **One row a part**, in the order listed for that key. The part's frames run left to right; the first empty cell ends the row, and rows
  may differ in length.
- **The parts and their frames:**

| Part | Frames | Plays | How to paint it |
| --- | --- | --- | --- |
| `cast` | 6 to 8 | once | On the caster as it casts: a gathering, a flash. Centred; anything that grows from the feet stands on the cell's bottom edge. |
| `travel` | 4 to 6 | loop | A projectile in flight, **pointing to the right**, centred; the game turns it along its path. The tail runs off to the left. |
| `beam` | 4 to 6 | loop | One segment of a beam, chain or tether, **horizontal, seamless at the left and right edges** (the game tiles it along a line), centred vertically, about a third of the cell tall. |
| `impact` | 6 to 8 | once | Where it lands or strikes: from the first flash to nothing. The last frame is almost empty (faint wisps), never a hard cut. |
| `ground` | 6 | loop | On the ground, already **flattened 2:1** (as the board's tiles are seen), centred. A seamless loop. |
| `rise` | 6 | once | A wall tile coming up out of the ground, standing on the cell's bottom edge. |
| `stand` | 6 | loop | The wall tile standing, a gentle seamless loop (a flicker, a sway, a glint), on the bottom edge. |
| `break` | 6 | once | The wall tile going: crumbling, shattering or fading, down to nothing. |
| `motes` | 6 | loop | One small piece (a spirit, a note, a feather, an ember), centred; the game scatters or circles copies of it. |
| `trail` | 6 | once | What is left along a dash or a flight (a streak, dust, after-images), horizontal, pointing right, fading. |

- **Angle:** the board's 3/4 isometric view, looking down at about 30 degrees, the same as the tiles and the fighters.
- **Size:** each row gives a *size* in **tiles across**: one board tile is the width of one fighter's footing, and a fighter stands about
  1.2 tiles tall. A wall tile is 1 tile wide and about 1.4 tiles tall. Paint the effect to fill its cell inside an **8% clear margin**;
  the game scales the cell to the size given.
- **The fighters** are small pixel-art sprites, about 40 to 60 px tall on the phone, on a sunny painted board. Effects must read at that
  size: bold shapes, strong colour, a bright core, soft dark edges for contrast, nothing fussy.
- **Blending:** drawn over the scene with normal blending. Only parts marked *light* (lightning, holy light, magic darts) may be bright
  cores meant to glow.
- **No flashing:** a loop never fades to nothing and back (the owner's rule: nothing may blink off). Only `once` parts end empty.

## The palettes

| Family | Main | Highlights |
| --- | --- | --- |
| Holy | warm gold `#ffd36a` | white-gold `#fff6d0`, soft amber `#e0a030` |
| Life (healing) | spring green `#7be08a` | pale mint `#d8ffd8`, gold `#ffe08a` |
| Arcane | violet `#9a6aff` | pale lilac `#e0d0ff`, deep indigo `#2a1a6a` |
| Eldritch / shadow | black-violet `#3a1050` | sickly violet `#b060ff`, green-black `#1a2a10` |
| Fire | flame orange `#ff8a2a` | yellow-white `#fff0a0`, ember red `#d03a10` |
| Frost / ice | ice blue `#7fd4ff` | white frost `#e8f8ff`, deep blue `#2a6aa8` |
| Lightning | electric blue `#77cfff` | yellow-white `#fff27a` |
| Nature | leaf green `#5aa83a` | bark brown `#6a4a2a`, blossom `#ffb0c8` |
| Earth / stone | warm grey `#9a8a78` | sand `#d8c49a`, dark rock `#4a3e34` |
| Wind | pale teal `#b8f0e8` | white `#ffffff`, sky blue `#9ad0ff` |
| Water | sea blue `#3a8ad8` | foam `#e8f8ff`, deep teal `#1a4a6a` |
| Blood | blood red `#e0403a` | crimson `#7a0e14`, highlight `#ff9a9a` |
| Rot / plague | bile green `#8aa83a` | grey-green `#5a6a40`, bruise violet `#6a4a7a` |
| Steel / martial | steel white `#e8eef8` | cold blue `#9ab0d0`, gold `#ffd36a` |
| Tech | cyan `#4ae0ff` | white `#f0ffff`, warning orange `#ff9a3a` |

## The shared opening (paste first in every prompt)

> Cinematic hand-painted fantasy game visual effect, in the painted style of a high-end mobile RPG's spell effects: soft painterly
> brushwork, glowing cores, crisp readable silhouettes, luminous colour, bold shapes that read at a small size. A sprite sheet on a
> fully transparent background: a grid of square 256x256 cells, one row per part, the frames of each part running left to right.
> Seen from a 3/4 isometric angle (camera about 30 degrees above the ground), matching small pixel-art fighters on a sunny painted
> board; anything on the ground is painted as a flattened 2:1 ellipse. Each frame centred in its cell with an 8% clear margin. No
> characters, no ground, no background, no text, no frame borders. A loop's last frame flows into its first and never fades out; a
> "once" row runs from its first flash to nearly nothing.

If a tool cannot keep a grid, ask for each row on its own (with its line below) and put the sheet together afterwards, keeping the
rows in order.

## The sheets

Each line: **key** (palette): rows in order, as *part (frames, size in tiles)*: what to paint.

### Session A: the movement toolkit (`a-toolkit`, 15 sheets)

> *Session A prompt:* [shared opening] These are the movement effects every hero shares: dashes, teleports, pulls, shoves, throws,
> digging and walls. Paint each sheet below in turn, one sheet per image.

- **dash** (steel/martial): 1) `trail` (6, 3): speed streaks and a long smear of motion, pointing right, fading from the right; 2)
  `impact` (6, 1.2): a puff of kicked-up dust and grit where a charger stops.
- **blink** (arcane): 1) `cast` (6, 1.2): a figure-shaped swirl of violet light collapsing inward to a point (vanishing); 2) `impact`
  (6, 1.2): a point of light bursting out into a figure-shaped swirl (appearing). *Light.*
- **teleport-slash** (steel/martial): 1) `trail` (6, 3): a razor-thin bright slash streak with dark after-images, pointing right; 2)
  `impact` (6, 1.2): a crossed slash with sparks on the struck foe. *Light.*
- **pull** (shadow, neutral grey-violet so the game can tint it per hero: iron, hellfire, water, sand): 1) `beam` (4, 1 tall 0.35): a
  taut tether of twisting energy, seamless left and right; 2) `impact` (6, 1): a grip of energy clamping shut (the yank).
- **shove** (wind): 1) `impact` (6, 1.6): a crescent shockwave of air bursting to the right, with dust; 2) `trail` (6, 2): skid lines and
  dust along the ground, pointing right.
- **launch** (earth): 1) `cast` (6, 1.4): a burst of dust and rock exploding upward from the ground (the throw); 2) `motes` (6, 0.5): a
  small spinning chunk of rock and dust (follows the flight); 3) `impact` (8, 1.6): a ground slam ring with dust and cracks, on the
  bottom edge (the landing).
- **slam** (steel/martial): 1) `impact` (6, 1.2): a jagged white impact star with radiating cracks and flying chips (hitting a wall or a
  body).
- **burrow** (earth): 1) `cast` (6, 1.4): earth churning and opening in a crater, dirt spraying, on the bottom edge (digging down); 2)
  `ground` (6, 1): a moving mound of cracked earth (the tunnel under the ground); 3) `impact` (8, 1.8): an eruption: a geyser of earth,
  rock and dust bursting upward from the bottom edge.
- **swap** (arcane): 1) `cast` (6, 1.3): a spiralling twist of two ribbons of light, violet and gold, round a figure-sized space; 2)
  `beam` (4, 1 tall 0.3): a ribbon of light linking two places, seamless.
- **wall-stone** (earth): 1) `rise` (6, 1): a rough stone pillar heaving up out of the ground; 2) `stand` (6, 1): the pillar standing,
  a little grit falling; 3) `break` (6, 1): the pillar crumbling into rubble and dust.
- **wall-ice** (frost): 1) `rise` (6, 1): a clear faceted ice wall shooting up; 2) `stand` (6, 1): it standing, a glint travelling across,
  a breath of cold mist; 3) `break` (6, 1): it shattering into flying shards. *Light at the glints.*
- **wall-thorns** (nature): 1) `rise` (6, 1): a tangle of thorny brambles and sharpened stakes bursting up; 2) `stand` (6, 1): the
  hedge swaying slightly, thorns glinting; 3) `break` (6, 1): it withering and sinking.
- **wall-light** (holy): 1) `rise` (6, 1): a curtain of golden light rising, with a rune at its base; 2) `stand` (6, 1): it shimmering,
  motes rising through it; 3) `break` (6, 1): it fading upward into motes. *Light.*
- **wall-fire** (fire): 1) `rise` (6, 1): a line of flame roaring up from the ground; 2) `stand` (6, 1): the flames licking, embers
  rising; 3) `break` (6, 1): the flames dying to smoke and embers.
- **wall-wind** (wind): 1) `stand` (6, 1): a standing curtain of swirling wind with leaves caught in it; 2) `impact` (6, 1): a gust
  flicking something back (an arrow deflected).

### Session B: auras and fields (`b-auras`, 10 sheets)

> *Session B prompt:* [shared opening] These are lasting areas: a ring or field on the ground round a hero, with small pieces
> rising or circling. The ground part is a seamless loop the game keeps playing for as long as the aura lasts.

- **aura-protection** (holy): 1) `ground` (6, 5): a ring of golden shield-runes turning slowly, a soft dome edge; 2) `motes` (6, 0.4): a
  small golden shield-glint rising.
- **spirit-guardians** (holy with pale blue): 1) `ground` (6, 5): a faint radiant ring; 2) `motes` (6, 0.6): a small winged guardian
  spirit, translucent, gliding (the game circles copies of it round the caster).
- **aura-rot** (rot): 1) `ground` (6, 5): a creeping stain of sickly green rot with bubbling patches; 2) `motes` (6, 0.5): a puff of foul
  green spores drifting.
- **storm-cloud** (lightning): 1) `ground` (6, 2.5): a dark storm cloud seen from slightly above, roiling, lit from within (it hangs over
  the caster); 2) `impact` (6, 1.2): a lightning bolt striking down from the top edge to the bottom edge. *Light.*
- **mana-font** (arcane): 1) `ground` (6, 7): a glowing arcane circle of runes; 2) `motes` (6, 0.5): a rising orb of mana, violet-blue.
- **healing-mist** (life): 1) `ground` (6, 5): a soft green-white mist pooling and swirling; 2) `motes` (6, 0.4): a tiny leaf of light
  rising.
- **cloud-of-daggers** (shadow/steel): 1) `ground` (6, 3): a whirling cloud of black feather-blades seen from above, with the glint of
  edges; 2) `motes` (6, 0.4): a single spinning black feather-blade.
- **slow-field** (arcane with gold): 1) `ground` (6, 8): a great clock-face of light on the ground, its hands turning slowly; 2) `motes`
  (6, 0.4): a small floating hourglass of sand.
- **spike-growth** (nature): 1) `ground` (6, 3): a 3x3 patch of ground bristling with thorns and caltrops; 2) `impact` (6, 1): thorns
  jabbing up from the ground.
- **bardic-notes** (holy for the Anthem, shadow-violet for the Dirge: paint it in gold, the game tints it): 1) `ground` (6, 7): a ring
  of flowing musical staff lines; 2) `motes` (6, 0.4): a single musical note.

### Session C: healers and revives (`c-healers`, 10 sheets)

> *Session C prompt:* [shared opening] These are the healers' spells, and the four revives that raise a fallen hero. They should feel
> warm, holy and hopeful. Each revive has its own look.

- **revivify** (holy): 1) `cast` (8, 1.6): a golden ankh of light appearing over the ground; 2) `impact` (8, 1.6): a pillar of golden light
  rising from the bottom edge through the ankh. *Light.*
- **resurrection** (holy, white): 1) `cast` (8, 1.8): two great wings of white light opening; 2) `impact` (8, 1.8): the wings folding round
  a figure-sized space and lifting, feathers of light scattering. *Light.*
- **elixir** (life with gold): 1) `cast` (6, 1): a glowing glass vial tipping; 2) `impact` (8, 1.4): a spiral of green-gold liquid light
  pouring down and blooming from the bottom edge.
- **reincarnate** (nature): 1) `cast` (6, 1.6): a ring of leaves and roots rising from the bottom edge; 2) `impact` (8, 1.4): a sapling of
  light growing and bursting into blossom petals.
- **mass-resurrection** (holy): 1) `ground` (6, 8): a great golden sunburst of runes on the ground; 2) `impact` (8, 1.6): a column of
  light with rising feathers (one for each hero raised). *Light.*
- **guiding-bolt** (holy): 1) `travel` (4, 1): a bolt of radiant golden light with a comet tail, pointing right; 2) `impact` (6, 1.2): a
  burst of radiance with rays. *Light.*
- **prayer** (life with holy): 1) `ground` (6, 6): a ripple of soft light spreading outward; 2) `motes` (6, 0.4): a small rising mote of
  healing light, a tiny cross or star.
- **cure-wounds** (life): 1) `impact` (8, 1.4): a warm green-gold glow wrapping a figure-sized space, rising sparkles.
- **death-ward** (holy, pale blue): 1) `stand` (6, 1.3): a pale protective shell of light shaped like a bubble with a small ankh rune at its
  front (it stays on the warded friend); 2) `impact` (8, 1.4): the shell flashing and cracking as it saves the friend.
- **healing-draught** (life): 1) `travel` (4, 0.6): a small stoppered potion flask spinning, pointing right; 2) `impact` (6, 1.2): the flask
  bursting into a splash of green healing light.

### Session D: casters' spells (`d-casters`, 12 sheets)

> *Session D prompt:* [shared opening] These are the wizards', warlocks' and witches' signature spells: the classic fireball, magic
> missile, eldritch blast and their kin. Make each one unmistakable.

- **fireball** (fire): 1) `travel` (4, 0.8): a roaring bead of fire with a short flame tail, pointing right; 2) `impact` (8, 3): a big
  spherical fire explosion with a shock ring.
- **meteor-swarm** (fire with dark rock): 1) `travel` (4, 1.2): a flaming meteor of dark rock with a long fire trail, pointing right (it
  falls slanting); 2) `impact` (8, 3): a crater blast with flying molten rock.
- **magic-missile** (arcane): 1) `travel` (4, 0.6): a bright violet dart of force with a crackling trail, pointing right; 2) `impact`
  (6, 1.2): a crisp violet starburst. *Light.*
- **eldritch-blast** (eldritch): 1) `beam` (4, 1 tall 0.35): a crackling beam of violet-black force with tiny eldritch runes, seamless; 2)
  `impact` (6, 1.2): a hollow burst of dark force with a violet rim.
- **drain-life** (eldritch with red): 1) `beam` (4, 1 tall 0.3): a stream of red-violet life essence, seamless, flowing left; 2) `impact`
  (6, 1): a small red glow being drawn out.
- **circle-of-death** (eldritch): 1) `ground` (6, 5): a ring of necrotic black-green fire and skull runes; 2) `impact` (6, 1): a necrotic
  flare on a foe.
- **thunderwave** (lightning with wind): 1) `impact` (8, 4): a ring of thunder-force bursting outward along the ground, crackling
  white-blue.
- **time-stop** (arcane with gold): 1) `cast` (8, 3): a dome of frozen time closing, clock-hand shapes and cracks of light; 2) `stand` (6,
  1.2): a small frozen clock-sigil over a stopped foe.
- **polymorph** (arcane, pink-violet): 1) `impact` (8, 1.4): a puff of pink smoke and sparkles (the change); 2) `cast` (6, 1): a small round
  cartoon fox shape in the smoke, cute (shown while a foe is changed; a stand-in if no pack fox fits).
- **hunters-mark** (blood with gold): 1) `stand` (6, 0.6): a red crosshair rune with four arrow-points, hovering, turning slowly (over the
  marked foe).
- **bane-mark** (blood, dark): 1) `stand` (6, 0.6): a dark-red cracked crown rune, hovering (over the marked foe); 2) `impact` (6, 1):
  iron chains clamping.
- **mockery** (shadow-violet with gold): 1) `motes` (6, 0.5): a jagged speech-shape of mocking sound (a twisted note, sharp edges); 2)
  `impact` (6, 1): a sour burst on a foe.

### Session E: martial and monster moves (`e-moves`, 15 sheets)

> *Session E prompt:* [shared opening] These are the warriors' and monsters' signature moves: sword techniques, monk strikes,
> leaps, hooks, tentacles and blasts. They should hit hard.

- **issen** (steel, moonlight): 1) `trail` (8, 6): one enormous razor-thin horizontal cut of white light across the field, pointing right;
  2) `impact` (6, 1.4): a bright sliced flash with a crescent. *Light.*
- **sneak-attack** (shadow with blood): 1) `impact` (6, 1.2): a quick dark backstab slash with a spray of red.
- **flurry** (steel with gold): 1) `impact` (6, 1.2): three rapid fist-shaped impact bursts overlapping.
- **quivering-palm** (holy-white with blue): 1) `cast` (6, 1): light gathering into an open palm shape; 2) `impact` (8, 1.4): a resonant
  ripple bursting outward in rings.
- **berserker-leap** (blood with earth): 1) `impact` (8, 3): a crater slam with red rage-fire and flying rocks, on the bottom edge.
- **rage** (blood): 1) `stand` (6, 1.3): a red rage-aura of flame-like energy round a figure-sized space, rising from the bottom edge.
- **cleave** (fire-red with shadow): 1) `impact` (6, 2.5): a wide arcing sword cleave of dark-red hellfire.
- **riposte** (steel): 1) `impact` (6, 1): a parry spark: two blades crossing with a bright flash and a counter-cut. *Light.*
- **grappling-hook** (steel, rope brown): 1) `travel` (4, 0.6): a spinning iron hook, pointing right; 2) `beam` (4, 1 tall 0.2): a taut rope,
  seamless; 3) `impact` (6, 1): the hook biting.
- **dragon-dive** (fire with steel): 1) `cast` (6, 1.2): a figure-sized burst of flame and wind as she launches upward; 2) `impact` (8,
  3): a fiery ring blast on landing.
- **seismic-slam** (earth): 1) `impact` (8, 3.5): a ground-pound shockwave of cracking earth and rock shards, ring-shaped, on the bottom
  edge.
- **pounce** (blood with steel): 1) `impact` (6, 1.2): three raking claw marks with a spray.
- **tentacles** (water, deep teal): 1) `cast` (6, 1.2): a dark sea-green tentacle rising from a pool, curling; 2) `beam` (4, 1 tall 0.35):
  a stretched tentacle, suckers along it, seamless.
- **tidal-wave** (water): 1) `travel` (6, 3): a curling wave of sea water with foam, pointing right (it rolls along the lane); 2) `impact`
  (6, 2): a crashing burst of spray.
- **keg-blast** (fire with smoke): 1) `travel` (4, 0.6): a rolling powder keg with a lit fuse, pointing right; 2) `impact` (8, 3): a big
  black-powder explosion with fire, smoke and splinters.

### Session F: the other tanks', martial and ranged moves (`f-martial`, 30 sheets)

> *Session F prompt:* [shared opening] These are more of the warriors', rangers' and machines' moves. Each sheet has two rows: the
> move's lead (as it goes off) and its impact on a foe.

Each sheet: 1) the lead (`cast`, `travel` or `ground` as given, 6 frames); 2) `impact` (6 frames, 1.2 unless given).

- **aimed-shot** (steel): `travel` 0.8: a long glowing arrow with a spiral of wind; impact: a pinning burst.
- **blood-pact** (blood): `cast` 1.2: a red sigil carved in the air, drops of blood drawn into it; impact: a blood flare on a blade.
- **bombard** (fire, smoke): `travel` 0.8: a heavy smoking shell, pointing right; impact 3: a crater explosion.
- **call-to-arms** (steel/gold): `ground` 6: a ring of raised spears and shields; impact: a war-cry burst.
- **cannonade** (water-teal ghostly, fire): `travel` 0.6: a ghostly green cannonball; impact 2.5: a spectral blast with water.
- **cavalry-charge** (steel/gold): `cast` 2: a rush of spectral horses' heads and dust; impact: a trampling hoof-burst.
- **divine-smite** (holy): `cast` 1.2: a sword wreathed in golden light striking down; impact 1.6: a radiant hammer-flash. *Light.*
- **dragon-breath** (fire): `beam` (tall 0.5): a cone-like gout of dragon fire, seamless; impact: a burning flare.
- **entangle** (nature): `ground` 3: thick green vines erupting and coiling; impact: a vine snaring.
- **fan-the-hammer** (steel/fire): `cast` 1: three overlapping muzzle flashes; impact: a bullet spark.
- **fissure** (earth/fire): `ground` 6: a jagged glowing rift splitting the ground; impact 1.6: rock and dust bursting from a crack.
- **gore** (earth/blood): `cast` 1.2: a bull's horns of red force driving forward, pointing right; impact: a goring burst.
- **high-noon** (gold): `cast` 1.6: a blazing sun-glare behind a gunslinger's draw, a dust swirl; impact: a golden bullet strike. *Light.*
- **holy-nova** (holy): `ground` 8: a nova of golden light bursting outward; impact: a holy flare. *Light.*
- **iaido** (steel/moon): `trail` 4: a single silver cut along a line, pointing right; impact: a crescent slash.
- **lightning-storm** (lightning): `trail` 3: a jagged bolt-shaped streak, pointing right; impact: a lightning strike flash. *Light.*
- **loaded-dice** (gold/shadow): `cast` 0.8: two ivory dice tumbling in a glow; impact: a lucky gold burst.
- **metamorphosis** (fire/shadow): `cast` 1.8: a demonic silhouette of hellfire wings flaring round a figure-sized space; impact: a
  hellfire flare.
- **orbital-strike** (tech/fire): `cast` 1.5: a targeting circle of cyan light locking on, on the ground; impact 3.5: a beam from the sky
  and a huge blast.
- **overclock** (tech): `cast` 1.3: a cyan power surge with steam jets and sparks; impact: a cyan muzzle burst.
- **phalanx** (steel/gold): `ground` 4: a ring of interlocked shield shapes; impact: a shield-ring flash.
- **piercing-shot** (steel/fire): `beam` (tall 0.25): a straight bullet trail of fire through the air, seamless; impact: a punch-through
  burst.
- **rapid-shot** (tech): `cast` 1: three quick cyan muzzle flashes; impact: a cyan spark.
- **siege-mode** (tech/steel): `ground` 2: anchor clamps and a cyan targeting ring on the ground; impact 1.5: the anchors slamming down.
- **smoke-bomb** (shadow, grey): `cast` 2: a burst of thick grey smoke; impact (as `ground` loop, 2): the smoke cloud lingering.
- **snare** (nature/steel): `ground` 1: a hidden trap, a ring of teeth and rope among leaves; impact: the snare snapping shut.
- **suppressing-fire** (tech/fire): `beam` (tall 0.5): a stream of tracer fire, seamless; impact: bullet sparks.
- **thunder-step** (lightning): `cast` 1.4: a thunderclap flash where he vanishes; impact 3: a lightning discharge ring. *Light.*
- **volley** (steel): `travel` 0.6: a falling cluster of arrows, pointing down-right; impact 3: arrows striking the ground.
- **whirlwind** (steel/blood): `ground` 3: a spinning ring of blade arcs; impact: a slash.

### Session G: the other spells and monster moves (`g-spells`, 39 sheets)

> *Session G prompt:* [shared opening] These are more of the spellcasters', healers', callers' and monsters' moves. Each sheet has
> two rows: the move's lead (as it goes off) and its impact on a foe or a friend.

Each sheet: 1) the lead (`cast`, `travel`, `beam` or `ground` as given, 6 frames); 2) `impact` (6 frames, 1.2 unless given).

- **alter-self** (fire, fox-fire orange): `cast` 1.3: a swirl of blue-orange fox-fire round a figure-sized space; impact: a fox-fire puff.
- **animate-dead** (shadow/green): `cast` 1.3: ghostly hands and green soul-fire rising from the ground; impact: a wraith's wail-burst.
- **arcane-surge** (arcane): `ground` 8: a vast arcane sigil flaring; impact: a shield of violet light snapping round a friend. *Light.*
- **bacchanal** (nature/gold): `ground` 7: a swirl of vines, grapes and petals; impact: a burst of petals.
- **battle-hymn** (holy/gold): `ground` 7: a ring of golden staff lines and notes bursting outward; impact: a note-burst.
- **chain-lightning** (lightning): `beam` (tall 0.35): a jagged forking bolt, seamless; impact: a crackling strike. *Light.*
- **charm** (arcane-pink): `travel` 0.5: a glowing pink heart, pointing right; impact: a heart burst.
- **conjure-treant** (nature): `cast` 1.6: roots and a ring of leaves bursting up; impact: a burst of bark and leaves.
- **devour** (rot/blood): `cast` 1.3: a dark maw-shape of rot closing; impact: a gory green-red burst.
- **dominate** (arcane-violet): `beam` (tall 0.2): puppet strings of violet light, seamless; impact: a violet mind-sigil over a head.
- **flesh-to-stone** (earth): `ground` 2: grey stone creeping across the ground; impact: a figure-sized crust of cracking stone.
- **full-moon** (moon silver/blood): `cast` 2: a great full moon with a howling silhouette and a silver ring; impact: a silver claw burst.
- **gaze** (earth/green): `beam` (tall 0.3): a green petrifying gaze-ray, seamless; impact: a stone crust flash.
- **gust** (wind): `cast` 2: a swirl of wind and leaves bursting outward; impact: a gust strike.
- **hall-of-mirrors** (arcane/white): `ground` 6: a ring of standing mirror shards catching light; impact: a mirror shattering. *Light.*
- **harvest** (shadow/moon): `ground` 5: a huge spectral scythe arc sweeping round; impact: a soul being torn free.
- **hold-person** (earth/shadow, sand): `ground` 2: linen wrappings lashing round from the ground; impact: wraps binding tight.
- **irresistible-dance** (nature/gold): `ground` 4: a swirl of musical motes and pan-pipe notes; impact: a dizzy sparkle.
- **judgement** (holy/steel): `cast` 1.6: a great sword of light falling from the top edge; impact 3: a radiant crater. *Light.*
- **maelstrom** (water): `ground` 6: a churning whirlpool; impact: a spray burst.
- **mirror-image** (arcane): `cast` 1.4: two shimmering after-image silhouettes splitting off; impact: a glassy shimmer.
- **panacea** (life/gold): `ground` 6: a sunrise ring of warm gold-green light; impact: a dawn glow round a friend. *Light.*
- **pharaoh** (sand/gold): `ground` 6: a sand-wind of hieroglyph runes spiralling inward; impact: a cursed scarab-sigil.
- **pilfer** (shadow/gold): `cast` 1: a black feather-swirl snatching; impact: gold coins and sparks flying out of a foe.
- **pipes** (nature): `ground` 4: a ring of flowing pan-pipe notes on the wind; impact: a quick green sparkle.
- **plague-tide** (rot): `ground` 6: a rolling wave of green rot fog; impact: a plague burst.
- **plant-standard** (fire/steel): `cast` 1.4: a war standard slamming into the ground with a gust; impact: a banner-flash ring.
- **rallying-cry** (gold/steel): `ground` 7: a golden shout-wave rushing outward; impact: a gold flare on a friend.
- **reap** (shadow/moon): `ground` 4: a scythe sweep of pale moonlight; impact: a soul-slash.
- **reign-of-terror** (blood/shadow): `ground` 7: a dark crown-shaped wave of dread spreading; impact: a fear flash.
- **rewind** (arcane/gold): `cast` 1.3: a backward-spinning clock of light; impact: a rewind ripple round a friend.
- **shapechange** (moon/blood): `cast` 1.4: a burst of fur, silver moonlight and shadow; impact: a feral flash.
- **stone-curse** (earth/green): `ground` 7: a wave of petrifying green-grey light; impact: stone cracking.
- **storm-surge** (lightning/violet): `cast` 1.4: gathered sparks discharging outward; impact: an overload burst. *Light.*
- **summon-beast** (nature/moon): `cast` 1.3: a circle of moonlit paw-print runes, a howl of light; impact: a burst as a wolf arrives.
- **swoop** (shadow/wind): `trail` 2: a dark feathered streak diving, pointing right; impact: a talon strike.
- **tempest** (wind/lightning): `ground` 7: a huge cyclone of wind and torn leaves; impact: a wind-blade strike.
- **war-banner** (fire/gold): `ground` 6: a ring of fluttering banner-shapes; impact: an orange flare of courage.
- **wild-shape** (nature): `cast` 1.6: bark and leaves wrapping round a figure-sized space; impact: a burst of leaves.

## The manifest the importer reads (`tools/spell-fx/spell-parts.json`)

Every key above, its session, and its rows as `[part, kind, min frames, max frames]`, in order. For example:

```json
{
  "a-toolkit": {
    "launch": [["cast", "once", 6, 8], ["motes", "loop", 4, 6], ["impact", "once", 6, 8]],
    "wall-ice": [["rise", "once", 6, 6], ["stand", "loop", 4, 8], ["break", "once", 6, 8]]
  },
  "c-healers": {
    "revivify": [["cast", "once", 6, 8], ["impact", "once", 6, 8]]
  }
}
```

The game reads a part as `<key>.<part>` (for example `launch.impact`) from that session's atlas. A part the game asks for that no sheet
gives falls back to its placeholder strip, so a session can land before the next one is painted.

## The count

| Session | Sheets | Rows | Frames (about) |
| --- | --- | --- | --- |
| A. The toolkit | 15 | 36 | 220 |
| B. Auras and fields | 10 | 20 | 120 |
| C. Healers and revives | 10 | 19 | 115 |
| D. Casters' spells | 12 | 22 | 135 |
| E. Martial and monster moves | 15 | 23 | 140 |
| F. More martial and ranged | 30 | 60 | 360 |
| G. More spells and monsters | 39 | 78 | 470 |
| **All** | **131** | **258** | **about 1,560** |

At 96 px WebP cells, that comes to about 4 to 5 MB in all, and less at 80 px. Painting order: A, then C (the revives), B, D and E, then
F and G.
