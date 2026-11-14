# Release audit: prompts for the art to redo (RELEASE-AUDIT-ART)

These go with the ranked list in [release-audit-art.md](release-audit-art.md). The finding each one answers is in brackets.

Work through them in order. Group A is what a new player sees in the first five minutes; group B is the first hour; group C is the
bosses' own sprites; group D is the owner's call.

Paste each fenced prompt into ChatGPT, with its image tool. Each one paints a single PNG on its own `art/<topic>` branch, under
`art-source/`. Once a file is merged, the builder copies it into `src/art/`, credits it in `CREDITS.md` and wires it up; the note on
each prompt says where.

| # | Piece | Branch | File | Canvas |
| --- | --- | --- | --- | --- |
| A1 | Starter pick backdrop | `art/release-starter` | `art-source/release/starter-backdrop.png` | 1024 x 2048 |
| A2 | Speech bubble (nine-slice) | `art/release-quip` | `art-source/release/quip-bubble.png` | 384 x 192 |
| A3 | The 13 class sigils | `art/release-sigils` | `art-source/release/class-sigils.png` | 1664 x 128 |
| A4 | Fight HUD hero row backing | `art/release-hud` | `art-source/release/hud-hero-row.png` | 640 x 112 |
| B1 | Codex "not met" tile | `art/release-codex` | `art-source/release/codex-unknown.png` | 256 x 256 |
| B2 | Daily chest | `art/release-daily` | `art-source/release/daily-chest.png` | 512 x 384 |
| B3 | Assault and Nemesis icons | `art/release-icons` | `art-source/release/assault-icons.png` | 1536 x 128 |
| B4 | Achievement medal | `art/release-achievements` | `art-source/release/achievement-medal.png` | 512 x 512 |
| C1 | Orc Chieftain sheet | `art/release-bosses` | `art-source/release/bosses/orc_chieftain.png` | 490 x 475 |
| C2 | Bone Captain sheet | `art/release-bosses` | `art-source/release/bosses/bone_captain.png` | 756 x 390 |
| C3 | Minotaur Champion sheet | `art/release-bosses` | `art-source/release/bosses/minotaur_champion.png` | 1728 x 475 |
| C4 | Gorgon Queen sheet | `art/release-bosses` | `art-source/release/bosses/gorgon_queen.png` | 2272 x 470 |
| D1 | Loading poster, in the game's style | `art/release-loading` | `art-source/release/loading.png` | 1024 x 2048 |

That is 13 prompts.

The four boss sheets copy their soldier's frame grid exactly, so the builder can swap one `sheet:` name in `src/sim/foes.ts`, add one
line to `src/render/sheets.ts` and `src/art/units/sheets.json`, and change nothing else.

## Group A: the first five minutes

### A1. The starter pick's backdrop (finding 1)

The first screen behind "Choose your first heroes". The builder rebuilds the page on `ornateMenu` and lays this behind it. The top
third stays quiet for the title, and the middle stays dark enough for the two pack cards to read over it.

```
Repository: hpatter9/legends-of-the-fall. Branch: art/release-starter, from the latest main (create it if it does not exist; if it
exists, add to it). Add one PNG file only: art-source/release/starter-backdrop.png. Change nothing else: no code, no notes, no version.

Paint a full-screen backdrop for the very first screen of Legends of the Last Keep, a dark gothic fantasy auto-battler played upright on
a phone, where the player picks their first band of three heroes. Canvas 1024 x 2048 pixels (portrait), with no transparency: this one
fills the screen.

The scene: inside the gatehouse of a ruined mountain keep at dusk, seen from just inside the gate looking out. In the lower third, a
worn stone floor with a long trestle table and two empty banners propped against it, as if waiting to be claimed. In the middle third,
deep shadow and a few hanging lanterns, kept dark and quiet so menu cards laid over it stay readable. In the top third, through the
open gate arch, a far valley under an amber and violet sky with a distant castle silhouette. Embers drift up from a brazier at the
lower left.

Style: hand-painted pixel art with a large, even pixel grid (each "pixel" about 4 screen pixels), a dark outline on near shapes, and
warm candle and brazier light against cool dusk shadow. Match the painted home screen and battle overlook already in the game: study
the Battle Overlook painting src/art/camp/overlook.png, src/art/hall/sanctum.png and the tavern painting src/art/ui/tavern-hearth.png. Keep their palette (amber, brass, deep green-black, dusk violet) and their pixel scale. No people, no letters,
numbers, logos or words anywhere. Keep the middle band (y 600 to 1500) low in contrast.
```

