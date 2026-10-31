import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMeta, newMeta, pickStarter, pullOnce, useStones, startedMeta, saveMeta, type Meta } from '../src/sim/meta';
import { closest, giveShards, haveOf, needOf, ownedCount, toCollect } from '../src/sim/unlock';
import { CONTENT_KINDS, isContent, NEED_FIRST, NEED_LAST, PITY_PULLS, PULL_HEROES, unlockNeed } from '../src/sim/unlockRules';
import { CONTENT_HEROES, contentOf, grantContent, lockInfo } from '../src/sim/contentHeroes';
import { ARMIES, armyById } from '../src/sim/armies';
import { chestSeed, openChest, peekChest } from '../src/sim/armyStars';
import { ALL_HEROES, HEROES } from '../src/sim/units';
import { starterPacks } from '../src/sim/starter';
import { OWNED_BOOST, ownedWeight, pityAt } from '../src/sim/unlockRules';

const store = () => {
  const data: Record<string, string> = {};
  return { setItem: (k: string, v: string) => void (data[k] = v), getItem: (k: string) => data[k] ?? null, data };
};
/** The shard rules are tested without the lucky roll (one stone in a hundred is a whole hero: see `summon-stones.test.ts`). */
const NO_LUCK = { lucky: false };
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
  assert.ok(unlockNeed(4) <= 3 && unlockNeed(10) <= 12 && unlockNeed(30) >= 50);
  const m = fresh(1);
  assert.equal(ownedCount(m), 3);
  assert.equal(needOf(m), NEED_FIRST);
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
    const p = pullOnce(m, NO_LUCK);
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
const pullPeek = (m: Meta): string => pullOnce(JSON.parse(JSON.stringify(m)), NO_LUCK).kind;

test('a first session of pulls brings the party to five', () => {
  // (a first session has about ten stones: the first clear's chest, the daily and a bronze chest from the shop; the first heroes cost 2 and 3 shards)
  let reached = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const m = fresh(seed);
    m.stones = 10;
    while (useStones(m, 1, NO_LUCK)) if (m.unlocked.length >= 5) break;
    if (m.unlocked.length >= 5) reached++;
  }
  assert.ok(reached >= 30, `${reached} of 40 saves had five heroes after ten stones`);
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
    const wait = pityAt(ownedCount(m));
    const p = pullOnce(m, NO_LUCK);
    if (p.unlock) dry = 0;
    else dry++;
    assert.ok(dry < wait, `${dry} pulls without unlock shards in a row`);
    if (p.pity) {
      pities++;
      assert.ok(p.unlock! >= 1);
    }
  }
  assert.ok(pities >= 1);
  // (with every hero owned the pity has nothing to give: a plain draw and a rank shard)
  const full = startedMeta(6);
  full.unlocked = [...ALL_HEROES];
  for (let i = 0; i < 10; i++) assert.equal(pullOnce(full, NO_LUCK).pity, undefined);
  // (a counter at the limit sends the very next pull to the nearest hero)
  const n = fresh(7);
  const target = toCollect(n)[4];
  n.unlock = { [target]: 1 };
  n.unlockDry = pityAt(ownedCount(n)) - 1;
  const p = pullOnce(n, NO_LUCK);
  assert.equal(p.kind, target);
  assert.equal(p.pity, true);
  assert.equal(p.isNew, true, 'two shards fill the first bar');
});

test('pulls never give a hero earned by content, whatever the seed (an owned one takes rank shards)', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const m = fresh(seed);
    for (let i = 0; i < 300; i++) pullOnce(m, NO_LUCK);
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
  assert.ok(starterPacks().flat().every((k) => !isContent(k)));
});

