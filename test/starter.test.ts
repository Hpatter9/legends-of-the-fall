import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMeta, newMeta, needsStarter, partySlots, pickStarter, saveMeta, startedMeta } from '../src/sim/meta';
import { CLASS_NAMES, CLASS_OF, FIXED_PACKS, PACK_SIZE, packNamed, starterPacks, STARTER_PACKS, readStarter } from '../src/sim/starter';
import { ALL_HEROES, HEROES } from '../src/sim/units';
import { ARMY_START_GOLD, armyRun, boostOf, heroOf, startStage, SQUAD, summon } from '../src/sim/run';
import { fight, place, playOut } from '../src/sim/battle';
import { ARMIES } from '../src/sim/armies';
import { DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
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

test('every new save is offered the same two fixed packs', () => {
  assert.equal(STARTER_PACKS, 2);
  for (const seed of [1, 7, 4242, 99999]) assert.deepEqual(newMeta(seed).starter, { packs: starterPacks(), pick: null });
  assert.deepEqual(starterPacks(), FIXED_PACKS.map((p) => [...p.heroes]));
  // (a fresh copy each time: a save's packs are its own)
  assert.notEqual(starterPacks()[0], starterPacks()[0]);
});

test('two packs of three simple heroes, all different: a front-liner, a striker and a back-liner each, with a name and a line', () => {
  assert.equal(new Set(FIXED_PACKS.map((p) => p.id)).size, STARTER_PACKS);
  const all = FIXED_PACKS.flatMap((p) => p.heroes);
  assert.equal(new Set(all).size, STARTER_PACKS * PACK_SIZE, 'no hero is in two packs');
  for (const pack of FIXED_PACKS) {
    assert.equal(pack.heroes.length, PACK_SIZE);
    assert.ok(pack.name && pack.line, pack.id);
    const [front, striker, back] = pack.heroes.map((k) => CLASS_OF[k]);
    assert.equal(front, 'front');
    assert.equal(striker, 'striker');
    assert.ok(['shooter', 'caster', 'support'].includes(back), `${pack.id}: ${back}`);
    assert.equal(packNamed([...pack.heroes].reverse()), pack);
  }
  // (the packs fight differently: their back-liners are of different classes)
  assert.notEqual(CLASS_OF[FIXED_PACKS[0].heroes[2]], CLASS_OF[FIXED_PACKS[1].heroes[2]]);
});

test('the packs offer only plain classic heroes that can be pulled, none earned by content', () => {
  const simple = ['knight', 'peasant', 'paladin', 'samurai', 'kunoichi', 'mercenary', 'barbarian', 'archer', 'ranger', 'wizard', 'cleric'];
  for (const k of FIXED_PACKS.flatMap((p) => p.heroes)) {
    assert.ok(PULL_HEROES.includes(k), k);
    assert.ok(simple.includes(k), `${k} is a plain classic hero`);
  }
});

test('a brand-new save waits for the pick, with no hero and no party', () => {
  const m = newMeta(5);
  assert.ok(needsStarter(m));
  assert.deepEqual(m.unlocked, []);
  assert.deepEqual(m.party, []);
  assert.equal(partySlots(m), 0);
  assert.equal(m.starter!.packs.length, 2);
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
  assert.equal(pickStarter(m, 2), false);
  assert.equal(pickStarter(m, -1), false);
  assert.ok(needsStarter(m));
  assert.ok(pickStarter(m, 1));
  const kept = [...m.unlocked];
  assert.equal(pickStarter(m, 0), false);
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
  pickStarter(before, 1);
  saveMeta(before, s);
  const after = loadMeta(1, s);
  assert.equal(needsStarter(after), false);
  assert.deepEqual(after.unlocked, m.starter!.packs[1], 'only the pack, not the old five');
  assert.deepEqual(after.party, m.starter!.packs[1]);
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

test('a damaged starter record is mended: one still waiting gets the fixed packs, one already picked stays picked', () => {
  assert.equal(readStarter(undefined), undefined);
  assert.equal(readStarter('x'), undefined);
  const waiting = readStarter({ packs: [['knight']], pick: null })!;
  assert.deepEqual(waiting.packs, starterPacks());
  assert.equal(waiting.pick, null);
  // (a pick that is not a whole number counts as not made)
  assert.equal(readStarter({ packs: starterPacks(), pick: 'x' })!.pick, null);
  assert.equal(readStarter({ packs: starterPacks(), pick: -1 })!.pick, null);
  assert.equal(readStarter({ packs: starterPacks(), pick: 1 })!.pick, 1);
  // (a damaged record whose pick was made keeps it made, on the fixed packs, so a load never asks again and never swaps the heroes)
  const picked = readStarter({ packs: [['knight']], pick: 7 })!;
  assert.deepEqual(picked.packs, starterPacks());
  assert.equal(picked.pick, STARTER_PACKS - 1);
});

test('old saves from the three seeded packs: one mid-pick moves to the two fixed packs, one that picked keeps its pack and heroes', () => {
  const old = [['paladin', 'barbarian', 'ranger'], ['knight', 'ninjaMonk', 'warlock'], ['mummy', 'lancer', 'priestess']];
  // (mid-pick: the old three packs are dropped for the fixed two, and the pick works)
  const s1 = store();
  const mid = newMeta(4);
  mid.starter = { packs: old.map((p) => [...p]), pick: null };
  saveMeta(mid, s1);
  const back = loadMeta(1, s1);
  assert.ok(needsStarter(back));
  assert.deepEqual(back.starter!.packs, starterPacks());
  assert.deepEqual(back.unlocked, []);
  assert.ok(pickStarter(back, 1));
  assert.deepEqual(back.party, [...FIXED_PACKS[1].heroes]);
  // (picked the third old pack: the record, the pick and everything collected since are kept)
  const s2 = store();
  const done = newMeta(5);
  done.starter = { packs: old.map((p) => [...p]), pick: 2 };
  done.unlocked = [...old[2], 'tyrant'];
  done.party = [...old[2]];
  saveMeta(done, s2);
  const kept = loadMeta(1, s2);
  assert.equal(needsStarter(kept), false);
  assert.deepEqual(kept.starter, { packs: old, pick: 2 });
  assert.deepEqual(kept.unlocked, [...old[2], 'tyrant']);
  assert.deepEqual(kept.party, old[2]);
  assert.equal(pickStarter(kept, 0), false, 'no second pick');
});

test('the first run works with any pack: a run starts from the three, and a fight plays out', () => {
  for (let i = 0; i < STARTER_PACKS; i++) {
    const m = newMeta(40 + i);
    pickStarter(m, i);
    const run = armyRun(1000 + i, ARMIES[0].id, m.party, m.castle);
    assert.equal(run.squad.length, 0, 'no hero to begin with');
    assert.equal(run.gold, ARMY_START_GOLD);
    assert.ok(summon(run) && summon(run), 'the gold is for two hires');
    assert.equal(summon(run), null, 'and no more');
    run.squad = run.roster.map((h) => h.id);
    assert.equal(run.squad.length, 2);
    assert.ok(run.roster.every((h) => m.party.includes(h.kind)));
    assert.ok(run.squad.length <= SQUAD);
    const b = startStage(run);
    // (the front deploy row of this board, whatever its size: army maps are 14x18 since the winding maps)
    const front: number[] = [];
    for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, b.board.d - DEPLOY_ROWS))) front.push(u);
    // (a second hire of the same kind is refused on the field: one of each hero, ONE-OF-EACH)
    run.squad.forEach((id, n) => {
      const h = heroOf(run, id)!;
      const twin = run.squad.slice(0, n).some((x) => heroOf(run, x)!.kind === h.kind);
      assert.equal(place(b, h.kind, front[n * 2], b.board.d - DEPLOY_ROWS, id, boostOf(h)), !twin, `${h.kind} is placed${twin ? ' only once' : ''}`);
    });
    fight(b);
    playOut(b);
    assert.ok(b.phase === 'won' || b.phase === 'lost');
  }
});
