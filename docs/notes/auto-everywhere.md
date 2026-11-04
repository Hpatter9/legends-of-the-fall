# Auto on every beaten repeat run

The owner: "Any repeat runs that have already been beaten should allow an auto. This includes the other difficulty."

Rules live in `src/sim/autoReplay.ts`; the page plays them in `src/main.ts` (the same `autoPrep` / `autoTick` loop, the same
daily `AUTO_TICKETS`, the same recap card). Test: `test/auto-everywhere.test.ts`.

## Has Auto now

| Run | Rule | Where |
| --- | --- | --- |
| Army, any tier (Normal to Mythic) | `canAutoReplay`: the tier has a clear | Armies card, toggle beside Fight! |
| Army with a run already going | same; Auto starts afresh after a second tap ("Lose the run in progress?") | Armies card (the toggle used to vanish) |
| Quest battle won (the eleven ordinary ones) | `canAutoQuest`: won, cast owned | Quest log, Done tab, Auto beside Replay |
| Hero tale battle won | same | same |
| Lost-technique battle won | same | same |
| Eidolon chain battle won, and the Eidolon trial won | same | Eidolons tab, Auto beside Replay |
| Daily cleared today | `canAutoDaily`: today's counted run cleared | Daily start card, Auto beside Practice |

Every auto run spends one of the day's ten tickets and ends in the same recap card. A loss stops it. Quest and daily replays
are practice, so they pay nothing (the recap shows zeros); a quest battle's required cast is always kept in the squad
(`pickSquad`).

## No Auto, and why

- **First clear of anything** (a new army tier, a quest battle not yet won, the daily's first counted run): Auto never skips new content.
- **Story-only battles** are the same battles: their story plays once on the first try and is skipped on a replay, so nothing is lost.
- **The Spire (tower) and the Calamity**: one endless climb with choices on a map, not a repeatable beaten run.
- **The Last Stand**: an endless fight with spending between waves, scored by the best wave, never "beaten".
- **Duchess's rare fights, rift guardians and altars**: they happen inside other runs, they are not runs of their own.
