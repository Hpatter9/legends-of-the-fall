# Rune bench: the one prompt for its art (RUNE-BENCH-LOOK)

The pull bar and the rune bench ([rune-bench.md](rune-bench.md), restyled in [rune-bench-look.md](rune-bench-look.md)) now wear the
game's painted plates: the bar is the camp plaque on end with the painted chevrons and count seal, the tray is the plaque's wood and
brass, each tile a choice plate with its stone in the bronze or gold ring, the locked Auto has the painted lock medallion. What is still
missing is art made for the bench itself: a bar shaped as a handle, a tray, a socketed tile, the ring a stone sits in and a rune Auto
medallion (today's Auto shows the heroes' auto-place medallion). This replaces the four earlier prompts with one.

Paste everything inside the fence into one new ChatGPT (Codex with its image tool) conversation. It paints ten PNGs on one branch,
**`art/rune-bench`**, under `art-source/rune-bench/`, and opens one pull request, **"Rune bench art"**. Once merged, the builder runs

```bash
python3 tools/rune-bench/import-art.py && npm run web
```

which finds each piece by its file name, trims and resizes it with Pillow, writes `src/art/ui/rune-bench/<name>.webp` (served and cached
offline by `build.mjs`) and writes `src/runeBenchArt.css`, whose rules take the place of the stand-in plates. A piece not painted is
skipped, so a partial PR still drops in. The builder credits the paintings in `CREDITS.md`.

| File | Piece | Final size (the script resizes to it) |
| --- | --- | --- |
| `grip.png`, `grip-lit.png` | The pull bar's handle, resting and held | 64 x 208 |
| `tray.png` | The rune tray (nine-slice) | 384 x 160 |
| `tile.png`, `tile-lit.png`, `tile-empty.png` | A tile's frame: plain, lit, empty (nine-slice) | 128 x 96 |
| `socket.png`, `socket-twin.png` | The ring a stone sits in, plain and with its twin ready | 96 x 96 |
| `rune-auto.png`, `rune-auto-locked.png` | The rune Auto medallion, open and locked | 96 x 96 |

```
Repository: hpatter9/legends-of-the-fall. Branch: art/rune-bench, from the latest main (create it if it does not exist; if it exists,
add to it). Add PNG files only, under art-source/rune-bench/. Change nothing else: no code, no notes, no version.

You are painting the art for the "rune bench" of Legends of the Last Keep, a dark gothic fantasy auto-battler played upright on a
phone. Under the deploy screen's hero cards sits a bench; a vertical pull bar on its edge slides it across to show the run's rune
stones on a tray of eight square tiles, four by two. The stones themselves are already painted and are drawn by the game on top of
your art, so never paint a stone, a letter, a number or a word.

Match the game's painted buttons exactly. Before painting, open and study these reference files in the repository:
- art-source/ui/buttons/plates-frames.png and art-source/ui/buttons/plates-buttons.png (the brass plates, the camp plaque in warm
  oak with a brass rim and corner rivets, the choice plates with gilt corner flourishes, the tab plate);
- art-source/ui/buttons/actions.png (the round brass-ringed medallions, e.g. Satchel and Auto merge) and
  art-source/ui/buttons/glyphs.png (the small lock and chevron medallions) and art-source/ui/buttons/tabs.png (the count seal);
- art-source/gear/runes/*.png (the eight rune stones and frame-1.png to frame-5.png, the copper to gold rings round them).
Use the same painted, softly lit, slightly bevelled look: worn brass and gold, warm dark oak, blackened iron, dark slate and deep
green insides, warm candlelight from the upper left, a soft dark edge so each piece reads on a dark green felt background.

Paint these ten images, each on its own fully transparent background (real alpha, no checkerboard, no backdrop, no drop shadow
outside the piece). You may paint at your native size (for example 1024 x 1024 or 1024 x 1536): keep the proportions given and
leave a few pixels of clear margin; the builder resizes with Pillow, so do not repaint to hit an exact pixel size. If an image comes
out at the wrong proportions, crop or pad it with Pillow (transparent padding) rather than painting it again.

1. grip.png: the pull bar's handle, a tall narrow upright piece, proportions 64 wide by 208 tall. A carved oak handle in a brass
   frame like the camp plaque stood on end, rounded brass end caps top and bottom, a dark slate inset running down the middle
   (the game writes a vertical word there and puts a chevron near the top, so keep the middle plain), a few brass grip ridges or
   a small carved rune sigil low on it. Top and bottom 40 (of 208) and sides 18 (of 64) are the frame; the middle stretches.
2. grip-lit.png: the same handle, pixel for pixel aligned, its brass warmed and a soft gold glow on the rim (held by the finger).
3. tray.png: the tray the tiles sit on, proportions 384 wide by 160 tall: a shallow recessed tray of dark oak in a worn brass rim
   with corner rivets and a small gilt flourish in each corner, its floor dark green felt or dark slate, evenly lit. It must
   nine-slice: decorated corners within 40 (of 160) top and bottom and 44 (of 384) at the sides; plain, evenly repeating straight
   edges and an even floor between them.
4. tile.png: one tile's frame, proportions 128 wide by 96 tall: a small square-cornered brass frame in the choice plates' style
   (thin gilt corner flourishes), around a recessed dark slate floor. Nine-slice: corners within 28 (of 96) top and bottom and 30
   (of 128) at the sides, plain even edges, a plain even middle (the game puts the socket and a word in it).
5. tile-lit.png: the same frame aligned pixel for pixel, its brass and inner edge glowing warm gold (a place the held stone can go).
6. tile-empty.png: the same frame aligned, darker and duller, cold blackened iron in place of brass, the floor dim (an empty slot).
7. socket.png: the round ring a stone rests in, proportions 1:1, seen from the front: a bronze ring like the orb rings in
   art-source/ui/buttons/ and the rune frames in art-source/gear/runes/, with a dark hollow centre (transparent or very dark) where
   the stone sits. The ring fills the canvas less a small margin.
8. socket-twin.png: the same ring aligned, gold, with a faint warm glow (its twin is in the bag, ready to merge).
9. rune-auto.png: a round medallion in the actions sheet's style (brass ring, dark inner field): a carved rune stone with a small
   gold arrow sweeping from it into a hero's socket, meaning "set the runes for me".
10. rune-auto-locked.png: the same medallion aligned, dulled and greyed, with a small heavy padlock over it (the glyphs sheet's lock).

Shown as small as 24 px (the medallions) and 52 px tall (a tile), so keep shapes bold and clean.

Before committing, check every file yourself with Python and Pillow and fix anything that fails:
- it opens as RGBA PNG, its four corner pixels are fully transparent, and there is no baked-in checkerboard or backdrop;
- its proportions are within 3% of those given;
- the aligned sets (grip and grip-lit; tile, tile-lit and tile-empty; socket and socket-twin; rune-auto and rune-auto-locked) have
  the same size and their alpha outlines match;
- there is no text, letter or number in any image.
Say in the pull request which checks passed.

Open one pull request from art/rune-bench into main titled "Rune bench art" (or add to the open one), listing the ten files.
```
