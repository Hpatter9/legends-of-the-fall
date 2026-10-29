# Ailments (status effects): brief for painted art (STATUS-FX)

The owner will have ChatGPT paint the ailments' art. Until then the eleven ailments are drawn with placeholder strips of
the **5000 Pixel Effects** pack (`../chronos-assets/pixel-effects`). This brief says exactly what to paint so the
painted atlas replaces the placeholders **with no code change**. The design is in [status-fx.md](status-fx.md).

## How the swap works

- `src/render/statusStyles.ts` names every part of every ailment (`<ailment>.<part>`, for example `freeze.front`) and
  says where it sits, how big it is, how many copies are drawn and how fast it plays. It holds no art.
- A part's frames come only from the ailments' atlas: `src/art/fx/status/atlas.png` and `atlas.json`
  (`{"cell": <px>, "parts": {"<key>": [column, row, frames]}}`), read by `src/render/statusArt.ts`. It is bundled into
  `game.js`, so it plays offline with nothing added to the service worker.
- `python3 tools/status-fx/import-status-art.py <folder> [cell]` builds that atlas from the painted sheets (one PNG an
  ailment, below), the same way `tools/awaken/import-aura-art.py` brought in the class auras. The painted sources stay
  untouched; the shipped atlas is scaled down for the phone.
- The game reads the cell size from `atlas.json`. Cells of 32px or less are drawn sharp (pixel art); larger cells, as
  painted art will be, are sampled smoothly. Sizes on screen do not change: a part's size is a share of the fighter's
  height, whatever the cell's size.
