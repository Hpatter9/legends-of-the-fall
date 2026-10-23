import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMeta, newMeta, pickStarter, pullCost, pullOnce, PULL_COST, recruit, startedMeta, saveMeta, type Meta } from '../src/sim/meta';
import { closest, giveShards, haveOf, needOf, ownedCount, swapContent, toCollect } from '../src/sim/unlock';
import { CONTENT_KINDS, CHEST_HERO_SHARDS, isContent, NEED_FIRST, NEED_LAST, PITY_PULLS, PULL_HEROES, unlockNeed, priceMult, PRICE_LAST_MULT } from '../src/sim/unlockRules';
import { CONTENT_HEROES, contentOf, grantContent, lockInfo } from '../src/sim/contentHeroes';
import { ARMIES, armyById } from '../src/sim/armies';
import { chestSeed, openChest, peekChest, rollChest } from '../src/sim/armyStars';
import { ALL_HEROES, HEROES } from '../src/sim/units';
import { starterPacks } from '../src/sim/starter';
import { pullsLeft } from '../src/sim/meta';
import { MODES, setUnlockMode, unlockMode, pityAt } from '../src/sim/unlockRules';

const store = () => {
  const data: Record<string, string> = {};
  return { setItem: (k: string, v: string) => void (data[k] = v), getItem: (k: string) => data[k] ?? null, data };
};
/** A new save past the starter pick (pack 0). */
const fresh = (seed: number): Meta => {
  const m = newMeta(seed);
  pickStarter(m, 0);
  return m;
};

test('ten heroes are earned by content, the rest are pulled', () => {
  assert.equal(CONTENT_KINDS.length, 10);
  assert.equal(PULL_HEROES.length, ALL_HEROES.length - 10);
  for (const k of CONTENT_KINDS) assert.ok(ALL_HEROES.includes(k) && isContent(k), k);
  assert.deepEqual(CONTENT_HEROES.map((c) => c.kind), [...CONTENT_KINDS]);
  for (const c of CONTENT_HEROES) assert.ok(c.line.length > 0 && !c.met(newMeta(1)), c.kind);
  // (the old starting five are all pullable)
  for (const k of HEROES) assert.ok(PULL_HEROES.includes(k));
});

test('the shards a new hero needs rise with the heroes owned: few at first, many at the end', () => {
  assert.equal(unlockNeed(3), NEED_FIRST);
  assert.equal(unlockNeed(PULL_HEROES.length - 1), NEED_LAST);
  let last = 0;
  for (let n = 3; n < PULL_HEROES.length; n++) {
    assert.ok(unlockNeed(n) >= last, `${n}`);
    last = unlockNeed(n);
  }
  assert.ok(unlockNeed(4) <= 3 && unlockNeed(10) <= 10 && unlockNeed(30) >= 30);
  const m = fresh(1);
  assert.equal(ownedCount(m), 3);
  assert.equal(needOf(m), NEED_FIRST);
});

test('the price of a pull rises with the roster, from the base price', () => {
  assert.equal(priceMult(3), 1);
  assert.ok(Math.abs(priceMult(PULL_HEROES.length) - PRICE_LAST_MULT) < 1e-9);
  const m = fresh(2);
  assert.equal(pullCost(1, m), PULL_COST);
  const richer = startedMeta(2);
  richer.unlocked = [...PULL_HEROES];
  assert.ok(pullCost(1, richer) > 20 * PULL_COST);
});

