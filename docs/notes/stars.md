# Stars

`src/sim/stars.ts` rates a won stage from the finished battle: one star for the win, one more if no hero fell, and one
more if the fight was won within a time (30 s; 45 s on a boss stage). A loss is no stars.

- **Rewards**: each star adds 3 crowns (`earn`, on top of the stage's own pay) and 5 gold (`finish`, on top of the
  stage's gold). So three stars pay 9 crowns and 15 gold more.
- **Meta**: `Meta.stars` keeps the best stars won on each stage, keyed by the stage number (`recordStars` only ever
  raises one). Old saves load with none; bad entries are dropped. `starSummary` gives the home screen's line: the
  furthest stage with stars and the stars won across all stages ("Best: stage 12, 31 stars").
- **Result screen**: after a win, one row per rule pops in a beat apart (CSS `starIn`), earned ones lit with their
  pay and a chime (`play('star')`); a lost fight shows no stars.
- Tests: `test/stars.test.ts`.