- To put the pack placeholders back: `python3 tools/status-fx/status-sheets.py` (it reads `tools/status-fx/status-pack.json`).
- Check a swap with `npm test -- status-fx` (every key has frames, in the importer's order), then
  `npm run web && node tools/status-fx/shots.mjs && python3 tools/status-fx/sheet.py` (the fight, the shatter, the
  immune foe and the contact sheet, at 393x852, in `docs/samples/status-fx-*.png`).
- I tried the importer with stand-in sheets (the placeholders blown up to 256px cells): 35 parts packed, the tests
  passed, and the placeholder atlas was put back.

## Format

- **One sheet an ailment**, named after it: `burn.png`, `poison.png`, `freeze.png`, `bleed.png`, `chill.png`,
  `shock.png`, `stun.png`, `weak.png`, `curse.png`, `silence.png`, `fear.png`. Every sheet must be there.
- **A grid of square cells, 256x256 px each**, on a **fully transparent background**: no ground plane, no backdrop, no
  drop shadow, no text, no characters.
- **One row a part**, in the order listed below. The part's frames run left to right along its row; the first empty
  cell ends the row, and rows may differ in length.
- **Frames:**
  - **Looping parts** (ground, back, front, halo, motes): **6 frames** (4 to 8 allowed), a **seamless loop** (the last
    frame flows into the first). They play at 80 to 140 ms a frame, each copy on its own beat.
  - **The burst** (the frozen shatter only): **6 to 8 frames, played once**, from the crust cracking to the shards
    flying out and fading. Not a loop.
  - **The icon**: **1 frame** is enough (up to 4 for a gentle loop, such as a flicker of flame). It is drawn about 14px
    across on the phone, inside a dark round chip with the ailment's coloured rim (the game draws the chip): paint a
    single bold symbol filling the cell, readable at that size, with a dark edge.
- **Angle:** the board's 3/4 isometric view, looking down at about 30 degrees, the same as the tiles and the fighters.
  Paint **ground** parts as ellipses already flattened about 2:1, as the tiles show them.
- **Where the fighter stands in a cell:**
  - **Ground** parts are centred in the cell; the fighter's feet are at the ellipse's centre.
  - **Front** and **back** parts are centred in the cell, which the game centres at the height the part's line gives
    (the *at* value: 0 the feet, 1 the top of the head). A part that grows from the feet (the frozen crust, the flames)
    stands on the cell's bottom edge.
  - **Halo** parts sit just over the head, centred in the cell.
  - **Motes** are small pieces centred in the cell; the game moves the copies round the body.
  - Leave about 8% clear at every edge so nothing is cut off.
- **Size:** a cell's width is the part's *size* times the fighter's height (size 1.0 is as wide as the fighter is tall).
  Paint the shape to fill its cell, inside the margin.
- **Layers:** **ground** and **back** are drawn behind the fighter; **front**, **halo**, **motes**, **burst** in front.
  A front part covers the body, so keep it open (licks of flame, a crust of crystals, sparks), never a solid sheet.
- **Blending:** everything is drawn over the scene (normal blending), so paint with soft dark edges for contrast. Only
  the lightning sparks and the stun stars may be bright cores that read as light.
- **The fighters:** small pixel-art sprites about 40 to 60 px tall on the phone, on a sunny painted board. Effects must
  read at that size: bold shapes, strong colour, nothing fussy.
- **Copies:** a part drawn ×2 uses the same frames for every copy. One row is enough.
- **Shipping:** `python3 tools/status-fx/import-status-art.py <folder> 96`. 96px cells keep the atlas within about
  1536x1728 at six frames a part (35 parts). Credit the art in `CREDITS.md` the way FX-003's painted effects are.

## Palette

| Ailment | Main colour | Highlights | Number colour (the game's text) |
| --- | --- | --- | --- |
| Burning | flame orange `#ff8a2a` | yellow-white core `#fff0a0`, ember red `#d03a10` | `#ff9a3c` |
| Poisoned | venom green `#6fd24a` | pale lime `#cdf2a8`, deep moss `#2f6a1e` | `#8fe05a` |
| Frozen | ice blue `#7fd4ff` | white frost `#e8f8ff`, deep blue `#2a6aa8` | `#9fe6ff` (shatter `#bff0ff`) |
| Bleeding | blood red `#e0403a` | dark crimson `#7a0e14`, wet highlight `#ff9a9a` | `#ff5a4e` |
| Chilled | pale frost `#9fd0ff` | white `#f0faff` | (no damage) |
| Shocked | electric blue `#77cfff` | yellow-white arcs `#fff27a` | `#fff27a` |
| Stunned | star gold `#ffe27a` | white `#fffbe8` | (no damage) |
| Weakened | dull rust `#b07a6a` | ash grey `#c0b4b4` | (no damage) |
| Cursed | violet `#bb70ff` | black-violet `#2a1040`, pale lilac `#d8b8ff` | `#c07aff` |
| Silenced | moon white `#cdd5ff` | slate `#6a7090` | (no damage) |
| Feared | dusk violet-grey `#8a7aa0` | pale `#e0d8ee`, near-black smoke `#201828` | (no damage) |

## The parts, ailment by ailment

Each line: the key, its place, its size (a share of the fighter's height), what to paint. Parts marked † are left out
on battery saver. The placeholder strip each replaces is in brackets.

### Burning (`burn.png`, 3 rows)
1. `burn.front`, front, size 0.7, stands on the bottom edge: licking flames climbing the lower body, open between the
   tongues so the fighter shows through. [`fire-flame-s`]
2. `burn.motes`, motes ×2†, size 0.45: a single small ember with a short trail, drifting up. [`fire-sparkle-s`]
3. `burn.icon`, icon: a bold flame. [`fire-flame-x`]

### Poisoned (`poison.png`, 3 rows)
1. `poison.back`, back, size 1.0: a sickly green haze rising behind the body in slow rings. [`poison-aura-s`]
2. `poison.motes`, motes ×2, size 0.55: green bubbles rising and popping. [`poison-status-s`]
3. `poison.icon`, icon: a green droplet with a small bubble (or a skull in the drop). [`poison-orb-x`]

### Frozen (`freeze.png`, 5 rows)
1. `freeze.ground`, ground, size 1.15: a frosted ring of ice on the ground, glinting. [`ice-circle-s`]
2. `freeze.back`, back†, size 1.1: a pale translucent shell of ice behind and round the body (the frost crust's
   back half). [`ice-shield-s`]
3. `freeze.front`, front, size 0.95, stands on the bottom edge: jagged ice crystals encasing the legs and lower body,
   clear and faceted (the fighter is held inside). Hardly moving: a glint travelling across. [`ice-spikes-s`]
4. `freeze.burst`, burst, size 1.1, played once: the crust cracks and shatters, shards of ice flying outward and a
   cold puff, fading. [`ice-puff-sb`]
5. `freeze.icon`, icon: a block of ice, or a snowflake inside a crystal. [`ice-spikes-x`]

### Bleeding (`bleed.png`, 3 rows)
1. `bleed.ground`, ground, size 0.85: a small dark-red pool spreading under the feet. [`blood-pool-s`]
2. `bleed.motes`, motes ×2, size 0.6: drops of blood falling from a wound. [`blood-rain-s`]
3. `bleed.icon`, icon: a single blood drop beside a short cut. [`blood-cut-x`]

### Chilled (`chill.png`, 3 rows)
1. `chill.ground`, ground, size 1.05: a thin ring of frost on the ground with a light rime creeping round it.
   [`ice-circle-s`]
2. `chill.motes`, motes ×2†, size 0.45: a few snowflakes or frost glints drifting down. [`ice-sparkle-s`]
3. `chill.icon`, icon: a snowflake over a downward chevron (slowed). [`ice-debuff-x`]

### Shocked (`shock.png`, 3 rows)
1. `shock.back`, back†, size 1.0: faint blue static rings crackling up behind the body. [`lightning-aura-s`]
2. `shock.front`, front, size 0.65: small forked arcs of lightning jumping across the body, changing every frame
   (bright, light). [`lightning-sparkle-sb`]
3. `shock.icon`, icon: a lightning bolt. [`lightning-strike-x`]

### Stunned (`stun.png`, 2 rows)
1. `stun.halo`, halo, size 0.45: three little gold stars circling just over the head, in perspective (bright, light).
   [`gold-star-s`]
2. `stun.icon`, icon: a star with a swirl. [`gold-star-x`]

### Weakened (`weak.png`, 3 rows)
1. `weak.ground`, ground†, size 1.0: a dull rust-red ring on the ground, sinking. [`blood-circle-s`]
2. `weak.front`, front, size 0.75: three rust-red arrows sinking down through the upper body. [`blood-debuff-s`]
3. `weak.icon`, icon: a broken sword, or a fist with a down arrow. [`blood-debuff-x`]

### Cursed (`curse.png`, 3 rows)
1. `curse.ground`, ground, size 1.05: a violet rune circle turning slowly on the ground, dark at its heart.
   [`dark-rune-s`]
2. `curse.motes`, motes ×2†, size 0.4: thin black-violet wisps curling up and away. [`dark-smoke-s`]
3. `curse.icon`, icon: a violet skull, or an evil eye. [`white-skull-x`, tinted]

### Silenced (`silence.png`, 3 rows)
1. `silence.ground`, ground†, size 0.95: a pale moonlit seal ring on the ground. [`moon-circle-s`]
2. `silence.halo`, halo, size 0.4: a small pale seal (a ring with a bar across it, or three dots fading) just over
   the head. [`white-dots-s`]
3. `silence.icon`, icon: a speech bubble crossed out, or a sealed mouth. [`white-dots-x`]

### Feared (`fear.png`, 4 rows)
1. `fear.back`, back†, size 0.95: a cold, dark smoke behind the body, reaching up like a shadow. [`dark-smoke-s`]
2. `fear.halo`, halo, size 0.38: a pale exclamation mark that trembles. [`white-exclaim-s`]
3. `fear.motes`, motes ×1, size 0.45: a bead of cold sweat flying off the head. [`white-sweat-s`]
4. `fear.icon`, icon: a frightened face, or an exclamation mark with a running figure. [`white-exclaim-x`]

## Prompts, one an ailment

Each prompt makes one ailment's whole sheet, in the style of the FX-003 painted combat effects
(`docs/notes/individual-ability-effects.md`). If a tool cannot keep a grid, ask for each row (one part's frames) on its
own, with the part's line above, and put the sheet together afterwards. Every prompt shares this opening:

> *Shared opening:* Cinematic hand-painted fantasy game visual effect, the same painted style as a high-end mobile RPG's
> spell effects: soft painterly brushwork, glowing cores, crisp readable silhouettes, luminous colour, bold shapes that
> read at a small size. Sprite sheet on a fully transparent background, a grid of square 256x256 cells, one row per
> effect, six animation frames per row forming a seamless loop unless stated otherwise. Viewed from a 3/4 isometric
> angle (camera about 30 degrees above the ground), matching small pixel-art fighters; ground rings painted as flattened
> 2:1 ellipses. Each effect centred in its cell with a small clear margin. No characters, no ground, no background, no
> text, no frame borders.

- **Burning:** *[shared opening]* Rows, in order: 1) licking orange flames rising from the bottom edge, open between
  the tongues, as if climbing a fighter's legs; 2) a single small glowing ember with a short trail, drifting upward;
  3) one frame: a bold flame icon with a dark edge, filling the cell. Palette: flame orange #ff8a2a, yellow-white core
  #fff0a0, ember red #d03a10.
- **Poisoned:** *[shared opening]* Rows: 1) a sickly green haze rising in slow soft rings; 2) a cluster of green
  bubbles rising and popping; 3) one frame: a bold green venom droplet icon with a small bubble. Palette: venom green
  #6fd24a, pale lime #cdf2a8, deep moss #2f6a1e.
