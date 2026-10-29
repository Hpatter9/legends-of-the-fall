# Awakened auras: brief for painted art (AWAKEN-002)

This brief has now been used for the owner's approved generated replacement. See
[painted ascension auras](painted-ascension-auras.md) for the current atlas, sources and review evidence.
The original format and planning notes follow.

The awakened auras ship with strips of the **5000 Pixel Effects** pack. The owner may later want them repainted in the
style of the FX-003 painted combat effects (`docs/notes/individual-ability-effects.md`, `src/art/fx/abilities/`). This
brief says exactly what to paint so that the painted atlas can replace the pack strips **with no code change**.

## How the swap works

- `src/render/auraStyles.ts` names every part of every aura (`<class>.<step>.<part>`, for example `caster.2.orbit`) and
  says where it sits, how big it is, how many copies are drawn and how it moves. It holds no art.
- A part's frames come only from the aura atlas: `src/art/fx/aura/atlas.png` and `atlas.json`
  (`{"cell": <px>, "parts": {"<key>": [column, row, frames]}}`), read by `src/render/auraArt.ts`.
- `tools/awaken/import-aura-art.py <folder> [cell]` builds that atlas from painted sheets (one PNG a class, below). It
  follows the pattern of `tools/fxlab/import-ability-art.py` (the FX-003 importer): the painted sources stay
  untouched; the shipped atlas is scaled down for the phone.
- The game reads the cell size from `atlas.json`. Cells of 32px or less are drawn sharp, as pixel art. Larger cells,
  as painted art will be, are sampled smoothly. Sizes on screen do not change, because a part's size is a share of
  the hero's height, whatever the cell's size.
- Check the swap with `npm test -- awaken-auras` (every key has frames), then `node tools/awaken/aura-places.mjs`
  (every place an aura shows, at the three phone sizes).

## Format

- **One sheet a class**, named after the class trait: `guardian.png`, `bulwark.png`, `blade.png`, `marksman.png`,
  `gunner.png`, `caster.png`, `arcanist.png`, `support.png`, `beast.png`, `assassin.png`, `trickster.png`,
  `warden.png`, `vanguard.png`.
- **A grid of square cells, 256x256 px each**, on a **fully transparent background**: no ground plane, no backdrop, no
  drop shadow, no text, no characters.
- **One row a part**, in the order listed below (the class's step 1 parts, then its step 2 parts). The part's frames
  run left to right along its row. The first empty cell ends the row, and rows may differ in length.
- **Frames: 6 a part** (4 to 8 allowed), forming a **seamless loop** (the last frame flows into the first). A still
  piece that only moves round the hero (marked *1 frame ok*) may be a single frame.
- **Angle:** the board's 3/4 isometric view, looking down at about 30 degrees, the same as the tiles. Paint
  **ground** parts as ellipses already flattened about 2:1, as the tiles show them, unless the part says *face-on*:
  those are painted as a full circle seen straight on, and the game flattens them itself.
- **Where the hero stands in a cell:**
  - **Ground** parts are centred in the cell. The hero's feet are at the ellipse's centre.
  - **Rise** parts and **low motes** stand on the cell's bottom edge, centred. Paint them rising from the bottom.
  - **Back**, **halo**, **orbit**, **motes** and **trail** parts are centred in the cell.
  - Leave about 8% clear at every edge so nothing is cut off.
- **Size:** a cell's width is the part's *size* times the hero's height (for example, size 1.2 is a little wider than
  the hero is tall). Paint the shape to fill its cell, inside the margin.
- **Blending:** parts marked *glow* are drawn as added light: paint them bright on transparency, with soft edges and no
  dark outline. Other parts are painted over the scene and may carry soft dark edges for contrast.
- **Copies:** a part drawn ×2 or more uses the same frames for every copy, each copy on its own beat. One row is enough.
- **Shipping:** run `python3 tools/awaken/import-aura-art.py <folder> 96`. 96px cells keep the atlas within about
  1536x1920 at six frames a part (80 parts), which every phone can hold. Credit the art in `CREDITS.md` the way FX-003's
  painted effects are credited.

## The parts, class by class

Colours are the aura's own (the glow and the outline round the hero use them). Step 2 must read clearly as the
bigger, brighter, richer version of step 1.

