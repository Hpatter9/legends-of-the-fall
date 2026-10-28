// Saves from before the hero kits (COMBAT-002) still load and play: a meta with no Auto switch, and runs whose heroes carried the old skill charge
// and ultimate charge (0 to 100) between waves, read now as the share of the pool and the ultimate's meter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fight, place, playOut, type Battle } from '../src/sim/battle';
import { DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { loadMeta } from '../src/sim/meta';
import { loadRun, newRun, saveRun, startStage, boostOf } from '../src/sim/run';
import { HEROES } from '../src/sim/units';

const store = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};

test('a meta saved before the hero kits has no Auto switch: the ultimates wait for the tap', () => {
  const s = store();
  s.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 100, unlocked: [...HEROES], party: [...HEROES], pulls: 0, dry: 0, castle: {}, shards: {}, stars: {}, xp: {} }));
  const m = loadMeta(7, s);
  assert.equal(m.ultAuto, undefined);
  assert.equal(!!m.ultAuto, false);
});

test('a run saved with the old skill and ultimate charge carries them in as the pool and the meter, and plays a wave', () => {
  const s = store();
  const run = newRun(9, HEROES);
  run.roster[0].charge = 73;
  run.roster[0].charge2 = 40;
  saveRun(run, s);
  const loaded = loadRun(s)!;
  const b: Battle = startStage(loaded);
  const spots: [number, number][] = [];
  for (let v = b.board.d - DEPLOY_ROWS; v < b.board.d; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
  loaded.roster.forEach((h, i) => place(b, h.kind, spots[i][0], spots[i][1], h.id, boostOf(h)));
  const first = b.units.find((u) => u.tag === loaded.roster[0].id)!;
  assert.equal(first.charge, 73, 'the old charge is the share of the pool');
  assert.equal(first.charge2, 40, 'the old ultimate charge is the meter');
  assert.ok(fight(b));
  playOut(b);
  assert.ok(b.phase === 'won' || b.phase === 'lost');
});