- **Frozen:** *[shared opening]* Rows: 1) a frosted ice ring on the ground, glinting; 2) a pale translucent shell of
  ice, the back half of a crust round a figure; 3) jagged clear faceted ice crystals rising from the bottom edge as if
  encasing a figure's legs, nearly still with a glint travelling across; 4) eight frames played once, not a loop: an
  ice crust cracking and shattering, shards flying outward with a cold puff, fading to nothing; 5) one frame: a bold
  ice-block or snowflake icon. Palette: ice blue #7fd4ff, white frost #e8f8ff, deep blue #2a6aa8.
- **Bleeding:** *[shared opening]* Rows: 1) a small dark-red pool spreading on the ground; 2) drops of blood falling;
  3) one frame: a bold blood-drop icon beside a short cut. Palette: blood red #e0403a, dark crimson #7a0e14, wet
  highlight #ff9a9a.
- **Chilled:** *[shared opening]* Rows: 1) a thin frost ring on the ground with rime creeping round it; 2) a few
  snowflakes and frost glints drifting down; 3) one frame: a bold snowflake icon over a downward chevron. Palette: pale
  frost #9fd0ff, white #f0faff.
- **Shocked:** *[shared opening]* Rows: 1) faint blue static rings crackling upward; 2) small bright forked arcs of
  lightning jumping in different places each frame; 3) one frame: a bold lightning-bolt icon. Palette: electric blue
  #77cfff, yellow-white arcs #fff27a.