### Guardian: golden shield shimmer, gold `#ffd24a`
1. `guardian.1.ground`, ground, size 0.95: a thin gold ring on the ground, a slow shimmer running round it.
2. `guardian.1.back`, back (behind the body's middle), size 1.05, glow: a translucent golden shield bubble, a light
   ripple across its face.
3. `guardian.2.ground`, ground, size 1.2: a wider, double gold ring with small heraldic notches.
4. `guardian.2.back`, back, size 1.25, glow: a fuller shield bubble with a bright rim and hexagonal facets glinting in
   turn.
5. `guardian.2.rise`, rise, size 1.0, glow: thin gold rings lifting from the feet and fading as they rise.
6. `guardian.2.motes`, motes ×3 in front, size 0.5: small gold glints that twinkle and drift up.

### Bulwark: bronze bastion, bronze-gold `#f0b860`
1. `bulwark.1.ground`, ground, size 1.0: a heavy bronze ring like a riveted rim.
2. `bulwark.1.back`, back, size 1.1, glow: a solid bronze-gold shield dome with a slow sheen.
3. `bulwark.2.ground`, ground, size 1.25: a broader riveted bronze ring, sparks at its seams.
4. `bulwark.2.ground2`, ground, size 1.6, glow, *face-on*: an outer rune ring of pale gold, turning slowly.
5. `bulwark.2.back`, back, size 1.3, glow: a bigger bastion dome, crenellated at its crown, with a slow sheen.
6. `bulwark.2.rise`, rise, size 1.05, glow: pale gold rings rising from the feet.

### Blade: crimson streaks, crimson `#e0304a`
1. `blade.1.ground`, ground, size 0.95: a thin crimson ring, a cut flicking round it.
2. `blade.1.motes`, motes ×2 in front, size 0.4: a short, sharp crimson slash streak that flicks up and fades.
3. `blade.2.ground`, ground, size 1.2: a wider crimson ring with sword-cut notches.
4. `blade.2.rise`, rise, size 1.0: crimson rings rising from the feet.
5. `blade.2.orbit`, orbit ×2 in front, size 0.42, *1 frame ok*: a curved crimson blade-arc. The game turns it along its
   path round the body, so paint it lying horizontally, leading edge to the right.
6. `blade.2.motes`, motes ×2 in front, size 0.45: brighter slash streaks with a white-hot core.

### Marksman: wind wisps, pale wind `#dbe8f4`
1. `marksman.1.ground`, ground, size 0.95: a pale ring of moving air.
2. `marksman.1.trail`, trail ×2 behind, size 0.6: a horizontal wisp of wind streaming to the left (the game mirrors
   it to the way the hero faces) and thinning out.
3. `marksman.2.ground`, ground, size 1.2: a wider ring of wind with a gust running round it.
4. `marksman.2.back`, back, size 1.2: a soft spiral of wind behind the body, turning slowly.
5. `marksman.2.rise`, rise, size 1.0: pale rings of air rising from the feet.
6. `marksman.2.trail`, trail ×3 in front, size 0.7: longer, brighter wind streaks streaming to the left.
7. `marksman.2.motes`, motes ×2 in front, size 0.5: small feather-light motes drifting up.

### Gunner: gunsmoke and sparks, spark yellow `#f2d35a`
1. `gunner.1.ground`, ground, size 0.95: a ring of crackling yellow sparks.
2. `gunner.1.motes`, motes ×2 on the ground (low), size 0.5: a small puff of grey gunsmoke billowing up and thinning.
3. `gunner.2.ground`, ground, size 1.2: a wider spark ring with brass-coloured glints.
4. `gunner.2.rise`, rise, size 1.0, glow: yellow electric rings rising from the feet.
5. `gunner.2.motes`, motes ×3 on the ground (low), size 0.6: bigger gunsmoke puffs.
6. `gunner.2.motes2`, motes ×2 in front, size 0.5: bright yellow sparks bursting and fading.

### Caster: orbiting arcane runes, violet `#b06cff`
1. `caster.1.ground`, ground, size 1.05, *face-on*: a violet rune circle with glyphs, turning.
2. `caster.1.orbit`, orbit ×2 in front, size 0.32: a small glowing violet orb with a faint rune inside, pulsing.
3. `caster.2.ground`, ground, size 1.35, *face-on*: a larger double rune circle, brighter, its glyphs lighting in turn.
4. `caster.2.back`, back, size 1.2, glow: an arcane sigil (a triangle in a circle) behind the body, pulsing.
5. `caster.2.rise`, rise, size 1.0: violet rings rising from the feet.
6. `caster.2.orbit`, orbit ×3 in front, size 0.36: brighter orbs, each with a short comet tail.

### Arcanist: starlit sigils, star blue `#7a86ff`
1. `arcanist.1.ground`, ground, size 1.05, *face-on*: a deep blue ring marked with star points, turning.
2. `arcanist.1.motes`, motes ×2 in front, size 0.5: small four-pointed stars twinkling.
3. `arcanist.2.ground`, ground, size 1.4, *face-on*: a star sigil (a constellation drawn within a ring), its stars
   lighting in turn.
4. `arcanist.2.back`, back, size 1.25: a slow spiral galaxy of blue stars behind the body.
5. `arcanist.2.halo`, halo, size 0.55, *face-on*: a thin ring of stars (the game flattens it over the head).
6. `arcanist.2.orbit`, orbit ×2 in front, size 0.3: a small bright star-orb.
7. `arcanist.2.motes`, motes ×3 in front, size 0.5: brighter twinkling stars.

### Support: radiant motes and halo, warm white `#fff0b8`
1. `support.1.halo`, halo, size 0.45, glow, *face-on*: a soft golden-white halo ring (the game flattens it over the head).
2. `support.1.motes`, motes ×2 in front, size 0.5: soft motes of light drifting up.
3. `support.2.back`, back, size 1.15, glow: a soft column of light behind the body, gently swelling.
4. `support.2.halo`, halo, size 0.55, glow, *face-on*: a brighter halo with a fine inner ring.
5. `support.2.rise`, rise, size 1.0, glow: warm rings of light rising from the feet.
6. `support.2.motes`, motes ×4 in front, size 0.5: brighter motes and little cross-shaped glints.

### Beast: feral flame, red-orange `#ff6a2a`
1. `beast.1.ground`, ground, size 0.95: a ring of red-orange embers.
2. `beast.1.motes`, motes ×2 on the ground (low), size 0.5: a ragged, feral flame licking upward, like a torn claw.
3. `beast.2.ground`, ground, size 1.2: a wider ring of fire with claw-mark gouges.
4. `beast.2.rise`, rise, size 1.0: flame-edged rings rising from the feet.
5. `beast.2.motes`, motes ×3 on the ground (low), size 0.62: taller, wilder flames.
6. `beast.2.motes2`, motes ×2 in front, size 0.5: embers spitting upward.

### Assassin: shadow smoke, shadow violet `#6a46a8`
1. `assassin.1.ground`, ground, size 0.95: a dark violet ring, smoky at its edge.
2. `assassin.1.motes`, motes ×2 on the ground (low), size 0.5: a curl of black-violet smoke rising and thinning.
3. `assassin.2.ground`, ground, size 1.2: a wider ring of creeping shadow.
4. `assassin.2.rise`, rise, size 1.0: dark rings rising from the feet.
5. `assassin.2.motes`, motes ×4 on the ground (low), size 0.62: thicker smoke columns.
6. `assassin.2.motes2`, motes ×2 in front, size 0.5: small violet sparks in the smoke.

### Trickster: moonlit mist, moon blue `#c6d2ff`
1. `trickster.1.ground`, ground, size 0.95: a pale moonlit ring.
2. `trickster.1.motes`, motes ×2 on the ground (low), size 0.5: a wisp of pale mist curling up.
3. `trickster.2.ground`, ground, size 1.2: a wider ring with a crescent moon shape travelling round it.
4. `trickster.2.back`, back, size 1.2: a slow swirl of moonlit mist behind the body.
5. `trickster.2.motes`, motes ×3 on the ground (low), size 0.6: thicker mist wisps.
6. `trickster.2.motes2`, motes ×3 in front, size 0.5: small silver glints, like fox-fire.

### Warden: living green, leaf green `#6cd060`
1. `warden.1.ground`, ground, size 0.95: a ring of green light with small sprouting leaves.
2. `warden.1.motes`, motes ×2 in front, size 0.5: a single small leaf drifting and turning.
3. `warden.2.ground`, ground, size 1.35, *face-on*: a druidic ring of vines and leaf runes, turning.
4. `warden.2.back`, back, size 1.2: a slow spiral of leaves behind the body.
5. `warden.2.rise`, rise, size 1.0: green rings rising from the feet.
6. `warden.2.motes`, motes ×4 in front, size 0.5: leaves and green motes drifting up.

### Vanguard: heat-haze charge, amber `#ffa040`
1. `vanguard.1.rise`, rise, size 0.95, glow: shimmering amber heat rings rising from the feet.
2. `vanguard.1.trail`, trail ×2 in front, size 0.65: a horizontal speed streak of amber, streaming to the left.
3. `vanguard.2.ground`, ground, size 1.2: a scorched amber ring, glowing at its edge.
4. `vanguard.2.rise`, rise, size 1.1, glow: taller, brighter heat rings with a wavering haze.
5. `vanguard.2.trail`, trail ×3 in front, size 0.7: longer charge streaks, white-hot at the head.
6. `vanguard.2.motes`, motes ×2 in front, size 0.45: small crackling sparks.

## Prompts, one a class

Each prompt makes one class's whole sheet. FX-003's painted effects were made one painting a cell. If a tool cannot
keep a grid, ask for each row (one part's frames) on its own, using the part's line above, and assemble the sheet
afterwards. Every prompt shares this opening:

> *Shared opening:* Cinematic hand-painted fantasy game visual effect, the same painted style as a high-end mobile RPG's
> spell effects: soft painterly brushwork, glowing cores, crisp readable silhouettes, luminous colour, no outlines
> drawn in black. Sprite sheet on a fully transparent background, a grid of square 256x256 cells, one row per effect,
> six animation frames per row forming a seamless loop. Viewed from a 3/4 isometric angle (camera about 30 degrees
> above the ground); ground rings painted as flattened 2:1 ellipses unless stated as face-on. Each effect centred in its
> cell with a small clear margin. No characters, no ground, no background, no text, no frame borders.

- **Guardian:** *[shared opening]* Rows, in order: 1) a thin golden ground ring with a shimmer running round it;
  2) a translucent golden shield bubble with a light ripple across it; 3) a wider double golden ground ring with small
  heraldic notches; 4) a fuller golden shield bubble with a bright rim and hexagonal facets glinting in turn; 5) thin
  gold rings lifting from the bottom edge and fading as they rise; 6) small gold glints twinkling and drifting up.
  Palette: warm gold #ffd24a, pale cream highlights.
