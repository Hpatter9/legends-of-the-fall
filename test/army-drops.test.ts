import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadMeta, newMeta, pickStarter, saveMeta, type Meta } from '../src/sim/meta';
import { dropChances, dropWords, rollArmyDrop, settleArmyDrop, SHARD_CHANCE, TOME_CHANCE } from '../src/sim/armyDrops';
import { ARMIES, bossesOf } from '../src/sim/armies';
import { haveOf, toCollect } from '../src/sim/unlock';
import { PULL_HEROES } from '../src/sim/unlockRules';
import { tomeTotal } from '../src/sim/tomes';
import { waveNotes } from '../src/sim/waveCard';

const fresh = (seed: number): Meta => {
  const m = newMeta(seed);
  pickStarter(m, 0);
  return m;
};
const store = () => {
  const data: Record<string, string> = {};
  return { setItem: (k: string, v: string) => void (data[k] = v), getItem: (k: string) => data[k] ?? null, data };
};

test('a drop is the same for the same run seed and wave, and differs across waves and runs', () => {
  const m = fresh(3);
  for (let seed = 1; seed < 400; seed++)
    for (const w of [1, 5, 15]) assert.deepEqual(rollArmyDrop(m, w === 15 ? 'final' : undefined, 0, seed, w), rollArmyDrop(m, w === 15 ? 'final' : undefined, 0, seed, w));
  // (a sure drop shows the wave and the run choose it)
  const sure = (seed: number, w: number) => JSON.stringify(rollArmyDrop(m, 'final', 0, seed, w, true));
  const seen = new Set<string>();
  for (let seed = 1; seed < 40; seed++) for (let w = 1; w <= 5; w++) seen.add(sure(seed, w));
  assert.ok(seen.size > 20, 'different runs and waves drop different things');
});

test('a wave refought in the same run rolls the same: no farming a drop by retrying', () => {
  // (settling a won wave again with the same seed and wave gives the same drop; a run that finds nothing on a wave never finds it there)
  let found = 0;
  for (let seed = 1; seed < 3000; seed++) {
    const a = fresh(1);
    const b = fresh(1);
    const one = settleArmyDrop(a, true, 'final', 0, seed, 15);
    const two = settleArmyDrop(b, true, 'final', 0, seed, 15);
    assert.deepEqual(one?.drop ?? null, two?.drop ?? null);
    if (one) found++;
  }
  assert.ok(found > 0);
});

test('the rates are rare: about one shard drop in a hundred Normal army runs, and a tome less than half as often', () => {
  const m = fresh(9);
  const a = ARMIES[0];
  const RUNS = 60000;
  let shards = 0;
  let tomes = 0;
  for (let r = 0; r < RUNS; r++)
    a.waves.forEach((w, i) => {
      const d = rollArmyDrop(m, w.boss, 0, 1000 + r, i + 1);
      if (d?.shards) shards++;
      if (d?.tome) tomes++;
    });
  const perShard = RUNS / shards;
  const perTome = RUNS / tomes;
  assert.ok(perShard >= 70 && perShard <= 130, `a shard drop every ${perShard.toFixed(1)} runs`);
  assert.ok(perTome >= 180 && perTome <= 340, `a tome every ${perTome.toFixed(1)} runs`);
  assert.ok(perTome > perShard, 'tomes are rarer than shards');
  // (and the expected rate from the table agrees, within the noise)
  const want = a.waves.reduce((n, w) => n + dropChances(w.boss, 0).shards, 0);
  assert.ok(Math.abs(1 / perShard - want) < want * 0.15, `${1 / perShard} against ${want}`);
  assert.ok(bossesOf(a).length >= 1);
});

test('bosses drop more than plain waves, and harder tiers a little more', () => {
  assert.ok(SHARD_CHANCE.final > SHARD_CHANCE.mid && SHARD_CHANCE.mid > SHARD_CHANCE.plain);
  assert.ok(TOME_CHANCE.final > TOME_CHANCE.mid && TOME_CHANCE.mid > TOME_CHANCE.plain);
  for (const b of [undefined, 'mid', 'final'] as const) {
    assert.ok(dropChances(b, 2).shards > dropChances(b, 0).shards);
    assert.ok(dropChances(b, 4).shards < dropChances(b, 0).shards * 2, 'only a little more');
    assert.ok(dropChances(b, 4).shards < 0.01 && dropChances(b, 4).tome < 0.005, 'still rare on Mythic');
  }
});

