// DEPTH-BUILD (docs/notes/depth-build.md): the Chapel's rooms, the Vigil and Last Rites.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fight, hurt, reviveParty, stepBattle, type BattleEvent } from '../src/sim/battle';
import { applyVigil, RITES, ritesSpent } from '../src/sim/chapelRooms';
import { armyRun, noteFight, startStage } from '../src/sim/run';
import { newCastle } from '../src/sim/castle';
import { readOrders } from '../src/sim/march';
import { readyBattle } from './helpers';

test('a heart burns with each Vigil choice: shielded, swift or cleansed', () => {
  for (const vigil of ['shielded', 'swift', 'cleansed'] as const) {
    const b = readyBattle(4, 'skeletons');
    fight(b);
    const heroes = b.units.filter((u) => u.side === 'hero');
    for (const h of heroes) {
      h.alive = false;
      h.hp = 0;
      h.ail = [{ kind: 'burn', until: 1e9, by: 0 } as never];
    }
    b.phase = 'lost';
    assert.ok(reviveParty(b));
    const out: BattleEvent[] = [];
    applyVigil(b, heroes, vigil, out);
    for (const h of heroes) {
      if (vigil === 'shielded') assert.equal(h.shield!.hp, Math.round(h.maxHp * RITES.SHIELD));
      if (vigil === 'swift') assert.equal(h.hasteUntil, b.t + RITES.HASTE_MS);
      if (vigil === 'cleansed') assert.ok(!(h.ail ?? []).some((a) => a.kind === 'burn'));
    }
  }
  assert.deepEqual(readOrders({ vigil: 'swift' }), { vigil: 'swift' });
  assert.equal(readOrders({ vigil: 'sideways' }), undefined);
});

test('Last Rites: the first hero to fall rises at 15% of health after 10 s, once a fight', () => {
  const b = readyBattle(4, 'skeletons', { rites: true });
  fight(b);
  const [a, c] = b.units.filter((u) => u.side === 'hero');
  const foe = b.units.find((u) => u.side === 'foe')!;
  hurt(b, foe, a, a.hp + 999, true, false, []);
  assert.equal(a.alive, false);
  hurt(b, foe, c, c.hp + 999, true, false, []);
  const t0 = b.t;
  let rose = false;
  while (b.t < t0 + RITES.DELAY_MS + 200 && b.phase === 'fight') {
    const out = stepBattle(b);
    if (out.some((e) => e.kind === 'revive' && e.to === a.id)) {
      rose = true;
      assert.ok(b.t >= t0 + RITES.DELAY_MS);
      assert.equal(a.hp, Math.round(a.maxHp * RITES.HP));
    }
  }
  assert.ok(rose, 'the first to fall rose');
  assert.equal(c.alive, false, 'the second did not');
  assert.ok(ritesSpent(b));
});

test('Last Rites comes once a run, only with the Chapel at level 3, and plays the same every time', () => {
  const castle = { ...newCastle(), chapel: 3 };
  const r = armyRun(9, 'orcs', undefined, castle);
  const b = startStage(r);
  assert.deepEqual(b.rites, {});
  assert.equal(startStage(armyRun(9, 'orcs', undefined, { ...newCastle(), chapel: 2 })).rites, undefined);
  b.rites!.done = true;
  noteFight(r, b);
  assert.equal(r.ritesUsed, true);
  assert.equal(startStage(r).rites, undefined, 'spent for the run');
  const play = () => {
    const x = startStage(armyRun(9, 'orcs', undefined, castle));
    let n = 0;
    while (x.phase !== 'deploy' && x.phase === 'fight' && n < 3000) (stepBattle(x), n++);
    return JSON.stringify(x.units.map((u) => [u.def, u.u, u.v, u.hp]));
  };
  assert.equal(play(), play());
});