- **Bulwark:** *[shared opening]* Rows: 1) a heavy riveted bronze ground ring; 2) a solid bronze-gold shield dome
  with a slow sheen; 3) a broader riveted bronze ground ring with sparks at its seams; 4) a face-on pale gold rune
  circle, turning; 5) a larger bronze bastion dome crowned with crenellations, a slow sheen; 6) pale gold rings rising
  from the bottom edge. Palette: bronze #f0b860, deep copper shadows, pale gold light.
- **Blade:** *[shared opening]* Rows: 1) a thin crimson ground ring with a cut flicking round it; 2) a short, sharp
  crimson slash streak flicking upward and fading; 3) a wider crimson ground ring with sword-cut notches; 4) crimson
  rings rising from the bottom edge; 5) a curved crimson blade arc lying horizontally, its leading edge to the right
  (one frame is enough); 6) brighter crimson slash streaks with white-hot cores. Palette: crimson #e0304a, dark wine
  shadows, white-hot edges.
- **Marksman:** *[shared opening]* Rows: 1) a pale ground ring of moving air; 2) a horizontal wisp of wind streaming
  to the left and thinning; 3) a wider ring of wind with a gust running round it; 4) a soft spiral of wind, turning
  slowly; 5) pale rings of air rising from the bottom edge; 6) longer, brighter wind streaks streaming to the left;
  7) small feather-light motes drifting up. Palette: pale wind white #dbe8f4, cool blue-grey shading.
