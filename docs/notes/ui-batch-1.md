# UI batch 1

Four small asks from the owner.

1. **Party power.** The party screen's "Company roll" line reads "3 / 5 ready · Party power 12,345": the sum of each chosen hero's
   `kindPower` (the number on the roster cards), so it moves as heroes are swapped (`partyPower` in `src/sim/power.ts`).
2. **The daily is an icon.** On the camp it is a small square hourglass button at the right edge above the Battle bar (it no longer
   takes a plaque's width across the scene). A red dot while untried, a green check once today's daily is cleared; a tap opens it as
   before. The boss and its standing are its tooltip and spoken label (`overlookLayout.ts`, `home.ts`, `campPlaces.css`).
3. **Take me there.** Every active quest row, and the going part of an Eidolon chain, has the button. `src/sim/questGoto.ts` maps a
   goal to a destination:
   - `battle` goal: that quest battle (the log's own Fight stays on those rows).
   - `clearDaily`, or any goal with `mode: 'daily'`: the daily's start card.
   - `standWave`, `standRoom`, `holdLine`, or `mode: 'tower' | 'stand'`: the Last Stand.
   - `calGuardian`, `calClear`, or `mode: 'calamity'`: the Calamity.
   - Fight goals (`wavesWon`, `bossDown`, `kills`, `clearArmy`, `tally`, `ults`, `spells`, `duos`, `teamCombo`, `mvp`): the army the goal
     names (its `army`, `ofArmy`, the army whose boss or foes it names) on its tier, else the war table's next army on Normal: the party
     screen, ready to march. An army or tier not open yet opens the Armies screen on it; a shut Last Stand or Calamity does the same.

   The `never` check in `destinationOf` stops the build when a new goal kind has no destination, and `test/quest-goto.test.ts` runs every
   quest (gives, tales, lost techniques included), every Eidolon chain part and every trial through it, on a fresh save and a fully open one.
4. **Built popup.** A finished building no longer plays the castle cinematic: `src/builtCard.ts` puts up a small card (picture, name,
   level, what it gives; the Chapel says the spellbook is open), and a tap anywhere closes it. The words are `builtWords` in
   `src/render/castleSpots.ts`. The castle scene is still in the codex's list to watch again.

Shots: `docs/samples/ui-batch-1-{party,daily,dailydone,quest,built}-<w>x<h>.png` at 393x852, 360x780 and 412x915.
