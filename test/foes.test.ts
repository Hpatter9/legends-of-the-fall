import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEPLOY_ROWS } from '../src/sim/board';
import { fight, playOut, startBattle } from '../src/sim/battle';
import { FOE_BANDS, FOES } from '../src/sim/foes';
import { UNITS } from '../src/sim/units';
import { readyBattle } from './helpers';

test('every band starts five of its foes on the foes\' rows', () => {
  for (const [band, ids] of Object.entries(FOE_BANDS)) {
    const b = startBattle(7, band);
    const foes = b.units.filter((x) => x.side === 'foe');
    assert.equal(foes.length, 5, band);
    assert.deepEqual(foes.map((x) => x.def).sort(), [...ids].sort(), band);
    for (const f of foes) assert.ok(f.v < DEPLOY_ROWS, band);
  }
});

test('every band\'s foes exist in UNITS as foes, with sane stats', () => {
  for (const ids of Object.values(FOE_BANDS)) {
    assert.equal(ids.length, 5);
    for (const id of ids) assert.equal(UNITS[id]?.side, 'foe', id);
  }
  for (const [id, def] of Object.entries(FOES)) {
    assert.equal(def.id, id);
    assert.ok(def.hp > 0 && def.atk > 0 && def.range >= 1, id);
  }
});

test('a fight against each band ends', () => {
  for (const band of Object.keys(FOE_BANDS)) {
    for (let seed = 1; seed <= 40; seed++) {
      const b = readyBattle(seed, band);
      assert.ok(fight(b), `${band} seed ${seed}`);
      playOut(b);
      assert.ok(b.phase === 'won' || b.phase === 'lost', `${band} seed ${seed}`);
    }
  }
});

test('the heroes win 20 to 80% of their fights against each band', () => {
  // (the first boss, orcWarlord, is the gate of a run: a fresh team loses it, see `progression.test.ts`)
  for (const band of Object.keys(FOE_BANDS).filter((k) => k !== 'orcWarlord')) {
    let wins = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const b = readyBattle(seed, band);
      fight(b);
      if (playOut(b).phase === 'won') wins++;
    }
    assert.ok(wins >= 8 && wins <= 32, `${band}: won ${wins} of 40`);
  }
});
