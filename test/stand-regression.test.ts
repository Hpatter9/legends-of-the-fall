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

// (re-pinned for STATS batch 6, docs/notes/stats-6.md: the starting five's pools, cooldowns and AI (the Samurai and Kunoichi flank, the Archer
// kites) moved all twelve; the third, a close win, is now lost at the minute. Before it, for STATS batch 5, docs/notes/stats-5.md: a saving throw rolls in every fight with an ailment, a shove or a blast; seven of the
// twelve moved, each won or lost as before. Before it, for STATS batch 4, docs/notes/stats-4.md: every ordinary blow now rolls a d20 against Armour Class and every fighter rolls
// initiative, so every fight moves; before it, for the skills overhaul's batch 2, docs/notes/skills-1.md)
const PINNED: string[] = [
  'won 14100 5/0 236392521', 'won 30500 3/0 2798023671', 'lost 59900 0/1 1862486204', 'lost 22400 0/4 3929252987', 'lost 12300 0/4 3891676355', 'won 15000 5/0 4191306295',
  'lost 19900 0/2 3274298225', 'lost 9900 0/5 2842111043', 'won 16700 5/0 2096543709', 'lost 11000 0/5 1897130243', 'lost 31500 0/3 643921742', 'lost 11800 0/5 4229007967',
];