- **Gunner:** *[shared opening]* Rows: 1) a ground ring of crackling yellow sparks; 2) a small puff of grey
  gunsmoke billowing up from the bottom edge and thinning; 3) a wider spark ring with brass glints; 4) yellow electric
  rings rising from the bottom edge; 5) bigger gunsmoke puffs rising from the bottom edge; 6) bright yellow sparks
  bursting and fading. Palette: spark yellow #f2d35a, brass, smoke grey.
- **Caster:** *[shared opening]* Rows: 1) a face-on violet rune circle with arcane glyphs, turning; 2) a small glowing
  violet orb with a faint rune inside, pulsing; 3) a larger face-on double rune circle whose glyphs light in turn;
  4) an arcane sigil, a triangle within a circle, pulsing; 5) violet rings rising from the bottom edge; 6) brighter
  violet orbs, each with a short comet tail. Palette: violet #b06cff, magenta sparks, white cores.
- **Arcanist:** *[shared opening]* Rows: 1) a face-on deep blue ring marked with star points, turning; 2) small
  four-pointed stars twinkling; 3) a face-on star sigil, a constellation drawn within a ring, its stars lighting in
  turn; 4) a slow spiral galaxy of blue stars; 5) a face-on thin ring of stars; 6) a small bright star-orb; 7) brighter
  twinkling stars. Palette: star blue #7a86ff, deep indigo, white starlight.
