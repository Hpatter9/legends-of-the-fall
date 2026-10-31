// GUEST-HERO (`docs/notes/guest-hero.md`): the passing cart now and then has a guest hero for hire, who fights as a sixth beside the five
// for that run only. One guest at a time; one of each hero still holds; it never merges or is recycled; it earns run XP, nothing lasting;
// it leaves with a farewell when the run ends. The offer is drawn on its own side stream, so the cart's wares are as they were.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { place, placeBlock } from '../src/sim/battle';
import { autoDeploy, deployTiles, pickSquad } from '../src/sim/autoplay';
import { canMerge } from '../src/sim/merge';
import { armyRun, canJoin, finish, heroOf, newRun, recycle, squadUsed, startStage, type Owned, type Run } from '../src/sim/run';
import { chooseOption } from '../src/sim/events';
import { marketOptions, stockMarket } from '../src/sim/market';
import { waveNotes } from '../src/sim/waveCard';
import { drawGuest, farewellOf, guestBoost, guestFarewell, guestKinds, guestLevel, guestOf, guestOwned, guestPrice, guestStanding, splitGuestXp, takeGuest } from '../src/sim/guest';
import { boostOf } from '../src/sim/run';
import { heroRank } from '../src/sim/meta';
import { heroStats } from '../src/sim/talents';
import { awakenedOf } from '../src/sim/awaken';
import { startedMeta } from '../src/sim/meta';
import { xpFor } from '../src/sim/levels';
import { HEROES } from '../src/sim/units';

const PARTY = [...HEROES];
/** An army run with the party's five on the roster and in the squad, ids 1 to 5. */
function armyWithFive(seed = 1): Run {
  const r = armyRun(seed, 'orcs', PARTY);
  r.roster = PARTY.map((kind, i): Owned => ({ id: i + 1, kind, grade: 2 }));
  r.nextId = 6;
  r.squad = r.roster.map((h) => h.id);
  r.gold = 1000;
  return r;
}
/** The first stage whose cart brings a guest for this run. */
const stageWithGuest = (r: Run): number => {
  for (let s = 1; s < 200; s++) if (drawGuest(r, s)) return s;
  throw new Error('no guest in 200 stages');
};
const copy = (r: Run): Run => JSON.parse(JSON.stringify(r)) as Run;

test('the guest offer is drawn on its own stream: the same each time, outside the party, and the cart\'s wares unchanged', () => {
  const r = armyWithFive();
  const s = stageWithGuest(r);
  const kind = drawGuest(r, s)!;
  assert.equal(drawGuest(copy(r), s), kind);
  assert.ok(!PARTY.includes(kind as (typeof PARTY)[number]));
  assert.ok(guestKinds(r).includes(kind));
  // (the wares are what the cart sells without the guest, in the same order, with the guest after them)
  const withGuest = marketOptions(copy(r), s);
  const wares = stockMarket(copy(r), s);
  assert.deepEqual(withGuest.slice(0, wares.length).map((o) => o.label), wares.map((o) => o.label));
  const g = withGuest[wares.length];
  assert.equal(g.effect.t, 'guest');
  assert.equal(g.cost, guestPrice(r, s));
  // (the owner's "higher end": two and a half of the cart's sellswords, to the nearest 5, and never under 120)
  const sell = wares.find((o) => o.effect.t === 'hire')!;
  assert.equal(g.cost, Math.max(120, Math.round((2.5 * sell.cost) / 5) * 5));
  assert.ok(g.cost >= 120);
  const later = copy(r);
  later.summons = 6;
  assert.equal(guestPrice(later, s), 175);
  // (some carts have none)
  assert.ok(Array.from({ length: 40 }, (_, i) => drawGuest(r, i + 1)).some((x) => x === null));
});

test('no guest outside an army run or the daily, and none while one is held', () => {
  const plain = newRun(3);
  for (let s = 1; s < 40; s++) assert.equal(drawGuest(plain, s), null);
  const cal = armyWithFive();
  cal.mode = { kind: 'calamity' };
  for (let s = 1; s < 40; s++) assert.equal(drawGuest(cal, s), null);
  const r = armyWithFive();
  assert.ok(takeGuest(r, 'paladin', 0));
  for (let s = 1; s < 40; s++) assert.equal(drawGuest(r, s), null);
});

test('a guest is a sixth place beyond the five; a sixth own hero is still refused; one guest at a time', () => {
  const r = armyWithFive();
  r.roster.push({ id: 6, kind: 'paladin', grade: 1 });
  r.nextId = 7;
  assert.equal(canJoin(r, 6), false);
  const g = takeGuest(r, 'cleric', 0)!;
  assert.ok(g.guest);
  assert.ok(r.squad.includes(g.id));
  assert.equal(r.squad.length, 6);
  assert.equal(squadUsed(r), 5);
  assert.equal(takeGuest(r, 'druid', 0), null);
  assert.equal(r.roster.filter((h) => h.guest).length, 1);
  // (the guest's grade is the fielded five's)
  assert.equal(g.grade, 2);
  // (and six stand on the field)
  const b = startStage(r);
  autoDeploy(b, r, startedMeta(1));
  assert.equal(b.units.filter((u) => u.side === 'hero').length, 6);
});