test('shards of a hero not owned fill its bar, and it joins at rank 0 when the bar is full', () => {
  const m = fresh(3);
  const kind = toCollect(m)[0];
  const need = needOf(m);
  for (let i = 1; i < need; i++) {
    const g = giveShards(m, kind, 1);
    assert.equal(g.joined, false);
    assert.equal(g.unlock, 1);
    assert.equal(g.have, i);
    assert.equal(haveOf(m, kind), i);
    assert.ok(!m.unlocked.includes(kind));
  }
  const g = giveShards(m, kind, 1);
  assert.equal(g.joined, true);
  assert.ok(m.unlocked.includes(kind));
  assert.equal(haveOf(m, kind), 0, 'the bar is spent');
  assert.equal(m.shards[kind] ?? 0, 0, 'it joins at rank 0');
  assert.equal(needOf(m) >= need, true, 'the next one costs the same or more');
  // (a hero owned takes rank shards, the unlock bar is not touched)
  const r = giveShards(m, kind, 2);
  assert.equal(r.rank, 2);
  assert.equal(r.unlock, 0);
  assert.equal(m.shards[kind], 2);
});

test('a pull gives one shard of one hero: unlock shards if not owned, rank shards if owned; every pull is whole', () => {
  const m = fresh(4);
  const joined: string[] = [];
  for (let i = 0; i < 400; i++) {
    const owned = m.unlocked.includes(pullPeek(m));
    const before = { unlock: { ...m.unlock }, shards: { ...m.shards }, n: m.unlocked.length };
    const p = pullOnce(m);
    if (owned) {
      assert.equal(p.unlock, undefined);
      assert.equal(m.shards[p.kind] ?? 0, (before.shards[p.kind] ?? 0) + (p.crowns ? 0 : 1));
    } else {
      assert.equal(p.shards, 0);
      assert.equal(p.unlock, 1);
      if (p.isNew) {
        joined.push(p.kind);
        assert.equal(m.unlocked.length, before.n + 1);
        assert.equal(p.have, p.need);
      } else assert.equal(m.unlock![p.kind], (before.unlock[p.kind] ?? 0) + 1);
    }
  }
  assert.ok(joined.length >= 8, `${joined.length} heroes joined in 400 pulls`);
  assert.equal(new Set(m.unlocked).size, m.unlocked.length);
});
/** The kind the next pull will give (the pull on a copy). */
const pullPeek = (m: Meta): string => pullOnce(JSON.parse(JSON.stringify(m))).kind;

test('a first session of pulls brings the party to five', () => {
  // (about 900 crowns of a first session: nine pulls at the base price, and the first heroes cost 2 and 3 shards)
  let reached = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const m = fresh(seed);
    m.crowns = 1000;
    while (recruit(m, 1)) if (m.unlocked.length >= 5) break;
    if (m.unlocked.length >= 5) reached++;
  }
  assert.ok(reached >= 30, `${reached} of 40 saves had five heroes after 1000 crowns of pulls`);
});

test('the pity: after PITY_PULLS pulls without unlock shards, the pull is shards of the hero closest to joining', () => {
  const m = fresh(5);
  // (every hero but two is owned, so a plain pull rarely gives unlock shards)
  const missing = ['tyrant', 'sage', 'peasant', 'cleric'].filter((k) => !isContent(k));
  m.unlocked = [...PULL_HEROES.filter((k) => !missing.includes(k)), ...CONTENT_KINDS];
  m.unlock = { [missing[1]]: 3, [missing[0]]: 1 };
  assert.equal(closest(m), missing[1]);
  let dry = 0;
  let pities = 0;
  for (let i = 0; i < 300 && toCollect(m).length; i++) {
    const p = pullOnce(m);
    if (p.unlock) dry = 0;
    else dry++;
    assert.ok(dry < PITY_PULLS, `${dry} pulls without unlock shards in a row`);
    if (p.pity) {
      pities++;
      assert.ok(p.unlock! >= 1);
    }
  }
  assert.ok(pities >= 1);
  // (with every hero owned the pity has nothing to give: a plain draw and a rank shard)
  const full = startedMeta(6);
  full.unlocked = [...ALL_HEROES];
  for (let i = 0; i < 10; i++) assert.equal(pullOnce(full).pity, undefined);
  // (a counter at the limit sends the very next pull to the nearest hero)
  const n = fresh(7);
  const target = toCollect(n)[4];
  n.unlock = { [target]: 1 };
  n.unlockDry = PITY_PULLS - 1;
  const p = pullOnce(n);
  assert.equal(p.kind, target);
  assert.equal(p.pity, true);
  assert.equal(p.isNew, true, 'two shards fill the first bar');
});

