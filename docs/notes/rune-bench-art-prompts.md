# Rune bench: prompts for the new art (RUNE-BENCH)

The rune bench ([rune-bench.md](rune-bench.md)) needs four new pieces. Until they come the page draws plain stand-ins (a dark wood
pill with brass ridges for the bar, the combat skin's own `ui/combat-skill.png` frame for the tiles and the rune side, a 🔒 glyph for
the lock), by the owner's rule that new art is painted, never drawn in code beyond a plain stand-in. The rune stones themselves are
already painted (`src/art/gear/`, `gearUiArt.ts`: `RUNE_ICON`, `RUNE_FRAME`) and stay as they are.

Each prompt below stands alone: paste everything inside its fence into a new ChatGPT (Codex with its image tool) conversation. All
four go on one branch, **`art/rune-bench`**, from the latest `main`; ChatGPT adds the PNGs only, under `art-source/rune-bench/`, and
opens one pull request. Nothing is imported by ChatGPT: the builder copies them into `src/art/ui/` afterwards (served as
`ui/<name>.png` and cached offline by `build.mjs`'s `UI_FILES`), swaps the stand-ins in `src/runeBench.css` for them, and credits
them in `CREDITS.md`.

| Prompt | Piece | File | Canvas |
| --- | --- | --- | --- |
| 1 | The pull bar's grip (two states) | `art-source/rune-bench/grip.png`, `grip-held.png` | 64 x 224 each |
| 2 | The rune side's backing | `art-source/rune-bench/rune-bench-backing.png` | 768 x 320 |
| 3 | A rune tile's frame (three states) | `art-source/rune-bench/rune-tile.png`, `rune-tile-lit.png`, `rune-tile-empty.png` | 160 x 160 each |
| 4 | The lock on the rune Auto | `art-source/rune-bench/rune-auto-lock.png` | 96 x 96 |

## Prompt 1: the pull bar's grip

```
Repository: hpatter9/legends-of-the-fall. Branch: art/rune-bench, from the latest main (create it if it does not exist; if it
exists, add to it). Add PNG files only, under art-source/rune-bench/. Change nothing else: no code, no notes, no version.

Paint the grip of a sliding pull bar for a dark gothic fantasy auto-battler played upright on a phone. The game's look is detailed
pixel art (crisp pixels, no anti-aliased blur, no painterly smears) in dark aged oak, blackened iron and worn brass, lit warmly by
candlelight, like the frames of its battle panel.

The grip is a tall narrow handle that sits on the edge of a wooden bench panel and is dragged sideways: a vertical slab of dark oak
bound top and bottom with blackened iron caps, a strip of worn brass down its middle with five raised horizontal ridges for a thumb
to grip, and a small brass rivet at each corner. A faint carved rune is cut into the wood above the ridges and another below them.
The left and right edges are slightly rounded so it reads as a handle that slides.

Make two images, each 64 x 224 pixels, transparent background, the grip filling the canvas with 2 pixels of clear margin:
1. art-source/rune-bench/grip.png: at rest.
2. art-source/rune-bench/grip-held.png: the same grip held, its brass ridges and rivets glowing a soft warm gold, a thin gold
   rim-light round its edge.
The two must line up pixel for pixel apart from the glow.

No text, no letters, no arrows, no numbers, no background, no shadow outside the canvas.

Open one pull request from art/rune-bench into main titled "Rune bench art" (or add to the open one), listing the files added.
```

## Prompt 2: the rune side's backing

```
Repository: hpatter9/legends-of-the-fall. Branch: art/rune-bench, from the latest main (create it if it does not exist; if it
exists, add to it). Add PNG files only, under art-source/rune-bench/. Change nothing else: no code, no notes, no version.

Paint the backing panel of a rune storage tray for a dark gothic fantasy auto-battler played upright on a phone. The game's look is
detailed pixel art (crisp pixels, no anti-aliased blur) in dark aged oak, blackened iron and worn brass, lit warmly by candlelight.

The panel is a shallow wooden tray seen straight on from above, wider than tall: a dark oak board with a sunken inner field of deep
green-black slate where carved rune stones rest, framed by an iron-bound oak rim with brass corner plates. Faint glowing rune
carvings (no real letters, abstract angular sigils) run very subtly along the inner edge of the rim, a cool violet-blue glow, low
contrast so the stones laid on top stay readable. The slate field is plain and even in the middle (tiles are drawn over it). It must
nine-slice cleanly: keep the corners decorated and the straight edges and the middle evenly repeating.

One image: art-source/rune-bench/rune-bench-backing.png, 768 x 320 pixels, transparent outside the tray's rounded outer edge.

No text, no letters, no numbers, no stones or objects in the tray, no hands, no background scene.

Open one pull request from art/rune-bench into main titled "Rune bench art" (or add to the open one), listing the files added.
```

## Prompt 3: a rune tile's frame

```
Repository: hpatter9/legends-of-the-fall. Branch: art/rune-bench, from the latest main (create it if it does not exist; if it
exists, add to it). Add PNG files only, under art-source/rune-bench/. Change nothing else: no code, no notes, no version.

Paint the square frame a rune stone sits in on a storage tray, for a dark gothic fantasy auto-battler played upright on a phone.
The game's look is detailed pixel art (crisp pixels, no anti-aliased blur) in dark aged oak, blackened iron and worn brass, lit
warmly by candlelight. The tile is a small square socket: a bevelled frame of blackened iron with brass corner studs, around a
recessed dark slate floor with a faint diamond-shaped hollow in its centre where a round carved stone rests (the stone itself is
drawn by the game, so leave the hollow empty). The frame must nine-slice: decorated corners, plain even edges.

Make three images, each 160 x 160 pixels, transparent background, the frame filling the canvas with 2 pixels of clear margin:
1. art-source/rune-bench/rune-tile.png: plain.
2. art-source/rune-bench/rune-tile-lit.png: the same frame with its brass studs and inner edge glowing warm gold (a twin ready to
   merge, or a place it can be dropped).
3. art-source/rune-bench/rune-tile-empty.png: the same frame darker and duller, the iron cold and the hollow dim, an empty slot.
The three must line up pixel for pixel apart from the light.

No text, no letters, no numbers, no stone, no background.

Open one pull request from art/rune-bench into main titled "Rune bench art" (or add to the open one), listing the files added.
```

## Prompt 4: the lock on the rune Auto

```
Repository: hpatter9/legends-of-the-fall. Branch: art/rune-bench, from the latest main (create it if it does not exist; if it
exists, add to it). Add PNG files only, under art-source/rune-bench/. Change nothing else: no code, no notes, no version.

Paint a small padlock icon for a locked button in a dark gothic fantasy auto-battler played upright on a phone. The game's look is
detailed pixel art (crisp pixels, no anti-aliased blur) in blackened iron and worn brass, lit warmly by candlelight. The padlock is
old and heavy: a blackened iron body with a brass keyhole plate, a thick iron shackle, and a small carved rune stone set into the
front of the body glowing a faint violet-blue (it locks the runes' helper). A front view, slightly from above, centred.

One image: art-source/rune-bench/rune-auto-lock.png, 96 x 96 pixels, transparent background, the lock filling about 80% of the
canvas. It will be shown as small as 14 pixels, so keep the silhouette bold and simple.

No text, no letters, no numbers, no stars, no background, no hands.

Open one pull request from art/rune-bench into main titled "Rune bench art" (or add to the open one), listing the files added.
```
