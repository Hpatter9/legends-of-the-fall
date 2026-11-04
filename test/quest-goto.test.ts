import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES, armyById } from '../src/sim/armies';
import { startedMeta } from '../src/sim/meta';
import { CHAINS } from '../src/sim/eidolonChainData';
import { TRIALS } from '../src/sim/eidolonTrials';
import { questBattleById } from '../src/sim/questBattles';
import { QUESTS, type Goal, type GoalKind } from '../src/sim/questData';
import { destinationOf, type Destination } from '../src/sim/questGoto';
import { TIERS } from '../src/sim/tiers';

/** One sample goal of every kind: a new goal kind must be added here (the type makes it so), and so given a destination. */
const SAMPLES: Record<GoalKind, Goal> = {
  wavesWon: { kind: 'wavesWon', n: 3 },
  bossDown: { kind: 'bossDown', n: 1 },
  kills: { kind: 'kills', n: 10 },
  clearDaily: { kind: 'clearDaily', n: 1 },
  clearArmy: { kind: 'clearArmy', n: 1 },
  tally: { kind: 'tally', n: 100, stat: 'dealt' },
  ults: { kind: 'ults', n: 6 },
  spells: { kind: 'spells', n: 3 },
  duos: { kind: 'duos', n: 2 },
  teamCombo: { kind: 'teamCombo', n: 1 },
  mvp: { kind: 'mvp', n: 1, by: {} },
  calGuardian: { kind: 'calGuardian', n: 1 },
  calClear: { kind: 'calClear', n: 1 },
  standWave: { kind: 'standWave', n: 5 },
  standRoom: { kind: 'standRoom', n: 2 },
  holdLine: { kind: 'holdLine', n: 1 },
  battle: { kind: 'battle', n: 1, battle: 'kennelFires' },
};

/** A destination that leads somewhere real. */
function valid(d: Destination | undefined, what: string): void {
  assert.ok(d, `${what} has no destination`);
  if (d.to === 'battle') assert.ok(questBattleById(d.battle), `${what}: no battle ${d.battle}`);
  if (d.to === 'army') {
    assert.ok(armyById(d.army), `${what}: no army ${d.army}`);
    assert.ok(d.tier >= 0 && d.tier < TIERS.length, `${what}: tier ${d.tier}`);
  }
  if (d.to === 'armies' && d.army) assert.ok(armyById(d.army), `${what}: no army ${d.army}`);
}

test('every goal kind has a destination', () => {
  const m = startedMeta(1);
  for (const [kind, goal] of Object.entries(SAMPLES)) valid(destinationOf(m, goal), `goal kind ${kind}`);
});

test('every quest, Eidolon chain part and trial has a destination, on a fresh save and on one with everything open', () => {
  const fresh = startedMeta(1);
  const open = startedMeta(2);
  open.opened = ARMIES.map((a) => a.id);
  for (const a of ARMIES) open.armies[a.id] = { ...open.armies[a.id], clears: 1 } as never;
  const goals: { what: string; goal: Goal }[] = [
    ...QUESTS.map((q) => ({ what: `quest ${q.id}`, goal: q.goal })),
    ...CHAINS.flatMap((c) => c.parts.map((p, i) => ({ what: `chain ${c.id} part ${i}`, goal: p.goal }))),
  ];
  assert.ok(goals.length > 100);
  for (const g of goals) for (const m of [fresh, open]) valid(destinationOf(m, g.goal), g.what);
  for (const t of TRIALS) valid({ to: 'battle', battle: t.id }, `trial ${t.id}`);
});

test('a goal goes where it says: its battle, mode, army and tier', () => {
  const m = startedMeta(1);
  assert.deepEqual(destinationOf(m, { kind: 'battle', n: 1, battle: 'kennelFires' }), { to: 'battle', battle: 'kennelFires' });
  assert.deepEqual(destinationOf(m, { kind: 'clearDaily', n: 1 }), { to: 'daily' });
  assert.deepEqual(destinationOf(m, { kind: 'wavesWon', n: 3, mode: 'daily' }), { to: 'daily' });
  assert.deepEqual(destinationOf(m, { kind: 'standWave', n: 5 }), { to: 'stand' });
  assert.deepEqual(destinationOf(m, { kind: 'calClear', n: 1 }), { to: 'calamity' });
  // (counted across fights: the next army, on Normal)
  assert.deepEqual(destinationOf(m, { kind: 'ults', n: 6 }), { to: 'army', army: ARMIES[0].id, tier: 0 });
  // (an army not open yet, or a tier not open: the Armies screen on it)
  const last = ARMIES[ARMIES.length - 1].id;
  assert.deepEqual(destinationOf(m, { kind: 'clearArmy', n: 1, army: last }), { to: 'armies', army: last });
  assert.deepEqual(destinationOf(m, { kind: 'wavesWon', n: 3, army: ARMIES[0].id, tier: 4 }), { to: 'armies', army: ARMIES[0].id });
});
