# FX-ALIVE: art prompts

One sheet covers every living-ground effect: the area warnings (volleys, meteors), the Mythics' diamonds, the king's spell marks, the auras
with no painted art of their own, and the land's hazard tells. Each is a patch of tiles in an element's colour. Until the sheet lands, each tile
carries the pack's 32 px rune strip for its element (`alivePatch` in `src/render/fx.ts`). When it lands, cut it with
`python3 tools/fx-alive/cut.py art-source/fx-alive/ground-loops.png`: the game takes the painted loops with no code change
(`src/render/aliveArt.ts`).

The Wall of Fire's low ground-fire loop has its own prompt in `docs/notes/battle-feel-art-prompts.md`. The ailments' marks on a fighter have
their brief and importer in `docs/notes/status-fx-art-brief.md` (`tools/status-fx/import-status-art.py`).

## 1. Living ground loops (8 elements in one sheet)

```
For the repo hpatter9/legends-of-the-fall, branch art/fx-alive: paint one sprite sheet of looping animated ground effects for a phone pixel-art
fantasy auto-battler (the King God Castle look on a Final Fantasy Tactics style isometric height grid), saved as
art-source/fx-alive/ground-loops.png on a transparent background. The sheet is 1024 x 512 px: 8 rows of 8 frames, each frame 128 x 64 px,
frames in a row from left to right, the 8 frames one seamless loop (the last flows back into the first, about 0.75 s at 95 ms a frame).

Each frame is one isometric floor tile: a 2:1 diamond 128 px wide and 64 px tall filling the frame, its four points touching the frame's
edges. The effect lies flat on that diamond, as if painted on the ground, so a hero standing on the tile stays fully visible: mostly clear
in the middle, brightest along the diamond's edges, the motion drifting across it. Each frame must tile seamlessly with the same frame placed
on the four neighbouring diamonds (no hard border inside the art, no shading that makes each tile read as a separate block).

Rows, top to bottom:
1. fire: low embers and heat shimmer, small tongues of orange and gold licking along the edges, a few sparks drifting.
2. ice: frost creeping in from the edges, pale blue rime and glinting crystals, a faint cold mist sliding across.
3. light: holy gold-white light, a slowly turning ring of fine runes near the edge, motes rising.
4. dark: violet-black shadow tendrils curling along the edges, small purple sparks, the middle nearly clear.
5. poison: green bubbling haze, small bubbles rising and popping, a thin green edge glow.
6. wind: pale swirling gust lines sweeping across the tile, leaves or dust flecks carried along.
7. earth: cracks of glowing amber in brown ground that open and close, small pebbles hopping, dust along the edges.
8. forest: green leafy light, small leaves and spores drifting, a soft green edge glow.

Style: crisp pixel art with a limited palette per row, bright readable colours against grass, stone and sand, additive-style glow (it will be
drawn blended over the board), no black outline round the diamond, no text, no characters, nothing outside the diamond.
```
