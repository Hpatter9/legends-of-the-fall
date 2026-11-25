# DUCHESS-COSTUMES: her three shop costumes as whole dressed sheets

The owner: Duchess's three costumes looked bad as round 2's overlays cut down onto her sprite, so they are being redrawn as whole dressed
sheets, one walking strip and one battle sheet per costume. The cosmetics builder (`claude/cosmetics`) is making the code take a full
dressed strip and sheet per costume.

There are three costumes. Only the Knight fitted in PixelLab's remaining budget, so it is done; the Regalia and the Lantern are the
ChatGPT prompt below.

| Costume | Walking strip (288 x 48) | Battle sheet (512 x 640) | Made |
| --- | --- | --- | --- |
| Knight: a little steel helm with a red plume | `src/art/duchess/duchess_knight_walk.png` | `src/art/duchess/duchess_knight.png` | PixelLab (below) |
| Royal Regalia: a red velvet cape, an ermine collar, a little gold crown | `duchess_regalia_walk.png` | `duchess_regalia.png` | the prompt below |
| Lantern: a small glowing brass lantern hung from one horn | `duchess_lantern_walk.png` | `duchess_lantern.png` | the prompt below |

## The Knight, made with PixelLab

The Knight was reskinned from her own sheets frame by frame, with the method of [pixellab-art.md](pixellab-art.md):

- **The battle sheet**: `tools/pixellab/reskin.py duchess_knight`, its piece in `pieces.json`. A key frame came from her first idle
  frame, then every frame was carried over with `/transfer-outfit-v2`. Attack frame 4 came back 16 px above the ground and was set back
  on her own frame's ground line.
- **The walking strip**: `tools/pixellab/duchess_strip.py knight ...`. A key frame came from her standing right-facing frame, then the
  six frames were carried over in one call, each keeping its own facing.

The raw frames are in `art-source/pixellab/duchess_knight/` and `art-source/duchess-costumes/knight/`, and the finished sheets are copied
into `art-source/duchess-costumes/`.

**The check:** each sheet was laid out frame by frame against her plain one (`docs/samples/duchess-costumes/`). The same helm and plume
show in every frame and every row, her poses and facing are kept, and every frame stands on her ground line.

**The cost:** about 100 generations: 8 calls for the battle sheet and 2 for the strip.

## The prompt for the Regalia and the Lantern

```text
Repository: hpatter9/legends-of-the-fall. Branch: art/duchess-costumes, from the latest main (create it). Add exactly the four image
files listed below under art-source/duchess-costumes/ and nothing else: no code, no notes, no version change. Then open ONE pull request
into main titled "Art: Duchess's costumes". In its body, list every file with its canvas size and grid, and say that every image is
original work made for this game.

Duchess is the court's small white nanny goat in Legends of the Last Keep, a dark gothic fantasy auto-battler played upright on a phone
with small pixel-art fighters. She wanders the tavern, the castle and the camp, and now and then joins a fight. A player can dress her in
a costume. Each costume is TWO whole sheets of Duchess herself, wearing it: her walking strip and her battle sheet. They are not
overlays: draw the goat and the costume together, every frame.

GENERAL RULES:
- No text, letters, numbers, logos, watermarks or signatures.
- Original work only.
- Transparent background (real alpha, no checkerboard).
- Crisp pixel art, hard pixel edges, no blur, a clean dark outline, light from the upper left, no ground shadow.
- Copy her own frames exactly: the same pose, size, place in the cell and facing in every frame. Change only what she wears.
- The costume is the same in every frame and both sheets: the same shapes, the same colours, the same size.
- Keep it bold and simple so it reads at about 48 px. Gold must read as gold at that size: a warm yellow-gold with a darker
  ochre shade and a near-white highlight pixel, not a muddy brown.

THE TWO GRIDS (copy her own sheets' frames, then dress them):
- The walking strip: 288 x 48, one row of six 48 x 48 frames. Frames 1 to 3 walk LEFT and frames 4 to 6 walk RIGHT; frames 1 and 4 are
  her standing pose. Her hooves are on y 47.
  Match: src/art/duchess/goat.png (her strip, frame for frame).
- The battle sheet: 512 x 640, cells 128 x 128, 4 per row, 5 rows. The rows, in this order:
  - walk 4;
  - attack 4 (a headbutt);
  - idle 2;
  - hurt 1;
  - dead 3 (the last frame lying on her side).
  Every frame faces RIGHT, and her hooves stand on the same ground line in every frame (except the last, lying).
  Match: src/art/units/duchess_goat.png (her sheet, frame for frame).

Match also: src/art/duchess/duchess_knight.png and duchess_knight_walk.png. This is her Knight costume, made the same way. Copy how big
the costume is on her and how bold it is.

THE FILES:
1. art-source/duchess-costumes/duchess_regalia_walk.png (the walking strip) and duchess_regalia.png (the battle sheet): the Royal
   Regalia. A small red velvet cape over her back and shoulders, with a white ermine collar spotted with a few black tails, and a little
   gold crown with three points and one red gem, set between her horns. The cape hangs and sways a little with her steps; when she lies
   dead, it lies over her.
2. art-source/duchess-costumes/duchess_lantern_walk.png (the walking strip) and duchess_lantern.png (the battle sheet): the Lantern. A
   small brass lantern, about the size of her head, hung on a short chain from one horn, with a soft warm yellow glow inside its glass
   and a pale ghost-light flicker at its heart. It swings a little with her steps. In the strip it hangs from the horn nearer the
   viewer, on whichever side she faces.

Before you finish, check that:
- all four files are present;
- each canvas is exactly the size given;
- every frame keeps her pose, size and facing;
- the costume is the same in every frame;
- no image has any text in it.
```