### A2. The speech bubble (finding 2)

Heroes' and Duchess's quips (`#quip` in `quipView.ts`). It is laid as a nine-slice with `border-image`: the corners are kept as they
are and the edges and middle stretch, so the four corners must sit inside 64 x 64 squares. The tail is drawn by CSS.

```
Repository: hpatter9/legends-of-the-fall. Branch: art/release-quip, from the latest main (create it if it does not exist; if it
exists, add to it). Add one PNG file only: art-source/release/quip-bubble.png. Change nothing else: no code, no notes, no version.

Paint a speech-bubble panel for Legends of the Last Keep, a dark gothic fantasy auto-battler played upright on a phone. Canvas 384 x
192 pixels, transparent background outside the panel. The panel fills the canvas with an 8 pixel clear margin.

The panel: a small rounded rectangle of aged parchment, warm cream fading to tan at the edges, framed by a thin rim of dark brass with a
tiny filigree curl in each corner. The four corners and their curls must each fit inside a 64 x 64 pixel square at the canvas
corners. The straight edges between them must be plain and even, so they can be stretched. The middle is plain parchment with only
the faintest grain, so text reads on it. No tail or pointer: the game adds that.

Style: hand-painted, slightly matte, like the game's painted menu plates. Study art-source/ui/buttons/plates-frames.png and
src/art/ui/buttons/plate-secondary.webp in the repository and match their brass colour, their rim thickness and their light (candle
light from the upper left). No pixel art, no letters or words, nothing touching the canvas edge.
```

### A3. The 13 class sigils (finding 8)

These go on the summon's tarot cards in place of the upscaled Pixel-Effects glyph over the black silhouette (`tarotFace` in
`summonTarot.ts`). There is one sigil a class trait, in the order of `TRAIT_ELEMENT`.

```
Repository: hpatter9/legends-of-the-fall. Branch: art/release-sigils, from the latest main (create it if it does not exist; if it
exists, add to it). Add one PNG file only: art-source/release/class-sigils.png. Change nothing else: no code, no notes, no version.

Paint a row of 13 class sigils for the summoning cards of Legends of the Last Keep, a dark gothic fantasy auto-battler played upright
on a phone. Canvas 1664 x 128 pixels, transparent background, 13 cells of 128 x 128 in one row, each sigil centred in its cell with
10 pixels clear all round.

Each sigil is a glowing magic circle engraved with the class's emblem, as if burned in light on the face of a tarot card. Left to
right, with its colour:
1 Guardian: a tower shield (pale gold)
2 Bulwark: a fortress wall (earthy amber)
3 Blade: a single upright sword (blood red)
4 Marksman: a drawn bow and arrow (wind green)
5 Gunner: a flintlock crossed with a lightning bolt (electric yellow)
6 Caster: a crystal staff head (crystal violet)
7 Arcanist: an eight-pointed star in a ring (starlight blue)
8 Support: a halo over an open hand (warm white)
9 Beast: a clawed paw (fire orange)
10 Assassin: a curved dagger and a crescent of shadow (deep purple)
11 Trickster: a mask under a crescent moon (moon silver)
12 Warden: an oak leaf over a spear (forest green)
13 Vanguard: a banner on a lance (desert gold)

Style: fine, glowing line work with a soft inner glow and a few motes of light, like a gilded engraving lit from inside; detailed
enough to hold up 200 pixels wide on a phone, with no chunky pixels. Match the tarot card frame already in the game
(src/art/tarot/arcana.png and the Summoning Sanctum painting src/art/hall/sanctum.png): gold filigree, deep green-black. No letters,
numbers or words, nothing touching a cell's edge, each sigil the same visual weight.
```

### A4. The fight HUD's hero row (finding 9)

This replaces the flat lavender panel behind each hero's name and bars in the fight HUD. The portrait sits on the left; the bars and
name go over the middle. It is laid stretched at about 150 x 26 CSS pixels a row.

```
Repository: hpatter9/legends-of-the-fall. Branch: art/release-hud, from the latest main (create it if it does not exist; if it
exists, add to it). Add one PNG file only: art-source/release/hud-hero-row.png. Change nothing else: no code, no notes, no version.

Paint a backing plate for one hero's row in the battle HUD of Legends of the Last Keep, a dark gothic fantasy auto-battler played
upright on a phone. Canvas 640 x 112 pixels, transparent background outside the plate.

The plate: a long, low panel of dark stained wood with a thin bevelled brass rim; on its left end a square inset (112 x 112) framed in
brass, for the hero's portrait. The rest of the face is dark and plain so a green health bar, a gold stamina bar and a small name in
cream can be laid over it and read. A faint warm sheen along the top edge.

Style: hand-painted, slightly matte, made to sit beside the skill buttons already there (src/art/ui/combat-skill.png,
src/art/ui/combat-panel.png and src/art/ui/combat-portrait.png): the same wood, the same brass and the same candle light from the upper
left. No pixel art, no letters or numbers, no bars painted in (the game draws them), nothing touching the canvas edge.
```

