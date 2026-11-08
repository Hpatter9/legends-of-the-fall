// ASSAULT-RESUME (docs/notes/assault-2.md; the design's 6.4 and phase 2): a battle under way, cloned at a snapshot's tick and stepped on, plays
// out exactly as the battle itself; a snapshot falls every twenty seconds of battle time; while an assault is under way the save keeps its
// fallen in their places, and settling after a resume gives each survivor its marks; an abandoned assault counts as a withdrawal.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assaultChecksum, stepAssault } from '../src/sim/assault/assault';
import { settleAssault, FOUGHT_MS } from '../src/sim/assault/assaultMode';
import { fillRanks, noteFallen, readAssault, troopsOf } from '../src/sim/assault/economy';
import { soundRetreat } from '../src/sim/assault/platoons';
import { abandonLive, clearLive, noteLive, snapshotDue, SNAPSHOT_MS } from '../src/sim/assault/snapshot';
import { startedMeta } from '../src/sim/meta';
import { stepBattle } from '../src/sim/battle';
import { fell, quiet, steps, PARTY } from './assaultKit';

test('a battle cloned at a snapshot and stepped on plays out exactly as the battle itself, siege works and all', () => {
  const b = quiet({ siege: { ram: 'knight', ladders: ['samurai', 'archer'] }, auto: true, tactical: true });
  while (!snapshotDue(b)) stepAssault(b);
  assert.equal(b.t % SNAPSHOT_MS, 0);
  steps(b, (SNAPSHOT_MS / 100) * 30);
  const copy = structuredClone(b);
  for (let i = 0; i < 1500; i++) {
    stepAssault(b);
    stepAssault(copy);
  }
  assert.equal(assaultChecksum(copy), assaultChecksum(b));
  assert.equal(copy.phase, b.phase);
  assert.deepEqual(copy.field!.hold!.siege.ladders, b.field!.hold!.siege.ladders);
});

test('while an assault is under way the fallen keep their places; settling after a resume gives each survivor its marks', () => {
  const m = startedMeta(5);
  m.crowns = 10000;
  m.party = [...PARTY];
  for (const k of PARTY) fillRanks(m, k);
  const b = quiet({ troops: Object.fromEntries(PARTY.map((k) => [k, troopsOf(m, k)])) });
  const h = b.field!.hold!;
  noteLive(m, b, 20261108);
  assert.equal(m.assault!.live!.army, 'orcs');
  // (the snapshot, then two of the knight's soldiers fall and the save strikes them off)
  const snap = structuredClone(b);
  fell(b, h.platoons[0].soldiers[1].id);
  fell(b, h.platoons[0].soldiers[4].id);
  stepBattle(b);
  for (const e of h.events) if (e.kind === 'fell') noteFallen(m, h.platoons[e.platoon].hero, e.index);
  // (the page closes; the save is read back: the fallen keep their places as -1)
  const back = readAssault(JSON.parse(JSON.stringify(m.assault)))!;
  assert.deepEqual(back.troops.knight, [0, -1, 0, 0, -1, 0, 0, 0, 0, 0]);
  m.assault = back;
  // (resumed from the snapshot, where those two still stand; the assault fought on and retreated)
  snap.t = Math.max(snap.t, FOUGHT_MS);
  soundRetreat(snap);
  stepBattle(snap);
  settleAssault(m, snap, 20261108);
  assert.equal(troopsOf(m, 'knight').length, 10, 'the battle is the truth: all ten stand');
  assert.ok(troopsOf(m, 'knight').every((x) => x === 1), 'each with its mark for living through it');
  assert.equal(m.assault!.live, undefined, 'no longer under way');
});

test('without an assault under way the save drops the fallen; abandoning one counts as a withdrawal', () => {
  assert.deepEqual(readAssault({ troops: { knight: [0, -1, 2] } })!.troops.knight, [0, 2]);
  const m = startedMeta(5);
  m.assault = readAssault({ troops: { knight: [0, -1, 2] }, live: { army: 'orcs', t: 40000, day: 20261108 } })!;
  assert.deepEqual(m.assault.troops.knight, [0, -1, 2]);
  abandonLive(m);
  assert.equal(m.assault.live, undefined);
  assert.deepEqual(m.assault.troops.knight, [0, 2]);
  assert.equal(m.assault.tries.orcs, 1);
  clearLive(m);
  assert.equal(m.assault.tries.orcs, 1, 'clearing alone counts nothing');
});
