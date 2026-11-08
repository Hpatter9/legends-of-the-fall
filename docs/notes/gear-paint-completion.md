# Gear painting completion

Owner approved the four-item painted proposal before production. Branch: `art/gear-completion`.

All 69 missing equipment bases now have individual 256px paintings: the Bladed Fan, 26 footwear pieces, 24 belts and 18 accessories.
The existing item renderer uses these through the gear atlas, including its existing rarity frames and Mythic glow. No simulation,
saves, version or item statistics changed. Dedicated empty-slot outlines and the paper-doll backing were completed in the subsequent [finishing pass](art-finishing-pass.md).

Eight original production sheets and their exact item mapping are retained in `art-source/gear/completion/`. The last sheet's
bottom row contains three unused props; these are not imported. The approved proposal and rejected background takes remain outside
the repository in the generation workspace. Individual sources are in `art-source/gear/off/`, `feet/`, `belt/`, `acc/`.

To reproduce: `python3 tools/gear/cut-completion.py`, then `python3 tools/gear/import-gear-icons.py`.
The second command rebuilds the existing 128px and 64px atlases and their index. `build.mjs` already copies and caches both atlases
for offline play. Source sheets do not ship to players.

Preview: [all new paintings](../samples/gear-completion/contact.png). The browser fixture
`tools/gear/completion-shots.mjs` opens actual equipment screens with the new items in the save at 393×852, 360×780 and 412×915.

Validation: all 16 equipment tests passed; typecheck and production web build passed. All 69 IDs are present in the
packed atlas (270 cells total including existing Mythic variants); no missing paintings were reported by the importer.
The atlas contact sheet was reviewed after cleanup. Both atlases remain in the generated service-worker cache list.
The two gear atlases grew by approximately 609 KiB combined; original generation sheets are development sources only.
Browser checks passed at 393×852, 360×780 and 412×915: seven painted worn slots, no placeholders in the off-hand/feet/belt/accessory
pickers, no horizontal page overflow and no page errors. The screenshot save marks tutorial tips seen so the equipment is unobscured.
See [browser results](../samples/gear-completion/browser-results.json), [packed paintings](../samples/gear-completion/atlas-contact.png)
and [the actual equipment screen](../samples/gear-completion/doll-393.png). No full suite or balance sweep was needed for an art-only batch.

Next planned passes: enemy idle/hurt clips, then the three campfire travellers. Spell-frame expansions and other small art details
are additional opportunities rather than part of this equipment batch.
