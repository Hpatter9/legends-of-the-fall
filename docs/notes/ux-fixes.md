# UX audit fixes

Fixes for the findings of `docs/notes/ux-audit.md` (branch `claude/ux-audit`), in batches. Findings #2 (the Developer menu) and #8's redesign
are left out on the owner's word: Developer stays as it is, and the deploy board still starts empty after the War Council.
"Before" shots are the audit's own, in `docs/samples/ux-audit/` on that branch; "after" shots are in `docs/samples/ux-fixes/`.

## Batch 1: words, tips and small layouts

- #23 Words: the achievements say waves ("Win a wave", "Ten Waves", "Twenty Waves", "Thirty Waves"; the ids are unchanged, so saves keep them).
  The first tip names the real button: "Tap Choose your battle to send your heroes out."
- #15 A game tip (deploy, fight and so on) waits while the party picker, Settings, a card or a film is over the board (`pageUp` in `tips.ts`).
- #22 An end card whose own button goes to the place leaves out its "Where:" line.
- #16 "Open all" sits inside the stash box (it ran 7 px off the left edge) and is 44 px tall.
- #14 The Upgrades list header counts what "Upgrade all" would take, so the two numbers agree; Awaken uses the game's green primary button.
- #13 Sell is a small button under a full-width Equip. Epic pieces and the last of a base still ask for a second tap.
- #12 (part) A Settings sub-page shows only its "‹ Back" (no second Close). The equipment picker's way back is a "‹ Back" at its top,
  so the sheet's Back is the only one at the foot.
- #8 (the owner's variant) The empty deploy board shows "Hire to start..." above a lit Hire button (`#hireHint`); Fight! stays dim until a hero is placed.

Left for later batches: #1's flow (straight into wave 1, one title sequence), the rest of #12 (every page's close button), #13's undo toast.