test('pulls never give a hero earned by content, whatever the seed (an owned one takes rank shards)', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const m = fresh(seed);
    for (let i = 0; i < 300; i++) pullOnce(m);
    for (const k of CONTENT_KINDS) {
      assert.ok(!m.unlocked.includes(k), `${k} came from a pull`);
      assert.equal(m.unlock?.[k] ?? 0, 0);
      assert.equal(m.shards[k] ?? 0, 0);
    }
  }
  // (shards given to a content hero not owned go nowhere)
  const m = fresh(1);
  const g = giveShards(m, 'tyrant', 50);
  assert.equal(g.unlock + g.rank, 0);
  assert.ok(!m.unlocked.includes('tyrant'));
  // (the starter packs never offer one either: see starter.test.ts)
  for (let seed = 1; seed <= 100; seed++) assert.ok(starterPacks(seed).flat().every((k) => !isContent(k)));
});

test('a content hero joins on its milestone, once, and stays', () => {
  const m = fresh(8);
  assert.deepEqual(grantContent(m), []);
  // the tower
  m.tower = 19;
  assert.deepEqual(grantContent(m), []);
  m.tower = 20;
  assert.deepEqual(grantContent(m), ['dreadPirate']);
  assert.deepEqual(grantContent(m), [], 'once');
  m.tower = 40;
  assert.deepEqual(grantContent(m), ['tyrant']);
  // an army's tiers: Beast Packs on Normal, the Undead Legion on Hard (a Normal clear is not enough)
  m.armies.beasts = { best: 15, won: 15, clears: 1, stars: {} };
  assert.deepEqual(grantContent(m), ['werewolf']);
  m.armies.undead = { best: 15, won: 15, clears: 3, stars: {} };
  assert.deepEqual(grantContent(m), []);
  m.armies.undead.hard = { 1: { won: 15, clears: 1 } };
  assert.deepEqual(grantContent(m), ['reaper']);
  m.armies.yokai = { best: 15, won: 15, clears: 1, stars: {}, hard: { 1: { won: 15, clears: 1 } } };
  assert.deepEqual(grantContent(m), [], 'Yokai asks for Elite');
  m.armies.yokai.hard![2] = { won: 15, clears: 1 };
  assert.deepEqual(grantContent(m), ['samuraiCommander']);
  // the calamity, and its ascension
  m.calamity = { best: 6, clears: 1 };
  assert.deepEqual(grantContent(m), ['timeWitch']);
  m.calamity = { best: 6, clears: 5, asc: 2 };
  assert.deepEqual(grantContent(m), []);
  m.calamity.asc = 3;
  assert.deepEqual(grantContent(m), ['dragoon']);
  // the bestiary
  const sage = contentOf('sage')!;
  assert.equal(sage.met(m), false);
  assert.ok(sage.meter!(m).need > 10);
  assert.equal(new Set(m.unlocked).size, m.unlocked.length);
  // none of it spends or changes a shard bar
  assert.equal(m.unlock && Object.keys(m.unlock).length, undefined);
});

