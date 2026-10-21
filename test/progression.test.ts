import { test } from 'node:test';
import assert from 'node:assert/strict';
import { D, DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { fight, place, playOut, startBattle, type Battle } from '../src/sim/battle';
import { bandFor, gradeBoost, stageBoost } from '../src/sim/run';
import { HEROES } from '../src/sim/units';

/** The five starting heroes on stage 5 (the first boss), at the given levels (one per hero, in `HEROES` order). */
function bossFight(seed: number, levels: number[]): Battle {
  const b = startBattle(seed, bandFor(5), stageBoost(5));
  const spots: [number, number][] = [];
  for (let v = D - DEPLOY_ROWS; v < D; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
  HEROES.forEach((id, i) => place(b, id, ...spots[(i * 3) % spots.length], undefined, gradeBoost(1, 0, levels[i])));
  return b;
}

/** Wins in `seeds` fights of the stage 5 boss with the team at those levels. */
function wins(levels: number[], seeds = 40): number {
  let won = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const b = bossFight(seed, levels);
    fight(b);
    playOut(b);
    if (b.phase === 'won') won++;
  }
  return won;
}

test('a fresh first-run team at level 1 loses the stage 5 boss on most seeds', () => {
  const won = wins(HEROES.map(() => 1));
  assert.ok(won <= 8, `${won} of 40 won`);
});

test('the same team at the levels it reaches after run 3 usually wins the boss', () => {
  // the mean level of each starting kind after run 3 in the balance tool's whole-run table (`npm run balance`)
  const won = wins([5, 8, 5, 7, 6]);
  assert.ok(won >= 20, `${won} of 40 won`);
});
