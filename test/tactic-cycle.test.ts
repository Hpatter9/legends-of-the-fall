import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { fight, place, startBattle, stepBattle, type Battle, type Unit } from '../src/sim/battle';
import { DEPLOY_ROWS } from '../src/sim/board';
import { replayLog } from '../src/sim/orders';
import { CHARGE, chargeMove, fightTactic, heldBy, HOLD_CAP, nextTactic, orderTactic, setTactic, TACTIC_CYCLE, type Tactic } from '../src/sim/tactics';

// TACTICS-OVERVIEW (docs/notes/tactics-overview.md): the fight's tactic button cycles Advance together, Hold the line, Charge, and back,
// and the change takes effect in the running fight, through a queued order applied at the next tick and kept in the log.

function field(tactic: Tactic, seed = 11): Battle {
  const b = bareBoard(startBattle(seed, 'skeletons'));
  const front = b.board.d - DEPLOY_ROWS;
  place(b, 'knight', 3, front);
  ['kunoichi', 'werewolf', 'archer'].forEach((k, i) => place(b, k, 1 + 2 * i, front + 1 + (i % 2)));
  setTactic(b, tactic);
  return b;
}
const unit = (b: Battle, kind: string): Unit => b.units.find((u) => u.def === kind)!;
const ending = (b: Battle) => JSON.stringify({ phase: b.phase, t: b.t, units: b.units.map((u) => [u.def, u.hp, u.u, u.v]) });

test('the cycle: Advance together, Hold the line, Charge, and back to Advance', () => {
  assert.deepEqual(TACTIC_CYCLE, ['advance', 'hold', 'charge']);
  assert.equal(nextTactic('advance'), 'hold');
  assert.equal(nextTactic('hold'), 'charge');
  assert.equal(nextTactic('charge'), 'advance');
});

test('a change is refused before the fight, in the Last Stand, and to the tactic already playing', () => {
  const b = field('advance');
  assert.equal(orderTactic(b, 'hold'), false, 'before the fight: setTactic picks');
  fight(b);
  assert.equal(orderTactic(b, 'advance'), false, 'already advancing');
  const s = field('advance');
  s.stand = {} as Battle['stand'];
  fight(s);
  assert.equal(orderTactic(s, 'hold'), false);
});

test('a change waits for the next tick, shows at once as the fight\'s tactic, and takes effect then', () => {
  const b = field('advance');
  fight(b);
  for (let i = 0; i < 3; i++) stepBattle(b);
  assert.equal(orderTactic(b, 'hold'), true);
  assert.equal(fightTactic(b), 'hold', 'the button shows the change at once');
  assert.equal(b.tactic?.kind, 'advance', 'not applied yet');
  stepBattle(b);
  assert.equal(b.tactic?.kind, 'hold');
  // (Hold: every hero held, the cap counted from the change)
  assert.equal(b.tactic!.held.length, 4);
  assert.ok(b.tactic!.since! > 0 && b.tactic!.since! <= b.t);
  assert.equal(b.log!.at(-1)!.kind, 'tactic');
  assert.ok(heldBy(b, unit(b, 'archer')));
});

test('Charge mid-fight lets a held party go with the edge, once a fight; a charge after cycling round gives no second edge', () => {
  const b = field('hold');
  fight(b);
  for (let i = 0; i < 3; i++) stepBattle(b);
  assert.ok(heldBy(b, unit(b, 'kunoichi')));
  orderTactic(b, 'charge');
  const ev = stepBattle(b);
  assert.ok(ev.some((e) => e.kind === 'lineMet' && e.how === 'charge'));
  assert.equal(heldBy(b, unit(b, 'kunoichi')), false);
  assert.equal(b.tactic!.edgeAt, b.t);
  assert.equal(chargeMove(b, unit(b, 'kunoichi')), CHARGE.MOVE);
  // (round the cycle: Advance ends the edge, Hold, then Charge again gives none)
  orderTactic(b, 'advance');
  stepBattle(b);
  assert.equal(chargeMove(b, unit(b, 'kunoichi')), 1, 'the edge ends when the party advances again');
  orderTactic(b, 'hold');
  stepBattle(b);
  orderTactic(b, 'charge');
  stepBattle(b);
  assert.equal(b.tactic!.kind, 'charge');
  assert.equal(chargeMove(b, unit(b, 'kunoichi')), 1, 'no second edge');
});

test('Charge called once the line has met the foe unleashes the party but gives no edge', () => {
  const b = field('advance');
  fight(b);
  while (b.phase === 'fight' && b.tactic!.metAt === undefined) stepBattle(b);
  orderTactic(b, 'charge');
  stepBattle(b);
  assert.equal(b.tactic!.kind, 'charge');
  assert.equal(b.tactic!.edgeAt, undefined);
});

test('Hold set mid-fight lets the party go when its cap has passed, counted from the change', () => {
  const b = bareBoard(startBattle(11, 'skeletons'));
  place(b, 'archer', 3, b.board.d - 1);
  setTactic(b, 'charge');
  fight(b);
  // (the foes kept far away, so only the cap can end the hold)
  for (const f of b.units.filter((u) => u.side === 'foe')) f.busyUntil = 1e9;
  for (let i = 0; i < 20; i++) stepBattle(b);
  orderTactic(b, 'hold');
  stepBattle(b);
  const from = b.tactic!.since!;
  while (b.t - from < HOLD_CAP - 100) {
    stepBattle(b);
    assert.equal(b.tactic!.metAt, undefined, `still held at ${b.t}`);
  }
  while (b.t - from < HOLD_CAP + 200) stepBattle(b);
  assert.ok(b.tactic!.metAt !== undefined);
});

test('a fight with changes is deterministic, and replays from its log', () => {
  const run = () => {
    const b = field('advance', 7);
    fight(b);
    let i = 0;
    while (b.phase === 'fight') {
      if (i === 10) orderTactic(b, 'hold');
      if (i === 40) orderTactic(b, 'charge');
      if (i === 90) orderTactic(b, 'advance');
      stepBattle(b);
      i++;
    }
    return b;
  };
  const a = run();
  const c = run();
  assert.equal(ending(a), ending(c));
  assert.equal(a.log!.filter((e) => e.kind === 'tactic').length, 3);
  const again = field('advance', 7);
  fight(again);
  while (again.phase === 'fight') {
    replayLog(again, a.log ?? []);
    stepBattle(again);
  }
  assert.equal(ending(again), ending(a));
  // (and the changes do change the fight)
  const plain = field('advance', 7);
  fight(plain);
  while (plain.phase === 'fight') stepBattle(plain);
  assert.notEqual(ending(plain), ending(a));
});
