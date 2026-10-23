import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMeta, newMeta, needsStarter, partySlots, pickStarter, saveMeta, startedMeta } from '../src/sim/meta';
import { CLASS_NAMES, CLASS_OF, PACK_SIZE, starterPacks, STARTER_PACKS, readStarter } from '../src/sim/starter';
import { ALL_HEROES, HEROES } from '../src/sim/units';
import { armyRun, boostOf, heroOf, startStage, SQUAD } from '../src/sim/run';
import { fight, place, playOut } from '../src/sim/battle';
import { ARMIES } from '../src/sim/armies';
import { PULL_HEROES } from '../src/sim/unlockRules';

const store = () => {
  const data: Record<string, string> = {};
  return { setItem: (k: string, v: string) => void (data[k] = v), getItem: (k: string) => data[k] ?? null, data };
};

test('every hero is in exactly one class, and each class has heroes to offer', () => {
  for (const k of ALL_HEROES) assert.ok(CLASS_OF[k] && CLASS_NAMES[CLASS_OF[k]], k);
  assert.deepEqual(Object.keys(CLASS_OF).sort(), [...ALL_HEROES].sort());
  for (const c of Object.keys(CLASS_NAMES)) assert.ok(ALL_HEROES.some((k) => CLASS_OF[k] === c), c);
});

test('the packs are deterministic: the same seed offers the same three packs', () => {
  for (const seed of [1, 7, 4242, 99999]) assert.deepEqual(starterPacks(seed), starterPacks(seed));
  assert.deepEqual(newMeta(31).starter, newMeta(31).starter);
});

test('three packs of three, all different heroes, a front-liner, a striker and a back-liner each', () => {
  const seenPacks = new Set<string>();
  for (let seed = 1; seed <= 300; seed++) {
    const packs = starterPacks(seed);
    assert.equal(packs.length, STARTER_PACKS);
    const all = packs.flat();
    assert.equal(new Set(all).size, STARTER_PACKS * PACK_SIZE, `seed ${seed}: no hero is in two packs`);
    for (const pack of packs) {
      assert.equal(pack.length, PACK_SIZE);
      assert.ok(pack.every((k) => ALL_HEROES.includes(k)));
      const [front, striker, back] = pack.map((k) => CLASS_OF[k]);
      assert.equal(front, 'front');
      assert.equal(striker, 'striker');
      assert.ok(['shooter', 'caster', 'support'].includes(back), `${seed}: ${back}`);
    }
    // (the back-liners are one shooter, one caster and one support, so the packs differ in how they fight)
    assert.deepEqual(packs.map((p) => CLASS_OF[p[2]]).sort(), ['caster', 'shooter', 'support']);
    seenPacks.add(JSON.stringify(packs));
  }
  assert.ok(seenPacks.size > 250, 'different seeds offer different packs');
});

test('over many seeds every hero that can be pulled is offered now and then, and no hero earned by content is', () => {
  const offered = new Set<string>();
  for (let seed = 1; seed <= 400; seed++) for (const k of starterPacks(seed).flat()) offered.add(k);
  assert.deepEqual([...offered].sort(), [...PULL_HEROES].sort());
});

test('a brand-new save waits for the pick, with no hero and no party', () => {
  const m = newMeta(5);
  assert.ok(needsStarter(m));
  assert.deepEqual(m.unlocked, []);
  assert.deepEqual(m.party, []);
  assert.equal(partySlots(m), 0);
  assert.equal(m.starter!.packs.length, 3);
});

test('the pick unlocks exactly the three heroes of the pack and makes them the party', () => {
  for (let i = 0; i < STARTER_PACKS; i++) {
    const m = newMeta(77);
    const pack = [...m.starter!.packs[i]];
    assert.ok(pickStarter(m, i));
    assert.deepEqual(m.unlocked, pack);
    assert.deepEqual(m.party, pack);
    assert.equal(partySlots(m), 3);
    assert.equal(m.starter!.pick, i);
    assert.equal(needsStarter(m), false);
    for (const h of HEROES) if (!pack.includes(h)) assert.ok(!m.unlocked.includes(h), 'the old starting five are not handed out');
  }
});

test('the pick is made once; a bad pack changes nothing', () => {
  const m = newMeta(8);
  assert.equal(pickStarter(m, 3), false);
  assert.equal(pickStarter(m, -1), false);
  assert.ok(needsStarter(m));
  assert.ok(pickStarter(m, 1));
  const kept = [...m.unlocked];
  assert.equal(pickStarter(m, 2), false);
  assert.deepEqual(m.unlocked, kept);
});

test('the save keeps the pick across a reload, before and after', () => {
  const s = store();
  const m = newMeta(21);
  saveMeta(m, s);
  const before = loadMeta(1, s);
  assert.ok(needsStarter(before));
  assert.deepEqual(before.starter, m.starter);
  assert.deepEqual(before.unlocked, []);
  pickStarter(before, 2);
  saveMeta(before, s);
  const after = loadMeta(1, s);
  assert.equal(needsStarter(after), false);
  assert.deepEqual(after.unlocked, m.starter!.packs[2], 'only the pack, not the old five');
  assert.deepEqual(after.party, m.starter!.packs[2]);
});

test('Start over (no save) gives a fresh pick; an existing save keeps its heroes', () => {
  assert.ok(needsStarter(loadMeta(9, { getItem: () => null })));
  // (a save from before the pick has no starter record: it keeps the five and everything it recruited)
  const old = startedMeta(3);
  old.unlocked.push('tyrant', 'sage');
  old.shards = { knight: 4, tyrant: 2 };
  old.xp = { knight: 300 };
  old.crowns = 555;
  const s = store();
  saveMeta(old, s);
  const back = loadMeta(1, s);
  assert.equal(needsStarter(back), false);
  assert.equal(back.starter, undefined);
  assert.deepEqual(back.unlocked, [...HEROES, 'tyrant', 'sage']);
  assert.deepEqual(back.shards, { knight: 4, tyrant: 2 });
  assert.equal(back.xp.knight, 300);
  assert.equal(back.crowns, 555);
});

test('a damaged starter record is mended from the seed', () => {
  assert.equal(readStarter(undefined, 1), undefined);
  assert.equal(readStarter('x', 1), undefined);
  const mended = readStarter({ packs: [['knight']], pick: 7 }, 12)!;
  assert.deepEqual(mended.packs, starterPacks(12));
  assert.equal(mended.pick, null);
  assert.equal(readStarter({ packs: starterPacks(12), pick: 1 }, 12)!.pick, 1);
});

test('the first run works with any pack: a run starts from the three, and a fight plays out', () => {
  for (let i = 0; i < STARTER_PACKS; i++) {
    const m = newMeta(40 + i);
    pickStarter(m, i);
    const run = armyRun(1000 + i, ARMIES[0].id, m.party, m.castle);
    assert.equal(run.squad.length, 2, 'two free heroes to begin with');
    assert.ok(run.roster.every((h) => m.party.includes(h.kind)));
    assert.ok(run.squad.length <= SQUAD);
    const b = startStage(run);
    run.squad.forEach((id, n) => {
      const h = heroOf(run, id)!;
      assert.ok(place(b, h.kind, 1 + n * 2, 8, id, boostOf(h)), `${h.kind} is placed`);
    });
    fight(b);
    playOut(b);
    assert.ok(b.phase === 'won' || b.phase === 'lost');
  }
});
