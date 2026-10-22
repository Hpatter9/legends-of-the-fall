# Scenes art (the summoning hall and the library)

Made with PixelLab `/create-image-pixflux` through `tools/tavern/gen.sh`, like the tavern's furniture (single colour black outline, medium
shading and detail; the pieces with a transparent background were trimmed to their pixels, nothing is scaled on the way in). 9 generations in all
(one request was retried after a 502); every piece was kept on the first try.

| file | size | prompt (short) |
|---|---|---|
| hall/wall.png | 192x128 | dark stone summoning hall back wall, tall gothic arches, purple banners with gold runes, glowing violet crystals, torch sconces |
| hall/floor.png | 64x64 | dark purple-grey flagstone floor tiles, seamless, top-down |
| hall/circle.png | 79x43 | glowing violet summoning circle with gold runes, flat top-down ellipse |
| hall/summoner1.png, summoner2.png | 40x58 | robed summoner in a purple hooded robe: standing with a staff; both arms raised casting (one shared box so the feet line up) |
| hall/brazier.png | 22x40 | iron standing brazier bowl on a stand |
| hall/pillar.png | 32x110 | carved stone pillar with a glowing violet crystal and gold runes |
| library/wall.png | 192x128 | wizard library chapel wall, stained glass window, bookshelves, candlelight |
| library/lectern.png | 40x50 | wooden lectern with a large open glowing spellbook |

`hall/fx_fire-flame.png` is the Super Pixel Effects Gigapack's `fire-flame-16` sheet, copied as it is. `node tools/scenes/shots.mjs` takes the samples.
