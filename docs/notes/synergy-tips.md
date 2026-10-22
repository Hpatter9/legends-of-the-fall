# Synergies you can see, and tips for the newer systems

**Synergies in a fight** (`src/synergyView.ts`, called from `Game.begin` and `layout` in `main.ts`). When a fight starts, a banner
fades in once over the board ("Samurai 4/4: +10% attack", up to three lines and "and N more"), and a steady row of trait badges
(gold when the trait is at its top tier) sits under the top bars for the whole fight. Tapping the row lists every active tier.
Nothing loops. The row's elements and styles are made by the module, and the row has a fixed height so the board is fitted below it.

**Deploy chips** (`refreshTraits` in `main.ts`). Each chip shows the count and what its next tier gives; the line under the strip names
the trait nearest its next tier ("Samurai: 1 more hero for +1% attack"). When placing a hero wakes a tier, that chip pops once and
the line says "Synergy active!". Pure text rules are in `sim/traits.ts` (`activeTier`, `nextTierLine`, `closestTrait`).

**Suggest** (`sim/suggest.ts`, the button in `party.ts`). `suggestParty(owned, size, power)` climbs greedily from each possible first hero,
scoring tiers woken (higher tiers count more) and roles covered (`roleOf`: front, striker, back, support, from traits and stats).
Ties go to the stronger party, then name order, so it is deterministic. It only fills the draft; Start or Done saves it.

**Tips** (`tips.ts`, `systemTips.ts`). Ten new one-time tips: calamity, tower, talents, castle, spellbook, stash, equipment, recycle,
retry, autoReplay. Each has a finder that returns its element only when it is on show, enabled and not covered, so a tip comes the
first time the player can really see the system. They wait until the first tip has been seen, and "Skip tutorial" marks them all
seen. Existing players have none of the new ids stored, so each shows once after this update. Tests: `suggest`, `synergy-lines`, `tips`.
Screenshots: `docs/samples/synergy-tips-*.png` (`tools/synergy/shots.mjs`).