## Group B: the first hour

### B1. The codex's "not met" tile (finding 10)

This is shown in place of the solid black square behind "??? not met".

```
Repository: hpatter9/legends-of-the-fall. Branch: art/release-codex, from the latest main (create it if it does not exist; if it
exists, add to it). Add one PNG file only: art-source/release/codex-unknown.png. Change nothing else: no code, no notes, no version.

Paint a placeholder tile for an unmet creature in the bestiary of Legends of the Last Keep, a dark gothic fantasy auto-battler played
upright on a phone. Canvas 256 x 256 pixels, transparent background outside the tile.

The tile: a square of dark slate inside a thin worn-brass rim with rounded corners, and on it a faint, smoky silhouette of an unknown
beast (hunched, horned, indistinct) drawn in a slightly lighter grey-green, as if seen through fog. No question mark or other
symbol on it. It must read as "not yet seen", never as a picture that failed to load.

Style: hand-painted, matte, the same slate and brass as the game's codex cards and menu plates (study
art-source/ui/buttons/plates-frames.png and src/art/ui/buttons/plate-choice.webp). No letters, numbers or words, nothing touching the
canvas edge, readable at 64 pixels.
```

### B2. The daily chest (finding 17)

This replaces the pack chest (`src/art/ui/chest-daily.png`, 84 x 39, with its lime grass) on the Daily's card.

```
Repository: hpatter9/legends-of-the-fall. Branch: art/release-daily, from the latest main (create it if it does not exist; if it
exists, add to it). Add one PNG file only: art-source/release/daily-chest.png. Change nothing else: no code, no notes, no version.

Paint the daily reward chest for Legends of the Last Keep, a dark gothic fantasy auto-battler played upright on a phone. Canvas 512 x
384 pixels, transparent background, the chest filling about four fifths of the canvas, centred, seen from the front and a little above.

The chest: a heavy iron-bound coffer of dark violet-stained oak, its lid closed, a brass sunburst lock plate on the front, small brass
corner caps, and a thin glow of violet light escaping from under the lid. It sits on nothing: no ground, no grass, no shadow.

Style: hand-painted pixel art at the same pixel scale and palette as the game's gear and relic icons (study src/art/gear/ and
src/art/relics/, and the chests src/art/ui/chest-gold.png and chest-silver.png for proportion): a dark outline, warm light from the
upper left, deep shadows. Not cartoonish, no bright greens. No letters or words, nothing touching the canvas edge, readable at 96
pixels.
```

### B3. Icons for the Assault and the Nemesis board (finding 20)

These replace the text symbols ● ◔ ⚑ ⚔ ⌇ ≈ ▬ ▲ ⁘ 🪜 on the Assault's plan and pause menus, and ⚭ (sworn brothers) and ⤢ (view full
artwork). Several of those symbols show as empty boxes on older phones.

```
Repository: hpatter9/legends-of-the-fall. Branch: art/release-icons, from the latest main (create it if it does not exist; if it
exists, add to it). Add one PNG file only: art-source/release/assault-icons.png. Change nothing else: no code, no notes, no version.

Paint a row of 12 small menu icons for Legends of the Last Keep, a dark gothic fantasy auto-battler played upright on a phone. Canvas
1536 x 128 pixels, transparent background, 12 cells of 128 x 128 in one row, each icon centred with 12 pixels clear all round.

Left to right:
1 Full detail: a lit lantern
2 Lite detail: a shuttered lantern, dimmer
3 Sound the retreat: a white flag on a short pole
4 Fill the ranks: two crossed swords over a small shield
5 The bridge: a short arched stone bridge
6 The ford: three wavy lines of water with stepping stones
7 Formation wall: a row of four tower shields
8 Formation wedge: an arrowhead of five small helmets
9 Formation loose: five small helmets scattered
10 Scaling ladders: a wooden siege ladder against a wall
11 Sworn in blood: two hands clasped over a drop of blood
12 View full artwork: a small picture frame with corner arrows pointing out

Style: hand-painted brass-and-enamel medallion icons in the manner of the game's existing round glyphs: study
src/art/ui/buttons/g-back.webp, g-star.webp and the sheet art-source/ui/buttons/glyphs.png and match their brass, their dark enamel
centres and their light. Each icon must read at 22 pixels. No letters or numbers, nothing touching a cell's edge.
```

