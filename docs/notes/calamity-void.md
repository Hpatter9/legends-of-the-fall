# The Calamity's void

The owner: "We should make calamity map look more like an interdimensional space. I don't like the current look." The Calamity is reached through a portal; its six maps are now **realms of
the void** instead of countryside. Everything else is as it was: the graph, the rules, the fog logic, the save and reopen, the walk and the balance (`calamity-map.md`).

## The look (`src/calMap.ts`, `src/render/calRealm.ts`, `calmap.css`, `tools/calmap/prep.py`)
- **The void** (CSS layers behind the canvases, bundled): a sky gradient per realm with the packs' **stars** over it, a **moon** (the Moon pack's four: tan, white, red, pale blue) and a **nebula**
  (the Cloudscape pack's cloud layers, recoloured per realm). Each moves at its own pace as the map scrolls (the sky at half, the nebula at 0.6, the moon almost with the screen), so the party seems
  to travel through it; the nebula also drifts sideways, one slow turn in six minutes. Nothing flashes or pulses hard.
- **Islands** (`CalMap.isleOf`, `render/calRealm.ts` `drawIsland`): each spot is a natural floating isle, not a cube. Its top is the realm's iso ground cut to an **irregular rounded outline** (an ellipse whose radius
  wobbles with four seeded waves, so every island has its own silhouette, deterministically) with a lit rim and a lip of earth; under it hangs a **tapering craggy root** of the Undead Tileset's rock face
  (narrowing to a point, with two seeded prongs, no straight sides) hung with what the realm grows: roots and leaves (meadow), crystals (crystal, rift), glowing cracks (infernal, rift), icicles (frozen),
  chains (clockwork). Size follows the landmark (tents, foe camps and the shop get more room than a chest or shrine); the portal's and the lair's islands are bigger; a radius is capped so neighbours never touch.
  Small rim props (bush, rock), a faint realm-coloured glow beneath, and now and then a drifting fragment of rock (`drawChunk`) near an island, all baked and still. The ring, tap target and mist patch follow
  the island. No pack had a ready floating-island sprite, so the islands are built from the packs' rock and ground pictures in code.
- **Bridges**: one line of **small stones** from island to island, placed evenly (about every 30px) along the straight line between the two islands' centres, clear of the islands by 46px
  (`CalMap.stones`), never filling the road's cells. Each stone (`drawStone`) is a floating rune tile 22px across, dim and tinted to the realm (a dark body, a muted top, one faint rune pixel pair), with a
  small soft glow under it and a thin beam of light through the line on a second canvas that breathes (opacity easing between 0.55 and 0.95 over six seconds). The islands stay the brightest things.
  The track is always **one stone wide**: the line is straight, or bends once (round the far side) where it would pass over another island, and a stone that would stand beside one already laid (two bridges leaving an island at close angles) is left out, so there are never doubled or side-by-side stones (checked on ten maps: no two stones of different bridges within 15px). A fork is two such lines leaving the island, a side spot one short line. The leader walks the same straight line, and the mist lifts along it stone by stone.
- **Mist**: the old fog is now a **mask**: islands and bridges the party has not seen are simply not there (the starfield stays everywhere); a lit island or bridge fades in through a soft patch,
  along the bridge cell by cell, then the island. One fade, no blinking.
- **The rift** (map 6): once the lair is in sight, a great rift (the PVFX portal, four times its size, screen-blended, turning once in 4.8s) swirls behind its island.
- **Baked**: the islands, bridges, props and landmarks are baked once into canvases; only the void's drift, the glow's breathing, the mask while it lifts, the portal and rift and the leader move.
  Frame times in a headless software renderer: the old map avg 51.3ms (p95 66.7), the void avg 56.7ms (p95 66.8) idle; scrolling 51.3 vs 55.1: near the old map's.

## The six realms (names in `REALMS`)
1. **The Shattered Meadow**: grass islands, oak and pine; violet sky, tan moon; gold bridges.
2. **The Crystal Expanse**: Fae crystal-meadow islands with crystal rocks and glow bushes; teal sky, white moon, a green nebula; cyan bridges.
3. **The Infernal Reach**: scorched, bone-strewn islands, burnt trees; ember sky, red moon; orange bridges.
4. **The Frozen Star**: snow islands, snowy pines and boulders; deep blue sky, pale blue moon; ice-white bridges.
5. **The Clockwork Ruin**: iron-plate and grating islands, iron trees, coils and oil drums; dark steel sky; brass bridges.
6. **The Heart of the Rift**: violet cracked-earth islands, dead oaks and crystals; black-violet sky; magenta bridges; the great rift behind the lair.

## Layout
Row spacing grew from 5 to 8 cells (`ROW_A`) so that every island stands alone with its hanging root clear of the next (islands are larger rather than shrunk: radius 46 to 72 by landmark, the island set a little forward under its landmark so a palisade or tent sits on the ground; each ground tile is drawn slightly oversize so its neighbours overlap the seams, which are softer but still faintly visible); positions only, no rule changed. Row and lane slots, the side-spot search and the roads are as before. Landmarks still
never stand nearer the scene's edge than their picture allows (`CalMap.ax`).

Shots: `tools/calmap/shots.mjs` (`docs/samples/calamity-void-*.png`: fresh, fork, side, side-elite, walk, boss, map1 to map6, and fresh and fork at 360).
