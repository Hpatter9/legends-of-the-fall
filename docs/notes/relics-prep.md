# Relics on the wave-prep screen only (RELICS-PREP)

The owner: "The party relic doesn't need to be in the battle screen during a wave, just the wave prep screen." Branch `claude/relics`.

## What changed

- The run's relic strip (`#relics`, the row of small relic icons in the bottom panel, drawn by `EventView.drawStrip` in `src/events.ts`)
  now shows on the wave-prep (deploy) screen only. One rule in `src/index.html` hides it whenever `body[data-phase]` is not `deploy`:
  in the fight, and on the won or lost card after it. The strip is still drawn and kept up to date in every phase, so it is there,
  unchanged, the moment the next wave's prep opens.
- Reading a relic in prep: tap its icon (as before) and a line under the strip says its name and what it does; a relic of a set now
  also says where the set stands, "Ember Ruby: +6% attack for every hero (Fire set 3/4)" (`setOf`, `setCount` from `relicSets.ts`).
  Tap it again to close the line. The Pack (prep's Pack button) still lists every relic in full.
- Nothing else moves: the tower's map header, the Last Stand's break and the event cards show relics as they did, and no rule changed.

## Checks

- `tools/relics/prep-shots.mjs [root] [port]` (after `npm run web`): a new run with seven relics set by hand (a presentation fixture),
  one tapped, at 393x852, 360x780 and 412x915; it checks the strip shows in prep with the line read out and no sideways scroll, then
  presses Fight! and checks the strip is gone. All three sizes pass, no page errors.
- Screenshots: `docs/samples/relics-prep-393x852.png`, `-360x780.png`, `-412x915.png` (prep, a relic read out) and
  `docs/samples/relics-prep-fight-393x852.png` (the fight, no strip).

The redesign of the relics themselves (the owner's second ask) is a proposal awaiting approval: `docs/notes/relics-redesign.md`.
