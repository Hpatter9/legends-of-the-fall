// The Summoner's plaque in the Sanctum (SANCTUM-TIDY, `docs/notes/sanctum-tidy.md`): what it says through Askel's chain, and that nothing
// waits there once Askel is bound (the owner: "I already bound the Cinderhound but the message is still on the summon screen"), whether
// bound just now, loaded from a save already bound, or bound some other way.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordOf } from '../src/sim/armies';
import { loadMeta, saveMeta, startedMeta, type Meta } from '../src/sim/meta';
import { FIXED_PACKS } from '../src/sim/starter';
import { bindEidolon } from '../src/sim/warHorn';
import { beginChain, bindChain, hallPlaque, summonerWaiting } from '../src/sim/eidolonChains';

const save = (seed = 3): Meta => {
  const m = startedMeta(seed);
  m.unlocked = [...FIXED_PACKS[0].heroes];
  m.party = [...m.unlocked];
  return m;
};
const clearOrcs = (m: Meta) => (m.armies.orcs = { ...recordOf(m, 'orcs'), clears: 1 });
const ready = (m: Meta) => {
  clearOrcs(m);
  beginChain(m, 'askel');
  m.quests!.chains!.askel = { part: 3, progress: 0 };
  m.quests!.pieces = ['emberHeart', 'kennelCollar', 'kennelBell'];
};
/** Through the page's store and back, as a reload does. */
const reload = (m: Meta): Meta => {
  const map = new Map<string, string>();
  saveMeta(m, { setItem: (k, v) => void map.set(k, v) });
  return loadMeta(1, { getItem: (k) => map.get(k) ?? null });
};

test('the plaque through Askel\'s chain: nothing before the Orc Warband falls, then the offer, each part, and the binding', () => {
  const m = save();
  assert.equal(hallPlaque(m), null);
  clearOrcs(m);
  assert.equal(hallPlaque(m)?.kind, 'offer');
  assert.ok(summonerWaiting(m));
  beginChain(m, 'askel');
  assert.equal(hallPlaque(m)?.kind, 'going');
  assert.equal(hallPlaque(m)?.title, 'Askel · 0 of 3 pieces');
  assert.match(hallPlaque(m)!.line, /^Part 1: /);
  assert.equal(summonerWaiting(m), false, 'a part going waits on the player, not the Summoner');
  m.quests!.chains!.askel = { part: 1, progress: 0 };
  m.quests!.pieces = ['emberHeart'];
  assert.equal(hallPlaque(m)?.title, 'Askel · 1 of 3 pieces');
  assert.match(hallPlaque(m)!.line, /^Part 2: /);
  ready(m);
  assert.deepEqual(hallPlaque(m), { kind: 'bind', title: 'Bind Askel', line: 'every piece is on the altar' });
  assert.ok(summonerWaiting(m));
});

test('once Askel is bound nothing waits at the Summoner: no plaque, no dot, and the same after a reload', () => {
  const m = save();
  ready(m);
  assert.ok(bindChain(m, 'askel'));
  // (Nivra's chain is not written yet, so no new pact is offered: the plaque goes away)
  assert.equal(hallPlaque(m), null);
  assert.equal(summonerWaiting(m), false);
  const back = reload(m);
  assert.equal(hallPlaque(back), null);
  assert.equal(summonerWaiting(back), false);
});

test('a save already bound loads with nothing waiting, as does Askel bound some other way with his chain part-way', () => {
  // (a bound save as an earlier release wrote it: the chain marked bound, Askel bound and chosen, the horn full)
  const old = save(5);
  clearOrcs(old);
  Object.assign(old, {
    quests: { active: [], offers: [], done: [], chains: { askel: { part: 3, progress: 0, bound: true } }, pieces: ['emberHeart', 'kennelCollar', 'kennelBell'] },
    eidolons: { horn: 1000, bound: ['askel'], chosen: 'askel' },
  });
  const back = reload(old);
  assert.equal(hallPlaque(back), null);
  assert.equal(summonerWaiting(back), false);
  // (the dev flag binds without the chain: begun, one piece in)
  const m = save(6);
  clearOrcs(m);
  beginChain(m, 'askel');
  bindEidolon(m, 'askel');
  assert.equal(hallPlaque(m), null);
  assert.equal(summonerWaiting(m), false);
});

test('the plaque is one short row: every line it can show fits the Sanctum\'s width at the phone sizes', () => {
  const m = save(7);
  clearOrcs(m);
  const rows: string[] = [];
  const add = () => {
    const p = hallPlaque(m);
    if (p) rows.push(`${p.title} · ${p.line}`);
  };
  add();
  beginChain(m, 'askel');
  for (const part of [0, 1, 2, 3]) {
    m.quests!.chains!.askel = { part, progress: 0 };
    add();
  }
  assert.equal(rows.length, 5);
  // ("Askel · 1 of 3 pieces · Part 2: The Kennel Fires", 48 characters, takes about 300 of the row's 360px at 393 wide; it may wrap at 360)
  for (const r of rows) assert.ok(r.length <= 56, `"${r}" is ${r.length} characters`);
});