test('shards go to a hero being collected (a begun one likelier), as unlock shards', () => {
  const m = fresh(4);
  const begun = toCollect(m)[5];
  (m.unlock ??= {})[begun] = 1;
  let toBegun = 0;
  let n = 0;
  for (let seed = 1; seed < 400; seed++) {
    const d = rollArmyDrop(m, 'final', 0, seed, 15, true)!;
    assert.ok(!m.unlocked.includes(d.shards!.kind), 'never a hero owned while some are left');
    assert.ok(PULL_HEROES.includes(d.shards!.kind), 'never a content hero');
    if (d.shards!.kind === begun) toBegun++;
    n++;
  }
  // (one begun hero of about 30 left, weighted 7 to 1: about a fifth of the drops)
  assert.ok(toBegun / n > 0.1, `${toBegun} of ${n}`);
  const before = haveOf(m, begun);
  const paid = settleArmyDrop(m, true, 'final', 0, 7, 15, 'shards')!;
  assert.ok(paid.drop.shards!.n >= 3 && paid.drop.shards!.n <= 4, 'a boss drops 3 or 4');
  // (early a hero needs only a few shards, so a drop can bring it in whole)
  const k = paid.drop.shards!.kind;
  if (paid.joined) assert.ok(m.unlocked.includes(k));
  else assert.equal(haveOf(m, k), (k === begun ? before : 0) + paid.drop.shards!.n);
});

test('every pullable hero owned: a drop is rank shards of a hero owned', () => {
  const m = fresh(4);
  m.unlocked = [...PULL_HEROES];
  const paid = settleArmyDrop(m, true, undefined, 0, 11, 3, 'shards')!;
  assert.ok(m.unlocked.includes(paid.drop.shards!.kind));
  assert.ok((m.shards[paid.drop.shards!.kind] ?? 0) >= 2);
});

test('a lost wave drops nothing; a won one pays only shards and tomes into the meta', () => {
  const m = fresh(2);
  assert.equal(settleArmyDrop(m, false, 'final', 0, 5, 15, 'both'), null);
  const before = JSON.parse(JSON.stringify(m)) as Meta;
  const paid = settleArmyDrop(m, true, 'final', 2, 5, 15, 'both')!;
  assert.equal(tomeTotal(m), tomeTotal(before) + 1);
  assert.equal(m.crowns, before.crowns);
  assert.equal(m.stones, before.stones);
  assert.deepEqual(m.ores, before.ores);
  assert.equal(paid.words.length, 2);
  assert.match(paid.words[0], /^\d shards of /);
  assert.match(paid.words[1], /^an? (small|medium|large) XP tome$/);
});

test('the drop shows on the short card first of the finds, and its words read well', () => {
  const notes = waveNotes({ ups: [], fell: [], hearts: 0, heartsLeft: 0, found: ['Iron Helm (head, +3 armour)'], drops: ['3 shards of Kwame · Knight'] });
  assert.deepEqual(notes.map((n) => n.kind), ['drop', 'found']);
  assert.equal(notes[0].text, 'Found: 3 shards of Kwame · Knight');
  assert.deepEqual(dropWords({ tome: 'medium' }), ['a medium XP tome']);
  // (a card from before the drops, with none, is as it was)
  assert.deepEqual(waveNotes({ ups: [], fell: [], hearts: 0, heartsLeft: 0, found: [] }), []);
});

test('the drop takes no draw from the fight: it is its own side stream, settled on the page after the fight', () => {
  const src = readFileSync('src/sim/armyDrops.ts', 'utf8');
  assert.ok(!/\bb\.rng\b|rngState|Math\.random|Date\.now/.test(src));
  assert.ok(/mixSeed\(seed, DROP_SALT, wave\)/.test(src));
});

test('a save holding dropped shards and tomes loads them back; an older save loads with none', () => {
  const s = store();
  const m = fresh(6);
  const paid = settleArmyDrop(m, true, 'final', 0, 9, 15, 'both')!;
  saveMeta(m, s);
  const back = loadMeta(6, s);
  assert.equal(tomeTotal(back), 1);
  const k = paid.drop.shards!.kind;
  if (paid.joined) assert.ok(back.unlocked.includes(k));
  else assert.equal(haveOf(back, k), paid.drop.shards!.n);
  const old = fresh(6);
  delete old.unlock;
  delete old.tomes;
  saveMeta(old, s);
  const o = loadMeta(6, s);
  assert.ok(settleArmyDrop(o, true, undefined, 0, 1, 1, 'both'));
});
