# Camp declutter (partly done)

The owner: "The camp screen could use some decluttering. Hester's shop signs should be on the cart - we should generate for this."

## Done
- The overlook heading is its name alone ("Battle Overlook"): the small "THE WAR COUNCIL" eyebrow and the "Scout the approaching army" strapline are gone (`camp.ts`).
- `tools/camp/declutter-shots.mjs` takes the camp shots (`TAG=before|after SIZES=393,360,412`): `docs/samples/camp-declutter-before-*.png` and `-after-*.png`.

## Not done: Hester's sign art
The sign was to be generated with the OpenAI images endpoint (newest image model, transparent background) and painted onto the cart in place of her name plate.
Every image model (the 2.5 pair, gpt-image-2, 1.5) answered `insufficient_quota` / "no credits remaining" through the connected proxy, so no art was made.
Her plate (name and "new stock" / visitor line) is therefore unchanged. Once credits are back: generate the board ("HESTER'S / BOOKS & GEAR"), cut it to WebP in `src/art/shop/`,
credit it in `CREDITS.md`, lay it over the stall picture in `home.ts` (`cpStallPic`), keep the tap box (`#hmStall`), the new-stock dot and the visitor line (a small pill only while a trader is here).
`build.mjs` already lists `src/art/shop/` files for the service worker; check the new file is among them.
