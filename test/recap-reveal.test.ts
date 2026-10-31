// RECAP-REVEAL: the short wave card lists everything a wave brought in (`waveGains.ts`), and drops the `found` lines those cover.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newMeta } from '../src/sim/meta';
import { finish, newRun } from '../src/sim/run';
import { makeGear } from '../src/sim/gear';
import { gainsSince, gainText, otherFinds, snapGains } from '../src/sim/waveGains';
import { waveNotes } from '../src/sim/waveCard';
import { heroName } from '../src/sim/heroNames';

test('a wave with nothing new has no gains', () => {
  const m = newMeta(5);
  const run = newRun(5);
  assert.deepEqual(gainsSince(snapGains(m, run), m, run), []);
});

test('every kind of gain is listed once, grouped, in the card order; spending and the ores row are left out', () => {
  const m = newMeta(5);
  m.unlock = { ranger: 2 };
  m.tomes = { small: 1 };
  m.stones = 4;
  m.ores = { blade: 1 };
  const run = newRun(5);
  const was = snapGains(m, run);
  // (two of the same gear, a better one, a relic, chests, shards, tomes, a stone, a hero joining, ores the card's own row shows)
  run.items = [makeGear(90, 'weapon', 2), makeGear(91, 'weapon', 2), makeGear(92, 'armour', 3)];
  run.relics = ['whetstone'];
  m.stash.push({ army: 'undead', at: 5, tier: 0, seed: 1 }, { army: 'undead', at: 5, tier: 0, seed: 2 }, { army: 'daily', at: 3, tier: 0, seed: 3, daily: 20260101 });
  m.unlock.ranger = 5;
  m.shards.knight = 3;
  m.tomes = { small: 3, medium: 1 };
  m.stones = 3;
  m.ores.blade = 9;
  m.caches = 1;
  m.unlocked.push('cleric');
  const g = gainsSince(was, m, run);
  assert.deepEqual(g.map((x) => `${x.kind}:${x.id}×${x.n}`), [
    'joined:cleric×1',
    'chest:silver×2',
    'chest:daily×1',
    'gear:weapon:2×2',
    'gear:armour:3×1',
    'relic:whetstone×1',
    'unlockShard:ranger×3',
    'shard:knight×3',
    'tome:small×2',
    'tome:medium×1',
  ]);
  assert.equal(gainText(g.find((x) => x.id === 'weapon:2')!), 'Steel Blade (Rare) ×2');
  assert.equal(gainText(g.find((x) => x.id === 'armour:3')!), 'Silver Plate (Epic)');
  assert.equal(gainText(g[0]), `${heroName('cleric')} joins`);
});

test('the card drops the found lines the gains cover, and keeps the rest', () => {
  const m = newMeta(9);
  const run = newRun(9);
  run.mode = { kind: 'army', army: 'undead' };
  const was = snapGains(m, run);
  run.items = [makeGear(7, 'charm', 1)];
  run.relics = ['banner'];
  run.found = ['Jade Charm (charm, +3% attack, +3% hp)', 'the Banner (+10% hp for every hero)', '20 gold from the cursed path', '4 Hexquartz', 'a choice of three relics, on the map'];
  const gains = gainsSince(was, m, run);
  assert.deepEqual(otherFinds(run.found, gains), ['4 Hexquartz', 'a choice of three relics, on the map']);
  const notes = waveNotes({ ups: [], fell: [], hearts: 0, heartsLeft: 3, found: run.found, gains });
  assert.deepEqual(notes.map((n) => n.text), ['Found 4 Hexquartz', 'Found a choice of three relics, on the map']);
  // (an older caller with no gains keeps every line, as before)
  assert.equal(waveNotes({ ups: [], fell: [], hearts: 0, heartsLeft: 3, found: run.found }).length, 5);
});

test('a boss wave of an endless run lists the gear it settled', () => {
  const m = newMeta(3);
  const run = newRun(3);
  run.stage = 5;
  const was = snapGains(m, run);
  finish(run, true, 3);
  const g = gainsSince(was, m, run);
  assert.equal(g.filter((x) => x.kind === 'gear').length, run.items?.length ? 1 : 0);
  assert.deepEqual(otherFinds(run.found ?? [], g), []);
});

test('a hero earned by a deed arrives on its own, naming the deed; a summoned one, or one out of a pull, has the summoner', async () => {
  const { arrivalOf, deedLine } = await import('../src/sim/heroArrival');
  const { CONTENT_KINDS } = await import('../src/sim/unlockRules');
  for (const k of CONTENT_KINDS) {
    assert.equal(arrivalOf(k), 'earned', k);
    assert.match(deedLine(k)!, /^Earned: /);
    assert.equal(arrivalOf(k, true), 'summoned', `${k} out of a pull`);
  }
  assert.equal(deedLine('reaper'), 'Earned: see The Ledger of the Unburied to its end');
  assert.equal(arrivalOf('knight'), 'summoned');
  assert.equal(deedLine('knight'), null);
});