test('one of each still holds: a guest of a fielded kind is refused on the field and in the squad', () => {
  const r = armyWithFive();
  const g: Owned = { id: 9, kind: 'knight', grade: 1, guest: true };
  r.roster.push(g);
  assert.equal(canJoin(r, 9), false);
  const b = startStage(r);
  const t = deployTiles(b.board);
  assert.ok(place(b, 'knight', ...t[0], 1));
  assert.equal(placeBlock(b, 'knight', ...t[1], 9), 'twin');
  // (and the guest never is offered as a party kind)
  assert.ok(!guestKinds(r).includes('knight'));
});

test('a guest never merges and is never recycled', () => {
  const r = armyWithFive();
  const g = takeGuest(r, 'cleric', 0)!;
  const twin: Owned = { id: r.nextId++, kind: 'cleric', grade: g.grade };
  r.roster.push(twin);
  assert.equal(canMerge(r, twin.id, g.id), false);
  assert.equal(canMerge(r, g.id, twin.id), false);
  const gold = r.gold;
  assert.equal(recycle(r, g.id), null);
  assert.equal(r.gold, gold);
  assert.ok(heroOf(r, g.id));
});

test('the greedy player fields its five strongest and the guest besides', () => {
  const r = armyWithFive();
  r.roster.push({ id: 6, kind: 'paladin', grade: 1 });
  r.nextId = 7;
  const g = takeGuest(r, 'cleric', 0)!;
  const squad = pickSquad(r, startedMeta(1));
  assert.equal(squad.length, 6);
  assert.ok(squad.some((h) => h.id === g.id));
  assert.equal(squad.filter((h) => !h.guest).length, 5);
});

test('buying the guest at the cart pays its price and fields it; a rummage keeps it on offer', () => {
  const r = armyWithFive();
  const s = stageWithGuest(r);
  r.event = { kind: 'merchant', stage: s, title: 'A passing cart', text: '', options: marketOptions(r, s), buys: 3 };
  const i = r.event.options.findIndex((o) => o.effect.t === 'guest');
  const label = r.event.options[i].label;
  // (a rummage brings out other wares, the guest stays)
  const roll = r.event.options.findIndex((o) => o.effect.t === 'reroll');
  assert.ok(chooseOption(r, roll));
  assert.equal(r.event.options[i].label, label);
  const gold = r.gold;
  const line = chooseOption(r, i)!;
  assert.match(line, /guest/);
  assert.equal(r.gold, gold - r.event.options[i].cost);
  const g = guestOf(r)!;
  assert.ok(r.squad.includes(g.id));
});

test('a guest the player does not own fights at the party\'s level and rank, and its XP stays in the run', () => {
  const r = armyWithFive();
  const meta = startedMeta(1);
  meta.unlocked = meta.unlocked.filter((k) => k !== 'cleric');
  for (const k of PARTY) meta.xp[k] = xpFor(20);
  const g = takeGuest(r, 'cleric', 0)!;
  assert.equal(guestOwned(meta, g), false);
  assert.equal(guestLevel(r, meta, g), 20);
  assert.equal(guestStanding(r, meta).level, 20);
  assert.equal(guestBoost(r, meta, g).level, 20);
  const before = meta.xp.cleric ?? 0;
  const { lasting, guest } = splitGuestXp(r, { knight: 30, cleric: 40 });
  assert.deepEqual(lasting, { knight: 30 });
  assert.equal(guest, 40);
  assert.equal(g.xp, 40);
  assert.equal(meta.xp.cleric ?? 0, before);
});

test('a guest the player owns brings its own lasting level, rank, talents and gear; its XP still stays in the run', () => {
  const r = armyWithFive();
  const meta = startedMeta(1);
  for (const k of PARTY) meta.xp[k] = xpFor(20);
  if (!meta.unlocked.includes('cleric')) meta.unlocked.push('cleric');
  meta.xp.cleric = xpFor(35);
  meta.ranked = { ...meta.ranked, cleric: 2 };
  meta.shards.cleric = Math.max(meta.shards.cleric ?? 0, 99);
  const g = takeGuest(r, 'cleric', 0)!;
  assert.ok(guestOwned(meta, g));
  const b = guestBoost(r, meta, g);
  assert.equal(b.level, 35);
  assert.equal(guestLevel(r, meta, g), 35);
  // (its own rank and lasting stats, as one of the player's own heroes of that kind would have)
  assert.deepEqual(b, { ...boostOf(g, heroRank(meta, 'cleric'), 35, heroStats(meta, 'cleric')), ...(awakenedOf(meta, 'cleric') ? { awaken: awakenedOf(meta, 'cleric') } : {}) });
  const before = meta.xp.cleric;
  const { lasting } = splitGuestXp(r, { cleric: 50 });
  assert.deepEqual(lasting, {});
  assert.equal(meta.xp.cleric, before);
  assert.equal(g.xp, 50);
});

test('the guest says farewell when the run ends, and not before', () => {
  const r = armyWithFive();
  const g = takeGuest(r, 'cleric', 0)!;
  finish(r, true);
  assert.equal(farewellOf(r), null);
  finish(r, false);
  assert.ok(r.over);
  assert.equal(farewellOf(r), guestFarewell(g));
  assert.match(guestFarewell(g), /the guest/);
  // (the last card says it as a line of its own, not as a find)
  const notes = waveNotes({ ups: [], fell: [], found: [], hearts: 0, heartsLeft: 0, farewell: farewellOf(r)! });
  assert.deepEqual(notes, [{ kind: 'guest', text: guestFarewell(g) }]);
});
