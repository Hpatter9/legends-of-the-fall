## JRPG-RECAP: a JRPG results screen at a run's end; a simple card between waves

The owner's ask: "A more typical JRPG end-of-fight recap. With a level up showing what stats went up and how much, and so on. Redo the
recap entirely."

### Where it shows (the owner's call)

"I want the between waves to be simple, but the last recap one to be the JRPG results screen."

- **Between waves** (an army's, the daily's or an endless run's next wave, a spire floor or Calamity fight with more to come): the
  simple short card, as before (WAVE-RECAP): the wave won, the gold and crowns, the items as chips, and one short line each for a
  level-up, an ultimate unlocked, a rare drop, the War Horn, a find, the fallen, a heart burned and, new, each quest the wave moved
  ("Quest complete: ...", "Quest: Hunt the wolves 3/5"). It rides over the march and leaves by itself; a tap speeds it on. No XP bars,
  no stat panels.
- **An army's, the daily's or an endless run's last fight**: the same short card, then "Run recap", which is the results screen.
- **A run with no end recap** (a spire climb's or Calamity's last fight, a quest battle's end): the fight's own card is the results
  screen.
- **The Last Stand's end card** is the results screen.

### The results screen

On the run's end recap, a run-ending fight's card and the Last Stand's end card:

- a gold **VICTORY** (or a cold **DEFEAT**) stamped in once, with a soft glow behind it; under it the card's heading as before ("Wave 4 of
  15 won", "Floor 12 cleared", "Army defeated!") and the fight's facts: time, foes felled, heroes standing;
- the star rating as a row of gems (as on the short card);
- **The company**: a row for each hero that fought (portrait, name, level badge, an XP bar). The bar fills live while the XP counts up;
  it empties and fills again at every level crossed, and the badge ticks over. On a level-up the row turns gold, a burst of light leaves
  the face once, a **LEVEL UP!** stamp lands, and the stats that rose open below it: `HP 1,240 → 1,512 +272`, `ATK 96 → 113 +17` (the
  gain in green). Skill 2 at level 10 ("New skill: Holy Bulwark!"), the ultimate at 30 ("Ultimate unlocked: ...!"), and past 30 the deep
  milestones' talent points and badges are announced on the row. A hero that fell is marked **Fell**; the MVP **MVP**. A benched hero
  that rose a level gets its own row (**Bench**); the rest of the bench is one line ("The bench trained: +12 XP each (3 heroes)");
- **MVP of the fight**: face, name with title, and a short line ("Led the charge · 1,240 damage · 3 felled", "Kept the company
  standing", "Held the line", "Cut through the ranks");
- **Spoils**: gold and crowns counted up with their icons (the replay's share or practice noted), "First clear!", and every item the
  fight brought in as an icon with its name (gear by the painted `itemIcon`, run gear, relics, chests, shards, tomes, stones, ores,
  heroes joining);
- the lines the short card told, bar its level lines: the army's rare drop, the War Horn, other finds, the fallen, hearts burned, and
  now the quests: finished, found on a boss, a voice in the rift, and quests that moved on ("Quest: Hunt the wolves 3/5");
- then, as before, the army's run stars, the boss's rift ores, the daily chest, and the button.

A first tap anywhere (or **Skip ▸▸**) runs every count-up to its end; at a fight's end with one way on, a second tap presses that
button. Reduced motion shows the end state at once (`.calm`), with no count, burst or stamp.

The **run's end recap** (army runs, the daily, endless) opens with the same screen over the whole run: each hero's bar fills from where
it began the run (`RunRecap.xpAt`) to now, with the stats risen and skills opened over the run, the run's MVP, and gold earned, crowns
and chests counted up; waves cleared, time fought, gold spent and hearts burned are its facts. The comeback advice, the wave-by-wave
strip and the company's figures follow as before; the old "Experience earned" list is left out there (the rows show it). The spire's
and Calamity's summaries keep their detail unchanged.

The **Last Stand's end card** opens with "THE KING HAS FALLEN", wave, waves cleared, foes felled and heroes held, then the eight in
compact rows: each one's run levels counted up from 0 with the hp and attack those levels added (`stand.ts`' `lvMult` on the hero's
stats as it came in), its kills, the fallen marked, the MVP (most foes felled), and the crowns counted up. The rest of the card's facts
(chests, equipment, ores, relics) follow as they were. The card scrolls when it is taller than the screen.

A long party (more than five rows: the Stand's eight, a Calamity's ten) uses compact rows.

### Files

- `src/sim/jrpgRecap.ts` (pure): `barOf`, `statsAt`, `statRises`, `learntBetween`, `heroGrowth` (before/after XP, levels, bars, stats,
  what opened; `LevelRule` `lasting`, `run` (to 30, `levelBoost`) or `stand`), `standGrowth`, `growthAt` (the bar a share of the way
  through), `countAt`/`ease`, `mvpLine`, `questMoves`/`questLines`, `resultLines` (the card's `waveNotes` without level/ult lines, plus
  the bench and quests), `partyRows`. Tests: `test/jrpg-recap.test.ts`.
- `src/sim/runRecap.ts`: optional `xpAt` and `noteXpStart` (each kind's lasting XP the first time the run paid it).
- `src/jrpgRecapView.ts`: `playResults({head, body}, data)` builds the screen and runs one clock (`render(t)`; `finish` renders the end).
- `src/jrpgResults.ts`: `fightResult` and `runResult` gather the data (faces, icons, quests' progress before and after).
- `src/jrpgRecap.css` (added to the build after `battleReports.css`).
- `src/sim/waveCard.ts`: optional `quests` lines on the short card (`WaveNote` kind `quest`).
- Hooks: `main.ts` (settle builds the data for a run-ending fight with no end recap, `refresh` starts it, the tap, `stopResults` on a
  new fight),
  `index.html` (`#jrHead`, `#jrBody` in `#result`), `recapView.ts` (`RecapHead.results`, `DetailOpts.xp`), `standView.ts` (the end card),
  `waveCardView.ts` (`gainIcon` exported).
- Screenshots: `tools/jrpg-recap/shots.mjs` → `docs/samples/jrpg-recap-*.png`: the card between waves (`between`, `between-haul`; it
  is checked to leave by itself), an army run's last card (`loss-card`) and its end recap (`recap-mid`, `recap`, `recap-end`), a spire
  climb's last fight (`spire-end`), the Stand's eight (`stand8-*`), reduced motion (`calm`).

### For the owner

- Only hp and attack rise with a level in this game (defence and range never do), so those are the stats shown.
