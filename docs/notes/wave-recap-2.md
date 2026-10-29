# The short card for the spire and the Calamity — WAVE-RECAP-2

Owner: Claude. Branch: `claude/wave-recap-2` (from main 0.223.0). Follows [WAVE-RECAP](wave-recap.md).

The owner, answering whether the spire and the Calamity should get the short card too: "Yeah, give them the same treatment".

## Every fight's card is short

Every spire floor and every Calamity fight now has the short card (`#result.short`), as the army and the daily do:

- **A won fight** shows the see-through card over the board: "Floor 12 cleared", "Act 2 cleared!", "Spot cleared" or
  "Map 3 cleared!" (`towerHeadline`, `src/sim/waveCard.ts`), the pay line, the stars and the one-liners (levels gained, an
  ultimate unlocked, finds, the fallen). There is no march here. Like the daily's, the card holds for `PASS_NO_MARCH_MS`
  (3.2 s), fades and goes to the map by itself (a tap goes on at once). The screens that need a decision keep their own place
  after it: the map and its spots, an elite's relic choice, a cleared map's recap with "On to map N", shops, recruits and events.
- **A lost fight** (the run is over: neither has hearts) gives the short last card ("Fell on floor 14", "The party falls"), with
  the existing one-line outcome and "See the summary".

So the performance table and the XP cards are gone from every card. `showStats`, `showXp` and `showBench` in `main.ts` are
removed, with their imports. `passOn` drops the card's see-through look itself, because the spire and the Calamity go to their
map with no new battle to clear it.

## The detail is in their summaries

`recapView.ts` now exports `recapDetail(recap, { strip, prefix, noSpoils? })`: the fight-by-fight strip (each fight's number,
stars or "Lost", time and MVP), the company's damage, healing and kills with the MVP, the XP and levels gained, and the spoils
found. The run's recap uses it ("Wave by wave", `W4`), and so do these:

- **The spire's end summary and the Calamity's** (`TowerView.showSummary`): "Floor by floor" (`F12`) or "Fight by fight"
  (`#7`, the Calamity's stage stands still, so its fights are numbered by `run.recap.fights`), from `run.recap`. The summary's own
  "Equipment found" lines give way to the detail's spoils when the run kept them.
- **The Calamity's victory screen**: the whole calamity's detail under the finishing reward.
- **The Calamity's map recap** (shown once, as a map is cleared): that map's share. Its finds stay in the recap's own groups.

The map's share is kept by the sim (`src/sim/runRecap.ts`). `recapSince(now, then)` is what a recap gained since an earlier
copy: figures, XP, crowns, each kind's levels counted from where the copy left them, and the fights since. `closeMapLeg(run)`,
called as each fight is settled, puts the share on `mapDone.detail` (and its copy in `recaps`) once a map's boss has fallen. It
then keeps a copy of the recap so far as `tower.recapAt` for the next map. Both new fields are optional: a save from before
shows its map recaps and summaries as they were. Fights play out the same, and no stream is drawn.

The detail's look reuses the recap's: `battleReports.css`'s `#recap` rules for the strip, the heroes, the XP and the spoils
now read `:is(#recap, .rcDetail)`, and `.rcDetail` carries the report surface and rim inside `#towerMap`.

## The spire today

The home screen's Tower button opens the Last Stand, so a new spire climb is not started from the menus. Only a climb saved
from before (resumed through the run slot) plays the spire. The change covers it all the same.

## Checks

- `npm run typecheck`, `npm run web`.
- `npm test -- wave-recap`: 7 tests, including the new tower headline, `recapSince` and `closeMapLeg` (closed once, the next map
  counting from the copy, through a save round trip).
- Full `npm test`: 1436 tests, 0 failures.
- `tools/wave-recap/tower-shots.mjs` (Chromium, the built game; fresh saved runs from `tools/wave-recap/saves.ts`, resumed). For
  the spire, floor 1 is won: the card holds, then goes to the map by itself. Floor 2 is lost: the short last card, then the
  summary with "Floor by floor", five heroes' performance with the MVP, and five XP rows. For the Calamity, a spot's fight is
  won (the card, then the map), the map recap is shown with the run's real detail under a labelled fixture map (no map was played
  to its boss), then a fight is lost (the short last card, then the summary with "Fight by fight"). At 393x852, 360x780 and
  412x915: no page errors and no horizontal overflow. Screenshots are `docs/samples/wave-recap-2-*.png` (files with `fixture` in
  the name use the fixture map). The results are in `wave-recap-2-checks-*.json`.
- `tools/wave-recap/shots.mjs` (the army flow from WAVE-RECAP) re-run at 393x852 after the clean-up: it passed.