test('a content hero joins on its milestone, once, and stays', () => {
  const m = fresh(8);
  assert.deepEqual(grantContent(m), []);
  // the tower and the armies' tiers (SECRET-HEROES, HERO-TALES-2: wave 20 and 40, the Beast Packs, the Undead Legion on Hard and the Yokai
  // on Elite no longer bring a hero: a hero quest does, `secret-heroes.test.ts`)
  m.tower = 40;
  m.stand = 40;
  m.armies.beasts = { best: 15, won: 15, clears: 1, stars: {} };
  m.armies.undead = { best: 15, won: 15, clears: 3, stars: {}, hard: { 1: { won: 15, clears: 1 } } };
  m.armies.yokai = { best: 15, won: 15, clears: 1, stars: {}, hard: { 1: { won: 15, clears: 1 }, 2: { won: 15, clears: 1 } } };
  assert.deepEqual(grantContent(m), []);
  // (a tale handed in brings its hero, once)
  m.quests = { active: [], offers: [], done: ['taleThroneAppeal'] };
  assert.deepEqual(grantContent(m), ['tyrant']);
  assert.deepEqual(grantContent(m), [], 'once');
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

test('chests give summoning stones, never a shard or a hero directly: nothing joins until a stone is used', () => {
  const m = startedMeta(9);
  m.unlocked = HEROES.slice(0, 3) as unknown as string[];
  m.party = [...m.unlocked];
  m.armies.golems = { best: 15, won: 15, clears: 1, stars: {}, met: { 0: 7, 1: 7, 2: 7, 3: 1 } };
  const a = armyById('golems')!;
  for (let seed = 1; seed <= 80; seed++) {
    m.stash = [{ army: a.id, at: 10, tier: 0, seed }];
    const preview = peekChest(m, 0)!;
    const had = { stones: m.stones ?? 0, unlocked: [...m.unlocked], unlock: { ...(m.unlock ?? {}) }, shards: { ...m.shards } };
    openChest(m, 0);
    assert.ok((m.stones ?? 0) > had.stones, 'a gold chest always holds stones');
    assert.deepEqual(m.unlocked, had.unlocked);
    assert.deepEqual(m.unlock ?? {}, had.unlock);
    assert.deepEqual(m.shards, had.shards);
    assert.ok(preview.items.some((i) => i.type === 'stones'));
  }
});

test('an old save keeps every hero it owns, and one that has met a milestone gets that hero', () => {
  const s = store();
  const old = startedMeta(21);
  old.unlocked = [...HEROES, 'kitsune', 'werewolf', 'peasant', 'dreadPirate', 'gorgon'];
  old.party = [...HEROES];
  old.shards = { kitsune: 3, gorgon: 1 };
  old.quests = { active: [], offers: [], done: ['taleThroneAppeal'] };
  delete old.unlock;
  delete old.unlockDry;
  saveMeta(old, s);
  const back = loadMeta(1, s);
  for (const k of old.unlocked) assert.ok(back.unlocked.includes(k), `${k} was kept`);
  assert.ok(back.unlocked.includes('tyrant'), 'a tale handed in before: the hero joins');
  assert.deepEqual(back.shards, old.shards);
  assert.deepEqual(back.unlock, {});
  // (and the rest carry on under the new rules: the next hero costs by the heroes owned)
  assert.equal(needOf(back), unlockNeed(ownedCount(back)));
  // (a save with the older pity fields reads, and a bad unlock record is mended)
  const raw = JSON.parse(s.data['legends.meta']);
  raw.sinceNew = 7;
  raw.unlock = { paladin: 4, knight: 2, nobody: 3, tyrant: 5, sage: 'x' };
  s.data['legends.meta'] = JSON.stringify(raw);
  const again = loadMeta(1, s);
  assert.deepEqual(again.unlock, { paladin: 4 }, 'owned, content and unknown heroes drop out of the bars');
});

test('stones and chests are deterministic', () => {
  const run = () => {
    const m = fresh(33);
    m.stones = 80;
    const kinds: string[] = [];
    for (let i = 0; i < 8; i++) kinds.push(...useStones(m, 10)!.map((p) => p.kind));
    m.stash = [{ army: 'orcs', at: 5, tier: 1, seed: chestSeed(33, ARMIES[0], 5) }];
    openChest(m, 0);
    return { kinds, unlocked: m.unlocked, unlock: m.unlock, shards: m.shards, crowns: m.crowns };
  };
  assert.deepEqual(run(), run());
});

test('a hero not owned says how to get it: a secret hint for one earned in play, or its shards', () => {
  const m = fresh(14);
  assert.equal(lockInfo(m, m.unlocked[0]), null);
  // (SECRET-HEROES, the owner's ask: a hero earned in play is a secret, with a vague hint, no name and no bar, however far on the save is)
  const tyrant = lockInfo(m, 'tyrant')!;
  // (HERO-TALES-2: every one of them comes by a tale now, so every hint is the tavern's)
  assert.equal(tyrant.line, 'A hero waits for a tale to be told in the tavern');
  assert.deepEqual([tyrant.now, tyrant.need, tyrant.named], [0, 0, false]);
  m.stand = 22;
  assert.equal(lockInfo(m, 'tyrant')!.need, 0, 'no bar to give it away');
  assert.equal(lockInfo(m, 'werewolf')!.line, 'A hero waits for a tale to be told in the tavern');
  const kind = toCollect(m)[0];
  assert.equal(lockInfo(m, kind)!.named, false, 'a hero with no shards yet stays a shadow');
  giveShards(m, kind, 1);
  const begun = lockInfo(m, kind)!;
  assert.deepEqual([begun.now, begun.need, begun.named], [1, needOf(m), true]);
});

test('a stone costs a stone whatever the roster: ten stones are ten pulls', () => {
  const rich = fresh(40);
  rich.unlocked = [...PULL_HEROES];
  rich.stones = 25;
  useStones(rich, 10);
  assert.equal(rich.stones, 15);
  useStones(rich, 1);
  assert.equal(rich.stones, 14);
});

test('the odds fade: a pull is a new hero less and less often as the roster grows, and the pity waits longer', () => {
  assert.equal(ownedWeight(3), 1, 'with the starter alone, every hero is as likely as any other');
  assert.ok(ownedWeight(30) > 100 * ownedWeight(6));
  assert.ok(OWNED_BOOST > 0);
  const share = (owned: number) => {
    const m = fresh(43);
    m.unlocked = [...PULL_HEROES.slice(0, owned)];
    let fresh_ = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) {
      const copy = JSON.parse(JSON.stringify(m)) as Meta;
      copy.pulls = i;
      copy.unlockDry = 0;
      if (pullOnce(copy, NO_LUCK).unlock) fresh_++;
    }
    return fresh_ / N;
  };
  const early = share(6);
  const late = share(28);
  assert.ok(early > 0.1, `${early}`);
  assert.ok(late < 0.25 && late < early / 1.5, `early ${early} late ${late}`);
  assert.ok(pityAt(30) > pityAt(5) + 100);
  assert.equal(pityAt(3), PITY_PULLS);
});

test('unlock shards are spent when a hero joins: no bar, no rank shards, no stale count anywhere', () => {
  for (const seed of [1, 2, 3, 4]) {
    const m = fresh(seed);
    let joins = 0;
    for (let i = 0; i < 400 && joins < 6; i++) {
      const was = m.unlocked.length;
      const need = needOf(m);
      const p = pullOnce(m, NO_LUCK);
      if (m.unlocked.length === was) continue;
      joins++;
      assert.equal(p.isNew, true);
      assert.equal(p.have, need);
      assert.equal(m.unlock?.[p.kind], undefined, 'the entry is gone');
      assert.equal(haveOf(m, p.kind), 0);
      assert.equal(m.shards[p.kind] ?? 0, 0, 'none carried over as rank shards');
    }
    assert.ok(joins >= 4);
  }
  // a gift larger than the bar needs does not carry the rest over either
  const m = fresh(9);
  const kind = toCollect(m)[0];
  const g = giveShards(m, kind, 50);
  assert.equal(g.joined, true);
  assert.equal(m.shards[kind] ?? 0, 0);
  assert.equal(m.unlock?.[kind], undefined);
});

test('a stale unlock count for a hero already owned is dropped on load and never shown', () => {
  const m = fresh(5);
  const kind = m.unlocked[0];
  m.unlock = { ...m.unlock, [kind]: 7 };
  assert.equal(haveOf(m, kind), 0);
  const s = store();
  saveMeta(m, s);
  const back = loadMeta(1, { getItem: (k: string) => s.data[k] ?? null } as Storage);
  assert.equal(back.unlock?.[kind], undefined);
});
