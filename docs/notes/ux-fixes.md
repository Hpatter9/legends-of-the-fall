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


## Batch 2: the rest of the report (on 0.353.0, the ornate restyle)

The owner's calls: #1 one title sequence, then straight into wave 1; #12 one close button everywhere; #13 a confirm on Sell, no undo toast; #2 untouched.

- #1 A new save goes from the starter pick straight to wave 1's deploy (the board and the deploy tip, with the hire prompt). The opening is the one
  title sequence: the Orc Warband's intro film is marked seen for a new save and does not play behind it (the Scenes list still has it). Home is one tap away.
- #13 Every Sell now asks for a second tap ("Sell for N? Tap again"); before, only Epic pieces and a base's last copy asked.
- #3 Fight HUD: rows are 46 px with 44 px skill chips and 13 px HP/SP numbers for a party of five or fewer (a party over five keeps its compact two-column rows,
  where there is no room); the in-row skill-name overlay is gone (the cut-in banner above the rows already names the skill) and the row flashes its edge instead;
  the spell orbs start at 112 px, below the crest; the AUTO label is 9 px (was 7).
- #9 A lost wave says "Wave N lost · a heart burns, M hearts (lives) left. The party rises." in 20 px, wrapped. (A full defeat card with the first faller and
  Retry / Change party was not built: the revive is automatic and the sim does not record who fell first.)
- #5 Toasts queue (one at a time) in one lane under the top bar (118 px). A road event's card waits for the wave result card to go. An unlock card told in the
  middle of a run is held and told when the home screen opens. Hero quips are not moved (they were already hidden under a film).
- #4 Badges: none on the Battle tab or the main Battle button, "fresh" castle news no longer lights the Castle tab, and the Heroes tab shows the count of heroes
  with an upgrade ready instead of a bare dot.
- #6, #10 Tap targets and text: the Party link is a 44 px button, army tiers, arrows and Back 44 px, dots have a 44 px hit area, Spells' "To the Castle" 44 px;
  small labels on the Overlook, Castle and army picker are 11 px or more. The ornate restyle's own tap floor already covered much of the rest.
- #11 One door per place: the Castle's Tavern/Spells/March shortcuts, the Achievements chip and Reset tips chip are gone (the boss trophy wall button stays: it has no tab).
- #12 Full pages say "‹ Back" (Settings, Achievements and the other home sub-pages, the hero sheet, Hester's Stall, the army picker, War Council, the equipment
  picker, talents, skill books, daily, Calamity, Last Stand). Cards and pop-ups keep "Close". A deviation from the report (which said "×" for sheets): kept as words so the
  one rule is "pages Back, cards Close".
- #7 Films: the picture band is 1.8 x the width (was 1.4), the top bar thinner, the foot 18 % of the height; subtitles are 15 px and the title name 28 px.
- #17 Hero Overview leads with power, health, attack and armour; scores, figures and speeds fold under "Details". The Equipment tab shows "Equip best" and a "More" fold.
- #18 The Spells tab is dimmed with a lock until the Chapel is built; a tap goes to its page, which says why.
- #20 Hester's Stall with visiting traders (seven or eight tabs) shows two rows of 13 px labels.
- #21 The Last Stand picker shows the eight as a strip of portraits above the pool, with portraits and a tick on the picked. (Not screenshotted: the picker would not open in my harness.)

Not done: #19 (the ten-card summon grouping), the quips off the HUD and headings, a defeat card with Retry / Change party, #17's three-up headline (it stacks).