### B4. The achievement medal (finding 18)

This goes on each row of the plain Achievements list, in place of the "☆" text star: lit when it is claimed, greyed by CSS while it
is not.

```
Repository: hpatter9/legends-of-the-fall. Branch: art/release-achievements, from the latest main (create it if it does not exist; if
it exists, add to it). Add one PNG file only: art-source/release/achievement-medal.png. Change nothing else: no code, no notes, no version.

Paint one achievement medal for Legends of the Last Keep, a dark gothic fantasy auto-battler played upright on a phone. Canvas 512 x
512 pixels, transparent background, the medal filling about four fifths of the canvas and centred.

The medal: a round brass medal with a raised laurel wreath round its rim and a small crowned keep tower in the middle, hanging from a
short forest-green ribbon with swallow-tail ends behind it. Polished high points, darker recesses.

Style: hand-painted, rich and slightly matte, like the game's round menu medals: study art-source/ui/buttons/actions.png and
src/art/ui/buttons/achievements.webp in the repository and match their brass and their light from the upper left. No letters,
numbers or words. Nothing touching the canvas edge; readable at 32 pixels.
```

## Group C: the bosses' own sprites (finding 19)

Each sheet must keep the exact frame grid of the sheet it replaces, so that `src/art/units/sheets.json` needs one new line with the
same numbers. The game draws the frames small (a fighter is about 48 to 60 px tall on the board), so each must read as the boss at that
size: bigger, with a silhouette of its own, not a recolour.

### C1. The Orc Chieftain (the first army's mid-boss; it wears the Orc Brute's sheet today)

```
Repository: hpatter9/legends-of-the-fall. Branch: art/release-bosses, from the latest main (create it if it does not exist; if it
exists, add to it). Add one PNG file only: art-source/release/bosses/orc_chieftain.png. Change nothing else: no code, no notes, no version.

A sprite sheet for a 2D pixel-art tactics game (isometric board, fighters about 48 to 60 px tall, painted pixel art with a dark
outline). Canvas 490 x 475 pixels, transparent background. A grid of cells 98 x 95 pixels, 5 cells across, 5 rows; the figure stands
on the same spot in every cell, feet on a line 8 pixels above the cell's bottom, facing right.

Rows, top to bottom (cells left to right, any unused cells left empty):
1 walk: 5 frames of a heavy stride
2 attack: 5 frames, raising a war banner on a spiked pole and slamming its butt down
3 idle: 4 frames, a slow breath, the banner swaying
4 dead: 5 frames, falling back and lying still
5 hurt: 3 frames, recoiling

The figure: an orc chieftain, broader than his warriors, in a wolf-pelt mantle over dark iron plates, a bone-and-iron crown, tusks,
green-grey skin, carrying a tall tattered red war banner with a skull on its pole. He must be unmistakable beside the orc warriors.

Style: match the orc sheets already in the repository exactly: their pixel scale, outline, palette and light (src/art/units/
hk_orc_brute.png, hk_orc_grunt.png and hk_orc_warlord.png; the same grid as hk_orc_brute.png). Hard pixel edges, no blur, no ground
shadow, no text.
```

### C2. The Bone Captain (the Undead Legion's champion; it wears the plain skeleton's sheet today)

```
Repository: hpatter9/legends-of-the-fall. Branch: art/release-bosses, from the latest main (create it if it does not exist; if it
exists, add to it). Add one PNG file only: art-source/release/bosses/bone_captain.png. Change nothing else: no code, no notes, no version.

A sprite sheet for a 2D pixel-art tactics game (isometric board, fighters about 48 to 60 px tall, painted pixel art with a dark
outline). Canvas 756 x 390 pixels, transparent background. A grid of cells 108 x 78 pixels, 7 cells across, 5 rows; the figure stands on
the same spot in every cell, feet on a line 6 pixels above the cell's bottom, facing right.

Rows, top to bottom (cells left to right, any unused cells left empty):
1 walk: 7 frames
2 attack: 5 frames, a great overhead cleave with a notched two-handed sword
3 idle: 7 frames, a slow sway, a faint blue flicker in the eye sockets
4 hurt: 2 frames
5 dead: 4 frames, the bones collapsing into a heap with the helmet on top

The figure: a skeleton captain a head taller than the common skeletons, in a rusted plumed helm and a torn dark-blue officer's
sash, a cracked round shield on its back, pale blue light in its eyes.

Style: match the skeleton sheets already in the repository exactly: their pixel scale, outline, palette and light
(src/art/units/skeleton_warrior.png, skeleton_archer.png and skeleton_spearman.png; the same grid as skeleton_warrior.png). Hard pixel
edges, no blur, no ground shadow, no text.
```