- **Support:** *[shared opening]* Rows: 1) a face-on soft golden-white halo ring; 2) soft motes of light drifting
  up; 3) a soft column of light, gently swelling; 4) a face-on brighter halo with a fine inner ring; 5) warm rings of
  light rising from the bottom edge; 6) brighter motes and little cross-shaped glints. Palette: warm white #fff0b8,
  pale gold.
- **Beast:** *[shared opening]* Rows: 1) a ground ring of red-orange embers; 2) a ragged, feral flame licking upward
  from the bottom edge, like a torn claw; 3) a wider ground ring of fire with claw-mark gouges; 4) flame-edged rings
  rising from the bottom edge; 5) taller, wilder feral flames rising from the bottom edge; 6) embers spitting upward.
  Palette: red-orange #ff6a2a, deep red, yellow-white cores.
- **Assassin:** *[shared opening]* Rows: 1) a dark violet ground ring, smoky at its edge; 2) a curl of black-violet
  smoke rising from the bottom edge and thinning; 3) a wider ring of creeping shadow; 4) dark rings rising from the
  bottom edge; 5) thicker black-violet smoke columns rising from the bottom edge; 6) small violet sparks. Palette:
  shadow violet #6a46a8, near-black, cold violet light.
- **Trickster:** *[shared opening]* Rows: 1) a pale moonlit ground ring; 2) a wisp of pale mist curling up from the
  bottom edge; 3) a wider ground ring with a crescent moon shape travelling round it; 4) a slow swirl of moonlit mist;
  5) thicker mist wisps rising from the bottom edge; 6) small silver fox-fire glints. Palette: moon blue #c6d2ff,
  silver, soft lavender.
- **Warden:** *[shared opening]* Rows: 1) a ground ring of green light with small sprouting leaves; 2) a single
  small leaf drifting and turning; 3) a face-on druidic ring of vines and leaf runes, turning; 4) a slow spiral of
  leaves; 5) green rings rising from the bottom edge; 6) leaves and green motes drifting up. Palette: leaf green
  #6cd060, moss, sunlit yellow-green.
- **Vanguard:** *[shared opening]* Rows: 1) shimmering amber heat rings rising from the bottom edge, with a wavering
  haze; 2) a horizontal amber speed streak streaming to the left; 3) a scorched amber ground ring glowing at its edge;
  4) taller, brighter heat rings with a wavering haze rising from the bottom edge; 5) longer charge streaks streaming
  to the left, white-hot at the head; 6) small crackling sparks. Palette: amber #ffa040, ember red, white-hot.

## After painting

1. Put the 13 sheets in one folder and run `python3 tools/awaken/import-aura-art.py <folder> 96`.
2. Run `npm test -- awaken-auras` and `npm run web`, then `node tools/awaken/aura-places.mjs` and
   `python3 tools/awaken/aura-places-sheet.py` to see every place at the three phone sizes.
3. Replace the pack credit for `src/art/fx/aura/` in `CREDITS.md` with the painted art's credit.
4. `tools/awaken/aura-sheets.py` rebuilds the pack atlas if the painted art is ever withdrawn.
