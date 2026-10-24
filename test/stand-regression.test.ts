// The Last Stand has its own mode flag in the battle's AI (`Battle.stand`); an ordinary fight must play out exactly as it
// did before the flag existed. These fights were played on the code as it stood before the Last Stand (re-pinned on main 0.150.0, which had changed the AI and the board), and their outcomes
// are pinned here: the same seeds must give the same fights.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { fight, place, playOut, startBattle } from '../src/sim/battle';
import { FIELD_BANDS } from '../src/sim/foes';
import { HEROES } from '../src/sim/units';
import { stageBoost } from '../src/sim/run';

/** One fight in a line: who won, how long it took, who is left standing, and the fight's random stream. */
function signature(seed: number, band: string, stage: number): string {
  const b = startBattle(seed, band, stageBoost(stage));
  const spots: [number, number][] = [];
  for (let v = b.board.d - DEPLOY_ROWS; v < b.board.d; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
  HEROES.forEach((id, i) => place(b, id, spots[i * 2][0], spots[i * 2][1]));
  fight(b);
  playOut(b);
  const alive = (side: string) => b.units.filter((x) => x.alive && x.side === side).length;
  return `${b.phase} ${b.t} ${alive('hero')}/${alive('foe')} ${b.rng}`;
}

const SEEDS: [number, number][] = [[1, 1], [2, 3], [3, 5], [4, 8], [5, 12], [6, 2], [7, 6], [8, 10], [9, 4], [10, 15], [11, 7], [12, 20]];

test('ordinary fights play out as they did before the Last Stand', () => {
  const got = SEEDS.map(([seed, stage]) => signature(seed, FIELD_BANDS[seed % FIELD_BANDS.length], stage));
  assert.deepEqual(got, PINNED);
});

const PINNED: string[] = [
  'won 10600 5/0 996110585', 'won 25700 4/0 2485893986', 'lost 27200 0/2 414567573', 'lost 15000 0/4 2353451962', 'lost 13200 0/4 1364333675', 'won 14600 5/0 1727904812',
  'lost 14500 0/4 2770344949', 'lost 10300 0/5 2210275373', 'won 16800 4/0 3360215049', 'lost 13500 0/5 3032919189', 'lost 25000 0/4 771804136', 'lost 11800 0/5 501935144',
];
