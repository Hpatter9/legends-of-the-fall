// The Last Stand has its own mode flag in the battle's AI (`Battle.stand`); an ordinary fight must play out exactly as it
// did before the flag existed. These fights were played on the code as it stood before the Last Stand (re-pinned on main 0.150.0, which had changed the AI and the board, and again for COMBAT-002, whose hero kits change how the heroes fight), and their outcomes
// are pinned here: the same seeds must give the same fights.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { fight, place, playOut, startBattle } from '../src/sim/battle';
import { FIELD_BANDS } from '../src/sim/foes';
import { HEROES } from '../src/sim/units';
import { stageBoost } from '../src/sim/run';
import { AILMENT_SWITCH } from '../src/sim/ailments';

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

// (STATUS-FX's ailments change ordinary fights on purpose, so these are played under the rules they were pinned on: the ailments off, which
// `ailments-identical.test.ts` holds to main's fights before the ailment model)
test('ordinary fights play out as they did before the Last Stand', () => {
  const was = AILMENT_SWITCH.on;
  AILMENT_SWITCH.on = false;
  try {
    const got = SEEDS.map(([seed, stage]) => signature(seed, FIELD_BANDS[seed % FIELD_BANDS.length], stage));
    assert.deepEqual(got, PINNED);
  } finally {
    AILMENT_SWITCH.on = was;
  }
});

// (re-pinned for STATS batch 4, docs/notes/stats-4.md: every ordinary blow now rolls a d20 against Armour Class and every fighter rolls
// initiative, so every fight moves; before it, for the skills overhaul's batch 2, docs/notes/skills-1.md)
const PINNED: string[] = [
  'won 13500 5/0 236392521', 'won 25200 5/0 1726175922', 'won 28800 2/0 1046403243', 'lost 22500 0/3 2729522844', 'lost 11800 0/4 2060110542', 'won 15200 4/0 1096069142',
  'lost 18200 0/2 810896742', 'lost 14500 0/4 2082392979', 'won 18100 4/0 896813566', 'lost 13200 0/5 2465024716', 'lost 21000 0/4 3171264422', 'lost 11800 0/5 2397442154',
];
