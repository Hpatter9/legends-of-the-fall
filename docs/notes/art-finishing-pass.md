# Art finishing pass

Branch: `art/finishing-pass`, based on the completed gear and nine-enemy animation work. The owner requested all five remaining
recommendations and approved the traveller portrait proposal. Menu art follows the approved painted style; treant recoil follows
the approved enemy motion direction.

## Implemented

- Painted portraits for the Pilgrim, Deserter and Cartographer on the campfire card, including their return encounters. Existing
  names, encounter text, choices, costs and rewards remain unchanged.
- Four oath pennants with both distinct colours and symbols (Iron shield, Ember flame, Coin coin, Vigil lantern); provisions sack
  in the expedition header, sanctuary header and shop. Oath offers also use their own pennant. The current sanctuary hub shows
  carried supplies and oaths; tapping a pennant opens the existing information popup.
- Seven dedicated faint empty equipment-slot paintings and a subdued painted armoury alcove behind the paper-doll hero.
- Dedicated three-frame hurt clips for all three treant summon forms. Every original idle, walk, attack and death pixel is
  preserved, with padding only where required. Original figure heights, scales and battle timing are unchanged.
- Six actual drawing frames each for the shared painted flame, smoke and electrical-energy materials. Both transient particles
  and held effects advance through the clips. The existing elemental palettes and logical 32px footprint are retained. Other
  painted materials keep their existing animation. Reduced motion holds frame zero while retaining the existing fade cues.

No simulation rules, save keys, item statistics, version or deployment changed. The new menu images and VFX atlas are bundled
into the already cached game.js, preserving offline play. Original credited source sprites are retained alongside generated art.

## Reproduction and review

`python3 tools/art-finish/pack.py` rebuilds the assets and verifies original treant rows. Source layout and provenance are in
`art-source/finishing-pass/README.md`. [Menu contact sheet](../samples/art-finish/menu-contact.png) and
[painted animation preview](../samples/art-finish/spell-motion.gif).

Validation passed:

- `npm run typecheck` and `npm run web`.
- `npm test -- painted-animation cal-journey equipment summon-art cinematic-fx combat-fx vfx ui-standard`: 64 tests passed, no failures or skips.
- `node tools/art-finish/checks.mjs`: 393×852, 360×780 and 412×915 passed; all three traveller portraits and a return portrait,
  three distinct carried pennants, provisions shop, seven distinct empty slots and backing, three treant grades with all hurt
  frames, and all six drawing frames of each selected painted material. Reduced motion held each painted effect on frame zero.
  Rendering checks left simulation state unchanged; no page or console errors were recorded.
- All original treant rows were checked for exact pixel preservation by the packer. New assets use bundled data URLs and
  game.js remains in the generated service-worker cache list.

The browser check exposed that the sanctuary has no old map footer to show oath information. A standard ornate information card
now handles those taps. Captures finish finite CSS fades so the screenshot does not catch a portrait card midway through appearing.
The painted-effects panel is an injected test fixture using the actual shipping material functions; it is not an extra game screen.
These are controlled browser fixtures, not a full campaign playthrough. No full suite or balance sweep was needed.

[Traveller](../samples/art-finish/traveller-pilgrim-393.png) · [Sanctuary](../samples/art-finish/expedition-393.png) ·
[Equipment](../samples/art-finish/empty-equipment-393.png) · [Treant clip](../samples/art-finish/treant-motion.gif) ·
[Browser results](../samples/art-finish/browser-results.json).

Complete locally, with source art, importer and review captures retained. No push, merge or deployment.
