# Gear art still to make

A new base without its painting shows a clear placeholder (its slot's outline, faint, with its name on it: `itemIcon` in
`src/equipView.ts`). This list is every painting still to make; a test (`test/equipment.test.ts`) checks that every new base is either
painted (in `src/art/gear/index.json`) or on this list, never both. Take a piece off (remove its line) when its painting is in
`art-source/gear/` and `python3 tools/gear/import-gear-icons.py` has packed it (a new base's painting may sit in its slot's folder or in
`armour/`, `weapons/` or `trinkets/`, where the owner's PRs put them).

**The tool** is `tools/gear/gen-icons.mjs` (the design's section 12): one prompt a piece from its name and slot in the house style of
the paintings already in the game, through the connected image API, saved at 256 x 256 to `art-source/gear/<slot>/<id>.png`; then
`python3 tools/gear/import-gear-icons.py --contact <png>` cleans, centres and packs them (a new base needs only its standard painting: its
Mythic is the same painting in the Mythic frame). `node tools/gear/gen-icons.mjs --slot feet --limit 20` (`--dry` prints the prompts
and sends nothing). The pieces that are not equipment (runes, frames, emblems, glyph stones, remedies) go through
`python3 tools/gear/import-gear-ui.py`.

## Equipment paintings complete

All 69 remaining bases are now painted and packed: the Bladed Fan, 26 footwear pieces, 24 belts and 18 accessories.
Sources: `art-source/gear/off/`, `feet/`, `belt/`, `acc/`; retained generation sheets and mapping:
`art-source/gear/completion/`. See [the completion handoff](gear-paint-completion.md).
There are no equipment bases left on the painting backlog.

## Painted and in the game (batch 7)

The owner's art PRs brought in, and taken off this list: 60 new bases (#329, the 25 head pieces, the 7 torso pieces and the 8 right-hand
pieces; #335, 20 of the 21 left-hand pieces), the 21 named legends (#338), and (#336) the 8 rune stones in place of the pack's discs, the 5
rune frames, the merge spark, the 5 remedies, the 14 set emblems and the 3 glyph stones (the Enchant tab's icon is the gold one).

## Still to come

- The 7 empty-slot outlines of the paper doll and the doll's backing (the empty slots show a faint painting of a base of that slot).
