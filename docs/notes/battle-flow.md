# Battle flow

The battle screen and the run flow, as the owner asked for them.

**After-wave report.** The XP rows show the hero as it fought: the highest grade of the kind in the fight, in that grade's
form (`formOf`), at 56 px in a 60 px frame (grade 2 and 3 get the silver and gold frames the bench cards use), so the whole
figure shows.

**Bench.** The bench is the roster minus the squad, at most `BENCH_MAX` = 10 (`run.ts`: `benchFull`, `hireBlock`).
Hire is refused when it is full (the button reads "Bench full", the status line says why). Since MERGE-TWO
(`merge-two.md`) nothing merges on its own, so a full bench refuses every hire: the player merges a pair, recycles a hero or
fields one to make room (it used to let through a hire that would merge three of a kind). Lucky summons come from the same hire, so they obey it too. The cards
are compact (portrait 46 px, name, level, health bar; the power is in the tap tooltip) so ten fit in two rows with no
scrolling at 393x852, 360x780 and 412x915. During a wave the bar shows only the units on the field.

**Recycling.** It pays half of the current Hire price (`recycleValue(run)` = `max(1, round(summonCost / 2))`), whatever
the hero's grade or cost. Dragging a bench card shows a "Recycle" drop area over the far left of the bench (deploy phase
only); letting go over it sells the hero, and a grade 2 or 3 hero asks first ("Recycle the ★★ Samurai for N gold?").
The tap-then-Recycle button on a chosen card stays.

**Pack.** During a run the Pack lists only the heroes on the field. "Equip best" (`runGear.ts`, `equipBestRun`) gives each
slot's best pieces (the pack's and what is worn) to the fielded heroes, highest grade first, and returns the rest to
the pack. It works before a fight; in a fight the pack is read-only as before, since gear restarts the stage.

**Retry.** A lost wave (not in the tower, not in an auto-replay) is not settled at once: the result shows "Retry wave ·
N left" beside "Give up". `retryWave` (`run.ts`) uses one of `MAX_RETRIES` = 2, pays `retryGold` = one Hire at its
current price (so a retry buys about one more hero), and replays the same stage and buff. Giving up, or a loss with no
retries left, settles the loss as before and the run ends. Daily challenges can retry too.

**Two-second wait.** After the last kill the board stays for `END_WAIT_MS` = 2000 ms (the deaths play out) before the wave
recap or the retry prompt shows. An auto-replay skips the wait.

**Run recap.** `runRecap.ts` keeps `run.recap` (optional, so old saves load): fights, waves cleared, time, gold earned
and spent, each kind's damage, healing, taken and kills summed from the per-wave `fightStats` rows (retried goes included),
plus XP, levels gained, crowns and chests. When a run ends (an army cleared, a defeat with no retries left, or giving up)
"Run recap" opens `recapView.ts`: a scrolling sheet of pixel panels with hero portraits, the MVP (by `fightStats`' own
score) and the XP and levels. Parts fade in once; nothing loops. The tower keeps its own summary.

Gold "earned" counts wave pay, recycling and retry gold; events and merchants that edit gold directly are not counted.

Screenshots: `docs/samples/battle-flow-*.png`, made by `tools/audit/battle-flow.mjs`.

> Superseded: there is no "Give up" or "Use a heart" card any more; see `heart-revive.md`.
