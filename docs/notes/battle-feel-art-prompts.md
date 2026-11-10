# BATTLE-FEEL: art prompts

The fight's laid fire (the Fire Wizard's Wall of Fire, a fire wall a kit raises, `WALL_LOOKS.fire` in `src/render/toolkitLooks.ts`) plays
a tall looping flame over each tile it holds, on the effects layer. A hero standing in its own fire wall is drawn under the flames, and at
393x852 the line of flames hides the fighters fighting in it (docs/samples/battle-feel/ogres-casters-lv32-393.jpg, frames 4 to 6). A
low, ground-hugging loop that sits on the tile's top would show the fire without covering who stands in it. Until it lands, the tall loop
stays.

```
For the repo hpatter9/legends-of-the-fall, branch art/battle-feel: paint a looping animation of low fire burning on one isometric ground
tile, for a phone pixel-art fantasy auto-battler (the King God Castle look, Final Fantasy Tactics style height grid), saved as
art-source/fx/ground-fire-loop.png: one horizontal strip of 8 frames, each frame 128x96 px, the whole sheet 1024x96 px, on a transparent
background. The fire fills a 2:1 isometric diamond 128 px wide and 64 px tall, centred low in the frame (the diamond's bottom point 8 px
above the frame's bottom edge), and its tongues of flame rise no more than 28 px above the diamond's top point, so a fighter standing on
the tile stays seen. Warm orange and yellow tongues with a few red embers, darker red at the edges, licking and flickering across the
eight frames so the last frame flows back into the first. Crisp pixel art with a limited palette, no anti-aliased blur, no outline round
the diamond, no smoke above the flames, no text.
```
