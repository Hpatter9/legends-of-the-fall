import { test } from 'node:test';
import assert from 'node:assert/strict';
import { place, playOut, startBattle } from '../src/sim/battle';
import { finish, gradeBoost, isBossStage, loadRun, newRun, reward, saveRun, setSquad, stageBoost, startStage, summon, summonCost, START_GOLD, SQUAD, type Run } from '../src/sim/run';
import { UNITS } from '../src/sim/units';

const kinds = (r: Run) => r.roster.map((h) => `${h.kind}${h.grade}`).join();

test('starts with gold and two grade-1 heroes', () => {
  const r = newRun(7);
  assert.equal(r.gold, START_GOLD);
  assert.equal(r.roster.length, 2);
  assert.equal(r.roster.every((h) => h.grade === 1), true);
});

test('summon costs gold, rises, and is deterministic', () => {
  const a = newRun(11);
  const b = newRun(11);
  const price = summonCost(a);
  const got = summon(a)!;
  assert.ok(got.grade <= 3);
  assert.equal(a.gold, START_GOLD - price);
  assert.ok(summonCost(a) > price);
  summon(b);
  assert.equal(kinds(a), kinds(b));
  const poor = newRun(11);
  poor.gold = price - 1;
  assert.equal(summon(poor), null);
  assert.equal(poor.gold, price - 1);
});

test('three of a kind and grade merge into the next grade', () => {
  const r = newRun(3);
  r.gold = 100000;
  for (let i = 0; i < 60; i++) summon(r);
  assert.equal(r.roster.some((h) => h.grade >= 2), true);
  // never three of the same kind and grade left over
  const count = new Map<string, number>();
  for (const h of r.roster) if (h.grade < 3) count.set(`${h.kind}${h.grade}`, (count.get(`${h.kind}${h.grade}`) ?? 0) + 1);
  assert.equal([...count.values()].every((n) => n < 3), true);
});

test('a merge keeps the squad place', () => {
  const r = newRun(1);
  r.roster = [1, 2].map((id) => ({ id, kind: 'knight', grade: 1 }));
  r.nextId = 3;
  r.squad = [1, 2];
  r.gold = 1e6;
  let guard = 0;
  while (!r.roster.some((h) => h.kind === 'knight' && h.grade === 2) && guard++ < 300) summon(r);
  const merged = r.roster.find((h) => h.kind === 'knight' && h.grade === 2)!;
  assert.ok(merged);
  assert.deepEqual(r.squad, [merged.id]);
});

test('grade raises hp and attack in the fight', () => {
  const b = startBattle(5);
  place(b, 'knight', 0, 8, 1, gradeBoost(1));
  place(b, 'knight', 1, 8, 2, gradeBoost(3));
  const [lo, hi] = b.units.filter((u) => u.side === 'hero');
  assert.equal(lo.tag, 1);
  assert.equal(hi.maxHp, Math.round(UNITS.knight.hp * 1.6 ** 2));
  assert.ok(Math.abs((hi.power ?? 0) - 1.6 ** 2) < 1e-9);
  assert.equal(lo.power, undefined);
});

test('foes grow by stage and every fifth stage has a boss', () => {
  const hp = (stage: number) => startStage({ ...newRun(2), stage }).units.filter((u) => u.side === 'foe').map((u) => u.maxHp);
  assert.ok(hp(1)[1] < hp(6)[1]);
  assert.equal(isBossStage(5), true);
  assert.equal(isBossStage(4), false);
  assert.equal(stageBoost(4).boss, undefined);
  const boss = startStage({ ...newRun(2), stage: 5 }).units.find((u) => u.side === 'foe' && u.size)!;
  assert.ok((boss.size ?? 0) > 1);
  assert.ok(reward(6) > reward(2));
});

test('a win pays and moves on; a lost fight ends the run', () => {
  const r = newRun(4);
  finish(r, true);
  assert.equal(r.stage, 2);
  assert.equal(r.gold, START_GOLD + reward(1));
  const b = startStage(r);
  place(b, r.roster[0].kind, 3, 8, r.roster[0].id, gradeBoost(1));
  b.units.find((u) => u.side === 'hero')!.maxHp = 1;
  r.stage = 30; // far too hard for one hero
  const hard = startStage(r);
  place(hard, 'archer', 3, 8, 99, gradeBoost(1));
  fightOut(hard);
  assert.equal(hard.phase, 'lost');
  finish(r, false);
  assert.equal(r.over, true);
  assert.equal(summon(r), null);
});

test('squad is capped at five and saves and loads', () => {
  const r = newRun(9);
  r.roster = Array.from({ length: 7 }, (_, i) => ({ id: i + 1, kind: 'knight', grade: 1 }));
  for (let i = 1; i <= 7; i++) setSquad(r, i, true);
  assert.equal(r.squad.length, SQUAD);
  let saved = '';
  saveRun(r, { setItem: (_k, v) => (saved = v) });
  assert.deepEqual(loadRun({ getItem: () => saved }), r);
  assert.equal(loadRun({ getItem: () => 'junk' }), null);
});

function fightOut(b: ReturnType<typeof startBattle>): void {
  b.phase = 'fight';
  playOut(b);
}