### C3. The Minotaur Champion (it wears the plain minotaur's sheet today)

```
Repository: hpatter9/legends-of-the-fall. Branch: art/release-bosses, from the latest main (create it if it does not exist; if it
exists, add to it). Add one PNG file only: art-source/release/bosses/minotaur_champion.png. Change nothing else: no code, no notes, no
version.

A sprite sheet for a 2D pixel-art tactics game (isometric board, fighters about 48 to 60 px tall, painted pixel art with a dark
outline). Canvas 1728 x 475 pixels, transparent background. A grid of cells 144 x 95 pixels, 12 cells across, 5 rows; the figure
stands on the same spot in every cell, feet on a line 8 pixels above the cell's bottom, facing right.

Rows, top to bottom (cells left to right, any unused cells left empty):
1 walk: 12 frames
2 attack: 5 frames, a two-handed swing of a double-bladed labrys
3 idle: 10 frames, a snorting breath, the axe resting on one shoulder
4 hurt: 3 frames
5 dead: 5 frames

The figure: a minotaur champion, bigger than the common minotaur, with long curved horns capped in bronze, a gold ring in its nose,
a bronze-studded harness and a red champion's sash, and a huge bronze labrys.

Style: match src/art/units/minotaur_1.png in the repository exactly: its pixel scale, outline, palette and light (and the same grid).
Hard pixel edges, no blur, no ground shadow, no text.
```

### C4. The Gorgon Queen (she wears the plain gorgon's sheet today)

```
Repository: hpatter9/legends-of-the-fall. Branch: art/release-bosses, from the latest main (create it if it does not exist; if it
exists, add to it). Add one PNG file only: art-source/release/bosses/gorgon_queen.png. Change nothing else: no code, no notes, no version.

A sprite sheet for a 2D pixel-art tactics game (isometric board, fighters about 48 to 60 px tall, painted pixel art with a dark
outline). Canvas 2272 x 470 pixels, transparent background. A grid of cells 142 x 94 pixels, 16 cells across, 5 rows; the figure
stands on the same spot in every cell, feet (or tail coil) on a line 8 pixels above the cell's bottom, facing right.

Rows, top to bottom (cells left to right, any unused cells left empty):
1 walk: 13 frames, slithering
2 attack: 16 frames, rearing up and casting a beam of green stone-light from her eyes
3 idle: 7 frames, the snakes of her hair weaving
4 hurt: 3 frames
5 dead: 3 frames

The figure: a gorgon queen, taller than the common gorgon, with a serpent's tail in emerald and gold scales, a thin gold circlet,
a mantle of dark green silk, and a crown of hissing snakes for hair.

Style: match src/art/units/gorgon_1.png in the repository exactly: its pixel scale, outline, palette and light (and the same grid).
Hard pixel edges, no blur, no ground shadow, no text.
```

## Group D: the owner's call

### D1. The loading poster, in the game's own style (finding 21)

Only if the owner wants the launch screen to match the game. Today it is a flat screen-print poster (`art-source/loading/`). The title
and the "Preparing the keep…" bar are drawn by the page over it.

```
Repository: hpatter9/legends-of-the-fall. Branch: art/release-loading, from the latest main (create it if it does not exist; if it
exists, add to it). Add one PNG file only: art-source/release/loading.png. Change nothing else: no code, no notes, no version.

Paint the loading screen of Legends of the Last Keep, a dark gothic fantasy auto-battler played upright on a phone. Canvas 1024 x 2048
pixels (portrait), no transparency.

The scene: a lone mountain keep on a crag at night in falling snow, a single lit window, a winding road climbing to it from the
bottom of the frame, and above it, filling the sky, two great gold crowns, one whole and one cracked, half-hidden in storm clouds
lit from below by the keep's light. The top fifth stays dark and plain for the title, and the bottom fifth stays dark and plain for
the loading bar.

Style: hand-painted pixel art at the same pixel scale and palette as the game's painted scenes (study the Battle Overlook painting
src/art/camp/overlook.png and src/art/hall/sanctum.png in the repository): deep night blues and greens, warm amber windows, brass-gold crowns, a dark outline on
near shapes. No letters, numbers, logos or words anywhere.
```