- **Stunned:** *[shared opening]* Rows: 1) three small bright gold stars circling in a flattened ring, as seen over a
  dizzy head; 2) one frame: a bold star-and-swirl icon. Palette: star gold #ffe27a, white #fffbe8.
- **Weakened:** *[shared opening]* Rows: 1) a dull rust-red ring on the ground, sinking; 2) three rust-red arrows
  sinking downward; 3) one frame: a bold broken-sword icon. Palette: dull rust #b07a6a, ash grey #c0b4b4.
- **Cursed:** *[shared opening]* Rows: 1) a violet rune circle with dark glyphs turning slowly on the ground; 2) a
  thin black-violet wisp curling up and away; 3) one frame: a bold violet skull icon. Palette: violet #bb70ff,
  black-violet #2a1040, pale lilac #d8b8ff.
- **Silenced:** *[shared opening]* Rows: 1) a pale moonlit seal ring on the ground; 2) a small pale seal, a ring with
  a bar across it, hovering and fading in and out softly (never vanishing); 3) one frame: a bold crossed-out speech
  bubble icon. Palette: moon white #cdd5ff, slate #6a7090.
- **Feared:** *[shared opening]* Rows: 1) a cold dark smoke reaching upward like a shadow; 2) a pale exclamation mark
  trembling; 3) a single bead of cold sweat flying off to one side; 4) one frame: a bold frightened-face icon. Palette:
  dusk violet-grey #8a7aa0, pale #e0d8ee, near-black smoke #201828.
