# Fight stats and boss introductions

**Fight stats.** `src/sim/fightStats.ts` tallies each hero's damage dealt, damage taken, healing done and kills from the
events `stepBattle` returns. A tally starts from the heroes placed (`startStats`), and `tally` adds each tick's events.
The one hook in the sim: heal events now carry `by`, the healer's unit id (the Sanctuary, leech, regrowth and mending
passives). The king's own heal spell has no `by`, so it counts for no hero. The MVP (`mvpOf`) is the hero with the most
damage and healing dealt, plus half the damage taken. The result screen shows a `#fightStats` panel under the stars:
one row a hero, a small bar per number scaled to the best hero, and a crown on the MVP.

**Boss introductions.** On a boss stage (the foe with a `size`, drawn larger), the card "THE ORC WARLORD" and its
one-line `role` as the epithet show for about 2 s over the board during deploy. The camera glides to the boss and zooms
by a quarter, and the screen rumbles (`Fx.rumble`) with a low boom (`boom` in `sound.ts`). A tap skips it. A stage's card
plays once per session (keyed by seed and stage, in memory), so restarting the same stage does not replay it; a page
reload does. During the fight a wider health bar under the title bar shows the boss's name and health, and hides when
the boss falls.

Both are page code only (`src/main.ts`, `src/index.html`); the sim changes are the heal `by` and the new module.
