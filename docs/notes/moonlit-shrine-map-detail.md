# Moonlit Shrine: details across the whole map

Owner asked for the rest of the map to receive the same attention as the shrine and pond. This continues `art/moonlit-shrine-completion`, retaining both earlier passes and their evidence.

## Regional treatment

| Region | Detail |
| --- | --- |
| Eastern woods and fox-kennel flank | More bamboo on existing blocked tiles, wish trees, sacred stones, flowers and forest litter |
| Western woods | Cherry trees, wind-shaped pines, ferns, petals and low flowering plants |
| Old shrine ruins | Fallen masks, broken banners, stone fragments, broken jars and lantern debris |
| Sake stores | Sake-barrel paintings on the existing destructible store plots |
| Outer/inner baileys | Supply goods, flowers, masks, petal scatter, cracked paving and spirit marks |
| Reserve camp | Cooking/storage props beside the seven tent plots, supplies concentrated near camp, natural ground litter beyond it |
| Shoreline | Reeds, irises and pebbles along wet banks; existing pavilion, waterfall, lilies and koi retained |
| Perimeter | 25 small lanterns and 17 banners on existing wall tiles |

`moonlitDressing.ts` selects standing props for each region, using only existing approved paintings and blocked/water footprints. `fieldLooks.ts` gives the shrine its own low-clutter and decal choices. The renderer passes the blueprint's army to the optional clutter selector; other holds retain their shared rules. Ground scatter follows smooth density patches. Tall ambush grass receives decals, keeping extra props out of the ambush cover. Roads, bridges, stairs and solid tiles remain free of the low-clutter pass.

The first visual review showed excessive repeated masks and stone ornaments in natural areas. The final composition concentrates supplies at camp and masks around ruins, adds more bamboo/cherry silhouettes to the woods, and retains ordinary rock in the reserve woodland.

No new source artwork or runtime URLs were needed. Source grid, anchors, collision, hazards, combat routes, forts, saves and version are unchanged. Existing destructible structures retain their associations.

## Checks and evidence

- Typecheck and production build passed.
- Focused `assault-shrine-dressing` and `assault-looks` files passed after the final composition changes. Checks cover deterministic map/placement rules, full board immutability, valid atlas names, coverage of the regions, clear roads/bridges/stairs, wall/camp anchoring, existing water footprints and isolation from the Orc hold.
- `assault-shrine` and `assault-render` regression files also passed during this pass.
- [Coverage](../samples/moonlit-shrine-detail/coverage.json): 751 eligible low-detail positions and 684 decal candidates across the field, compared with 347/345 under the previous shared scatter. These are rule candidates; the renderer additionally filters decals by slope and chunk edge.
- Final browser review passed: eight regions at 393×852, 360×780 and 412×915 (24 phone views, reduced motion at 412), plus a complete 1200×1600 portrait overview of the 100×100 map. The overview alone lifts the page’s 480px body-width cap in the browser fixture; production phone layout is unchanged. Every visible chunk was loaded before capture. No page errors, failed asset requests or page overflow; five atlas URLs remain in the offline manifest.

[Full map](../samples/moonlit-shrine-detail/full-map.jpg) · [Regional details](../samples/moonlit-shrine-detail/region-review.jpg) · [Reserve camp comparison](../samples/moonlit-shrine-detail/reserve-comparison.jpg) · [Browser results](../samples/moonlit-shrine-detail/browser-results.json).

The visual check uses the shipping Assault renderer on a controlled fixed map. It does not establish phone performance or a full campaign playthrough. Complete locally for review. No merge or deployment.


## Pull-request integration

Based on main `d47659c4` (0.455.0), including the newer Bloodtusk structures and siege fixes. Shared renderer changes retain both holds' rules. Post-integration typecheck/build, ten-sheet grid validation and five focused test files (`assault-shrine`, `assault-shrine-dressing`, `assault-looks`, `assault-render`, `assault-warcamp`) passed. Six additional keep/pond views passed at all three phone sizes, including reduced motion at 412, with no page errors or failed asset requests. [Integration results](../samples/moonlit-shrine-integration/browser-results.json).

Ready for pull-request review. No release bump, merge or deployment.