test('chests give unlock shards, not whole heroes; a content hero rolled is swapped for a pullable one', () => {
  const m = startedMeta(9);
  m.unlocked = HEROES.slice(0, 3) as unknown as string[];
  m.party = [...m.unlocked];
  m.armies.golems = { best: 15, won: 15, clears: 1, stars: {}, met: { 0: 7, 1: 7, 2: 7, 3: 1 } };
  const a = armyById('golems')!;
  let joinedByChest = 0;
  for (let seed = 1; seed <= 80; seed++) {
    const before = m.unlocked.length;
    m.stash = [{ army: a.id, at: 10, tier: 0, seed }];
    const preview = peekChest(m, 0)!;
    const total = () => Object.values(m.unlock ?? {}).reduce((a, b) => a + b, 0) + Object.values(m.shards).reduce((a, b) => a + b, 0) + m.unlocked.length * 1000;
    const had = total();
    openChest(m, 0);
    assert.ok(total() > had, 'a gold chest always gives shards');
    assert.ok(m.unlocked.length - before <= 2);
    joinedByChest += m.unlocked.length - before;
    assert.ok(preview.items.some((i) => i.type === 'hero'));
    for (const k of CONTENT_KINDS) assert.ok(!m.unlocked.includes(k), `${k} came from a chest`);
  }
  assert.ok(joinedByChest >= 1);
  // (the prize of a chest the old way would have recruited at once: now a bar of the same shards)
  const n = fresh(11);
  const seed = 5;
  const roll = rollChest(seed, a, 10);
  n.stash = [{ army: a.id, at: 10, tier: 0, seed }];
  openChest(n, 0);
  const prize = swapContent(n, roll.recruits[0].kind, seed, 100);
  const got = (n.unlock?.[prize] ?? 0) + (n.unlocked.includes(prize) && !fresh(11).unlocked.includes(prize) ? 1 : 0) + (n.shards[prize] ?? 0);
  assert.ok(got >= 1);
  assert.ok(CHEST_HERO_SHARDS >= 1);
  // (a content hero rolled but not owned is always swapped to a pullable one, the same one every time)
  for (let i = 0; i < 20; i++) {
    const s = swapContent(fresh(1), 'tyrant', 1234, i);
    assert.ok(PULL_HEROES.includes(s));
    assert.equal(s, swapContent(fresh(1), 'tyrant', 1234, i));
  }
  const owner = fresh(1);
  owner.unlocked.push('tyrant');
  assert.equal(swapContent(owner, 'tyrant', 1234, 0), 'tyrant');
  void ARMIES;
});

test('an old save keeps every hero it owns, and one that has met a milestone gets that hero', () => {
  const s = store();
  const old = startedMeta(21);
  old.unlocked = [...HEROES, 'kitsune', 'werewolf', 'peasant', 'tyrant', 'gorgon'];
  old.party = [...HEROES];
  old.shards = { kitsune: 3, gorgon: 1 };
  old.tower = 21;
  delete old.unlock;
  delete old.unlockDry;
  saveMeta(old, s);
  const back = loadMeta(1, s);
  for (const k of old.unlocked) assert.ok(back.unlocked.includes(k), `${k} was kept`);
  assert.ok(back.unlocked.includes('dreadPirate'), 'tower floor 20 reached before: the hero joins');
  assert.deepEqual(back.shards, old.shards);
  assert.deepEqual(back.unlock, {});
  // (and the rest carry on under the new rules: the next hero costs by the heroes owned)
  assert.equal(needOf(back), unlockNeed(ownedCount(back)));
  assert.ok(pullCost(1, back) > PULL_COST);
  // (a save with the older pity fields reads, and a bad unlock record is mended)
  const raw = JSON.parse(s.data['legends.meta']);
  raw.sinceNew = 7;
  raw.unlock = { paladin: 4, knight: 2, nobody: 3, tyrant: 5, sage: 'x' };
  s.data['legends.meta'] = JSON.stringify(raw);
  const again = loadMeta(1, s);
  assert.deepEqual(again.unlock, { paladin: 4 }, 'owned, content and unknown heroes drop out of the bars');
});

test('pulls and chests are deterministic', () => {
  const run = () => {
    const m = fresh(33);
    m.crowns = 100000;
    const kinds: string[] = [];
    for (let i = 0; i < 8; i++) kinds.push(...recruit(m, 10)!.map((p) => p.kind));
    m.stash = [{ army: 'orcs', at: 5, tier: 1, seed: chestSeed(33, ARMIES[0], 5) }];
    openChest(m, 0);
    return { kinds, unlocked: m.unlocked, unlock: m.unlock, shards: m.shards, crowns: m.crowns };
  };
  assert.deepEqual(run(), run());
});

