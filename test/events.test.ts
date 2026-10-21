import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseOption, drawEvent, eventAfter, leaveEvent, EVENT_KINDS, CURSE_FOES, SHRINE_HP } from '../src/sim/events';
import { equip, finish, loadRun, newRun, saveRun, startStage, boostOf, summon } from '../src/sim/run';
import { makeGear } from '../src/sim/gear';
import { place } from '../src/sim/battle';

/** A run with an event of the wanted kind (the stage is searched for one). */
function runWith(kind: string, seed = 7) {
  for (let stage = 2; stage < 400; stage += 2) {
    const run = newRun(seed);
    const ev = drawEvent(run, stage);
    if (ev.kind === kind) {
      run.event = ev;
      return run;
    }
  }
  throw new Error(`no ${kind}`);
}

test('events follow every second stage, never a boss stage', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 10].map((s) => eventAfter(s, s % 5 === 0)), [false, true, false, true, false, true, false]);
  const run = newRun(3);
  finish(run, true);
  assert.equal(run.event, undefined);
  finish(run, true);
  assert.ok(run.event, 'after stage 2');
  const lost = newRun(3);
  lost.stage = 2;
  finish(lost, false);
  assert.equal(lost.event, undefined);
});

test('an event draw is deterministic and covers every kind', () => {
  assert.deepEqual(drawEvent(newRun(4), 6), drawEvent(newRun(4), 6));
  const seen = new Set<string>();
  for (let s = 2; s < 80; s += 2) seen.add(drawEvent(newRun(11), s).kind);
  assert.deepEqual([...seen].sort(), [...EVENT_KINDS].sort());
  for (let s = 2; s < 40; s += 2) {
    const n = drawEvent(newRun(11), s).options.length;
    assert.ok(n >= 2 && n <= 3);
  }
});

test('a shrine blesses the next fight only', () => {
  const run = runWith('shrine');
  assert.ok(chooseOption(run, 0));
  assert.equal(run.event, undefined);
  const b = startStage(run);
  place(b, 'knight', 3, 8, 1);
  const plain = startStage(newRun(7));
  place(plain, 'knight', 3, 8, 1);
  const k = b.units.find((u) => u.side === 'hero')!.maxHp / plain.units.find((u) => u.side === 'hero')!.maxHp;
  assert.ok(Math.abs(k - (1 + SHRINE_HP)) < 0.01);
  finish(run, true);
  assert.equal(run.buff, undefined);
});

test('a merchant sells for gold, stays open, and cannot be robbed', () => {
  const run = runWith('merchant');
  const [relic, gear] = run.event!.options;
  run.gold = 0;
  assert.equal(chooseOption(run, 0), null);
  run.gold = relic.cost + gear.cost + 5;
  assert.ok(chooseOption(run, 0));
  assert.equal(run.gold, gear.cost + 5);
  assert.ok(run.event, 'the stall stays open');
  assert.equal(chooseOption(run, 0), null, 'sold');
  assert.ok(chooseOption(run, 1));
  assert.equal(run.items!.length, 1);
  assert.equal(run.relics!.length, 1);
  assert.equal(chooseOption(run, 2) !== null && run.event === undefined, true, 'leaving closes it');
});

test('a chest gives a relic, gear or gold', () => {
  const run = runWith('chest');
  const before = run.gold;
  assert.ok(chooseOption(run, 0));
  assert.ok((run.relics?.length ?? 0) + (run.items?.length ?? 0) === 1 || run.gold > before);
  assert.equal(run.event, undefined);
});

test('a cursed path toughens the foes and pays a prize for a win', () => {
  const run = runWith('cursed');
  const gold = run.event!.options[0].effect.t === 'curse' ? (run.event!.options[0].effect as { gold: number }).gold : 0;
  chooseOption(run, 0);
  const hard = startStage(run);
  const plain = startStage(newRun(7));
  const foe = (b: typeof hard) => b.units.find((u) => u.side === 'foe')!;
  assert.ok(Math.abs(foe(hard).maxHp / foe(plain).maxHp - (1 + CURSE_FOES)) < 0.01);
  const g = run.gold;
  finish(run, true);
  assert.ok(run.gold >= g + gold);
  assert.equal(run.items!.length, 1);
  assert.equal(run.buff, undefined);
});

test('a training ground sells a lasting bump to one hero', () => {
  const run = runWith('training');
  const o = run.event!.options[0];
  run.gold = o.cost;
  const hero = run.roster.find((h) => h.id === (o.effect as { hero: number }).hero)!;
  const before = boostOf(hero).atk!;
  assert.ok(chooseOption(run, 0));
  assert.equal(run.gold, 0);
  assert.ok(boostOf(hero).atk! > before);
  assert.equal(run.event, undefined);
});

test('a boss stage drops a sure piece of gear, and leaving takes nothing', () => {
  const run = newRun(21);
  run.stage = 5;
  finish(run, true);
  assert.equal(run.items!.length, 1);
  assert.equal(run.found!.length, 1);
  assert.equal(run.event, undefined);
  run.event = drawEvent(run, 2);
  leaveEvent(run);
  assert.equal(run.event, undefined);
});

test('a merge hands gear back to the pack', () => {
  const run = newRun(5, ['knight']);
  run.items = [makeGear(1, 'armour', 1)];
  equip(run, run.roster[0].id, 1);
  run.gold = 500;
  summon(run);
  assert.equal(run.roster.length, 1);
  assert.equal(run.roster[0].grade, 2);
  assert.deepEqual(run.items!.map((g) => g.id), [1]);
});

test('an event survives a save', () => {
  const run = newRun(5);
  const store: Record<string, string> = {};
  run.event = drawEvent(run, 2);
  saveRun(run, { setItem: (k, v) => void (store[k] = v) });
  assert.deepEqual(loadRun({ getItem: (k) => store[k] ?? null })!.event, run.event);
  assert.equal(equip(run, run.roster[0].id, 5), false);
});