test('a hero not owned says how to get it: a milestone line and progress, or its shards', () => {
  const m = fresh(14);
  assert.equal(lockInfo(m, m.unlocked[0]), null);
  const tyrant = lockInfo(m, 'tyrant')!;
  assert.equal(tyrant.line, 'Joins when you clear 40 floors of the endless tower');
  assert.deepEqual([tyrant.now, tyrant.need, tyrant.named], [0, 40, true]);
  m.tower = 14;
  assert.equal(lockInfo(m, 'tyrant')!.now, 14);
  assert.equal(lockInfo(m, 'reaper')!.need, 0, 'a clear has no bar');
  const kind = toCollect(m)[0];
  assert.equal(lockInfo(m, kind)!.named, false, 'a hero with no shards yet stays a shadow');
  giveShards(m, kind, 1);
  const begun = lockInfo(m, kind)!;
  assert.deepEqual([begun.now, begun.need, begun.named], [1, needOf(m), true]);
});

/** Run `f` in a mode, then put the default back. */
const inMode = (mode: Parameters<typeof setUnlockMode>[0], f: () => void) => {
  setUnlockMode(mode);
  try {
    f();
  } finally {
    setUnlockMode('rising');
  }
};

test('the default is the rising price; the other modes keep the price flat', () => {
  assert.equal(unlockMode(), 'rising');
  const rich = fresh(40);
  rich.unlocked = [...PULL_HEROES];
  const rising = pullCost(1, rich);
  assert.ok(rising > 20 * PULL_COST);
  for (const mode of ['daily', 'fading'] as const)
    inMode(mode, () => {
      assert.equal(MODES[mode].priceLast, 1);
      assert.equal(pullCost(1, rich), PULL_COST);
      assert.equal(pullCost(10, rich), 900);
    });
});

test('the daily mode allows a set number of pulls a day, then none until the next date', () => {
  inMode('daily', () => {
    const limit = MODES.daily.dailyPulls;
    const m = fresh(41);
    m.crowns = 100000;
    assert.equal(pullsLeft(m, 20260101), limit);
    assert.ok(recruit(m, 10, 20260101));
    assert.equal(pullsLeft(m, 20260101), limit - 10);
    assert.equal(recruit(m, 10, 20260101), null, 'ten more would pass the limit');
    assert.equal(m.crowns, 100000 - 900, 'a refused pull costs nothing');
    // (the rest of the day by singles, then nothing)
    for (let i = 0; i < limit - 10; i++) assert.ok(recruit(m, 1, 20260101));
    assert.equal(recruit(m, 1, 20260101), null);
    assert.ok(recruit(m, 1, 20260102), 'a new date has its pulls again');
    // (the count survives a save)
    const s = store();
    saveMeta(m, s);
    assert.equal(pullsLeft(loadMeta(1, s), 20260102), limit - 1);
  });
  // (the other modes have no limit)
  const m = fresh(42);
  m.crowns = 100000;
  for (let i = 0; i < 30; i++) assert.ok(recruit(m, 1, 20260101));
});

test('the fading mode: a pull is a new hero less and less often as the roster grows, and the pity waits longer', () => {
  inMode('fading', () => {
    const share = (owned: number) => {
      const m = fresh(43);
      m.unlocked = [...PULL_HEROES.slice(0, owned)];
      let fresh_ = 0;
      const N = 2000;
      for (let i = 0; i < N; i++) {
        const copy = JSON.parse(JSON.stringify(m)) as Meta;
        copy.pulls = i;
        copy.unlockDry = 0;
        if (pullOnce(copy).unlock) fresh_++;
      }
      return fresh_ / N;
    };
    const early = share(6);
    const late = share(28);
    assert.ok(early > 0.7, `${early}`);
    assert.ok(late < 0.25 && late < early / 3, `${late}`);
    assert.ok(pityAt(30) > pityAt(5) + 100);
  });
});
